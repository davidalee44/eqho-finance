#!/bin/bash
set -e

# Wait for MongoDB to be ready
if [ -n "$MONGODB_URL" ]; then
    echo "Waiting for MongoDB..."
    sleep 5
fi

# Run the application
exec uvicorn app.main:app --host 0.0.0.0 --port 8000

