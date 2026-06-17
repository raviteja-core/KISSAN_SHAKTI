"""
test_intent_classifier.py
Unit and integration tests for the intent classifier and fallback parser.

Mirrors the structure of the frontend intentParser tests (vitest)
but written for pytest on the Python side.

Intern 5 — AI Intent Parser | KissanShakti
Day 9-10 Deliverable: Evaluate prompt accuracy against mock datasets
"""

import pytest
from app.services.fallback_parser import parse_offline
from app.models.intent_schema import IntentLabel


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def offline(transcript: str, lang: str = "en"):
    return parse_offline(transcript, lang)


# ---------------------------------------------------------------------------
# 1. Empty / None / filler-only inputs
# ---------------------------------------------------------------------------

class TestEmptyInputs:
    def test_empty_string_returns_unknown(self):
        r = offline("")
        assert r.intent == IntentLabel.UNKNOWN
        assert r.confidence == 0.0
        assert r.entities.name == ""
        assert r.entities.skills == []
        assert r.entities.desc == ""

    def test_none_returns_unknown(self):
        r = offline(None)
        assert r.intent == IntentLabel.UNKNOWN

    def test_filler_only_returns_unknown(self):
        r = offline("umm arre bhai yaar acha hmm uh")
        assert r.intent == IntentLabel.UNKNOWN
        assert r.confidence == 0.0

    def test_filler_plus_keyword_does_not_break_intent(self):
        r = offline("arre bhai register worker")
        assert r.intent == IntentLabel.REGISTER_WORKER


# ---------------------------------------------------------------------------
# 2. Intent classification — WORKER_PRESETS
# ---------------------------------------------------------------------------

class TestWorkerPresets:
    PRESET1 = "Register labeler Suresh Pawar, phone 9988776655, daily rate 450 rupees, specializing in Sowing and Harvesting."
    PRESET2 = "Register worker Amit Pawar, phone 9123456789, wage 500, skills include Tractor Driving and Soil Tilling."
    PRESET3 = "Suresh ko darj karo, phone number 9988776655, dihadi 450 rupaye, katai aur bot lavne ka kaam karta hai."
    PRESET4 = "Register majoor Ramesh Thorat, mobile 9765432100, ujrat 500 rupees, sichan aur perun ka kaam janta hai."

    def test_preset1_intent(self):
        assert offline(self.PRESET1).intent == IntentLabel.REGISTER_WORKER

    def test_preset1_phone(self):
        r = offline(self.PRESET1)
        assert r.entities.phone == "+91 99887 76655"
        assert r.entities.phoneConfidence >= 0.9

    def test_preset1_name_contains_suresh(self):
        r = offline(self.PRESET1)
        assert "Suresh" in r.entities.name
        assert r.entities.nameConfidence > 0

    def test_preset1_skills_contain_sowing_and_harvesting(self):
        r = offline(self.PRESET1)
        assert "Sowing" in r.entities.skills
        assert "Harvesting" in r.entities.skills
        assert r.entities.skillsConfidence > 0

    def test_preset1_rate_450(self):
        r = offline(self.PRESET1)
        assert r.entities.rate == "450"

    def test_preset2_intent(self):
        assert offline(self.PRESET2).intent == IntentLabel.REGISTER_WORKER

    def test_preset2_phone(self):
        assert offline(self.PRESET2).entities.phone == "+91 91234 56789"

    def test_preset2_name_contains_amit(self):
        assert "Amit" in offline(self.PRESET2).entities.name

    def test_preset3_hindi_intent(self):
        assert offline(self.PRESET3).intent == IntentLabel.REGISTER_WORKER

    def test_preset3_hindi_phone(self):
        assert offline(self.PRESET3).entities.phone == "+91 99887 76655"

    def test_preset3_rate_450(self):
        assert offline(self.PRESET3).entities.rate == "450"

    def test_preset4_marathi_intent(self):
        assert offline(self.PRESET4).intent == IntentLabel.REGISTER_WORKER

    def test_preset4_rate_500(self):
        assert offline(self.PRESET4).entities.rate == "500"

    def test_preset4_skills_irrigation(self):
        r = offline(self.PRESET4)
        assert "Irrigation" in r.entities.skills


# ---------------------------------------------------------------------------
# 3. Intent classification — JOB_PRESETS
# ---------------------------------------------------------------------------

class TestJobPresets:
    PRESET1 = "Post wheat crop harvesting task, location Pimplad Village, payout is 1200 rupees, requires skill in Harvesting."
    PRESET2 = "Post tractor soil tilling task, description field tilling in Sinnar Region, payout 1800, requires skill in Soil Tilling."
    PRESET3 = "Kaam post karo, Pimplad gaon mein gehun ki katai chahiye, payout 1200 rupaye, kaatai ka kaam hai."
    PRESET4 = "Kaam taka, Sinnar Region madhe tractor chalvne ahe, payment 1800, tractor driving skill pahije."

    def test_preset1_intent(self):
        assert offline(self.PRESET1).intent == IntentLabel.POST_JOB

    def test_preset1_rate(self):
        r = offline(self.PRESET1)
        assert r.entities.rate == "1200"
        assert r.entities.rateConfidence > 0

    def test_preset1_skills_harvesting(self):
        assert "Harvesting" in offline(self.PRESET1).entities.skills

    def test_preset1_location_pimplad(self):
        assert offline(self.PRESET1).entities.location == "Pimplad"

    def test_preset2_intent(self):
        assert offline(self.PRESET2).intent == IntentLabel.POST_JOB

    def test_preset2_rate_1800(self):
        assert offline(self.PRESET2).entities.rate == "1800"

    def test_preset2_skills_soil_tilling(self):
        assert "Soil Tilling" in offline(self.PRESET2).entities.skills

    def test_preset3_hindi_intent(self):
        assert offline(self.PRESET3).intent == IntentLabel.POST_JOB

    def test_preset4_marathi_intent(self):
        assert offline(self.PRESET4).intent == IntentLabel.POST_JOB

    def test_preset4_skills_tractor_driving(self):
        assert "Tractor Driving" in offline(self.PRESET4).entities.skills


# ---------------------------------------------------------------------------
# 4. Find worker intent
# ---------------------------------------------------------------------------

class TestFindWorkerIntent:
    def test_english_find_worker(self):
        assert offline("Find worker near nashik for harvesting").intent == IntentLabel.FIND_WORKER

    def test_hindi_find_worker(self):
        assert offline("mazdoor dhundo jo sichan janata ho").intent == IntentLabel.FIND_WORKER

    def test_devanagari_find_worker(self):
        assert offline("मजदूर ढूंढो").intent == IntentLabel.FIND_WORKER

    def test_marathi_find_worker(self):
        assert offline("majoor shodha pune kareeb").intent == IntentLabel.FIND_WORKER


# ---------------------------------------------------------------------------
# 5. Navigate intent & routing
# ---------------------------------------------------------------------------

class TestNavigationRouting:
    def test_workers_list_route(self):
        r = offline("take me to workers list")
        assert r.intent == IntentLabel.NAVIGATE
        assert r.navigation.route == "/workers"

    def test_jobs_form_route(self):
        r = offline("open post job form")
        assert r.intent == IntentLabel.NAVIGATE
        assert r.navigation.route == "/jobs"
        assert r.navigation.action == "open_form"

    def test_dashboard_route(self):
        r = offline("show me dashboard")
        assert r.intent == IntentLabel.NAVIGATE
        assert r.navigation.route == "/dashboard"

    def test_devanagari_show_workers(self):
        r = offline("मजदूरों की सूची दिखाओ")
        assert r.intent == IntentLabel.NAVIGATE
        assert r.navigation.route == "/workers"


# ---------------------------------------------------------------------------
# 6. Entity extraction — date, workerCount, jobType (new Day 3-4 fields)
# ---------------------------------------------------------------------------

class TestExtendedEntities:
    def test_kal_extracts_as_tomorrow(self):
        r = offline("kaam post karo kal se, 3 majdoor chahiye, payout 800 rupees")
        assert r.entities.date == "tomorrow"
        assert r.entities.dateConfidence > 0

    def test_worker_count_extraction(self):
        r = offline("Post harvesting job, need 4 workers, payout 1500 rupees")
        assert r.entities.workerCount == "4"
        assert r.entities.workerCountConfidence > 0

    def test_worker_count_hindi(self):
        r = offline("teen majdoor chahiye kal se kaam ke liye, payout 600 rupaye")
        assert r.entities.workerCount == "3"

    def test_wheat_harvesting_job_type(self):
        r = offline("Post wheat harvesting task in Nashik, payout 1200 rupees")
        assert "wheat" in r.entities.jobType


# ---------------------------------------------------------------------------
# 7. Schema completeness — all fields always present
# ---------------------------------------------------------------------------

class TestSchemaCompleteness:
    REQUIRED_FIELDS = [
        "name", "nameConfidence", "phone", "phoneConfidence",
        "rate", "rateConfidence", "skills", "skillsConfidence",
        "location", "locationConfidence", "title", "titleConfidence",
        "desc", "descConfidence", "date", "dateConfidence",
        "workerCount", "workerCountConfidence", "jobType", "jobTypeConfidence",
    ]

    def test_all_fields_present_for_empty(self):
        r = offline("")
        for f in self.REQUIRED_FIELDS:
            assert hasattr(r.entities, f), f"Missing field: {f}"

    def test_all_fields_present_for_complex_sentence(self):
        r = offline(
            "Register laborer Ramesh Thorat, phone 9876543210, "
            "rate 600 rupees, irrigation and pruning, Nashik"
        )
        for f in self.REQUIRED_FIELDS:
            assert hasattr(r.entities, f), f"Missing field: {f}"

    def test_skills_is_always_a_list(self):
        assert isinstance(offline("some random text").entities.skills, list)

    def test_confidence_fields_in_range(self):
        r = offline("Register worker Suresh, phone 9988776655, wage 400")
        for field in ["nameConfidence", "phoneConfidence", "rateConfidence",
                      "skillsConfidence", "locationConfidence", "titleConfidence",
                      "descConfidence", "dateConfidence", "workerCountConfidence",
                      "jobTypeConfidence"]:
            val = getattr(r.entities, field)
            assert 0.0 <= val <= 1.0, f"{field} out of range: {val}"

    def test_backend_used_is_rule_based(self):
        r = offline("register worker")
        assert r.backend_used == "rule_based_fallback"

    def test_raw_transcript_preserved(self):
        transcript = "Register worker Suresh Pawar"
        r = offline(transcript)
        assert r.raw_transcript == transcript


# ---------------------------------------------------------------------------
# 8. Devanagari / multilingual keyword tests
# ---------------------------------------------------------------------------

class TestDevanagariKeywords:
    def test_darj_karo_register_worker(self):
        assert offline("दर्ज करो").intent == IntentLabel.REGISTER_WORKER

    def test_kaam_post_post_job(self):
        assert offline("काम पोस्ट").intent == IntentLabel.POST_JOB

    def test_majdoor_dhundho_find_worker(self):
        assert offline("मजदूर ढूंढो").intent == IntentLabel.FIND_WORKER

    def test_marathi_nond_kara_register(self):
        assert offline("नोंद करा").intent == IntentLabel.REGISTER_WORKER
