"""Security utilities: password hashing and JWT encoding/decoding.

Supports python-jose, PyJWT, and bcrypt with standard-library fallback.
"""

from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from src.auth.schemas import TokenPayload
from src.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# JWT Support (jose or PyJWT)
# ---------------------------------------------------------------------------
try:
    from jose import JWTError, jwt as _jwt

    def _encode_jwt(claims: dict, key: str, algorithm: str) -> str:
        return _jwt.encode(claims, key, algorithm=algorithm)

    def _decode_jwt(token: str, key: str, algorithm: str, audience: str, issuer: str) -> dict:
        return _jwt.decode(token, key, algorithms=[algorithm], audience=audience, issuer=issuer)

except ImportError:
    import jwt as _pyjwt
    from jwt import PyJWTError as JWTError  # type: ignore

    def _encode_jwt(claims: dict, key: str, algorithm: str) -> str:
        return _pyjwt.encode(claims, key, algorithm=algorithm)

    def _decode_jwt(token: str, key: str, algorithm: str, audience: str, issuer: str) -> dict:
        return _pyjwt.decode(token, key, algorithms=[algorithm], audience=audience, issuer=issuer)


# ---------------------------------------------------------------------------
# Password Hashing (bcrypt or pbkdf2)
# ---------------------------------------------------------------------------
try:
    import bcrypt

    def hash_password(password: str) -> str:
        """Hash a plaintext password with bcrypt."""
        salt = bcrypt.gensalt(rounds=12)
        return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a plaintext password against a stored bcrypt hash."""
        try:
            if hashed_password.startswith("$2"):
                return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
        except Exception as e:
            logger.warning("Bcrypt verification failed: %s", e)
        return _verify_pbkdf2(plain_password, hashed_password)

except ImportError:
    logger.info("bcrypt package not available; using standard library pbkdf2.")

    def hash_password(password: str) -> str:
        """Hash a plaintext password using standard library pbkdf2_hmac."""
        salt = os.urandom(16).hex()
        dk = _hash_pbkdf2(password, salt)
        return f"pbkdf2:{salt}:{dk}"

    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a plaintext password against pbkdf2 hash."""
        return _verify_pbkdf2(plain_password, hashed_password)


def _hash_pbkdf2(password: str, salt: str) -> str:
    import hashlib
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000
    ).hex()


def _verify_pbkdf2(plain_password: str, hashed_password: str) -> bool:
    import hmac
    if not hashed_password.startswith("pbkdf2:"):
        return False
    parts = hashed_password.split(":", 2)
    if len(parts) != 3:
        return False
    _, salt, expected_hash = parts
    computed = _hash_pbkdf2(plain_password, salt)
    return hmac.compare_digest(computed, expected_hash)


# ---------------------------------------------------------------------------
# Token Creation & Decoding
# ---------------------------------------------------------------------------


def create_access_token(
    data: Dict[str, Any],
    expires_delta: timedelta | None = None,
    audience: str | None = None,
) -> str:
    """Create a signed HS256 JWT access token."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)

    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.jwt_expiry_minutes)

    to_encode.update({
        "exp": int(expire.timestamp()),
        "iat": int(now.timestamp()),
        "iss": settings.jwt_issuer,
        "aud": audience or settings.jwt_audience,
        "jti": str(uuid.uuid4()),
    })

    return _encode_jwt(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(
    data: Dict[str, Any],
    expires_delta: timedelta | None = None,
) -> str:
    """Create a signed HS256 JWT refresh token."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)

    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=settings.jwt_refresh_expiry_days)

    to_encode.update({
        "exp": int(expire.timestamp()),
        "iat": int(now.timestamp()),
        "iss": settings.jwt_issuer,
        "aud": "eka-refresh",
        "jti": str(uuid.uuid4()),
    })

    return _encode_jwt(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str, audience: str | None = None) -> TokenPayload:
    """Decode and validate a JWT token, returning TokenPayload."""
    expected_audience = audience or settings.jwt_audience
    payload_dict = _decode_jwt(
        token,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
        audience=expected_audience,
        issuer=settings.jwt_issuer,
    )
    return TokenPayload(**payload_dict)
