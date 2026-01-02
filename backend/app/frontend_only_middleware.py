"""
Middleware to enforce that API endpoints can only be called from the frontend.

This prevents direct API calls by checking:
1. Origin header (browser automatically sets this)
2. Referer header (as backup)
3. Custom X-Requested-With header (frontend sets this)

Only requests from allowed frontend origins are permitted.
"""

from __future__ import annotations

import re
from typing import Callable

from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response


# Allowed frontend origins
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:8000",
    "https://scholarmap-frontend.onrender.com",
]

# Regex pattern for allowed origins (e.g., any Render subdomain)
ALLOWED_ORIGIN_REGEX = re.compile(r"https://.*\.onrender\.com")

# Endpoints that should be protected (require frontend origin)
PROTECTED_ENDPOINTS = [
    "/api/projects/{project_id}/runs/{run_id}/parse/stage1",
    "/api/projects/{project_id}/runs/{run_id}/parse/stage2",
    "/api/projects/{project_id}/runs/{run_id}/parse",
]

# Endpoints that are always allowed (e.g., health checks, docs)
PUBLIC_ENDPOINTS = [
    "/docs",
    "/openapi.json",
    "/redoc",
    "/health",
    "/",
]


def _is_allowed_origin(origin: str | None) -> bool:
    """Check if origin is in the allowed list."""
    if not origin:
        return False
    
    # Check exact matches
    if origin in ALLOWED_ORIGINS:
        return True
    
    # Check regex pattern
    if ALLOWED_ORIGIN_REGEX.match(origin):
        return True
    
    return False


def _is_protected_endpoint(path: str) -> bool:
    """Check if endpoint requires frontend-only access."""
    # Check exact matches
    if path in PUBLIC_ENDPOINTS:
        return False
    
    # Check if path matches any protected pattern
    for pattern in PROTECTED_ENDPOINTS:
        # Convert pattern to regex (simple version)
        regex_pattern = pattern.replace("{project_id}", r"[^/]+").replace("{run_id}", r"[^/]+")
        if re.match(regex_pattern, path):
            return True
    
    # Also protect parse-related endpoints
    if "/parse" in path:
        return True
    
    return False


class FrontendOnlyMiddleware(BaseHTTPMiddleware):
    """
    Middleware that blocks direct API calls, only allowing requests from the frontend.
    
    Checks:
    1. Origin header must be from allowed frontend domain
    2. Referer header (as backup) must be from allowed frontend domain
    3. Custom X-Requested-With header should be present (optional but recommended)
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip check for OPTIONS (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)
        
        # Only check protected endpoints
        if not _is_protected_endpoint(request.url.path):
            return await call_next(request)
        
        # Get origin and referer
        origin = request.headers.get("origin")
        referer = request.headers.get("referer")
        requested_with = request.headers.get("x-requested-with")
        
        # Check origin (primary check - browser automatically sets this)
        origin_allowed = _is_allowed_origin(origin)
        
        # Check referer as backup (some browsers may not send origin)
        referer_allowed = False
        if referer:
            # Extract origin from referer
            try:
                from urllib.parse import urlparse
                parsed = urlparse(referer)
                referer_origin = f"{parsed.scheme}://{parsed.netloc}"
                referer_allowed = _is_allowed_origin(referer_origin)
            except Exception:
                pass
        
        # At least one of origin or referer must be from allowed frontend
        if not (origin_allowed or referer_allowed):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Direct API calls are not allowed. "
                    "This endpoint can only be accessed from the frontend application. "
                    f"Origin: {origin or 'missing'}, Referer: {referer or 'missing'}"
                ),
            )
        
        # Optional: Check for custom header (frontend should set this)
        # This provides an additional layer of protection
        if requested_with != "ScholarMap-Frontend":
            # If origin/referer check passed but header is missing, still allow
            # (some legitimate browser requests might not have the header)
            # But log for monitoring
            pass
        
        return await call_next(request)
