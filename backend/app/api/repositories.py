from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.models import User, Repository, PullRequest
from app.schemas.repository import (
    RepositoryResponse,
    RepositoryConnectRequest,
    PullRequestResponse
)
from app.services.github_service import GitHubService

router = APIRouter()

@router.get("", response_model=List[RepositoryResponse])
def get_connected_repositories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all user-connected repositories."""
    return db.query(Repository).filter(Repository.user_id == current_user.id).all()


@router.get("/github", response_model=List[dict])
async def list_github_repositories(
    current_user: User = Depends(get_current_user)
):
    """Fetch repositories directly from user's GitHub account."""
    if not current_user.github_access_token:
        raise HTTPException(status_code=400, detail="User GitHub account not connected properly")
    
    gh = GitHubService(current_user.github_access_token)
    return await gh.list_repositories()


@router.post("/connect", response_model=RepositoryResponse)
async def connect_repository(
    payload: RepositoryConnectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Connect a repository and fetch its Pull Requests."""
    repo = db.query(Repository).filter(
        Repository.github_id == payload.github_id,
        Repository.user_id == current_user.id
    ).first()
    
    if repo:
        repo.is_active = True
    else:
        repo = Repository(
            user_id=current_user.id,
            github_id=payload.github_id,
            name=payload.name,
            full_name=payload.full_name,
            clone_url=payload.clone_url,
            is_active=True
        )
        db.add(repo)
    
    db.commit()
    db.refresh(repo)
    
    # Trigger pull request fetch / sync
    await sync_prs_for_repository(repo.id, db, current_user)
    
    return repo


@router.post("/{repo_id}/disable", response_model=RepositoryResponse)
def disable_repository(
    repo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Disable reviews for a connected repository."""
    repo = db.query(Repository).filter(
        Repository.id == repo_id,
        Repository.user_id == current_user.id
    ).first()
    
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    repo.is_active = False
    db.commit()
    db.refresh(repo)
    return repo


@router.delete("/{repo_id}", status_code=status.HTTP_200_OK)
def delete_repository(
    repo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete repository connection and local PR/reviews."""
    repo = db.query(Repository).filter(
        Repository.id == repo_id,
        Repository.user_id == current_user.id
    ).first()
    
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    db.delete(repo)
    db.commit()
    return {"detail": "Repository disconnected and deleted successfully"}


@router.post("/{repo_id}/sync", response_model=List[PullRequestResponse])
async def sync_repository(
    repo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Manually trigger Pull Requests sync from GitHub."""
    return await sync_prs_for_repository(repo_id, db, current_user)


@router.get("/{repo_id}/prs", response_model=List[PullRequestResponse])
def get_repository_pull_requests(
    repo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List pull requests for a specific repository."""
    repo = db.query(Repository).filter(
        Repository.id == repo_id,
        Repository.user_id == current_user.id
    ).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    return db.query(PullRequest).filter(PullRequest.repository_id == repo_id).all()


async def sync_prs_for_repository(repo_id: int, db: Session, current_user: User) -> List[PullRequest]:
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        return []
        
    gh = GitHubService(current_user.github_access_token)
    parts = repo.full_name.split("/")
    owner, name = parts[0], parts[1]
    
    gh_prs = await gh.list_pull_requests(owner, name)
    
    synced_prs = []
    for pr_info in gh_prs:
        pr = db.query(PullRequest).filter(
            PullRequest.repository_id == repo.id,
            PullRequest.github_number == pr_info["number"]
        ).first()
        
        state = pr_info.get("state", "open")
        
        if pr:
            pr.title = pr_info["title"]
            pr.state = state
            pr.head_sha = pr_info["head"]["sha"]
            pr.base_sha = pr_info["base"]["sha"]
        else:
            pr = PullRequest(
                repository_id=repo.id,
                github_number=pr_info["number"],
                title=pr_info["title"],
                state=state,
                head_sha=pr_info["head"]["sha"],
                base_sha=pr_info["base"]["sha"],
                author_username=pr_info["user"]["login"]
            )
            db.add(pr)
        synced_prs.append(pr)
        
    db.commit()
    return synced_prs


@router.get("/prs/{pr_id}/diff", response_model=List[dict])
async def get_pr_diff(
    pr_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve and parse code changes of a specific PR diff."""
    pr = db.query(PullRequest).filter(PullRequest.id == pr_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Pull Request not found")
        
    repo = db.query(Repository).filter(Repository.id == pr.repository_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository connection not found")
        
    gh = GitHubService(current_user.github_access_token)
    parts = repo.full_name.split("/")
    owner, name = parts[0], parts[1]
    
    raw_diff = await gh.get_pull_request_diff(owner, name, pr.github_number)
    
    from app.services.diff_parser import DiffParser
    return DiffParser.parse(raw_diff)

