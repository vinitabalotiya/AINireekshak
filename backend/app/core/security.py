"""Security utilities: password hashing, JWT tokens, access codes."""

import secrets
import string
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.core.config import settings

_ph = PasswordHasher()


def hash_password(password: str) -> str:
    """Hash a password using Argon2."""
    return _ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its Argon2 hash."""
    try:
        return _ph.verify(hashed_password, plain_password)
    except VerifyMismatchError:
        return False


def create_access_token(data: dict, role: str) -> str:
    """Create a JWT access token with an expiration time and role claim."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "role": role,
    })
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def verify_token(token: str) -> dict:
    """Verify and decode a JWT token. Raises jwt.PyJWTError on failure."""
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])


def generate_team_access_code() -> tuple[str, str]:
    """Generate a random access code and return (plain_code, hashed_code)."""
    alphabet = string.ascii_uppercase + string.digits
    plain_code = "".join(secrets.choice(alphabet) for _ in range(8))
    hashed_code = _ph.hash(plain_code)
    return plain_code, hashed_code


def verify_access_code(plain_code: str, hashed_code: str) -> bool:
    """Verify a plain access code against its Argon2 hash."""
    try:
        return _ph.verify(hashed_code, plain_code)
    except VerifyMismatchError:
        return False
