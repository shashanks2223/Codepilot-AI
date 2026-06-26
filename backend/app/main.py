from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.database.session import engine
from app.database.base_class import Base
from app.api import auth, repositories, reviews, ai

# Auto-create tables on startup (great for sandbox and quick starts)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Import all models to ensure they are registered on Base
    from app.models import models
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip().rstrip("/") for origin in settings.BACKEND_CORS_ORIGINS.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(repositories.router, prefix=f"{settings.API_V1_STR}/repositories", tags=["Repositories"])
app.include_router(reviews.router, prefix=f"{settings.API_V1_STR}/review", tags=["Code Reviews"])
app.include_router(ai.router, prefix=f"{settings.API_V1_STR}/ai", tags=["AI Copilot Services"])

@app.get("/health", tags=["Monitoring"])
def health_check():
    return {"status": "healthy", "service": settings.PROJECT_NAME}
