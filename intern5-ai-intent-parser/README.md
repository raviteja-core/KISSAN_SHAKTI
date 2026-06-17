# Intern 5 — AI Intent Parser | KissanShakti

**Branch:** `feature/ai-intent-parser`

---

## What this module does

Receives clean text transcripts (from Intern 4's transcriber) and converts them into **structured JSON intent objects** that the frontend (Intern 1) can use to auto-fill forms and trigger page navigation.

### Pipeline position

```
Browser mic → [Intern 4: Transcriber] → raw text
                                            │
                                            ▼
                              [Intern 5: Intent Parser]
                                            │
                                            ▼
                               Structured JSON payload
                                            │
                         ┌──────────────────┤
                         ▼                  ▼
               Auto-fill forms       Voice navigation
               (Intern 1 forms)      (page routing)
```

---

## Project Structure

```
intern5-ai-intent-parser/
├── README.md                        ← this file
│
├── backend/
│   ├── main.py                      ← FastAPI app entry point
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── __init__.py
│       ├── routers/
│       │   ├── __init__.py
│       │   └── intent.py            ← POST /intent/parse endpoint
│       ├── services/
│       │   ├── __init__.py
│       │   ├── intent_classifier.py ← LLM-powered intent + entity extraction
│       │   ├── prompt_builder.py    ← builds system + user prompt templates
│       │   └── fallback_parser.py  ← offline rule-based fallback (no API key needed)
│       ├── models/
│       │   ├── __init__.py
│       │   └── intent_schema.py    ← Pydantic output schema (ParseResult)
│       ├── utils/
│       │   ├── __init__.py
│       │   └── confidence.py       ← confidence scoring helpers
│       └── tests/
│           ├── __init__.py
│           ├── test_intent_classifier.py
│           └── test_accuracy_audit.py
│
├── frontend/
│   └── src/
│       └── voice/
│           └── voiceNavigator.js   ← maps parsed intents → UI page routes
│
└── docs/
    ├── PROMPT_SPECIFICATIONS.md    ← Day 9-10 handoff document
    └── ACCURACY_AUDIT_REPORT.md   ← evaluation results
```

---

## Setup

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env         # Add OPENAI_API_KEY (optional — fallback works offline)
uvicorn main:app --reload
```

### Frontend integration

The `voiceNavigator.js` module is already wired into the frontend's `useSpeechAssistant.js` hook.
No extra setup needed — it activates automatically when voice input is processed.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/intent/parse` | Parse transcript → structured intent JSON |
| GET  | `/intent/health` | Health check + model status |

---

## Output Schema

```json
{
  "intent": "register_worker",
  "confidence": 0.92,
  "entities": {
    "name": "Suresh Pawar",
    "nameConfidence": 0.88,
    "phone": "+91 99887 76655",
    "phoneConfidence": 0.95,
    "rate": "450",
    "rateConfidence": 0.85,
    "skills": ["Sowing", "Harvesting"],
    "skillsConfidence": 0.90,
    "location": "Pimplad",
    "locationConfidence": 0.80,
    "title": "",
    "titleConfidence": 0.0,
    "desc": "Register laborer Suresh Pawar, phone 9988776655...",
    "descConfidence": 1.0
  },
  "navigation": {
    "route": "/workers",
    "action": "open_form"
  },
  "backend_used": "llm_openai"
}
```

---

## Intent Labels

| Intent | Triggered by |
|--------|-------------|
| `register_worker` | "Register worker", "darj karo", "मजदूर दर्ज" |
| `post_job` | "Post job", "kaam post karo", "काम चाहिए" |
| `find_worker` | "Find worker", "mazdoor dhundo", "मजदूर ढूंढो" |
| `navigate` | "Take me to", "dikhao", "open workers list" |
| `unknown` | Unrecognised input |
