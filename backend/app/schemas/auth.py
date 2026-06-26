from pydantic import BaseModel, EmailStr
from typing import Optional

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    type: Optional[str] = None

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[EmailStr] = None
    avatar_url: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True

class GitHubAuthRequest(BaseModel):
    code: str
