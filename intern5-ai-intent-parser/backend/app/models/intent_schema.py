"""
intent_schema.py
Pydantic models for the structured ParseResult output.

Every API response and internal result object uses these models.
This ensures the frontend always receives a predictable JSON shape,
regardless of which backend (LLM or fallback) produced the result.

Intern 5 — AI Intent Parser | KissanShakti
Day 3-4 Deliverable: Enforce strict output JSON schema
"""

from __future__ import annotations

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Intent label enum
# ---------------------------------------------------------------------------

class IntentLabel(str, Enum):
    """Canonical intent labels understood by the frontend."""
    REGISTER_WORKER = "register_worker"
    POST_JOB        = "post_job"
    FIND_WORKER     = "find_worker"
    NAVIGATE        = "navigate"       # voice-navigation command
    UNKNOWN         = "unknown"


# ---------------------------------------------------------------------------
# Navigation payload (Day 7-8: voice routing)
# ---------------------------------------------------------------------------

class NavigationPayload(BaseModel):
    """
    Populated when intent == 'navigate'.
    Tells the frontend which route to activate and what action to take.
    """
    route: str = Field(
        default="",
        description="React Router path to navigate to, e.g. '/workers'",
        examples=["/workers", "/jobs", "/dashboard", "/sync-audit"],
    )
    action: str = Field(
        default="",
        description="UI action to perform after navigation",
        examples=["open_form", "scroll_top", "refresh_list"],
    )

    @field_validator("route")
    @classmethod
    def validate_route(cls, v: str) -> str:
        """Ensure route is a known frontend path or empty string."""
        KNOWN_ROUTES = {"/", "/dashboard", "/workers", "/jobs", "/sync-audit", "/schema", ""}
        if v and v not in KNOWN_ROUTES:
            # Accept unknown routes without error — frontend handles gracefully
            return v
        return v


# ---------------------------------------------------------------------------
# Entity sub-model
# ---------------------------------------------------------------------------

class ParsedEntities(BaseModel):
    """
    Structured entities extracted from the transcript.
    Every field has a paired *Confidence score in [0.0, 1.0].
    Fields default to empty-string / empty-list / 0.0 so the frontend
    never has to handle None.
    """

    # --- Worker / Job fields ---
    name: str            = Field(default="", description="Person name (worker or farmer)")
    nameConfidence: float = Field(default=0.0, ge=0.0, le=1.0)

    phone: str           = Field(default="", description="Phone in '+91 XXXXX XXXXX' format")
    phoneConfidence: float = Field(default=0.0, ge=0.0, le=1.0)

    rate: str            = Field(default="", description="Daily wage or payout amount (digits only)")
    rateConfidence: float = Field(default=0.0, ge=0.0, le=1.0)

    skills: List[str]    = Field(default_factory=list, description="Canonical skill labels")
    skillsConfidence: float = Field(default=0.0, ge=0.0, le=1.0)

    location: str        = Field(default="", description="Village, district, or region name")
    locationConfidence: float = Field(default=0.0, ge=0.0, le=1.0)

    title: str           = Field(default="", description="Job posting title (post_job intent only)")
    titleConfidence: float = Field(default=0.0, ge=0.0, le=1.0)

    desc: str            = Field(default="", description="First 100 chars of the transcript")
    descConfidence: float = Field(default=1.0, ge=0.0, le=1.0)

    # --- Date / quantity fields (Day 3-4 additions) ---
    date: str            = Field(default="", description="Start date mentioned (ISO or natural language)")
    dateConfidence: float = Field(default=0.0, ge=0.0, le=1.0)

    workerCount: str     = Field(default="", description="Number of workers requested")
    workerCountConfidence: float = Field(default=0.0, ge=0.0, le=1.0)

    jobType: str         = Field(default="", description="Type of agricultural job")
    jobTypeConfidence: float = Field(default=0.0, ge=0.0, le=1.0)


# ---------------------------------------------------------------------------
# Top-level ParseResult
# ---------------------------------------------------------------------------

class ParseResult(BaseModel):
    """
    Complete structured result returned by the intent parser.
    This is the exact shape the frontend's applyVoiceEntities() expects.
    """

    intent: IntentLabel = Field(
        default=IntentLabel.UNKNOWN,
        description="Classified intent label",
    )
    confidence: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Intent classification confidence score",
    )
    entities: ParsedEntities = Field(
        default_factory=ParsedEntities,
        description="Extracted entities from the transcript",
    )
    navigation: NavigationPayload = Field(
        default_factory=NavigationPayload,
        description="Navigation instruction (populated when intent == 'navigate')",
    )
    backend_used: str = Field(
        default="rule_based_fallback",
        description="Which backend produced this result: llm_openai | rule_based_fallback",
    )
    raw_transcript: str = Field(
        default="",
        description="Original transcript passed to the parser",
    )

    model_config = {"use_enum_values": True}


# ---------------------------------------------------------------------------
# Request model
# ---------------------------------------------------------------------------

class ParseRequest(BaseModel):
    """Request body for POST /intent/parse."""
    transcript: str = Field(
        ...,
        min_length=1,
        description="Clean text transcript from the voice transcriber",
        examples=["Register laborer Suresh Pawar, phone 9988776655, wage 450 rupees, Harvesting skill."],
    )
    language: Optional[str] = Field(
        default="en",
        description="Language hint: en | hi | mr | te | kn | ta | pa | gu | bn",
    )
    session_id: Optional[str] = Field(
        default=None,
        description="Session ID for logging / tracing",
    )
