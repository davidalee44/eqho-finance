#!/bin/bash
set -e

# Wait for MongoDB to be ready
if [ -n "$MONGODB_URL" ]; then
    echo "Waiting for MongoDB..."
    sleep 5
fi

# Get port from environment variable (Railway sets PORT)
# Default to 8000 if not set
PORT=${PORT:-8000}

# Run the application
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT

