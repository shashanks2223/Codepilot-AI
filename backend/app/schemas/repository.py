from pydantic import BaseModel
from typing import Optional, List
import datetime

class RepositoryConnectRequest(BaseModel):
    github_id: int
    name: str
    full_name: str
    clone_url: Optional[str] = None

class RepositoryResponse(BaseModel):
    id: int
    github_id: int
    name: str
    full_name: str
    clone_url: Optional[str] = None
    is_active: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class PullRequestResponse(BaseModel):
    id: int
    repository_id: int
    github_number: int
    title: str
    state: str
    head_sha: str
    base_sha: str
    author_username: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class RepositorySyncResponse(BaseModel):
    repositories: List[RepositoryResponse]
