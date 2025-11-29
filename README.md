# Databank - Test Management System

Full-stack application for managing exam/test databank with C# ASP.NET Core backend and React frontend.

## 📦 Project Structure

- `src/` - Backend (C# ASP.NET Core Web API)
- `client/` - Frontend (React + TypeScript)
- `postman/` - API testing collection

## 🔑 Commit Standards
- We follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.
- Example commit messages:
  - `feat(auth): add jwt login endpoint`
  - `fix(users): prevent duplicate usernames`
  - `docs(readme): add setup instructions`

## 🗄️ Database Setup
1. Start PostgreSQL locally (default connection expects `localhost:5432`).
2. Configure credentials in `src/appsettings.Development.json`:
   ```json
   "ConnectionStrings": {
     "PostgresConnection": "Host=localhost;Port=5432;Database=databank_db;Username=postgres;Password=password;"
   }
   ```
3. Apply migrations:
   ```bash
   dotnet ef database update --project src/src.csproj
   ```
4. To rebuild from scratch (optional):
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   ```

## 🧩 Models / Entities
- **User** – base profile (name, username, email, department, `IsAdmin`) with navigation to results/logs.
- **Subject** – course/topic metadata that groups exams.
- **Test (Exam)** – belongs to a subject, tracks duration, publish flags, availability window.
- **Question** – linked to a test with type, points, ordering, `Difficulty` (Easy/Medium/Hard), `Category` (topic classification), and option collection.
- **Option** – answer choices per question, includes correctness flag and display order.
- **TestResult** – captures user scores, counts, duration, completion timestamp.
- **ActivityLog** – audit trail entries with severity/category referencing optional user.

## ✅ Verification
- `dotnet build src/src.csproj`
- `dotnet ef database update --project src/src.csproj`

## 🔐 Authentication / Authorization
1. Update `Jwt` settings in `src/appsettings.Development.json` (issuer, audience, signing key).
2. Register a user:
   ```bash
   curl -X POST https://localhost:5001/api/users \
     -H "Content-Type: application/json" \
     -d '{"firstName":"Admin","lastName":"User","department":"IT","username":"admin","password":"Secret123!","email":"admin@databank.dev","isAdmin":true}'
   ```
3. Login and capture the token:
   ```bash
   curl -X POST https://localhost:5001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"Secret123!"}'
   ```
4. Call admin-only endpoints with the `Authorization: Bearer <token>` header (e.g., `GET /api/admin/health`).
5. JWT payload includes `isAdmin` claim; policies enforce admin access (`RequireAuthorization("AdminOnly")`).

## 📡 API Endpoints

### Users (`/api/users`)
- `POST /api/users` - Create user (Admin only)
- `GET /api/users` - List all users with pagination (Requires auth)
  - Query params: `pageNumber`, `pageSize`
- `GET /api/users/{id}` - Get user by ID (Requires auth)
- `PUT /api/users/{id}` - Update user (Admin only)
- `DELETE /api/users/{id}` - Delete user (Admin only)

### Subjects (`/api/subjects`)
- `POST /api/subjects` - Create subject (Admin only)
- `GET /api/subjects` - List all subjects with pagination (Requires auth)
  - Query params: `pageNumber`, `pageSize`
- `GET /api/subjects/{id}` - Get subject by ID (Requires auth)
- `PUT /api/subjects/{id}` - Update subject (Admin only)
- `DELETE /api/subjects/{id}` - Delete subject (Admin only)

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
- **CORS Configuration**: Pre-configured for React frontend (localhost:3000, 5173, 5174)

## 🎨 Frontend Setup

The React frontend is located in the `client/` directory.

### Quick Start

1. Navigate to client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```
VITE_API_BASE_URL=https://localhost:5001
```

4. Start development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

See `client/README.md` for detailed frontend documentation.

## 🧪 Testing

### Postman Collection
A complete Postman collection is available at `postman/Databank.postman_collection.json`:
1. Import the collection into Postman
2. Set environment variables:
   - `baseUrl`: `https://localhost:5001` (or your API URL)
   - `token`: (auto-populated after login)
3. Run the "Login" request first to capture the token
4. All other requests will use the token automatically

The collection includes:
- All CRUD endpoints
- Authentication flows
- Bulk import examples
- Exam generation examples
- Search/filter examples
