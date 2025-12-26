#!/bin/bash

# Comprehensive API Testing Script
# Tests all endpoints with default user ID: 00000000-0000-0000-0000-000000000000

BASE_URL="http://localhost:8080/api"
USER_ID="00000000-0000-0000-0000-000000000000"

echo "🧪 Testing All Spring Boot APIs with User ID: $USER_ID"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local description=$5
    
    echo -n "Testing $description... "
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" 2>&1)
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" 2>&1)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        ((TESTS_PASSED++))
        if [ -n "$body" ]; then
            echo "$body" | jq '.' 2>/dev/null | head -10 || echo "$body" | head -5
        fi
        echo ""
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected HTTP $expected_status, got $http_code)"
        ((TESTS_FAILED++))
        echo "Response: $body"
        echo ""
        return 1
    fi
}

# Check if Spring Boot is running
echo "Checking Spring Boot health..."
if ! curl -s "$BASE_URL/actuator/health" > /dev/null 2>&1; then
    echo -e "${RED}❌ Spring Boot is not running at $BASE_URL${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Spring Boot is running${NC}"
echo ""

# Get or create a test sheet
echo "📋 Step 1: Getting/Creating test sheet..."
SHEET_RESPONSE=$(curl -s -X GET "$BASE_URL/sheets")
SHEET_ID=$(echo "$SHEET_RESPONSE" | jq -r '.data[0].id // empty' 2>/dev/null)

if [ -z "$SHEET_ID" ]; then
    echo "Creating test sheet..."
    SHEET_DATA='{"name":"API Test Sheet","pin":null}'
    CREATE_SHEET_RESPONSE=$(curl -s -X POST "$BASE_URL/sheets" \
        -H "Content-Type: application/json" \
        -d "$SHEET_DATA")
    SHEET_ID=$(echo "$CREATE_SHEET_RESPONSE" | jq -r '.data.id // empty' 2>/dev/null)
    
    if [ -z "$SHEET_ID" ]; then
        echo -e "${RED}❌ Failed to create test sheet${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Created test sheet: $SHEET_ID${NC}"
else
    echo -e "${GREEN}✓ Using existing sheet: $SHEET_ID${NC}"
fi
echo ""

# Test 1: GET /sheets
echo "📋 Testing Sheets Endpoints"
echo "---------------------------"
test_endpoint "GET" "/sheets" "" "200" "GET /sheets - List all sheets"

# Test 2: GET /sheets/{id}
test_endpoint "GET" "/sheets/$SHEET_ID" "" "200" "GET /sheets/{id} - Get single sheet"

# Test 3: GET /categories
echo "📂 Testing Categories Endpoints"
echo "------------------------------"
test_endpoint "GET" "/categories?sheetId=$SHEET_ID" "" "200" "GET /categories?sheetId= - List categories"

# Test 4: POST /categories (create a test category)
TEST_CATEGORY="test-category-$(date +%s)"
CATEGORY_DATA="{\"sheetId\":\"$SHEET_ID\",\"category\":\"$TEST_CATEGORY\"}"
test_endpoint "POST" "/categories" "$CATEGORY_DATA" "201" "POST /categories - Create category"

# Test 5: GET /expenses (no filters)
echo "💰 Testing Expenses Endpoints"
echo "-----------------------------"
test_endpoint "GET" "/expenses" "" "200" "GET /expenses - List all expenses"

# Test 6: GET /expenses?sheetId=
test_endpoint "GET" "/expenses?sheetId=$SHEET_ID" "" "200" "GET /expenses?sheetId= - Filter by sheet"

# Test 7: GET /expenses?sheetId=&month=
CURRENT_MONTH=$(date +%Y-%m)
test_endpoint "GET" "/expenses?sheetId=$SHEET_ID&month=$CURRENT_MONTH" "" "200" "GET /expenses?sheetId=&month= - Filter by month"

# Test 8: POST /expenses (create test expense)
EXPENSE_DATE=$(date +%Y-%m-%d)
EXPENSE_DATA="{\"date\":\"$EXPENSE_DATE\",\"amount\":99.99,\"category\":\"food\",\"description\":\"API Test Expense\",\"sheetId\":\"$SHEET_ID\",\"userId\":\"$USER_ID\"}"
CREATE_EXPENSE_RESPONSE=$(curl -s -X POST "$BASE_URL/expenses" \
    -H "Content-Type: application/json" \
    -d "$EXPENSE_DATA")
EXPENSE_ID=$(echo "$CREATE_EXPENSE_RESPONSE" | jq -r '.data.id // empty' 2>/dev/null)

if [ -n "$EXPENSE_ID" ]; then
    echo -e "${GREEN}✓ Created test expense: $EXPENSE_ID${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ Failed to create expense${NC}"
    echo "Response: $CREATE_EXPENSE_RESPONSE"
    ((TESTS_FAILED++))
fi
echo ""

# Test 9: GET /expenses/{id}
if [ -n "$EXPENSE_ID" ]; then
    test_endpoint "GET" "/expenses/$EXPENSE_ID" "" "200" "GET /expenses/{id} - Get single expense"
fi

# Test 10: PUT /expenses/{id}
if [ -n "$EXPENSE_ID" ]; then
    UPDATE_EXPENSE_DATA="{\"date\":\"$EXPENSE_DATE\",\"amount\":149.99,\"category\":\"food\",\"description\":\"Updated API Test Expense\",\"sheetId\":\"$SHEET_ID\",\"userId\":\"$USER_ID\"}"
    test_endpoint "PUT" "/expenses/$EXPENSE_ID" "$UPDATE_EXPENSE_DATA" "200" "PUT /expenses/{id} - Update expense"
fi

# Test 11: POST /descriptions
if [ -n "$EXPENSE_ID" ]; then
    echo "📝 Testing Descriptions Endpoints"
    echo "--------------------------------"
    DESC_DATA="{\"expenseId\":\"$EXPENSE_ID\",\"description\":\"API Test Description\",\"columnName\":\"notes\"}"
    test_endpoint "POST" "/descriptions" "$DESC_DATA" "201" "POST /descriptions - Create description"
fi

# Test 12: GET /descriptions
test_endpoint "GET" "/descriptions" "" "200" "GET /descriptions - List descriptions"

# Test 13: GET /analytics
echo "📊 Testing Analytics Endpoints"
echo "------------------------------"
test_endpoint "GET" "/analytics?sheetId=$SHEET_ID" "" "200" "GET /analytics?sheetId= - Get analytics"

# Test 14: GET /analytics with month filter
test_endpoint "GET" "/analytics?sheetId=$SHEET_ID&month=$CURRENT_MONTH" "" "200" "GET /analytics?sheetId=&month= - Monthly analytics"

# Test 15: DELETE /expenses/{id}
if [ -n "$EXPENSE_ID" ]; then
    test_endpoint "DELETE" "/expenses/$EXPENSE_ID" "" "200" "DELETE /expenses/{id} - Delete expense"
fi

# Test 16: DELETE /categories (cleanup)
test_endpoint "DELETE" "/categories" "{\"sheetId\":\"$SHEET_ID\",\"category\":\"$TEST_CATEGORY\"}" "200" "DELETE /categories - Delete category"

# Test 17: Verify user ID filtering - try accessing with different user ID (should still work since we allow all)
echo ""
echo "🔒 Testing User ID Access"
echo "-------------------------"
echo "Note: Current implementation uses DEFAULT_USER_ID for all requests"
echo "All endpoints should work regardless of user_id parameter"
echo ""

# Summary
echo ""
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi

