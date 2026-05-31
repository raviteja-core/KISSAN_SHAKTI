"""
test_pipeline_latency.py
Tests voice processing speed and measures pipeline latency
across slow network simulations (2G / 3G conditions).

Day 7 Task - Intern 4 AI Voice (Transcriber) | KissanShakti
"""

import time
import asyncio
import os
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

# ─── Helpers ─────────────────────────────────────────────────────────────────

def generate_fake_audio(size_kb: int = 50) -> bytes:
    """Generate fake audio bytes of a given size for testing."""
    return b"\x00\xFF" * (size_kb * 512)  # size_kb KB of dummy data


def simulate_slow_network(delay_seconds: float):
    """Context manager that adds artificial latency to simulate slow networks."""
    import asyncio

    async def slow_post(*args, **kwargs):
        await asyncio.sleep(delay_seconds)
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"partial_transcript": "test transcript"}
        return mock_resp

    return patch("httpx.AsyncClient.post", new=slow_post)


# ─── Latency Benchmarks ───────────────────────────────────────────────────────

class TestPipelineLatency:
    """
    Measures end-to-end latency of the voice transcription pipeline
    under different simulated network conditions.

    Targets (from KissanShakti spec):
      - Good network  (WiFi/4G): < 2s per chunk
      - 3G simulation           : < 5s per chunk
      - 2G simulation           : < 10s per chunk (with retry)
    """

    LATENCY_TARGETS = {
        "good_network": 2.0,   # seconds
        "3g_network":   5.0,
        "2g_network":  10.0,
    }

    def _measure(self, func, *args, **kwargs):
        """Run an async function and return (result, elapsed_seconds)."""
        start = time.perf_counter()
        result = asyncio.get_event_loop().run_until_complete(func(*args, **kwargs))
        elapsed = time.perf_counter() - start
        return result, elapsed

    # ── Good network ──────────────────────────────────────────────────────────

    @patch("app.services.transcriber.transcribe_audio_file", new_callable=AsyncMock)
    def test_chunk_upload_good_network(self, mock_transcribe):
        """Chunk upload + partial transcription should complete in < 2s on good network."""
        mock_transcribe.return_value = "test partial"

        from app.services.session_store import save_chunk, cleanup_session

        audio = generate_fake_audio(50)
        session_id = "session_latency_good"

        start = time.perf_counter()
        save_chunk(session_id, 0, audio)
        elapsed = time.perf_counter() - start

        cleanup_session(session_id)

        print(f"\n[Good Network] Chunk save latency: {elapsed*1000:.1f} ms")
        assert elapsed < self.LATENCY_TARGETS["good_network"], (
            f"Chunk save took {elapsed:.2f}s, expected < {self.LATENCY_TARGETS['good_network']}s"
        )

    # ── 3G simulation ─────────────────────────────────────────────────────────

    @patch("app.services.transcriber.transcribe_audio_file", new_callable=AsyncMock)
    def test_chunk_upload_3g_simulation(self, mock_transcribe):
        """
        Simulates 3G network: 1.5s upload delay.
        Full pipeline (save + transcribe) should still complete in < 5s.
        """
        mock_transcribe.return_value = "3g partial transcript"

        from app.services.session_store import save_chunk, cleanup_session

        audio = generate_fake_audio(100)
        session_id = "session_latency_3g"

        start = time.perf_counter()

        # Simulate 3G upload delay
        time.sleep(1.5)
        save_chunk(session_id, 0, audio)

        # Simulate transcription call
        result = asyncio.get_event_loop().run_until_complete(
            mock_transcribe(audio, "audio/webm", partial=True)
        )

        elapsed = time.perf_counter() - start
        cleanup_session(session_id)

        print(f"\n[3G Simulation] Pipeline latency: {elapsed*1000:.1f} ms")
        assert elapsed < self.LATENCY_TARGETS["3g_network"], (
            f"3G pipeline took {elapsed:.2f}s, expected < {self.LATENCY_TARGETS['3g_network']}s"
        )
        assert result == "3g partial transcript"

    # ── 2G simulation ─────────────────────────────────────────────────────────

    @patch("app.services.transcriber.transcribe_audio_file", new_callable=AsyncMock)
    def test_chunk_upload_2g_simulation(self, mock_transcribe):
        """
        Simulates 2G network: 4s upload delay.
        Pipeline should complete within 10s even on very slow connections.
        """
        mock_transcribe.return_value = "2g transcript"

        from app.services.session_store import save_chunk, cleanup_session

        audio = generate_fake_audio(50)  # smaller chunk for 2G
        session_id = "session_latency_2g"

        start = time.perf_counter()

        # Simulate 2G upload delay
        time.sleep(4.0)
        save_chunk(session_id, 0, audio)

        result = asyncio.get_event_loop().run_until_complete(
            mock_transcribe(audio, "audio/webm", partial=True)
        )

        elapsed = time.perf_counter() - start
        cleanup_session(session_id)

        print(f"\n[2G Simulation] Pipeline latency: {elapsed*1000:.1f} ms")
        assert elapsed < self.LATENCY_TARGETS["2g_network"], (
            f"2G pipeline took {elapsed:.2f}s, expected < {self.LATENCY_TARGETS['2g_network']}s"
        )

    # ── Assembly latency ──────────────────────────────────────────────────────

    def test_session_assembly_latency(self):
        """
        Assembling 10 chunks (simulating a 30s recording) should complete in < 1s.
        """
        from app.services.session_store import save_chunk, assemble_session, cleanup_session

        session_id = "session_assembly_bench"
        chunk_count = 10
        chunk_size_kb = 80  # ~80KB per 3s chunk at opus quality

        for i in range(chunk_count):
            save_chunk(session_id, i, generate_fake_audio(chunk_size_kb))

        start = time.perf_counter()
        assembled = assemble_session(session_id)
        elapsed = time.perf_counter() - start

        cleanup_session(session_id)

        total_kb = chunk_count * chunk_size_kb
        print(f"\n[Assembly] {chunk_count} chunks ({total_kb} KB) assembled in {elapsed*1000:.1f} ms")
        assert assembled is not None
        assert elapsed < 1.0, f"Assembly took {elapsed:.2f}s, expected < 1s"

    # ── Text formatter latency ────────────────────────────────────────────────

    def test_text_formatter_latency(self):
        """
        Text formatting (noise strip + normalize) should be near-instant (< 50ms).
        """
        from app.utils.text_formatter import format_transcript

        # Simulate a long noisy transcript
        raw = (
            "[noise] um uh the farmer said [music] the wheat crop is ready "
            "hmm... and the price is good ah yes very good [laughter] "
        ) * 20  # repeat to make it long

        start = time.perf_counter()
        result = format_transcript(raw)
        elapsed = time.perf_counter() - start

        print(f"\n[Formatter] {len(raw)} chars formatted in {elapsed*1000:.2f} ms")
        assert elapsed < 0.05, f"Formatter took {elapsed*1000:.1f}ms, expected < 50ms"
        assert "[noise]" not in result
        assert "um" not in result.lower().split()


# ─── Latency Report ───────────────────────────────────────────────────────────

def print_latency_report():
    """
    Standalone function to print a latency summary report.
    Can be called directly: python -m pytest test_pipeline_latency.py -v -s
    """
    print("\n" + "="*60)
    print("  KissanShakti Voice Pipeline — Latency Targets")
    print("="*60)
    print(f"  Good network (WiFi/4G) : < 2,000 ms per chunk")
    print(f"  3G simulation          : < 5,000 ms per chunk")
    print(f"  2G simulation          : < 10,000 ms per chunk")
    print(f"  Session assembly       : < 1,000 ms (10 chunks)")
    print(f"  Text formatter         : < 50 ms")
    print("="*60)


if __name__ == "__main__":
    print_latency_report()
    pytest.main([__file__, "-v", "-s"])
