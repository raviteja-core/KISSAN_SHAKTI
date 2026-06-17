"""
main.py
FastAPI application entry point for the KissanShakti Intent Parser service.

Intern 5 — AI Intent Parser | KissanShakti
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.intent import router as intent_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(
    title="KissanShakti Intent Parser",
    description=(
        "AI-powered voice intent classifier for KissanShakti. "
        "Converts agricultural voice transcripts into structured JSON for form auto-fill and navigation."
    ),
    version="1.0.0",
)

# CORS — allow the Vite frontend dev server and production domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server (Intern 1 frontend)
        "http://localhost:3000",
        "https://kissanshakti.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(intent_router, prefix="/intent", tags=["intent"])


@app.get("/")
def root():
    return {
        "service": "KissanShakti Intent Parser",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": [
            "POST /intent/parse",
            "GET  /intent/health",
        ],
    }
