from typing import List
import datetime
import uuid

from fastapi import APIRouter, HTTPException

from app.models.schemas import CropCreate, CropOut
from app.services.supabase_store import SupabaseStore
from app.services.sync_service import SyncService

router = APIRouter()


def db_to_crop(db_row: dict) -> dict:
    return {
        "id": db_row["id"],
        "farmer_id": db_row["farmer_id"],
        "name": db_row["name"],
        "category": db_row["category"],
        "quantity_kg": float(db_row["quantity_kg"] or 0.0),
        "price_per_kg": float(db_row["price_per_kg"] or 0.0),
        "status": db_row.get("status") or "available",
        "harvest_date": str(db_row.get("harvest_date") or ""),
        "created_at": db_row.get("created_at") or "",
        "updated_at": db_row.get("updated_at") or "",
        "sync_status": db_row.get("sync_status") or "synced",
    }


@router.get("/", response_model=List[CropOut])
def list_crops():
    rows = SupabaseStore.list('crops', [])
    return [db_to_crop(r) for r in rows]


@router.post("/", response_model=CropOut)
def create_crop(payload: CropCreate):
    now = datetime.datetime.utcnow().isoformat() + 'Z'
    crop_id = SyncService._normalize_uuid(str(uuid.uuid4()))
    farmer_id = SyncService._normalize_uuid(payload.farmer_id)
    
    crop = {
        "id": crop_id,
        "farmer_id": farmer_id,
        "name": payload.name,
        "category": payload.category,
        "quantity_kg": payload.quantity_kg,
        "price_per_kg": payload.price_per_kg,
        "status": payload.status or "available",
        "harvest_date": payload.harvest_date,
        "created_at": now,
        "updated_at": now,
        "sync_status": 'synced',
    }
    try:
        result = SupabaseStore.create('crops', crop, crop)
        return db_to_crop(result)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete("/{crop_id}")
def delete_crop(crop_id: str):
    normalized_id = SyncService._normalize_uuid(crop_id)
    if SupabaseStore.delete('crops', normalized_id):
        return {"message": "Crop deleted", "id": crop_id}
    raise HTTPException(status_code=404, detail="Crop not found")
