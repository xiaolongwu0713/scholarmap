"""Authentication utilities."""
from __future__ import annotations

import base64
import hashlib
import re
import secrets
from datetime import datetime, timezone, timedelta

import bcrypt
from jose import JWTError, jwt
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

from app.core.config import settings
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


async def send_verification_email(email: str, code: str) -> None:
    """
    Send verification code via email using SendGrid.
    
    Behavior:
    - If SENDGRID_API_KEY is set (in .env file or environment variable), 
      must send email via SendGrid API. Raises exception if sending fails.
    - If SENDGRID_API_KEY is not set (or empty), prints code to console.
    
    Raises:
        Exception: If SENDGRID_API_KEY is set but email sending fails
    """
    # Check if SENDGRID_API_KEY is configured (from .env file or environment variable)
    sendgrid_api_key = settings.sendgrid_api_key
    if not sendgrid_api_key or not sendgrid_api_key.strip():
        # SENDGRID_API_KEY not set - print to console for development
        print(f"[DEV] Email verification code for {email}: {code}")
        print(f"[DEV] To enable email sending, set SENDGRID_API_KEY in .env file or as environment variable")
        return
    
    # SENDGRID_API_KEY is set - must send email via SendGrid
    try:
        # Create SendGrid client
        sg = SendGridAPIClient(sendgrid_api_key.strip())
        
        # Create email message
        message = Mail(
            from_email=settings.email_from,
            to_emails=email,
            subject="ScholarMap Email Verification Code",
            plain_text_content=f"""Your ScholarMap verification code is: {code}

This code will expire in 10 minutes.

If you did not request this code, please ignore this email."""
        )
        
        # Send email
        response = sg.send(message)
        
        # Check response status
        if response.status_code >= 200 and response.status_code < 300:
            print(f"[EMAIL] Verification code sent to {email} via SendGrid (status: {response.status_code})")
        else:
            error_msg = f"SendGrid API returned error status {response.status_code}: {response.body}"
            print(f"[ERROR] {error_msg}")
            raise Exception(error_msg)
            
    except Exception as e:
        # Email sending failed - raise exception since SENDGRID_API_KEY was set
        error_msg = f"Failed to send verification email to {email} via SendGrid: {e}"
        print(f"[ERROR] {error_msg}")
        raise Exception(error_msg) from e

