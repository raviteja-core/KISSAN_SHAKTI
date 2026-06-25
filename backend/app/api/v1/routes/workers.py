from typing import List

from fastapi import APIRouter, HTTPException

from app.models.schemas import WorkerCreate, WorkerOut
from app.services.supabase_store import SupabaseStore

router = APIRouter()


@router.get("/", response_model=List[WorkerOut])
def list_workers():
    return SupabaseStore.list('workers', [])


@router.post("/", response_model=WorkerOut)
def create_worker(payload: WorkerCreate):
    import datetime
    import uuid
    worker = {
        "id": str(uuid.uuid4()),
        "name": payload.name,
        "phone": payload.phone,
        "state": payload.state,
        "skills": payload.skills,
        "daily_rate": payload.daily_rate,
        "status": payload.status,
        "created_at": datetime.datetime.utcnow().isoformat() + 'Z',
        "updated_at": datetime.datetime.utcnow().isoformat() + 'Z',
        "sync_status": 'pending_create',
    }
    try:
        return SupabaseStore.create('workers', worker, worker)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete("/{worker_id}")
def delete_worker(worker_id: str):
    if SupabaseStore.delete('workers', worker_id):
        return {"message": "Worker deleted", "id": worker_id}
    raise HTTPException(status_code=404, detail="Worker not found")
