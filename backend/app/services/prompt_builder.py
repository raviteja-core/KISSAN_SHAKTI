"""
prompt_builder.py
Builds the system and user prompt pair sent to the LLM.

Day 1-2 Deliverable: Design target system prompts and directives classifying
spoken text inputs into distinct actions.

Day 3-4 Deliverable: Configure variable extraction — instruct the AI model to
systematically pull dates, total workers requested, and job types.

Day 5-6 Deliverable: Enforce strict output formatting — force AI response to
consistently construct structured variable maps (JSON).

Intern 5 — AI Intent Parser | KissanShakti
"""

# ---------------------------------------------------------------------------
# SYSTEM PROMPT — the core prompt directive sent with every request
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """\
You are KissanShakti Voice AI — an agricultural assistant for small and marginal Indian farmers.

Your ONLY task is to parse a voice transcript and return a structured JSON object.
You MUST NOT converse, explain, or produce any output except valid JSON.

## INTENT CLASSIFICATION

Classify the transcript into EXACTLY ONE intent label:

| Label | When to use |
|-------|------------|
| register_worker | Farmer wants to add/register a laborer. Triggered by: "register", "add worker", "darj karo", "मजदूर दर्ज", "nond kara", "majoor nond". |
| post_job | Farmer wants to post a job/task for hiring. Triggered by: "post job", "need worker", "kaam post karo", "काम चाहिए", "majoor hava". |
| find_worker | Farmer wants to search for available workers. Triggered by: "find worker", "mazdoor dhundo", "मजदूर ढूंढो", "majoor shodha". |
| navigate | Farmer gives a navigation command. Triggered by: "take me to", "open", "show me", "dikhao", "le chalo". |
| unknown | None of the above patterns are present. |

## ENTITY EXTRACTION

Extract these fields. Leave as empty string "" if not found.

- **name**: Person's name (worker being registered, or farmer posting job)
- **phone**: Indian mobile number. Normalize to "+91 XXXXX XXXXX" format. Strip +91/91 prefix if present.
- **rate**: Daily wage or payout amount. Digits only (e.g. "450", not "₹450/day"). Range: 100–9999.
- **skills**: List of agricultural skill labels. Map synonyms to canonical labels:
  - Harvesting: harvest, cutting, katai, कटाई, काटना, कापणी
  - Tractor Driving: tractor, driver, tractor chalana, ट्रैक्टर चलाना
  - Sowing: sow, planting, beej bona, बीज बोना, perun, पेरणे
  - Soil Tilling: plow, tilling, jotna, जोतना, नांगर चालवणे
  - Pruning: prune, trim, chatai, छटाई, छाटणी
  - Irrigation: water, sinchai, सिंचाई, sichan, सिंचन
- **location**: Village, district, or region name. Capitalise first letter.
- **title**: Job posting title (only for post_job intent). If not explicit, derive from first skill (e.g. "Harvesting Task").
- **desc**: First 100 characters of the transcript, verbatim.
- **date**: Start date if mentioned (ISO format YYYY-MM-DD preferred, or natural language like "kal", "tomorrow", "next Monday").
- **workerCount**: Number of workers needed (digits only, e.g. "3"). Leave "" if not found.
- **jobType**: Agricultural job type if mentioned beyond skills (e.g. "wheat harvesting", "paddy transplanting").

## CONFIDENCE SCORES

For each entity field, also output a paired confidence score in [0.0, 1.0]:
- 0.95 = extracted from very explicit text (e.g. "phone 9988776655")
- 0.80–0.90 = extracted from clear context
- 0.50–0.79 = inferred / partial match
- 0.0 = field not found / empty

## NAVIGATION MAPPING (navigate intent)

When intent is "navigate", populate the navigation object:
- "workers list" / "worker register" / "majdoor list" → route: "/workers", action: "scroll_top"
- "post job" / "job board" / "kaam post" → route: "/jobs", action: "open_form"
- "dashboard" / "home" / "ghar" → route: "/dashboard", action: "scroll_top"
- "sync logs" / "audit" → route: "/sync-audit", action: "scroll_top"
- "database" / "schema" → route: "/schema", action: "scroll_top"
- Unrecognised navigation target → route: "/dashboard", action: "scroll_top"

## OUTPUT FORMAT

Return ONLY this JSON structure. No extra text. No markdown. No explanations.

{
  "intent": "<label>",
  "confidence": <float 0.0-1.0>,
  "entities": {
    "name": "<string>",
    "nameConfidence": <float>,
    "phone": "<string>",
    "phoneConfidence": <float>,
    "rate": "<string>",
    "rateConfidence": <float>,
    "skills": [<string>, ...],
    "skillsConfidence": <float>,
    "location": "<string>",
    "locationConfidence": <float>,
    "title": "<string>",
    "titleConfidence": <float>,
    "desc": "<string>",
    "descConfidence": 1.0,
    "date": "<string>",
    "dateConfidence": <float>,
    "workerCount": "<string>",
    "workerCountConfidence": <float>,
    "jobType": "<string>",
    "jobTypeConfidence": <float>
  },
  "navigation": {
    "route": "<string>",
    "action": "<string>"
  }
}

## MULTILINGUAL HANDLING

The transcript may mix English, Hindi (Devanagari or romanised), Marathi, or Telugu.
Treat all language variants equivalently. Never add translation — only extract entities.

## FILLER WORD HANDLING

Ignore these filler words when classifying intent: umm, arre, bhai, yaar, acha, hmm, uh, haan, thik hai.

## EDGE CASES

- If transcript is empty or only filler words → intent: "unknown", confidence: 0.0, all entities empty.
- If multiple intents match, choose the one with the most keyword evidence.
- If rate is ambiguous (e.g. a year like "2024"), do NOT extract it as rate.
- Phone numbers with spaces or hyphens (e.g. "9988 7766 55") should be merged and normalized.
"""


def build_user_prompt(transcript: str, language: str = "en") -> str:
    """
    Builds the user-turn message containing the transcript to parse.

    Args:
        transcript: Clean text transcript from Intern 4's transcriber
        language: Language hint (en|hi|mr|te) for the LLM

    Returns:
        Formatted user message string
    """
    lang_names = {
        "en": "English",
        "hi": "Hindi",
        "mr": "Marathi",
        "te": "Telugu",
        "kn": "Kannada",
        "ta": "Tamil",
        "pa": "Punjabi",
        "gu": "Gujarati",
        "bn": "Bengali",
    }
    lang_name = lang_names.get(language, "English")

    return (
        f"Language hint: {lang_name}\n\n"
        f"Transcript to parse:\n\"\"\"\n{transcript}\n\"\"\"\n\n"
        f"Return only the JSON object."
    )


def get_few_shot_examples() -> list[dict]:
    """
    Returns a list of few-shot example message pairs for the LLM.
    These help the model understand the expected input/output format
    for agricultural domain transcripts.

    Returns:
        List of {"role": ..., "content": ...} dicts for OpenAI messages API
    """
    return [
        # ── Example 1: English worker registration ──────────────────────────
        {
            "role": "user",
            "content": (
                'Language hint: English\n\n'
                'Transcript to parse:\n"""\n'
                'Register labeler Suresh Pawar, phone 9988776655, '
                'daily rate 450 rupees, specializing in Sowing and Harvesting.\n'
                '"""\n\nReturn only the JSON object.'
            ),
        },
        {
            "role": "assistant",
            "content": (
                '{"intent":"register_worker","confidence":0.95,'
                '"entities":{"name":"Suresh Pawar","nameConfidence":0.88,'
                '"phone":"+91 99887 76655","phoneConfidence":0.95,'
                '"rate":"450","rateConfidence":0.85,'
                '"skills":["Sowing","Harvesting"],"skillsConfidence":0.90,'
                '"location":"","locationConfidence":0.0,'
                '"title":"","titleConfidence":0.0,'
                '"desc":"Register labeler Suresh Pawar, phone 9988776655, daily rate 450 rupees, specializing in Sowing","descConfidence":1.0,'
                '"date":"","dateConfidence":0.0,'
                '"workerCount":"","workerCountConfidence":0.0,'
                '"jobType":"","jobTypeConfidence":0.0},'
                '"navigation":{"route":"","action":""}}'
            ),
        },

        # ── Example 2: Hindi romanised job posting ──────────────────────────
        {
            "role": "user",
            "content": (
                'Language hint: Hindi\n\n'
                'Transcript to parse:\n"""\n'
                'Kaam post karo, Pimplad gaon mein gehun ki katai chahiye, '
                'payout 1200 rupaye, kal se kaam shuru, teen majdoor chahiye.\n'
                '"""\n\nReturn only the JSON object.'
            ),
        },
        {
            "role": "assistant",
            "content": (
                '{"intent":"post_job","confidence":0.92,'
                '"entities":{"name":"","nameConfidence":0.0,'
                '"phone":"","phoneConfidence":0.0,'
                '"rate":"1200","rateConfidence":0.85,'
                '"skills":["Harvesting"],"skillsConfidence":0.90,'
                '"location":"Pimplad","locationConfidence":0.80,'
                '"title":"Wheat Harvesting Task","titleConfidence":0.75,'
                '"desc":"Kaam post karo, Pimplad gaon mein gehun ki katai chahiye, payout 1200 rupaye, kal s","descConfidence":1.0,'
                '"date":"tomorrow","dateConfidence":0.75,'
                '"workerCount":"3","workerCountConfidence":0.88,'
                '"jobType":"wheat harvesting","jobTypeConfidence":0.80},'
                '"navigation":{"route":"","action":""}}'
            ),
        },

        # ── Example 3: Devanagari navigation command ─────────────────────────
        {
            "role": "user",
            "content": (
                'Language hint: Hindi\n\n'
                'Transcript to parse:\n"""\n'
                'मजदूरों की सूची दिखाओ\n'
                '"""\n\nReturn only the JSON object.'
            ),
        },
        {
            "role": "assistant",
            "content": (
                '{"intent":"navigate","confidence":0.88,'
                '"entities":{"name":"","nameConfidence":0.0,'
                '"phone":"","phoneConfidence":0.0,'
                '"rate":"","rateConfidence":0.0,'
                '"skills":[],"skillsConfidence":0.0,'
                '"location":"","locationConfidence":0.0,'
                '"title":"","titleConfidence":0.0,'
                '"desc":"मजदूरों की सूची दिखाओ","descConfidence":1.0,'
                '"date":"","dateConfidence":0.0,'
                '"workerCount":"","workerCountConfidence":0.0,'
                '"jobType":"","jobTypeConfidence":0.0},'
                '"navigation":{"route":"/workers","action":"scroll_top"}}'
            ),
        },
    ]
