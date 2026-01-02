"""Authentication utilities."""
from __future__ import annotations

import base64
import hashlib
import re
import secrets
import smtplib
from datetime import datetime, timezone, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import bcrypt
from jose import JWTError, jwt

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
    Send verification code via email.
    
    Behavior:
    - If SMTP_PASSWORD is set (in .env file or environment variable), 
      must send email via SMTP. Raises exception if sending fails.
    - If SMTP_PASSWORD is not set (or empty), prints code to console.
    
    Raises:
        Exception: If SMTP_PASSWORD is set but email sending fails
    """
    # Check if SMTP_PASSWORD is configured (from .env file or environment variable)
    smtp_password = settings.smtp_password
    if not smtp_password or not smtp_password.strip():
        # SMTP_PASSWORD not set - print to console for development
        print(f"[DEV] Email verification code for {email}: {code}")
        print(f"[DEV] To enable email sending, set SMTP_PASSWORD in .env file or as environment variable")
        return
    
    # SMTP_PASSWORD is set - must send email via SMTP
    try:
        msg = MIMEMultipart()
        msg['From'] = settings.smtp_from_email or settings.smtp_user
        msg['To'] = email
        msg['Subject'] = "ScholarMap Email Verification Code"
        
        body = f"""
        Your ScholarMap verification code is: {code}
        
        This code will expire in 10 minutes.
        
        If you did not request this code, please ignore this email.
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Create SMTP connection with timeout (30 seconds for connection, 60 seconds for operations)
        # Use SSL (port 465) or STARTTLS (port 587) based on configuration
        if settings.smtp_use_ssl:
            # Use SSL connection (port 465) - better for platforms like Render
            server = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=30)
        else:
            # Use STARTTLS connection (port 587)
            server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30)
            server.starttls()
        
        server.set_debuglevel(0)  # Set to 1 for debugging
        
        # Login with credentials
        server.login(settings.smtp_user, smtp_password)
        
        # Send email
        text = msg.as_string()
        server.sendmail(settings.smtp_from_email or settings.smtp_user, email, text)
        server.quit()
        
        print(f"[EMAIL] Verification code sent to {email}")
    except smtplib.SMTPException as e:
        # SMTP-specific errors
        error_msg = f"SMTP error sending verification email to {email}: {e}"
        print(f"[ERROR] {error_msg}")
        raise Exception(error_msg) from e
    except OSError as e:
        # Network errors (connection refused, network unreachable, etc.)
        error_msg = f"Network error sending verification email to {email}: {e}"
        print(f"[ERROR] {error_msg}")
        print(f"[ERROR] SMTP settings: host={settings.smtp_host}, port={settings.smtp_port}, use_ssl={settings.smtp_use_ssl}")
        print(f"[ERROR] This may indicate that the platform blocks outbound SMTP connections.")
        print(f"[ERROR] Solutions:")
        print(f"[ERROR]   1. Try using a different SMTP port (465 for SSL, 587 for STARTTLS)")
        print(f"[ERROR]   2. Use a third-party email service (SendGrid, Mailgun, etc.)")
        print(f"[ERROR]   3. Check platform firewall/network restrictions")
        raise Exception(error_msg) from e
    except Exception as e:
        # Other errors
        error_msg = f"Failed to send verification email to {email}: {e}"
        print(f"[ERROR] {error_msg}")
        raise Exception(error_msg) from e

