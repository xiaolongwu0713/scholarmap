#!/bin/bash

################################################################################
# ScholarMap Health Check Script
# 
# This script performs comprehensive health checks on the ScholarMap system:
# 1. Email service (SendGrid verification email)
# 2. robots.txt availability
# 3. System availability (backend + frontend)
#
# Usage:
#   ./scripts/health_check.sh [environment]
#
# Arguments:
#   environment - Optional. Either "local" or "production" (default: production)
#
# Exit codes:
#   0 - All checks passed
#   1 - One or more checks failed
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Environment selection
ENVIRONMENT=${1:-production}

if [ "$ENVIRONMENT" = "local" ]; then
    BACKEND_URL="http://localhost:8000"
    FRONTEND_URL="http://localhost:3000"
    echo -e "${BLUE}Running health checks for LOCAL environment${NC}"
elif [ "$ENVIRONMENT" = "production" ]; then
    BACKEND_URL="https://scholarmap-backend.onrender.com"
    FRONTEND_URL="https://scholarmap-frontend.onrender.com"
    echo -e "${BLUE}Running health checks for PRODUCTION environment${NC}"
else
    echo -e "${RED}Invalid environment: $ENVIRONMENT${NC}"
    echo "Usage: $0 [local|production]"
    exit 1
fi

echo "Backend URL: $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
echo ""

# Track overall status
OVERALL_STATUS=0

################################################################################
# Check 1: System Availability (Backend & Frontend)
################################################################################
echo -e "${BLUE}=== Check 1: System Availability ===${NC}"

# 1.1 Backend health check
echo -e "${BLUE}1.1 Backend Service:${NC}"
BACKEND_HEALTH=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/healthz" 2>&1)
BACKEND_HTTP_CODE=$(echo "$BACKEND_HEALTH" | tail -n1)
BACKEND_BODY=$(echo "$BACKEND_HEALTH" | sed '$d')

BACKEND_AVAILABLE=false
if [ "$BACKEND_HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Backend is healthy (HTTP $BACKEND_HTTP_CODE)${NC}"
    if echo "$BACKEND_BODY" | grep -q "ok"; then
        echo -e "${GREEN}✓ Backend status: OK${NC}"
    fi
    BACKEND_AVAILABLE=true
else
    echo -e "${RED}✗ Backend health check failed (HTTP $BACKEND_HTTP_CODE)${NC}"
    echo -e "${YELLOW}  Note: Backend might be sleeping (Render free tier)${NC}"
    echo "Response: $BACKEND_BODY"
    OVERALL_STATUS=1
fi
echo ""

# 1.2 Frontend health check
echo -e "${BLUE}1.2 Frontend Service:${NC}"
FRONTEND_HEALTH=$(curl -s -w "\n%{http_code}" "$FRONTEND_URL/health" 2>&1)
FRONTEND_HTTP_CODE=$(echo "$FRONTEND_HEALTH" | tail -n1)
FRONTEND_BODY=$(echo "$FRONTEND_HEALTH" | sed '$d')

if [ "$FRONTEND_HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Frontend is healthy (HTTP $FRONTEND_HTTP_CODE)${NC}"
    if echo "$FRONTEND_BODY" | grep -q "ok"; then
        echo -e "${GREEN}✓ Frontend status: OK${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Frontend /health endpoint not available (HTTP $FRONTEND_HTTP_CODE)${NC}"
    echo -e "${YELLOW}  Trying homepage instead...${NC}"
    
    # Fallback: check homepage
    HOMEPAGE=$(curl -s -w "\n%{http_code}" "$FRONTEND_URL/" 2>&1)
    HOMEPAGE_HTTP_CODE=$(echo "$HOMEPAGE" | tail -n1)
    
    if [ "$HOMEPAGE_HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Frontend homepage is accessible (HTTP $HOMEPAGE_HTTP_CODE)${NC}"
    else
        echo -e "${RED}✗ Frontend is not accessible (HTTP $HOMEPAGE_HTTP_CODE)${NC}"
        OVERALL_STATUS=1
    fi
fi
echo ""

# 1.3 Check sitemap.xml
echo -e "${BLUE}1.3 Sitemap:${NC}"
SITEMAP=$(curl -s -w "\n%{http_code}" "$FRONTEND_URL/sitemap.xml" 2>&1)
SITEMAP_HTTP_CODE=$(echo "$SITEMAP" | tail -n1)
SITEMAP_BODY=$(echo "$SITEMAP" | sed '$d')

if [ "$SITEMAP_HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ sitemap.xml is accessible (HTTP $SITEMAP_HTTP_CODE)${NC}"
    
    # Count URLs in sitemap
    URL_COUNT=$(echo "$SITEMAP_BODY" | grep -c "<loc>" || echo "0")
    echo -e "${GREEN}✓ Sitemap contains $URL_COUNT URLs${NC}"
else
    echo -e "${RED}✗ sitemap.xml check failed (HTTP $SITEMAP_HTTP_CODE)${NC}"
    OVERALL_STATUS=1
fi
echo ""

################################################################################
# Check 2: Email Service (SendGrid) - Only if backend is available
################################################################################
echo -e "${BLUE}=== Check 2: Email Service ===${NC}"

if [ "$BACKEND_AVAILABLE" = false ]; then
    echo -e "${YELLOW}⚠ Skipping email check - backend is not available${NC}"
    echo ""
else
    # Test email endpoint with a test email
    TEST_EMAIL="test@example.com"
    EMAIL_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_EMAIL\"}" \
        "$BACKEND_URL/api/auth/send-verification-code" 2>&1)

    # Extract HTTP status code (last line)
    EMAIL_HTTP_CODE=$(echo "$EMAIL_RESPONSE" | tail -n1)
    EMAIL_BODY=$(echo "$EMAIL_RESPONSE" | sed '$d')

    if [ "$EMAIL_HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Email service is responding (HTTP $EMAIL_HTTP_CODE)${NC}"
        
        # Check if SendGrid is actually configured
        if echo "$EMAIL_BODY" | grep -q "code_sent"; then
            echo -e "${GREEN}✓ Verification code sent successfully${NC}"
        elif echo "$EMAIL_BODY" | grep -q "DEV"; then
            echo -e "${YELLOW}⚠ Email service in DEV mode (SendGrid not configured)${NC}"
            echo -e "${YELLOW}  This is OK for local development${NC}"
        else
            echo -e "${GREEN}✓ Email endpoint working${NC}"
        fi
    elif [ "$EMAIL_HTTP_CODE" = "500" ]; then
        # 500 might indicate SendGrid API issue
        echo -e "${YELLOW}⚠ Email service returned 500 (HTTP $EMAIL_HTTP_CODE)${NC}"
        echo -e "${YELLOW}  This might indicate SendGrid API key issue${NC}"
        echo "Response: $EMAIL_BODY"
        OVERALL_STATUS=1
    elif [ "$EMAIL_HTTP_CODE" = "404" ]; then
        echo -e "${RED}✗ Email endpoint not found (HTTP $EMAIL_HTTP_CODE)${NC}"
        echo -e "${YELLOW}  The /api/auth/send-verification-code endpoint may not exist${NC}"
        OVERALL_STATUS=1
    else
        echo -e "${RED}✗ Email service check failed (HTTP $EMAIL_HTTP_CODE)${NC}"
        echo "Response: $EMAIL_BODY"
        OVERALL_STATUS=1
    fi
    echo ""
fi

################################################################################
# Check 3: robots.txt Availability
################################################################################
echo -e "${BLUE}=== Check 3: robots.txt Availability ===${NC}"

ROBOTS_RESPONSE=$(curl -s -w "\n%{http_code}" "$FRONTEND_URL/robots.txt" 2>&1)
ROBOTS_HTTP_CODE=$(echo "$ROBOTS_RESPONSE" | tail -n1)
ROBOTS_BODY=$(echo "$ROBOTS_RESPONSE" | sed '$d')

if [ "$ROBOTS_HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ robots.txt is accessible (HTTP $ROBOTS_HTTP_CODE)${NC}"
    
    # Verify content contains essential directives
    if echo "$ROBOTS_BODY" | grep -q "User-agent:" && \
       echo "$ROBOTS_BODY" | grep -q "Sitemap:"; then
        echo -e "${GREEN}✓ robots.txt contains required directives${NC}"
        
        # Show first few lines
        echo -e "${BLUE}Preview:${NC}"
        echo "$ROBOTS_BODY" | head -n 5
    else
        echo -e "${YELLOW}⚠ robots.txt missing required directives${NC}"
        OVERALL_STATUS=1
    fi
elif [ "$ROBOTS_HTTP_CODE" = "401" ]; then
    echo -e "${RED}✗ robots.txt returned 401 Unauthorized${NC}"
    echo -e "${RED}  This is CRITICAL - Google crawler will be blocked!${NC}"
    OVERALL_STATUS=1
elif [ "$ROBOTS_HTTP_CODE" = "404" ]; then
    echo -e "${RED}✗ robots.txt not found (404)${NC}"
    OVERALL_STATUS=1
else
    echo -e "${RED}✗ robots.txt check failed (HTTP $ROBOTS_HTTP_CODE)${NC}"
    OVERALL_STATUS=1
fi
echo ""

################################################################################
# Summary
################################################################################
echo -e "${BLUE}=== Health Check Summary ===${NC}"
echo "Environment: $ENVIRONMENT"
echo "Backend: $BACKEND_URL"
echo "Frontend: $FRONTEND_URL"
echo ""

if [ $OVERALL_STATUS -eq 0 ]; then
    echo -e "${GREEN}✓ All health checks passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some health checks failed. Please review the output above.${NC}"
    exit 1
fi
