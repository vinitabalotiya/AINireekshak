"""Consistency Check Script for AiNireekshak Gemini Scoring Module.

Runs the same pitch transcript 5 times through the scoring pipeline and verifies
that temperature=0.0 and schema validation produce consistent results with
standard deviation <= 0.5 per criterion.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import statistics
import sys
from pathlib import Path
from typing import Any

# Ensure backend directory is in sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

# Import scoring engine
from app.services.ai.gemini_scoring import (  # noqa: E402
    GeminiScoringEngine,
    RUBRIC_CRITERIA_KEYS,
    RUBRIC_CRITERIA_NAMES,
    ScorecardEvaluation,
)

DEFAULT_SAMPLE_TRANSCRIPT: list[dict[str, str]] = [
    {
        "speaker": "participant",
        "content": "Good morning judges. We built AiNireekshak, an offline-first multilingual evaluation platform for hackathons.",
        "language": "en",
    },
    {
        "speaker": "participant",
        "content": "Humne SQLite aur fast ONNX embeddings implement kiye hain taki low-connectivity rural hackathons me bina internet ke models seamlessly run kar sakein.",
        "language": "hinglish",
    },
    {
        "speaker": "participant",
        "content": "Our custom inference pipeline achieves sub-200ms latency on edge hardware with 94.8% F1 score across 12 crop disease categories.",
        "language": "en",
    },
    {
        "speaker": "participant",
        "content": "हमारा सिस्टम लोकल भाषा में मौसम और फसल की बीमारियों के अलर्ट्स वॉइस मैसेज के ज़रिए किसानों तक पहुंचाता है।",
        "language": "hi",
    },
    {
        "speaker": "participant",
        "content": "We implemented Argon2 cryptographic access codes and strict tenant isolation so teams cannot see each other's scorecards.",
        "language": "en",
    },
]

DEFAULT_SAMPLE_SESSION: dict[str, Any] = {
    "team_name": "Team BharatAI",
    "project_name": "AiNireekshak Offline Edge Engine",
    "project_description": "Offline multilingual AI evaluation platform for Indian hackathons",
    "transcripts": DEFAULT_SAMPLE_TRANSCRIPT,
    "submissions": [
        {
            "filename": "BharatAI_Architecture.pptx",
            "extracted_text": (
                "Slide 1: Problem - Hackathon judge fatigue and linguistic barriers in rural India.\n"
                "Slide 2: Architecture - Local ONNX runtime, SQLite vector cache, sub-200ms latency.\n"
                "Slide 3: Impact - 10,000+ farmers alerted in regional Hindi and Hinglish dialects with zero cloud egress cost."
            ),
        }
    ],
}


def compute_statistics(scores: list[float]) -> dict[str, float]:
    """Calculate mean, standard deviation, and max delta for a list of scores."""
    if not scores:
        return {"mean": 0.0, "std_dev": 0.0, "max_delta": 0.0}
    mean_val = statistics.mean(scores)
    std_dev = statistics.stdev(scores) if len(scores) > 1 else 0.0
    max_delta = max(scores) - min(scores)
    return {
        "mean": round(mean_val, 4),
        "std_dev": round(std_dev, 4),
        "max_delta": round(max_delta, 4),
    }


async def run_consistency_check(
    session_data: dict[str, Any] | None = None,
    runs: int = 5,
    max_allowed_std_dev: float = 0.5,
    engine: GeminiScoringEngine | None = None,
) -> dict[str, Any]:
    """Execute the scoring engine N times on the same input transcript and compute statistics."""
    active_session = session_data or DEFAULT_SAMPLE_SESSION
    active_engine = engine or GeminiScoringEngine()

    scores_by_criterion: dict[str, list[float]] = {
        "Innovation": [],
        "Technical Depth": [],
        "Feasibility": [],
        "Presentation": [],
        "Impact": [],
    }

    evaluations: list[ScorecardEvaluation] = []

    print(f"\n[AiNireekshak Consistency Audit] Executing {runs} runs on target pitch transcript...")
    print(f"Target Project: {active_session.get('project_name')} (Engine: {type(active_engine).__name__})")

    for i in range(1, runs + 1):
        scorecard: ScorecardEvaluation = await active_engine.score_session(active_session)
        evaluations.append(scorecard)

        # Collect scores across the 5 fixed criteria
        inno = scorecard.categories.innovation.score
        tech = scorecard.categories.technical_depth.score
        feas = scorecard.categories.feasibility.score
        pres = scorecard.categories.presentation.score
        imp = scorecard.categories.impact.score

        scores_by_criterion["Innovation"].append(inno)
        scores_by_criterion["Technical Depth"].append(tech)
        scores_by_criterion["Feasibility"].append(feas)
        scores_by_criterion["Presentation"].append(pres)
        scores_by_criterion["Impact"].append(imp)

        print(
            f"  Run {i}/{runs} -> Innovation: {inno:.1f}, Tech Depth: {tech:.1f}, "
            f"Feasibility: {feas:.1f}, Presentation: {pres:.1f}, Impact: {imp:.1f} | Total: {scorecard.total_score or 0.0:.2f}"
        )

    # Compute statistics per criterion
    results: dict[str, Any] = {
        "runs": runs,
        "max_allowed_std_dev": max_allowed_std_dev,
        "all_passed": True,
        "criteria": {},
        "evidence_citations": {},
    }

    last_eval = evaluations[-1]
    evidence_map = {
        "Innovation": last_eval.categories.innovation.evidence,
        "Technical Depth": last_eval.categories.technical_depth.evidence,
        "Feasibility": last_eval.categories.feasibility.evidence,
        "Presentation": last_eval.categories.presentation.evidence,
        "Impact": last_eval.categories.impact.evidence,
    }
    results["evidence_citations"] = evidence_map

    for name, score_list in scores_by_criterion.items():
        stats = compute_statistics(score_list)
        is_passed = stats["std_dev"] <= max_allowed_std_dev
        if not is_passed:
            results["all_passed"] = False

        results["criteria"][name] = {
            "scores": score_list,
            "mean": stats["mean"],
            "std_dev": stats["std_dev"],
            "max_delta": stats["max_delta"],
            "passed": is_passed,
        }

    return results


def print_consistency_table(results: dict[str, Any]) -> None:
    """Print formatted summary table for consistency audit."""
    runs = results["runs"]
    threshold = results["max_allowed_std_dev"]
    all_passed = results["all_passed"]

    sep = "=" * 88
    sub_sep = "-" * 88

    print("\n" + sep)
    print(f"               AiNireekshak Scoring Consistency Audit ({runs} Iterations)")
    print(f"               Standard Deviation Threshold: <= {threshold:.2f} per criterion")
    print(sep)
    print(f"{'Criterion':<18} | {'Scores (Runs 1..N)':<28} | {'Mean':<6} | {'Std-Dev':<8} | {'Max Delta':<9} | {'Status'}")
    print(sub_sep)

    for crit_name, data in results["criteria"].items():
        scores_str = "[" + ", ".join(f"{s:.1f}" for s in data["scores"]) + "]"
        status_str = "PASS" if data["passed"] else "FAIL (HIGH VARIANCE)"
        print(
            f"{crit_name:<18} | {scores_str:<28} | {data['mean']:<6.2f} | {data['std_dev']:<8.4f} | {data['max_delta']:<9.2f} | {status_str}"
        )

    print(sub_sep)
    print("\n[Mandatory Evidence Excerpts Cited in Scorecard]:")
    for crit_name, ev_text in results.get("evidence_citations", {}).items():
        print(f"  * {crit_name}: \"{ev_text}\"")

    print("\n" + sep)
    if all_passed:
        print(f"RESULT: PASSED. All criteria achieved std-dev <= {threshold:.2f} (Deterministic Scoring Verified).")
    else:
        print(f"RESULT: FAILED. One or more criteria exceeded the std-dev threshold ({threshold:.2f}).")
    print(sep + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="AiNireekshak Scoring Consistency Audit")
    parser.add_argument("--runs", type=int, default=5, help="Number of evaluation iterations (default: 5)")
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.5,
        help="Maximum allowable standard deviation per criterion (default: 0.5)",
    )
    args = parser.parse_args()

    results = asyncio.run(run_consistency_check(runs=args.runs, max_allowed_std_dev=args.threshold))
    print_consistency_table(results)

    if not results["all_passed"]:
        print("Consistency check failed: Standard deviation exceeded threshold.")
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()
