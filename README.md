# Databank - Test Management System

Full-stack application for managing exam/test databank with C# ASP.NET Core backend and React frontend.

## ✨ Latest Updates (v2.1 - Course Hierarchy)

**Added Course-level organizational hierarchy to better represent degree programs.**

### New Changes (v2.1):
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

Test these hotfixes:
1. Start backend and frontend.
2. Navigate to `http://localhost:3000/course-topic/CCS`.
3. Select a course (e.g., BSCS), add a subject and click Save — the course selection should persist and the subject should appear in the history.
4. Add a course to `CBA` (departmentId = 3) via `POST /api/courses` and hard-refresh; it should show in the CBA course dropdown.


### Previous Changes (v2.0 - REFACTORED):
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
- **Question** – exam item linked to a topic with type, points, Bloom's level (cognitive classification), and option collection.
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
- `GET /api/tests` - List all tests with pagination (Requires auth)
  - Query params: `pageNumber`, `pageSize`
- `GET /api/tests/{id}` - Get test by ID (Requires auth)
- `PUT /api/tests/{id}` - Update test (Admin only)
- `DELETE /api/tests/{id}` - Delete test (Admin only)

### Questions (`/api/questions`)
- `POST /api/questions` - Create question (Admin only)
- `POST /api/questions/bulk` - Bulk import questions with options (Admin only)
- `GET /api/questions` - List all questions with pagination and filters (Requires auth)
  - Query params: `pageNumber`, `pageSize`, `testId?`, `subjectId?`, `search?`, `difficulty?`, `category?`
- `GET /api/questions/{id}` - Get question by ID (Requires auth)
- `PUT /api/questions/{id}` - Update question (Admin only)
- `DELETE /api/questions/{id}` - Delete question (Admin only)

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
  - Form for selecting Course + entering Topic Code, Value, Topic Description, Hours per Topic
  - Persists entries to backend `Subject` table via `POST /api/subjects` (Admin only)
  - Uses `Subject.Description` JSON metadata to store course/topic/value/hours
  - History table shows all topics previously created through this page
- Data Entry – **Test Encoding & Editing** (`/test-encoding`):
  - Rich-text question editor with toolbar (bold/italic/underline, lists, headings, links, images, math symbols)
  - Multiple-choice A–D answer entry with rich-text
  - Answer key explanation editor
  - Cognitive level selection (Remembering & Understanding / Applying & Analyzing / Evaluation & Creating)
  - Local in-page history grouped by cognitive level for the selected Subject + Topic
- Global:
  - Dark mode toggle
  - Logout modal and flow
  - Consistent navigation bar (Home, Data Entry, Reports) across pages

🚧 **Planned/Next Steps:**
- Wire `TestEncodingAndEditing.jsx` to real backend questions/tests using:
  - `POST /api/questions/bulk` for saving encoded questions + options
  - `GET /api/questions` for loading existing questions per Subject/Topic
- Add true Subject/Test-driven filtering instead of MOCK_SUBJECTS/MOCK_TOPICS
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
- ✅ API service integration using Axios + interceptors
- 🚧 Questions/Test integration with backend endpoints
- 🚧 Advanced reporting and analytics views

## 🔄 Recent Changes (Dec 8-9, 2025)

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
