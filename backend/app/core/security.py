import time
import datetime
from typing import Any, Union, Optional
import jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(
    subject: Union[str, Any], expires_delta: Optional[datetime.timedelta] = None
) -> str:
    if expires_delta:
        expire_time = int(time.time() + expires_delta.total_seconds())
    else:
        expire_time = int(time.time() + (settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60))
        
    to_encode = {"exp": expire_time, "sub": str(subject), "type": "access"}
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(
    subject: Union[str, Any], expires_delta: Optional[datetime.timedelta] = None
) -> str:
    if expires_delta:
        expire_time = int(time.time() + expires_delta.total_seconds())
    else:
        expire_time = int(time.time() + (settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600))
        
    to_encode = {"exp": expire_time, "sub": str(subject), "type": "refresh"}
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[dict]:
    try:
        decoded_token = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM]
        )
        return decoded_token
    except jwt.PyJWTError:
        return None

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)
