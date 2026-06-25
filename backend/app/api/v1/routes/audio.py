import os
import shutil
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.api.v1.routes.platform import create_voice_session, VoiceSessionPayload

router = APIRouter()

TEMP_ROOT = Path(os.getenv("TEMP", "/tmp")) / "kissanshakti_audio"


class FinalizePayload(BaseModel):
    session_id: str
    user_id: str | None = None
    language: str = "en-IN"


class TranslatePayload(BaseModel):
    text: str
    source_lang: str = "en-IN"
    target_lang: str = "hi-IN"


def session_dir(session_id: str) -> Path:
    return TEMP_ROOT / session_id


@router.post("/chunk")
async def upload_chunk(
    audio: UploadFile = File(...),
    session_id: str = Form(...),
    chunk_index: int = Form(...),
    mime_type: str = Form("audio/webm"),
):
    if not session_id.startswith("session_"):
        raise HTTPException(status_code=400, detail="Invalid session_id format")

    data = await audio.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty audio chunk")

    directory = session_dir(session_id)
    directory.mkdir(parents=True, exist_ok=True)
    chunk_path = directory / f"chunk_{chunk_index:04d}.webm"
    chunk_path.write_bytes(data)

    return {
        "status": "received",
        "session_id": session_id,
        "chunk_index": chunk_index,
        "bytes_received": len(data),
        "mime_type": mime_type,
        "partial_transcript": None,
    }


@router.post("/finalize")
async def finalize_session(payload: FinalizePayload):
    directory = session_dir(payload.session_id)
    chunks = sorted(directory.glob("chunk_*.webm"))
    if not chunks:
        raise HTTPException(status_code=404, detail="No chunks found for this recording session")

    assembled = directory / "assembled.webm"
    with assembled.open("wb") as output:
        for chunk in chunks:
            output.write(chunk.read_bytes())

    bytes_total = assembled.stat().st_size
    transcript = (
        "Voice note captured. Connect OPENAI_API_KEY or faster-whisper in production "
        "to replace this fallback with full speech transcription."
    )
    translated = "वॉइस नोट सेव हो गया है। उत्पादन में पूर्ण ट्रांसक्रिप्शन के लिए Whisper जोड़ें।"

    saved = create_voice_session(
        VoiceSessionPayload(
            user_id=payload.user_id,
            session_id=payload.session_id,
            transcript=transcript,
            language=payload.language,
            translated_text=translated,
            metadata={
                "bytes_total": bytes_total,
                "chunks": len(chunks),
                "audio_codec": "opus/webm",
                "source_path": str(assembled),
            },
        )
    )

    shutil.rmtree(directory, ignore_errors=True)
    return {
        "session_id": payload.session_id,
        "transcript": transcript,
        "translated_text": translated,
        "voice_session": saved["item"],
    }


@router.post("/translate")
def translate(payload: TranslatePayload):
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    return {
        "source_lang": payload.source_lang,
        "target_lang": payload.target_lang,
        "original": payload.text,
        "translated": f"[{payload.target_lang}] {payload.text}",
    }
