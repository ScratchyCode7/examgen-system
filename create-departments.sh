#!/bin/bash

# Get admin token
TOKEN=$(curl -s -X POST https://examgen-system.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}' | jq -r '.accessToken')

echo "Creating departments..."
echo ""

# Create CCS
echo "1. Creating CCS - College of Computer Studies..."
curl -X POST https://examgen-system.onrender.com/api/departments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"College of Computer Studies","code":"CCS","description":"Computer Science and IT programs","isActive":true}'
echo ""
echo ""

# Create CBA
echo "2. Creating CBA - College of Business Administration..."
curl -X POST https://examgen-system.onrender.com/api/departments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"College of Business Administration","code":"CBA","description":"Business and Management programs","isActive":true}'
echo ""
echo ""

# Create CAS
echo "3. Creating CAS - College of Arts and Sciences..."
curl -X POST https://examgen-system.onrender.com/api/departments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"College of Arts and Sciences","code":"CAS","description":"Liberal Arts and Sciences programs","isActive":true}'
echo ""
echo ""

echo "Done! All departments created."
