"""
pipeline_optimizer.py
Optimizations to reduce voice transcriber pipeline processing latency.

Techniques applied:
  1. Async concurrent chunk processing (don't block on one chunk)
  2. In-memory LRU cache for repeated short phrases (common farm queries)
  3. Adaptive chunk sizing based on network speed estimate
  4. Pre-warm the local Whisper model on startup to avoid cold-start delay

Day 8 Task - Intern 4 AI Voice (Transcriber) | KissanShakti
"""

import asyncio
import hashlib
import logging
import time
from collections import OrderedDict
from typing import Optional

logger = logging.getLogger(__name__)


# ─── LRU Cache for Transcript Results ────────────────────────────────────────

class TranscriptLRUCache:
    """
    Simple in-memory LRU cache for transcription results.
    Avoids re-transcribing identical audio chunks (e.g. repeated phrases).
    Cache key = SHA-256 of audio bytes (first 4KB sampled for speed).
    """

    def __init__(self, max_size: int = 128):
        self._cache: OrderedDict[str, str] = OrderedDict()
        self._max_size = max_size
        self._hits = 0
        self._misses = 0

    def _make_key(self, audio_bytes: bytes) -> str:
        # Sample first + middle + last 1KB for a fast fingerprint
        sample = audio_bytes[:1024] + audio_bytes[len(audio_bytes)//2:len(audio_bytes)//2+1024] + audio_bytes[-1024:]
        return hashlib.sha256(sample).hexdigest()

    def get(self, audio_bytes: bytes) -> Optional[str]:
        key = self._make_key(audio_bytes)
        if key in self._cache:
            self._cache.move_to_end(key)  # mark as recently used
            self._hits += 1
            logger.debug(f"[Cache] HIT — cache size={len(self._cache)}, hits={self._hits}")
            return self._cache[key]
        self._misses += 1
        return None

    def set(self, audio_bytes: bytes, transcript: str):
        key = self._make_key(audio_bytes)
        self._cache[key] = transcript
        self._cache.move_to_end(key)
        if len(self._cache) > self._max_size:
            evicted = self._cache.popitem(last=False)
            logger.debug(f"[Cache] Evicted oldest entry: {evicted[0][:16]}...")

    def stats(self) -> dict:
        total = self._hits + self._misses
        hit_rate = (self._hits / total * 100) if total > 0 else 0
        return {
            "size": len(self._cache),
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate_pct": round(hit_rate, 1),
        }


# Global cache instance
_transcript_cache = TranscriptLRUCache(max_size=128)


# ─── Adaptive Chunk Sizing ────────────────────────────────────────────────────

class NetworkSpeedEstimator:
    """
    Estimates upload speed based on recent chunk upload times.
    Used to adaptively suggest smaller chunks on slow connections.
    """

    def __init__(self, window: int = 5):
        self._samples: list[float] = []  # bytes/second
        self._window = window

    def record(self, bytes_sent: int, elapsed_seconds: float):
        if elapsed_seconds > 0:
            bps = bytes_sent / elapsed_seconds
            self._samples.append(bps)
            if len(self._samples) > self._window:
                self._samples.pop(0)

    def estimated_bps(self) -> Optional[float]:
        if not self._samples:
            return None
        return sum(self._samples) / len(self._samples)

    def recommended_chunk_interval_ms(self) -> int:
        """
        Returns recommended MediaRecorder chunk interval in milliseconds.
        Slower network → smaller chunks → lower latency per upload.
        """
        bps = self.estimated_bps()
        if bps is None:
            return 3000  # default

        kbps = bps / 1024
        if kbps > 500:      # Good WiFi/4G
            return 3000
        elif kbps > 100:    # 3G
            return 2000
        elif kbps > 30:     # Slow 3G
            return 1500
        else:               # 2G / very slow
            return 1000     # 1s chunks to keep uploads small

    def connection_label(self) -> str:
        bps = self.estimated_bps()
        if bps is None:
            return "unknown"
        kbps = bps / 1024
        if kbps > 500:
            return "good (WiFi/4G)"
        elif kbps > 100:
            return "3G"
        elif kbps > 30:
            return "slow-3G"
        else:
            return "2G"


# Global speed estimator
_speed_estimator = NetworkSpeedEstimator()


# ─── Optimized Transcription Wrapper ─────────────────────────────────────────

async def transcribe_with_cache(
    audio_bytes: bytes,
    mime_type: str,
    partial: bool = False,
) -> tuple[str, bool]:
    """
    Wraps the core transcriber with LRU cache lookup.
    Returns (transcript, was_cached).
    """
    from app.services.transcriber import transcribe_audio_file

    cached = _transcript_cache.get(audio_bytes)
    if cached is not None:
        return cached, True

    start = time.perf_counter()
    result = await transcribe_audio_file(audio_bytes, mime_type, partial)
    elapsed = time.perf_counter() - start

    logger.info(f"[Optimizer] Transcription took {elapsed*1000:.0f}ms ({len(audio_bytes)//1024}KB audio)")

    _transcript_cache.set(audio_bytes, result)
    return result, False


async def process_chunks_concurrently(
    chunks: list[tuple[int, bytes]],
    mime_type: str = "audio/webm",
) -> dict[int, str]:
    """
    Processes multiple audio chunks concurrently using asyncio.gather.
    Returns a dict of {chunk_index: partial_transcript}.

    This reduces total latency when multiple chunks are queued.
    """
    from app.services.transcriber import transcribe_audio_file

    async def process_one(index: int, data: bytes) -> tuple[int, str]:
        try:
            transcript = await transcribe_audio_file(data, mime_type, partial=True)
            return index, transcript
        except Exception as e:
            logger.warning(f"[Optimizer] Chunk {index} failed: {e}")
            return index, ""

    results = await asyncio.gather(*[process_one(i, d) for i, d in chunks])
    return dict(results)


# ─── Model Pre-warm ───────────────────────────────────────────────────────────

_model_warmed = False

async def prewarm_local_model():
    """
    Pre-loads the faster-whisper model into memory on server startup.
    Eliminates the cold-start delay on the first real transcription request.
    Call this from FastAPI's startup event.
    """
    global _model_warmed
    if _model_warmed:
        return

    try:
        import asyncio
        loop = asyncio.get_event_loop()

        def _load():
            from faster_whisper import WhisperModel  # type: ignore
            model = WhisperModel("tiny", device="cpu", compute_type="int8")
            # Run a tiny silent audio through it to warm up the inference path
            import numpy as np
            silence = np.zeros(16000, dtype=np.float32)  # 1s of silence
            list(model.transcribe(silence)[0])  # consume generator
            return model

        start = time.perf_counter()
        await loop.run_in_executor(None, _load)
        elapsed = time.perf_counter() - start

        _model_warmed = True
        logger.info(f"[Optimizer] Local Whisper model pre-warmed in {elapsed:.1f}s")
    except ImportError:
        logger.info("[Optimizer] faster-whisper not installed, skipping pre-warm")
    except Exception as e:
        logger.warning(f"[Optimizer] Pre-warm failed (non-fatal): {e}")


# ─── Public API ───────────────────────────────────────────────────────────────

def get_cache_stats() -> dict:
    return _transcript_cache.stats()

def get_network_stats() -> dict:
    return {
        "estimated_speed": _speed_estimator.connection_label(),
        "recommended_chunk_interval_ms": _speed_estimator.recommended_chunk_interval_ms(),
    }

def record_upload_speed(bytes_sent: int, elapsed_seconds: float):
    _speed_estimator.record(bytes_sent, elapsed_seconds)
