#!/usr/bin/env bash
# exit on error
set -o errexit

python -m pip install --upgrade pip
pip install -r backend/requirements.txt

# Execute database schema setup and seed initialization if database is configured
if [ -f "backend/setup_database.py" ]; then
    echo "Running database setup..."
    python backend/setup_database.py || echo "Database setup skipped or failed (check DB credentials)."
fi
