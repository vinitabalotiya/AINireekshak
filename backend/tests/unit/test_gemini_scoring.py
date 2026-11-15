"""Unit tests for the Gemini Scoring Module, Rubric, and Consistency Engine."""

import sys
from pathlib import Path

# Add project root to sys.path so scripts directory is discoverable
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import pytest
from pydantic import ValidationError

from app.services.ai.gemini_scoring import (
    CriterionScore,
    GeminiScoringEngine,
    RUBRIC_CRITERIA_KEYS,
    RUBRIC_CRITERIA_NAMES,
    ScorecardCategories,
    ScorecardEvaluation,
    evaluate_deterministically,
    load_rubric_json,
)
from scripts.consistency_check import compute_statistics, run_consistency_check
from scripts.bias_audit import run_bias_audit, generate_markdown_report, SAMPLE_PITCHES


def test_rubric_json_structure_and_anchors():
    """Verify that the fixed rubric JSON defines all 5 criteria with explicit score band anchors."""
    rubric = load_rubric_json()
    assert "criteria" in rubric
    criteria = rubric["criteria"]

    # Verify exactly the 5 target criteria are defined
    expected_names = ["Innovation", "Technical Depth", "Feasibility", "Presentation", "Impact"]
    for name in expected_names:
        assert name in criteria, f"Missing criterion: {name}"
        crit = criteria[name]
        assert "score_bands" in crit, f"Missing score_bands for {name}"
        bands = crit["score_bands"]

        # Verify explicit anchor descriptions for each score band
        assert "0-2" in bands
        assert "3-4" in bands
        assert "5-6" in bands
        assert "7-8" in bands
        assert "9-10" in bands

        for band_key, desc in bands.items():
            assert len(desc.strip()) > 15, f"Anchor description too short for {name} band {band_key}"

    # Verify scale is 0 to 10
    assert rubric["scale"]["min"] == 0.0
    assert rubric["scale"]["max"] == 10.0


def test_criterion_score_schema_validation():
    """Verify CriterionScore validates 0-10 bounds and non-empty evidence."""
    # Valid score
    cs = CriterionScore(
        score=8.5,
        justification="Strong architectural design and concurrency handling.",
        evidence="We achieved sub-200ms latency on edge hardware with 94.8% F1 score.",
    )
    assert cs.score == 8.5
    assert "sub-200ms" in cs.evidence

    # Invalid score > 10.0
    with pytest.raises(ValidationError):
        CriterionScore(
            score=11.0,
            justification="Exceeds maximum allowable score.",
            evidence="Valid evidence excerpt from slide 2.",
        )

    # Invalid score < 0.0
    with pytest.raises(ValidationError):
        CriterionScore(
            score=-1.0,
            justification="Negative score is forbidden.",
            evidence="Valid evidence excerpt from slide 2.",
        )

    # Missing / empty evidence
    with pytest.raises(ValidationError):
        CriterionScore(
            score=7.0,
            justification="Valid justification string for score.",
            evidence="   ",
        )


def test_scorecard_evaluation_schema_validation():
    """Verify ScorecardEvaluation requires all 5 criteria and computes total score."""
    categories = ScorecardCategories(
        innovation=CriterionScore(
            score=7.5,
            justification="Novel offline-first embedded vector search.",
            evidence="Humne SQLite aur fast ONNX embeddings implement kiye hain",
        ),
        technical_depth=CriterionScore(
            score=8.5,
            justification="Asynchronous FastAPI pipeline with database connection pooling.",
            evidence="Our custom inference pipeline achieves sub-200ms latency",
        ),
        feasibility=CriterionScore(
            score=8.0,
            justification="Highly practical edge hardware deployment.",
            evidence="bina internet ke models seamlessly run kar sakein",
        ),
        presentation=CriterionScore(
            score=7.0,
            justification="Clear problem and solution overview during pitch.",
            evidence="Good morning judges. We built AiNireekshak",
        ),
        impact=CriterionScore(
            score=8.0,
            justification="High impact for regional agricultural communities.",
            evidence="मौसम और फसल की बीमारियों के अलर्ट्स वॉइस मैसेज के ज़रिए किसानों तक पहुंचाता है",
        ),
    )

    evaluation = ScorecardEvaluation(
        summary="Solid technical pitch demonstrating edge AI deployment for Indian rural hackathons.",
        categories=categories,
    )

    total = evaluation.compute_total_score()
    assert total == 7.8
    assert evaluation.get_criterion_score("innovation") == 7.5
    assert evaluation.get_criterion_score("Technical Depth") == 8.5
    assert evaluation.get_criterion_score("feasibility") == 8.0
    assert evaluation.get_criterion_score("Presentation") == 7.0
    assert evaluation.get_criterion_score("impact") == 8.0

    # Test dictionary serialization
    d = evaluation.to_dict()
    assert "categories" in d
    assert "innovation" in d["categories"]
    assert "technical_depth" in d["categories"]
    assert d["categories"]["innovation"]["score"] == 7.5
    assert len(d["categories"]["innovation"]["evidence"]) > 0


def test_deterministic_scoring_evidence_and_bounds():
    """Verify evaluate_deterministically extracts evidence and scores within [0.0, 10.0]."""
    session_data = {
        "team_name": "Team AgriAI",
        "project_name": "CropGuard Offline",
        "transcripts": [
            {"speaker": "participant", "content": "We implemented an edge-based crop disease detector using ONNX.", "language": "en"},
            {"speaker": "participant", "content": "Our pipeline achieves sub-200ms latency on edge hardware with 94.8% F1 score.", "language": "en"},
            {"speaker": "participant", "content": "Data is synchronized offline using SQLite vector embeddings.", "language": "en"},
        ],
        "submissions": [
            {"filename": "CropGuard_Deck.pptx", "extracted_text": "Slide 1: Solving crop loss for 10,000 farmers."}
        ],
    }

    eval1 = evaluate_deterministically(session_data)
    eval2 = evaluate_deterministically(session_data)

    # Identical deterministic output across runs
    assert eval1.total_score == eval2.total_score
    for key in RUBRIC_CRITERIA_KEYS:
        s1 = getattr(eval1.categories, key).score
        s2 = getattr(eval2.categories, key).score
        assert s1 == s2
        assert 0.0 <= s1 <= 10.0

        ev1 = getattr(eval1.categories, key).evidence
        ev2 = getattr(eval2.categories, key).evidence
        assert ev1 == ev2
        assert len(ev1) >= 5


def test_compute_statistics_helper():
    """Verify calculation of mean, std-dev, and max delta."""
    scores = [8.0, 8.0, 8.0, 8.0, 8.0]
    stats = compute_statistics(scores)
    assert stats["mean"] == 8.0
    assert stats["std_dev"] == 0.0
    assert stats["max_delta"] == 0.0

    varying_scores = [7.0, 7.5, 8.0, 8.5, 9.0]
    stats_var = compute_statistics(varying_scores)
    assert stats_var["mean"] == 8.0
    assert stats_var["std_dev"] > 0.0
    assert stats_var["max_delta"] == 2.0


@pytest.mark.asyncio
async def test_run_consistency_check_5_runs_passes():
    """Verify that 5 runs on the same transcript achieve std-dev <= 0.5."""
    results = await run_consistency_check(runs=5, max_allowed_std_dev=0.5)
    assert results["runs"] == 5
    assert results["all_passed"] is True

    for name in ["Innovation", "Technical Depth", "Feasibility", "Presentation", "Impact"]:
        assert name in results["criteria"]
        crit_data = results["criteria"][name]
        assert len(crit_data["scores"]) == 5
        assert crit_data["std_dev"] <= 0.5
        assert crit_data["passed"] is True
        assert len(results["evidence_citations"][name]) > 0


@pytest.mark.asyncio
async def test_consistency_check_detects_high_variance():
    """Verify that run_consistency_check flags failure when std-dev > 0.5."""
    class MockHighVarianceEngine:
        def __init__(self):
            self.iteration = 0

        async def score_session(self, session_data):
            self.iteration += 1
            # Artificially inject high variance: scores cycle between 2.0 and 9.0
            score_val = 2.0 if (self.iteration % 2 == 1) else 9.0
            return ScorecardEvaluation(
                summary="Mock variance test evaluation summary.",
                categories=ScorecardCategories(
                    innovation=CriterionScore(score=score_val, justification="Justification", evidence="Evidence citation"),
                    technical_depth=CriterionScore(score=score_val, justification="Justification", evidence="Evidence citation"),
                    feasibility=CriterionScore(score=score_val, justification="Justification", evidence="Evidence citation"),
                    presentation=CriterionScore(score=score_val, justification="Justification", evidence="Evidence citation"),
                    impact=CriterionScore(score=score_val, justification="Justification", evidence="Evidence citation"),
                ),
            )

    high_var_engine = MockHighVarianceEngine()
    results = await run_consistency_check(runs=5, max_allowed_std_dev=0.5, engine=high_var_engine)

    # Should detect failure due to std-dev > 0.5
    assert results["all_passed"] is False
    for name in ["Innovation", "Technical Depth", "Feasibility", "Presentation", "Impact"]:
        crit_data = results["criteria"][name]
        assert crit_data["passed"] is False
        assert crit_data["std_dev"] > 0.5


@pytest.mark.asyncio
async def test_bias_audit_execution_and_threshold_pass():
    """Verify linguistic bias audit runs across 3 pitches in 3 variants and passes <= 1.0 delta threshold."""
    assert len(SAMPLE_PITCHES) == 3
    for p in SAMPLE_PITCHES:
        assert "clean_en" in p["versions"]
        assert "hinglish" in p["versions"]
        assert "disfluent_en" in p["versions"]

    audit_data = await run_bias_audit(pitches=SAMPLE_PITCHES, delta_threshold=1.0)
    assert audit_data["any_flagged"] is False
    assert len(audit_data["audit_records"]) == 3

    for rec in audit_data["audit_records"]:
        assert len(rec["flagged_criteria"]) == 0
        for crit, max_delta in rec["max_criterion_deltas"].items():
            assert max_delta <= 1.0, f"Criterion {crit} in {rec['title']} exceeded 1.0 delta: {max_delta}"

    md_report = generate_markdown_report(audit_data)
    assert "Linguistic Bias Audit & Robustness Report" in md_report
    assert "PASSED: ZERO CRITERIA FLAGGED" in md_report


@pytest.mark.asyncio
async def test_bias_audit_flags_when_threshold_exceeded():
    """Verify that bias audit flags criteria when delta threshold is strictly lower than observed delta."""
    # Run with an artificially strict threshold of 0.001
    audit_data = await run_bias_audit(pitches=SAMPLE_PITCHES, delta_threshold=0.001)
    # PulmoScan has a minor delta of ~0.40 between variants, which should trigger the strict 0.001 threshold
    assert audit_data["any_flagged"] is True

