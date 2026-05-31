"""
transcription_connector.py
Day 2: Connect backend voice transcription endpoints.

This module provides a clean connector layer between the audio router
and the transcription service. It handles:
  - Endpoint routing to the correct transcription backend
  - Input validation before hitting the model
  - Structured response formatting (text + metadata)
  - Timing measurement for latency tracking

Intern 4 - AI Voice (Transcriber) | KissanShakti
"""

import time
import logging
from dataclasses import dataclass, field
from typing import Optional

from app.services.transcriber import transcribe_audio_file

logger = logging.getLogger(__name__)


@dataclass
class TranscriptionResult:
    """Structured result returned from the transcription connector."""
    transcript: str
    language: str
    duration_ms: float                  # time taken to transcribe
    backend_used: str                   # "openai_whisper" or "faster_whisper_local"
    confidence: Optional[float] = None  # 0.0–1.0 if available
    error: Optional[str] = None
    metadata: dict = field(default_factory=dict)


class TranscriptionConnector:
    """
    Connects the audio router to the transcription backend.
    Acts as the single integration point so the router never
    calls the transcriber directly.
    """

    def __init__(self, language: str = "te"):
        self.language = language

    async def transcribe(
        self,
        audio_bytes: bytes,
        mime_type: str = "audio/webm",
        partial: bool = False,
        session_id: str = "",
    ) -> TranscriptionResult:
        """
        Main entry point. Validates input, calls transcriber,
        returns a structured TranscriptionResult.

        Args:
            audio_bytes: Raw audio data from the browser
            mime_type: Audio MIME type
            partial: True for real-time chunk hints, False for final pass
            session_id: For logging/tracing

        Returns:
            TranscriptionResult with transcript and metadata
        """
        # Input validation
        if not audio_bytes:
            return TranscriptionResult(
                transcript="",
                language=self.language,
                duration_ms=0,
                backend_used="none",
                error="Empty audio bytes received",
            )

        if len(audio_bytes) < 1000:
            logger.debug(f"[Connector] Session {session_id}: audio too short ({len(audio_bytes)} bytes), skipping")
            return TranscriptionResult(
                transcript="",
                language=self.language,
                duration_ms=0,
                backend_used="none",
                error="Audio too short to transcribe",
            )

        start_time = time.perf_counter()
        backend_used = "openai_whisper"

        try:
            import os
            if not os.getenv("OPENAI_API_KEY"):
                backend_used = "faster_whisper_local"

            raw_text = await transcribe_audio_file(
                audio_bytes=audio_bytes,
                mime_type=mime_type,
                partial=partial,
            )

            duration_ms = (time.perf_counter() - start_time) * 1000

            logger.info(
                f"[Connector] Session {session_id} | backend={backend_used} | "
                f"partial={partial} | duration={duration_ms:.1f}ms | "
                f"chars={len(raw_text)}"
            )

            return TranscriptionResult(
                transcript=raw_text,
                language=self.language,
                duration_ms=round(duration_ms, 2),
                backend_used=backend_used,
                metadata={
                    "session_id": session_id,
                    "audio_bytes": len(audio_bytes),
                    "mime_type": mime_type,
                    "partial": partial,
                },
            )

        except Exception as e:
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.error(f"[Connector] Transcription failed for session {session_id}: {e}")
            return TranscriptionResult(
                transcript="",
                language=self.language,
                duration_ms=round(duration_ms, 2),
                backend_used=backend_used,
                error=str(e),
            )


# Module-level singleton — import and use directly
connector = TranscriptionConnector()
