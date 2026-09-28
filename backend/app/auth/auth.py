"""Authentication utilities."""
from __future__ import annotations

import base64
import hashlib
import re
import secrets
from datetime import datetime, timezone, timedelta

import bcrypt
from jose import JWTError, jwt
import httpx

import sys
from pathlib import Path

# Add repo root to path to import config
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
import config
settings = config.settings
from app.guardrail_config import (
    PASSWORD_MIN_LENGTH,
    PASSWORD_MAX_LENGTH,
    PASSWORD_REQUIRE_CAPITAL,
    PASSWORD_REQUIRE_DIGIT,
    PASSWORD_REQUIRE_LETTER,
    PASSWORD_REQUIRE_SPECIAL,
    PASSWORD_SPECIAL_CHARS,
)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.
    
    The password is first hashed with SHA-256, then the SHA-256 binary hash
    (32 bytes) is base64-encoded and passed to bcrypt for verification.
    """
    # First hash with SHA-256 (produces 32 bytes binary)
    sha256_binary = hashlib.sha256(plain_password.encode('utf-8')).digest()
    # Encode to base64 for safe string handling (44 characters, ~44 bytes)
    sha256_encoded = base64.b64encode(sha256_binary).decode('utf-8')
    # Then verify the encoded SHA-256 hash with bcrypt (using bytes)
    return bcrypt.checkpw(sha256_encoded.encode('utf-8'), hashed_password.encode('utf-8'))


def get_password_hash(password: str) -> str:
    """
    Hash a password using SHA-256 + bcrypt.
    
    To overcome bcrypt's 72-byte limit, we first hash the password with SHA-256
    (which produces 32 bytes binary), then base64-encode it (~44 bytes), and hash that with bcrypt.
    This allows passwords of any length while maintaining security.
    
    Args:
        password: Plain text password
        
    Returns:
        bcrypt hash of the base64-encoded SHA-256 hash of the password (as string)
    """
    # First hash with SHA-256 (produces 32 bytes binary)
    sha256_binary = hashlib.sha256(password.encode('utf-8')).digest()
    # Encode to base64 for safe string handling (44 characters, ~44 bytes)
    sha256_encoded = base64.b64encode(sha256_binary).decode('utf-8')
    # Then hash the encoded SHA-256 hash with bcrypt (~44 bytes is well under the 72-byte limit)
    # Use bcrypt directly instead of passlib to avoid issues
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(sha256_encoded.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password strength based on configuration in guardrail_config.py.
    
    Returns:
        (is_valid, error_message)
    """
    # Check minimum length
    if len(password) < PASSWORD_MIN_LENGTH:
        return False, f"Password must be at least {PASSWORD_MIN_LENGTH} characters long"
    
    # Check maximum length
    if len(password) > PASSWORD_MAX_LENGTH:
        return False, f"Password must be at most {PASSWORD_MAX_LENGTH} characters long"
    
    # Check for digit requirement
    if PASSWORD_REQUIRE_DIGIT and not re.search(r'\d', password):
        return False, "Password must contain at least one digit"
    
    # Check for letter requirement
    if PASSWORD_REQUIRE_LETTER and not re.search(r'[a-zA-Z]', password):
        return False, "Password must contain at least one letter"
    
    # Check for capital letter requirement
    if PASSWORD_REQUIRE_CAPITAL and not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    # Check for special character requirement
    if PASSWORD_REQUIRE_SPECIAL:
        # Escape special regex characters
        escaped_special = re.escape(PASSWORD_SPECIAL_CHARS)
        pattern = f'[{escaped_special}]'
        if not re.search(pattern, password):
            return False, f"Password must contain at least one special character from: {PASSWORD_SPECIAL_CHARS}"
    
    return True, ""


def generate_verification_code(length: int = 6) -> str:
    """Generate a random numeric verification code."""
    return ''.join([str(secrets.randbelow(10)) for _ in range(length)])


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return encoded_jwt


def decode_access_token(token: str) -> dict | None:
    """Decode a JWT access token."""
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        return None


async def _send_email(to: str, subject: str, text: str, reply_to: str | None = None) -> bool:
    """Send a plain-text email via Resend. Returns False (and prints it) without RESEND_API_KEY.

    Raises if the key is set but sending fails.
    """
    api_key = settings.resend_api_key.strip()
    if not api_key:
        print(f"[DEV] Email to {to}: {subject}\n{text}")
        print("[DEV] Set RESEND_API_KEY to send real emails")
        return False

    payload = {"from": settings.email_from, "to": [to], "subject": subject, "text": text}
    if reply_to:
        payload["reply_to"] = reply_to
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {api_key}"},
            json=payload,
        )
    if resp.status_code >= 300:
        raise Exception(f"Resend returned {resp.status_code}: {resp.text[:300]}")
    return True


async def send_verification_email(email: str, code: str) -> None:
    """Send a verification code. Without RESEND_API_KEY (local development) it is printed."""
    sent = await _send_email(
        email,
        "Your LabScout verification code",
        f"Your LabScout verification code is: {code}\n\n"
        "This code will expire in 10 minutes.\n\n"
        "If you did not request this code, please ignore this email.",
    )
    if sent:
        print(f"[EMAIL] Verification code sent to {email} via Resend")


WELCOME_EXAMPLE = "CRISPR base editing to correct inherited retinal disease mutations in human retinal organoids"


async def send_welcome_email(email: str) -> None:
    """First-search tips for a new user. Best effort: never fails registration."""
    site = settings.frontend_url.rstrip("/")
    text = (
        "Hi,\n\n"
        "Thanks for joining LabScout. Here's how to get a useful map on your first try:\n\n"
        f"1. Open your projects ({site}/projects) and create a project.\n"
        "2. Describe one research topic in a sentence or two (5-30 English words). Name the disease, "
        "method, or target, and the model system if it matters. For example:\n"
        f"   \"{WELCOME_EXAMPLE}\"\n"
        "3. Click \"Generate my map\". LabScout searches PubMed and maps the labs and researchers "
        "publishing on it, by country, city, and institution. It takes a few minutes.\n\n"
        "The Free plan includes 2 searches a week. Want to see a map first? "
        f"Here's one for CRISPR gene editing: {site}/research-jobs/crispr-gene-editing\n\n"
        "Questions? Just reply to this email.\n\n"
        "LabScout"
    )
    try:
        await _send_email(email, "Welcome to LabScout: map your first research area", text,
                          reply_to=settings.contact_email)
    except Exception as e:
        print(f"[EMAIL] Welcome email to {email} failed: {e}")

