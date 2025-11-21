# Databank Backend

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
- **Question** – linked to a test with type, points, ordering and option collection.
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
