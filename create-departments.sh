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
echo "1. Creating CCS - College of Computer Studies..."
curl -X POST "$BASE_URL/api/departments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"College of Computer Studies","code":"CCS","description":"Computer Science and IT programs","isActive":true}'
echo ""
echo ""

# Create CBA
echo "2. Creating CBA - College of Business Administration..."
curl -X POST "$BASE_URL/api/departments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"College of Business Administration","code":"CBA","description":"Business and Management programs","isActive":true}'
echo ""
echo ""

# Create CAS
echo "3. Creating CAS - College of Arts and Sciences..."
curl -X POST "$BASE_URL/api/departments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"College of Arts and Sciences","code":"CAS","description":"Liberal Arts and Sciences programs","isActive":true}'
echo ""
echo ""

# Create BED
echo "4. Creating BED - College of Basic Education..."
curl -X POST "$BASE_URL/api/departments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"College of Basic Education","code":"BED","description":"Basic education programs","isActive":true}'
echo ""
echo ""

# Create SOA
echo "5. Creating SOA - College of Aviation..."
curl -X POST "$BASE_URL/api/departments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"College of Aviation","code":"SOA","description":"Aviation programs","isActive":true}'
echo ""
echo ""

# Create CRIM
echo "6. Creating CRIM - College of Criminology..."
curl -X POST "$BASE_URL/api/departments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"College of Criminology","code":"CRIM","description":"Criminology programs","isActive":true}'
echo ""
echo ""

# Create EDUC
echo "7. Creating EDUC - College of Education..."
curl -X POST "$BASE_URL/api/departments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"College of Education","code":"EDUC","description":"Education programs","isActive":true}'
echo ""
echo ""

# Create COEA
echo "8. Creating COEA - College of Engineering & Architecture..."
curl -X POST "$BASE_URL/api/departments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"College of Engineering & Architecture","code":"COEA","description":"Engineering and Architecture programs","isActive":true}'
echo ""
echo ""

# Create CIHM
echo "9. Creating CIHM - College of International Hospitality Management..."
curl -X POST "$BASE_URL/api/departments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"College of International Hospitality Management","code":"CIHM","description":"Hospitality management programs","isActive":true}'
echo ""
echo ""

# Create CME
echo "10. Creating CME - College of Maritime..."
curl -X POST "$BASE_URL/api/departments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"College of Maritime","code":"CME","description":"Maritime education programs","isActive":true}'
echo ""
echo ""

# Create LJD
echo "11. Creating LJD - College of Law/ Juris Doctor..."
curl -X POST "$BASE_URL/api/departments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"College of Law/ Juris Doctor","code":"LJD","description":"Law and Juris Doctor programs","isActive":true}'
echo ""
echo ""

# Create GRAD
echo "12. Creating GRAD - Graduate School..."
curl -X POST "$BASE_URL/api/departments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Graduate School","code":"GRAD","description":"Graduate programs","isActive":true}'
echo ""
echo ""

echo "Done! All departments created."
