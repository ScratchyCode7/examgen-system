# Test Databank and Automated Exam Generation System - REFACTORED

## Project Overview
The Test Databank and Automated Exam Generation System is a centralized academic platform designed to support the systematic creation, organization, and generation of examinations. The system addresses common issues in manual exam preparation through structured data storage, automated question selection, and consistent exam generation following institutional assessment policies.

### Key Features:
✅ **Department-Based Organization** - Multi-department support with data isolation  
✅ **Structured Question Databank** - Organize questions by course and syllabus topic  
✅ **Bloom's Taxonomy Classification** - 6-level cognitive difficulty assessment (Remember → Create)  
✅ **Automated Exam Generation** - Generate exams with prescribed question distribution  
✅ **Audit Trail** - Complete activity logging for accountability  
✅ **Role-Based Access Control** - Admin, Faculty, and Department Administrator roles  

**Out of Scope:**
❌ Student exam attempts and responses  
❌ Answer checking and grading  
❌ Result tracking and analytics  

---

## Database Schema

### Core Entities

#### **Department**
Represents academic units within the university (e.g., College of Computer Studies, College of Engineering). Provides data isolation and organizational structure.

```
Departments (id, name, code, description, is_active, created_at, updated_at)
├── Has Many: Users
├── Has Many: Courses
└── Has Many: ActivityLogs
```

#### **Course** (v2.1)
Represents academic degree programs within a department (e.g., BSc Computer Science, BSc Data Science). Provides a second level of organizational hierarchy between departments and subjects.

```
Courses (id, department_id, name, code, description, is_active, created_at, updated_at)
├── Belongs To: Department
└── Has Many: Subjects
```

#### **Subject** (Academic Course)
Represents a fixed academic course belonging to a course (degree program). Subjects are organized into topics based on the course syllabus.

```
Subjects (id, course_id, code, name, description, is_active, created_at, updated_at)
├── Belongs To: Course
├── Has Many: Topics
└── Has Many: Tests
```

#### **Topic** (Syllabus Unit)
Represents a unit or chapter within a subject's syllabus. Topics include allocated teaching hours, used as weighting factors during exam generation.

```
Topics (id, subject_id, title, description, sequence_order, allocated_hours, is_active, created_at, updated_at)
├── Belongs To: Subject
└── Has Many: Questions
```

#### **Question**
Represents an exam question in the databank, classified by Bloom's cognitive level and question type.

```
Questions (id, topic_id, content, question_type, bloom_level, points, display_order, is_active, created_at, updated_at)
├── Belongs To: Topic
├── Has Many: Options
└── Has Many: TestQuestions
```

**Question Types:** MultipleChoice, TrueFalse, Essay  

**Bloom's Levels:**
- 1: Remember 
- 2: Understand
- 3: Apply
- 4: Analyze
- 5: Evaluate
- 6: Create

#### **Option**
Answer choices for multiple-choice and true/false questions.

```
Options (id, question_id, content, is_correct, display_order)
└── Belongs To: Question
```

#### **Test** (Generated Exam)
Represents a generated exam snapshot. Immutable record storing questions selected during generation and parameters used.

```
Tests (id, subject_id, created_by_user_id, title, description, duration_minutes, total_points, total_questions, 
       generation_notes, is_published, published_at, available_from, available_to, created_at, updated_at)
├── Belongs To: Subject
├── Belongs To: User (CreatedBy)
└── Has Many: TestQuestions
```

#### **TestQuestion** (Junction Table)
Maps questions to tests with ordering information.

```
TestQuestions (id, test_id, question_id, display_order)
├── Belongs To: Test
└── Belongs To: Question
```

#### **User**
Represents system users with department assignment and role assignment.

```
Users (user_id, first_name, last_name, username, email, password, department_id, is_admin, is_active, created_at, updated_at)
├── Belongs To: Department
└── Has Many: ActivityLogs
```

#### **ActivityLog**
Audit trail for all system actions.

```
ActivityLogs (id, department_id, user_id, category, action, entity_type, entity_id, details, severity, created_at)
├── Belongs To: Department
└── Belongs To: User
```

---

## API Endpoints

### **Authentication & Authorization**
All endpoints (except `/api/users/seed-admin`) require JWT authentication. The `AdminOnly` policy requires the user to have `isAdmin = true`.

### **Departments** (`/api/departments`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/departments` | AdminOnly | Create new department |
| GET | `/api/departments` | Required | List departments (paginated, filterable) |
| GET | `/api/departments/{id}` | Required | Get department details |
| PUT | `/api/departments/{id}` | AdminOnly | Update department |
| DELETE | `/api/departments/{id}` | AdminOnly | Delete department (if no courses/users) |

**Example POST:**
```json
{
  "name": "College of Computer Studies",
  "code": "CCS",
  "description": "Computer Science and IT Department"
}
```

---

### **Courses** (`/api/courses`) [NEW v2.1]

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|----------|
| POST | `/api/courses` | AdminOnly | Create new course (degree program) |
| GET | `/api/courses` | Required | List courses (paginated, filterable by department) |
| GET | `/api/courses/{id}` | Required | Get course details |
| PUT | `/api/courses/{id}` | AdminOnly | Update course |
| DELETE | `/api/courses/{id}` | AdminOnly | Delete course (if no subjects) |

**Example POST:**
```json
{
  "departmentId": 1,
  "name": "Bachelor of Science in Computer Science",
  "code": "BSCS",
  "description": "4-year degree program in Computer Science"
}
```

---

### **Users** (`/api/users`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/users` | AdminOnly | Create new user |
| GET | `/api/users` | Required | List users |
| GET | `/api/users/{userId}` | Required | Get user details |
| PUT | `/api/users/{userId}` | AdminOnly | Update user |
| DELETE | `/api/users/{userId}` | AdminOnly | Deactivate user |
| POST | `/api/users/seed-admin` | None | Create first admin (bootstrap) |

**Example POST:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "username": "jdoe",
  "email": "jdoe@university.edu",
  "departmentId": 1,
  "password": "SecurePass123!",
  "isAdmin": false
}
```

---

### **Subjects** (`/api/subjects`) [Updated v2.1]

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|----------|
| POST | `/api/subjects` | AdminOnly | Create new subject (requires CourseId v2.1) |
| GET | `/api/subjects` | Required | List subjects (filterable by course v2.1) |
| GET | `/api/subjects/{id}` | Required | Get subject details |
| PUT | `/api/subjects/{id}` | AdminOnly | Update subject |
| DELETE | `/api/subjects/{id}` | AdminOnly | Delete subject (if no topics/tests) |

**Example POST:**
```json
{
  "courseId": 1,
  "code": "CS101",
  "name": "Introduction to Computer Science",
  "description": "Fundamental concepts of CS"
}
```

---

### **Topics** (`/api/topics`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/topics` | AdminOnly | Create new topic |
| GET | `/api/topics` | Required | List topics (filterable by subject) |
| GET | `/api/topics/{id}` | Required | Get topic details |
| PUT | `/api/topics/{id}` | AdminOnly | Update topic |
| DELETE | `/api/topics/{id}` | AdminOnly | Delete topic (if no questions) |

**Example POST:**
```json
{
  "subjectId": 1,
  "title": "Introduction to Programming Languages",
  "description": "Fundamentals of programming languages",
  "sequenceOrder": 1,
  "allocatedHours": 12.5
}
```

---

### **Questions** (`/api/questions`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/questions` | AdminOnly | Create single question |
| GET | `/api/questions` | Required | List questions (filterable by topic, bloom level) |
| GET | `/api/questions/{id}` | Required | Get question details |
| PUT | `/api/questions/{id}` | AdminOnly | Update question |
| DELETE | `/api/questions/{id}` | AdminOnly | Delete question |
| POST | `/api/questions/bulk` | AdminOnly | Bulk import questions with options |

**Example POST:**
```json
{
  "topicId": 1,
  "content": "What is the primary purpose of a compiler?",
  "questionType": "MultipleChoice",
  "bloomLevel": 2,
  "points": 1,
  "displayOrder": 1
}
```

**Bulk Import Example:**
```json
{
  "topicId": 1,
  "questions": [
    {
      "content": "Question text",
      "questionType": "MultipleChoice",
      "bloomLevel": 2,
      "points": 1,
      "displayOrder": 1,
      "options": [
        {
          "content": "Correct answer",
          "isCorrect": true,
          "displayOrder": 1
        },
        {
          "content": "Wrong answer",
          "isCorrect": false,
          "displayOrder": 2
        }
      ]
    }
  ]
}
```

---

### **Tests** (`/api/tests`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/tests/generate` | AdminOnly | Generate new exam |
| GET | `/api/tests` | Required | List generated tests |
| GET | `/api/tests/{id}` | Required | Get test details with questions |
| PUT | `/api/tests/{id}` | AdminOnly | Update test |
| DELETE | `/api/tests/{id}` | AdminOnly | Delete test |

**Generate Test Request:**
```json
{
  "subjectId": 1,
  "title": "Midterm Exam - CS101",
  "description": "Midterm examination",
  "questionCount": 30,
  "durationMinutes": 120,
  "isPublished": false,
  "availableFrom": "2026-02-15T09:00:00Z",
  "bloomLevel": null
}
```

**Generation Algorithm:**
1. Fetch all active questions from subject topics
2. Filter by Bloom level if specified
3. Randomly select required number of questions
4. Create test record with TestQuestion junction entries
5. Log generation event in ActivityLog

---

## Database Configuration

### Connection String (PostgreSQL)
```json
"ConnectionStrings": {
  "PostgresConnection": "Host=localhost;Port=5432;Database=databank_refactored;Username=postgres;Password=password;"
}
```

### Migration
A new database migration has been created: `20260207043105_RefactorDatabaseSchema`

**To apply the migration:**
```bash
dotnet ef database update
```

**⚠️ WARNING:** This migration creates a completely new schema. The original `databank_db` database is intact and untouched.

---

## Project Structure

```
src/
├── Entities/                    # Domain models
│   ├── Department.cs          # Organizational unit
│   ├── Course.cs              # NEW (v2.1) - Degree programs
│   ├── Topic.cs               # Syllabus units
│   ├── BloomLevel.cs          # Enum (1-6)
│   ├── User.cs                # Users with department assignment
│   ├── Subject.cs             # Academic subjects (updated v2.1)
│   ├── Question.cs            # Exam questions (refactored)
│   ├── Test.cs                # Generated exams (refactored)
│   ├── TestQuestion.cs        # Junction table
│   ├── ActivityLog.cs         # Audit trail (updated)
│   └── Option.cs              # Question alternatives
│
├── Configuration/              # EF Core configurations
│   ├── DepartmentConfiguration.cs
│   ├── CourseConfiguration.cs       # NEW (v2.1)
│   ├── SubjectConfiguration.cs      # Updated (v2.1)
│   ├── TopicConfiguration.cs
│   ├── QuestionConfiguration.cs
│   ├── TestConfiguration.cs
│   ├── TestQuestionConfiguration.cs
│   ├── UserConfiguration.cs
│   └── OptionConfiguration.cs
│
├── Features/                   # API endpoints by domain
│   ├── Departments/
│   │   ├── DepartmentDtos.cs
│   │   ├── Create/
│   │   ├── List/
│   │   ├── GetById/
│   │   ├── Update/
│   │   └── Delete/
│   ├── Courses/                # NEW (v2.1)
│   │   ├── CourseDtos.cs
│   │   ├── Create/
│   │   ├── List/
│   │   ├── GetById/
│   │   ├── Update/
│   │   └── Delete/
│   ├── Subjects/               # Updated (v2.1)
│   ├── Topics/
│   ├── Questions/
│   ├── Tests/
│   ├── Users/
│   ├── Admin/
│   └── Auth/
│
├── Database/
│   └── AppDbContext.cs        # Updated with Course entity
│
├── Migrations/
│   ├── 20260207043105_RefactorDatabaseSchema.cs
│   ├── 20260207122116_AddCourseEntity.cs    # NEW (v2.1)
│   └── AppDbContextModelSnapshot.cs
│
└── Program.cs
```

---

## Key Changes Summary (v2.0 → v2.1)

### v2.1 Updates - Course Hierarchy Refinement

**Added:**
- `Course` entity - Represents degree programs (e.g., BSc Computer Science, BSc Information Technology)
- `CourseConfiguration.cs` - Entity Framework configuration with FK constraints
- `CourseDtos.cs` - Request/Response data transfer objects
- 5 Course CRUD endpoints (Create, List, GetById, Update, Delete)
- Migration: `20260207122116_AddCourseEntity` - Adds Course entity and migrates Subject relationships

**Modified:**
- **Subject**: `DepartmentId` → `CourseId` (now belongs to Course instead of Department)
- **Department**: `Subjects` collection → `Courses` collection
- **Subject endpoints**: Updated to filter by `courseId` instead of `departmentId`
- **All Subject-related endpoints**: Updated for new CourseId foreign key

### v2.0 - Initial Refactoring

**Removed:**
- `QuestionDifficulty` enum (replaced with `BloomLevel`)
- `Question.TestId` foreign key (questions stored in databank, not tied to tests)
- `Question.Type`, `Question.Difficulty`, `Question.Category` properties
- `Test.Questions` direct navigation (now uses `TestQuestion` junction)
- `User.Department` string property
- `TestResult` entity and all related features ✅

**Added:**
- `Department` entity for organizational structure
- `Topic` entity for syllabus-based organization
- `BloomLevel` enum (1-6 cognitive levels per Bloom's taxonomy)
- `TestQuestion` junction table for flexible test composition
- `User.DepartmentId` foreign key
- `Test.CreatedByUserId` for audit trail
- `ActivityLog.DepartmentId`, `EntityType`, `EntityId` for better auditing

**Refactored:**
- **Subject** was associated with Department (now with Course)
- **Question** now belongs to Topic (not Test)
- **Test** now composes questions via TestQuestion junction table
- **ActivityLog** enhanced with entity tracking
- All DTOs and endpoints updated for new relationships

---

## Security Considerations

1. **Role-Based Access Control:**
   - AdminOnly policy requires `IsAdmin == true`
   - Regular endpoints require authentication

2. **Department Data Isolation:**
   - Users belong to a single department
   - Consider adding department-based filtering in future iterations

3. **JWT Configuration:**
   ```json
   "Jwt": {
     "Issuer": "Databank",
     "Audience": "Databank",
     "SigningKey": "super-secret-signing-key-change-me",
     "ExpiresInMinutes": 120
   }
   ```
   **⚠️ IMPORTANT:** Change `SigningKey` to a secure random value in production.

4. **Audit Trail:**
   - All modifications logged in `ActivityLog`
   - Includes user, timestamp, entity type, and action

---

## Getting Started

### Prerequisites:
- .NET 8 SDK
- PostgreSQL 15+
- Visual Studio Code or Visual Studio 2022

### Setup:
```bash
# Navigate to backend directory
cd src

# Restore dependencies
dotnet restore

# Apply database migrations
dotnet ef database update

# Run the application
dotnet run

# Or watch mode for development
dotnet watch run
```

### Testing:
1. **Create Admin User:**
   ```bash
   POST /api/users/seed-admin
   ```

2. **Create Department:**
   ```bash
   POST /api/departments
   Authorization: Bearer <jwt_token>
   ```

3. **Create Subject & Topics:**
   ```bash
   POST /api/subjects
   POST /api/topics
   ```

4. **Add Questions:**
   ```bash
   POST /api/questions
   # or POST /api/questions/bulk for batch import
   ```

5. **Generate Exam:**
   ```bash
   POST /api/tests/generate
   ```

---

## Future Enhancements

1. **Bloom's Taxonomy Distribution:** Enforce 30-30-40 rule during exam generation
2. **Department-Based Filtering:** Filter questions and exams by department
3. **Question Difficulty Levels:** Add fine-grained difficulty classification
4. **Exam Statistics:** Generate reports on question distribution and coverage
5. **Frontend Dashboard:** React/Vue UI for exam management
6. **Export Functionality:** PDF, Word, and other formats for generated exams

---

## Database Schema Diagram

```
Department
├── id (PK)
├── name
├── code (UNIQUE)
├── description
└── is_active

Subject
├── id (PK)
├── course_id (FK → Course) [UPDATED v2.1]
├── code
├── name
└── description

Topic
├── id (PK)
├── subject_id (FK → Subject)
├── title
├── sequence_order
└── allocated_hours

Question
├── id (PK)
├── topic_id (FK → Topic)
├── content
├── question_type
├── bloom_level
├── points
└── display_order

Option
├── id (PK)
├── question_id (FK → Question)
├── content
├── is_correct
└── display_order

Test
├── id (PK)
├── subject_id (FK → Subject)
├── created_by_user_id (FK → User, nullable)
├── title
├── total_questions
└── total_points

TestQuestion (Junction)
├── id (PK)
├── test_id (FK → Test)
├── question_id (FK → Question)
└── display_order

User
├── user_id (PK)
├── department_id (FK → Department)
├── username (UNIQUE)
├── email (UNIQUE)
├── is_admin
└── is_active

ActivityLog
├── id (PK)
├── department_id (FK → Department)
├── user_id (FK → User, nullable)
├── action
├── entity_type
└── entity_id
```

---

## Future Enhancements

1. **Bloom's Taxonomy Distribution:** Enforce 30-30-40 rule during exam generation
2. **Question Difficulty Levels:** Add fine-grained difficulty classification
3. **Exam Statistics:** Generate reports on question distribution and coverage
4. **Frontend Dashboard:** React/Vue UI for exam management and Course selection
5. **Export Functionality:** PDF, Word, and other formats for generated exams
6. **Advanced Filtering:** Multi-level filtering by Department → Course → Subject → Topic

---

## Support & Documentation

For detailed API documentation, refer to the Swagger/OpenAPI endpoint at `/swagger` when running the application.

---

**Last Updated:** February 7, 2026 (v2.1 Update)  
**Version:** 2.1 (Refactored with Course Hierarchy)  
**Status:** Ready for Development and Testing
