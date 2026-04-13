#!/bin/bash

# Base API URL (defaults to local dev)
BASE_URL="${BASE_URL:-http://localhost:5012}"

# Get admin token
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}' | jq -r '.accessToken')

echo "Creating departments..."
echo ""

# Create CCS
echo "1. Creating CCS - COMPUTER STUDIES..."
curl -X POST "$BASE_URL/api/departments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"COMPUTER STUDIES","code":"CCS","description":"Computer Science and IT programs","isActive":true}'
echo ""
echo ""

# Create CBA
echo "2. Creating CBA - BUSINESS & ACCOUNTANCY..."
curl -X POST "$BASE_URL/api/departments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"BUSINESS & ACCOUNTANCY","code":"CBA","description":"Business and Management programs","isActive":true}'
echo ""
echo ""

# Create CAS
echo "3. Creating CAS - ARTS & SCIENCES..."
curl -X POST "$BASE_URL/api/departments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"ARTS & SCIENCES","code":"CAS","description":"Liberal Arts and Sciences programs","isActive":true}'
echo ""
echo ""

# Create BED
echo "4. Creating BED - BASIC EDUCATION..."
curl -X POST "$BASE_URL/api/departments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"BASIC EDUCATION","code":"BED","description":"Basic education programs","isActive":true}'
echo ""
echo ""

# Create SOA
echo "5. Creating SOA - AVIATION..."
curl -X POST "$BASE_URL/api/departments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"AVIATION","code":"SOA","description":"Aviation programs","isActive":true}'
echo ""
echo ""

# Create CRIM
echo "6. Creating CRIM - CRIMINOLOGY..."
curl -X POST "$BASE_URL/api/departments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"CRIMINOLOGY","code":"CRIM","description":"Criminology programs","isActive":true}'
echo ""
echo ""

# Create EDUC
echo "7. Creating EDUC - EDUCATION..."
curl -X POST "$BASE_URL/api/departments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"EDUCATION","code":"EDUC","description":"Education programs","isActive":true}'
echo ""
echo ""

# Create COEA
echo "8. Creating COEA - ENGINEERING & ARCHITECTURE..."
curl -X POST "$BASE_URL/api/departments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"ENGINEERING & ARCHITECTURE","code":"COEA","description":"Engineering and Architecture programs","isActive":true}'
echo ""
echo ""

# Create CIHM
echo "9. Creating CIHM - INTERNATIONAL HOSPITALITY MANAGEMENT..."
curl -X POST "$BASE_URL/api/departments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"INTERNATIONAL HOSPITALITY MANAGEMENT","code":"CIHM","description":"Hospitality management programs","isActive":true}'
echo ""
echo ""

# Create CME
echo "10. Creating CME - MARITIME..."
curl -X POST "$BASE_URL/api/departments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"MARITIME","code":"CME","description":"Maritime education programs","isActive":true}'
echo ""
echo ""

# Create LJD
echo "11. Creating LJD - LAW/JURIS DOCTOR..."
curl -X POST "$BASE_URL/api/departments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"LAW/JURIS DOCTOR","code":"LJD","description":"Law and Juris Doctor programs","isActive":true}'
echo ""
echo ""

# Create GRAD
echo "12. Creating GRAD - GRADUATE SCHOOL..."
curl -X POST "$BASE_URL/api/departments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"GRADUATE SCHOOL","code":"GRAD","description":"Graduate programs","isActive":true}'
echo ""
echo ""

echo "Done! All departments created."
