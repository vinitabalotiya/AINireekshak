"""Full integration tests for AiNireekshak API workflows."""

import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app, init_db, seed_initial_data
from app.core.security import hash_password, verify_access_code


@pytest.mark.asyncio
async def test_admin_auth_and_event_lifecycle():
    await init_db()
    await seed_initial_data()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Admin login with seeded credentials
        login_res = await client.post(
            "/api/auth/admin/login",
            json={"username": "admin", "password": "admin123"},
        )
        assert login_res.status_code == 200, login_res.text
        token_data = login_res.json()
        token = token_data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get Admin Profile
        me_res = await client.get("/api/admin/me", headers=headers)
        assert me_res.status_code == 200
        assert me_res.json()["username"] == "admin"

        # 3. Create Event
        event_res = await client.post(
            "/api/events",
            json={
                "name": "Integration Test Hackathon",
                "description": "Testing full event cycle",
                "max_teams": 20,
            },
            headers=headers,
        )
        assert event_res.status_code == 201
        event = event_res.json()
        event_id = event["id"]
        assert event["name"] == "Integration Test Hackathon"

        # 4. Update Scoring Weights (must sum to 100)
        weights_res = await client.put(
            f"/api/events/{event_id}/scoring-weights",
            json={
                "pitch_technical": 50.0,
                "presentation": 20.0,
                "code_implementation": 10.0,
                "feasibility": 10.0,
                "innovation": 5.0,
                "problem_relevance": 5.0,
            },
            headers=headers,
        )
        assert weights_res.status_code == 200

        # 5. Invalid Weights Rejection (sum != 100)
        bad_weights = await client.put(
            f"/api/events/{event_id}/scoring-weights",
            json={
                "pitch_technical": 50.0,
                "presentation": 20.0,
                "code_implementation": 10.0,
                "feasibility": 5.0,
                "innovation": 5.0,
                "problem_relevance": 5.0,  # sums to 95, not 100
            },
            headers=headers,
        )
        assert bad_weights.status_code in (400, 422)

        # 6. Create Team
        team_res = await client.post(
            "/api/teams",
            json={
                "event_id": event_id,
                "name": "Team Codex",
                "project_name": "AI Vision Inspect",
                "members": [
                    {"name": "Dev One", "email": "dev1@test.com", "role": "Lead"},
                ],
            },
            headers=headers,
        )
        assert team_res.status_code == 201
        team_data = team_res.json()
        plain_access_code = team_data["access_code"]
        team_id = team_data["team"]["id"]
        assert len(plain_access_code) > 0

        # 7. Team Login using team_name and secret access_code
        team_login_res = await client.post(
            "/api/auth/team/login",
            json={"team_name": "Team Codex", "access_code": plain_access_code, "event_id": event_id},
        )
        assert team_login_res.status_code == 200
        team_token = team_login_res.json()["access_token"]
        assert team_login_res.json()["role"] == "team"

        # 8. CSV Import Teams
        csv_content = (
            "team_name,project_name,member1_name,member1_email\n"
            "Team Alpha,Smart Irrigation,Aakash,aakash@test.com\n"
            "Team Beta,Solar Optimization,Diya,diya@test.com\n"
        )
        import_res = await client.post(
            f"/api/teams/import?event_id={event_id}",
            files={"file": ("teams.csv", csv_content.encode("utf-8"), "text/csv")},
            headers=headers,
        )
        assert import_res.status_code == 201
        assert len(import_res.json()) == 2

        # 9. Schedule Session
        session_res = await client.post(
            "/api/sessions",
            json={
                "team_id": team_id,
                "event_id": event_id,
                "duration_minutes": 20,
            },
            headers=headers,
        )
        assert session_res.status_code == 201
        session_id = session_res.json()["id"]

        # 10. Admin Dashboard stats
        dash_res = await client.get("/api/admin/dashboard", headers=headers)
        assert dash_res.status_code == 200
        stats = dash_res.json()
        assert stats["total_teams"] >= 3
        assert stats["total_events"] >= 2

        # 11. Reports CSV & Excel export
        csv_export = await client.get(f"/api/reports/event/{event_id}/export/csv", headers=headers)
        assert csv_export.status_code == 200
        assert "Rank,Team Name" in csv_export.text

        excel_export = await client.get(f"/api/reports/event/{event_id}/export/excel", headers=headers)
        assert excel_export.status_code == 200
        assert len(excel_export.content) > 100
