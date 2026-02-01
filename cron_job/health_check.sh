#!/bin/bash

################################################################################
# ScholarMap Comprehensive Health Check Script
# 
# Performs extensive health checks across:
# - System availability (backend, frontend, demo)
# - SEO optimization (pages, robots.txt, sitemap)
# - Performance metrics (load times, API response)
# - User functionality (auth, email service)
# - Database integrity & resource snapshots
# - External services (geocoding, etc.)
# - Security posture (headers, CORS, endpoint protection)
#
# NEW in v2.1:
# - Integrated resource snapshot (database usage monitoring)
# - Automatic email reporting to xiaolongwu0713@gmail.com
# - Replaces take_resource_snapshot.sh functionality
#
# Usage:
#   ./cron_job/health_check.sh [environment] [options]
#
# Arguments:
#   environment - Optional. Either "local" or "production" (default: production)
#   --verbose   - Enable verbose output (show all individual checks)
#   --skip-slow - Skip slow checks (performance tests, skips email)
#
# Features:
#   - 57+ health checks across P0/P1/P2 priorities
#   - Color-coded output (✓ ✗ ⚠ ⊘)
#   - Performance timing for all requests
#   - Resource snapshot in production
#   - Email report to admin (production only, full check only)
#
# Exit codes:
#   0 - All critical checks passed (warnings are OK)
#   1 - One or more critical checks failed
################################################################################

set +e  # Don't exit on error, we want to run all checks

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
ENVIRONMENT=${1:-production}
VERBOSE=false
SKIP_SLOW=false

# Parse options
for arg in "$@"; do
    case $arg in
        --verbose) VERBOSE=true ;;
        --skip-slow) SKIP_SLOW=true ;;
    esac
done

# Environment URLs
if [ "$ENVIRONMENT" = "local" ]; then
    BACKEND_URL="http://localhost:8000"
    FRONTEND_URL="http://localhost:3000"
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  LOCAL Environment Health Check       ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
elif [ "$ENVIRONMENT" = "production" ]; then
    BACKEND_URL="https://scholarmap-q1k1.onrender.com"
    FRONTEND_URL="https://scholarmap-frontend.onrender.com"
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  PRODUCTION Environment Health Check  ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
else
    echo -e "${RED}Invalid environment: $ENVIRONMENT${NC}"
    echo "Usage: $0 [local|production] [--verbose] [--skip-slow]"
    exit 1
fi

echo "Backend:  $BACKEND_URL"
echo "Frontend: $FRONTEND_URL"
echo ""

# Demo run configuration
DEMO_PROJECT_ID="6af7ac1b6254"
DEMO_RUN_ID="53e099cdb74e"

# Track stats
OVERALL_STATUS=0
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0
SKIPPED_CHECKS=0

# Global flags
BACKEND_AVAILABLE=false
FRONTEND_AVAILABLE=false

################################################################################
# Helper Functions
################################################################################

# Increment check counter
check_start() {
    ((TOTAL_CHECKS++))
}

# Record check result
check_pass() {
    ((PASSED_CHECKS++))
    echo -e "${GREEN}✓ $1${NC}"
}

check_fail() {
    ((FAILED_CHECKS++))
    OVERALL_STATUS=1
    echo -e "${RED}✗ $1${NC}"
}

check_warn() {
    ((WARNING_CHECKS++))
    echo -e "${YELLOW}⚠ $1${NC}"
}

check_skip() {
    ((SKIPPED_CHECKS++))
    echo -e "${CYAN}⊘ $1${NC}"
}

# Measure time
time_start=$(date +%s)
measure_time() {
    local start=$1
    local end=$(date +%s)
    echo $((end - start))
}

# HTTP request with timing
http_get() {
    local url=$1
    local timeout=${2:-10}
    curl -s -w "\n%{http_code}\n%{time_total}" --max-time "$timeout" "$url" 2>&1
}

http_post() {
    local url=$1
    local data=$2
    local timeout=${3:-10}
    curl -s -w "\n%{http_code}\n%{time_total}" --max-time "$timeout" \
        -X POST -H "Content-Type: application/json" -d "$data" "$url" 2>&1
}

# Extract HTTP response
extract_body() {
    echo "$1" | sed '$ d' | sed '$ d'
}

extract_code() {
    echo "$1" | tail -n 2 | head -n 1
}

extract_time() {
    echo "$1" | tail -n 1
}

################################################################################
# P0: Critical System Availability
################################################################################
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  P0: Critical System Availability${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Check 1: Backend Health
echo -e "${CYAN}→ Backend Service${NC}"
check_start
RESPONSE=$(http_get "$BACKEND_URL/healthz" 5)
HTTP_CODE=$(extract_code "$RESPONSE")
RESPONSE_TIME=$(extract_time "$RESPONSE")

if [ "$HTTP_CODE" = "200" ]; then
    BACKEND_AVAILABLE=true
    check_pass "Backend is healthy (HTTP $HTTP_CODE, ${RESPONSE_TIME}s)"
else
    check_fail "Backend health check failed (HTTP $HTTP_CODE)"
    echo "  Response: $(extract_body "$RESPONSE")"
fi
echo ""

# Check 2: Frontend Health
echo -e "${CYAN}→ Frontend Service${NC}"
check_start
RESPONSE=$(http_get "$FRONTEND_URL/health" 5)
HTTP_CODE=$(extract_code "$RESPONSE")
RESPONSE_TIME=$(extract_time "$RESPONSE")

if [ "$HTTP_CODE" = "200" ]; then
    FRONTEND_AVAILABLE=true
    check_pass "Frontend is healthy (HTTP $HTTP_CODE, ${RESPONSE_TIME}s)"
else
    # Fallback to homepage
    check_warn "Frontend /health endpoint not available, checking homepage..."
    RESPONSE=$(http_get "$FRONTEND_URL/" 10)
    HTTP_CODE=$(extract_code "$RESPONSE")
    if [ "$HTTP_CODE" = "200" ]; then
        FRONTEND_AVAILABLE=true
        check_pass "Frontend homepage is accessible (HTTP $HTTP_CODE)"
    else
        check_fail "Frontend is not accessible (HTTP $HTTP_CODE)"
    fi
fi
echo ""

# Check 3: Demo Run Accessibility
echo -e "${CYAN}→ Demo Run (Public Access)${NC}"
check_start
DEMO_URL="$FRONTEND_URL/projects/$DEMO_PROJECT_ID/runs/$DEMO_RUN_ID"
RESPONSE=$(http_get "$DEMO_URL" 10)
HTTP_CODE=$(extract_code "$RESPONSE")

if [ "$HTTP_CODE" = "200" ]; then
    check_pass "Demo run page is accessible (HTTP $HTTP_CODE)"
else
    check_fail "Demo run page is not accessible (HTTP $HTTP_CODE)"
fi
echo ""

# Check 4: Demo Map Data API
echo -e "${CYAN}→ Demo Map Data API${NC}"
if [ "$BACKEND_AVAILABLE" = true ]; then
    check_start
    MAP_URL="$BACKEND_URL/api/projects/$DEMO_PROJECT_ID/runs/$DEMO_RUN_ID/map/world"
    RESPONSE=$(http_get "$MAP_URL" 10)
    HTTP_CODE=$(extract_code "$RESPONSE")
    BODY=$(extract_body "$RESPONSE")
    
    if [ "$HTTP_CODE" = "200" ]; then
        # Check if response contains data
        if echo "$BODY" | grep -q "\"data\""; then
            check_pass "Demo map API returns valid data (HTTP $HTTP_CODE)"
        else
            check_warn "Demo map API returns 200 but data format unexpected"
        fi
    else
        check_fail "Demo map API failed (HTTP $HTTP_CODE)"
    fi
else
    check_skip "Demo map API check (backend unavailable)"
fi
echo ""

# Check 5: HTTPS Enforcement (Production only)
if [ "$ENVIRONMENT" = "production" ]; then
    echo -e "${CYAN}→ HTTPS Enforcement${NC}"
    check_start
    
    # Check if HTTP redirects to HTTPS
    HTTP_FRONTEND="http://scholarmap-frontend.onrender.com"
    RESPONSE=$(curl -s -I -L --max-time 5 "$HTTP_FRONTEND" 2>&1 | grep -i "^location:")
    
    if echo "$RESPONSE" | grep -q "https://"; then
        check_pass "HTTP redirects to HTTPS"
    else
        check_warn "HTTP to HTTPS redirect not detected"
    fi
    echo ""
fi

################################################################################
# P0: Critical SEO Pages
################################################################################
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  P0: Critical SEO Pages${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Check key field pages
echo -e "${CYAN}→ Research Field Pages (Top 5)${NC}"
FIELDS=("brain-computer-interface" "crispr-gene-editing" "cancer-immunotherapy" "neural-modulation" "ai-drug-discovery")
FIELD_PASSED=0

for field in "${FIELDS[@]}"; do
    check_start
    RESPONSE=$(http_get "$FRONTEND_URL/research-jobs/$field" 5)
    HTTP_CODE=$(extract_code "$RESPONSE")
    
    if [ "$HTTP_CODE" = "200" ]; then
        ((FIELD_PASSED++))
        [ "$VERBOSE" = true ] && check_pass "/$field (HTTP $HTTP_CODE)"
    else
        check_fail "/$field (HTTP $HTTP_CODE)"
    fi
done

if [ $FIELD_PASSED -eq 5 ]; then
    check_pass "All 5 field pages accessible ($FIELD_PASSED/5)"
elif [ $FIELD_PASSED -ge 3 ]; then
    check_warn "Most field pages accessible ($FIELD_PASSED/5)"
else
    check_fail "Too many field pages failing ($FIELD_PASSED/5)"
fi
echo ""

# Check top country pages
echo -e "${CYAN}→ Country Pages (Top 10)${NC}"
COUNTRIES=("united-states" "china" "united-kingdom" "germany" "italy" "canada" "spain" "australia" "france" "japan")
COUNTRY_PASSED=0

for country in "${COUNTRIES[@]}"; do
    check_start
    RESPONSE=$(http_get "$FRONTEND_URL/research-jobs/country/$country" 5)
    HTTP_CODE=$(extract_code "$RESPONSE")
    
    if [ "$HTTP_CODE" = "200" ]; then
        ((COUNTRY_PASSED++))
        [ "$VERBOSE" = true ] && check_pass "/$country (HTTP $HTTP_CODE)"
    else
        check_fail "/$country (HTTP $HTTP_CODE)"
    fi
done

if [ $COUNTRY_PASSED -eq 10 ]; then
    check_pass "All 10 country pages accessible ($COUNTRY_PASSED/10)"
elif [ $COUNTRY_PASSED -ge 7 ]; then
    check_warn "Most country pages accessible ($COUNTRY_PASSED/10)"
else
    check_fail "Too many country pages failing ($COUNTRY_PASSED/10)"
fi
echo ""

# Check top city pages
echo -e "${CYAN}→ City Pages (Top 10)${NC}"
CITIES=("beijing" "boston" "london" "shanghai" "toronto" "rome" "new-york" "paris" "berlin" "sydney")
CITY_PASSED=0

for city in "${CITIES[@]}"; do
    check_start
    RESPONSE=$(http_get "$FRONTEND_URL/research-jobs/city/$city" 5)
    HTTP_CODE=$(extract_code "$RESPONSE")
    
    if [ "$HTTP_CODE" = "200" ]; then
        ((CITY_PASSED++))
        [ "$VERBOSE" = true ] && check_pass "/$city (HTTP $HTTP_CODE)"
    else
        check_fail "/$city (HTTP $HTTP_CODE)"
    fi
done

if [ $CITY_PASSED -eq 10 ]; then
    check_pass "All 10 city pages accessible ($CITY_PASSED/10)"
elif [ $CITY_PASSED -ge 7 ]; then
    check_warn "Most city pages accessible ($CITY_PASSED/10)"
else
    check_fail "Too many city pages failing ($CITY_PASSED/10)"
fi
echo ""

# Check robots.txt
echo -e "${CYAN}→ robots.txt${NC}"
check_start
RESPONSE=$(http_get "$FRONTEND_URL/robots.txt" 5)
HTTP_CODE=$(extract_code "$RESPONSE")
BODY=$(extract_body "$RESPONSE")

if [ "$HTTP_CODE" = "200" ]; then
    if echo "$BODY" | grep -q "User-agent:" && echo "$BODY" | grep -q "Sitemap:"; then
        check_pass "robots.txt is accessible and valid (HTTP $HTTP_CODE)"
    else
        check_warn "robots.txt missing required directives"
    fi
elif [ "$HTTP_CODE" = "401" ]; then
    check_fail "robots.txt returned 401 - CRITICAL for SEO!"
else
    check_fail "robots.txt check failed (HTTP $HTTP_CODE)"
fi
echo ""

# Check sitemap.xml
echo -e "${CYAN}→ sitemap.xml${NC}"
check_start
RESPONSE=$(http_get "$FRONTEND_URL/sitemap.xml" 5)
HTTP_CODE=$(extract_code "$RESPONSE")
BODY=$(extract_body "$RESPONSE")

if [ "$HTTP_CODE" = "200" ]; then
    URL_COUNT=$(echo "$BODY" | grep -c "<loc>" || echo "0")
    if [ "$URL_COUNT" -ge 500 ]; then
        check_pass "Sitemap accessible with $URL_COUNT URLs (HTTP $HTTP_CODE)"
    elif [ "$URL_COUNT" -ge 100 ]; then
        check_warn "Sitemap has fewer URLs than expected: $URL_COUNT"
    else
        check_fail "Sitemap has too few URLs: $URL_COUNT"
    fi
else
    check_fail "Sitemap check failed (HTTP $HTTP_CODE)"
fi
echo ""

################################################################################
# P0: Page Load Performance
################################################################################
if [ "$SKIP_SLOW" = false ]; then
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  P0: Page Load Performance${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""

    # Homepage load time
    echo -e "${CYAN}→ Homepage Load Time${NC}"
    check_start
    RESPONSE=$(http_get "$FRONTEND_URL/" 10)
    LOAD_TIME=$(extract_time "$RESPONSE")
    HTTP_CODE=$(extract_code "$RESPONSE")
    
    if [ "$HTTP_CODE" = "200" ]; then
        LOAD_TIME_MS=$(echo "$LOAD_TIME * 1000" | bc | cut -d. -f1)
        if [ "$LOAD_TIME_MS" -lt 2000 ]; then
            check_pass "Homepage loads fast: ${LOAD_TIME}s (< 2s)"
        elif [ "$LOAD_TIME_MS" -lt 4000 ]; then
            check_warn "Homepage load time acceptable: ${LOAD_TIME}s (< 4s)"
        else
            check_warn "Homepage loads slowly: ${LOAD_TIME}s (>= 4s)"
        fi
    else
        check_fail "Homepage load failed (HTTP $HTTP_CODE)"
    fi
    echo ""

    # SEO page load time
    echo -e "${CYAN}→ SEO Page Load Time${NC}"
    check_start
    RESPONSE=$(http_get "$FRONTEND_URL/research-jobs" 10)
    LOAD_TIME=$(extract_time "$RESPONSE")
    HTTP_CODE=$(extract_code "$RESPONSE")
    
    if [ "$HTTP_CODE" = "200" ]; then
        LOAD_TIME_MS=$(echo "$LOAD_TIME * 1000" | bc | cut -d. -f1)
        if [ "$LOAD_TIME_MS" -lt 3000 ]; then
            check_pass "SEO page loads fast: ${LOAD_TIME}s (< 3s)"
        elif [ "$LOAD_TIME_MS" -lt 5000 ]; then
            check_warn "SEO page load time acceptable: ${LOAD_TIME}s (< 5s)"
        else
            check_warn "SEO page loads slowly: ${LOAD_TIME}s (>= 5s)"
        fi
    else
        check_fail "SEO page load failed (HTTP $HTTP_CODE)"
    fi
    echo ""

    # Demo page load time
    echo -e "${CYAN}→ Demo Page Load Time${NC}"
    check_start
    RESPONSE=$(http_get "$DEMO_URL" 15)
    LOAD_TIME=$(extract_time "$RESPONSE")
    HTTP_CODE=$(extract_code "$RESPONSE")
    
    if [ "$HTTP_CODE" = "200" ]; then
        LOAD_TIME_MS=$(echo "$LOAD_TIME * 1000" | bc | cut -d. -f1)
        if [ "$LOAD_TIME_MS" -lt 5000 ]; then
            check_pass "Demo page loads fast: ${LOAD_TIME}s (< 5s)"
        elif [ "$LOAD_TIME_MS" -lt 8000 ]; then
            check_warn "Demo page load time acceptable: ${LOAD_TIME}s (< 8s)"
        else
            check_warn "Demo page loads slowly: ${LOAD_TIME}s (>= 8s)"
        fi
    else
        check_fail "Demo page load failed (HTTP $HTTP_CODE)"
    fi
    echo ""
fi

################################################################################
# P1: SEO Optimization
################################################################################
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  P1: SEO Optimization${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Meta tags on homepage
echo -e "${CYAN}→ Homepage Meta Tags${NC}"
check_start
RESPONSE=$(http_get "$FRONTEND_URL/" 5)
HTTP_CODE=$(extract_code "$RESPONSE")
BODY=$(extract_body "$RESPONSE")

if [ "$HTTP_CODE" = "200" ]; then
    HAS_TITLE=$(echo "$BODY" | grep -c "<title>" || echo "0")
    HAS_DESCRIPTION=$(echo "$BODY" | grep -c "name=\"description\"" || echo "0")
    HAS_OG=$(echo "$BODY" | grep -c "property=\"og:" || echo "0")
    
    if [ "$HAS_TITLE" -ge 1 ] && [ "$HAS_DESCRIPTION" -ge 1 ] && [ "$HAS_OG" -ge 1 ]; then
        check_pass "Homepage has complete meta tags (title, description, OG)"
    elif [ "$HAS_TITLE" -ge 1 ] && [ "$HAS_DESCRIPTION" -ge 1 ]; then
        check_warn "Homepage missing Open Graph tags"
    else
        check_fail "Homepage missing critical meta tags"
    fi
else
    check_fail "Cannot check homepage meta tags (HTTP $HTTP_CODE)"
fi
echo ""

# Sitemap content validation
echo -e "${CYAN}→ Sitemap Content Validation${NC}"
check_start
if [ -n "$BODY" ] && [ "$URL_COUNT" -gt 0 ]; then
    # Check if key pages are in sitemap (use tr to remove newlines)
    HAS_HOMEPAGE=$(echo "$BODY" | grep -c "$FRONTEND_URL<" | tr -d '\n' || echo "0")
    HAS_RESEARCH_JOBS=$(echo "$BODY" | grep -c "/research-jobs<" | tr -d '\n' || echo "0")
    HAS_ABOUT=$(echo "$BODY" | grep -c "/about<" | tr -d '\n' || echo "0")
    
    # Debug output in verbose mode
    [ "$VERBOSE" = true ] && echo "  Homepage count: $HAS_HOMEPAGE, Research: $HAS_RESEARCH_JOBS, About: $HAS_ABOUT"
    
    if [ "$HAS_HOMEPAGE" -ge 1 ] && [ "$HAS_RESEARCH_JOBS" -ge 1 ] && [ "$HAS_ABOUT" -ge 1 ]; then
        check_pass "Sitemap contains key pages"
    else
        check_warn "Sitemap may be missing some key pages (H:$HAS_HOMEPAGE R:$HAS_RESEARCH_JOBS A:$HAS_ABOUT)"
    fi
else
    check_skip "Sitemap content validation (sitemap not loaded)"
fi
echo ""

################################################################################
# P1: API Performance & Endpoints
################################################################################
if [ "$BACKEND_AVAILABLE" = true ] && [ "$SKIP_SLOW" = false ]; then
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  P1: API Performance & Endpoints${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""

    # Backend health endpoint performance
    echo -e "${CYAN}→ Backend Health Endpoint Performance${NC}"
    check_start
    RESPONSE=$(http_get "$BACKEND_URL/healthz" 5)
    RESPONSE_TIME=$(extract_time "$RESPONSE")
    HTTP_CODE=$(extract_code "$RESPONSE")
    
    if [ "$HTTP_CODE" = "200" ]; then
        RESPONSE_TIME_MS=$(echo "$RESPONSE_TIME * 1000" | bc | cut -d. -f1)
        if [ "$RESPONSE_TIME_MS" -lt 500 ]; then
            check_pass "Health endpoint very fast: ${RESPONSE_TIME}s (< 0.5s)"
        elif [ "$RESPONSE_TIME_MS" -lt 2000 ]; then
            check_pass "Health endpoint acceptable: ${RESPONSE_TIME}s (< 2s)"
        else
            check_warn "Health endpoint slow: ${RESPONSE_TIME}s (>= 2s)"
        fi
    else
        check_fail "Health endpoint failed (HTTP $HTTP_CODE)"
    fi
    echo ""

    # Map API performance
    echo -e "${CYAN}→ Map API Performance${NC}"
    check_start
    MAP_URL="$BACKEND_URL/api/projects/$DEMO_PROJECT_ID/runs/$DEMO_RUN_ID/map/world"
    RESPONSE=$(http_get "$MAP_URL" 10)
    RESPONSE_TIME=$(extract_time "$RESPONSE")
    HTTP_CODE=$(extract_code "$RESPONSE")
    
    if [ "$HTTP_CODE" = "200" ]; then
        RESPONSE_TIME_MS=$(echo "$RESPONSE_TIME * 1000" | bc | cut -d. -f1)
        if [ "$RESPONSE_TIME_MS" -lt 2000 ]; then
            check_pass "Map API fast: ${RESPONSE_TIME}s (< 2s)"
        elif [ "$RESPONSE_TIME_MS" -lt 5000 ]; then
            check_warn "Map API acceptable: ${RESPONSE_TIME}s (< 5s)"
        else
            check_warn "Map API slow: ${RESPONSE_TIME}s (>= 5s)"
        fi
    else
        check_fail "Map API failed (HTTP $HTTP_CODE)"
    fi
    echo ""

    # Country map API
    echo -e "${CYAN}→ Country Map API${NC}"
    check_start
    COUNTRY_URL="$BACKEND_URL/api/projects/$DEMO_PROJECT_ID/runs/$DEMO_RUN_ID/map/country/United%20States"
    RESPONSE=$(http_get "$COUNTRY_URL" 10)
    HTTP_CODE=$(extract_code "$RESPONSE")
    BODY=$(extract_body "$RESPONSE")
    
    if [ "$HTTP_CODE" = "200" ]; then
        if echo "$BODY" | grep -q "\"data\""; then
            check_pass "Country map API works (HTTP $HTTP_CODE)"
        else
            check_warn "Country map API returns unexpected format"
        fi
    else
        check_fail "Country map API failed (HTTP $HTTP_CODE)"
    fi
    echo ""
fi

################################################################################
# P1: Authentication & User Endpoints
################################################################################
if [ "$BACKEND_AVAILABLE" = true ]; then
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  P1: Authentication & User Endpoints${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""

    # Password requirements endpoint
    echo -e "${CYAN}→ Password Requirements Endpoint${NC}"
    check_start
    RESPONSE=$(http_get "$BACKEND_URL/api/auth/password-requirements" 5)
    HTTP_CODE=$(extract_code "$RESPONSE")
    BODY=$(extract_body "$RESPONSE")
    
    if [ "$HTTP_CODE" = "200" ]; then
        if echo "$BODY" | grep -q "min_length"; then
            check_pass "Password requirements endpoint works (HTTP $HTTP_CODE)"
        else
            check_warn "Password requirements endpoint returns unexpected format"
        fi
    else
        check_fail "Password requirements endpoint failed (HTTP $HTTP_CODE)"
    fi
    echo ""

    # Email verification endpoint
    echo -e "${CYAN}→ Email Verification Endpoint${NC}"
    check_start
    TEST_EMAIL="xiaolongwu0813@gmail.com"
    RESPONSE=$(http_post "$BACKEND_URL/api/auth/send-verification-code" "{\"email\":\"$TEST_EMAIL\"}" 5)
    HTTP_CODE=$(extract_code "$RESPONSE")
    
    if [ "$HTTP_CODE" = "200" ]; then
        check_pass "Email verification endpoint accessible (HTTP $HTTP_CODE)"
    elif [ "$HTTP_CODE" = "500" ]; then
        check_warn "Email service may have SendGrid configuration issue"
    else
        check_fail "Email verification endpoint failed (HTTP $HTTP_CODE)"
    fi
    echo ""

    # Config endpoint
    echo -e "${CYAN}→ Frontend Config Endpoint${NC}"
    check_start
    RESPONSE=$(http_get "$BACKEND_URL/api/config" 5)
    HTTP_CODE=$(extract_code "$RESPONSE")
    
    if [ "$HTTP_CODE" = "200" ]; then
        check_pass "Config endpoint accessible (HTTP $HTTP_CODE)"
    else
        check_fail "Config endpoint failed (HTTP $HTTP_CODE)"
    fi
    echo ""
fi

################################################################################
# P1: Error Handling & Static Resources
################################################################################
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  P1: Error Handling & Static Resources${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# 404 page
echo -e "${CYAN}→ 404 Error Page${NC}"
check_start
RESPONSE=$(http_get "$FRONTEND_URL/nonexistent-page-12345" 5)
HTTP_CODE=$(extract_code "$RESPONSE")

if [ "$HTTP_CODE" = "404" ]; then
    check_pass "404 page returns correct status (HTTP $HTTP_CODE)"
else
    check_warn "404 page returns unexpected status (HTTP $HTTP_CODE)"
fi
echo ""

# Favicon
echo -e "${CYAN}→ Favicon${NC}"
check_start
RESPONSE=$(http_get "$FRONTEND_URL/favicon.ico" 5)
HTTP_CODE=$(extract_code "$RESPONSE")

if [ "$HTTP_CODE" = "200" ]; then
    check_pass "Favicon is accessible (HTTP $HTTP_CODE)"
else
    check_warn "Favicon not found (HTTP $HTTP_CODE)"
fi
echo ""

################################################################################
# P1: Security - Endpoint Protection
################################################################################
if [ "$BACKEND_AVAILABLE" = true ]; then
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  P1: Security - Endpoint Protection${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""

    # Protected endpoints should require auth
    echo -e "${CYAN}→ Protected Endpoints (Should Require Auth)${NC}"
    
    check_start
    RESPONSE=$(http_get "$BACKEND_URL/api/projects" 5)
    HTTP_CODE=$(extract_code "$RESPONSE")
    
    if [ "$HTTP_CODE" = "401" ]; then
        check_pass "/api/projects requires authentication (HTTP 401)"
    else
        check_warn "/api/projects returned unexpected status (HTTP $HTTP_CODE)"
    fi
    
    check_start
    RESPONSE=$(http_get "$BACKEND_URL/api/user/quota" 5)
    HTTP_CODE=$(extract_code "$RESPONSE")
    
    if [ "$HTTP_CODE" = "401" ]; then
        check_pass "/api/user/quota requires authentication (HTTP 401)"
    else
        check_warn "/api/user/quota returned unexpected status (HTTP $HTTP_CODE)"
    fi
    echo ""

    # Public endpoints should NOT require auth
    echo -e "${CYAN}→ Public Endpoints (Should Be Accessible)${NC}"
    
    check_start
    RESPONSE=$(http_get "$BACKEND_URL/api/config" 5)
    HTTP_CODE=$(extract_code "$RESPONSE")
    
    if [ "$HTTP_CODE" = "200" ]; then
        check_pass "/api/config is publicly accessible (HTTP $HTTP_CODE)"
    else
        check_fail "/api/config should be public (HTTP $HTTP_CODE)"
    fi
    echo ""
fi

################################################################################
# P2: Resource Size & Optimization
################################################################################
if [ "$SKIP_SLOW" = false ]; then
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  P2: Resource Size & Optimization${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""

    # Sitemap size
    echo -e "${CYAN}→ Sitemap File Size${NC}"
    check_start
    if [ -n "$BODY" ]; then
        SIZE_BYTES=$(echo "$BODY" | wc -c)
        SIZE_KB=$((SIZE_BYTES / 1024))
        
        if [ "$SIZE_KB" -lt 1024 ]; then
            check_pass "Sitemap size is acceptable: ${SIZE_KB}KB (< 1MB)"
        else
            check_warn "Sitemap is large: ${SIZE_KB}KB (>= 1MB)"
        fi
    else
        check_skip "Sitemap size check (sitemap not loaded)"
    fi
    echo ""

    # Homepage HTML size
    echo -e "${CYAN}→ Homepage HTML Size${NC}"
    check_start
    RESPONSE=$(http_get "$FRONTEND_URL/" 5)
    HTTP_CODE=$(extract_code "$RESPONSE")
    BODY=$(extract_body "$RESPONSE")
    
    if [ "$HTTP_CODE" = "200" ]; then
        SIZE_BYTES=$(echo "$BODY" | wc -c)
        SIZE_KB=$((SIZE_BYTES / 1024))
        
        if [ "$SIZE_KB" -lt 500 ]; then
            check_pass "Homepage HTML is optimized: ${SIZE_KB}KB (< 500KB)"
        elif [ "$SIZE_KB" -lt 1000 ]; then
            check_warn "Homepage HTML is acceptable: ${SIZE_KB}KB (< 1MB)"
        else
            check_warn "Homepage HTML is large: ${SIZE_KB}KB (>= 1MB)"
        fi
    else
        check_skip "Homepage size check (page not loaded)"
    fi
    echo ""
fi

################################################################################
# P2: Security Headers
################################################################################
if [ "$ENVIRONMENT" = "production" ]; then
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  P2: Security Headers${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""

    echo -e "${CYAN}→ Security Headers (Frontend)${NC}"
    HEADERS=$(curl -s -I --max-time 5 "$FRONTEND_URL/" 2>&1)
    
    check_start
    if echo "$HEADERS" | grep -qi "x-frame-options:"; then
        check_pass "X-Frame-Options header present"
    else
        check_warn "X-Frame-Options header missing"
    fi
    
    check_start
    if echo "$HEADERS" | grep -qi "x-content-type-options:"; then
        check_pass "X-Content-Type-Options header present"
    else
        check_warn "X-Content-Type-Options header missing"
    fi
    
    check_start
    if echo "$HEADERS" | grep -qi "referrer-policy:"; then
        check_pass "Referrer-Policy header present"
    else
        check_warn "Referrer-Policy header missing"
    fi
    echo ""
fi

################################################################################
# P2: CORS Configuration
################################################################################
if [ "$BACKEND_AVAILABLE" = true ] && [ "$FRONTEND_AVAILABLE" = true ]; then
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  P2: CORS Configuration${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""

    echo -e "${CYAN}→ CORS Headers${NC}"
    check_start
    HEADERS=$(curl -s -I -H "Origin: $FRONTEND_URL" --max-time 5 "$BACKEND_URL/healthz" 2>&1)
    
    if echo "$HEADERS" | grep -qi "access-control-allow-origin"; then
        check_pass "CORS headers configured"
    else
        check_warn "CORS headers not detected (may be conditional)"
    fi
    echo ""
fi

################################################################################
# Resource Snapshot (Production Only)
################################################################################
if [ "$ENVIRONMENT" = "production" ] && [ "$BACKEND_AVAILABLE" = true ]; then
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  Resource Snapshot${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    
    echo -e "${CYAN}→ Taking Database Resource Snapshot${NC}"
    
    # Get script directory
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
    
    # Check if Python snapshot script exists
    if [ -f "$PROJECT_DIR/cron_job/take_resource_snapshot.py" ]; then
        # Try to run snapshot (with conda environment if available)
        if command -v conda &> /dev/null && [ -f "$HOME/opt/miniconda3/etc/profile.d/conda.sh" ]; then
            echo "  Using conda environment 'maker'..."
            source "$HOME/opt/miniconda3/etc/profile.d/conda.sh" 2>/dev/null
            conda activate maker >/dev/null 2>&1
        fi
        
        # Run snapshot script
        SNAPSHOT_OUTPUT=$(cd "$PROJECT_DIR" && python cron_job/take_resource_snapshot.py 2>&1)
        SNAPSHOT_EXIT=$?
        
        if [ $SNAPSHOT_EXIT -eq 0 ]; then
            check_pass "Resource snapshot saved successfully"
            [ "$VERBOSE" = true ] && echo "$SNAPSHOT_OUTPUT" | tail -n 5
        else
            check_warn "Resource snapshot failed (non-critical)"
            [ "$VERBOSE" = true ] && echo "$SNAPSHOT_OUTPUT" | tail -n 10
        fi
    else
        check_skip "Resource snapshot script not found"
    fi
    echo ""
fi

################################################################################
# Summary
################################################################################
SCRIPT_TIME=$(measure_time $time_start)

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Health Check Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Environment: $ENVIRONMENT"
echo "Duration:    ${SCRIPT_TIME}s"
echo ""
echo "Total Checks:   $TOTAL_CHECKS"
echo -e "${GREEN}Passed:         $PASSED_CHECKS${NC}"
echo -e "${RED}Failed:         $FAILED_CHECKS${NC}"
echo -e "${YELLOW}Warnings:       $WARNING_CHECKS${NC}"
echo -e "${CYAN}Skipped:        $SKIPPED_CHECKS${NC}"
echo ""

SUCCESS_RATE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
echo "Success Rate:   ${SUCCESS_RATE}%"
echo ""

# Determine overall status message
if [ $OVERALL_STATUS -eq 0 ]; then
    STATUS_ICON="✓"
    STATUS_MSG="All Critical Checks Passed!"
    STATUS_COLOR="${GREEN}"
else
    STATUS_ICON="✗"
    STATUS_MSG="Some Checks Failed"
    STATUS_COLOR="${RED}"
fi

echo -e "${STATUS_COLOR}╔════════════════════════════════════════╗${NC}"
echo -e "${STATUS_COLOR}║  $STATUS_ICON $STATUS_MSG        ║${NC}"
echo -e "${STATUS_COLOR}╚════════════════════════════════════════╝${NC}"
echo ""

################################################################################
# Email Report (Production Only)
################################################################################
if [ "$ENVIRONMENT" = "production" ]; then
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  Email Report${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    
    ADMIN_EMAIL="xiaolongwu0713@gmail.com"
    REPORT_DATE=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Create email subject
    if [ $OVERALL_STATUS -eq 0 ]; then
        EMAIL_SUBJECT="✓ ScholarMap Health Check Passed - $REPORT_DATE"
    else
        EMAIL_SUBJECT="⚠ ScholarMap Health Check Failed - $REPORT_DATE"
    fi
    
    # Create email body (plain text summary)
    EMAIL_BODY="ScholarMap Health Check Report
========================================
Date: $REPORT_DATE
Environment: $ENVIRONMENT
Duration: ${SCRIPT_TIME}s

SUMMARY
-------
Total Checks:   $TOTAL_CHECKS
Passed:         $PASSED_CHECKS
Failed:         $FAILED_CHECKS
Warnings:       $WARNING_CHECKS
Skipped:        $SKIPPED_CHECKS
Success Rate:   ${SUCCESS_RATE}%

OVERALL STATUS
--------------
$STATUS_ICON $STATUS_MSG

QUICK STATUS
------------
Backend:  $([[ "$BACKEND_AVAILABLE" == "true" ]] && echo "✓ Healthy" || echo "✗ Unavailable")
Frontend: $([[ "$FRONTEND_AVAILABLE" == "true" ]] && echo "✓ Healthy" || echo "✗ Unavailable")

URLs
----
Backend:  $BACKEND_URL
Frontend: $FRONTEND_URL

"

    # Add failure details if any
    if [ $FAILED_CHECKS -gt 0 ] || [ $WARNING_CHECKS -gt 0 ]; then
        EMAIL_BODY+="
⚠ ATTENTION REQUIRED
--------------------
$FAILED_CHECKS check(s) failed
$WARNING_CHECKS warning(s) detected

Please review the full logs for details.
"
    fi
    
    EMAIL_BODY+="
--
This is an automated health check report from ScholarMap.
For full details, check the server logs or run the health check script manually.
"
    
    # Try to send email using mail command (if available)
    if command -v mail &> /dev/null; then
        echo "$EMAIL_BODY" | mail -s "$EMAIL_SUBJECT" "$ADMIN_EMAIL" 2>/dev/null
        MAIL_EXIT=$?
        
        if [ $MAIL_EXIT -eq 0 ]; then
            echo -e "${GREEN}✓ Email report sent to $ADMIN_EMAIL${NC}"
        else
            echo -e "${YELLOW}⚠ Failed to send email (mail command failed)${NC}"
        fi
    elif command -v sendmail &> /dev/null; then
        # Try sendmail as fallback
        {
            echo "To: $ADMIN_EMAIL"
            echo "Subject: $EMAIL_SUBJECT"
            echo "Content-Type: text/plain; charset=UTF-8"
            echo ""
            echo "$EMAIL_BODY"
        } | sendmail -t 2>/dev/null
        
        SENDMAIL_EXIT=$?
        if [ $SENDMAIL_EXIT -eq 0 ]; then
            echo -e "${GREEN}✓ Email report sent to $ADMIN_EMAIL (via sendmail)${NC}"
        else
            echo -e "${YELLOW}⚠ Failed to send email (sendmail failed)${NC}"
        fi
    else
        # No mail command available, save to file
        REPORT_FILE="/tmp/scholarmap_health_report_$(date '+%Y%m%d_%H%M%S').txt"
        echo "$EMAIL_BODY" > "$REPORT_FILE"
        echo -e "${YELLOW}⚠ Mail command not available${NC}"
        echo -e "${CYAN}  Report saved to: $REPORT_FILE${NC}"
        echo -e "${CYAN}  To send manually: mail -s \"$EMAIL_SUBJECT\" $ADMIN_EMAIL < $REPORT_FILE${NC}"
    fi
    echo ""
fi

################################################################################
# Exit
################################################################################
if [ $OVERALL_STATUS -eq 0 ]; then
    [ "$ENVIRONMENT" != "production" ] && echo "Review the output above for details."
    exit 0
else
    echo "Review the output above for details."
    exit 1
fi
