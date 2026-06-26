from pydantic import BaseModel
from typing import List, Optional
import datetime

class ReviewStartRequest(BaseModel):
    pull_request_id: int

class ReviewCommentResponse(BaseModel):
    id: int
    review_id: int
    file_path: str
    line_number: int
    severity: str
    category: str
    issue: str
    explanation: str
    suggested_fix: Optional[str] = None
    improved_code: Optional[str] = None
    confidence_score: float
    status: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class ReviewResponse(BaseModel):
    id: int
    pull_request_id: int
    commit_sha: str
    summary: Optional[str] = None
    status: str
    time_saved_seconds: int
    created_at: datetime.datetime
    comments: List[ReviewCommentResponse] = []

    class Config:
        from_attributes = True

class CommentActionRequest(BaseModel):
    action: str  # 'accept' or 'reject'

class AnalyticsCard(BaseModel):
    total_reviews: int
    total_time_saved_seconds: int
    security_issues_count: int
    critical_issues_count: int

class CategoryDistributionItem(BaseModel):
    category: str
    count: int

class AnalyticsResponse(BaseModel):
    cards: AnalyticsCard
    category_distribution: List[CategoryDistributionItem]
    monthly_reviews: List[dict]
