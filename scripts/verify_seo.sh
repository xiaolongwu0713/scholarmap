#!/bin/bash

# SEO Verification Script for ScholarMap
# Usage: ./scripts/verify_seo.sh [URL]
# Example: ./scripts/verify_seo.sh https://scholarmap-frontend.onrender.com

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default URL
URL="${1:-https://scholarmap-frontend.onrender.com}"

echo "🔍 SEO Verification for ScholarMap"
echo "=================================="
echo "Target URL: $URL"
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for required tools
if ! command_exists curl; then
    echo -e "${RED}❌ curl is not installed. Please install it first.${NC}"
    exit 1
fi

# Test 1: Website Accessibility
echo "1️⃣  Testing website accessibility..."
HTTP_STATUS=$(curl -o /dev/null -s -w "%{http_code}\n" "$URL")
if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Website is accessible (HTTP $HTTP_STATUS)${NC}"
else
    echo -e "${RED}❌ Website returned HTTP $HTTP_STATUS${NC}"
fi
echo ""

# Test 2: Robots.txt
echo "2️⃣  Checking robots.txt..."
ROBOTS_STATUS=$(curl -o /dev/null -s -w "%{http_code}\n" "$URL/robots.txt")
if [ "$ROBOTS_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ robots.txt is accessible${NC}"
    echo "Content:"
    curl -s "$URL/robots.txt" | head -n 10
else
    echo -e "${RED}❌ robots.txt not found (HTTP $ROBOTS_STATUS)${NC}"
fi
echo ""

# Test 3: Sitemap.xml
echo "3️⃣  Checking sitemap.xml..."
SITEMAP_STATUS=$(curl -o /dev/null -s -w "%{http_code}\n" "$URL/sitemap.xml")
if [ "$SITEMAP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ sitemap.xml is accessible${NC}"
    URL_COUNT=$(curl -s "$URL/sitemap.xml" | grep -c "<loc>")
    echo "Number of URLs in sitemap: $URL_COUNT"
else
    echo -e "${RED}❌ sitemap.xml not found (HTTP $SITEMAP_STATUS)${NC}"
fi
echo ""

# Test 4: Manifest.json
echo "4️⃣  Checking manifest.json..."
MANIFEST_STATUS=$(curl -o /dev/null -s -w "%{http_code}\n" "$URL/manifest.json")
if [ "$MANIFEST_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ manifest.json is accessible${NC}"
else
    echo -e "${RED}❌ manifest.json not found (HTTP $MANIFEST_STATUS)${NC}"
fi
echo ""

# Test 5: Meta Tags
echo "5️⃣  Checking meta tags..."
HTML_CONTENT=$(curl -s "$URL")

# Check for title
if echo "$HTML_CONTENT" | grep -q "<title>"; then
    TITLE=$(echo "$HTML_CONTENT" | grep -o "<title>[^<]*" | sed 's/<title>//')
    echo -e "${GREEN}✅ Title tag found: $TITLE${NC}"
else
    echo -e "${RED}❌ Title tag not found${NC}"
fi

# Check for meta description
if echo "$HTML_CONTENT" | grep -q 'name="description"'; then
    echo -e "${GREEN}✅ Meta description found${NC}"
else
    echo -e "${RED}❌ Meta description not found${NC}"
fi

# Check for meta keywords
if echo "$HTML_CONTENT" | grep -q 'name="keywords"'; then
    echo -e "${GREEN}✅ Meta keywords found${NC}"
else
    echo -e "${YELLOW}⚠️  Meta keywords not found (optional)${NC}"
fi

# Check for viewport
if echo "$HTML_CONTENT" | grep -q 'name="viewport"'; then
    echo -e "${GREEN}✅ Viewport meta tag found${NC}"
else
    echo -e "${RED}❌ Viewport meta tag not found${NC}"
fi
echo ""

# Test 6: Open Graph Tags
echo "6️⃣  Checking Open Graph tags..."
OG_COUNT=0
if echo "$HTML_CONTENT" | grep -q 'property="og:title"'; then
    echo -e "${GREEN}✅ og:title found${NC}"
    ((OG_COUNT++))
fi
if echo "$HTML_CONTENT" | grep -q 'property="og:description"'; then
    echo -e "${GREEN}✅ og:description found${NC}"
    ((OG_COUNT++))
fi
if echo "$HTML_CONTENT" | grep -q 'property="og:image"'; then
    echo -e "${GREEN}✅ og:image found${NC}"
    ((OG_COUNT++))
fi
if echo "$HTML_CONTENT" | grep -q 'property="og:url"'; then
    echo -e "${GREEN}✅ og:url found${NC}"
    ((OG_COUNT++))
fi
if [ $OG_COUNT -eq 0 ]; then
    echo -e "${RED}❌ No Open Graph tags found${NC}"
fi
echo ""

# Test 7: Twitter Card Tags
echo "7️⃣  Checking Twitter Card tags..."
if echo "$HTML_CONTENT" | grep -q 'name="twitter:card"'; then
    echo -e "${GREEN}✅ Twitter Card tags found${NC}"
else
    echo -e "${RED}❌ Twitter Card tags not found${NC}"
fi
echo ""

# Test 8: Structured Data (JSON-LD)
echo "8️⃣  Checking structured data (JSON-LD)..."
JSONLD_COUNT=$(echo "$HTML_CONTENT" | grep -c 'application/ld+json')
if [ "$JSONLD_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Found $JSONLD_COUNT JSON-LD structured data blocks${NC}"
else
    echo -e "${RED}❌ No JSON-LD structured data found${NC}"
fi
echo ""

# Test 9: Canonical URL
echo "9️⃣  Checking canonical URL..."
if echo "$HTML_CONTENT" | grep -q 'rel="canonical"'; then
    echo -e "${GREEN}✅ Canonical URL found${NC}"
else
    echo -e "${YELLOW}⚠️  Canonical URL not found${NC}"
fi
echo ""

# Test 10: HTTPS
echo "🔟 Checking HTTPS..."
if [[ "$URL" == https://* ]]; then
    echo -e "${GREEN}✅ Using HTTPS${NC}"
else
    echo -e "${YELLOW}⚠️  Not using HTTPS${NC}"
fi
echo ""

# Summary
echo "=================================="
echo "📊 Verification Summary"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Test with Google Rich Results Test:"
echo "   https://search.google.com/test/rich-results?url=$URL"
echo ""
echo "2. Test with Google PageSpeed Insights:"
echo "   https://pagespeed.web.dev/analysis?url=$URL"
echo ""
echo "3. Test with Google Mobile-Friendly Test:"
echo "   https://search.google.com/test/mobile-friendly?url=$URL"
echo ""
echo "4. Submit sitemap to Google Search Console:"
echo "   $URL/sitemap.xml"
echo ""

# Optional: Save report to file
REPORT_FILE="seo_verification_report_$(date +%Y%m%d_%H%M%S).txt"
echo "💾 Full report saved to: $REPORT_FILE"

