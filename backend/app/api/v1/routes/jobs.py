from typing import List
import datetime
import uuid

from fastapi import APIRouter, HTTPException

from app.models.schemas import JobCreate, JobOut
from app.services.supabase_store import SupabaseStore
from app.services.sync_service import SyncService

router = APIRouter()


def db_to_job(db_row: dict) -> dict:
    return {
        "id": db_row["id"],
        "farmer_id": db_row.get("farmer_id") or "user_farmer_ramesh",
        "worker_id": db_row.get("laborer_id"),
        "title": db_row["title"],
        "description": db_row["description"],
        "location": db_row.get("location") or "",
        "required_skill": db_row.get("required_skill") or "",
        "payment": float(db_row.get("daily_wage") or 0.0),
        "status": db_row.get("status") or "OPEN",
        "created_at": db_row.get("created_at") or "",
        "updated_at": db_row.get("updated_at") or "",
        "sync_status": "synced",
    }


@router.get("/", response_model=List[JobOut])
def list_jobs():
    rows = SupabaseStore.list('jobs', [])
    return [db_to_job(r) for r in rows]


@router.post("/", response_model=JobOut)
def create_job(payload: JobCreate):
    now = datetime.datetime.utcnow().isoformat() + 'Z'
    job_id = str(uuid.uuid4())
    job = {
        "id": job_id,
        "farmer_id": "user_farmer_ramesh",  # default mock farmer if not specified in JobCreate
        "laborer_id": payload.worker_id,
        "title": payload.title,
        "description": payload.description,
        "location": payload.location,
        "daily_wage": payload.payment,
        "required_skill": payload.required_skill,
        "status": payload.status.upper() if payload.status else "OPEN",
        "created_at": now,
        "updated_at": now,
    }
    try:
        res = SupabaseStore.create('jobs', job, job)
        return db_to_job(res)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/{job_id}/assign")
def assign_worker(job_id: str, worker_id: str):
    # Set status to ASSIGNED in database
    updated = SupabaseStore.update('jobs', job_id, {"laborer_id": worker_id, "status": 'ASSIGNED'})
    if updated is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"message": "Worker assigned", "job_id": job_id, "worker_id": worker_id}


@router.delete("/{job_id}/unassign")
def unassign_worker(job_id: str):
    updated = SupabaseStore.update('jobs', job_id, {"laborer_id": None, "status": 'OPEN'})
    if updated is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"message": "Worker unassigned", "job_id": job_id}


@router.delete("/{job_id}")
def delete_job(job_id: str):
    if SupabaseStore.delete('jobs', job_id):
        return {"message": "Job deleted", "id": job_id}
    raise HTTPException(status_code=404, detail="Job not found")
