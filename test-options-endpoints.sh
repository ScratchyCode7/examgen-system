#!/bin/bash

# ========================================
# Options API Testing Script
# ========================================
# This script tests all CRUD operations for Options endpoints
# Make sure backend is running on http://localhost:5000
# And you have admin credentials: admin/Admin123!

BASE_URL="http://localhost:5000"
QUESTION_ID=1  # Use an existing question ID from your database

echo "=========================================="
echo "Options API Testing"
echo "=========================================="
echo ""

# Step 1: Login to get JWT token
echo "Step 1: Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken // empty')

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful!"
echo "Token: ${TOKEN:0:50}..."
echo ""

# Step 2: Create Option 1
echo "Step 2: Creating Option 1..."
CREATE_RESPONSE_1=$(curl -s -X POST "$BASE_URL/api/options" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"questionId\": $QUESTION_ID,
    \"content\": \"This is the correct answer\",
    \"isCorrect\": true,
    \"displayOrder\": 1
  }")

OPTION_ID_1=$(echo "$CREATE_RESPONSE_1" | jq -r '.id // empty')

if [ -z "$OPTION_ID_1" ]; then
  echo "❌ Failed to create Option 1"
  echo "Response: $CREATE_RESPONSE_1"
else
  echo "✅ Option 1 created successfully!"
  echo "Option ID: $OPTION_ID_1"
  echo "$CREATE_RESPONSE_1" | jq .
fi
echo ""

# Step 3: Create Option 2
echo "Step 3: Creating Option 2..."
CREATE_RESPONSE_2=$(curl -s -X POST "$BASE_URL/api/options" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"questionId\": $QUESTION_ID,
    \"content\": \"This is an incorrect answer\",
    \"isCorrect\": false,
    \"displayOrder\": 2
  }")

OPTION_ID_2=$(echo "$CREATE_RESPONSE_2" | jq -r '.id // empty')

if [ -z "$OPTION_ID_2" ]; then
  echo "❌ Failed to create Option 2"
  echo "Response: $CREATE_RESPONSE_2"
else
  echo "✅ Option 2 created successfully!"
  echo "Option ID: $OPTION_ID_2"
  echo "$CREATE_RESPONSE_2" | jq .
fi
echo ""

# Step 4: Get all options for the question
echo "Step 4: Listing all options for Question $QUESTION_ID..."
LIST_RESPONSE=$(curl -s -X GET "$BASE_URL/api/options?questionId=$QUESTION_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "✅ Options retrieved:"
echo "$LIST_RESPONSE" | jq .
echo ""

# Step 5: Get single option
if [ ! -z "$OPTION_ID_1" ]; then
  echo "Step 5: Getting Option $OPTION_ID_1..."
  GET_RESPONSE=$(curl -s -X GET "$BASE_URL/api/options/$OPTION_ID_1" \
    -H "Authorization: Bearer $TOKEN")
  
  echo "✅ Option retrieved:"
  echo "$GET_RESPONSE" | jq .
  echo ""
fi

# Step 6: Update option
if [ ! -z "$OPTION_ID_1" ]; then
  echo "Step 6: Updating Option $OPTION_ID_1..."
  UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/options/$OPTION_ID_1" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{
      \"questionId\": $QUESTION_ID,
      \"content\": \"Updated correct answer text\",
      \"isCorrect\": true,
      \"displayOrder\": 1
    }")
  
  echo "✅ Option updated:"
  echo "$UPDATE_RESPONSE" | jq .
  echo ""
fi

# Step 7: Delete option
if [ ! -z "$OPTION_ID_2" ]; then
  echo "Step 7: Deleting Option $OPTION_ID_2..."
  DELETE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X DELETE "$BASE_URL/api/options/$OPTION_ID_2" \
    -H "Authorization: Bearer $TOKEN")
  
  HTTP_STATUS=$(echo "$DELETE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
  if [ "$HTTP_STATUS" == "204" ]; then
    echo "✅ Option deleted successfully (HTTP 204)"
  else
    echo "❌ Delete failed with status: $HTTP_STATUS"
  fi
  echo ""
fi

# Step 8: List options again to verify deletion
echo "Step 8: Listing options again to verify deletion..."
LIST_RESPONSE=$(curl -s -X GET "$BASE_URL/api/options?questionId=$QUESTION_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "✅ Current options:"
echo "$LIST_RESPONSE" | jq .
echo ""

echo "=========================================="
echo "✅ All tests completed!"
echo "=========================================="
