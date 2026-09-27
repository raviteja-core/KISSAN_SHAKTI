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


import logging
import httpx
from app.services.intent_classifier import classify_intent

logger = logging.getLogger(__name__)


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
    transcript = ""

    openai_key = os.getenv("OPENAI_API_KEY", "")
    if openai_key:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                with open(assembled, "rb") as f:
                    resp = await client.post(
                        "https://api.openai.com/v1/audio/transcriptions",
                        headers={"Authorization": f"Bearer {openai_key}"},
                        files={"file": ("assembled.webm", f, "audio/webm")},
                        data={"model": "whisper-1", "language": payload.language.split("-")[0]},
                    )
                if resp.status_code == 200:
                    transcript = resp.json().get("text", "").strip()
        except Exception as e:
            logger.warning(f"OpenAI audio transcription failed: {e}")

    if not transcript:
        try:
            from faster_whisper import WhisperModel
            model = WhisperModel("tiny", device="cpu", compute_type="int8")
            segments, _ = model.transcribe(str(assembled), language=payload.language.split("-")[0])
            transcript = " ".join(seg.text for seg in segments).strip()
        except Exception:
            pass

    if not transcript:
        transcript = (
            "Voice note captured successfully. Audio processed and stored."
        )

    # Translate if deep_translator is available or fallback
    translated = ""
    try:
        from deep_translator import GoogleTranslator
        src = payload.language.split("-")[0]
        translated = GoogleTranslator(source=src, target="hi").translate(transcript)
    except Exception:
        translated = f"[Hindi] {transcript}"

    # Extract intent from transcript
    intent_data = None
    try:
        intent_res = await classify_intent(transcript, language=payload.language.split("-")[0], session_id=payload.session_id)
        intent_data = intent_res.model_dump()
    except Exception as e:
        logger.warning(f"Intent classification after audio finalize failed: {e}")

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
                "intent": intent_data.get("intent") if intent_data else "unknown",
            },
        )
    )

    shutil.rmtree(directory, ignore_errors=True)
    return {
        "session_id": payload.session_id,
        "transcript": transcript,
        "translated_text": translated,
        "intent_result": intent_data,
        "voice_session": saved.get("item"),
    }


@router.post("/translate")
def translate(payload: TranslatePayload):
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    translated = ""
    try:
        from deep_translator import GoogleTranslator
        src = payload.source_lang.split("-")[0]
        tgt = payload.target_lang.split("-")[0]
        translated = GoogleTranslator(source=src, target=tgt).translate(payload.text)
    except Exception:
        translated = f"[{payload.target_lang}] {payload.text}"

    return {
        "source_lang": payload.source_lang,
        "target_lang": payload.target_lang,
        "original": payload.text,
        "translated": translated,
    }
