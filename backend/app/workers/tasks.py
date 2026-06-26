import asyncio
import time
import logging
from celery.utils.log import get_task_logger

from app.workers.celery_app import celery_app
from app.database.session import SessionLocal
from app.models.models import PullRequest, Repository, Review, ReviewComment, User, UsageLog
from app.services.github_service import GitHubService
from app.services.diff_parser import DiffParser
from app.services.ai_reviewer import AIReviewerService

logger = get_task_logger(__name__)

# Helper to run async tasks in celery synchronous environment
def run_async(coro):
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


def analyze_pull_request(pull_request_id: int, user_id: int):
    """
    Celery background worker task to orchestrate code diff extraction,
    parsing, and Gemini AI analysis.
    """
    logger.info(f"Starting analysis for PR ID: {pull_request_id} requested by User ID: {user_id}")
    
    db = SessionLocal()
    start_time = time.time()
    
    try:
        # 1. Fetch Pull Request and User Details
        pr = db.query(PullRequest).filter(PullRequest.id == pull_request_id).first()
        if not pr:
            logger.error(f"Pull request ID {pull_request_id} not found")
            return
            
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.error(f"User ID {user_id} not found")
            return

        repo = db.query(Repository).filter(Repository.id == pr.repository_id).first()
        if not repo:
            logger.error(f"Repository not found for PR ID {pull_request_id}")
            return

        # Reuse existing pending Review record or create a new one
        review = db.query(Review).filter(
            Review.pull_request_id == pr.id,
            Review.status == "pending"
        ).first()
        
        if not review:
            review = Review(
                pull_request_id=pr.id,
                commit_sha=pr.head_sha,
                status="pending"
            )
            db.add(review)
            db.commit()
            db.refresh(review)

        # 2. Get GitHub Client and Fetch Raw PR Diff
        gh = GitHubService(user.github_access_token)
        parts = repo.full_name.split("/")
        owner, name = parts[0], parts[1]
        
        logger.info(f"Fetching diff for {repo.full_name} PR #{pr.github_number}")
        raw_diff = run_async(gh.get_pull_request_diff(owner, name, pr.github_number))
        
        if not raw_diff:
            raise Exception("Empty or invalid diff fetched from GitHub API")

        # 3. Parse Unified Diff to Line Modifications
        logger.info("Parsing unified diff")
        diff_files = DiffParser.parse(raw_diff)

        # 4. Trigger Gemini AI Pipeline
        logger.info("Triggering Google Gemini code analysis pipeline")
        ai_review = run_async(
            AIReviewerService.review_pull_request(
                pr_title=pr.title,
                pr_description=pr.title,  # default fallback
                diff_files=diff_files
            )
        )

        # 5. Populate and Save Review Findings
        review.summary = ai_review.summary
        review.status = "completed"
        
        # Calculate time saved (e.g. 15 minutes per review comment + base 30 minutes)
        comments_count = len(ai_review.comments)
        time_saved = 1800 + (comments_count * 900)
        review.time_saved_seconds = time_saved

        for comment_data in ai_review.comments:
            comment_record = ReviewComment(
                review_id=review.id,
                file_path=comment_data.file_path,
                line_number=comment_data.line_number,
                severity=comment_data.severity,
                category=comment_data.category,
                issue=comment_data.issue,
                explanation=comment_data.explanation,
                suggested_fix=comment_data.suggested_fix,
                improved_code=comment_data.improved_code,
                confidence_score=comment_data.confidence_score,
                status="pending"
            )
            db.add(comment_record)
            
        # Log Token Usage (simulated logs)
        usage = UsageLog(
            user_id=user.id,
            event_type="review_pr",
            prompt_tokens=len(raw_diff) // 4,  # simple approximation
            completion_tokens=len(ai_review.summary) // 4,
            cost=0.015  # average approximate cost
        )
        db.add(usage)
        
        db.commit()
        logger.info(f"Analysis completed successfully. Review ID: {review.id}. Time taken: {time.time() - start_time:.2f}s")
        return {"review_id": review.id, "comments_count": comments_count}

    except Exception as e:
        logger.error(f"Failed to analyze PR ID {pull_request_id}: {str(e)}")
        db.rollback()
        
        # Mark review as failed in DB
        review_record = db.query(Review).filter(
            Review.pull_request_id == pull_request_id,
            Review.status == "pending"
        ).first()
        
        if review_record:
            review_record.status = "failed"
            review_record.summary = f"Code Review analysis pipeline failed. Reason:\n```\n{str(e)}\n```"
            db.commit()
        else:
            # Create a failed review record directly
            failed_review = Review(
                pull_request_id=pull_request_id,
                commit_sha="",
                status="failed",
                summary=f"Analysis failed. Reason: {str(e)}"
            )
            db.add(failed_review)
            db.commit()
            
        return {"status": "failed", "error": str(e)}
    finally:
        db.close()
