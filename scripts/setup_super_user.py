#!/usr/bin/env python3
"""
Script to setup or update super user password.

This script ensures the super user account exists with the correct password
as configured in config.py.

Usage:
    python scripts/setup_super_user.py
"""

import sys
import uuid
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(backend_dir.parent))

import config
settings = config.settings

from app.db.connection import db_manager
from app.auth.repository import UserRepository
from app.auth.auth import get_password_hash
import asyncio


async def setup_super_user():
    """Setup or update super user account."""
    print("Setting up super user account...")
    print("=" * 70)
    print(f"Email: {settings.super_user_email}")
    print(f"Password: {'*' * len(settings.super_user_password)}")
    print()
    
    try:
        db_manager.initialize(settings.database_url)
        
        async with db_manager.session() as session:
            user_repo = UserRepository(session)
            
            # Check if user exists
            user = await user_repo.get_user_by_email(settings.super_user_email)
            
            if user:
                print(f"✅ User already exists (User ID: {user.user_id})")
                print("   Updating password...")
                
                # Update password
                new_password_hash = get_password_hash(settings.super_user_password)
                user.password_hash = new_password_hash
                await session.commit()
                
                print("✅ Password updated successfully")
            else:
                print("   User does not exist, creating...")
                
                # Create user
                user_id = uuid.uuid4().hex[:16]
                password_hash = get_password_hash(settings.super_user_password)
                user = await user_repo.create_user(
                    user_id=user_id,
                    email=settings.super_user_email,
                    password_hash=password_hash
                )
                await session.commit()
                
                print(f"✅ User created successfully (User ID: {user.user_id})")
            
            print()
            print("=" * 70)
            print("✅ Super user setup complete!")
            print()
            print("You can now login with:")
            print(f"  Email: {settings.super_user_email}")
            print(f"  Password: {settings.super_user_password}")
            
        await db_manager.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(setup_super_user())

