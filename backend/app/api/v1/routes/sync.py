from fastapi import APIRouter

from app.services.sync_service import SyncService

router = APIRouter()


@router.post("/push")
def push_sync(payload: dict):
    return SyncService.summarize_sync(payload)


@router.get("/status")
def sync_status():
    return {"status": "ready", "message": "Sync endpoint is active."}


@router.get("/logs")
def sync_logs():
    return {"logs": [], "message": "Sync logs ready for Supabase integration."}
