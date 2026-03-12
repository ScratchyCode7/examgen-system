#!/bin/bash
# Quick deployment verification script

echo "🔍 Databank Deployment Verification"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Ask for URLs
read -p "Enter your backend URL (e.g., https://databank-backend.onrender.com): " BACKEND_URL
read -p "Enter your frontend URL (e.g., https://databank-frontend.vercel.app): " FRONTEND_URL

echo ""
echo "Testing backend..."
echo ""

# Test backend health
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL")
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓${NC} Backend is accessible (HTTP $HEALTH_RESPONSE)"
else
    echo -e "${RED}✗${NC} Backend connection failed (HTTP $HEALTH_RESPONSE)"
fi

# Test login endpoint
echo ""
echo "Testing login endpoint..."
LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"Admin123!"}' \
    -w "\n%{http_code}")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓${NC} Login endpoint works (HTTP $HTTP_CODE)"
    
    # Check if token exists in response
    if echo "$RESPONSE_BODY" | grep -q "accessToken"; then
        echo -e "${GREEN}✓${NC} JWT token received"
    else
        echo -e "${YELLOW}⚠${NC} Response received but no token found"
    fi
else
    echo -e "${RED}✗${NC} Login endpoint failed (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
fi

echo ""
echo "Testing frontend..."
echo ""

# Test frontend
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓${NC} Frontend is accessible (HTTP $FRONTEND_RESPONSE)"
else
    echo -e "${RED}✗${NC} Frontend connection failed (HTTP $FRONTEND_RESPONSE)"
fi

echo ""
echo "====================================="
echo "Verification Summary"
echo "====================================="
echo ""
echo "Backend URL: $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
echo ""

if [ "$HEALTH_RESPONSE" = "200" ] && [ "$HTTP_CODE" = "200" ] && [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ All systems operational!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Open $FRONTEND_URL in your browser"
    echo "2. Login with admin credentials"
    echo "3. Test creating a question"
    echo "4. Test generating an exam"
else
    echo -e "${RED}⚠ Some systems are not responding${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check Render logs for backend errors"
    echo "2. Verify environment variables are set correctly"
    echo "3. Check CORS configuration in Program.cs"
    echo "4. Ensure database connection string is valid"
fi

echo ""
