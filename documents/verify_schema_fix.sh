#!/bin/bash

# Schema.org Dataset Fix Verification Script
# 用于验证 DataSourceCitation 组件的结构化数据是否正确

echo "================================================"
echo "Schema.org Dataset Fix Verification"
echo "================================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试 URL
TEST_URL="https://scholarmap-frontend.onrender.com/research-jobs/ai-drug-discovery"

echo -e "${BLUE}Testing URL:${NC} $TEST_URL"
echo ""

# 1. 检查页面是否可访问
echo -e "${BLUE}[1/5] Checking page accessibility...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$TEST_URL")
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓${NC} Page is accessible (HTTP $HTTP_CODE)"
else
    echo -e "${RED}✗${NC} Page returned HTTP $HTTP_CODE"
    exit 1
fi
echo ""

# 2. 检查 JSON-LD 是否存在
echo -e "${BLUE}[2/5] Checking for JSON-LD structured data...${NC}"
PAGE_CONTENT=$(curl -s "$TEST_URL")
if echo "$PAGE_CONTENT" | grep -q 'type="application/ld+json"'; then
    echo -e "${GREEN}✓${NC} JSON-LD script tags found"
    JSON_LD_COUNT=$(echo "$PAGE_CONTENT" | grep -o 'type="application/ld+json"' | wc -l)
    echo -e "  Found ${GREEN}$JSON_LD_COUNT${NC} JSON-LD blocks"
else
    echo -e "${RED}✗${NC} No JSON-LD script tags found"
    exit 1
fi
echo ""

# 3. 提取并验证 Dataset schema
echo -e "${BLUE}[3/5] Extracting Dataset schema...${NC}"

# 提取所有 JSON-LD 并检查是否有 Dataset 类型
TEMP_FILE="/tmp/scholarmap_jsonld.html"
echo "$PAGE_CONTENT" > "$TEMP_FILE"

# 使用 Python 提取和验证（如果安装了 Python）
if command -v python3 &> /dev/null; then
    VALIDATION_RESULT=$(python3 << 'EOF'
import sys
import json
import re

try:
    with open('/tmp/scholarmap_jsonld.html', 'r') as f:
        content = f.read()
    
    # 提取所有 JSON-LD
    pattern = r'<script type="application/ld\+json">(.*?)</script>'
    jsonld_blocks = re.findall(pattern, content, re.DOTALL)
    
    dataset_found = False
    dataset_schema = None
    
    for block in jsonld_blocks:
        try:
            data = json.loads(block)
            # 检查是否是 Dataset 类型（可能在数组中）
            if isinstance(data, list):
                for item in data:
                    if isinstance(item, dict) and item.get('@type') == 'Dataset':
                        dataset_found = True
                        dataset_schema = item
                        break
            elif isinstance(data, dict) and data.get('@type') == 'Dataset':
                dataset_found = True
                dataset_schema = data
                break
        except json.JSONDecodeError:
            continue
    
    if dataset_found:
        print("FOUND")
        # 验证必需字段
        required_fields = ['name', 'description', 'url', 'license', 'creator', 'distribution']
        missing_fields = []
        for field in required_fields:
            if field not in dataset_schema:
                missing_fields.append(field)
        
        if missing_fields:
            print("MISSING:" + ",".join(missing_fields))
        else:
            print("COMPLETE")
            
            # 检查额外字段
            if 'distribution' in dataset_schema:
                dist = dataset_schema['distribution'][0] if isinstance(dataset_schema['distribution'], list) else dataset_schema['distribution']
                if 'contentUrl' in dist and 'encodingFormat' in dist:
                    print("DISTRIBUTION_OK")
                else:
                    print("DISTRIBUTION_INCOMPLETE")
            
            if 'creator' in dataset_schema and isinstance(dataset_schema['creator'], dict):
                if dataset_schema['creator'].get('@type') == 'Organization':
                    print("CREATOR_OK")
                else:
                    print("CREATOR_WRONG_TYPE")
    else:
        print("NOT_FOUND")
        
except Exception as e:
    print(f"ERROR:{str(e)}")
EOF
)

    if echo "$VALIDATION_RESULT" | grep -q "FOUND"; then
        echo -e "${GREEN}✓${NC} Dataset schema found"
        
        if echo "$VALIDATION_RESULT" | grep -q "COMPLETE"; then
            echo -e "${GREEN}✓${NC} All required fields present:"
            echo "  - name"
            echo "  - description"
            echo "  - url"
            echo "  - license"
            echo "  - creator"
            echo "  - distribution"
            
            if echo "$VALIDATION_RESULT" | grep -q "DISTRIBUTION_OK"; then
                echo -e "${GREEN}✓${NC} Distribution includes contentUrl and encodingFormat"
            fi
            
            if echo "$VALIDATION_RESULT" | grep -q "CREATOR_OK"; then
                echo -e "${GREEN}✓${NC} Creator is Organization type"
            fi
        else
            MISSING=$(echo "$VALIDATION_RESULT" | grep "MISSING:" | cut -d: -f2)
            echo -e "${RED}✗${NC} Missing required fields: $MISSING"
        fi
    else
        echo -e "${RED}✗${NC} Dataset schema not found"
    fi
else
    echo -e "${YELLOW}⚠${NC} Python3 not found, skipping detailed validation"
    # 简单检查关键字
    if echo "$PAGE_CONTENT" | grep -q '"@type":"Dataset"'; then
        echo -e "${GREEN}✓${NC} Dataset type found (basic check)"
    else
        echo -e "${RED}✗${NC} Dataset type not found"
    fi
fi
echo ""

# 4. 检查其他结构化数据
echo -e "${BLUE}[4/5] Checking other structured data types...${NC}"

check_schema_type() {
    local type=$1
    if echo "$PAGE_CONTENT" | grep -q "\"@type\":\"$type\""; then
        echo -e "${GREEN}✓${NC} $type found"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} $type not found"
        return 1
    fi
}

check_schema_type "BreadcrumbList"
check_schema_type "ResearchProject"
check_schema_type "FAQPage"
echo ""

# 5. Google Rich Results Test 链接
echo -e "${BLUE}[5/5] Next steps:${NC}"
echo ""
echo "1. Test with Google Rich Results Test:"
echo -e "   ${BLUE}https://search.google.com/test/rich-results?url=$(echo "$TEST_URL" | sed 's/:/%3A/g; s|/|%2F|g')${NC}"
echo ""
echo "2. Test with Schema.org Validator:"
echo -e "   ${BLUE}https://validator.schema.org/#url=$(echo "$TEST_URL" | sed 's/:/%3A/g; s|/|%2F|g')${NC}"
echo ""
echo "3. Request indexing in Google Search Console:"
echo -e "   ${BLUE}https://search.google.com/search-console${NC}"
echo "   → URL Inspection → Enter URL → Request Indexing"
echo ""

# 清理临时文件
rm -f "$TEMP_FILE"

echo "================================================"
echo -e "${GREEN}Verification complete!${NC}"
echo "================================================"
