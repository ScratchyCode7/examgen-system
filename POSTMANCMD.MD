# ========================================
# 1. SEED ADMIN (Bootstrap)
# ========================================
curl -X POST http://localhost:5000/api/users/seed-admin \
  -H "Content-Type: application/json"

# Response: {"message":"Admin user created successfully","username":"admin","password":"Admin123!"}
# Save this token for authenticated requests below
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# ========================================
# 2. LOGIN AS ADMIN (Get JWT Token)
# ========================================
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}'

# Response: {"accessToken":"YOUR_TOKEN","expiresAt":"..."}
# Copy the accessToken and use it below as Bearer YOUR_TOKEN

# ========================================
# 3. CREATE DEPARTMENTS
# ========================================

# Department 1: College of Computer Studies
curl -X POST http://localhost:5000/api/departments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "College of Computer Studies",
    "code": "CCS",
    "description": "Computer Science Education"
  }'

# Department 2: College of Business & Accountancy
curl -X POST http://localhost:5000/api/departments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "College of Business & Accountancy",
    "code": "CBA",
    "description": "Business and Accountancy Programs"
  }'

# ========================================
# 4. CREATE COURSES (Degree Programs)
# ========================================

# Courses for CCS (DepartmentId: 1)
curl -X POST http://localhost:5000/api/courses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "departmentId": 1,
    "name": "Bachelor of Science in Computer Science",
    "code": "BSCS",
    "description": "Computer Science degree program"
  }'

curl -X POST http://localhost:5000/api/courses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "departmentId": 1,
    "name": "Bachelor of Science in Information Technology (Specialization in Game Development)",
    "code": "BSIT-GD",
    "description": "Game Development specialization"
  }'

curl -X POST http://localhost:5000/api/courses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "departmentId": 1,
    "name": "Bachelor of Science in Entertainment and Multimedia Computing",
    "code": "BSEMC",
    "description": "Entertainment & Multimedia Computing"
  }'

curl -X POST http://localhost:5000/api/courses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "departmentId": 1,
    "name": "Bachelor of Information Technology (Major in Cybersecurity and Forensics)",
    "code": "BIT-CSF",
    "description": "Cybersecurity & Forensics major"
  }'

# Courses for CBA (DepartmentId: 2)
curl -X POST http://localhost:5000/api/courses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "departmentId": 2,
    "name": "Bachelor of Science in Accountancy",
    "code": "BSA",
    "description": "Accountancy degree program"
  }'

curl -X POST http://localhost:5000/api/courses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "departmentId": 2,
    "name": "Bachelor of Science in Business Administration",
    "code": "BSBA",
    "description": "Business Administration program"
  }'

# ========================================
# 5. CREATE SUBJECTS (Courses/Classes)
# ========================================

# Subjects for BSCS (CourseId: 1)
curl -X POST http://localhost:5000/api/subjects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "courseId": 1,
    "name": "Discrete Structures 1",
    "code": "CS101",
    "description": "Fundamental discrete mathematics concepts"
  }'

curl -X POST http://localhost:5000/api/subjects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "courseId": 1,
    "name": "Data Structures",
    "code": "CS102",
    "description": "Arrays, linked lists, trees, graphs"
  }'

curl -X POST http://localhost:5000/api/subjects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "courseId": 1,
    "name": "Algorithms",
    "code": "CS103",
    "description": "Algorithm design and analysis"
  }'

# Subjects for BSA (CourseId: 5)
curl -X POST http://localhost:5000/api/subjects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "courseId": 5,
    "name": "Financial Accounting",
    "code": "ACC101",
    "description": "Introduction to financial accounting"
  }'

curl -X POST http://localhost:5000/api/subjects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "courseId": 5,
    "name": "Auditing",
    "code": "ACC202",
    "description": "Auditing principles and practices"
  }'

# ========================================
# 6. CREATE TOPICS (Syllabus Units/Lessons)
# ========================================

# Topics for Discrete Structures 1 (SubjectId: 1)
curl -X POST http://localhost:5000/api/topics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "subjectId": 1,
    "title": "Set Theory Basics",
    "description": "Introduction to sets, operations, and relations",
    "sequenceOrder": 1,
    "allocatedHours": 5.0
  }'

curl -X POST http://localhost:5000/api/topics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "subjectId": 1,
    "title": "Logic and Proofs",
    "description": "Propositional logic, predicates, proof techniques",
    "sequenceOrder": 2,
    "allocatedHours": 6.0
  }'

curl -X POST http://localhost:5000/api/topics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "subjectId": 1,
    "title": "Functions and Relations",
    "description": "Functions, injective, surjective, bijective",
    "sequenceOrder": 3,
    "allocatedHours": 4.5
  }'

# Topics for Data Structures (SubjectId: 2)
curl -X POST http://localhost:5000/api/topics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "subjectId": 2,
    "title": "Arrays and Lists",
    "description": "Array operations, linked lists, stacks, queues",
    "sequenceOrder": 1,
    "allocatedHours": 5.5
  }'

curl -X POST http://localhost:5000/api/topics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "subjectId": 2,
    "title": "Trees and Graphs",
    "description": "Binary trees, balanced trees, graph theory",
    "sequenceOrder": 2,
    "allocatedHours": 6.5
  }'

# Topics for Financial Accounting (SubjectId: 4)
curl -X POST http://localhost:5000/api/topics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "subjectId": 4,
    "title": "Balance Sheet Preparation",
    "description": "Assets, liabilities, equity classification",
    "sequenceOrder": 1,
    "allocatedHours": 4.0
  }'

# ========================================
# 7. CREATE QUESTIONS (with Bloom Levels)
# ========================================

# Questions for Set Theory (TopicId: 1) - Bloom Level 1 (Remember)
curl -X POST http://localhost:5000/api/questions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "topicId": 1,
    "content": "What is a set?",
    "questionType": "MCQ",
    "bloomLevel": 1,
    "points": 1
  }'

curl -X POST http://localhost:5000/api/questions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "topicId": 1,
    "content": "Which of the following is a valid set notation?",
    "questionType": "MCQ",
    "bloomLevel": 1,
    "points": 1
  }'

# Questions for Set Theory (TopicId: 1) - Bloom Level 2 (Understand)
curl -X POST http://localhost:5000/api/questions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "topicId": 1,
    "content": "Explain the difference between a set and a subset",
    "questionType": "Essay",
    "bloomLevel": 2,
    "points": 3
  }'

# Questions for Set Theory (TopicId: 1) - Bloom Level 3 (Apply)
curl -X POST http://localhost:5000/api/questions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "topicId": 1,
    "content": "Given sets A={1,2,3} and B={2,3,4}, find A ∩ B",
    "questionType": "MCQ",
    "bloomLevel": 3,
    "points": 2
  }'

# Questions for Logic and Proofs (TopicId: 2) - Bloom Level 4 (Analyze)
curl -X POST http://localhost:5000/api/questions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "topicId": 2,
    "content": "Analyze the logical equivalence of: (p→q) ≡ (¬p∨q)",
    "questionType": "Essay",
    "bloomLevel": 4,
    "points": 4
  }'

# Questions for Logic and Proofs (TopicId: 2) - Bloom Level 5 (Evaluate)
curl -X POST http://localhost:5000/api/questions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "topicId": 2,
    "content": "Evaluate which proof technique is most appropriate for proving divisibility: direct proof, contradiction, or induction?",
    "questionType": "Essay",
    "bloomLevel": 5,
    "points": 5
  }'

# Questions for Logic and Proofs (TopicId: 2) - Bloom Level 6 (Create)
curl -X POST http://localhost:5000/api/questions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "topicId": 2,
    "content": "Create a formal proof for the theorem: For all integers n, if n is even then n² is even",
    "questionType": "Essay",
    "bloomLevel": 6,
    "points": 5
  }'

# Questions for Arrays and Lists (TopicId: 4) - Bloom Level 1-3
curl -X POST http://localhost:5000/api/questions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "topicId": 4,
    "content": "What is the time complexity of linear search?",
    "questionType": "MCQ",
    "bloomLevel": 1,
    "points": 1
  }'

curl -X POST http://localhost:5000/api/questions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "topicId": 4,
    "content": "Explain why binary search requires a sorted array",
    "questionType": "Essay",
    "bloomLevel": 2,
    "points": 3
  }'

curl -X POST http://localhost:5000/api/questions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "topicId": 4,
    "content": "Implement a stack using two queues",
    "questionType": "Essay",
    "bloomLevel": 3,
    "points": 4
  }'

# Questions for Balance Sheet (TopicId: 6) - Accounting
curl -X POST http://localhost:5000/api/questions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "topicId": 6,
    "content": "Cash is classified as what type of asset?",
    "questionType": "MCQ",
    "bloomLevel": 1,
    "points": 1
  }'

curl -X POST http://localhost:5000/api/questions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "topicId": 6,
    "content": "Distinguish between current and non-current liabilities",
    "questionType": "Essay",
    "bloomLevel": 2,
    "points": 3
  }'

# ========================================
# 8. CREATE OPTIONS (Multiple Choice Answers)
# ========================================

# For "What is a set?" (QuestionId: 1)
curl -X POST http://localhost:5000/api/options \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "questionId": 1,
    "content": "A collection of distinct objects",
    "isCorrect": true,
    "displayOrder": 1
  }'

curl -X POST http://localhost:5000/api/options \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "questionId": 1,
    "content": "A list of numbers in order",
    "isCorrect": false,
    "displayOrder": 2
  }'

curl -X POST http://localhost:5000/api/options \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "questionId": 1,
    "content": "A type of mathematical equation",
    "isCorrect": false,
    "displayOrder": 3
  }'

curl -X POST http://localhost:5000/api/options \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "questionId": 1,
    "content": "A sequence of events",
    "isCorrect": false,
    "displayOrder": 4
  }'

# For "Which of the following is a valid set notation?" (QuestionId: 2)
curl -X POST http://localhost:5000/api/options \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "questionId": 2,
    "content": "{1, 2, 3}",
    "isCorrect": true,
    "displayOrder": 1
  }'

curl -X POST http://localhost:5000/api/options \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "questionId": 2,
    "content": "(1, 2, 3)",
    "isCorrect": false,
    "displayOrder": 2
  }'

curl -X POST http://localhost:5000/api/options \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "questionId": 2,
    "content": "[1, 2, 3]",
    "isCorrect": false,
    "displayOrder": 3
  }'

curl -X POST http://localhost:5000/api/options \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "questionId": 2,
    "content": "1, 2, 3",
    "isCorrect": false,
    "displayOrder": 4
  }'

# For "Given sets A={1,2,3} and B={2,3,4}, find A ∩ B" (QuestionId: 4)
curl -X POST http://localhost:5000/api/options \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "questionId": 4,
    "content": "{2, 3}",
    "isCorrect": true,
    "displayOrder": 1
  }'

curl -X POST http://localhost:5000/api/options \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "questionId": 4,
    "content": "{1, 2, 3, 4}",
    "isCorrect": false,
    "displayOrder": 2
  }'

curl -X POST http://localhost:5000/api/options \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "questionId": 4,
    "content": "{1, 4}",
    "isCorrect": false,
    "displayOrder": 3
  }'

curl -X POST http://localhost:5000/api/options \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "questionId": 4,
    "content": "{}",
    "isCorrect": false,
    "displayOrder": 4
  }'

# For "What is the time complexity of linear search?" (QuestionId: 11)
curl -X POST http://localhost:5000/api/options \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "questionId": 11,
    "content": "O(n)",
    "isCorrect": true,
    "displayOrder": 1
  }'

curl -X POST http://localhost:5000/api/options \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "questionId": 11,
    "content": "O(1)",
    "isCorrect": false,
    "displayOrder": 2
  }'

curl -X POST http://localhost:5000/api/options \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "questionId": 11,
    "content": "O(log n)",
    "isCorrect": false,
    "displayOrder": 3
  }'

curl -X POST http://localhost:5000/api/options \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "questionId": 11,
    "content": "O(n²)",
    "isCorrect": false,
    "displayOrder": 4
  }'

# For "Cash is classified as what type of asset?" (QuestionId: 14)
curl -X POST http://localhost:5000/api/options \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "questionId": 14,
    "content": "Current asset",
    "isCorrect": true,
    "displayOrder": 1
  }'

curl -X POST http://localhost:5000/api/options \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "questionId": 14,
    "content": "Non-current asset",
    "isCorrect": false,
    "displayOrder": 2
  }'

curl -X POST http://localhost:5000/api/options \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "questionId": 14,
    "content": "Liability",
    "isCorrect": false,
    "displayOrder": 3
  }'

curl -X POST http://localhost:5000/api/options \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "questionId": 14,
    "content": "Equity",
    "isCorrect": false,
    "displayOrder": 4
  }'

# ========================================
# 9. CREATE NON-ADMIN USER (Faculty/Instructor)
# ========================================

curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe",
    "password": "SecurePass123!",
    "email": "john.doe@university.edu",
    "departmentId": 1,
    "isAdmin": false
  }'

# Create another non-admin user (Faculty from CCS)
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "firstName": "Jane",
    "lastName": "Smith",
    "username": "janesmith",
    "password": "SecurePass123!",
    "email": "jane.smith@university.edu",
    "departmentId": 2,
    "isAdmin": false
  }'

# Create another non-admin user (Test Coordinator)
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "firstName": "Robert",
    "lastName": "Johnson",
    "username": "rjohnson",
    "password": "SecurePass123!",
    "email": "robert.johnson@university.edu",
    "departmentId": 1,
    "isAdmin": false
  }'

# ========================================
# 10. LOGIN AS NON-ADMIN USER
# ========================================

curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"johndoe","password":"SecurePass123!"}'

# Response: Get token for johndoe to use in subsequent requests

# ========================================
# 11. GENERATE A TEST (Exam) - REQUIRES STEP 2 COMPLETION
# ========================================

# Generate test from Discrete Structures 1
# NOTE: This requires the Test Generation endpoint to be fully implemented
curl -X POST http://localhost:5000/api/tests/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "subjectId": 1,
    "title": "Midterm Exam - Discrete Structures 1",
    "description": "Test covering Sets, Logic, and Functions",
    "durationMinutes": 120,
    "totalQuestions": 10
  }'

# Generate test with Bloom level filter (1-3: Remember, Understand, Apply)
curl -X POST http://localhost:5000/api/tests/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "subjectId": 1,
    "title": "Basic Concepts Quiz - Discrete Structures",
    "description": "Remember and Understand level questions",
    "durationMinutes": 60,
    "bloomLevelRange": "1-2"
  }'

# Generate test with Bloom level filter (4-6: Analyze, Evaluate, Create)
curl -X POST http://localhost:5000/api/tests/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "subjectId": 1,
    "title": "Advanced Concepts Exam - Discrete Structures",
    "description": "Analyze, Evaluate, and Create level questions",
    "durationMinutes": 180,
    "bloomLevelRange": "4-6"
  }'

# ========================================
# SUMMARY: Tables Populated
# ========================================
# ✅ Users (1 admin + 3 non-admin)
# ✅ Departments (2)
# ✅ Courses (6)
# ✅ Subjects (5)
# ✅ Topics (6)
# ✅ Questions (15+)
# ✅ Options (multiple per question - 18+ options)
# ✅ Tests (generated from questions via /api/tests/generate)
# ✅ ActivityLogs (auto-tracked)

# ========================================
# POSTMAN COLLECTION QUICK REFERENCE
# ========================================
# GET       /api/departments                  - List all departments
# GET       /api/courses?departmentId=1       - List courses for department
# GET       /api/subjects?courseId=1          - List subjects for course
# GET       /api/topics?subjectId=1           - List topics for subject
# GET       /api/questions?topicId=1          - List questions for topic
# GET       /api/questions?bloomLevel=1       - List questions by Bloom level
# GET       /api/options?questionId=1         - List options for question
# GET       /api/tests                        - List all generated tests
# GET       /api/tests/1                      - Get test with questions
# GET       /api/users                        - List all users
# PUT       /api/subjects/1                   - Update subject
# DELETE    /api/options/1                    - Delete option