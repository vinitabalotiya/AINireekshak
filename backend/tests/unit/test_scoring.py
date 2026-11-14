"""Unit tests for the ScoringEngine."""

import pytest
from app.services.evaluation.scoring import ScoringEngine, DEFAULT_WEIGHTS


def test_default_weights_sum_to_100():
    engine = ScoringEngine()
    assert engine.validate_weights(DEFAULT_WEIGHTS) is True


def test_invalid_weights():
    engine = ScoringEngine()
    invalid_weights = {"pitch": 50.0, "code": 30.0}
    assert engine.validate_weights(invalid_weights) is False


def test_calculate_weighted_score():
    engine = ScoringEngine()
    category_scores = {
        "pitch_technical": 80.0,
        "presentation": 90.0,
        "code_implementation": 85.0,
        "feasibility": 75.0,
        "innovation": 70.0,
        "problem_relevance": 80.0,
    }
    score = engine.calculate_weighted_score(category_scores)
    # Expected: 80*0.6 + 90*0.15 + 85*0.08 + 75*0.07 + 70*0.05 + 80*0.05 = 48 + 13.5 + 6.8 + 5.25 + 3.5 + 4 = 81.05
    assert score == 81.05


def test_calculate_rankings_with_ties():
    engine = ScoringEngine()
    evals = [
        {"team_id": 1, "team_name": "Team A", "total_score": 85.0},
        {"team_id": 2, "team_name": "Team B", "total_score": 90.0},
        {"team_id": 3, "team_name": "Team C", "total_score": 85.0},
        {"team_id": 4, "team_name": "Team D", "total_score": 70.0},
    ]
    ranked = engine.calculate_rankings(evals)

    assert ranked[0]["team_name"] == "Team B"
    assert ranked[0]["rank"] == 1

    assert ranked[1]["rank"] == 2
    assert ranked[2]["rank"] == 2  # Tie: same score of 85.0

    assert ranked[3]["team_name"] == "Team D"
    assert ranked[3]["rank"] == 4
