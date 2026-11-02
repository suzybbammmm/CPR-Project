import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

SCRYPT_N = 2 ** 14
SCRYPT_R = 8
SCRYPT_P = 1
SCRYPT_DKLEN = 32
_SESSION_TTL_HOURS = int(os.environ.get("LIFEPULSE_SESSION_TTL_HOURS", "8"))


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.scrypt(
        password.encode(),
        salt=salt,
        n=SCRYPT_N,
        r=SCRYPT_R,
        p=SCRYPT_P,
        dklen=SCRYPT_DKLEN,
    )
    return f"scrypt${salt.hex()}${dk.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        _, salt_hex, dk_hex = stored_hash.split('$')
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(dk_hex)
        actual = hashlib.scrypt(
            password.encode(),
            salt=salt,
            n=SCRYPT_N,
            r=SCRYPT_R,
            p=SCRYPT_P,
            dklen=SCRYPT_DKLEN,
        )
        return secrets.compare_digest(actual, expected)
    except Exception:
        return False


def new_session_id() -> str:
    return secrets.token_urlsafe(32)


def session_expires_at() -> str:
    return (datetime.now(timezone.utc) + timedelta(hours=_SESSION_TTL_HOURS)).isoformat()


def is_session_expired(expires_at_iso: str) -> bool:
    try:
        expires_at = datetime.fromisoformat(expires_at_iso)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) > expires_at
    except Exception:
        return True
