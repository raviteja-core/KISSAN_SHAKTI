import random
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.api.v1.routes import platform as platform_routes
from app.api.v1.routes.platform import LoginPayload, RegisterPayload

router = APIRouter()

# Memory store for OTPs: phone -> code string
OTP_STORE = {}

class OTPSendPayload(BaseModel):
    phone: str

class OTPVerifyPayload(BaseModel):
    phone: str
    code: str


@router.post("/signup")
def signup(payload: RegisterPayload):
    return platform_routes.register(payload)


@router.post("/login")
def login(payload: LoginPayload):
    return platform_routes.login(payload)


@router.get("/me")
def me(user_id: str):
    return platform_routes.me(user_id)


@router.post("/otp/send")
def send_otp(payload: OTPSendPayload):
    phone = payload.phone.strip()
    # Generate 6-digit random code
    code = str(random.randint(100000, 999999))
    OTP_STORE[phone] = code
    
    print("\n" + "="*60)
    print(f"[SMS GATEWAY SIMULATOR] Sending Verification OTP to: {phone}")
    print(f"6-Digit OTP Code is: {code}")
    print("="*60 + "\n")
    
    return {"success": True, "message": "OTP sent successfully."}


@router.post("/otp/verify")
def verify_otp(payload: OTPVerifyPayload):
    phone = payload.phone.strip()
    code = payload.code.strip()
    
    # Prefilled demo mode fallback for buyer portal testing
    if phone == "9876543210" and code == "123456":
        return {"success": True}
        
    if phone not in OTP_STORE or OTP_STORE[phone] != code:
        raise HTTPException(status_code=400, detail="Invalid OTP code. Check terminal uvicorn logs for generated code.")
        
    return {"success": True}
