"""
transcriber.py
Core transcription service.

Primary: faster-whisper (local CPU model)

Intern 4 - AI Voice (Transcriber) | KissanShakti
"""

import os
import io
import logging

logger = logging.getLogger(__name__)

# Dialect / language hint mapping for regional Indian accents
# Maps common spoken language codes to Whisper language hints
DIALECT_LANGUAGE_MAP = {
    "te": "te",   # Telugu
    "hi": "hi",   # Hindi
    "kn": "kn",   # Kannada
    "ta": "ta",   # Tamil
    "mr": "mr",   # Marathi
    "pa": "pa",   # Punjabi
    "gu": "gu",   # Gujarati
    "bn": "bn",   # Bengali
    "en": "en",   # English
}

# Default language hint — Telugu is primary for KissanShakti's target region
DEFAULT_LANGUAGE = os.getenv("TRANSCRIBER_LANGUAGE", "te")


async def transcribe_audio_file(
    audio_bytes: bytes,
    mime_type: str = "audio/webm",
    partial: bool = False,
) -> str:
    """
    Transcribes audio bytes to text using pure Python local AI.

    Args:
        audio_bytes: Raw audio data
        mime_type: MIME type of the audio (e.g. audio/webm)
        partial: If True, uses a faster/lighter model pass for real-time hints

    Returns:
        Transcribed text string
    """
    language = DIALECT_LANGUAGE_MAP.get(DEFAULT_LANGUAGE, DEFAULT_LANGUAGE)
    return await _transcribe_local(audio_bytes, language)


async def _transcribe_local(audio_bytes: bytes, language: str) -> str:
    """
    Transcription using faster-whisper (runs locally on CPU).
    Purely python based, no API keys.
    """
    try:
        from faster_whisper import WhisperModel  # type: ignore

        # Use tiny model for speed on CPU; upgrade to 'base' for better accuracy
        model = WhisperModel("tiny", device="cpu", compute_type="int8")

        # Write bytes to a temp buffer faster-whisper can read
        import tempfile, os
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            segments, info = model.transcribe(tmp_path, language=language)
            transcript = " ".join(seg.text for seg in segments).strip()
            logger.info(f"[LocalTranscriber] Detected language: {info.language} (prob={info.language_probability:.2f})")
            return transcript
        finally:
            os.unlink(tmp_path)

    except ImportError:
        logger.error("[Transcriber] faster-whisper not installed. Install with: pip install faster-whisper")
        raise RuntimeError("faster-whisper is not installed. Please run pip install -r requirements.txt")

