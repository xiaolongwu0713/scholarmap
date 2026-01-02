"""Authentication middleware."""
from __future__ import annotations

from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.auth.auth import decode_access_token
from app.db.connection import db_manager
from app.auth.repository import UserRepository


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
        "/api/auth/register",
        "/api/auth/login",
        "/api/auth/send-verification-code",
        "/api/auth/password-requirements",
    }
    
    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip authentication for public paths
        if request.url.path in self.PUBLIC_PATHS or request.url.path.startswith("/docs") or request.url.path.startswith("/openapi"):
            return await call_next(request)
        
        # Skip OPTIONS requests
        if request.method == "OPTIONS":
            return await call_next(request)
        
        # Check for authentication token
        user_id = await get_current_user_id(request)
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Verify user exists
        user_exists = await verify_user_exists(user_id)
        if not user_exists:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Add user_id to request state
        request.state.user_id = user_id
        
        return await call_next(request)

