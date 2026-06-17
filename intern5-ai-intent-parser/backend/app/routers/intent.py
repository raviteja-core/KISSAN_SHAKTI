"""
intent.py
FastAPI router for intent parsing endpoints.

Endpoints:
  POST /intent/parse   - Parse transcript → structured ParseResult JSON
  GET  /intent/health  - Health check + model status

Intern 5 — AI Intent Parser | KissanShakti
"""

import logging
from fastapi import APIRouter, HTTPException

from app.models.intent_schema import ParseRequest, ParseResult
from app.services.intent_classifier import classify_intent

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/parse", response_model=ParseResult)
async def parse_transcript(body: ParseRequest):
    """
    Receives a voice transcript and returns a structured ParseResult.

    The frontend calls this after receiving a transcript from Intern 4's
    /audio/finalize endpoint. The response is used to:
      - Auto-fill form fields (name, phone, rate, skills, location)
      - Trigger voice navigation (route + action)

    Example request:
    ```json
    {
      "transcript": "Register laborer Suresh Pawar, phone 9988776655, wage 450 rupees",
      "language": "en"
    }
    ```
    """
    if not body.transcript or not body.transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript cannot be empty.")

    session_id = body.session_id or "anon"

    result = await classify_intent(
        transcript=body.transcript,
        language=body.language or "en",
        session_id=session_id,
    )

    logger.info(
        f"[IntentRouter] session={session_id} | intent={result.intent} | "
        f"backend={result.backend_used} | conf={result.confidence:.2f}"
    )

    return result


@router.get("/health")
async def health_check():
    """
    Returns the health status and which backends are available.
    """
    import os
    has_api_key = bool(os.getenv("OPENAI_API_KEY", ""))

    return {
        "status": "ok",
        "service": "KissanShakti Intent Parser",
        "backends": {
            "llm_openai": "available" if has_api_key else "unavailable (no API key)",
            "rule_based_fallback": "always available",
        },
        "active_backend": "llm_openai" if has_api_key else "rule_based_fallback",
    }
