"""
test_accuracy_audit.py
Day 9-10 Deliverable: Accuracy audit against a diverse mock dataset.

Evaluates the rule-based fallback parser against 40 labeled test cases
spanning English, Hindi (romanised + Devanagari), and Marathi inputs.

Run with:
    pytest app/tests/test_accuracy_audit.py -v -s

Intern 5 — AI Intent Parser | KissanShakti
"""

import pytest
from app.services.fallback_parser import parse_offline
from app.models.intent_schema import IntentLabel

# ---------------------------------------------------------------------------
# Labeled test dataset — 40 diverse inputs
# ---------------------------------------------------------------------------

LABELED_DATASET = [
    # ── register_worker ─────────────────────────────────────────────────────
    ("Register laborer Suresh Pawar, phone 9988776655, rate 450 rupees.", "register_worker"),
    ("Register worker Amit Kumar, wage 500, Tractor Driving skill.", "register_worker"),
    ("Suresh ko darj karo, dihadi 450 rupaye.", "register_worker"),
    ("Ramesh Thorat ko nond kara, sichan aur perun kaam janta hai.", "register_worker"),
    ("मजदूर दर्ज करो नाम Vikram Singh.", "register_worker"),
    ("दर्ज करो.", "register_worker"),
    ("नोंद करा majoor Ganesh Patil.", "register_worker"),
    ("Add worker Raju, phone 9000011111, harvesting skill, daily wage 400.", "register_worker"),
    ("Enroll laborer Priya Devi for sowing work in Nashik.", "register_worker"),
    ("Jodna Ramesh, katai aur bot lavne ka kaam, 9876512345.", "register_worker"),

    # ── post_job ─────────────────────────────────────────────────────────────
    ("Post wheat crop harvesting task, location Pimplad, payout 1200.", "post_job"),
    ("Kaam post karo gehun ki katai ke liye, payout 1200 rupaye.", "post_job"),
    ("Need worker for soil tilling in Sinnar, payment 1800.", "post_job"),
    ("काम चाहिए, tractor chalana, Pune ke paas, 1500 rupees.", "post_job"),
    ("काम टाका sowing work Nashik madhe, 900 rupaye.", "post_job"),
    ("Hire 3 workers for irrigation task, payout 600 each, start kal.", "post_job"),
    ("kaam hava pruning karayala, Satara, 800 rupees.", "post_job"),
    ("Post job: paddy transplanting in Latur, payout 1100, 4 laborers.", "post_job"),
    ("काम पोस्ट wheat harvesting, Nashik, kal se, 2 majdoor chahiye.", "post_job"),
    ("majoor hava tractor chalvne sathi, payment 1600.", "post_job"),

    # ── find_worker ───────────────────────────────────────────────────────────
    ("Find worker near Nashik for harvesting.", "find_worker"),
    ("mazdoor dhundo jo tractor chalana janta ho.", "find_worker"),
    ("मजदूर ढूंढो जो सिंचाई जानता हो.", "find_worker"),
    ("Show workers available in Pune for sowing.", "find_worker"),
    ("majoor shodha Pimplad kareeb.", "find_worker"),
    ("मजूर पाहिजे irrigation sathi.", "find_worker"),
    ("Who can work near Satara for pruning today?", "find_worker"),
    ("Available workers for Soil Tilling in Amravati?", "find_worker"),
    ("mazdoor chahiye kal sowing ke liye Latur mein.", "find_worker"),
    ("worker chahiye Nashik ke kareeb, tractor driving.", "find_worker"),

    # ── navigate ─────────────────────────────────────────────────────────────
    ("Take me to workers list.", "navigate"),
    ("Open post job form.", "navigate"),
    ("Show me the dashboard.", "navigate"),
    ("दिखाओ sync audit logs.", "navigate"),
    ("le chalo workers registry page par.", "navigate"),
    ("go to jobs board.", "navigate"),
    ("Dikhao schema specifications.", "navigate"),
    ("open workers register", "navigate"),

    # ── unknown ───────────────────────────────────────────────────────────────
    ("umm arre bhai hmm", "unknown"),
    ("1234 !@#$ 5678", "unknown"),
]

# ---------------------------------------------------------------------------
# Accuracy test
# ---------------------------------------------------------------------------

class TestAccuracyAudit:
    """
    Runs the full labeled dataset through the rule-based fallback parser
    and reports per-class accuracy.

    Pass threshold: 80% overall accuracy.
    """

    def test_full_dataset_accuracy_above_80_percent(self):
        correct = 0
        total = len(LABELED_DATASET)
        failures = []

        for transcript, expected_label in LABELED_DATASET:
            result = parse_offline(transcript)
            predicted = result.intent.value if hasattr(result.intent, "value") else str(result.intent)
            if predicted == expected_label:
                correct += 1
            else:
                failures.append({
                    "transcript": transcript[:60],
                    "expected": expected_label,
                    "predicted": predicted,
                    "confidence": round(result.confidence, 2),
                })

        accuracy = correct / total * 100
        print(f"\n{'='*60}")
        print(f"  ACCURACY AUDIT RESULTS")
        print(f"{'='*60}")
        print(f"  Total cases : {total}")
        print(f"  Correct     : {correct}")
        print(f"  Accuracy    : {accuracy:.1f}%")
        print(f"  Pass threshold: 80.0%")

        if failures:
            print(f"\n  FAILURES ({len(failures)}):")
            for f in failures:
                print(f"    [{f['expected']} → {f['predicted']}] conf={f['confidence']}: \"{f['transcript']}\"")
        print(f"{'='*60}")

        assert accuracy >= 80.0, (
            f"Accuracy {accuracy:.1f}% is below 80% threshold. "
            f"See {len(failures)} failures above."
        )

    def test_per_class_register_worker_above_80_percent(self):
        cases = [(t, l) for t, l in LABELED_DATASET if l == "register_worker"]
        self._assert_class_accuracy("register_worker", cases, 0.80)

    def test_per_class_post_job_above_80_percent(self):
        cases = [(t, l) for t, l in LABELED_DATASET if l == "post_job"]
        self._assert_class_accuracy("post_job", cases, 0.80)

    def test_per_class_find_worker_above_80_percent(self):
        cases = [(t, l) for t, l in LABELED_DATASET if l == "find_worker"]
        self._assert_class_accuracy("find_worker", cases, 0.80)

    def test_per_class_navigate_above_70_percent(self):
        cases = [(t, l) for t, l in LABELED_DATASET if l == "navigate"]
        self._assert_class_accuracy("navigate", cases, 0.70)

    def test_per_class_unknown_is_100_percent(self):
        cases = [(t, l) for t, l in LABELED_DATASET if l == "unknown"]
        self._assert_class_accuracy("unknown", cases, 1.0)

    @staticmethod
    def _assert_class_accuracy(label: str, cases: list, threshold: float):
        if not cases:
            pytest.skip(f"No test cases for label: {label}")
        correct = sum(
            1 for t, _ in cases
            if (lambda r: r.intent.value if hasattr(r.intent, "value") else str(r.intent))(parse_offline(t)) == label
        )
        acc = correct / len(cases)
        assert acc >= threshold, (
            f"Class '{label}': accuracy {acc*100:.1f}% below {threshold*100:.0f}% threshold. "
            f"{correct}/{len(cases)} correct."
        )


# ---------------------------------------------------------------------------
# Confidence score tests
# ---------------------------------------------------------------------------

class TestConfidenceProperties:
    def test_known_keyword_has_nonzero_confidence(self):
        for transcript, label in LABELED_DATASET:
            if label == "unknown":
                continue
            r = parse_offline(transcript)
            if r.intent.value == label:
                assert r.confidence > 0.0, f"Zero confidence for '{transcript[:40]}'"

    def test_unknown_has_zero_confidence(self):
        r = parse_offline("umm hmm arre")
        assert r.confidence == 0.0

    def test_all_entity_confidence_in_range(self):
        conf_fields = [
            "nameConfidence", "phoneConfidence", "rateConfidence",
            "skillsConfidence", "locationConfidence", "titleConfidence",
            "descConfidence", "dateConfidence", "workerCountConfidence",
            "jobTypeConfidence",
        ]
        for transcript, _ in LABELED_DATASET[:10]:  # sample to keep test fast
            r = parse_offline(transcript)
            for field in conf_fields:
                val = getattr(r.entities, field)
                assert 0.0 <= val <= 1.0, f"Field {field}={val} out of range for: {transcript[:40]}"
