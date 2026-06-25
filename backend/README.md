# KissanShakti Backend

This backend provides a Python + FastAPI API layer for the existing KissanShakti frontend.

## Run locally

1. cd backend
2. python -m venv .venv
3. source .venv/bin/activate
4. pip install -r requirements.txt
5. uvicorn app.main:app --reload

## Useful endpoints

- GET /health
- GET /api/v1/crops/
- GET /api/v1/workers/
- GET /api/v1/jobs/
- GET /api/v1/matches/job/{job_id}
- POST /api/v1/sync/push
