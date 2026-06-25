import datetime as dt
import hashlib
import uuid
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from pydantic import BaseModel, Field

from app.services.supabase_store import SupabaseStore
from app.services.sync_service import SyncService

router = APIRouter()


def now_iso() -> str:
    return dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def make_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def public_user(user: Dict[str, Any]) -> Dict[str, Any]:
    clean = dict(user)
    # Parse password_hash and document_url from admin_note
    admin_note = clean.get("admin_note") or ""
    parts = admin_note.split("|")
    pwd_hash = ""
    note_text = ""
    doc_url = ""
    
    if len(parts) >= 1:
        if len(parts[0]) == 64:
            pwd_hash = parts[0]
            note_text = parts[1] if len(parts) >= 2 else ""
            doc_url = parts[2] if len(parts) >= 3 else ""
        else:
            note_text = parts[0]
            doc_url = parts[1] if len(parts) >= 2 else ""
            
    clean["admin_note"] = note_text
    clean["document_url"] = doc_url
    
    # Remove any password_hash field
    if "password_hash" in clean:
        del clean["password_hash"]
        
    clean["skills"] = clean.get("skills") or []
    
    # Normalize role to lowercase for frontend expectations
    if "role" in clean:
        clean["role"] = clean["role"].lower()
        
    # Map status to frontend expectations
    status = clean.get("status") or "PENDING"
    clean["isVerified"] = (status == "APPROVED")
    clean["isBlacklisted"] = (status == "BLACKLISTED")
    
    if status == "APPROVED":
        clean["verificationStep"] = "completed"
    elif status == "BLACKLISTED":
        clean["verificationStep"] = "blacklist_scan"
    else:
        clean["verificationStep"] = "onboarding"
        
    return clean


def days_between(start_date: str, end_date: str) -> int:
    try:
        start = dt.date.fromisoformat(start_date)
        end = dt.date.fromisoformat(end_date)
        return max(1, (end - start).days + 1)
    except ValueError:
        return 1


class LoginPayload(BaseModel):
    role: str
    email: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None


class RegisterPayload(BaseModel):
    role: str
    email: str
    password: str
    full_name: str
    phone: str
    state: str = "Maharashtra"
    buyer_type: Optional[str] = None
    preferences: Optional[List[str]] = None
    skills: List[str] = []
    daily_rate: Optional[float] = None
    experience_yrs: Optional[int] = None


class ListingPayload(BaseModel):
    farmer_id: str
    name: str
    category: str
    quantity_kg: float
    price_per_kg: float
    location: str
    description: Optional[str] = None
    status: str = "active"


class InquiryPayload(BaseModel):
    buyer_id: str
    farmer_id: str
    listing_id: str
    message: Optional[str] = None
    quantity_kg: Optional[float] = None


class InquiryStatusPayload(BaseModel):
    status: str


class AdvisoryPayload(BaseModel):
    farmer_id: str
    input_type: Literal["image", "voice", "text"]
    input_reference: Optional[str] = None
    description: Optional[str] = None
    language: str = "en-IN"


class DraftListingPayload(BaseModel):
    farmer_id: str
    name: str
    category: str
    quantity_kg: float
    price_per_kg: float
    location: str
    description: Optional[str] = None
    status: str = "draft"


class AIDraftPayload(BaseModel):
    text: Optional[str] = None
    voice_transcript: Optional[str] = None
    location_hint: Optional[str] = None
    category_hint: Optional[str] = None
    quantity_kg: Optional[float] = None
    price_per_kg: Optional[float] = None


class EquipmentPayload(BaseModel):
    owner_id: str
    name: str
    category: str
    description: str = ""
    daily_rate: float
    location: str
    available: bool = True


class RentalPayload(BaseModel):
    equipment_id: str
    renter_id: str
    start_date: str
    end_date: str
    message: str = ""


class RentalStatusPayload(BaseModel):
    status: str


class JobPayload(BaseModel):
    farmer_id: str
    title: str
    description: str
    location: str
    required_skill: str
    daily_wage: float
    planned_days: int = 1
    start_date: str
    assigned_tasks: List[str] = Field(default_factory=list)


class ApplicationPayload(BaseModel):
    job_id: str
    laborer_id: str
    message: str = ""


class ApplicationStatusPayload(BaseModel):
    status: str


class LaborEngagementPayload(BaseModel):
    farmer_id: str
    worker_id: str
    job_id: str
    cost_per_laborer: float
    working_days: int
    duration: str
    assigned_tasks: List[str] = Field(default_factory=list)
    status: str = "ACTIVE"


class WorkdayPayload(BaseModel):
    job_id: str
    laborer_id: str
    date: str
    present: bool = True
    note: str = ""


class VerificationPayload(BaseModel):
    status: str
    admin_note: str = ""


class BlacklistPayload(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    reason: str


class VoiceSessionPayload(BaseModel):
    user_id: Optional[str] = None
    session_id: str
    transcript: str
    language: str = "en-IN"
    translated_text: Optional[str] = None
    source: str = "intern4-ai-transcriber"
    metadata: Dict[str, Any] = {}


def find_user(user_id: str) -> Dict[str, Any]:
    client = SupabaseStore.client()
    if not client:
        raise HTTPException(status_code=500, detail="Database client not configured")
    res = client.table("profiles").select("*").eq("id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    return res.data[0]


def enrich_equipment(item: Dict[str, Any]) -> Dict[str, Any]:
    owner = find_user(item["owner_id"])
    return {**item, "owner": public_user(owner)}


def enrich_job(item: Dict[str, Any]) -> Dict[str, Any]:
    farmer = find_user(item["farmer_id"])
    laborer = find_user(item["laborer_id"]) if item.get("laborer_id") else None
    
    client = SupabaseStore.client()
    application_count = 0
    if client:
        app_res = client.table("applications").select("count", count="exact").eq("job_id", item["id"]).execute()
        application_count = app_res.count or 0
        
    return {
        **item,
        "farmer": public_user(farmer),
        "laborer": public_user(laborer) if laborer else None,
        "application_count": application_count,
        "payment": float(item.get("daily_wage") or 0.0), # map daily_wage to payment for frontend compatibility
        "worker_id": item.get("laborer_id"), # map laborer_id to worker_id
    }


def enrich_application(item: Dict[str, Any]) -> Dict[str, Any]:
    client = SupabaseStore.client()
    if not client:
        raise HTTPException(status_code=500, detail="Database not configured")
    job_res = client.table("jobs").select("*").eq("id", item["job_id"]).execute()
    if not job_res.data:
        raise HTTPException(status_code=404, detail="Job not found")
    job = job_res.data[0]
    laborer = find_user(item["laborer_id"])
    return {**item, "job": enrich_job(job), "laborer": public_user(laborer)}


def enrich_rental(item: Dict[str, Any]) -> Dict[str, Any]:
    client = SupabaseStore.client()
    if not client:
        raise HTTPException(status_code=500, detail="Database not configured")
    eq_res = client.table("equipment").select("*").eq("id", item["equipment_id"]).execute()
    if not eq_res.data:
        raise HTTPException(status_code=404, detail="Equipment not found")
    equipment = eq_res.data[0]
    renter = find_user(item["renter_id"])
    owner = find_user(item["owner_id"])
    return {
        **item,
        "equipment": enrich_equipment(equipment),
        "renter": public_user(renter),
        "owner": public_user(owner),
    }


def enrich_engagement(item: Dict[str, Any]) -> Dict[str, Any]:
    farmer = find_user(item["farmer_id"])
    worker = find_user(item["worker_id"])
    client = SupabaseStore.client()
    job = None
    if client:
        job_res = client.table("jobs").select("*").eq("id", item["job_id"]).execute()
        job = job_res.data[0] if job_res.data else None
    return {
        **item,
        "farmer": public_user(farmer),
        "worker": public_user(worker),
        "job": enrich_job(job) if job else None,
    }


def find_listing(listing_id: str) -> Dict[str, Any]:
    client = SupabaseStore.client()
    if not client:
        raise HTTPException(status_code=500, detail="Database not configured")
    res = client.table("listings").select("*").eq("id", listing_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Listing not found")
    return res.data[0]


def enrich_listing(item: Dict[str, Any]) -> Dict[str, Any]:
    farmer = find_user(item["farmer_id"])
    return {**item, "farmer": public_user(farmer)}


def enrich_inquiry(item: Dict[str, Any]) -> Dict[str, Any]:
    buyer = find_user(item["buyer_id"])
    farmer = find_user(item["farmer_id"])
    listing = find_listing(item["listing_id"])
    return {
        **item,
        "buyer": public_user(buyer),
        "farmer": public_user(farmer),
        "listing": enrich_listing(listing),
    }


def enrich_advisory(item: Dict[str, Any]) -> Dict[str, Any]:
    farmer = find_user(item["farmer_id"])
    return {**item, "farmer": public_user(farmer)}


def find_draft_listing(draft_id: str) -> Dict[str, Any]:
    client = SupabaseStore.client()
    if not client:
        raise HTTPException(status_code=500, detail="Database not configured")
    res = client.table("draft_listings").select("*").eq("id", draft_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Draft listing not found")
    return res.data[0]


def notify(user_id: str, type_: str, title: str, message: str, link: Optional[str] = None) -> Dict[str, Any]:
    item = {
        "id": make_id("note"),
        "user_id": user_id,
        "type": type_,
        "title": title,
        "message": message,
        "read": False,
        "link": link,
        "created_at": now_iso(),
    }
    SupabaseStore.create("notifications", item, item)
    return item


def ensure_not_blacklisted(email: Optional[str], phone: Optional[str]):
    client = SupabaseStore.client()
    if not client:
        return
    if email:
        res = client.table("blacklist").select("*").eq("email", email.lower()).execute()
        if res.data:
            raise HTTPException(status_code=403, detail=f"Blacklisted: {res.data[0]['reason']}")
    if phone:
        res = client.table("blacklist").select("*").eq("phone", phone.strip()).execute()
        if res.data:
            raise HTTPException(status_code=403, detail=f"Blacklisted: {res.data[0]['reason']}")


@router.post("/seed")
def seed():
    return {"seeded": True, "message": "Supabase pre-seeded state active."}


@router.post("/auth/login")
def login(payload: LoginPayload):
    role = payload.role.upper()
    email = str(payload.email).lower() if payload.email else None
    phone = payload.phone
    
    client = SupabaseStore.client()
    if not client:
        raise HTTPException(status_code=500, detail="Database client not configured")
        
    query = client.table("profiles").select("*").eq("role", role)
    if email:
        query = query.eq("email", email)
    elif phone:
        query = query.eq("phone", phone.strip())
        
    res = query.execute()
    if not res.data:
        raise HTTPException(status_code=401, detail="Invalid credentials for this portal")
        
    user = res.data[0]
    
    # Parse password hash from admin_note
    admin_note = user.get("admin_note") or ""
    parts = admin_note.split("|", 1)
    db_password_hash = ""
    if len(parts) == 2 and len(parts[0]) == 64:
        db_password_hash = parts[0]
        
    if payload.password and db_password_hash != hash_password(payload.password):
        raise HTTPException(status_code=401, detail="Invalid credentials for this portal")
        
    # Check blacklist
    ensure_not_blacklisted(user["email"], user["phone"])
    
    if user["status"] == "BLACKLISTED":
        raise HTTPException(status_code=403, detail=f"Account blacklisted: {user.get('blacklist_reason')}")
    if user["status"] == "REJECTED":
        raise HTTPException(status_code=403, detail=f"Registration rejected: {user.get('admin_note')}")
        
    return {"user": public_user(user)}


@router.post("/auth/register")
def register(payload: RegisterPayload):
    role = payload.role.upper()
    email = str(payload.email).lower()
    ensure_not_blacklisted(email, payload.phone)
    
    client = SupabaseStore.client()
    if not client:
        raise HTTPException(status_code=500, detail="Database client not configured")
        
    res = client.table("profiles").select("*").eq("email", email).execute()
    if res.data:
        raise HTTPException(status_code=409, detail="Email already registered")
        
    pwd_hash = hash_password(payload.password)
    admin_note = f"{pwd_hash}|Awaiting admin verification."
    
    user_id = make_id("user")
    
    user = {
        "id": user_id,
        "email": email,
        "full_name": payload.full_name,
        "phone": payload.phone,
        "role": role,
        "state": payload.state,
        "buyer_type": payload.buyer_type,
        "preferences": payload.preferences or [],
        "skills": payload.skills or [],
        "daily_rate": payload.daily_rate,
        "experience_yrs": payload.experience_yrs,
        "status": "PENDING",
        "blacklist_reason": None,
        "admin_note": admin_note,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    
    SupabaseStore.create("profiles", user, user)
    notify("user_admin", "VERIFICATION", "New verification pending", f"{payload.full_name} registered as {role}.", "verifications")
    return {"user": public_user(user)}


@router.get("/me")
def me(user_id: str):
    return {"user": public_user(find_user(user_id))}


@router.get("/equipment")
def list_equipment(
    owner_id: Optional[str] = None,
    exclude_owner: Optional[str] = None,
    available_only: bool = False,
    q: str = "",
):
    client = SupabaseStore.client()
    if not client:
        return {"items": []}
        
    query = client.table("equipment").select("*")
    if owner_id:
        query = query.eq("owner_id", owner_id)
    if exclude_owner:
        query = query.neq("owner_id", exclude_owner)
    if available_only:
        query = query.eq("available", True)
        
    res = query.execute()
    items = res.data or []
    
    if q:
        needle = q.lower()
        items = [e for e in items if needle in f"{e['name']} {e['category']} {e.get('description') or ''} {e['location']}".lower()]
        
    return {"items": [enrich_equipment(e) for e in items]}


@router.post("/equipment")
def create_equipment(payload: EquipmentPayload):
    owner = find_user(payload.owner_id)
    if owner["role"].upper() != "FARMER":
        raise HTTPException(status_code=403, detail="Only farmers can list equipment")
        
    item = {
        "id": make_id("eq"),
        **payload.model_dump(),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    SupabaseStore.create("equipment", item, item)
    notify(payload.owner_id, "SYSTEM", "Equipment listed", f"{payload.name} is now listed for rent.", "my-equipment")
    return {"item": enrich_equipment(item)}


@router.patch("/equipment/{equipment_id}")
def update_equipment(equipment_id: str, payload: Dict[str, Any]):
    client = SupabaseStore.client()
    if not client:
        raise HTTPException(status_code=500, detail="Database not configured")
        
    res = client.table("equipment").select("*").eq("id", equipment_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Equipment not found")
        
    allowed = {"name", "category", "description", "daily_rate", "location", "available"}
    updates = {k: v for k, v in payload.items() if k in allowed}
    updates["updated_at"] = now_iso()
    
    updated = SupabaseStore.update("equipment", equipment_id, updates)
    return {"item": enrich_equipment(updated)}


@router.delete("/equipment/{equipment_id}")
def delete_equipment(equipment_id: str):
    success = SupabaseStore.delete("equipment", equipment_id)
    return {"deleted": success}


@router.get("/rentals")
def list_rentals(user_id: Optional[str] = None):
    client = SupabaseStore.client()
    if not client:
        return {"items": []}
        
    query = client.table("rentals").select("*")
    res = query.execute()
    items = res.data or []
    
    if user_id:
        items = [r for r in items if r["owner_id"] == user_id or r["renter_id"] == user_id]
        
    return {"items": [enrich_rental(r) for r in items]}


@router.post("/rentals")
def create_rental(payload: RentalPayload):
    client = SupabaseStore.client()
    if not client:
        raise HTTPException(status_code=500, detail="Database not configured")
        
    eq_res = client.table("equipment").select("*").eq("id", payload.equipment_id).execute()
    if not eq_res.data:
        raise HTTPException(status_code=404, detail="Equipment not found")
    equipment = eq_res.data[0]
    
    if not equipment["available"]:
        raise HTTPException(status_code=409, detail="Equipment is already rented out")
        
    renter = find_user(payload.renter_id)
    if renter["role"].upper() != "FARMER":
        raise HTTPException(status_code=403, detail="Only farmers can rent equipment")
        
    days = days_between(payload.start_date, payload.end_date)
    item = {
        "id": make_id("rent"),
        "equipment_id": equipment["id"],
        "renter_id": renter["id"],
        "owner_id": equipment["owner_id"],
        "status": "REQUESTED",
        "start_date": payload.start_date,
        "end_date": payload.end_date,
        "days": days,
        "total_cost": days * float(equipment["daily_rate"]),
        "message": payload.message,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    
    SupabaseStore.create("rentals", item, item)
    notify(equipment["owner_id"], "RENTAL_REQUEST", "New rental request", f"{renter['full_name']} requested {equipment['name']}.", "my-rentals")
    notify(renter["id"], "RENTAL_REQUEST", "Rental request sent", f"Request sent for {equipment['name']}.", "my-rentals")
    return {"item": enrich_rental(item)}


@router.patch("/rentals/{rental_id}")
def update_rental(rental_id: str, payload: RentalStatusPayload):
    client = SupabaseStore.client()
    if not client:
        raise HTTPException(status_code=500, detail="Database not configured")
        
    rent_res = client.table("rentals").select("*").eq("id", rental_id).execute()
    if not rent_res.data:
        raise HTTPException(status_code=404, detail="Rental not found")
    rental = rent_res.data[0]
    
    status = payload.status.upper()
    rental["status"] = status
    rental["updated_at"] = now_iso()
    
    eq_res = client.table("equipment").select("*").eq("id", rental["equipment_id"]).execute()
    if not eq_res.data:
         raise HTTPException(status_code=404, detail="Equipment not found")
    equipment = eq_res.data[0]
    
    if status in {"ACCEPTED", "ACTIVE"}:
        equipment["available"] = False
    elif status in {"COMPLETED", "REJECTED", "CANCELLED"}:
        equipment["available"] = True
        
    SupabaseStore.update("rentals", rental_id, {"status": status, "updated_at": rental["updated_at"]})
    SupabaseStore.update("equipment", equipment["id"], {"available": equipment["available"]})
    
    notify(rental["owner_id"], f"RENTAL_{status}", "Rental updated", f"{equipment['name']} marked {status}.", "my-rentals")
    notify(rental["renter_id"], f"RENTAL_{status}", "Rental updated", f"{equipment['name']} marked {status}.", "my-rentals")
    return {"item": enrich_rental(rental)}


@router.get("/engagements")
def list_engagements(farmer_id: Optional[str] = None, worker_id: Optional[str] = None, status: Optional[str] = None):
    client = SupabaseStore.client()
    if not client:
        return {"items": []}
        
    query = client.table("engagements").select("*")
    if farmer_id:
        query = query.eq("farmer_id", farmer_id)
    if worker_id:
        query = query.eq("worker_id", worker_id)
    if status:
        query = query.eq("status", status.upper())
        
    res = query.execute()
    return {"items": [enrich_engagement(e) for e in (res.data or [])]}


@router.post("/engagements")
def create_engagement(payload: LaborEngagementPayload):
    farmer = find_user(payload.farmer_id)
    if farmer["role"].upper() != "FARMER":
        raise HTTPException(status_code=403, detail="Only farmers can create labor engagements")
        
    worker = find_user(payload.worker_id)
    if worker["role"].upper() != "LABORER":
        raise HTTPException(status_code=403, detail="Only laborers can be engaged")
        
    client = SupabaseStore.client()
    if not client:
        raise HTTPException(status_code=500, detail="Database not configured")
        
    assigned_jobs_res = client.table("jobs").select("*").eq("laborer_id", worker["id"]).in_("status", ["ASSIGNED", "ACTIVE"]).execute()
    if assigned_jobs_res.data:
        raise HTTPException(status_code=409, detail="Laborer is already assigned to another farmer")
        
    job_res = client.table("jobs").select("*").eq("id", payload.job_id).execute()
    if not job_res.data:
        raise HTTPException(status_code=404, detail="Job not found")
    job = job_res.data[0]
    
    if job["farmer_id"] != farmer["id"]:
         raise HTTPException(status_code=403, detail="Farmer can only engage labor for their own jobs")
         
    if job.get("laborer_id") and job["laborer_id"] != worker["id"]:
         raise HTTPException(status_code=409, detail="Job already assigned to another laborer")
         
    job["laborer_id"] = worker["id"]
    job["status"] = "ASSIGNED"
    job["updated_at"] = now_iso()
    
    item = {
        "id": make_id("eng"),
        "farmer_id": farmer["id"],
        "worker_id": worker["id"],
        "job_id": job["id"],
        "cost_per_laborer": payload.cost_per_laborer,
        "working_days": payload.working_days,
        "duration": payload.duration,
        "assigned_tasks": payload.assigned_tasks,
        "status": payload.status.upper(),
        "total_cost": payload.cost_per_laborer * payload.working_days,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    
    SupabaseStore.update("jobs", job["id"], {"laborer_id": worker["id"], "status": "ASSIGNED", "updated_at": job["updated_at"]})
    SupabaseStore.create("engagements", item, item)
    
    notify(worker["id"], "LABOR_ENGAGED", "Labor assigned", f"{farmer['full_name']} engaged you for {job['title']}.", "my-job")
    notify(farmer["id"], "LABOR_ENGAGED", "Labor engagement created", f"{worker['full_name']} is working on {job['title']}.", "labor-hiring")
    return {"item": enrich_engagement(item)}


@router.get("/buyers")
def list_buyers(q: str = "", buyer_type: Optional[str] = None):
    client = SupabaseStore.client()
    if not client:
        return {"items": []}
    res = client.table("profiles").select("*").eq("role", "BUYER").execute()
    items = res.data or []
    if buyer_type:
        items = [u for u in items if u.get("buyer_type", "").lower() == buyer_type.lower()]
    if q:
        needle = q.lower()
        items = [u for u in items if needle in f"{u['full_name']} {u.get('email') or ''} {u.get('phone') or ''} {u.get('preferences') or ''}".lower()]
    return {"items": [public_user(u) for u in items]}


@router.get("/listings")
def list_listings(
    farmer_id: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    location: Optional[str] = None,
    q: str = "",
    buyer_id: Optional[str] = None,
    voice_query: Optional[str] = None,
):
    client = SupabaseStore.client()
    if not client:
        return {"items": []}
        
    query = client.table("listings").select("*")
    if farmer_id:
        query = query.eq("farmer_id", farmer_id)
    if status:
        query = query.eq("status", status.lower())
        
    res = query.execute()
    items = res.data or []
    
    if category:
        items = [l for l in items if category.lower() in l["category"].lower()]
    if location:
        items = [l for l in items if location.lower() in (l.get("location") or "").lower()]
    if q:
        needle = q.lower()
        items = [l for l in items if needle in f"{l['name']} {l['category']} {l.get('description') or ''} {l.get('location') or ''}".lower()]
        
    if buyer_id or voice_query:
        buyer = find_user(buyer_id) if buyer_id else None
        for listing in items:
            score = 0
            if buyer and buyer.get("preferences"):
                for pref in buyer["preferences"] or []:
                    if pref and pref.lower() in f"{listing['name']} {listing['category']} {listing.get('description') or ''}".lower():
                        score += 10
            if voice_query and voice_query.lower() in f"{listing['name']} {listing['category']} {listing.get('description') or ''} {listing.get('location') or ''}".lower():
                score += 5
            score += 1 if listing["status"] == "active" else 0
            listing["_match_score"] = score
        items = sorted(items, key=lambda x: x.get("_match_score", 0), reverse=True)
        
    return {"items": [enrich_listing(l) for l in items]}


@router.post("/listings")
def create_listing(payload: ListingPayload):
    farmer = find_user(payload.farmer_id)
    if farmer["role"].upper() != "FARMER":
        raise HTTPException(status_code=403, detail="Only farmers can create marketplace listings")
    item = {
        "id": make_id("list"),
        **payload.model_dump(),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    SupabaseStore.create("listings", item, item)
    notify(payload.farmer_id, "LISTING_CREATED", "Listing published", f"{payload.name} is now live in the marketplace.", "marketplace")
    return {"item": enrich_listing(item)}


@router.patch("/listings/{listing_id}")
def update_listing(listing_id: str, payload: Dict[str, Any]):
    item = find_listing(listing_id)
    allowed = {"name", "category", "quantity_kg", "price_per_kg", "location", "description", "status"}
    updates = {k: v for k, v in payload.items() if k in allowed}
    updates["updated_at"] = now_iso()
    
    updated = SupabaseStore.update("listings", listing_id, updates)
    return {"item": enrich_listing(updated)}


@router.delete("/listings/{listing_id}")
def delete_listing(listing_id: str):
    success = SupabaseStore.delete("listings", listing_id)
    return {"deleted": success, "id": listing_id}


@router.post("/listings/ai-draft")
def create_ai_draft(payload: AIDraftPayload):
    title = payload.text or payload.voice_transcript or "Fresh produce listing"
    category = payload.category_hint or "General"
    description = payload.text or payload.voice_transcript or "AI draft listing created from user input."
    item = {
        "id": make_id("draft"),
        "farmer_id": "user_farmer_ramesh",  # default
        "name": title[:50],
        "category": category,
        "quantity_kg": payload.quantity_kg or 100.0,
        "price_per_kg": payload.price_per_kg or 0.0,
        "location": payload.location_hint or "Unknown",
        "description": description,
        "status": "draft",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    SupabaseStore.create("draft_listings", item, item)
    return {"draft": item}


@router.get("/draft-listings")
def list_draft_listings(farmer_id: Optional[str] = None):
    client = SupabaseStore.client()
    if not client:
        return {"items": []}
    query = client.table("draft_listings").select("*")
    if farmer_id:
        query = query.eq("farmer_id", farmer_id)
    res = query.execute()
    return {"items": res.data or []}


@router.post("/draft-listings")
def create_draft_listing(payload: DraftListingPayload):
    farmer = find_user(payload.farmer_id)
    if farmer["role"].upper() != "FARMER":
        raise HTTPException(status_code=403, detail="Only farmers can create draft listings")
    item = {
        "id": make_id("draft"),
        **payload.model_dump(),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    SupabaseStore.create("draft_listings", item, item)
    return {"item": item}


@router.patch("/draft-listings/{draft_id}")
def update_draft_listing(draft_id: str, payload: Dict[str, Any]):
    item = find_draft_listing(draft_id)
    allowed = {"name", "category", "quantity_kg", "price_per_kg", "location", "description", "status"}
    updates = {k: v for k, v in payload.items() if k in allowed}
    updates["updated_at"] = now_iso()
    
    updated = SupabaseStore.update("draft_listings", draft_id, updates)
    return {"item": updated}


@router.post("/draft-listings/{draft_id}/publish")
def publish_draft_listing(draft_id: str):
    draft = find_draft_listing(draft_id)
    if draft["status"] != "draft":
        raise HTTPException(status_code=409, detail="Only draft listings can be published")
        
    listing = {
        "id": make_id("list"),
        "farmer_id": draft["farmer_id"],
        "name": draft["name"],
        "category": draft["category"],
        "quantity_kg": draft["quantity_kg"],
        "price_per_kg": draft["price_per_kg"],
        "location": draft["location"],
        "description": draft.get("description"),
        "status": "active",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    
    SupabaseStore.create("listings", listing, listing)
    SupabaseStore.delete("draft_listings", draft_id)
    notify(draft["farmer_id"], "LISTING_PUBLISHED", "Draft published", f"{draft['name']} has been published.", "marketplace")
    return {"item": enrich_listing(listing)}


@router.get("/inquiries")
def list_inquiries(
    buyer_id: Optional[str] = None,
    farmer_id: Optional[str] = None,
    listing_id: Optional[str] = None,
    status: Optional[str] = None,
):
    client = SupabaseStore.client()
    if not client:
        return {"items": []}
        
    query = client.table("inquiries").select("*")
    if buyer_id:
        query = query.eq("buyer_id", buyer_id)
    if farmer_id:
        query = query.eq("farmer_id", farmer_id)
    if listing_id:
        query = query.eq("listing_id", listing_id)
    if status:
        query = query.eq("status", status.lower())
        
    res = query.execute()
    return {"items": [enrich_inquiry(i) for i in (res.data or [])]}


@router.post("/inquiries")
def create_inquiry(payload: InquiryPayload):
    buyer = find_user(payload.buyer_id)
    if buyer["role"].upper() != "BUYER":
        raise HTTPException(status_code=403, detail="Only buyers can send inquiries")
    farmer = find_user(payload.farmer_id)
    if farmer["role"].upper() != "FARMER":
        raise HTTPException(status_code=403, detail="Inquiries must target a farmer")
        
    listing = find_listing(payload.listing_id)
    if listing["status"] != "active":
        raise HTTPException(status_code=409, detail="Listing is not available")
        
    client = SupabaseStore.client()
    if not client:
        raise HTTPException(status_code=500, detail="Database not configured")
        
    dup = client.table("inquiries").select("*").eq("buyer_id", buyer["id"]).eq("listing_id", listing["id"]).execute()
    if dup.data:
        raise HTTPException(status_code=409, detail="Inquiry already submitted")
        
    quantity = payload.quantity_kg
    expected_commission = 0.0
    if quantity:
        expected_commission = round(quantity * float(listing["price_per_kg"]) * 0.03, 2)
        
    item = {
        "id": make_id("inq"),
        "buyer_id": buyer["id"],
        "farmer_id": farmer["id"],
        "listing_id": listing["id"],
        "message": payload.message,
        "quantity_kg": quantity,
        "status": "pending",
        "commission_rate": 0.03,
        "expected_commission": expected_commission,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    
    SupabaseStore.create("inquiries", item, item)
    notify(farmer["id"], "INQUIRY_RECEIVED", "New buyer inquiry", f"{buyer['full_name']} inquired about {listing['name']}", "marketplace-inquiries")
    notify(buyer["id"], "INQUIRY_SUBMITTED", "Inquiry sent", f"Inquiry sent for {listing['name']}", "my-inquiries")
    return {"item": enrich_inquiry(item)}


@router.patch("/inquiries/{inquiry_id}")
def update_inquiry(inquiry_id: str, payload: InquiryStatusPayload):
    client = SupabaseStore.client()
    if not client:
        raise HTTPException(status_code=500, detail="Database not configured")
        
    inq_res = client.table("inquiries").select("*").eq("id", inquiry_id).execute()
    if not inq_res.data:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    inquiry = inq_res.data[0]
    
    status = payload.status.lower()
    if status not in {"pending", "accepted", "declined"}:
        raise HTTPException(status_code=400, detail="Invalid inquiry status")
        
    SupabaseStore.update("inquiries", inquiry_id, {"status": status, "updated_at": now_iso()})
    inquiry["status"] = status
    
    notify(inquiry["buyer_id"], "INQUIRY_UPDATED", "Inquiry status updated", f"Your inquiry is {status}.", "my-inquiries")
    return {"item": enrich_inquiry(inquiry)}


def generate_advisory(payload: AdvisoryPayload) -> tuple[str, float, str]:
    text = (payload.description or payload.input_reference or "").lower()
    if any(token in text for token in ["spot", "yellow", "mold", "blight", "rust", "fungal"]):
        return (
            "Fungal infection",
            0.75,
            "Apply a copper-based fungicide, improve air circulation, and avoid overwatering.",
        )
    if any(token in text for token in ["worm", "pest", "aphid", "moth", "bollworm"]):
        return (
            "Pest infestation",
            0.72,
            "Use neem oil or biopesticide and remove affected leaves.",
        )
    return (
        "Nutrient deficiency or general stress",
        0.65,
        "Use a balanced NPK fertilizer and test soil moisture.",
    )


@router.get("/advisories")
def list_advisories(farmer_id: Optional[str] = None):
    client = SupabaseStore.client()
    if not client:
        return {"items": []}
    query = client.table("advisories").select("*")
    if farmer_id:
        query = query.eq("farmer_id", farmer_id)
    res = query.execute()
    return {"items": [enrich_advisory(a) for a in (res.data or [])]}


@router.post("/advisories")
def create_advisory(payload: AdvisoryPayload):
    farmer = find_user(payload.farmer_id)
    if farmer["role"].upper() != "FARMER":
        raise HTTPException(status_code=403, detail="Only farmers can request crop advisory")
        
    diagnosis, probability, recommendation = generate_advisory(payload)
    item = {
        "id": make_id("adv"),
        **payload.model_dump(),
        "diagnosis": diagnosis,
        "probability": probability,
        "recommendation": recommendation,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    SupabaseStore.create("advisories", item, item)
    notify(payload.farmer_id, "ADVISORY_READY", "Crop advisory available", "Your crop advisory report is ready.", "advisory-history")
    return {"item": enrich_advisory(item)}


@router.get("/admin/listings")
def admin_listings(status: Optional[str] = None, q: str = ""):
    client = SupabaseStore.client()
    if not client:
        return {"items": []}
    query = client.table("listings").select("*")
    if status:
        query = query.eq("status", status.lower())
    res = query.execute()
    items = res.data or []
    if q:
        needle = q.lower()
        items = [l for l in items if needle in f"{l['name']} {l['category']} {l.get('description') or ''} {l.get('location') or ''}".lower()]
    return {"items": [enrich_listing(l) for l in items]}


@router.post("/admin/listings/{listing_id}/flag")
def flag_listing(listing_id: str, reason: Dict[str, str]):
    item = find_listing(listing_id)
    updated = SupabaseStore.update("listings", listing_id, {"status": "flagged", "flag_reason": reason.get("reason"), "updated_at": now_iso()})
    return {"item": enrich_listing(updated)}


@router.get("/admin/inquiries")
def admin_inquiries(status: Optional[str] = None):
    client = SupabaseStore.client()
    if not client:
        return {"items": []}
    query = client.table("inquiries").select("*")
    if status:
        query = query.eq("status", status.lower())
    res = query.execute()
    return {"items": [enrich_inquiry(i) for i in (res.data or [])]}


@router.get("/admin/advisories")
def admin_advisories():
    client = SupabaseStore.client()
    if not client:
        return {"items": []}
    res = client.table("advisories").select("*").execute()
    return {"items": [enrich_advisory(a) for a in (res.data or [])]}


@router.get("/admin/market-stats")
def admin_market_stats():
    client = SupabaseStore.client()
    if not client:
        return {}
        
    listings = client.table("listings").select("*").execute().data or []
    inquiries = client.table("inquiries").select("*").execute().data or []
    advisories = client.table("advisories").select("*").execute().data or []
    
    categories = [l["category"] for l in listings]
    top_categories = sorted(
        {cat: categories.count(cat) for cat in set(categories)}.items(),
        key=lambda x: x[1],
        reverse=True
    )
    
    return {
        "total_listings": len(listings),
        "active_listings": len([l for l in listings if l["status"] == "active"]),
        "flagged_listings": len([l for l in listings if l["status"] == "flagged"]),
        "open_inquiries": len([i for i in inquiries if i["status"] == "pending"]),
        "accepted_inquiries": len([i for i in inquiries if i["status"] == "accepted"]),
        "declined_inquiries": len([i for i in inquiries if i["status"] == "declined"]),
        "advisory_requests": len(advisories),
        "top_categories": top_categories,
    }


@router.get("/admin/stats")
def admin_stats():
    client = SupabaseStore.client()
    if not client:
        return {}
        
    users = client.table("profiles").select("*").execute().data or []
    equipment = client.table("equipment").select("*").execute().data or []
    rentals = client.table("rentals").select("*").execute().data or []
    jobs = client.table("jobs").select("*").execute().data or []
    listings = client.table("listings").select("*").execute().data or []
    inquiries = client.table("inquiries").select("*").execute().data or []
    advisories = client.table("advisories").select("*").execute().data or []
    
    non_admin = [u for u in users if u["role"] != "ADMIN"]
    approved = len([u for u in non_admin if u["status"] == "APPROVED"])
    
    return {
        "pending_verifications": len([u for u in non_admin if u["status"] == "PENDING"]),
        "approved_users": approved,
        "blacklisted": len([u for u in non_admin if u["status"] == "BLACKLISTED"]),
        "total_users": len(users),
        "farmers": len([u for u in users if u["role"] == "FARMER"]),
        "laborers": len([u for u in users if u["role"] == "LABORER"]),
        "buyers": len([u for u in users if u["role"] == "BUYER"]),
        "equipment_listed": len(equipment),
        "open_jobs": len([j for j in jobs if j["status"] == "OPEN"]),
        "total_jobs": len(jobs),
        "total_rentals": len(rentals),
        "active_rentals": len([r for r in rentals if r["status"] in {"ACCEPTED", "ACTIVE"}]),
        "total_listings": len(listings),
        "active_listings": len([l for l in listings if l["status"] == "active"]),
        "open_inquiries": len([i for i in inquiries if i["status"] == "pending"]),
        "advisory_requests": len(advisories),
        "compliance_percent": round((approved / max(1, len(non_admin))) * 100) if non_admin else 100,
    }


@router.get("/jobs")
def list_jobs(
    farmer_id: Optional[str] = None,
    laborer_id: Optional[str] = None,
    open_only: bool = False,
    exclude_applied_by: Optional[str] = None,
    q: str = "",
):
    client = SupabaseStore.client()
    if not client:
        return {"items": []}
        
    query = client.table("jobs").select("*")
    if farmer_id:
        query = query.eq("farmer_id", farmer_id)
    if laborer_id:
        query = query.eq("laborer_id", laborer_id)
    if open_only:
        query = query.eq("status", "OPEN")
        
    res = query.execute()
    items = res.data or []
    
    if exclude_applied_by:
        apps_res = client.table("applications").select("job_id").eq("laborer_id", exclude_applied_by).execute()
        applied_ids = {a["job_id"] for a in (apps_res.data or [])}
        items = [j for j in items if j["id"] not in applied_ids]
        
    if q:
        needle = q.lower()
        items = [j for j in items if needle in f"{j['title']} {j['description']} {j.get('location') or ''} {j.get('required_skill') or ''}".lower()]
        
    return {"items": [enrich_job(j) for j in items]}


@router.post("/jobs")
def create_job(payload: JobPayload):
    farmer = find_user(payload.farmer_id)
    if farmer["role"].upper() != "FARMER":
        raise HTTPException(status_code=403, detail="Only farmers can post jobs")
    item = {
        "id": make_id("job"),
        "farmer_id": payload.farmer_id,
        "laborer_id": None,
        "title": payload.title,
        "description": payload.description,
        "location": payload.location,
        "required_skill": payload.required_skill,
        "daily_wage": payload.daily_wage,
        "planned_days": payload.planned_days,
        "start_date": payload.start_date,
        "status": "OPEN",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    SupabaseStore.create("jobs", item, item)
    notify(payload.farmer_id, "SYSTEM", "Job posted", f"{payload.title} is open for applications.", "labor-hiring")
    return {"item": enrich_job(item)}


@router.patch("/jobs/{job_id}/complete")
def complete_job(job_id: str):
    client = SupabaseStore.client()
    if not client:
        raise HTTPException(status_code=500, detail="Database not configured")
        
    res = client.table("jobs").select("*").eq("id", job_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Job not found")
    job = res.data[0]
    
    updated = SupabaseStore.update("jobs", job_id, {"status": "COMPLETED", "updated_at": now_iso()})
    
    if client:
        client.table("engagements").update({"status": "COMPLETED", "updated_at": now_iso()}).eq("job_id", job_id).execute()
        
    if job.get("laborer_id"):
        notify(job["laborer_id"], "JOB_COMPLETED", "Job completed", f"{job['title']} has been completed.", "my-job")
        
    return {"item": enrich_job(updated)}


@router.get("/applications")
def list_applications(job_id: Optional[str] = None, laborer_id: Optional[str] = None, farmer_id: Optional[str] = None):
    client = SupabaseStore.client()
    if not client:
        return {"items": []}
        
    query = client.table("applications").select("*")
    if job_id:
        query = query.eq("job_id", job_id)
    if laborer_id:
        query = query.eq("laborer_id", laborer_id)
        
    res = query.execute()
    items = res.data or []
    
    if farmer_id:
        farmer_jobs_res = client.table("jobs").select("id").eq("farmer_id", farmer_id).execute()
        farmer_jobs = {j["id"] for j in (farmer_jobs_res.data or [])}
        items = [a for a in items if a["job_id"] in farmer_jobs]
        
    return {"items": [enrich_application(a) for a in items]}


@router.post("/applications")
def create_application(payload: ApplicationPayload):
    client = SupabaseStore.client()
    if not client:
        raise HTTPException(status_code=500, detail="Database not configured")
        
    job_res = client.table("jobs").select("*").eq("id", payload.job_id).execute()
    if not job_res.data:
        raise HTTPException(status_code=404, detail="Job not found")
    job = job_res.data[0]
    
    if job["status"] != "OPEN":
        raise HTTPException(status_code=409, detail="Job is not open")
        
    laborer = find_user(payload.laborer_id)
    if laborer["role"].upper() != "LABORER":
        raise HTTPException(status_code=403, detail="Only laborers can apply")
        
    active_job_res = client.table("jobs").select("*").eq("laborer_id", laborer["id"]).in_("status", ["ASSIGNED", "ACTIVE"]).execute()
    if active_job_res.data:
        raise HTTPException(status_code=409, detail="Laborer is already assigned to another farmer")
        
    dup = client.table("applications").select("*").eq("job_id", payload.job_id).eq("laborer_id", payload.laborer_id).execute()
    if dup.data:
        raise HTTPException(status_code=409, detail="Already applied")
        
    item = {
        "id": make_id("app"),
        "job_id": payload.job_id,
        "laborer_id": payload.laborer_id,
        "status": "PENDING",
        "message": payload.message,
        "created_at": now_iso(),
    }
    
    SupabaseStore.create("applications", item, item)
    notify(job["farmer_id"], "JOB_APPLICATION", "New job application", f"{laborer['full_name']} applied for {job['title']}.", "labor-hiring")
    return {"item": enrich_application(item)}


@router.patch("/applications/{application_id}")
def update_application(application_id: str, payload: ApplicationStatusPayload):
    client = SupabaseStore.client()
    if not client:
        raise HTTPException(status_code=500, detail="Database not configured")
        
    app_res = client.table("applications").select("*").eq("id", application_id).execute()
    if not app_res.data:
        raise HTTPException(status_code=404, detail="Application not found")
    app = app_res.data[0]
    
    status = payload.status.upper()
    job_res = client.table("jobs").select("*").eq("id", app["job_id"]).execute()
    if not job_res.data:
        raise HTTPException(status_code=404, detail="Job not found")
    job = job_res.data[0]
    
    if status == "ACCEPTED":
        avail_res = client.table("jobs").select("*").eq("laborer_id", app["laborer_id"]).in_("status", ["ASSIGNED", "ACTIVE"]).execute()
        if avail_res.data and avail_res.data[0]["id"] != job["id"]:
            raise HTTPException(status_code=409, detail="Laborer is already assigned to another farmer")
            
        job["laborer_id"] = app["laborer_id"]
        job["status"] = "ASSIGNED"
        job["updated_at"] = now_iso()
        
        client.table("jobs").update({"laborer_id": app["laborer_id"], "status": "ASSIGNED", "updated_at": job["updated_at"]}).eq("id", job["id"]).execute()
        client.table("applications").update({"status": "REJECTED"}).eq("job_id", job["id"]).neq("id", application_id).execute()
        
        engagement_id = make_id("eng")
        engagement = {
            "id": engagement_id,
            "farmer_id": job["farmer_id"],
            "worker_id": app["laborer_id"],
            "job_id": job["id"],
            "cost_per_laborer": float(job["daily_wage"]),
            "working_days": 1,
            "duration": f"{job.get('planned_days') or 1} days",
            "assigned_tasks": [f"Initial {job.get('required_skill') or 'labor'} assignment"],
            "status": "ACTIVE",
            "total_cost": float(job["daily_wage"]),
            "created_at": now_iso(),
            "updated_at": now_iso()
        }
        client.table("engagements").insert(engagement).execute()
        
        notify(app["laborer_id"], "JOB_ASSIGNED", "Application accepted", f"You are assigned to {job['title']}.", "my-job")
        
    SupabaseStore.update("applications", application_id, {"status": status})
    app["status"] = status
    return {"item": enrich_application(app)}


@router.get("/workdays")
def list_workdays(job_id: Optional[str] = None, laborer_id: Optional[str] = None):
    client = SupabaseStore.client()
    if not client:
        return {"items": []}
    query = client.table("workdays").select("*")
    if job_id:
        query = query.eq("job_id", job_id)
    if laborer_id:
        query = query.eq("laborer_id", laborer_id)
    res = query.execute()
    return {"items": res.data or []}


@router.post("/workdays")
def create_workday(payload: WorkdayPayload):
    client = SupabaseStore.client()
    if not client:
        raise HTTPException(status_code=500, detail="Database not configured")
        
    dup = client.table("workdays").select("*").eq("job_id", payload.job_id).eq("date", payload.date).execute()
    if dup.data:
        raise HTTPException(status_code=409, detail="Attendance already marked for this date")
        
    item = {
        "id": make_id("workday"),
        **payload.model_dump(),
        "created_at": now_iso()
    }
    SupabaseStore.create("workdays", item, item)
    
    eng_res = client.table("engagements").select("*").eq("job_id", payload.job_id).eq("worker_id", payload.laborer_id).execute()
    if eng_res.data:
        eng = eng_res.data[0]
        new_days = (eng.get("working_days") or 0) + 1
        new_cost = new_days * float(eng["cost_per_laborer"])
        client.table("engagements").update({
            "working_days": new_days,
            "total_cost": new_cost,
            "updated_at": now_iso()
        }).eq("id", eng["id"]).execute()
        
    return {"item": item}


@router.get("/dashboard/farmer")
def farmer_dashboard(farmer_id: str):
    farmer = find_user(farmer_id)
    if farmer["role"].upper() != "FARMER":
        raise HTTPException(status_code=403, detail="Only farmers can access this dashboard")
        
    client = SupabaseStore.client()
    if not client:
        raise HTTPException(status_code=500, detail="Database not configured")
        
    equipment = client.table("equipment").select("*").eq("owner_id", farmer_id).execute().data or []
    rentals = client.table("rentals").select("*").or_(f"owner_id.eq.{farmer_id},renter_id.eq.{farmer_id}").execute().data or []
    jobs = client.table("jobs").select("*").eq("farmer_id", farmer_id).execute().data or []
    engagements = client.table("engagements").select("*").eq("farmer_id", farmer_id).execute().data or []
    
    hired_workers = {e["worker_id"] for e in engagements}
    total_cost = sum(float(e["total_cost"]) for e in engagements)
    
    return {
        "farmer": public_user(farmer),
        "equipment": [enrich_equipment(e) for e in equipment],
        "rentals": [enrich_rental(r) for r in rentals],
        "jobs": [enrich_job(j) for j in jobs],
        "engagements": [enrich_enrich_item := enrich_engagement(e) for e in engagements],
        "labor_hiring": {
            "laborers_hired": len(hired_workers),
            "total_cost": total_cost,
            "working_engagements": len(engagements),
            "active_engagements": len([e for e in engagements if e["status"] in {"ACTIVE", "ASSIGNED"}]),
        },
    }


# Quick adjustment for helper list enrichment:
def enrich_enrich_item(item):
    return enrich_engagement(item)


@router.get("/dashboard/labor")
def labor_dashboard(laborer_id: str):
    laborer = find_user(laborer_id)
    if laborer["role"].upper() != "LABORER":
        raise HTTPException(status_code=403, detail="Only laborers can access this dashboard")
        
    client = SupabaseStore.client()
    if not client:
        raise HTTPException(status_code=500, detail="Database not configured")
        
    eng_res = client.table("engagements").select("*").eq("worker_id", laborer_id).in_("status", ["ACTIVE", "ASSIGNED"]).execute()
    current_engagement = eng_res.data[0] if eng_res.data else None
    
    current_job = None
    if current_engagement:
        job_res = client.table("jobs").select("*").eq("id", current_engagement["job_id"]).execute()
        current_job = enrich_job(job_res.data[0]) if job_res.data else None
        
    workdays = client.table("workdays").select("*").eq("laborer_id", laborer_id).execute().data or []
    
    apps_res = client.table("applications").select("job_id").eq("laborer_id", laborer_id).execute()
    applied_ids = {a["job_id"] for a in (apps_res.data or [])}
    
    all_open_jobs = client.table("jobs").select("*").eq("status", "OPEN").execute().data or []
    available_jobs = [enrich_job(j) for j in all_open_jobs if j["id"] not in applied_ids]
    
    return {
        "laborer": public_user(laborer),
        "current_engagement": enrich_engagement(current_engagement) if current_engagement else None,
        "current_job": current_job,
        "workdays": workdays,
        "available_jobs": available_jobs,
    }


@router.get("/notifications")
def list_notifications(user_id: Optional[str] = None):
    client = SupabaseStore.client()
    if not client:
        return {"items": [], "unread_count": 0}
        
    query = client.table("notifications").select("*")
    if user_id:
        query = query.eq("user_id", user_id)
        
    res = query.order("created_at", desc=True).execute()
    items = res.data or []
    
    mapped_items = []
    for n in items:
        mapped_items.append({
            "id": n["id"],
            "user_id": n["user_id"],
            "title": n["title"],
            "message": n["message"],
            "category": n["type"],
            "is_read": n.get("read") or False,
            "created_at": n["created_at"]
        })
        
    unread = len([n for n in mapped_items if not n["is_read"]])
    return {"items": mapped_items, "unread_count": unread}


@router.post("/notifications/read-all")
def read_all_notifications(user_id: str):
    client = SupabaseStore.client()
    if not client:
        return {"ok": False}
    client.table("notifications").update({"read": True}).eq("user_id", user_id).execute()
    return {"ok": True}


@router.get("/admin/users")
def admin_users(role: Optional[str] = None, status: Optional[str] = None, q: str = ""):
    client = SupabaseStore.client()
    if not client:
        return {"items": []}
        
    query = client.table("profiles").select("*")
    if role:
        query = query.eq("role", role.upper())
    if status:
        query = query.eq("status", status.upper())
        
    res = query.execute()
    items = res.data or []
    
    if q:
        needle = q.lower()
        items = [u for u in items if needle in f"{u['full_name']} {u.get('email') or ''} {u['phone']}".lower()]
        
    return {"items": [public_user(u) for u in items]}


@router.patch("/admin/users/{user_id}")
def verify_user(user_id: str, payload: VerificationPayload):
    client = SupabaseStore.client()
    if not client:
        raise HTTPException(status_code=500, detail="Database not configured")
        
    res = client.table("profiles").select("*").eq("id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    user = res.data[0]
    
    admin_note = user.get("admin_note") or ""
    parts = admin_note.split("|")
    pwd_hash = ""
    doc_url = ""
    
    if len(parts) >= 1:
        if len(parts[0]) == 64:
            pwd_hash = parts[0]
            doc_url = parts[2] if len(parts) >= 3 else ""
        else:
            doc_url = parts[1] if len(parts) >= 2 else ""
            
    new_note = payload.admin_note or "Verification status updated"
    
    new_parts = []
    if pwd_hash:
        new_parts.append(pwd_hash)
    new_parts.append(new_note)
    if doc_url:
        new_parts.append(doc_url)
        
    new_admin_note = "|".join(new_parts)
        
    status = payload.status.upper()
    updates = {
        "status": status,
        "admin_note": new_admin_note,
        "updated_at": now_iso()
    }
    if status == "BLACKLISTED":
        updates["blacklist_reason"] = payload.admin_note or "Blacklisted by admin"
        
    res_update = client.table("profiles").update(updates).eq("id", user_id).execute()
    updated_user = res_update.data[0]
    
    notify(user_id, "VERIFICATION", "Verification updated", f"Your account status is now {status}.", None)
    return {"user": public_user(updated_user)}


@router.get("/admin/blacklist")
def list_blacklist():
    client = SupabaseStore.client()
    if not client:
        return {"items": []}
    res = client.table("blacklist").select("*").execute()
    return {"items": res.data or []}


@router.post("/admin/blacklist")
def add_blacklist(payload: BlacklistPayload):
    client = SupabaseStore.client()
    if not client:
        raise HTTPException(status_code=500, detail="Database client not configured")
        
    item = {
        "id": make_id("blacklist"),
        "email": str(payload.email).lower() if payload.email else None,
        "phone": payload.phone.strip() if payload.phone else None,
        "reason": payload.reason,
        "created_at": now_iso(),
    }
    
    SupabaseStore.create("blacklist", item, item)
    
    if item["email"]:
        client.table("profiles").update({
            "status": "BLACKLISTED",
            "blacklist_reason": item["reason"],
            "updated_at": now_iso()
        }).eq("email", item["email"]).execute()
        
    if item["phone"]:
        client.table("profiles").update({
            "status": "BLACKLISTED",
            "blacklist_reason": item["reason"],
            "updated_at": now_iso()
        }).eq("phone", item["phone"]).execute()
        
    return {"item": item}


@router.delete("/admin/blacklist/{entry_id}")
def delete_blacklist(entry_id: str):
    success = SupabaseStore.delete("blacklist", entry_id)
    return {"deleted": success}


@router.get("/voice-sessions")
def list_voice_sessions(user_id: Optional[str] = None):
    client = SupabaseStore.client()
    if not client:
        return {"items": []}
    query = client.table("voice_sessions").select("*")
    if user_id:
        query = query.eq("user_id", user_id)
    res = query.execute()
    return {"items": res.data or []}


@router.post("/voice-sessions")
def create_voice_session(payload: VoiceSessionPayload):
    item = {
        "id": make_id("voice"),
        **payload.model_dump(),
        "created_at": now_iso()
    }
    SupabaseStore.create("voice_sessions", item, item)
    if payload.user_id:
        notify(payload.user_id, "VOICE_TRANSCRIPT", "Voice transcript saved", "Intern4 AI transcriber saved a new transcript.", "voice")
    return {"item": item}


@router.post("/upload-document")
def upload_document(user_id: str, file: UploadFile = File(...)):
    client = SupabaseStore.client()
    if not client:
        raise HTTPException(status_code=500, detail="Database client not configured")
        
    user = find_user(user_id)
    
    file_content = file.file.read()
    file_extension = file.filename.split(".")[-1] if "." in file.filename else "pdf"
    storage_path = f"{user_id}/identity_proof.{file_extension}"
    
    try:
        client.storage.create_bucket("identity-proofs", options={"public": True})
    except Exception:
        pass
        
    try:
        try:
            client.storage.from_("identity-proofs").remove([storage_path])
        except Exception:
            pass
            
        client.storage.from_("identity-proofs").upload(
            path=storage_path,
            file=file_content,
            file_options={"content-type": file.content_type}
        )
        
        res_url = client.storage.from_("identity-proofs").get_public_url(storage_path)
        
        admin_note = user.get("admin_note") or ""
        parts = admin_note.split("|")
        pwd_hash = ""
        note_text = "Awaiting verification"
        
        if len(parts) >= 1:
            if len(parts[0]) == 64:
                pwd_hash = parts[0]
                note_text = parts[1] if len(parts) >= 2 else "Awaiting verification"
            else:
                note_text = parts[0]
                
        new_admin_note = f"{pwd_hash}|{note_text}|{res_url}" if pwd_hash else f"{note_text}|{res_url}"
        
        SupabaseStore.update("profiles", user_id, {"admin_note": new_admin_note, "updated_at": now_iso()})
        
        return {"success": True, "url": res_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload to Supabase: {str(e)}")
