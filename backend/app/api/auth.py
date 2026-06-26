import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import httpx

from app.core import security
from app.core.config import settings
from app.database.session import get_db
from app.models.models import User, Session as UserSession
from app.schemas.auth import Token, RefreshTokenRequest, UserResponse
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/login")
def github_login():
    """Redirect user's browser to GitHub OAuth authorization URL."""
    if not settings.GITHUB_CLIENT_ID:
        # In mock bypass mode, redirect straight back with the mock code parameter
        return RedirectResponse(f"{settings.FRONTEND_URL}/login?code=mock_development_code")
        
    github_url = (
        "https://github.com/login/oauth/authorize"
        f"?client_id={settings.GITHUB_CLIENT_ID}"
        f"&redirect_uri={settings.BACKEND_URL}/api/auth/callback"
        "&scope=repo,user"
    )
    return RedirectResponse(github_url)


@router.get("/callback")
async def github_callback(code: str, db: Session = Depends(get_db)):
    """Exchange authorization code for tokens and redirect to the frontend with JWTs."""
    # 1. Developer / Mock Authentication Bypass
    if code == "mock_development_code" or not settings.GITHUB_CLIENT_ID:
        user = db.query(User).filter(User.username == "mock_developer").first()
        if not user:
            user = User(
                github_id=12345678,
                username="mock_developer",
                email="developer@codepilot.ai",
                avatar_url="https://avatars.githubusercontent.com/u/9919?v=4",
                github_access_token="mock_github_access_token_12345"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
    else:
        # 2. Real GitHub OAuth Exchange Flow
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://github.com/login/oauth/access_token",
                headers={"Accept": "application/json"},
                data={
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": f"{settings.BACKEND_URL}/api/auth/callback",
                },
                timeout=10.0
            )
            
            if token_response.status_code != 200:
                return RedirectResponse(f"{settings.FRONTEND_URL}/login?error=token_exchange_failed")
            
            token_data = token_response.json()
            if "error" in token_data:
                return RedirectResponse(
                    f"{settings.FRONTEND_URL}/login?error={token_data.get('error')}"
                )
                
            access_token = token_data.get("access_token")
            if not access_token:
                return RedirectResponse(f"{settings.FRONTEND_URL}/login?error=missing_access_token")
                
            # Fetch User Profile from GitHub
            user_response = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"token {access_token}",
                    "Accept": "application/json"
                },
                timeout=10.0
            )
            
            if user_response.status_code != 200:
                return RedirectResponse(f"{settings.FRONTEND_URL}/login?error=profile_fetch_failed")
                
            user_info = user_response.json()
            github_id = user_info["id"]
            username = user_info["login"]
            email = user_info.get("email")
            avatar_url = user_info.get("avatar_url")
            
            # Upsert user in db
            user = db.query(User).filter(User.github_id == github_id).first()
            if user:
                user.username = username
                user.email = email
                user.avatar_url = avatar_url
                user.github_access_token = access_token
            else:
                user = User(
                    github_id=github_id,
                    username=username,
                    email=email,
                    avatar_url=avatar_url,
                    github_access_token=access_token
                )
                db.add(user)
            
            db.commit()
            db.refresh(user)

    # 3. Create Session Tokens
    jwt_access_token = security.create_access_token(subject=user.id)
    jwt_refresh_token = security.create_refresh_token(subject=user.id)
    
    # Save refresh token in database
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    session_record = UserSession(
        user_id=user.id,
        refresh_token=jwt_refresh_token,
        expires_at=expires_at
    )
    db.add(session_record)
    db.commit()
    
    # Redirect user back to the frontend with access and refresh tokens
    return RedirectResponse(
        f"{settings.FRONTEND_URL}/login?token={jwt_access_token}&refresh_token={jwt_refresh_token}"
    )


@router.post("/refresh", response_model=Token)
def refresh_token(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    token_payload = security.verify_token(payload.refresh_token)
    if not token_payload or token_payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or expired refresh token",
        )
        
    session_record = db.query(UserSession).filter(
        UserSession.refresh_token == payload.refresh_token,
        UserSession.is_revoked == False,
        UserSession.expires_at > datetime.datetime.utcnow()
    ).first()
    
    if not session_record:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Session expired, revoked, or not found",
        )
        
    # Rotate refresh token: revoke old one, issue new pair
    session_record.is_revoked = True
    db.commit()
    
    user_id = token_payload.get("sub")
    new_access_token = security.create_access_token(subject=user_id)
    new_refresh_token = security.create_refresh_token(subject=user_id)
    
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    new_session_record = UserSession(
        user_id=int(user_id),
        refresh_token=new_refresh_token,
        expires_at=expires_at
    )
    db.add(new_session_record)
    db.commit()
    
    return Token(access_token=new_access_token, refresh_token=new_refresh_token)


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    session_record = db.query(UserSession).filter(
        UserSession.refresh_token == payload.refresh_token
    ).first()
    if session_record:
        session_record.is_revoked = True
        db.commit()
    return {"detail": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
