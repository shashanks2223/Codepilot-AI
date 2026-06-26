from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import OperationalError
from typing import Generator
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

# Try to connect to PostgreSQL. If connection fails, auto-fall back to SQLite for easy host execution.
try:
    if settings.DATABASE_URL.startswith("sqlite"):
        engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
    else:
        engine = create_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20
        )
        # Verify connection
        with engine.connect() as conn:
            pass
except (OperationalError, Exception) as e:
    # Print warnings to console
    print(f"\n[WARNING] Failed to connect to PostgreSQL: {str(e)}")
    print("[WARNING] Auto-falling back to local SQLite database: sqlite:///./codepilot.db\n")
    
    db_path = "sqlite:///./codepilot.db"
    engine = create_engine(db_path, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
