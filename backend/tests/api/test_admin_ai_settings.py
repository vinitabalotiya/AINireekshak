"""Tests for Admin AI Settings and API Key Management."""

import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app, init_db, seed_initial_data


@pytest.mark.asyncio
async def test_admin_ai_keys_management():
    await init_db()
    await seed_initial_data()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Login as Admin
        login_res = await client.post(
            "/api/auth/admin/login",
            json={"username": "admin", "password": "admin123"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get AI Key Settings
        settings_res = await client.get("/api/admin/settings/ai-keys", headers=headers)
        assert settings_res.status_code == 200
        data = settings_res.json()
        assert "gemini" in data
        assert "openai" in data
        assert "active_provider" in data

        # 3. Test key validation with dummy key
        test_res = await client.post(
            "/api/admin/settings/ai-keys/test",
            json={"provider": "gemini", "api_key": "AIzaSyDummyTestKeyForTesting1234"},
            headers=headers,
        )
        assert test_res.status_code == 200
        # Should return valid=False or message from validation without crashing
        assert "valid" in test_res.json()
        assert "message" in test_res.json()

        # 4. Update Gemini API key
        update_res = await client.post(
            "/api/admin/settings/ai-keys",
            json={"gemini_api_key": "AIzaSyUpdatedKey1234567890abcdef"},
            headers=headers,
        )
        assert update_res.status_code == 200
        res_data = update_res.json()
        assert res_data["settings"]["gemini"]["configured"] is True
        assert "AIza" in res_data["settings"]["gemini"]["masked_key"]
        assert res_data["settings"]["active_provider"] == "gemini"
