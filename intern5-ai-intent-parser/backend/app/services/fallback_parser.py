"""
fallback_parser.py
Offline rule-based intent parser — no API key required.

This is the fallback activated when:
  - OPENAI_API_KEY is not set
  - The OpenAI API is unreachable (network offline)
  - LLM response fails JSON validation

It wraps the JS intentParser.js logic, reimplemented in Python so the
backend can also parse offline without calling any external service.

Day 1-2 Deliverable: Rule-based classification baseline
Day 5-6 Deliverable: Structured JSON output enforcement

Intern 5 — AI Intent Parser | KissanShakti
"""

from __future__ import annotations

import re
import logging
from typing import Optional

from app.models.intent_schema import (
    ParseResult, ParsedEntities, NavigationPayload, IntentLabel
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Keyword tables (mirrors intentParser.js INTENT_KEYWORDS)
# ---------------------------------------------------------------------------

INTENT_KEYWORDS: dict[str, list[str]] = {
    "register_worker": [
        # English
        "add worker", "save worker", "enroll", "laborer", "register",
        # Hindi romanised
        "majdoor darj", "worker add karo", "darj karna", "darj karo", "jodna",
        # Hindi Devanagari
        "मजदूर दर्ज", "दर्ज करो", "जोड़ो",
        # Marathi romanised
        "majoor nond", "nond karun theva", "nond kara",
        # Marathi Devanagari
        "मजूर नोंद", "नोंद करा",
    ],
    "post_job": [
        # English
        "create job", "need worker", "hire", "post", "task", "work", "job",
        # Hindi romanised
        "kaam post karo", "kaam dena", "majdoor chahiye", "kaam chahiye", "kaam hai",
        # Hindi Devanagari
        "काम पोस्ट", "काम चाहिए", "काम है",
        # Marathi romanised
        "kaam post kara", "majoor hava", "kaam hava", "kaam taka",
        # Marathi Devanagari
        "काम हवे", "काम टाका",
    ],
    "find_worker": [
        # English
        "find worker", "search worker", "show workers", "available workers", "who can work",
        # Hindi romanised
        "mazdoor dhundo", "mazdoor chahiye", "worker chahiye", "koi mazdoor", "mazdoor kahan",
        # Hindi Devanagari
        "मजदूर ढूंढो", "मजदूर चाहिए",
        # Marathi romanised
        "majoor shodha", "majoor pahije", "majoor kuto ahe",
        # Marathi Devanagari
        "मजूर शोधा", "मजूर पाहिजे",
    ],
    "navigate": [
        # English
        "take me to", "open", "show me", "go to",
        # Hindi romanised
        "le chalo", "dikhao", "kholo",
        # Hindi Devanagari
        "दिखाओ", "खोलो",
    ],
}

# ---------------------------------------------------------------------------
# Skill synonym → canonical label map (mirrors intentParser.js SKILL_SYNONYMS)
# ---------------------------------------------------------------------------

SKILL_SYNONYMS: dict[str, str] = {
    # Harvesting
    "harvest": "Harvesting", "harvesting": "Harvesting", "cut": "Harvesting",
    "cutting": "Harvesting", "katai": "Harvesting", "kaatna": "Harvesting",
    "fasal katna": "Harvesting", "कटाई": "Harvesting", "फसल काटना": "Harvesting",
    "katni": "Harvesting", "katai kara": "Harvesting", "कापणी": "Harvesting",
    # Tractor Driving
    "tractor": "Tractor Driving", "driving": "Tractor Driving", "driver": "Tractor Driving",
    "tractor driving": "Tractor Driving", "tractor chalana": "Tractor Driving",
    "ट्रैक्टर चलाना": "Tractor Driving", "tractor chalvne": "Tractor Driving",
    "ट्रॅक्टर चालवणे": "Tractor Driving",
    # Sowing
    "sow": "Sowing", "sowing": "Sowing", "plant": "Sowing", "planting": "Sowing",
    "seed": "Sowing", "bot lagana": "Sowing", "beej bona": "Sowing", "bona": "Sowing",
    "बीज बोना": "Sowing", "bot lavne": "Sowing", "perne": "Sowing",
    "बोट लावणे": "Sowing", "पेरणे": "Sowing",
    # Soil Tilling
    "till": "Soil Tilling", "tilling": "Soil Tilling", "plow": "Soil Tilling",
    "plowing": "Soil Tilling", "tillage": "Soil Tilling", "jotna": "Soil Tilling",
    "jotai": "Soil Tilling", "जोतना": "Soil Tilling", "जुताई": "Soil Tilling",
    "nangar chalvne": "Soil Tilling", "नांगर चालवणे": "Soil Tilling",
    # Pruning
    "prune": "Pruning", "pruning": "Pruning", "trim": "Pruning", "trimming": "Pruning",
    "chatai": "Pruning", "छटाई": "Pruning", "छाटणी": "Pruning",
    # Irrigation
    "irrigate": "Irrigation", "irrigation": "Irrigation", "water": "Irrigation",
    "watering": "Irrigation", "sinchai": "Irrigation", "paani dena": "Irrigation",
    "sichan": "Irrigation", "सिंचाई": "Irrigation", "पानी देना": "Irrigation",
    "सिंचन": "Irrigation", "पाणी घालणे": "Irrigation",
}

FILLER_TOKENS: set[str] = {"umm", "arre", "bhai", "yaar", "acha", "hmm", "uh", "haan", "thik hai"}
WAGE_KEYWORDS: list[str] = ["rate", "wage", "rupees", "rupaye", "dihadi", "ujrat", "pay", "payout", "₹", "payment"]
LOCATION_KEYWORDS: list[str] = ["in", "at", "near", "location", "gaon", "village", "kareeb", "mein", "madhe"]
KNOWN_PLACES: list[str] = [
    "pimplad", "sinnar", "nashik", "pune", "aurangabad", "solapur",
    "latur", "nanded", "kolhapur", "satara", "jalgaon", "akola", "amravati", "nagpur",
]
NAME_INDICATORS: list[str] = [
    "register ", "laborer ", "worker ", "majoor ", "register majoor ",
]
NAME_SUFFIXES: list[str] = [" ko darj", " ko register", " ko nond"]
NAVIGATE_ROUTE_MAP: list[tuple[list[str], str, str]] = [
    (["worker", "majdoor", "laborer", "register", "majoor", "मजदूर", "मजूर"], "/workers", "scroll_top"),
    (["job", "post", "kaam", "task", "काम", "naukri"], "/jobs", "open_form"),
    (["dashboard", "home", "ghar", "main", "ghar"], "/dashboard", "scroll_top"),
    (["sync", "audit", "logs", "queue"], "/sync-audit", "scroll_top"),
    (["schema", "database", "db", "spec"], "/schema", "scroll_top"),
]


def _normalise(text: Optional[str]) -> str:
    if text is None:
        return ""
    return str(text).lower().strip()


def _tokenise(text: str) -> list[str]:
    return [t for t in text.split() if t and t not in FILLER_TOKENS]


def _is_devanagari(s: str) -> bool:
    return bool(re.search(r"[\u0900-\u097F]", s))


# ---------------------------------------------------------------------------
# Intent scoring
# ---------------------------------------------------------------------------

def _score_intents(tokens: list[str], norm_text: str) -> tuple[str, float]:
    scores: dict[str, float] = {k: 0.0 for k in INTENT_KEYWORDS}

    for intent, keywords in INTENT_KEYWORDS.items():
        for kw in keywords:
            weight = 1.2 if _is_devanagari(kw) else 1.0
            if " " in kw:
                if kw in norm_text:
                    scores[intent] += weight
            else:
                if kw in tokens:
                    scores[intent] += weight

    winner, best = "unknown", 0.0
    for intent in ["register_worker", "post_job", "find_worker", "navigate"]:
        if scores[intent] > best:
            best = scores[intent]
            winner = intent

    confidence = 0.0 if winner == "unknown" else min(1.0, best / 3.0)
    return winner, confidence


# ---------------------------------------------------------------------------
# Entity extractors
# ---------------------------------------------------------------------------

def _extract_phone(text: str) -> tuple[str, float]:
    stripped = re.sub(r"[^\+\d]", "", text)
    normalised = re.sub(r"^\+?91(?=\d{10}$)", "", stripped)
    m = re.search(r"\d{10}", normalised)
    if m:
        d = m.group(0)
        return f"+91 {d[:5]} {d[5:]}", 0.95
    return "", 0.0


def _extract_rate(text: str, tokens: list[str]) -> tuple[str, float]:
    wage_indices = {i for i, t in enumerate(tokens) if t in WAGE_KEYWORDS}
    for i, tok in enumerate(tokens):
        try:
            num = int(tok)
        except ValueError:
            continue
        if 100 <= num <= 9999 and str(num) == tok:
            if any(abs(i - wi) <= 3 for wi in wage_indices):
                return str(num), 0.85
    m = re.search(r"₹\s*(\d{3,4})", text)
    if m:
        num = int(m.group(1))
        if 100 <= num <= 9999:
            return str(num), 0.85
    return "", 0.0


def _extract_name(original: str) -> tuple[str, float]:
    lower = original.lower()
    for indicator in NAME_INDICATORS:
        idx = lower.find(indicator)
        if idx != -1:
            after = original[idx + len(indicator):].strip()
            m = re.match(r"^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)", after)
            if m:
                return m.group(1), 0.88
    for suffix in NAME_SUFFIXES:
        idx = lower.find(suffix)
        if idx != -1:
            before = original[:idx].strip()
            words = before.split()
            candidate = " ".join(w for w in words[-2:] if re.match(r"^[A-Z]", w))
            if candidate:
                return candidate, 0.88
    m_naam = re.search(r"naam hai\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)", original)
    if m_naam:
        return m_naam.group(1), 0.88
    m_pair = re.search(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)", original)
    if m_pair:
        return m_pair.group(1), 0.55
    return "", 0.0


def _extract_location(norm_text: str) -> tuple[str, float]:
    tokens = norm_text.split()
    for i, tok in enumerate(tokens):
        if tok in LOCATION_KEYWORDS and i + 1 < len(tokens):
            loc = tokens[i + 1]
            if len(loc) > 2 and not loc.isdigit():
                return loc.capitalize(), 0.80
    for place in KNOWN_PLACES:
        if place in norm_text:
            return place.capitalize(), 0.75
    return "", 0.0


def _extract_skills(norm_text: str) -> tuple[list[str], float]:
    found: set[str] = set()
    sorted_synonyms = sorted(SKILL_SYNONYMS.items(), key=lambda kv: len(kv[0]), reverse=True)
    for synonym, canonical in sorted_synonyms:
        if synonym.lower() in norm_text:
            found.add(canonical)
    result = list(found)
    return (result, 0.90) if result else ([], 0.0)


def _extract_title(norm_text: str, intent: str, skills: list[str]) -> tuple[str, float]:
    if intent != "post_job":
        return "", 0.0
    title_indicators = ["post", "task", "kaam hai", "kaam taka", "task for", "kaam hava"]
    tokens = norm_text.split()
    for indicator in title_indicators:
        ind_tokens = indicator.split()
        for i in range(len(tokens) - len(ind_tokens) + 1):
            if tokens[i:i + len(ind_tokens)] == ind_tokens and i + len(ind_tokens) < len(tokens):
                word = tokens[i + len(ind_tokens)]
                if len(word) > 1:
                    return word.capitalize(), 0.80
    if skills:
        return f"{skills[0]} Task", 0.65
    return "", 0.0


def _extract_desc(original: str) -> tuple[str, float]:
    if not original:
        return "", 0.0
    value = (original[:100] + "...") if len(original) > 100 else original[:100]
    return value, 1.0


def _extract_date(norm_text: str, original: str) -> tuple[str, float]:
    """
    Extracts a date hint from the transcript.
    Supports: ISO dates, relative terms (kal/kal se/tomorrow/today/next <weekday>)
    """
    # ISO date
    m_iso = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", original)
    if m_iso:
        return m_iso.group(1), 0.95

    # Day / month pattern: "15 june", "15 जून"
    m_dm = re.search(
        r"\b(\d{1,2})\s*(january|february|march|april|may|june|july|august|september|october|november|december)\b",
        norm_text,
    )
    if m_dm:
        return f"{m_dm.group(1)} {m_dm.group(2).capitalize()}", 0.80

    # Relative terms
    relative_map = {
        "kal": "tomorrow", "kal se": "tomorrow", "parso": "day after tomorrow",
        "aaj": "today", "today": "today", "tomorrow": "tomorrow",
        "next monday": "next Monday", "next tuesday": "next Tuesday",
        "next wednesday": "next Wednesday", "next thursday": "next Thursday",
        "next friday": "next Friday", "next saturday": "next Saturday",
        "next sunday": "next Sunday",
    }
    for phrase, canonical in relative_map.items():
        if phrase in norm_text:
            return canonical, 0.75
    return "", 0.0


def _extract_worker_count(norm_text: str, tokens: list[str]) -> tuple[str, float]:
    """Extracts number of workers requested (e.g. 'teen majdoor', '3 workers')."""
    count_keywords = ["worker", "workers", "majdoor", "mazdoor", "majoor", "laborer", "laborers", "log"]
    word_to_num = {
        "ek": "1", "do": "2", "teen": "3", "char": "4", "paanch": "5",
        "chhe": "6", "saat": "7", "aath": "8", "nau": "9", "das": "10",
        "one": "1", "two": "2", "three": "3", "four": "4", "five": "5",
    }

    for i, tok in enumerate(tokens):
        if tok in count_keywords:
            # Check previous token
            if i > 0:
                prev = tokens[i - 1]
                if prev.isdigit():
                    return prev, 0.88
                if prev in word_to_num:
                    return word_to_num[prev], 0.80
            # Check next token (e.g. "workers 3")
            if i + 1 < len(tokens):
                nxt = tokens[i + 1]
                if nxt.isdigit():
                    return nxt, 0.85

    # Pattern: "N workers" directly
    m = re.search(r"\b([1-9]\d?)\s*(?:worker|workers|majdoor|mazdoor|majoor|laborer|laborers)\b", norm_text)
    if m:
        return m.group(1), 0.88
    return "", 0.0


def _extract_job_type(norm_text: str, skills: list[str]) -> tuple[str, float]:
    """Extracts specific job type descriptor (e.g. 'wheat harvesting', 'paddy transplanting')."""
    crop_patterns = [
        (r"\b(wheat|gehu|gehun)\b", "wheat"), (r"\b(rice|paddy|chawal|dhan)\b", "paddy"),
        (r"\b(maize|corn|makka|makkai)\b", "maize"), (r"\b(sugarcane|ganna|uus)\b", "sugarcane"),
        (r"\b(cotton|kapas|rui)\b", "cotton"), (r"\b(soybean|soya|soyabean)\b", "soybean"),
        (r"\b(onion|pyaaz|pyaj|kanda)\b", "onion"), (r"\b(tomato|tamatar)\b", "tomato"),
    ]
    crop_found = None
    for pattern, crop_name in crop_patterns:
        if re.search(pattern, norm_text):
            crop_found = crop_name
            break

    if crop_found and skills:
        skill_lower = skills[0].lower().replace(" ", "_")
        return f"{crop_found} {skill_lower}", 0.80
    if crop_found:
        return crop_found, 0.65
    return "", 0.0


def _resolve_navigation(norm_text: str, tokens: list[str]) -> NavigationPayload:
    """Maps navigation intent transcripts to frontend route + action."""
    for keywords, route, action in NAVIGATE_ROUTE_MAP:
        if any(kw in tokens or kw in norm_text for kw in keywords):
            return NavigationPayload(route=route, action=action)
    return NavigationPayload(route="/dashboard", action="scroll_top")


# ---------------------------------------------------------------------------
# Public parse function
# ---------------------------------------------------------------------------

def parse_offline(transcript: Optional[str], language: str = "en") -> ParseResult:
    """
    Offline rule-based intent parser.

    Args:
        transcript: Raw text from the voice transcriber
        language: Language hint (unused in rule-based mode, kept for API parity)

    Returns:
        ParseResult — fully populated, never raises
    """
    norm_text = _normalise(transcript)
    original = "" if transcript is None else str(transcript)
    tokens = _tokenise(norm_text)

    # 1. Intent scoring
    intent_str, confidence = _score_intents(tokens, norm_text)

    # 2. Entity extraction
    phone, phone_conf = _extract_phone(original)
    rate, rate_conf = _extract_rate(norm_text, tokens)
    name, name_conf = _extract_name(original)
    location, loc_conf = _extract_location(norm_text)
    skills, skills_conf = _extract_skills(norm_text)
    title, title_conf = _extract_title(norm_text, intent_str, skills)
    desc, desc_conf = _extract_desc(original)
    date, date_conf = _extract_date(norm_text, original)
    worker_count, wc_conf = _extract_worker_count(norm_text, tokens)
    job_type, jt_conf = _extract_job_type(norm_text, skills)

    # 3. Navigation resolution
    navigation = NavigationPayload()
    if intent_str == "navigate":
        navigation = _resolve_navigation(norm_text, tokens)

    # 4. Assemble result
    try:
        intent_label = IntentLabel(intent_str)
    except ValueError:
        intent_label = IntentLabel.UNKNOWN

    return ParseResult(
        intent=intent_label,
        confidence=confidence,
        entities=ParsedEntities(
            name=name,                   nameConfidence=name_conf,
            phone=phone,                 phoneConfidence=phone_conf,
            rate=rate,                   rateConfidence=rate_conf,
            skills=skills,               skillsConfidence=skills_conf,
            location=location,           locationConfidence=loc_conf,
            title=title,                 titleConfidence=title_conf,
            desc=desc,                   descConfidence=desc_conf,
            date=date,                   dateConfidence=date_conf,
            workerCount=worker_count,    workerCountConfidence=wc_conf,
            jobType=job_type,            jobTypeConfidence=jt_conf,
        ),
        navigation=navigation,
        backend_used="rule_based_fallback",
        raw_transcript=original,
    )
