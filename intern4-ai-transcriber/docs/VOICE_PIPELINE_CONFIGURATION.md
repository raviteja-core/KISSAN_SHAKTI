# Voice Pipeline Configuration Guide
**Intern 4 — AI Voice (Transcriber) | KissanShakti**

---

## Overview

The KissanShakti voice pipeline captures farmer speech via the browser microphone, streams compressed audio to a FastAPI backend, transcribes it using Whisper, and returns clean formatted text. This document covers every configuration point in the pipeline.

---

## Architecture

```
Browser (React/Vite)
  │
  │  MediaRecorder API
  │  opus/webm chunks every 1–3s
  │
  ▼
FastAPI Backend
  │
  ├── POST /audio/chunk      ← receives each chunk
  │     ├── save to temp disk (session store)
  │     ├── LRU cache lookup
  │     └── partial transcription (optional)
  │
  └── POST /audio/finalize   ← assembles + full transcription
        ├── assemble chunks → single audio file
        ├── Whisper transcription (primary or fallback)
        └── text formatter (noise strip + normalize)
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `OPENAI_API_KEY` | *(empty)* | OpenAI API key. If set, uses cloud Whisper. If empty, falls back to local faster-whisper. |
| `TRANSCRIBER_LANGUAGE` | `te` | Language hint for Whisper. See language codes below. |

### Language Codes

| Code | Language |
|---|---|
| `te` | Telugu *(default — primary KissanShakti region)* |
| `hi` | Hindi |
| `kn` | Kannada |
| `ta` | Tamil |
| `mr` | Marathi |
| `pa` | Punjabi |
| `gu` | Gujarati |
| `bn` | Bengali |
| `en` | English |

---

## Frontend Configuration

**File:** `frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:8000
```

**File:** `frontend/src/hooks/useAudioRecorder.js`

| Constant | Default | Description |
|---|---|---|
| `CHUNK_INTERVAL_MS` | `3000` | How often MediaRecorder fires `ondataavailable` (milliseconds). Reduce to `1000` on 2G. |
| `PREFERRED_MIME` | `audio/webm;codecs=opus` | Opus codec gives ~8x compression vs raw PCM. |
| `FALLBACK_MIME` | `audio/ogg;codecs=opus` | Used if webm not supported (older browsers). |

**File:** `frontend/src/services/audioUploadService.js`

| Constant | Default | Description |
|---|---|---|
| `MAX_CHUNK_SIZE_BYTES` | `2097152` (2 MB) | Warns if a chunk exceeds this — indicates codec fallback to uncompressed PCM. |
| `MAX_RETRIES` | `3` | Number of upload retry attempts on failure. |
| `RETRY_DELAY_MS` | `1500` | Base delay between retries (multiplied by attempt number). |

---

## Backend Configuration

### Transcription Backends

#### Primary: OpenAI Whisper API
- **Activated when:** `OPENAI_API_KEY` is set in `.env`
- **Model:** `whisper-1`
- **Timeout:** 30 seconds per request
- **Prompt:** `"Farmer speaking about crops, weather, soil, market prices."` — improves agricultural vocabulary accuracy
- **Supported languages:** 99 languages including all major Indian languages

#### Fallback: faster-whisper (Local CPU)
- **Activated when:** OpenAI API is unreachable or key is missing
- **Model:** `tiny` (fast, low memory) — upgrade to `base` for better accuracy
- **Device:** CPU with int8 quantization
- **Install:** `pip install faster-whisper`

### Session Store

**File:** `backend/app/services/session_store.py`

| Setting | Value | Description |
|---|---|---|
| `TEMP_DIR` | `%TEMP%/kissanshakti_audio` | Where chunks are stored temporarily |
| Chunk filename | `chunk_0001.webm` | Zero-padded for correct sort order |
| Cleanup | After `/finalize` | All session files deleted after transcription |

### Pipeline Optimizer

**File:** `backend/app/services/pipeline_optimizer.py`

| Feature | Config | Description |
|---|---|---|
| LRU Cache | `max_size=128` | Caches last 128 unique audio fingerprints |
| Network estimator | `window=5` | Averages last 5 upload speeds |
| Pre-warm | On startup | Loads Whisper model before first request |

**Adaptive chunk interval recommendations:**

| Network | Speed | Recommended interval |
|---|---|---|
| WiFi / 4G | > 500 KB/s | 3000 ms |
| 3G | > 100 KB/s | 2000 ms |
| Slow 3G | > 30 KB/s | 1500 ms |
| 2G | < 30 KB/s | 1000 ms |

### Text Formatter

**File:** `backend/app/utils/text_formatter.py`

Noise patterns stripped from transcripts:

| Pattern | Example |
|---|---|
| `[...]` brackets | `[noise]`, `[music]`, `[laughter]` |
| `(...)` brackets | `(inaudible)`, `(crosstalk)` |
| Filler words | `um`, `uh`, `hmm`, `ah` |
| Ellipsis | `...` |
| Music symbols | `♪ ... ♪` |

---

## API Reference

### `POST /audio/chunk`

Receives a single audio chunk from the browser.

**Form fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `audio` | File | ✅ | Raw audio blob |
| `session_id` | string | ✅ | Must start with `session_` |
| `chunk_index` | integer | ✅ | Sequential chunk number (0-based) |
| `mime_type` | string | ❌ | Default: `audio/webm` |

**Response:**
```json
{
  "status": "received",
  "session_id": "session_1717123456789",
  "chunk_index": 2,
  "bytes_received": 48320,
  "partial_transcript": "ధాన్యం ధర పెరిగింది",
  "cached": false
}
```

---

### `POST /audio/finalize`

Assembles all chunks and returns the full transcript.

**Request body:**
```json
{ "session_id": "session_1717123456789" }
```

**Response:**
```json
{
  "session_id": "session_1717123456789",
  "transcript": "Wheat crop price has increased this season.",
  "raw_transcript": "[noise] um wheat crop price has increased um this season [music]"
}
```

---

### `GET /stats`

Returns pipeline performance metrics.

**Response:**
```json
{
  "cache": {
    "size": 12,
    "hits": 34,
    "misses": 8,
    "hit_rate_pct": 81.0
  },
  "network": {
    "estimated_speed": "3G",
    "recommended_chunk_interval_ms": 2000
  }
}
```

---

## Latency Targets

| Stage | Target |
|---|---|
| Chunk upload + save (good network) | < 2,000 ms |
| Chunk upload + save (3G) | < 5,000 ms |
| Chunk upload + save (2G) | < 10,000 ms |
| Session assembly (10 chunks) | < 1,000 ms |
| Text formatting | < 50 ms |
| Full transcription (OpenAI) | < 8,000 ms |
| Full transcription (local tiny) | < 15,000 ms |

---

## Running Locally

```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env: add OPENAI_API_KEY and set TRANSCRIBER_LANGUAGE
uvicorn main:app --reload

# Frontend
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`

---

## Running Latency Tests

```bash
cd backend
pip install pytest
pytest app/tests/test_pipeline_latency.py -v -s
```
