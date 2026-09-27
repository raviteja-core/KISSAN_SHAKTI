"""
intent_classifier.py
LLM-powered intent classifier using OpenAI GPT-4o-mini.

Primary:  OpenAI GPT-4o-mini with structured JSON output
Fallback: Rule-based offline parser (fallback_parser.py)

Day 5-6 Deliverable: Enforce strict output formatting — the LLM is forced to
output JSON matching the ParseResult schema every time.

Intern 5 — AI Intent Parser | KissanShakti
"""

from __future__ import annotations

import json
import logging
import os
import time
from typing import Optional

import httpx
from pydantic import ValidationError

from app.models.intent_schema import ParseResult, IntentLabel, ParsedEntities, NavigationPayload
from app.services.prompt_builder import SYSTEM_PROMPT, build_user_prompt, get_few_shot_examples
from app.services.fallback_parser import parse_offline

logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions"

# Model choice: gpt-4o-mini is cheap, fast, and supports JSON mode
LLM_MODEL = os.getenv("INTENT_PARSER_MODEL", "gpt-4o-mini")


# ---------------------------------------------------------------------------
# LLM parser
# ---------------------------------------------------------------------------

async def _parse_with_llm(transcript: str, language: str, session_id: str) -> ParseResult:
    """
    Calls OpenAI GPT with structured JSON mode.
    Raises RuntimeError on API failure so the caller can fall back.
    """
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *get_few_shot_examples(),
        {"role": "user", "content": build_user_prompt(transcript, language)},
    ]

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            OPENAI_CHAT_URL,
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": LLM_MODEL,
                "messages": messages,
                "response_format": {"type": "json_object"},  # forces valid JSON output
                "temperature": 0.1,   # low temp for consistent structured output
                "max_tokens": 512,
            },
        )

    if response.status_code != 200:
        raise RuntimeError(f"OpenAI API error {response.status_code}: {response.text[:200]}")

    raw_json_str = response.json()["choices"][0]["message"]["content"]

    # Parse and validate against schema
    try:
        data = json.loads(raw_json_str)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"LLM returned invalid JSON: {e}") from e

    # Validate with Pydantic — reject if schema doesn't match
    try:
        # Flatten the response into our ParseResult model
        intent_str = data.get("intent", "unknown")
        confidence = float(data.get("confidence", 0.0))
        ents = data.get("entities", {})
        nav = data.get("navigation", {})

        result = ParseResult(
            intent=intent_str,
            confidence=confidence,
            entities=ParsedEntities(
                name=ents.get("name", ""),
                nameConfidence=float(ents.get("nameConfidence", 0.0)),
                phone=ents.get("phone", ""),
                phoneConfidence=float(ents.get("phoneConfidence", 0.0)),
                rate=ents.get("rate", ""),
                rateConfidence=float(ents.get("rateConfidence", 0.0)),
                skills=ents.get("skills", []),
                skillsConfidence=float(ents.get("skillsConfidence", 0.0)),
                location=ents.get("location", ""),
                locationConfidence=float(ents.get("locationConfidence", 0.0)),
                title=ents.get("title", ""),
                titleConfidence=float(ents.get("titleConfidence", 0.0)),
                desc=ents.get("desc", transcript[:100]),
                descConfidence=float(ents.get("descConfidence", 1.0)),
                date=ents.get("date", ""),
                dateConfidence=float(ents.get("dateConfidence", 0.0)),
                workerCount=ents.get("workerCount", ""),
                workerCountConfidence=float(ents.get("workerCountConfidence", 0.0)),
                jobType=ents.get("jobType", ""),
                jobTypeConfidence=float(ents.get("jobTypeConfidence", 0.0)),
            ),
            navigation=NavigationPayload(
                route=nav.get("route", ""),
                action=nav.get("action", ""),
            ),
            backend_used="llm_openai",
            raw_transcript=transcript,
        )
        return result

    except (ValidationError, KeyError, TypeError) as e:
        raise RuntimeError(f"LLM response failed schema validation: {e}") from e


# ---------------------------------------------------------------------------
# Public classifier
# ---------------------------------------------------------------------------

async def classify_intent(
    transcript: str,
    language: str = "en",
    session_id: str = "",
) -> ParseResult:
    """
    Primary entry point for intent classification.

    Strategy:
      1. Try LLM (OpenAI GPT-4o-mini) if API key is available
      2. Fall back to offline rule-based parser on any failure

    Args:
        transcript: Clean text from the voice transcriber
        language: Language hint for the LLM
        session_id: For logging / tracing

    Returns:
        ParseResult — always returns, never raises
    """
    if not transcript or not transcript.strip():
        logger.debug(f"[IntentClassifier] Empty transcript for session {session_id}")
        return parse_offline(transcript, language)

    start = time.perf_counter()

    # Try LLM first
    if OPENAI_API_KEY:
        try:
            result = await _parse_with_llm(transcript, language, session_id)
            elapsed = (time.perf_counter() - start) * 1000
            logger.info(
                f"[IntentClassifier] session={session_id} | backend=llm_openai | "
                f"intent={result.intent} | conf={result.confidence:.2f} | {elapsed:.0f}ms"
            )
            return result
        except Exception as e:
            logger.warning(
                f"[IntentClassifier] LLM failed for session {session_id}: {e}. "
                "Falling back to rule-based parser."
            )

    # Offline fallback
    result = parse_offline(transcript, language)
    elapsed = (time.perf_counter() - start) * 1000
    logger.info(
        f"[IntentClassifier] session={session_id} | backend=rule_based_fallback | "
        f"intent={result.intent} | conf={result.confidence:.2f} | {elapsed:.0f}ms"
    )
    return result
