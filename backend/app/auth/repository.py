"""Repository for authentication-related database operations."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User, EmailVerificationCode


def _utc_now() -> datetime:
    """Get current UTC datetime."""
    return datetime.now(timezone.utc)


MAX_CODE_ATTEMPTS = 5  # wrong guesses before a code is burned


class UserRepository:
    """Repository for User operations."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_user_by_email(self, email: str) -> User | None:
        """Get user by email."""
        result = await self.session.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()
    
    async def get_user_by_id(self, user_id: str) -> User | None:
        """Get user by ID."""
        result = await self.session.execute(
            select(User).where(User.user_id == user_id)
        )
        return result.scalar_one_or_none()
    
    async def create_user(self, user_id: str, email: str, password_hash: str) -> User:
        """Create a new user."""
        user = User(
            user_id=user_id,
            email=email.lower().strip(),
            password_hash=password_hash,
            email_verified=False,
            created_at=_utc_now()
        )
        self.session.add(user)
        await self.session.flush()
        return user
    
    async def update_password(self, user: User, password_hash: str) -> None:
        user.password_hash = password_hash
        await self.session.flush()

    async def update_user_email_verified(self, user_id: str, verified: bool = True) -> None:
        """Update user email verification status."""
        user = await self.get_user_by_id(user_id)
        if user:
            user.email_verified = verified
            await self.session.flush()


class EmailVerificationCodeRepository:
    """Repository for EmailVerificationCode operations."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def create_code(self, email: str, code: str, expire_minutes: int = 10) -> EmailVerificationCode:
        """Create a new verification code."""
        # Delete old codes for this email
        await self.session.execute(
            delete(EmailVerificationCode).where(EmailVerificationCode.email == email)
        )
        
        now = _utc_now()
        verification_code = EmailVerificationCode(
            email=email.lower().strip(),
            code=code,
            created_at=now,
            expires_at=now + timedelta(minutes=expire_minutes),
            used=False
        )
        self.session.add(verification_code)
        await self.session.flush()
        return verification_code
    
    async def verify_code(self, email: str, code: str) -> bool:
        """Verify a code and mark it as used if valid.

        A code is burned after MAX_CODE_ATTEMPTS wrong guesses, so the 6 digits can't be
        brute-forced (codes also reset passwords).
        """
        now = _utc_now()
        result = await self.session.execute(
            select(EmailVerificationCode)
            .where(
                EmailVerificationCode.email == email.lower().strip(),
                EmailVerificationCode.used == False,
                EmailVerificationCode.expires_at > now
            )
            .order_by(EmailVerificationCode.created_at.desc())
            .limit(1)
        )
        verification_code = result.scalar_one_or_none()
        if verification_code is None:
            return False

        if verification_code.code == code:
            verification_code.used = True
            await self.session.flush()
            return True

        verification_code.attempts += 1
        if verification_code.attempts >= MAX_CODE_ATTEMPTS:
            verification_code.used = True
        await self.session.flush()
        return False
    
    async def cleanup_expired_codes(self) -> None:
        """Delete expired codes."""
        now = _utc_now()
        await self.session.execute(
            delete(EmailVerificationCode).where(EmailVerificationCode.expires_at < now)
        )
        await self.session.flush()

