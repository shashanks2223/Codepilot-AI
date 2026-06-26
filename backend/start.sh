#!/bin/sh

# 1. Start Celery worker in the background using "solo" pool (eliminates forked worker processes to keep memory under 512MB)
echo "Starting Celery worker process (pool: solo)..."
celery -A app.workers.celery_app worker --loglevel=info --pool=solo &

# 2. Start FastAPI application in the foreground (binds to Render's dynamic PORT)
echo "Starting FastAPI web application on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
