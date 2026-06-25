from typing import Optional, List, Literal
from pydantic import BaseModel, Field


BuyerType = Literal["trader", "vendor", "farmer"]
UserRole = Literal["farmer", "laborer", "admin", "buyer"]
VerificationStatus = Literal["pending", "approved", "rejected"]


class CropBase(BaseModel):
    name: str
    category: str
    quantity_kg: float
    price_per_kg: float
    status: str = "available"
    harvest_date: str


class CropCreate(CropBase):
    farmer_id: str
    location: str
    status: str = "available"


class CropOut(CropBase):
    id: str
    farmer_id: str
    location: str
    status: str
    created_at: str
    updated_at: str
    sync_status: str = "pending_create"


class BuyerBase(BaseModel):
    full_name: str
    phone: str
    email: Optional[str] = None
    buyer_type: BuyerType
    location: str
    status: str = "pending"
    preferences: Optional[List[str]] = None


class BuyerCreate(BuyerBase):
    pass


class BuyerOut(BuyerBase):
    id: str
    created_at: str
    updated_at: str


class InquiryBase(BaseModel):
    buyer_id: str
    farmer_id: str
    listing_id: str
    message: Optional[str] = None
    status: str = "pending"


class InquiryCreate(InquiryBase):
    pass


class InquiryOut(InquiryBase):
    id: str
    created_at: str
    updated_at: str


class AdvisoryBase(BaseModel):
    farmer_id: str
    input_type: Literal["image", "voice", "text"]
    input_reference: Optional[str] = None
    description: Optional[str] = None
    language: str = "en-IN"


class AdvisoryCreate(AdvisoryBase):
    pass


class AdvisoryOut(AdvisoryBase):
    id: str
    diagnosis: str
    probability: float
    recommendation: str
    created_at: str
    updated_at: str


class DraftListingBase(BaseModel):
    farmer_id: str
    name: str
    category: str
    quantity_kg: float
    price_per_kg: float
    location: str
    description: Optional[str] = None
    status: str = "draft"


class DraftListingCreate(DraftListingBase):
    pass


class DraftListingOut(DraftListingBase):
    id: str
    created_at: str
    updated_at: str


class WorkerBase(BaseModel):
    name: str
    phone: str
    state: str = "Maharashtra"
    skills: List[str]
    daily_rate: float
    status: str = "active"


class WorkerCreate(WorkerBase):
    pass


class WorkerOut(WorkerBase):
    id: str
    created_at: str
    updated_at: str
    sync_status: str = "pending_create"


class JobBase(BaseModel):
    title: str
    description: str
    location: str
    payment: float
    required_skill: str
    worker_id: Optional[str] = None
    status: str = "open"


class JobCreate(JobBase):
    pass


class JobOut(JobBase):
    id: str
    farmer_id: str
    created_at: str
    updated_at: str
    sync_status: str = "pending_create"


class SyncQueueItem(BaseModel):
    action: str
    entity_type: str
    entity_id: str
    payload: dict


class SyncLogOut(BaseModel):
    id: int
    status: str
    message: str
    records_count: int
    created_at: str


class LoginRequest(BaseModel):
    phone: str
    role: UserRole


class PlatformUserBase(BaseModel):
    full_name: str
    phone: str
    email: Optional[str] = None
    role: UserRole
    state: str = "Maharashtra"
    buyer_type: Optional[BuyerType] = None
    preferences: Optional[List[str]] = None


class PlatformUserCreate(PlatformUserBase):
    blacklist_reference: Optional[str] = None


class PlatformUserOut(PlatformUserBase):
    id: str
    verification_status: VerificationStatus = "pending"
    is_blacklisted: bool = False
    blacklist_reference: Optional[str] = None
    compliance_notes: Optional[str] = None
    created_at: str
    updated_at: str


class VerificationUpdate(BaseModel):
    verification_status: VerificationStatus
    compliance_notes: Optional[str] = None


class EquipmentBase(BaseModel):
    farmer_id: str
    name: str
    category: str
    location: str
    daily_rate: float
    availability_status: str = "available"
    description: Optional[str] = None


class EquipmentCreate(EquipmentBase):
    pass


class EquipmentOut(EquipmentBase):
    id: str
    created_at: str
    updated_at: str


class RentalRequestCreate(BaseModel):
    equipment_id: str
    renter_farmer_id: str
    start_date: str
    end_date: str
    total_cost: float


class RentalRequestOut(RentalRequestCreate):
    id: str
    owner_farmer_id: str
    status: str = "requested"
    created_at: str
    updated_at: str


class LaborEngagementCreate(BaseModel):
    farmer_id: str
    worker_id: str
    job_id: Optional[str] = None
    cost_per_laborer: float
    working_days: int
    duration: str
    assigned_tasks: List[str] = Field(default_factory=list)
    status: str = "active"


class LaborEngagementOut(LaborEngagementCreate):
    id: str
    total_cost: float
    created_at: str
    updated_at: str


class NotificationOut(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    category: str
    is_read: bool = False
    created_at: str


class VoiceSessionCreate(BaseModel):
    session_id: str
    transcript: str
    language: str = "te"
    source: str = "intern4-ai-transcriber"
    metadata: dict = Field(default_factory=dict)


class VoiceSessionOut(VoiceSessionCreate):
    id: str
    created_at: str
