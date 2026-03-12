# Databank - Test Management System

Full-stack application for managing exam/test databank with C# ASP.NET Core backend and React frontend.

## ✨ Latest Updates (v2.8 - Question Image Support)

**Released March 11, 2026 - Add image support to questions with resize/alignment controls and print-ready base64 conversion.**

### New Changes (v2.8):
- ✅ **Question Image Upload & Management:**
  - Upload images to questions (max 5MB, images only: JPG, PNG, GIF, BMP, WebP)
  - **Simultaneous encoding** - select image while encoding question, both save together
  - Client-side preview appears immediately (no server upload until question saved)
  - One-to-one relationship: each question can have one optional image
  - Images stored in `wwwroot/uploads/questions/` with GUID filenames
  - New `QuestionImages` table with cascade delete on parent question removal
- ✅ **Image Controls (Real-time Preview):**
  - Width slider: 10% - 100% of container (default 50%)
  - Alignment buttons: Left, Center, Right
  - Live preview updates as you adjust settings
  - Delete button with confirmation modal
- ✅ **Image Display in Exam Generation:**
  - Images automatically included in generated exams from question pool
  - Preview shows images with saved width and alignment settings
  - Images positioned between question text and answer choices
- ✅ **Print-Ready Implementation:**
  - Base64 conversion before printing to avoid browser CORS restrictions
  - Fetch API + FileReader approach bypasses canvas security errors
  - Images embedded directly in print HTML as data URLs
  - Mirrors successful Answer Key logo embedding technique
  - Reliable printing across all modern browsers
- ✅ **API Endpoints:**
  - `POST /api/questions/{questionId}/image` - Upload/replace image with metadata
  - `GET /api/questions/{questionId}/image` - Retrieve image metadata
  - `DELETE /api/questions/{questionId}/image` - Remove image and delete file
- ✅ **Backend Services:**
  - `FileStorageService` handles uploads, validation, and deletion
  - Validates file type and size before storage
  - Returns relative paths for database storage
- ✅ **Backward Compatibility:**
  - All image fields are nullable - no breaking changes
  - Existing text-only questions work exactly as before
  - Print layout unchanged for questions without images

📖 **[View Full Image Support Documentation](docs/question-image-support.md)**

## ✨ Latest Updates (v2.7 - Multi-Department Access System)

**Released March 7, 2026 - Enable users to access multiple departments with granular permission control.**

### New Changes (v2.7):
- ✅ **Multi-Department User Access:**
  - Users can now be assigned to multiple departments (e.g., College of Business AND College of Computer Studies)
  - Many-to-many relationship via `UserDepartments` join table with composite primary key
  - Legacy single `DepartmentId` preserved during transition, marked obsolete
- ✅ **Enhanced Authentication:**
  - JWT tokens now include multiple `departmentId` claims (one per assigned department)
  - `DepartmentAccessService` validates user access to department-scoped resources
  - Admin users automatically get access to all active departments
- ✅ **Admin User Management UI:**
  - New UserManagement component in Admin Dashboard under "Users" nav item
  - Create/edit users with multi-select department assignment via checkboxes
  - Password visibility toggle in user creation form
  - Full dark mode support with theme-aware styling
- ✅ **Department Switching:**
  - New `DepartmentSwitcher` component for switching between assigned departments
  - URL-based navigation with `/:departmentCode` parameter
  - Protected routes validate department access before rendering
- ✅ **Scoped Department Views:**
  - Non-admin users see only their assigned departments on dashboard
  - `getUserDepartments` API endpoint returns user-specific department list
  - Department-aware routing preserves context across navigation
- ✅ **Developer Experience:**
  - Fixed all obsolete property warnings (11 total)
  - Created migrations with SQL backfill for zero-downtime deployment
  - Comprehensive documentation in `docs/multi-department-access-system.md`

📖 **[View Full Multi-Department Documentation](docs/multi-department-access-system.md)**

## ✨ Latest Updates (v2.6 - Saved Exam Sets & Printing Suite)

**Released Feb 27, 2026 - Persist generated exams with deterministic signatures and manage printable sets from the new reports view.**

### New Changes (v2.6):
- ✅ **Save Generated Exam endpoint (`POST /api/tests/save-generated`):**
  - Persists subject/course/department metadata, semester, school year, set labels, and the exact ordered question list in a single call.
  - Computes a question signature (displayOrder + questionId) to guarantee unique saves per generation and auto-assigns the next `Set A/B/C...` label for the same term.
  - Stores the full specification snapshot and generation warnings for perfect reload fidelity.
- ✅ **Test Generation save flow overhaul:**
  - Save button now validates department/course/subject context, reuses the ordered payload, and surfaces the returned set label inline.
  - Save modal summarizes the upcoming set (course, subject, exam period, total items) instead of relying on a free-text exam name.
  - UI banner shows the latest saved set so instructors know which version is synced.
- ✅ **Program terminology alignment (frontend):**
  - Dashboards, navigation dropdowns, and search placeholders now use **Program - Topic** wording.
  - Saved Exam Sets filters, print/preview headers, and filename fallbacks show Program naming for consistency.
  - Test Generation and encoding flows use shared `program-info` styles in print exports.
- ✅ **Reports ▸ Saved Exam Sets page (`/reports/saved-exams/:departmentCode?`):**
  - Filter saved sets by department, course, subject, exam type, semester, and school year before selecting one.
  - View the stored exam (with toggleable answer key) and reuse the printing modal to output the Table of Specification, exam paper, or answer key exactly as saved.
  - Printing pulls from the persisted snapshot/questions so instructors can regenerate PDFs long after the original session.

## ✨ Latest Updates (v2.5 - Department-Aware Routing & Spec Cleanup)

**Released Feb 26, 2026 - Department-context URLs for encoding/generation plus smarter topic hour handling.**

### New Changes (v2.5):
- ✅ **Department-aware Test Encoding/Test Generation routes:**
  - `/test-encoding/:departmentCode` and `/test-generation/:departmentCode` keep the selected college in the URL for deep links and bookmarking.
  - Dashboard shortcuts compute the proper `departmentCode` before navigating so instructors always land in their scope.
  - Dropdown changes push updated routes to keep Course-Topic/Test Encoding/Test Generation pages in sync.
- ✅ **Spec hours auto-filled from topics:**
  - Topic selection now pulls allocated hours directly from the database and locks the hours cell (read-only) to prevent manual drift from the syllabus plan.
  - Specification calculations (distribution, totals, Bloom counts) were wrapped in `useCallback` and had dependency arrays fixed to eliminate stale state issues during re-renders.
- ✅ **ESLint/stability cleanup:**
  - Removed the deprecated `validationErrors` UI references plus unused loading state in encoding flows so `npm start` compiles cleanly.
  - Hook dependency warnings resolved across TestGeneration/TestEncoding by sharing memoized helpers and keeping dependency arrays minimal and correct.

## ✨ Latest Updates (v2.4 - Topic Management & Multi-Topic Support)

**Released Feb 20, 2026 - Collapsible Topic Management section with full dark mode and responsive design**

### New Changes (v2.4):
- ✅ **Collapsible Topic Management Section:**
  - Click "▶ Topics" button on any Subject row to expand Topic management for that subject
  - Displays all existing topics for the selected subject
  - Form to add new topics without creating a new subject
  - Collapsible interface: Click "▼ Collapse" to hide managed topics
  
- ✅ **Multi-Topic Support:**
  - Each Subject can now have multiple Topics
  - "Add New Topic" form with Title, Sequence Order, and Hours fields
  - Topics persist to database via `POST /api/topics`
  - Existing topics load dynamically when expanding a subject
  
- ✅ **Full Dark Mode & Light Mode Support:**
  - Collapsible sections styled for both themes
  - Form inputs adapt to dark/light backgrounds
  - Buttons with theme-aware hover states
  - Focus states with theme-appropriate borders
  
- ✅ **Responsive Design:**
  - Desktop: 4-column topic form layout (Title, Order, Hours, Button)
  - Tablet (1024px): 3-column condensed form layout
  - Mobile (768px): Single-column form with full-width button
  - Extra small (480px): Single-row grid for all elements
  
- ✅ **User Experience:**
  - Click "Topics" button to expand a subject's topic management
  - View all existing topics in a scrollable list
  - Add new topics without losing the form data
  - Clear visual hierarchy with indentation and borders
  - Form validation (Title and Hours required)

### New Changes (v2.2 - Exam Question Encoding):
- ✅ **Test Encoding page with department/course/topic hierarchy:**
  - Department dropdown (required first step)
  - Course Selection dropdown (depends on department)
  - Topic/Subject dropdown (depends on course)
  - Dependent dropdowns with cascading resets
- ✅ **Exam question creation (backed by database):**
  - Rich-text question editor with formatting toolbar (bold, italic, underline, lists, headings, links, math symbols, images)
  - Multiple-choice answer entry (A, B, C, D) with rich-text support
  - Answer key field (specify correct answer: A-D)
  - Explanation editor (rich-text support)
  - Cognitive level selection (Remembering & Understanding / Applying & Analyzing / Evaluation & Creating)
- ✅ **BloomLevel classification for exam generation:**
  - "Remembering and Understanding" → BloomLevel 1 (stored in database)
  - "Applying and Analyzing" → BloomLevel 3 (stored in database)
  - "Evaluation and Creating" → BloomLevel 5 (stored in database)
  - Enables 30-30-40 distribution rule enforcement during exam generation
- ✅ **Backend integration:**
  - `POST /api/questions` saves questions with options to the database
  - `GET /api/questions?topicId=X` loads existing questions for the selected topic
  - Questions are persisted to `Questions` and `Options` tables
- ✅ **Dynamic department logo and name:**
  - Header updates logo and college text based on selected department (from `/constants/departmentLogos.js`)
- ✅ **Course and subject filtering:**
  - Only courses for the selected department appear in Course dropdown
  - Only subjects for the selected course appear in Topic dropdown
- ✅ **Validation:**
  - Prevents submission if Department, Course, Topic, or Question Type is not selected
  - Validates all required form fields before saving

**Testing workflow:**
1. Hard-refresh browser: `Cmd+Shift+R`
2. Navigate to `/test-encoding`
3. Select Department (e.g., CCS) — logo and college name update
4. Select Course (e.g., BSCS) — only CCS courses show
5. Select Topic/Subject (e.g., "Data Structures") — load only that topic's questions
6. Fill in question: text, choices A-D, correct answer, explanation
7. Select cognitive level (e.g., "Applying and Analyzing")
8. Click "Add Question" → Question is saved to backend and appears in history

### Saved Exam Sets workflow
1. Generate an exam via `/test-generation/:departmentCode`, then click **Save Exam** once the Table of Specification is ready.
2. Confirm the save modal summary (course, subject, exam period, total items); the backend assigns the next `Set A/B/C...` label and stores the ordered question list plus specification snapshot.
3. Navigate to **Reports ▸ Saved Exam Sets** (URL: `/reports/saved-exams/:departmentCode`) and select the same department/course/subject/exam filters to load matching sets.
4. Click any set in the sidebar to view the saved exam or toggle the inline answer key; use the **Print** button to export the Table of Specification, exam paper, or answer key directly from the stored snapshot.
5. Repeat the save process to create `Set D`, `Set E`, etc.—the system prevents duplicates by comparing question signatures, ensuring each saved set is unique for the chosen term.

## ✨ Previous Updates (v2.1 - Course Hierarchy)

**Added Course-level organizational hierarchy to better represent degree programs.**

### Changes (v2.1):
- ✅ Added Course entity (degree programs: BSc CS, BSc Data Science, etc.)
- ✅ Restructured Subject-Course relationship (Subjects now belong to Courses, not Departments)
- ✅ New database hierarchy: Department → Course → Subject → Topic → Question
- ✅ Created 5 Course CRUD endpoints (Create, List, GetById, Update, Delete)
- ✅ Applied migration: `20260207122116_AddCourseEntity`
- ✅ Updated Topic endpoints for better syllabus organization

### Hotfixes (Feb 10, 2026)

- ✅ Corrected course-to-department assignments in the database (some courses were incorrectly assigned to the IT admin department and are now moved to their proper departments, e.g., `BSCS`, `BSIT`, `BSEMC`, `BIT-CSF` → `CCS`).
- ✅ `CourseTopic` page improvements:
  - Course dropdown now loads courses by department code (URL: `/course-topic/:departmentCode`).
  - History table scoped to the current **department** (shows subjects for all courses within the selected department) to prevent cross-department visibility.
  - Saving a subject no longer clears the selected course — only the topic inputs are reset so bulk entry is faster.
- ✅ Adding a course to a department (via `POST /api/courses`) immediately appears in the `Course` dropdown for that department.

### Major Update (Feb 20, 2026 - v2.3): Unified Subject + Topic Creation

**Streamlined the Course-Topic management page for better UX — now creates both Subject AND Topic with a single Save action.**

#### Changes (v2.3):
- ✅ **Course-Topic Page Refactor (`/course-topic`):**
  - Simplified workflow: Single form → Single Save → Creates both Subject AND Topic
  - "Topic Description" input now serves dual purpose:
    - Creates Subject.Name (with code, value, and hours metadata)
    - Creates Topic.Title (auto-created with same name, sequence order 1, matching hours)
  - History table redesigned:
    - Shows Subject row + indented Topic row below it
    - Visual hierarchy makes Subject ↔ Topic relationship clear
    - No more complex nested forms
  
- ✅ **Test Encoding Page Updates (`/test-encoding`):**
  - Enhanced hierarchy: Department → Course → **Subject** → **Topic**
  - Added Subject dropdown (shows course subjects)
  - Added Topic dropdown (shows selected subject's topics)
  - Questions now scoped to specific Topic (not Subject)
  - No need for topic expansion/collapse UI
  
- ✅ **API Additions:**
  - Added `apiService.getTopics(subjectId)` - Fetch topics for a subject
  - Added `apiService.createTopic(topicData)` - Create new topic
  
- ✅ **Dark Mode Support:**
  - Fixed history table styling (text visibility, padding, colors)
  - Subject rows: Bold on light gray background
  - Topic rows: Indented on slightly different background
  - Dark mode properly themes Subject/Topic rows

- ✅ **Removed:**
  - Nested expandable topic forms
  - Complex topic creation form per subject
  - Unused state management (expandedSubjects, subjectTopicsMap, etc.)

**Benefits:**
- ✅ Faster data entry (one Save = Subject + Topic)
- ✅ Clearer UI hierarchy (Subject → Topic relationship visual)
- ✅ Reduced complexity (single form instead of nested)
- ✅ Better for exam generation (Question → Topic → Subject → Course → Department chain complete)

## � Production Deployment

**Deployed March 12, 2026 - System is LIVE and operational! ✅**

### Live URLs
- **Frontend**: https://test-databank-system.vercel.app
- **Backend API**: https://examgen-system.onrender.com
- **Status**: Fully operational with all services running

### Deployment Stack
- **Frontend**: Vercel (React 18 CRA) - Washington D.C. region
- **Backend**: Render (ASP.NET Core 9.0 via Docker) - Oregon region
- **Database**: Neon PostgreSQL 17 (Serverless) - Singapore region

### What's Live
✅ User authentication (JWT-based login/logout)  
✅ Admin dashboard with full navigation  
✅ Department management (CCS, CBA, CAS created)  
✅ Course and topic CRUD operations  
✅ Dark mode theme with persistence  
✅ CORS configured and working  
✅ All 13 database migrations applied  
✅ Production environment variables configured  

### Initial Setup Complete
- Admin user created: `admin` / `Admin123!`
- Three departments added:
  - **CCS** - College of Computer Studies
  - **CBA** - College of Business Administration
  - **CAS** - College of Arts and Sciences

### Quick Test
1. Visit https://test-databank-system.vercel.app
2. Login with admin credentials
3. Navigate to **Data Entry → Program - Topic**
4. See all 3 departments in the dropdown!

**📖 For complete deployment details, see [Production Deployment Documentation](docs/production-deployment.md)**

## �📋 Core Refactoring (v2.0+)

**The project has been comprehensively refactored to align with the Test Databank and Automated Exam Generation System specification.**

- ✅ Added Department-based organizational structure
- ✅ Implemented Topic-based syllabus structure (replacing direct Test-Question relationship)
- ✅ Replaced QuestionDifficulty with Bloom's Taxonomy (6 cognitive levels)
- ✅ Created TestQuestion junction table for flexible exam composition
- ✅ Enhanced User model with DepartmentId foreign key
- ✅ Improved ActivityLog with entity tracking
- ✅ Removed TestResult features (out of scope)
- ✅ Created new PostgreSQL database: `databank_refactored`
- ✅ Original `databank_db` database remains untouched

**📖 For detailed refactoring documentation, see [REFACTORING_GUIDE.md](./REFACTORING_GUIDE.md)**

## 📦 Project Structure

- `src/` - Backend (C# ASP.NET Core Web API)
  - `Entities/` - Refactored domain models with new Department, Topic, BloomLevel
  - `Features/` - API endpoints (now includes Departments, Topics)
  - `Migrations/` - New migration: RefactorDatabaseSchema
- `client/` - Frontend (React + TypeScript)
- `postman/` - API testing collection

## 🔑 Commit Standards
- We follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.
- Example commit messages:
  - `feat(auth): add jwt login endpoint`
  - `fix(users): prevent duplicate usernames`
  - `docs(readme): add setup instructions`

## 🗄️ Database Setup

**Important:** The refactored system uses a NEW PostgreSQL database called `databank_refactored`. This preserves your original `databank_db` database.

1. Ensure PostgreSQL is running locally (default: `localhost:5432`)

2. Update connection string in `src/appsettings.Development.json`:
   ```json
   "ConnectionStrings": {
     "PostgresConnection": "Host=localhost;Port=5432;Database=databank_refactored;Username=postgres;Password=password;"
   }
   ```

3. Apply the refactoring migration:
   ```bash
   cd src
   dotnet ef database update
   ```

4. The migration `20260207043105_RefactorDatabaseSchema` will create:
   - Departments table
   - Redesigned Subjects (with DepartmentId)
   - Topics table (new)
   - Refactored Questions (belongs to Topic, not Test)
   - TestQuestions junction table
   - Updated Activities and Users

### Database Verification:
```bash
# List all tables
\dt

# Verify Department structure
SELECT * FROM "Departments" LIMIT 1;

# Verify Subject-Topic relationship
SELECT s.*, t.* FROM "Subjects" s LEFT JOIN "Topics" t ON s."Id" = t."SubjectId" LIMIT 5;
```

   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   ```

## 🧩 Models / Entities
- **Department** – academic unit (e.g., College of Computer Studies) with navigation to courses, users, and activity logs.
- **Course** – degree program (e.g., BSc Computer Science, BSc Data Science) belonging to a department with navigation to subjects.
- **Subject** – academic subject within a course (e.g., Discrete Structures 1) with navigation to topics and tests.
- **Topic** – syllabus unit within a subject (e.g., Arrays & Lists, Daily-Lessons) with allocated teaching hours.
- **Question** – exam item linked to a topic with type, points, Bloom's level (cognitive classification), option collection, and optional image.
- **QuestionImage** – optional image attachment for questions with properties:
  - `ImagePath` (relative path to file in wwwroot/uploads/questions/)
  - `WidthPercentage` (10-100, default 50)
  - `Alignment` (Left/Center/Right, default Center)
  - One-to-one relationship with Question (nullable, cascade delete)
- **Option** – answer choices per question with correctness flag and display order.
- **Test (Exam)** – belongs to a subject, tracks who created it, duration, publish flags, availability window, and compositions via TestQuestion.
- **TestQuestion** – junction table relating Tests to Questions with display order.
- **User** – base profile (name, username, email, department) with navigation to activity logs.
- **ActivityLog** – audit trail entries with severity/category referencing optional user and entity tracking.

## ✅ Verification
- `dotnet build src/src.csproj`
- `dotnet ef database update --project src/src.csproj`

## 🔐 Authentication / Authorization
1. Update `Jwt` settings in `src/appsettings.Development.json` (issuer, audience, signing key).
2. **Create the first admin user** (one-time setup):
   ```bash
   `curl -X POST https://localhost:5012/api/users/seed-admin`
   ```
   This creates an admin user with:
   - Username: `admin`
   - Password: `Admin123!`
   - Email: `admin@databank.dev`
   
   **Note:** This endpoint only works if no admin exists. After creating the first admin, use the regular registration endpoint.
3. **Login and capture the token**:
   ```bash
   curl -X POST https://localhost:5001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"Admin123!"}'
   ```
4. **Register additional users** (requires admin token):
   ```bash
   curl -X POST https://localhost:5001/api/users \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <your-token>" \
     -d '{"firstName":"John","lastName":"Doe","department":"IT","username":"johndoe","password":"Secret123!","email":"john@example.com","isAdmin":false}'
   ```
5. Call admin-only endpoints with the `Authorization: Bearer <token>` header (e.g., `GET /api/admin/health`).
6. JWT payload includes `isAdmin` claim; policies enforce admin access (`RequireAuthorization("AdminOnly")`).

## 📡 API Endpoints

### Users (`/api/users`)
- `POST /api/users/seed-admin` - Create first admin user (Public, one-time use)
- `POST /api/users` - Create user (Admin only)
- `GET /api/users` - List all users with pagination (Requires auth)
  - Query params: `pageNumber`, `pageSize`
- `GET /api/users/{id}` - Get user by ID (Requires auth)
- `PUT /api/users/{id}` - Update user (Admin only)
- `DELETE /api/users/{id}` - Delete user (Admin only)

### Departments (`/api/departments`)
- `POST /api/departments` - Create department (Admin only)
- `GET /api/departments` - List departments with pagination (Requires auth)
  - Query params: `pageNumber`, `pageSize`, `search?`, `isActive?`
- `GET /api/departments/{id}` - Get department by ID (Requires auth)
- `PUT /api/departments/{id}` - Update department (Admin only)
- `DELETE /api/departments/{id}` - Delete department (Admin only, protected if has courses/users)

### Courses (`/api/courses`)
- `POST /api/courses` - Create course (Admin only)
- `GET /api/courses` - List courses with pagination (Requires auth)
  - Query params: `pageNumber`, `pageSize`, `departmentId?`, `search?`, `isActive?`
- `GET /api/courses/{id}` - Get course by ID (Requires auth)
- `PUT /api/courses/{id}` - Update course (Admin only)
- `DELETE /api/courses/{id}` - Delete course (Admin only, protected if has subjects)

### Subjects (`/api/subjects`)
- `POST /api/subjects` - Create subject (Requires auth)
- `GET /api/subjects` - List all subjects with pagination (Requires auth)
  - Query params: `pageNumber`, `pageSize`, `courseId?`, `search?`, `isActive?`
- `GET /api/subjects/{id}` - Get subject by ID (Requires auth)
- `PUT /api/subjects/{id}` - Update subject (Admin only)
- `DELETE /api/subjects/{id}` - Delete subject (Admin only)

### Topics (`/api/topics`)
- `POST /api/topics` - Create topic (Requires auth)
- `GET /api/topics` - List all topics with pagination (Requires auth)
  - Query params: `pageNumber`, `pageSize`, `subjectId?`, `search?`, `isActive?`
- `GET /api/topics/{id}` - Get topic by ID (Requires auth)
- `PUT /api/topics/{id}` - Update topic (Admin only)
- `DELETE /api/topics/{id}` - Delete topic (Admin only, protected if has questions)

### Tests/Exams (`/api/tests`)
- `POST /api/tests` - Create test (Admin only)
- `POST /api/tests/generate` - Generate exam from databank by selecting questions matching criteria (Admin only)
- `POST /api/tests/save-generated` - Persist a generated exam (Admin only)
  - Body: `departmentId`, `courseId`, `subjectId`, `examType`, `semester`, `schoolYear`, `durationMinutes`, `totalPoints`, `questions[] (questionId + displayOrder)`, optional `specificationSnapshot`, `generationNotes`, and `description`.
  - Auto-computes `Set A/B/...` based on existing exams for the same subject/term and refuses duplicates using the deterministic question signature.
- `GET /api/tests` - List all tests with pagination (Requires auth)
  - Query params: `pageNumber`, `pageSize`, `subjectId?`, `examType?`, `semester?`, `schoolYear?`
- `GET /api/tests/{id}` - Get test by ID (Requires auth)
- `PUT /api/tests/{id}` - Update test (Admin only)
- `DELETE /api/tests/{id}` - Delete test (Admin only)

### Questions (`/api/questions`)
- `POST /api/questions` - Create question (Requires auth - teachers and admins)
- `POST /api/questions/bulk` - Bulk import questions with options (Admin only)
- `GET /api/questions` - List all questions with pagination and filters (Requires auth)
  - Query params: `pageNumber`, `pageSize`, `testId?`, `subjectId?`, `search?`, `difficulty?`, `category?`
- `GET /api/questions/{id}` - Get question by ID (Requires auth)
- `PUT /api/questions/{id}` - Update question (Requires auth - teachers and admins)
- `DELETE /api/questions/{id}` - Delete question (Admin only)

### Question Images (`/api/questions/{questionId}/image`)
- `POST /api/questions/{questionId}/image` - Upload/replace image for a question (Requires auth)
  - Body: FormData with `file`, `widthPercentage` (10-100), `alignment` (Left/Center/Right)
  - Accepts: JPG, PNG, GIF, BMP, WebP (max 5MB)
  - Replaces existing image if present (old file deleted automatically)
- `GET /api/questions/{questionId}/image` - Get image metadata for a question (Requires auth)
  - Returns: `{ imagePath, widthPercentage, alignment, createdAt, updatedAt }`
- `DELETE /api/questions/{questionId}/image` - Delete image from question (Requires auth)
  - Removes database entry and deletes file from disk

### Test Results (`/api/test-results`)
- `POST /api/test-results` - Create test result (Requires auth)
- `GET /api/test-results` - List all test results with pagination (Requires auth)
  - Query params: `pageNumber`, `pageSize`, `userId?`, `testId?`
- `GET /api/test-results/{id}` - Get test result by ID (Requires auth)
- `PUT /api/test-results/{id}` - Update test result (Admin only)
- `DELETE /api/test-results/{id}` - Delete test result (Admin only)

### Authentication (`/api/auth`)
- `POST /api/auth/login` - Login and receive JWT token (Public)

### Admin (`/api/admin`)
- `GET /api/admin/health` - Admin health check (Admin only)

**Note:** All endpoints (except login) require JWT authentication via `Authorization: Bearer <token>` header. Admin-only endpoints additionally require `isAdmin: true` in the JWT claims.

## 🔧 Core Features

### Question Databank
- **Bulk Import**: Upload multiple questions with options in a single request (`POST /api/questions/bulk`)
- **Search & Filter**: Find questions by content search, difficulty level, category, test, or subject
- **Difficulty Levels**: Questions support Easy (1), Medium (2), Hard (3) classification
- **Category Classification**: Organize questions by topic/category for better management

### Exam Generation
- **Auto-Generate Tests**: Create exams by selecting questions from the databank based on:
  - Subject
  - Difficulty level
  - Category
  - Question count
- Questions are randomly selected and copied to the new test with all options preserved

### Pagination
All list endpoints support pagination:
- `pageNumber` (default: 1)
- `pageSize` (default: 10)
- Response includes: `items`, `pageNumber`, `pageSize`, `totalCount`, `totalPages`, `hasNext`, `hasPrevious`

### System Utilities
- **Global Exception Handling**: Centralized error handling with consistent error responses
- **Activity Logging**: System logs written to `ActivityLog` table with severity levels (Info, Warning, Error)
- **CORS Configuration**: Pre-configured for frontend integration (localhost:3000, 5173, 5174)

## 🎨 Frontend Setup

Two frontend projects exist in this repository:

- `client/` – legacy Vite + React + TypeScript prototype (no longer used)
- `tdb-frontend/` – **current** production React frontend (Create React App)

### Current Frontend (`tdb-frontend/`)

1. Navigate to the folder:
```bash
cd tdb-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure backend API URL in `.env`:
```bash
REACT_APP_API_BASE_URL=http://localhost:5012
```

4. Start development server:
```bash
npm start
```

The frontend will be available at `http://localhost:3000`.

### Frontend Features (Current Status)

✅ **Completed (tdb-frontend):**
- Login page with username/email + password authentication
- JWT-based auth:
  - Token stored in `localStorage`
  - Axios interceptor attaches `Authorization: Bearer <token>`
  - Auth context decodes JWT and exposes `user`, `isAuthenticated`, `isAdmin`
- Protected routes:
  - `/login` – public login page (redirects if already authenticated)
  - `/` – user dashboard (requires auth)
  - `/admin` – admin dashboard (requires `isAdmin`)
  - `/course-topic` – Course & Topic management (requires auth)
  - `/test-encoding` – Test Question Encoding & Editing workspace (requires auth)
- Dashboards:
  - Regular dashboard with program cards, search, grid/list view, dark mode, user menu
  - Admin dashboard with extended program list and same UX
- Data Entry – **Course & Topic** (`/course-topic`):
  - **Single Form for Subject + Topic Creation** (streamlined workflow):
    - Select Department → Course
    - Fill in form fields:
      - **Topic Code** → Subject.Code
      - **Value** → Subject metadata field
      - **Topic Description** → Both Subject.Name and Topic.Title
      - **Hours Per Topic** → Topic.AllocatedHours
    - Click **Save** → Creates both Subject AND Topic in one action
  - **History Table:**
    - Shows all Subjects created with their corresponding Topics
    - Subject row displays: Code, Description, Hours
    - Topic row (indented below) displays: Topic name and allocated hours
    - Auto-creates Topic when Subject is created (no separate topic creation needed)
  - Persists entries to backend:
    - `POST /api/subjects` (Admin only) - Creates Subject
    - `POST /api/topics` (Admin only) - Creates Topic with same name as Topic Description input
  - Uses `Subject.Description` JSON metadata to store course/topic/value/hours
- Data Entry – **Test Encoding & Editing** (`/test-encoding`):
  - **Department/Course/Subject/Topic Hierarchy** with dependent dropdowns:
    - Department dropdown (required, loads all departments from `/api/departments`)
    - Course dropdown (disabled until department selected; shows only courses for selected department via `/api/courses?departmentId`)
    - Subject dropdown (disabled until course selected; shows only subjects for selected course via `/api/subjects?courseId`)
    - Topic dropdown (disabled until subject selected; shows only topics for selected subject via `/api/topics?subjectId`)
    - Selections are preserved after saving a question (only form inputs reset)
    - Dynamic header: Department logo and college name update based on selected department
  - **Question Encoding:**
    - Rich-text question editor with toolbar (bold/italic/underline, lists, headings, links, images, math symbols)
    - Multiple-choice A–D answer entry with rich-text
    - Answer key explanation editor
    - Cognitive level selection (Remembering & Understanding / Applying & Analyzing / Evaluation & Creating) → Maps to BloomLevel for exam generation
    - **[NEW] Image Upload Component:**
      - Click upload area to select image file (max 5MB, images only)
      - **Works before saving** - preview appears immediately using FileReader
      - Real-time preview with adjustable width (10-100% slider)
      - Alignment controls (Left/Center/Right buttons)
      - **Simultaneous save** - image uploads automatically when question is saved
      - Delete button with confirmation (for existing images)
      - Helpful UI hints guide the workflow
      - Supports JPG, PNG, GIF, BMP, WebP formats
  - **BloomLevel Classification** for exam distribution rule (30-30-40):
    - "Remembering & Understanding" → BloomLevel 1
    - "Applying & Analyzing" → BloomLevel 3
    - "Evaluation & Creating" → BloomLevel 5
  - **Backend Integration:**
    - Questions saved to backend via `POST /api/questions` with payload:
      ```json
      {
        "topicId": <number>,
        "questionType": "MultipleChoice",
        "text": "question text",
        "bloomLevel": <1|3|5>,
        "points": 1,
        "isActive": true,
        "options": [
          { "text": "Choice A", "isCorrect": true, "displayOrder": 1 },
          { "text": "Choice B", "isCorrect": false, "displayOrder": 2 },
          { "text": "Choice C", "isCorrect": false, "displayOrder": 3 },
          { "text": "Choice D", "isCorrect": false, "displayOrder": 4 }
        ]
      }
      ```
    - Images uploaded via `POST /api/questions/{questionId}/image` with FormData:
      - Sends file, widthPercentage, and alignment
      - Returns imagePath for storage
    - Questions loaded from backend via `GET /api/questions?topicId={id}&pageSize=500` (includes image data)
    - In-page history shows questions loaded from the selected Topic with their BloomLevel classification
- Global:
  - Dark mode toggle
  - Logout modal and flow
  - Consistent navigation bar (Home, Data Entry, Reports) across pages

🚧 **Planned/Next Steps:**
- Test end-to-end workflow: Select Department → Course → Topic → Encode Question → Verify save to backend
- Verify backend endpoint accepts MultipleChoice question payload and stores BloomLevel correctly
- Implement exam generation endpoint with 30-30-40 distribution rule
  - Query questions by TopicId, filter by BloomLevel (1→30%, 3→30%, 5→40%), generate test
  - Create test creation UI that calls exam generation endpoint
- Add test-taking interface (`/test-take`) where students can take generated exams
- Add statistics/reporting dashboard showing question coverage by Topic and BloomLevel
- Replace remaining mock data (e.g., program lists) with API-driven content

## 🧪 Testing

### How to Login as Admin

1. **First, create the admin user** (one-time setup):
   ```bash
   curl -X POST https://localhost:7088/api/users/seed-admin
   ```
   This creates an admin user with:
   - Username: `admin`
   - Password: `Admin123!`
   - Email: `admin@databank.dev`

2. **Login via Frontend:**
   - Start the frontend: `cd client && npm run dev`
   - Navigate to `http://localhost:5173/login`
   - Enter email: `admin@databank.dev` (or username: `admin`)
   - Enter password: `Admin123!`
   - Click "Login"

3. **Login via API (for testing):**
   ```bash
   curl -X POST https://localhost:7088/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"Admin123!"}'
   ```
   Copy the `accessToken` from the response and use it in subsequent requests.

### Postman Collection
A complete Postman collection is available at `postman/Databank.postman_collection.json`:
1. Import the collection into Postman
2. Set environment variables:
   - `baseUrl`: `https://localhost:7088` (or your API URL)
   - `token`: (auto-populated after login)
3. Run the "Login" request first to capture the token
4. All other requests will use the token automatically

The collection includes:
- All CRUD endpoints
- Authentication flows
- Bulk import examples
- Exam generation examples
- Search/filter examples

## ✅ Current Status

### Backend (100% Complete)
- ✅ Database setup with PostgreSQL
- ✅ All entities and migrations
- ✅ Authentication & Authorization (JWT)
- ✅ All CRUD endpoints
- ✅ Question databank features (bulk import, search, filters)
- ✅ Exam generation
- ✅ Pagination on all list endpoints
- ✅ Global exception handling
- ✅ Activity logging
- ✅ CORS configuration

### Frontend (tdb-frontend) – Current Status
- ✅ Project setup with Create React App (React 18)
- ✅ Authentication flow (login, protected routes, JWT handling)
- ✅ User & Admin dashboards with dark mode and navigation
- ✅ Course & Topic management page wired to backend `Subject` table
- ✅ Test Encoding & Editing UI with rich-text question editor and local history
- ✅ **Question Image Upload** - Component with preview, width slider, alignment controls
- ✅ **Exam Preview with Images** - Images display in generated exam preview
- ✅ **Print-Ready Images** - Base64 conversion ensures images appear in printed exams
- ✅ API service integration using Axios + interceptors
- 🚧 Questions/Test integration with backend endpoints
- 🚧 Advanced reporting and analytics views

## 📖 System Overview

### What is Databank?

**Databank** is a comprehensive Test Management and Automated Exam Generation System designed for academic institutions. It enables faculty to encode questions into a centralized databank and automatically generate exam papers based on Bloom's Taxonomy distribution rules, subject hierarchies, and cognitive level requirements.

### Core Capabilities

#### 1. **Hierarchical Organization** 
```
Department (e.g., College of Computer Studies)
  └── Course (e.g., BS Computer Science)
      └── Subject (e.g., Data Structures)
          └── Topic (e.g., Arrays & Linked Lists)
              └── Question (e.g., Multiple Choice with Image)
```

#### 2. **Question Encoding & Management**
- **Rich-Text Editor**: Format questions with bold, italic, lists, headings, links, math symbols
- **Multiple-Choice Questions**: A–D answer entry with rich-text support
- **Image Support** (v2.8):
  - Upload images simultaneously while encoding questions
  - Client-side preview before saving (no server upload needed)
  - Adjust width (10-100%) and alignment (Left/Center/Right)
  - Image and question save together with single click
  - Max 5MB: JPG, PNG, GIF, BMP, WebP
  - Print-ready base64 conversion
- **Bloom's Taxonomy Classification**:
  - Level 1: Remembering & Understanding
  - Level 3: Applying & Analyzing  
  - Level 5: Evaluation & Creating
- **Topic-Scoped Questions**: Questions belong to specific topics for precise exam generation

#### 3. **Automated Exam Generation**
- **Table of Specification (TOS)**:
  - Define topics, allocated hours, and question distribution
  - Automatically calculates 30-30-40 distribution (Low-Middle-High cognitive levels)
  - Enforces Bloom's Taxonomy requirements
- **Smart Question Selection**:
  - Randomly selects questions from databank matching criteria
  - Ensures no duplicate questions across exam sets
  - Validates sufficient question pool before generation
- **Set Management**:
  - Auto-assigns Set A, B, C, D... labels for each term
  - Detects duplicate exams using question signature matching
  - Saves complete exam snapshots for reprinting

#### 4. **Print-Ready Output**
- **Three Print Formats**:
  - **Table of Specification** - Complete TOS with topics, hours, distribution
  - **Exam Paper** - Student-facing question paper with header, form fields, questions with images
  - **Answer Key** - Multi-column layout with correct answers
- **Print Features**:
  - Embedded university logo and branding
  - Filename generation: `{ExamType}_{Semester}_{Year}_{CourseCode}_{DateTime}`
  - Page break control to prevent question splitting
  - Base64 image embedding ensures images print correctly
- **Browser Compatibility**: Works across Chrome, Firefox, Safari, Edge

#### 5. **Multi-Department Access System** (v2.7)
- **User-Department Assignment**:
  - Users can access multiple departments (many-to-many relationship)
  - JWT tokens include multiple `departmentId` claims
  - DepartmentAccessService validates access rights
- **Admin Controls**:
  - Create/edit users with multi-select department assignment
  - Password visibility toggle, full dark mode support
  - Admins automatically get access to all departments
- **Department Switching**:
  - URL-based navigation: `/:departmentCode`
  - Department context preserved across pages
  - Protected routes validate access before rendering

#### 6. **Saved Exam Sets & Reports** (v2.6)
- **Persistent Exam Storage**:
  - Save generated exams with complete metadata
  - Stores exact question order and specification snapshot
  - Computes deterministic question signature for duplicate detection
- **Reports Interface**:
  - Filter saved sets by department, course, subject, exam type, semester, year
  - View stored exams with toggleable answer key
  - Reprint exams long after original generation

#### 7. **Security & Authentication**
- **JWT Authentication**:
  - Secure login with username/email + password
  - Token-based authorization for all API requests
  - Role-based access control (Admin vs User)
- **Activity Logging**:
  - Comprehensive audit trail for all system actions
  - Severity levels: Info, Warning, Error
  - Entity tracking for traceability

### Technical Stack

**Backend**:
- **Framework**: ASP.NET Core 9.0 (C#)
- **Database**: PostgreSQL with Entity Framework Core
- **Architecture**: FastEndpoints pattern with CQRS separation
- **Authentication**: JWT with role-based claims
- **Storage**: Local file storage (wwwroot/uploads/)

**Frontend**:
- **Framework**: React 18 with Create React App
- **Routing**: React Router v6
- **State Management**: Context API (Auth, Theme)
- **HTTP Client**: Axios with interceptors
- **Styling**: CSS Modules with dark mode support

**Key Libraries**:
- Lucide React (icons)
- FileReader API (image conversion)
- Canvas API (base64 encoding)

### Development Workflow

1. **Login**: Faculty authenticate via JWT
2. **Select Context**: Choose Department → Course → Subject → Topic
3. **Encode Questions**: 
   - Enter question text, choices, correct answer
   - Upload optional image with width/alignment settings (preview shows immediately)
   - Select Bloom's cognitive level
   - Click "Add Question" → Question and image save together automatically
4. **Generate Exam**:
   - Define Table of Specification with topics and hours
   - System validates question availability
   - Auto-generates exam with proper distribution
   - Save exam set (auto-assigned Set A/B/C...)
5. **Preview & Print**:
   - View generated exam with images
   - Print TOS, Exam Paper, or Answer Key
   - Images embedded as base64 for reliable printing

### Database Schema (Current)

**Core Tables**:
- `Departments` - Academic units (CCS, CBA, etc.)
- `Courses` - Degree programs (BSCS, BSIT, etc.)
- `Subjects` - Course subjects (Data Structures, Algorithms, etc.)
- `Topics` - Subject topics with allocated hours
- `Questions` - Exam items with Bloom level
- `QuestionImages` - Optional image attachments (one-to-one)
- `Options` - Answer choices with correctness flag
- `Tests` - Generated exams with metadata
- `TestQuestions` - Junction table (Test ↔ Question)
- `Users` - Faculty accounts
- `UserDepartments` - User ↔ Department many-to-many
- `ActivityLog` - System audit trail

### Recent Troubleshooting (v2.8)

**Issue #1**: Images not loading in preview  
**Solution**: Exported `API_BASE_URL` from api.js, fixed URL construction

**Issue #2**: Images missing in print dialog  
**Solution**: Implemented base64 conversion using Fetch API + FileReader to avoid CORS restrictions

### System Status (March 2026)

✅ **Production-Ready Features**:
- Department/Course/Subject/Topic hierarchy
- Question encoding with images
- Bloom's Taxonomy classification
- Automated exam generation
- Multi-department access
- Saved exam sets with duplicate detection
- Print-ready output (TOS, Exam, Answer Key)
- Dark mode throughout UI
- Activity logging and audit trail

🚧 **Planned Enhancements**:
- Advanced analytics dashboard
- Question usage statistics
- Bulk question import from CSV/Excel
- Question review workflow with approval
- Student test-taking interface
- Automatic grading and result tracking

---

**Current Version**: v2.8 (Question Image Support)  
**Last Updated**: March 11, 2026  
**License**: Proprietary (Academic Use)  
**Maintained By**: [University/Institution Name]

## � Documentation

### System Documentation- **[Question Image Support](docs/question-image-support.md)** - Complete guide to image upload, controls, print implementation, and troubleshooting- **[Multi-Department Access System](docs/multi-department-access-system.md)** - Complete guide to multi-department user access, JWT claims, admin UI, and migration strategy
- **[Generated Exam Save Flow](docs/generated-exam-save-flow.md)** - Exam persistence workflow, signature detection, and retrieval mechanics
- **[Refactoring Guide](REFACTORING_GUIDE.md)** - Database schema evolution and architectural decisions
- **[Refactoring Summary](REFACTORING_SUMMARY.md)** - Quick reference for schema changes

### API Documentation
- **[Postman Commands](POSTMANCMD.MD)** - API endpoint reference and testing guide
- **Postman Collection**: `postman/Databank.postman_collection.json`
### Deployment Documentation
- **[Production Deployment](docs/production-deployment.md)** - ✅ **LIVE SYSTEM** - Complete deployment timeline, issues resolved, and current status
- **[Deployment Guide](DEPLOYMENT.md)** - Complete production deployment guide for Vercel + Render + Neon
- **[Quick Start Deployment](QUICKSTART_DEPLOYMENT.md)** - Condensed 25-minute deployment guide
- **[Render Backend Guide](src/RENDER_DEPLOYMENT.md)** - Backend-specific deployment instructions

**Deployment Scripts:**
- `./deploy-setup.sh` - Pre-deployment checker and JWT key generator
- `./generate-jwt-key.sh` - Generate secure JWT signing key
- `./verify-deployment.sh` - Test deployed backend and frontend endpoints

**Deployment Stack:**
- Frontend: **Vercel** (React app hosting)
- Backend: **Render** (ASP.NET Core API)
- Database: **Neon** (PostgreSQL serverless)
## �� Recent Changes (Dec 8-9, 2025)

- Migrated the working Create-React-App frontend into `client/` and updated `client/package.json` to use `react-scripts` so the `client/` folder now hosts the active frontend (backup copy kept in `tdb-frontend/`).
- Implemented a global `ThemeContext` to persist dark-mode preference across pages (`client/src/contexts/ThemeContext.js`).
- Fixed dark-mode persistence and replaced per-page theme state with the ThemeProvider in `client/src/App.js`.
- Fixed Test Encoding & Editing page (`client/src/pages/TestEncodingAndEditing.jsx`): now displays the correct logged-in username, uses `useAuth()` and performs proper logout.
- Home navigation on encoding page is now admin-aware: Admin users are redirected to `/admin`.
- Fixed Course & Topic page navigation so the Data Entry dropdown correctly navigates to `/test-encoding` when selecting Test Encoding or Test Question Editing (`client/src/pages/CourseTopic.jsx`).

Files changed (high level):
- `client/src/pages/TestEncodingAndEditing.jsx` — auth & navigation fixes, UI improvements
- `client/src/pages/CourseTopic.jsx` — dropdown navigation and theme usage
- `client/src/contexts/ThemeContext.js` — new central theme provider
- `client/src/App.js` — wrapped app with `ThemeProvider`
- `client/package.json`, `client/index.html` — migrated to CRA structure

If you want me to push these changes to the remote branch now, I will commit and push to `Databank-Testing-Branch`.
