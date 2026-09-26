import hashlib
import hmac
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from app.config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_MINUTES

# In-memory OTP store: email -> {"otp": str, "expires_at": float}
_otp_store: dict[str, dict] = {}


def hash_password(password: str) -> tuple[str, str]:
    """Hashes a password using PBKDF2 with SHA-256 and a random salt."""
    salt = secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100000
    ).hex()
    return password_hash, salt


def verify_password(password: str, salt: str, password_hash: str) -> bool:
    """Verifies a password against the stored salt and hash using timing-safe comparison."""
    computed_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100000
    ).hex()
    return hmac.compare_digest(computed_hash, password_hash)


def create_access_token(user_id: int, email: str, role: str) -> str:
    """Generates a signed JWT bearer token."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "exp": expire,
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token


def decode_access_token(token: str) -> Optional[dict]:
    """Decodes and validates a JWT bearer token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except (jwt.PyJWTError, Exception):
        return None


def generate_otp(email: str) -> str:
    """Generates a 6-digit numeric OTP with 10-minute expiry."""
    clean_email = email.strip().lower()
    otp = f"{secrets.randbelow(900000) + 100000}"
    expires_at = time.time() + 600  # 10 minutes
    _otp_store[clean_email] = {
        "otp": otp,
        "expires_at": expires_at,
    }
    print(f"\n========================================", flush=True)
    print(f"[AUTH DEV] OTP for {clean_email}: {otp}", flush=True)
    print(f"========================================\n", flush=True)
    return otp


def verify_and_consume_otp(email: str, otp: str) -> bool:
    """Validates and consumes an OTP token."""
    clean_email = email.strip().lower()
    record = _otp_store.get(clean_email)
    if not record:
        return False
    if time.time() > record["expires_at"]:
        _otp_store.pop(clean_email, None)
        return False
    if record["otp"] != otp.strip():
        return False
    # Valid - consume OTP so it cannot be re-used
    _otp_store.pop(clean_email, None)
    return True
