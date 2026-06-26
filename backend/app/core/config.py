import os
from pydantic_settings import BaseSettings
from pydantic import ConfigDict, field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "CodePilot AI"
    API_V1_STR: str = "/api"
    
    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str] | str:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        return v

    
    # Database
    DATABASE_URL: str = "postgresql://codepilot_user:codepilot_password@db:5432/codepilot"
    
    # Redis & Celery
    REDIS_URL: str = "redis://redis:6379/0"
    CELERY_BROKER_URL: str = "redis://redis:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/0"
    
    # Authentication
    JWT_SECRET: str = "supersecretjwtkey_replace_in_prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # GitHub OAuth
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_REDIRECT_URI: str = "http://localhost/api/auth/callback"
    
    # Gemini API Key
    GEMINI_API_KEY: str = ""

    # CORS Origins (Comma-separated string in env, parsed to list)
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost",
        "http://127.0.0.1:3000",
        "http://127.0.0.1"
    ]

    model_config = ConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore"
    )

settings = Settings()
