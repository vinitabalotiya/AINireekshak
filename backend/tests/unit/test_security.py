"""Unit tests for password and access code security."""

from app.core.security import (
    create_access_token,
    generate_team_access_code,
    hash_password,
    verify_access_code,
    verify_password,
    verify_token,
)


def test_password_hashing():
    pw = "secretpassword123"
    hashed = hash_password(pw)
    assert hashed != pw
    assert verify_password(pw, hashed) is True
    assert verify_password("wrongpassword", hashed) is False


def test_token_creation_and_verification():
    data = {"sub": "42"}
    token = create_access_token(data=data, role="admin")
    assert isinstance(token, str)

    payload = verify_token(token)
    assert payload["sub"] == "42"
    assert payload["role"] == "admin"


def test_team_access_code_generation():
    plain, hashed = generate_team_access_code()
    assert len(plain) >= 8
    assert verify_access_code(plain, hashed) is True
    assert verify_access_code("INVALID-CODE", hashed) is False
