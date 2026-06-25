from fastapi import APIRouter, HTTPException

from app.services.match_service import MatchService
from app.services.supabase_store import SupabaseStore

router = APIRouter()


@router.get("/job/{job_id}")
def match_workers(job_id: str):
    client = SupabaseStore.client()
    if not client:
        raise HTTPException(status_code=500, detail="Database client not configured")

    # Fetch job from Supabase
    job_res = client.table("jobs").select("*").eq("id", job_id).execute()
    if not job_res.data:
        raise HTTPException(status_code=404, detail="Job not found")
    job_data = job_res.data[0]

    job = {
        "id": job_data["id"],
        "required_skill": job_data.get("required_skill") or "",
        "location": job_data.get("location") or "",
        "payment": float(job_data.get("daily_wage") or 0.0)
    }

    # Fetch workers from Supabase
    workers_res = client.table("workers").select("*").execute()
    workers = []
    for w in (workers_res.data or []):
        workers.append({
            "id": w["id"],
            "name": w["name"],
            "phone": w.get("phone") or "",
            "state": w.get("state") or "",
            "skills": w.get("skills") or [],
            "daily_rate": float(w.get("daily_rate") or 0.0)
        })

    return {"job_id": job_id, "matches": MatchService.build_match_scores(job, workers)}
