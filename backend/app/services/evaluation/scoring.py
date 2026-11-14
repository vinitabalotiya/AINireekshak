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


class ScoringEngine:
    """Calculates weighted scores, validates criteria weights, and manages rankings."""

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
