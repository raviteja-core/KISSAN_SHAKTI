"""
audio.py
FastAPI router for audio chunk upload and transcription endpoints.

Endpoints:
  POST /audio/chunk    - Receive a raw audio chunk from the browser
  POST /audio/finalize - Assemble all chunks and return final transcript

Intern 4 - AI Voice (Transcriber) | KissanShakti
"""

import os
import time
import shutil
from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from pydantic import BaseModel

from app.services.transcriber import transcribe_audio_file
from app.services.session_store import save_chunk, assemble_session, cleanup_session
from app.services.pipeline_optimizer import transcribe_with_cache, record_upload_speed
from app.utils.text_formatter import format_transcript

router = APIRouter()


# ─── Chunk Upload ────────────────────────────────────────────────────────────

@router.post("/chunk")
async def upload_chunk(
    audio: UploadFile = File(...),
    session_id: str = Form(...),
    chunk_index: int = Form(...),
    mime_type: str = Form("audio/webm"),
):
    """
    Receives a single audio chunk from the browser MediaRecorder.
    Saves it to a temp directory keyed by session_id.
    Optionally returns a partial transcript for real-time feedback.
    """
    if not session_id or not session_id.startswith("session_"):
        raise HTTPException(status_code=400, detail="Invalid session_id format.")

    chunk_bytes = await audio.read()
    if len(chunk_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty audio chunk received.")

    upload_start = time.perf_counter()

    # Persist chunk to disk
    save_chunk(session_id, chunk_index, chunk_bytes)

    upload_elapsed = time.perf_counter() - upload_start
    record_upload_speed(len(chunk_bytes), upload_elapsed)

    # For very short chunks we skip partial transcription to save latency
    partial_transcript = None
    if len(chunk_bytes) > 10_000:  # ~10 KB threshold
        try:
            partial_transcript, was_cached = await transcribe_with_cache(
                chunk_bytes, mime_type, partial=True
            )
        except Exception:
            # Partial transcription failure is non-fatal
            partial_transcript = None
            was_cached = False
    else:
        was_cached = False

    return {
        "status": "received",
        "session_id": session_id,
        "chunk_index": chunk_index,
        "bytes_received": len(chunk_bytes),
        "partial_transcript": partial_transcript,
        "cached": was_cached,
    }


# ─── Finalize & Full Transcription ───────────────────────────────────────────

class FinalizeRequest(BaseModel):
    session_id: str


@router.post("/finalize")
async def finalize_session(body: FinalizeRequest):
    """
    Assembles all chunks for a session and runs full transcription.
    Returns the cleaned, formatted transcript.
    """
    session_id = body.session_id

    assembled_path = assemble_session(session_id)
    if not assembled_path:
        raise HTTPException(status_code=404, detail=f"No chunks found for session {session_id}")

    try:
        with open(assembled_path, "rb") as f:
            audio_bytes = f.read()

        raw_transcript = await transcribe_audio_file(audio_bytes, "audio/webm", partial=False)
        clean_transcript = format_transcript(raw_transcript)

        return {
            "session_id": session_id,
            "transcript": clean_transcript,
            "raw_transcript": raw_transcript,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        cleanup_session(session_id)
