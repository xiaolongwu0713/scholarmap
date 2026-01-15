"""Authentication middleware."""
from __future__ import annotations

import re

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.auth.auth import decode_access_token
from app.db.connection import db_manager
from app.auth.repository import UserRepository
from app.db.resource_monitor_repository import UserActivityRepository
from config import settings


security = HTTPBearer()


async def get_current_user_id(request: Request) -> str | None:
    """Extract user ID from JWT token in request."""
    authorization = request.headers.get("Authorization")
    if not authorization or not authorization.startswith("Bearer "):
        return None
    
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        return None
    
    user_id = payload.get("sub")
    return user_id


async def verify_user_exists(user_id: str) -> bool:
    """Verify that user exists in database."""
    async with db_manager.session() as session:
        repo = UserRepository(session)
        user = await repo.get_user_by_id(user_id)
        return user is not None


class AuthMiddleware(BaseHTTPMiddleware):
    """Middleware to require authentication for protected routes."""
    
    # Public endpoints that don't require authentication
    PUBLIC_PATHS = {
        "/docs",
        "/openapi.json",
        "/redoc",
        "/health",
        "/api/config",
        "/api/auth/register",
        "/api/auth/login",
        "/api/auth/send-verification-code",
        "/api/auth/password-requirements",
    }
    
    # Demo run that is publicly accessible (read-only)
    DEMO_PROJECT_ID = "6af7ac1b6254"
    DEMO_RUN_ID = "53e099cdb74e"
    PUBLIC_SHARE_USER_ID = "public_share_user"
    
    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)
        
        # Skip authentication for public paths
        path = request.url.path
        if path in self.PUBLIC_PATHS or path.startswith("/docs") or path.startswith("/openapi"):
            return await call_next(request)
        
        # Check if this is a request to the demo run (read-only access)
        # Allow GET requests to demo run endpoints without authentication
        if request.method == "GET" and self.DEMO_PROJECT_ID in path and self.DEMO_RUN_ID in path:
            # Use a special demo user ID for tracking purposes
            request.state.user_id = "demo_user"
            return await call_next(request)

        # Check if public share access is enabled for run pages (read-only)
        if (
            not settings.share_run_auth_check_enabled
            and request.method == "GET"
            and re.match(r"^/api/projects/[^/]+/runs/[^/]+(?:/|$)", path)
        ):
            request.state.user_id = self.PUBLIC_SHARE_USER_ID
            return await call_next(request)
        
        # Check for authentication token
        user_id = await get_current_user_id(request)
        if not user_id:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Not authenticated"},
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Verify user exists
        user_exists = await verify_user_exists(user_id)
        if not user_exists:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Invalid authentication credentials"},
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Add user_id to request state
        request.state.user_id = user_id
        
        # Track user activity for online user monitoring
        # This is a fire-and-forget operation - we don't wait for it to complete
        # to avoid slowing down requests
        try:
            async with db_manager.session() as activity_session:
                activity_repo = UserActivityRepository(activity_session)
                await activity_repo.update_activity(user_id)
        except Exception:
            # Silently ignore errors in activity tracking
            # We don't want to fail requests due to activity tracking issues
            pass
        
        return await call_next(request)
