"""Tests for single PPT submission policy and team evaluation access."""

import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app, init_db, seed_initial_data


@pytest.mark.asyncio
async def test_single_ppt_submission_and_evaluation_access():
    await init_db()
    await seed_initial_data()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Admin login
        admin_login = await client.post(
            "/api/auth/admin/login",
            json={"username": "admin", "password": "admin123"},
        )
        assert admin_login.status_code == 200
        admin_token = admin_login.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # 2. Create Event & Team
        event_res = await client.post(
            "/api/events",
            json={"name": "Submission Policy Testathon", "max_teams": 5},
            headers=admin_headers,
        )
        assert event_res.status_code == 201
        event_id = event_res.json()["id"]

        team_res = await client.post(
            "/api/teams",
            json={
                "event_id": event_id,
                "name": "Single Pitch Team",
                "project_name": "AI Presentation Checker",
                "members": [{"name": "Lead", "email": "lead@test.com"}],
            },
            headers=admin_headers,
        )
        assert team_res.status_code == 201
        team_data = team_res.json()
        access_code = team_data["access_code"]
        team_id = team_data["team"]["id"]

        # 3. Schedule session for this team
        sess_res = await client.post(
            "/api/sessions",
            json={"team_id": team_id, "event_id": event_id, "duration_minutes": 3},
            headers=admin_headers,
        )
        assert sess_res.status_code == 201
        session_id = sess_res.json()["id"]

        # 4. Team Login
        team_login = await client.post(
            "/api/auth/team/login",
            json={"team_name": "Single Pitch Team", "access_code": access_code, "event_id": event_id},
        )
        assert team_login.status_code == 200
        team_token = team_login.json()["access_token"]
        team_headers = {"Authorization": f"Bearer {team_token}"}

        # 5. Team attempts non-PPT submission (e.g., code) -> must be rejected (400)
        bad_sub = await client.post(
            "/api/submissions/upload",
            data={"team_id": team_id, "event_id": event_id, "submission_type": "code"},
            files={"file": ("project.zip", b"fake zip content", "application/zip")},
            headers=team_headers,
        )
        assert bad_sub.status_code == 400
        assert "Only PPT presentation submissions are allowed" in bad_sub.json()["detail"]

        # 6. Team uploads valid first PPT presentation -> must succeed (201)
        first_ppt = await client.post(
            "/api/submissions/upload",
            data={"team_id": team_id, "event_id": event_id, "submission_type": "presentation"},
            files={"file": ("pitch_deck.pptx", b"PK\x03\x04fake pptx binary", "application/vnd.openxmlformats-officedocument.presentationml.presentation")},
            headers=team_headers,
        )
        assert first_ppt.status_code == 201
        sub_info = first_ppt.json()
        assert sub_info["submission_type"] == "presentation"

        # 7. Team attempts a 2nd presentation submission -> must be rejected (400)
        second_ppt = await client.post(
            "/api/submissions/upload",
            data={"team_id": team_id, "event_id": event_id, "submission_type": "presentation"},
            files={"file": ("another_pitch.pdf", b"%PDF-1.4 fake pdf", "application/pdf")},
            headers=team_headers,
        )
        assert second_ppt.status_code == 400
        assert "Submission limit reached" in second_ppt.json()["detail"]

        # 8. Team ends session and generates evaluation -> must NOT return 401 Unauthorized
        eval_res = await client.post(
            "/api/evaluations/generate",
            params={"session_id": session_id},
            headers=team_headers,
        )
        # 201 Created (or 200 OK)
        assert eval_res.status_code in (200, 201)
        assert eval_res.json()["session_id"] == session_id

        # 9. Team deletes previous presentation to re-upload an updated deck
        sub_id = sub_info["id"]
        del_res = await client.delete(
            f"/api/submissions/{sub_id}",
            headers=team_headers,
        )
        assert del_res.status_code == 200
        assert del_res.json()["success"] is True

        # 10. Team uploads updated presentation -> must succeed (201) now that previous deck is removed
        updated_ppt = await client.post(
            "/api/submissions/upload",
            data={"team_id": team_id, "event_id": event_id, "submission_type": "presentation"},
            files={"file": ("updated_pitch.pptx", b"PK\x03\x04updated pptx binary", "application/vnd.openxmlformats-officedocument.presentationml.presentation")},
            headers=team_headers,
        )
        assert updated_ppt.status_code == 201
        assert updated_ppt.json()["original_filename"] == "updated_pitch.pptx"
