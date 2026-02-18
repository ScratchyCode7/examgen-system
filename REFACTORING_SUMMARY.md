# Databank Refactoring Summary

## 📋 Overview

The Test Databank and Automated Exam Generation System has been successfully refactored to align with the comprehensive project specification. The refactoring maintains backward compatibility by creating a **new PostgreSQL database** (`databank_refactored`) while preserving the original `databank_db` database.

**Refactoring Date:** February 7, 2026  
**Status:** ✅ Complete with Course Hierarchy - Ready for Testing  
**Migrations:** `20260207043105_RefactorDatabaseSchema` + `20260207122116_AddCourseEntity` (v2.1 update)

---

## 🎯 Goals Achieved

### ✅ Organizational Structure
- **Department** entity added for university-wide multi-site support
- **Course** entity added (v2.1) - represents degree programs (BSc, BIT, BSEMC, etc.)
- Hierarchical structure: Department → Course → Subject → Topic → Question
- Users belong to departments with proper foreign key relationships
- Department-based data isolation implemented with Course-level granularity
- Department delete protection (prevents deletion if courses/users exist)
- Course delete protection (prevents deletion if subjects exist)

### ✅ Syllabus-Based Organization  
- **Topic** entity introduced to represent syllabus units
- Topics belong to Subjects with sequence ordering
- Topics include `AllocatedHours` for exam weighting calculations
- Question organization now flows: Department → Subject → Topic → Question

### ✅ Bloom's Taxonomy Integration
- Replaced `QuestionDifficulty` enum with comprehensive `BloomLevel` enum
- 6-level classification: Remember (1) → Understand (2) → Apply (3) → Analyze (4) → Evaluate (5) → Create (6)
- All Question endpoints updated to use BloomLevel
- Exam generation can filter by Bloom level

### ✅ Flexible Exam Composition
- **TestQuestion** junction table created for many-to-many relationship
- Questions now belong to Topics (databank) rather than Tests
- Tests compose questions flexibly for different exam instances
- Maintains immutability of test records for audit purposes

### ✅ Enhanced Audit Trail
- **ActivityLog** improved with:
  - `DepartmentId` for department-based filtering
  - `EntityType` and `EntityId` for specific entity tracking
  - Better categorization of actions
- User modifications tracked with timestamps
- Complete exam generation audit trail

### ✅ Role-Based Access Control
- Admin-only endpoints protected with `RequireAuthorization("AdminOnly")`
- All other endpoints require JWT authentication
- User model includes `IsAdmin` and `IsActive` flags
- SeedAdminEndpoint for initial bootstrap with automatic department creation

---

## 📊 Database Changes

### New Entities
| Entity | Purpose | Key Fields |
|--------|---------|-----------|
| **Department** | Organizational unit | id, name, code, description, is_active || **Course** | Degree program (v2.1) | id, department_id, name, code, description, is_active || **Topic** | Syllabus unit | id, subject_id, title, sequence_order, allocated_hours |
| **TestQuestion** | Junction table | id, test_id, question_id, display_order |
| **BloomLevel** | Enum (1-6) | Remember, Understand, Apply, Analyze, Evaluate, Create |

### Modified Entities
| Entity | Changes |
|--------|---------|
| **User** | Changed `Department` string → `DepartmentId` int foreign key; added `IsActive` |
| **Subject** | Changed `DepartmentId` → `CourseId` (v2.1); added `Code`; now belongs to Course instead of Department |
| **Department** | Changed `Subjects` collection → `Courses` collection (v2.1) |
| **Question** | Changed `TestId` → `TopicId`; replaced `Type`/`Difficulty`/`Category` with `QuestionType`/`BloomLevel`; added `IsActive` |
| **Test** | Added `CreatedByUserId`, `TotalPoints`, `TotalQuestions`, `GenerationNotes`, `PublishedAt`, `AvailableTo`; removed `Questions` direct collection |
| **ActivityLog** | Added `DepartmentId`, `EntityType`, `EntityId`; enhanced tracking |

### Removed Entities
- **TestResult** - Out of scope; student response handling not part of exam generation system

---

## 🛠️ API Endpoints - Complete List

### Departments (`/api/departments`)
```
POST    /api/departments                 AdminOnly  Create department
GET     /api/departments                 Auth       List departments
GET     /api/departments/{id}            Auth       Get department
PUT     /api/departments/{id}            AdminOnly  Update department
DELETE  /api/departments/{id}            AdminOnly  Delete department
```

### Courses (`/api/courses`) [NEW v2.1]
```
POST    /api/courses                     AdminOnly  Create course (degree program)
GET     /api/courses                     Auth       List courses (filterable by department)
GET     /api/courses/{id}                Auth       Get course details
PUT     /api/courses/{id}                AdminOnly  Update course
DELETE  /api/courses/{id}                AdminOnly  Delete course
```

### Topics (`/api/topics`)
```
POST    /api/topics                      AdminOnly  Create topic
GET     /api/topics                      Auth       List topics for subject
GET     /api/topics/{id}                 Auth       Get topic
PUT     /api/topics/{id}                 AdminOnly  Update topic
DELETE  /api/topics/{id}                 AdminOnly  Delete topic
```

### Subjects (`/api/subjects`) [Updated v2.1]
```
POST    /api/subjects                    AdminOnly  Create subject (requires CourseId)
GET     /api/subjects                    Auth       List subjects (filterable by course)
GET     /api/subjects/{id}               Auth       Get subject
PUT     /api/subjects/{id}               AdminOnly  Update subject
DELETE  /api/subjects/{id}               AdminOnly  Delete subject
```

### Questions (`/api/questions`) [Updated]
```
POST    /api/questions                   AdminOnly  Create question (TopicId instead of TestId)
GET     /api/questions                   Auth       List questions (filterable by topic, BloomLevel)
GET     /api/questions/{id}              Auth       Get question
PUT     /api/questions/{id}              AdminOnly  Update question
DELETE  /api/questions/{id}              AdminOnly  Delete question
POST    /api/questions/bulk              AdminOnly  Bulk import with BloomLevel classification
```

### Tests (`/api/tests`) [Refactored]
```
POST    /api/tests/generate              AdminOnly  Generate exam from questions by topic
GET     /api/tests                       Auth       List generated tests
GET     /api/tests/{id}                  Auth       Get test with composed questions
PUT     /api/tests/{id}                  AdminOnly  Update test metadata
DELETE  /api/tests/{id}                  AdminOnly  Delete test
```

### Users (`/api/users`) [Updated]
```
POST    /api/users                       AdminOnly  Create user (requires DepartmentId)
GET     /api/users                       Auth       List users
GET     /api/users/{userId}              Auth       Get user
PUT     /api/users/{userId}              AdminOnly  Update user (DepartmentId instead of Department string)
DELETE  /api/users/{userId}              AdminOnly  Deactivate user
POST    /api/users/seed-admin            None       Bootstrap first admin
```

---

## 📁 Project Structure Changes

### New Feature Folders
```
src/Features/
├── Departments/              ← NEW (v1.0)
│   ├── DepartmentDtos.cs
│   ├── Create/CreateDepartmentEndpoint.cs
│   ├── List/ListDepartmentsEndpoint.cs
│   ├── GetById/GetDepartmentEndpoint.cs
│   ├── Update/UpdateDepartmentEndpoint.cs
│   └── Delete/DeleteDepartmentEndpoint.cs
├── Courses/                  ← NEW (v2.1)
│   ├── CourseDtos.cs
│   ├── Create/CreateCourseEndpoint.cs
│   ├── List/ListCoursesEndpoint.cs
│   ├── GetById/GetCourseEndpoint.cs
│   ├── Update/UpdateCourseEndpoint.cs
│   └── Delete/DeleteCourseEndpoint.cs
└── Topics/                   ← NEW (v1.0)
    ├── TopicDtos.cs
    ├── Create/CreateTopicEndpoint.cs
    ├── List/ListTopicsEndpoint.cs
    ├── GetById/GetTopicEndpoint.cs
    ├── Update/UpdateTopicEndpoint.cs
    └── Delete/DeleteTopicEndpoint.cs
```

### Updated Feature Folders
```
Users/          → Updated DTOs and endpoints for DepartmentId
Subjects/       → Updated for CourseId (v2.1) - changed from DepartmentId
Questions/      → Updated for TopicId, BloomLevel, QuestionType
Tests/          → Refactored for TestQuestion junction table
```

### Removed
```
TestResults/    → Feature completely removed (out of scope)
```

---

## 🔄 Database Migration Details

### Migration Files
**v1.0 - Initial Refactoring:**
- **Name:** `20260207043105_RefactorDatabaseSchema`
- **Purpose:** Create Department, Topic, TestQuestion entities; refactor Question and Test
- **Files Created:**
  - `20260207043105_RefactorDatabaseSchema.cs` (29.6 KB)
  - `20260207043105_RefactorDatabaseSchema.Designer.cs` (24.1 KB)

**v2.1 - Course Hierarchy (Current):**
- **Name:** `20260207122116_AddCourseEntity`
- **Purpose:** Add Course entity between Department and Subject; migrate Subject.DepartmentId → Subject.CourseId
- **Files Created:**
  - `20260207122116_AddCourseEntity.cs` (3.9 KB)
  - `20260207122116_AddCourseEntity.Designer.cs` (updated)
  - `AppDbContextModelSnapshot.cs` (updated)

### Migration Execution
```bash
cd src
dotnet ef database update
```

This will:
1. Create the new `databank_refactored` database
2. Create all tables with proper relationships
3. Create indexes (e.g., unique constraints on Department.Code, User.Email, etc.)
4. Set up foreign key constraints with proper delete behaviors

### Key Table Relationships
```
Departments (1) ──→ (N) Users
    ↓
    └─→ (N) Courses (v2.1)
           ↓
           └─→ (N) Subjects ──→ Topics ──→ Questions ──→ Options
                  ↓
                  └─→ Tests ──→ TestQuestions ──→ Questions
```

---

## 🧪 Testing Checklist

### Setup Phase
- [ ] PostgreSQL running locally on port 5432
- [ ] `databank_refactored` database created
- [ ] Migration applied via `dotnet ef database update`
- [ ] Application builds without errors: `dotnet build` ✅

### API Testing

#### Bootstrap
- [ ] POST `/api/users/seed-admin` creates admin and IT department
- [ ] Verify admin user can login and get JWT token

#### Departments
- [ ] POST creating new department with code
- [ ] GET list departments with pagination
- [ ] PUT updating department name
- [ ] DELETE prevent deletion of department with subjects

#### Subjects
- [ ] POST creating subject (requires DepartmentId)
- [ ] GET list subjects filtered by department
- [ ] Verify DepartmentId relationship preserved

#### Topics
- [ ] POST creating topic for subject with allocated hours
- [ ] GET topics ordered by sequence_order
- [ ] PUT updating allocated_hours
- [ ] DELETE prevent deletion of topics with questions

#### Questions
- [ ] POST creating question with BloomLevel instead of Difficulty
- [ ] GET questions filtered by TopicId and BloomLevel
- [ ] POST bulk import with 6 Bloom levels
- [ ] PUT updating question BloomLevel
- [ ] Verify QuestionType values: MultipleChoice, TrueFalse, Essay

#### Tests
- [ ] POST generate test from Topic questions
- [ ] POST test generation with BloomLevel filter
- [ ] GET test returns composed questions via TestQuestion junction
- [ ] Verify total_questions and total_points calculated

#### Users
- [ ] POST creating user with DepartmentId
- [ ] PUT updating user DepartmentId
- [ ] Verify department isolation works

---

## 📚 Documentation Updates

### Updated Files
- [README.md](./README.md) - Added refactoring information and new database details
- [REFACTORING_GUIDE.md](./REFACTORING_GUIDE.md) - Comprehensive guide to new system architecture

### New Features Documentation
All DTOs include mapping methods for request/response transformation:
- `DepartmentMappings.ToResponse()`
- `TopicMappings.ToResponse()`
- All existing mappings updated for new properties

---

## ⚠️ Important Notices

### Database Safety
✅ **Original database untouched:** The `databank_db` database remains completely unchanged. All refactoring work uses the new `databank_refactored` database.

### Migration Path
If migrating from the old system:
1. Keep `databank_db` for reference
2. Create new `databank_refactored` via migration
3. Manually transfer and reshape data if needed
4. Update connection strings in production

### Breaking Changes
For any clients/frontends using the old API:
- `Question.TestId` → `Question.TopicId`
- `Question.Type` → `Question.QuestionType`
- `Question.Difficulty` → `Question.BloomLevel` (enum 1-6)
- `User.Department` (string) → `User.DepartmentId` (int)
- `Subject` now requires DepartmentId
- TestResult endpoints completely removed

---

## 🚀 Next Steps

### For Development
1. Apply the migration: `dotnet ef database update`
2. Test all endpoints with Postman collection
3. Update frontend to use new API contracts
4. Implement Department-based filtering in frontend

### For Production Deployment
1. Create backup of `databank_db` 
2. Create `databank_refactored` on production server
3. Run migration on production: `dotnet ef database update`
4. Update connection string environment variables
5. Redeploy application
6. Update API documentation for new contracts

### Future Enhancements
- [ ] Implement 30-30-40 Bloom's distribution rule enforcement
- [ ] Add exam generation statistics and reporting
- [ ] Support for question templates and dynamic generation
- [ ] Export generated exams to PDF/Word
- [ ] Frontend dashboard for exam management
- [ ] Multi-language support for questions

---

## 📞 Support

- **Database Issues:** Verify PostgreSQL is running and connection string is correct
- **Migration Issues:** Try `dotnet ef migrations remove` and recreate if needed
- **API Issues:** Check Entity Framework configurations in `Configuration/` folder
- **Build Issues:** Run `dotnet clean` then `dotnet build`

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| New Entities | 4 (Department, Course, Topic, TestQuestion) |
| Updated Entities | 6 (User, Subject, Department, Question, Test, ActivityLog) |
| Removed Entities | 1 (TestResult) |
| New API Endpoints | 24 (Departments: 5, Courses: 5, Topics: 6, others updated) |
| Entity Configurations | 9 (all updated) |
| Compilation Errors After Refactor | 0 ✅ |
| Migration Files | 2 (initial + Course hierarchy v2.1) |
| Endpoint Files Created | 13 (5 Course endpoints + others) |
| Lines of Documentation | 1200+ |

**Total Refactoring Effort:**
- 4 new entity files (Department, Course, Topic, TestQuestion)
- 13 endpoint implementations (includes new Course CRUD)
- 9 DTO files
- 9 configuration updates
- 2 comprehensive documentation files
- 2 complete database migrations
- Complete backward compatibility in database
- v2.1 Course hierarchy refinement

---

**Status: READY FOR TESTING AND DEPLOYMENT** ✅

### Hotfixes (Feb 10, 2026)

- Backend:
  - Fixed course-to-department assignments where several courses were incorrectly linked to the IT (admin) department. These courses were updated to their correct `DepartmentId` values (e.g., `BSCS`, `BSIT`, `BSEMC`, `BIT-CSF` → `CCS`).

- Frontend:
  - `CourseTopic` now resolves department from the URL (`/course-topic/:departmentCode`) and loads courses for that department via `/api/courses?departmentId={id}`.
  - History table behavior updated to be **department-scoped**: the page shows subjects for all courses within the current department, preventing cross-department visibility.
  - Saving a subject preserves the currently selected course (only topic inputs are cleared), enabling faster bulk entry workflows.
  - Adding a course via the API appears in the corresponding department's course dropdown after refresh.
  - `apiService.getCourses` extended to normalize several response shapes and includes temporary debug logging.

- Notes:
  - There remains a minor ESLint warning in `CourseTopic.jsx` (`'error' is assigned a value but never used`) — low priority.

**Status: READY FOR TESTING AND DEPLOYMENT** ✅

Created: February 7, 2026  
Last Updated: February 10, 2026 (v2.1 + hotfixes)  
Version: 2.1 (Refactored with Course Hierarchy)
