"""Scoring and evaluation calculation engine."""

import logging
from typing import Any

logger = logging.getLogger(__name__)

DEFAULT_WEIGHTS: dict[str, float] = {
    "pitch_technical": 60.0,
    "presentation": 15.0,
    "code_implementation": 8.0,
    "feasibility": 7.0,
    "innovation": 5.0,
    "problem_relevance": 5.0,
}

BEHAVIOURAL_PARAMETERS: list[str] = [
    "eye_contact",
    "attention",
    "confidence",
    "posture_stability",
]


def normalize_behaviour_score(raw: float) -> int:
    """Normalize raw behavior score on 1-82 scale to standard 1-100 scale.
    Formula: score100 = round(1 + (raw - 1) * 99 / 81), clamped to 1-100.
    """
    if raw is None:
        return 50
    try:
        val = float(raw)
    except (ValueError, TypeError):
        return 50
    # Clamping raw input to [1, 82] before normalization
    clamped_raw = max(1.0, min(82.0, val))
    score100 = round(1.0 + (clamped_raw - 1.0) * 99.0 / 81.0)
    return max(1, min(100, int(score100)))


def calculate_hybrid_weights(
    content_weights: dict[str, float] | None = None,
    behaviour_param_weight: float = 3.0,
    behaviour_params: list[str] | None = None,
) -> dict[str, float]:
    """Calculate combined weights where each behavioral parameter contributes exactly
    behaviour_param_weight (default 3.0%), and content weights are scaled proportionally
    so the final sum is exactly 100.0%.
    """
    base_content = (content_weights or DEFAULT_WEIGHTS).copy()
    params = behaviour_params or BEHAVIOURAL_PARAMETERS
    total_behaviour_weight = len(params) * behaviour_param_weight
    total_content_weight = sum(base_content.values()) or 100.0
    scale_factor = max(0.0, (100.0 - total_behaviour_weight)) / total_content_weight

    combined_weights: dict[str, float] = {}
    for cat, w in base_content.items():
        combined_weights[cat] = round(w * scale_factor, 4)

    for p in params:
        combined_weights[f"behaviour_{p}"] = float(behaviour_param_weight)

    # Ensure precision adds up to exactly 100.0
    diff = round(100.0 - sum(combined_weights.values()), 4)
    if abs(diff) > 0.0001:
        first_content = next(iter(base_content.keys()))
        combined_weights[first_content] = round(combined_weights[first_content] + diff, 4)

    return combined_weights


class ScoringEngine:
    """Calculates weighted scores, validates criteria weights, and manages rankings."""

    DEFAULT_WEIGHTS = DEFAULT_WEIGHTS

    def __init__(self, default_weights: dict[str, float] | None = None) -> None:
        self.default_weights = default_weights or DEFAULT_WEIGHTS.copy()

    def validate_weights(self, weights: dict[str, float]) -> bool:
        """Validate that all category weights sum to exactly 100% (within tolerance)."""
        if not weights:
            return False
        total = sum(weights.values())
        return abs(total - 100.0) < 0.01

    def calculate_weighted_score(
        self,
        category_scores: dict[str, float],
        weights: dict[str, float] | None = None,
    ) -> float:
        """Calculate final weighted score from category scores and weights.
        Category scores are out of 100. The weights determine their relative percentage.
        Returns a float out of 100 rounded to 2 decimal places.
        """
        active_weights = weights if (weights and self.validate_weights(weights)) else self.default_weights
        weighted_sum = 0.0
        total_weight = 0.0

        for category, weight in active_weights.items():
            score = category_scores.get(category, 0.0)
            # Ensure score is clamped between 0 and 100
            clamped_score = max(0.0, min(100.0, float(score)))
            weighted_sum += clamped_score * (weight / 100.0)
            total_weight += weight

        if total_weight <= 0:
            return 0.0

        normalized_score = (weighted_sum / (total_weight / 100.0))
        return round(normalized_score, 2)

    def calculate_rankings(self, evaluations: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Rank evaluations by total_score descending with tie handling."""
        # Sort by total_score descending
        sorted_evals = sorted(evaluations, key=lambda x: x.get("total_score", 0.0), reverse=True)

        ranked: list[dict[str, Any]] = []
        current_rank = 1
        for i, item in enumerate(sorted_evals):
            if i > 0 and item.get("total_score") == sorted_evals[i - 1].get("total_score"):
                # Tie: share previous rank
                rank = ranked[i - 1]["rank"]
            else:
                rank = current_rank

            ranked_item = item.copy()
            ranked_item["rank"] = rank
            ranked.append(ranked_item)
            current_rank += 1

        return ranked

    def generate_evaluation_report(
        self,
        team_name: str,
        project_name: str,
        category_scores: dict[str, float],
        justifications: dict[str, str],
        evidence_references: dict[str, list[str]],
        weights: dict[str, float] | None = None,
    ) -> dict[str, Any]:
        """Generate a complete structured evaluation report."""
        active_weights = weights or self.default_weights
        total_score = self.calculate_weighted_score(category_scores, active_weights)

        categories_report = []
        for cat, weight in active_weights.items():
            score = category_scores.get(cat, 0.0)
            categories_report.append({
                "category_name": cat,
                "weight": weight,
                "score": score,
                "max_score": 100.0,
                "justification": justifications.get(cat, "No justification provided."),
                "evidence_references": evidence_references.get(cat, []),
            })

        return {
            "team_name": team_name,
            "project_name": project_name,
            "total_score": total_score,
            "categories": categories_report,
            "status": "completed",
        }
