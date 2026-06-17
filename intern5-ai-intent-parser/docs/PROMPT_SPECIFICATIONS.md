# Prompt Specifications & AI Model Handoff Document

**Intern 5 — AI Intent Parser | KissanShakti**
**Day 9-10 Deliverable**

---

## Overview

This document specifies the exact prompt instructions used by the KissanShakti
Intent Parser, documents the model behaviour under different input conditions,
and serves as the official handoff reference for the team.

---

## System Prompt Design Rationale

### Goal

Convert raw agricultural voice transcripts (noisy, multilingual, informal) into
structured JSON objects that the frontend can use without any further processing.

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| **JSON-only output mode** | Prevents the model from generating explanations, apologies, or freeform text. We use OpenAI's `response_format: {"type": "json_object"}` to enforce this at the API level. |
| **Low temperature (0.1)** | Agricultural intent classification is deterministic — the same phrase should always produce the same label. Low temperature prevents creative variation. |
| **Few-shot examples** | 3 example input/output pairs are prepended before the real user message. This anchors the model on the exact output shape before it sees any real data. |
| **Agricultural vocabulary prompt** | The Whisper prompt (Intern 4) and this system prompt both reference farming vocabulary, improving recognition of domain-specific terms like "katai", "sichan", "perun". |
| **Devanagari support** | The keyword tables and system prompt examples explicitly include Devanagari strings. The LLM handles Unicode natively. |

---

## Intent Classification Logic

### Labels and Trigger Conditions

| Label | Primary trigger | Hindi trigger | Marathi trigger |
|-------|----------------|---------------|-----------------|
| `register_worker` | "register", "add worker", "enroll" | "darj karo", "majdoor darj" | "nond kara", "majoor nond" |
| `post_job` | "post", "job", "hire", "need worker" | "kaam post karo", "majdoor chahiye" | "kaam taka", "majoor hava" |
| `find_worker` | "find worker", "show workers" | "mazdoor dhundo", "mazdoor chahiye" | "majoor shodha", "majoor pahije" |
| `navigate` | "take me to", "open", "show me" | "le chalo", "dikhao", "kholo" | — |
| `unknown` | No recognisable keyword | — | — |

### Scoring Algorithm (Rule-Based Fallback)

```
For each intent:
  score = Σ weight(kw) for each matching keyword
  weight = 1.2 if Devanagari, else 1.0

Winner = intent with highest score (ties: register > post > find > navigate)
Confidence = min(1.0, winnerScore / 3.0)
Unknown → confidence = 0.0
```

---

## Entity Extraction Specifications

### Phone Number

- **Regex**: Strip non-digits → remove `+91`/`91` prefix → match `\d{10}`
- **Format**: `+91 XXXXX XXXXX`
- **Confidence**: `0.95` on exact match

### Daily Rate / Wage

- **Trigger**: Number in `[100, 9999]` within ±3 tokens of a wage keyword
- **Wage keywords**: `rate`, `wage`, `rupees`, `rupaye`, `dihadi`, `ujrat`, `pay`, `payout`, `₹`
- **Confidence**: `0.85`
- **Exclusions**: Years (e.g. `2024`) should not be matched — they fall outside the `[100, 9999]` range

### Person Name

**Strategy 1**: Look for name after indicator keywords:
```
"register Suresh Pawar" → "Suresh Pawar"
"laborer Ramesh Thorat" → "Ramesh Thorat"
```

**Strategy 2**: Look for name before suffix keywords:
```
"Suresh ko darj" → "Suresh"
"Ramesh ko register" → "Ramesh"
```

**Strategy 3**: "naam hai \<Name\>"
```
"naam hai Vikram" → "Vikram"
```

**Fallback**: First consecutive TitleCase word pair in the transcript.
Confidence: `0.88` (strategies 1-3) / `0.55` (fallback).

### Skills

- **Synonym resolution**: All synonyms map to 6 canonical labels:
  `Harvesting | Tractor Driving | Sowing | Soil Tilling | Pruning | Irrigation`
- **Matching**: Sort synonyms by length descending (multi-word before single-word) to avoid partial matches
- **Deduplication**: Set-based — each canonical label appears at most once
- **Confidence**: `0.90` if any skills found, `0.0` if none

### Location

**Strategy 1**: Token after spatial keyword: `in / at / near / gaon / village / kareeb / mein / madhe`

**Strategy 2**: Hard-coded place name lookup:
`pimplad, sinnar, nashik, pune, aurangabad, solapur, latur, nanded, kolhapur, satara, jalgaon, akola, amravati, nagpur`

Confidence: `0.80` (spatial keyword) / `0.75` (hard-coded lookup).

### Date (Day 3-4 addition)

- **ISO match**: `YYYY-MM-DD`
- **Day-month pattern**: `"15 june"`, `"15 June"`
- **Relative terms**: `kal → tomorrow`, `aaj → today`, `parso → day after tomorrow`
- **Next weekday**: `"next Monday"`, etc.
- Confidence: `0.95` (ISO) / `0.80` (day-month) / `0.75` (relative)

### Worker Count (Day 3-4 addition)

- **Numeric**: `"4 workers"`, `"5 majdoor"` → `"4"`, `"5"`
- **Hindi word numbers**: `teen → 3`, `char → 4`, `paanch → 5`, etc.
- Confidence: `0.88`

### Job Type (Day 3-4 addition)

Combines crop name + skill canonical label:
- `"wheat harvesting"` → `"wheat harvesting"`
- `"paddy transplanting"` → `"paddy sowing"`

Confidence: `0.80`

---

## Navigation Routing (Day 7-8)

### Route Map

| Spoken command | Tab activated | Action |
|---------------|--------------|--------|
| "workers list", "register worker", "majdoor" | `workers` | `scroll_top` |
| "post job", "kaam post", "job board" | `jobs` | `open_form` |
| "dashboard", "home", "ghar" | `dashboard` | `scroll_top` |
| "sync audit", "logs", "queue" | `sync_audit` | `scroll_top` |
| "schema", "database", "spec" | `schema` | `scroll_top` |

### Intent-to-Route Auto-Navigation

When intent is NOT `navigate`, the frontend auto-navigates:
- `register_worker` → workers tab (open_form)
- `post_job` → jobs tab (open_form)
- `find_worker` → workers tab (scroll_top)

This removes the need for a separate navigation command after a task intent.

---

## Fallback Behaviour

| Scenario | Fallback |
|----------|---------|
| No `OPENAI_API_KEY` | Offline rule-based parser (always available) |
| OpenAI API timeout / error | Offline rule-based parser |
| LLM returns invalid JSON | Pydantic validation fails → offline parser |
| LLM returns wrong schema | ValidationError caught → offline parser |
| Empty transcript | `unknown` intent, all fields empty, confidence 0.0 |
| Filler-only transcript | `unknown` intent, confidence 0.0 |

---

## Model Accuracy Summary

Results from `test_accuracy_audit.py` against 40 labeled mock dataset cases:

| Class | Cases | Pass Rate |
|-------|-------|-----------|
| `register_worker` | 10 | ≥ 80% |
| `post_job` | 10 | ≥ 80% |
| `find_worker` | 10 | ≥ 80% |
| `navigate` | 8 | ≥ 70% |
| `unknown` | 2 | 100% |
| **Overall** | **40** | **≥ 80%** |

Run the audit: `pytest app/tests/test_accuracy_audit.py -v -s`

---

## Integration Points

### Frontend (Intern 1)

`useSpeechAssistant.js` calls `parseSpeechText()` which wraps `intentParser.js`.
The new `voiceNavigator.js` should be imported and called in `applyVoiceEntities()`:

```js
import { getNavigationFromParseResult } from './voiceNavigator';

// Inside applyVoiceEntities():
const nav = getNavigationFromParseResult(recognizedEntities);
if (nav?.shouldNavigate) {
  setActiveTab(nav.tab);
}
```

### Backend (Intern 4 — Transcriber)

After `POST /audio/finalize` returns the transcript, the frontend should
call `POST /intent/parse` with the transcript to get the structured ParseResult.

---

## Known Limitations

1. **Name extraction fails for non-Latin scripts** — Devanagari names are not extracted (English-only regex for TitleCase)
2. **Ambiguous wages** — `"rate 2024"` would be excluded (outside `[100, 9999]`) but `"wage 1200"` matches correctly
3. **Multi-skill ranking** — When multiple skills match, all are returned; no ranking by relevance
4. **Date parsing is heuristic** — Complex relative dates like "3 days from now" are not handled
5. **Navigation confidence** — The rule-based navigator may activate on job posting transcripts that mention "post" (a navigation keyword) — resolved by the intent-first routing logic

---

*Document prepared by Intern 5 (AI Intent Parser) for the KissanShakti Phase 1 handoff. For questions, open an issue on the `feature/ai-intent-parser` branch.*
