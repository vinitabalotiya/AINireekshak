"""Automated 50-Cycle Dry Run Stress Test for AiNireekshak Platform.

Validates the complete full-stack end-to-end workflow 50 consecutive times:
- Admin Auth & Events
- Criteria Weight Validation & Rejection
- Team Creation & Credentials Verification
- Team Authentication & JWT Session Issuance
- Strict Cross-Team Isolation & Data Privacy (403 Forbidden enforcement)
- Submissions (Presentation & Python ZIP Codebase)
- Static AST Code Analysis
- Judging Session Scheduling & Access Controls
- Multilingual Speech-to-Text (Hindi, Hinglish, English)
- Real-time Transcript Correction
- AI Avatar Question Formulation
- Automated Evaluation Generation & Weighted Scoring
- Event Rankings & Shortlisting
- CSV & Excel Report Generation
"""

import asyncio
import io
import logging
import os
import sys
import time
import zipfile
from pathlib import Path

# Silence verbose DB and internal engine query logs during stress test
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("aiosqlite").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)

# Ensure backend root is on sys.path
backend_root = Path(__file__).resolve().parent.parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from httpx import ASGITransport, AsyncClient

from app.main import app, init_db, seed_initial_data
from app.services.speech.stt import SpeechRecognitionService
from app.services.ai.factory import get_ai_provider


def create_sample_zip() -> bytes:
    """Generate an in-memory ZIP containing clean Python source code."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(
            "main.py",
            (
                "import os\n"
                "import sys\n\n"
                "def solve_problem(input_data: list) -> dict:\n"
                "    \"\"\"Process input data cleanly.\"\"\"\n"
                "    return {'processed': len(input_data), 'status': 'success'}\n\n"
                "if __name__ == '__main__':\n"
                "    print(solve_problem([1, 2, 3]))\n"
            ),
        )
        zf.writestr(
            "utils.py",
            (
                "def format_response(msg: str) -> str:\n"
                "    return f'[Nireekshak] {msg.strip()}'\n"
            ),
        )
    return buffer.getvalue()


async def execute_single_dry_run(client: AsyncClient, iteration: int) -> dict:
    """Execute one full end-to-end dry-run workflow iteration."""
    start_time = time.perf_counter()
    stt_service = SpeechRecognitionService()
    ai_provider = get_ai_provider()

    # 1. Admin Login
    login_res = await client.post(
        "/api/auth/admin/login",
        json={"username": "admin", "password": "admin123"},
    )
    assert login_res.status_code == 200, f"Admin login failed: {login_res.text}"
    admin_token = login_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Event Creation
    event_res = await client.post(
        "/api/events",
        json={
            "name": f"DryRun_Event_{iteration}_{int(time.time()*1000)%100000}",
            "description": f"Automated stress test run #{iteration}",
            "max_teams": 50,
        },
        headers=admin_headers,
    )
    assert event_res.status_code == 201, f"Event create failed: {event_res.text}"
    event = event_res.json()
    event_id = event["id"]

    # 3. Invalid Weights Validation Rejection Check (sum != 100)
    bad_weights_res = await client.put(
        f"/api/events/{event_id}/scoring-weights",
        json={
            "pitch_technical": 40.0,
            "presentation": 20.0,
            "code_implementation": 10.0,
            "feasibility": 10.0,
            "innovation": 5.0,
            "problem_relevance": 5.0,  # Sums to 90
        },
        headers=admin_headers,
    )
    assert bad_weights_res.status_code in (400, 422), "Failed to reject invalid weight distribution"

    # 4. Valid Weights Update (sums to exactly 100)
    good_weights_res = await client.put(
        f"/api/events/{event_id}/scoring-weights",
        json={
            "pitch_technical": 50.0,
            "presentation": 20.0,
            "code_implementation": 10.0,
            "feasibility": 10.0,
            "innovation": 5.0,
            "problem_relevance": 5.0,  # Sums to 100
        },
        headers=admin_headers,
    )
    assert good_weights_res.status_code == 200, f"Weight update failed: {good_weights_res.text}"

    # 5. Create Team A and Team B
    team_a_res = await client.post(
        "/api/teams",
        json={
            "event_id": event_id,
            "name": f"Team_Alpha_{iteration}_{int(time.time()*1000)%10000}",
            "project_name": "Bharat Multilingual AI Assistant",
            "project_description": "Real-time speech to text with semantic recovery",
            "members": [
                {"name": "Dev One", "email": f"dev1_{iteration}@test.com", "role": "Lead"},
                {"name": "Dev Two", "email": f"dev2_{iteration}@test.com", "role": "Engineer"},
            ],
        },
        headers=admin_headers,
    )
    assert team_a_res.status_code == 201, f"Team A create failed: {team_a_res.text}"
    team_a_data = team_a_res.json()
    team_a_id = team_a_data["team"]["id"]
    team_a_name = team_a_data["team"]["name"]
    team_a_code = team_a_data["access_code"]

    team_b_res = await client.post(
        "/api/teams",
        json={
            "event_id": event_id,
            "name": f"Team_Beta_{iteration}_{int(time.time()*1000)%10000}",
            "project_name": "Solar Yield Predictor",
            "project_description": "IoT solar edge optimizer",
            "members": [
                {"name": "Eng Three", "email": f"eng3_{iteration}@test.com", "role": "Lead"},
            ],
        },
        headers=admin_headers,
    )
    assert team_b_res.status_code == 201, f"Team B create failed: {team_b_res.text}"
    team_b_data = team_b_res.json()
    team_b_id = team_b_data["team"]["id"]
    team_b_name = team_b_data["team"]["name"]
    team_b_code = team_b_data["access_code"]

    # 6. Team Authentication
    auth_a_res = await client.post(
        "/api/auth/team/login",
        json={"team_name": team_a_name, "access_code": team_a_code, "event_id": event_id},
    )
    assert auth_a_res.status_code == 200, f"Team A login failed: {auth_a_res.text}"
    team_a_token = auth_a_res.json()["access_token"]
    team_a_headers = {"Authorization": f"Bearer {team_a_token}"}

    auth_b_res = await client.post(
        "/api/auth/team/login",
        json={"team_name": team_b_name, "access_code": team_b_code, "event_id": event_id},
    )
    assert auth_b_res.status_code == 200, f"Team B login failed: {auth_b_res.text}"
    team_b_token = auth_b_res.json()["access_token"]
    team_b_headers = {"Authorization": f"Bearer {team_b_token}"}

    # 7. Strict Cross-Team Isolation Enforcement Checks
    # 7a. Team A accessing Team B's profile
    cross_team_res = await client.get(f"/api/teams/{team_b_id}", headers=team_a_headers)
    assert cross_team_res.status_code == 403, "Isolation breach: Team A accessed Team B profile"

    # 7b. Team B accessing Team A's submissions
    cross_sub_res = await client.get(f"/api/submissions/team/{team_a_id}", headers=team_b_headers)
    assert cross_sub_res.status_code == 403, "Isolation breach: Team B accessed Team A submissions"

    # 7c. Team B uploading on behalf of Team A
    cross_upload_res = await client.post(
        "/api/submissions/upload",
        data={"team_id": team_a_id, "event_id": event_id, "submission_type": "presentation"},
        files={"file": ("fake.pdf", b"dummy content", "application/pdf")},
        headers=team_b_headers,
    )
    assert cross_upload_res.status_code == 403, "Isolation breach: Team B uploaded for Team A"

    # 8. Team A Submissions Upload & Safe Code Analysis
    # 8a. Presentation upload
    ppt_bytes = b"Sample Presentation Deck: BharatAI Multilingual Architecture & Pipeline"
    ppt_res = await client.post(
        "/api/submissions/upload",
        data={"team_id": team_a_id, "event_id": event_id, "submission_type": "presentation"},
        files={"file": ("deck.txt", ppt_bytes, "text/plain")},
        headers=team_a_headers,
    )
    assert ppt_res.status_code == 201, f"Presentation upload failed: {ppt_res.text}"
    ppt_sub_id = ppt_res.json()["id"]
    ppt_analyze_res = await client.post(f"/api/submissions/{ppt_sub_id}/analyze", headers=team_a_headers)
    assert ppt_analyze_res.status_code == 200, f"PPT analysis failed: {ppt_analyze_res.text}"

    # 8b. ZIP Codebase upload
    zip_bytes = create_sample_zip()
    code_res = await client.post(
        "/api/submissions/upload",
        data={"team_id": team_a_id, "event_id": event_id, "submission_type": "code"},
        files={"file": ("source.zip", zip_bytes, "application/zip")},
        headers=team_a_headers,
    )
    assert code_res.status_code == 201, f"Code upload failed: {code_res.text}"
    code_sub_id = code_res.json()["id"]

    # 8c. Code analysis trigger
    analyze_res = await client.post(f"/api/submissions/{code_sub_id}/analyze", headers=team_a_headers)
    assert analyze_res.status_code == 200, f"Analysis failed: {analyze_res.text}"
    analysis = analyze_res.json()["analysis_result"]
    assert "metrics" in analysis, "Code metrics missing from analysis"
    assert analysis["metrics"]["functions_count"] >= 2

    # 9. Judging Session Scheduling & Access Controls
    session_res = await client.post(
        "/api/sessions",
        json={"team_id": team_a_id, "event_id": event_id, "duration_minutes": 20},
        headers=admin_headers,
    )
    assert session_res.status_code == 201, f"Session create failed: {session_res.text}"
    session_id = session_res.json()["id"]

    # Team A can access its own session
    sess_a_res = await client.get(f"/api/sessions/{session_id}", headers=team_a_headers)
    assert sess_a_res.status_code == 200

    # Team B is blocked from Team A's session
    sess_b_res = await client.get(f"/api/sessions/{session_id}", headers=team_b_headers)
    assert sess_b_res.status_code == 403

    # Activate session
    status_res = await client.put(
        f"/api/sessions/{session_id}/status",
        json={"status": "active"},
        headers=team_a_headers,
    )
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "active"

    # 10. Multilingual STT & Correction Verification
    # 10a. Hindi
    hindi_phrase = "हमारा प्रोजेक्ट बहुभाषी एआई जजिंग के लिए बनाया गया है।"
    assert stt_service.detect_language(hindi_phrase) == "hi"
    h_proc = stt_service.process_transcription(hindi_phrase, speaker="participant")
    assert h_proc["language"] == "hi"

    # 10b. Hinglish
    hinglish_phrase = "Humne real-time audio pipeline ko optimize kiya hai taaki low latency mile."
    assert stt_service.detect_language(hinglish_phrase) == "hinglish"
    hg_proc = stt_service.process_transcription(hinglish_phrase, speaker="participant")
    assert hg_proc["language"] == "hinglish"

    # 10c. English
    en_phrase = "We implemented WebSocket streaming with AST-based static code verification."
    assert stt_service.detect_language(en_phrase) == "en"

    # 10d. Transcript Correction
    correction = stt_service.apply_correction("low latensi", "low latency")
    assert correction["is_correction"] is True
    assert correction["confidence"] == 1.0

    # 11. AI Avatar Question Formulation & Evaluation Generation
    # AI questions
    questions = await ai_provider.generate_questions({"pitch": hinglish_phrase, "session_id": session_id})
    assert len(questions) > 0

    # Generate Evaluation
    eval_res = await client.post(f"/api/evaluations/generate?session_id={session_id}", headers=admin_headers)
    assert eval_res.status_code == 201, f"Evaluation generation failed: {eval_res.text}"
    eval_data = eval_res.json()
    evaluation_id = eval_data["id"]
    assert eval_data["total_score"] > 0
    assert eval_data["status"] == "completed"
    assert len(eval_data["categories"]) > 0

    # Team A can view its own evaluation
    eval_a_res = await client.get(f"/api/evaluations/team/{team_a_id}", headers=team_a_headers)
    assert eval_a_res.status_code == 200
    assert len(eval_a_res.json()) >= 1

    # Team B is blocked from Team A's evaluation
    eval_b_res = await client.get(f"/api/evaluations/team/{team_a_id}", headers=team_b_headers)
    assert eval_b_res.status_code == 403

    eval_direct_b = await client.get(f"/api/evaluations/{evaluation_id}", headers=team_b_headers)
    assert eval_direct_b.status_code == 403

    # 12. Event Rankings & Report Generation
    # Rankings
    rank_res = await client.get(f"/api/evaluations/rankings/{event_id}", headers=admin_headers)
    assert rank_res.status_code == 200
    rankings = rank_res.json()
    assert len(rankings) >= 1
    assert rankings[0]["rank"] == 1

    # Shortlist
    short_res = await client.post(
        f"/api/evaluations/rankings/{event_id}/shortlist?top_n=1",
        headers=admin_headers,
    )
    assert short_res.status_code == 200
    assert short_res.json()[0]["is_shortlisted"] is True

    # CSV Export
    csv_res = await client.get(f"/api/reports/event/{event_id}/export/csv", headers=admin_headers)
    assert csv_res.status_code == 200
    assert "Rank,Team Name" in csv_res.text

    # Excel Export
    excel_res = await client.get(f"/api/reports/event/{event_id}/export/excel", headers=admin_headers)
    assert excel_res.status_code == 200
    assert len(excel_res.content) > 100

    # Complete session
    await client.put(
        f"/api/sessions/{session_id}/status",
        json={"status": "completed"},
        headers=admin_headers,
    )

    elapsed = time.perf_counter() - start_time
    return {
        "iteration": iteration,
        "event_id": event_id,
        "team_a_id": team_a_id,
        "session_id": session_id,
        "total_score": eval_data["total_score"],
        "elapsed_sec": round(elapsed, 3),
        "status": "PASS",
    }


async def main():
    print("=" * 80)
    print("[*] STARTING AI NIREEKSHAK 50-CYCLE COMPREHENSIVE DRY RUN SUITE")
    print("=" * 80)

    # Initialize DB schema
    await init_db()
    await seed_initial_data()

    total_runs = 50
    passed_runs = 0
    failed_runs = 0
    results = []

    suite_start = time.perf_counter()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test", timeout=30.0) as client:
        for i in range(1, total_runs + 1):
            iter_start = time.perf_counter()
            try:
                res = await execute_single_dry_run(client, i)
                passed_runs += 1
                results.append(res)
                print(
                    f"[{i:02d}/{total_runs}] PASS | Event #{res['event_id']} | "
                    f"Team #{res['team_a_id']} | Session #{res['session_id']} | "
                    f"Score: {res['total_score']:.1f} | Duration: {res['elapsed_sec']:.2f}s"
                )
            except Exception as e:
                failed_runs += 1
                iter_dur = round(time.perf_counter() - iter_start, 3)
                print(f"[{i:02d}/{total_runs}] FAIL | Duration: {iter_dur}s | Error: {e}", file=sys.stderr)
                import traceback
                traceback.print_exc()
                # Stop on first unexpected error
                break

    total_time = round(time.perf_counter() - suite_start, 2)
    print("=" * 80)
    print(f"DRY RUN SUMMARY: {passed_runs}/{total_runs} PASSED (Failures: {failed_runs})")
    print(f"Total Execution Time: {total_time}s")
    if passed_runs == total_runs:
        print("[SUCCESS] ALL 50 DRY RUNS COMPLETED WITH 100% SUCCESS AND ZERO ERRORS!")
        print("=" * 80)
        sys.exit(0)
    else:
        print("[FAILED] SOME DRY RUNS FAILED!")
        print("=" * 80)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
