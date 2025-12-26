#!/bin/bash

# Comprehensive API Testing Script for Spring Boot Backend
# Tests all CRUD operations for the Expense Tracker API

BASE_URL="http://localhost:8080/api"
USER_ID="00000000-0000-0000-0000-000000000000"

echo "🧪 Testing Spring Boot Expense Tracker API"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test an endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local description=$5
    
    echo -n "Testing $description... "
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        ((TESTS_PASSED++))
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
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
echo "Checking if Spring Boot backend is running..."
if ! curl -s "$BASE_URL/actuator/health" > /dev/null 2>&1; then
    echo -e "${RED}❌ ERROR: Spring Boot backend is not running at $BASE_URL${NC}"
    echo "Please start the backend first: cd backend-springboot && ./mvnw spring-boot:run"
    exit 1
fi
echo -e "${GREEN}✓ Backend is running${NC}"
echo ""

# Get a test sheet ID (we'll use the first one or create one)
echo "📋 Step 1: Getting/Creating test sheet..."
SHEET_RESPONSE=$(curl -s -X GET "$BASE_URL/sheets" -H "Content-Type: application/json")
SHEET_ID=$(echo "$SHEET_RESPONSE" | jq -r '.data[0].id // empty' 2>/dev/null)

if [ -z "$SHEET_ID" ]; then
    echo "No sheets found, creating a test sheet..."
    SHEET_DATA='{"name":"Test Sheet","pin":null}'
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
test_endpoint "GET" "/categories?sheetId=$SHEET_ID" "" "200" "GET /categories - List categories"

# Test 4: POST /categories
CATEGORY_DATA="{\"sheetId\":\"$SHEET_ID\",\"category\":\"test-category-$(date +%s)\"}"
test_endpoint "POST" "/categories" "$CATEGORY_DATA" "201" "POST /categories - Create category"

# Test 5: GET /expenses
echo "💰 Testing Expenses Endpoints"
echo "-----------------------------"
test_endpoint "GET" "/expenses?sheetId=$SHEET_ID" "" "200" "GET /expenses - List expenses"

# Test 6: POST /expenses
EXPENSE_DATE=$(date +%Y-%m-%d)
EXPENSE_DATA="{\"date\":\"$EXPENSE_DATE\",\"amount\":100.50,\"category\":\"food\",\"description\":\"Test expense\",\"sheetId\":\"$SHEET_ID\",\"userId\":\"$USER_ID\"}"
CREATE_EXPENSE_RESPONSE=$(curl -s -X POST "$BASE_URL/expenses" \
    -H "Content-Type: application/json" \
    -d "$EXPENSE_DATA")
EXPENSE_ID=$(echo "$CREATE_EXPENSE_RESPONSE" | jq -r '.data.id // empty' 2>/dev/null)

if [ -n "$EXPENSE_ID" ]; then
    echo -e "${GREEN}✓ Created test expense: $EXPENSE_ID${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ Failed to create expense${NC}"
    ((TESTS_FAILED++))
fi
echo ""

# Test 7: GET /expenses/{id}
if [ -n "$EXPENSE_ID" ]; then
    test_endpoint "GET" "/expenses/$EXPENSE_ID" "" "200" "GET /expenses/{id} - Get single expense"
fi

# Test 8: PUT /expenses/{id}
if [ -n "$EXPENSE_ID" ]; then
    UPDATE_EXPENSE_DATA="{\"date\":\"$EXPENSE_DATE\",\"amount\":150.75,\"category\":\"food\",\"description\":\"Updated test expense\",\"sheetId\":\"$SHEET_ID\",\"userId\":\"$USER_ID\"}"
    test_endpoint "PUT" "/expenses/$EXPENSE_ID" "$UPDATE_EXPENSE_DATA" "200" "PUT /expenses/{id} - Update expense"
fi

# Test 9: POST /descriptions
if [ -n "$EXPENSE_ID" ]; then
    echo "📝 Testing Descriptions Endpoints"
    echo "--------------------------------"
    DESC_DATA="{\"expenseId\":\"$EXPENSE_ID\",\"description\":\"Test description\",\"columnName\":\"notes\"}"
    test_endpoint "POST" "/descriptions" "$DESC_DATA" "201" "POST /descriptions - Create description"
fi

# Test 10: GET /descriptions
test_endpoint "GET" "/descriptions" "" "200" "GET /descriptions - List descriptions"

# Test 11: GET /analytics
echo "📊 Testing Analytics Endpoints"
echo "------------------------------"
test_endpoint "GET" "/analytics?sheetId=$SHEET_ID" "" "200" "GET /analytics - Get analytics"

# Test 12: DELETE /expenses/{id}
if [ -n "$EXPENSE_ID" ]; then
    test_endpoint "DELETE" "/expenses/$EXPENSE_ID" "" "200" "DELETE /expenses/{id} - Delete expense"
fi

# Test 13: Error handling - GET non-existent expense
test_endpoint "GET" "/expenses/00000000-0000-0000-0000-000000000000" "" "404" "GET /expenses/{id} - Non-existent expense (404)"

# Test 14: Error handling - Invalid data
INVALID_DATA='{"date":"invalid","amount":"not-a-number"}'
test_endpoint "POST" "/expenses" "$INVALID_DATA" "400" "POST /expenses - Invalid data (400)"

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

