#!/bin/sh

# Start FastAPI application in the foreground (binds to Render's dynamic PORT)
# Celery background tasks have been migrated to FastAPI's native BackgroundTasks to run in a thread pool and stay under Render's 512MB RAM limit.
echo "Starting FastAPI web application on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
