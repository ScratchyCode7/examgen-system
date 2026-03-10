# Multi-Department Access System

**Last Updated:** March 7, 2026

## Overview

This document describes the multi-department access system that allows non-admin users to be assigned to multiple departments (e.g., College of Business AND College of Computer Studies) with department-specific access control.

### Problem Statement

The original system used a single `User.DepartmentId` foreign key, limiting each user to one department. This prevented scenarios where:
- Faculty teach across multiple colleges
- Staff manage resources for multiple departments
- Users need cross-departmental access without admin privileges

### Solution

Implemented a many-to-many relationship via a `UserDepartments` join table, enabling:
- ✅ Users assigned to multiple departments
- ✅ Department-scoped data access validation
- ✅ JWT tokens carrying multiple department claims
- ✅ Admin UI for managing department assignments
- ✅ Non-admin users see only their assigned departments
- ✅ Backward compatibility during migration

---

## Architecture Changes

### Backend (ASP.NET Core + Entity Framework Core)

#### Database Schema

**New Join Table:**
```sql
CREATE TABLE "UserDepartments" (
    "UserId" uuid NOT NULL,
    "DepartmentId" integer NOT NULL,
    "RoleScope" text NULL,
    "CreatedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_UserDepartments" PRIMARY KEY ("UserId", "DepartmentId"),
    CONSTRAINT "FK_UserDepartments_Departments_DepartmentId" 
        FOREIGN KEY ("DepartmentId") REFERENCES "Departments" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_UserDepartments_Users_UserId" 
        FOREIGN KEY ("UserId") REFERENCES "Users" ("UserId") ON DELETE CASCADE
);
```

**Legacy Column (Preserved for Transition):**
- `Users.DepartmentId` - Nullable, marked `[Obsolete]`, will be dropped in future release

#### Entity Changes

**UserDepartment.cs** - New join entity
```csharp
public class UserDepartment
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    
    public int DepartmentId { get; set; }
    public Department Department { get; set; } = null!;
    
    public string? RoleScope { get; set; }  // Future: dept-specific roles
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
```

**User.cs** - Updated navigation properties
```csharp
[Obsolete("Use UserDepartments collection instead")]
public int? DepartmentId { get; set; }

[Obsolete("Use UserDepartments collection instead")]
public Department? Department { get; set; }

public ICollection<UserDepartment> UserDepartments { get; set; } = [];
```

**Department.cs** - Updated navigation properties
```csharp
[Obsolete("Use UserDepartments collection instead")]
public ICollection<User> Users { get; set; } = [];

public ICollection<UserDepartment> UserDepartments { get; set; } = [];
```

#### Key Services

**DepartmentAccessService.cs**
- `GetUserDepartmentIdsAsync(Guid userId)` - Retrieve all department IDs for a user
- `HasAccessToDepartmentAsync(Guid userId, int departmentId)` - Validate department access
- Admin users automatically get access to all active departments

**JwtTokenService.cs**
- Updated to include multiple `departmentId` claims (one per department)
- Example JWT payload:
```json
{
  "sub": "user-guid",
  "email": "user@example.com",
  "isAdmin": "false",
  "departmentId": ["1", "3", "5"],
  "exp": 1234567890
}
```

#### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/users/{userId}/departments` | List departments assigned to user |
| POST | `/api/users/{userId}/departments` | Assign departments to user (admin) |
| DELETE | `/api/users/{userId}/departments/{departmentId}` | Remove department assignment (admin) |
| POST | `/api/users` | Create user with department assignments |
| PUT | `/api/users/{userId}` | Update user including department assignments |
| GET | `/api/departments/by-code/{code}` | Get department details by code |

#### Migrations

1. **20260307121005_AddUserDepartmentsJoinTable.cs**
   - Creates `UserDepartments` table
   - Backfills existing `Users.DepartmentId` data with SQL INSERT
   - Makes `Users.DepartmentId` nullable
   - Preserves legacy column for transition period

2. **20260307125625_RemoveObsoleteDepartmentRelationship.cs**
   - Removes old EF Core relationship configuration
   - Adjusts FK constraint behavior

**Future Migration (When Safe to Drop Legacy Column):**
```csharp
migrationBuilder.DropForeignKey(
    name: "FK_Users_Departments_DepartmentId",
    table: "Users");

migrationBuilder.DropColumn(
    name: "DepartmentId",
    table: "Users");
```

---

### Frontend (React + React Router)

#### Context Updates

**AuthContext.js**
- Parses multiple `departmentId` claims from JWT
- Stores `user.departmentIds` array
- Provides helper methods:
  - `hasAccessToDepartment(deptId)` - Check access by ID
  - `hasAccessToDepartmentCode(code)` - Check access by code

```javascript
const departmentIds = Array.isArray(payload.departmentId) 
  ? payload.departmentId.map(id => parseInt(id, 10))
  : payload.departmentId 
    ? [parseInt(payload.departmentId, 10)] 
    : [];
```

#### New Components

**UserManagement.jsx**
- Full CRUD interface for user accounts
- Multi-select department assignment with checkboxes
- Password visibility toggle
- Dark mode support
- Located in admin dashboard under "Users" nav item

**DepartmentSwitcher.jsx**
- Dropdown for switching between assigned departments
- Updates URL `/:departmentCode` parameter
- Fetches user's departments via `getUserDepartments` API
- Dark mode compatible

#### Updated Components

**ProtectedRoute.jsx**
- Enhanced with department access validation
- Checks `hasAccessToDepartmentCode` when route includes `:departmentCode`
- Redirects to 403 if user lacks department access

**Dashboard.jsx** (Non-Admin)
- Uses `apiService.getUserDepartments(user.userId)` instead of `getDepartments()`
- Displays only assigned departments
- Changed heading from "Your Programs" to "Your Departments"

**DashboardAdmin.jsx**
- Integrated UserManagement component
- Added "Users" navigation item

#### API Service Methods

```javascript
// client/src/services/api.js
getUserDepartments: (userId) => api.get(`/api/users/${userId}/departments`)
assignUserDepartments: (userId, deptIds) => 
  api.post(`/api/users/${userId}/departments`, { departmentIds: deptIds })
getDepartmentByCode: (code) => api.get(`/api/departments/by-code/${code}`)
createUser: (userData) => api.post('/api/users', userData)
updateUser: (userId, userData) => api.put(`/api/users/${userId}`, userData)
deleteUser: (userId) => api.delete(`/api/users/${userId}`)
```

---

## Migration Strategy

### Phase 1: Add Join Table (✅ Complete)
- Created `UserDepartments` entity and configuration
- Generated migration with SQL backfill from `Users.DepartmentId`
- Marked legacy `DepartmentId` and relationships as `[Obsolete]`

### Phase 2: Update Code (✅ Complete)
- Updated all services to use `UserDepartments` collection
- Modified JWT token generation for multiple claims
- Built admin API endpoints for department assignment
- Created frontend components and contexts

### Phase 3: Remove Obsolete Code (✅ Complete)
- Removed obsolete EF relationship configurations
- Updated all code referencing `User.DepartmentId` directly
- Fixed all compiler warnings

### Phase 4: Drop Legacy Column (⏳ Pending)
**When to proceed:**
- All users successfully migrated to `UserDepartments`
- Frontend no longer relies on single `departmentId` field
- Database backups confirmed

**Steps:**
```bash
# 1. Generate migration
dotnet ef migrations add DropLegacyDepartmentIdColumn

# 2. Review generated migration - should drop FK and column
# 3. Test in development environment
# 4. Deploy to production with maintenance window
dotnet ef database update
```

---

## Key Files Reference

### Backend

| File | Purpose |
|------|---------|
| `src/Entities/UserDepartment.cs` | Join table entity |
| `src/Configuration/UserDepartmentConfiguration.cs` | EF Core configuration |
| `src/Services/DepartmentAccessService.cs` | Permission validation logic |
| `src/Services/JwtTokenService.cs` | Multi-department JWT claims |
| `src/Features/Users/Create/CreateUserEndpoint.cs` | User creation with dept assignment |
| `src/Features/Users/Update/UpdateUserEndpoint.cs` | User update with dept reassignment |
| `src/Features/Users/GetDepartments/GetUserDepartmentsEndpoint.cs` | List user's departments |
| `src/Features/Auth/Login/LoginEndpoint.cs` | Includes `UserDepartments` in query |
| `src/Migrations/20260307121005_AddUserDepartmentsJoinTable.cs` | Main migration |

### Frontend

| File | Purpose |
|------|---------|
| `client/src/contexts/AuthContext.js` | Multi-dept claim parsing |
| `client/src/components/UserManagement.jsx` | Admin user CRUD UI |
| `client/src/components/DepartmentSwitcher.jsx` | Department selector |
| `client/src/components/ProtectedRoute.jsx` | Department access validation |
| `client/src/pages/Dashboard.jsx` | Non-admin dept listing |
| `client/src/pages/DashboardAdmin.jsx` | Admin dashboard with Users tab |
| `client/src/services/api.js` | API client methods |
| `client/src/styles/UserManagement.css` | Dark mode styling |

---

## Common Tasks

### Add a User with Multiple Departments (Admin)

**Backend API:**
```bash
POST /api/users
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "username": "jdoe",
  "email": "jdoe@example.com",
  "password": "SecurePassword123!",
  "departmentIds": [1, 3, 5],
  "isAdmin": false
}
```

**Frontend:**
- Navigate to Admin Dashboard → Users
- Click "+ Add New User"
- Fill form and select multiple departments via checkboxes
- Submit

### Update User's Department Assignments

**Backend API:**
```bash
PUT /api/users/{userId}
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "jdoe@example.com",
  "departmentIds": [1, 3],  // Replaces all assignments
  "isAdmin": false,
  "isActive": true
}
```

### Check Department Access in Code

**Backend (C#):**
```csharp
// Inject DepartmentAccessService
var hasAccess = await _departmentAccessService
    .HasAccessToDepartmentAsync(userId, departmentId);

if (!hasAccess)
    return Results.Forbid();
```

**Frontend (JavaScript):**
```javascript
// In component with AuthContext
const { hasAccessToDepartment, hasAccessToDepartmentCode } = useAuth();

if (!hasAccessToDepartmentCode('CCS')) {
  return <Navigate to="/403" />;
}
```

### Query Data Scoped to User's Departments

**Example Endpoint:**
```csharp
app.MapGet("/api/questions", async (
    HttpContext httpContext,
    AppDbContext db,
    DepartmentAccessService deptAccess) =>
{
    var userId = httpContext.GetUserId();
    var userDeptIds = await deptAccess.GetUserDepartmentIdsAsync(userId);
    
    var questions = await db.Questions
        .Include(q => q.Subject)
            .ThenInclude(s => s.Course)
        .Where(q => userDeptIds.Contains(q.Subject.Course.DepartmentId))
        .ToListAsync();
    
    return Results.Ok(questions);
});
```

---

## Testing Checklist

### Backend
- [ ] Admin user can create user with multiple departments
- [ ] Non-admin user sees only assigned departments in JWT
- [ ] `DepartmentAccessService` correctly validates access
- [ ] Login endpoint includes `UserDepartments` navigation
- [ ] Update user endpoint replaces department assignments
- [ ] Delete department blocked if users assigned via `UserDepartments`
- [ ] Migration backfills data correctly from legacy column

### Frontend
- [ ] AuthContext parses multiple `departmentId` claims
- [ ] DepartmentSwitcher shows only user's departments
- [ ] ProtectedRoute validates department access on navigation
- [ ] Admin can assign/unassign departments via UserManagement
- [ ] Non-admin dashboard displays only assigned departments
- [ ] Password visibility toggle works in user creation form
- [ ] Dark mode styling consistent across all components

### Integration
- [ ] Create user → Login → Verify JWT claims
- [ ] Update user departments → Re-login → Verify new claims
- [ ] Navigate to department page → Access validated
- [ ] Admin sees all departments, non-admin sees assigned only

---

## Future Enhancements

### 1. Department-Scoped Roles
Extend `UserDepartment.RoleScope` to support per-department permissions:

```csharp
public enum DepartmentRole
{
    Viewer,      // Read-only access
    Contributor, // Create/edit within department
    Manager      // Full department admin
}
```

**Use Case:** User is a Manager in CCS but only a Contributor in CENG.

### 2. Automatic Department Assignment
Add rules engine for auto-assignment based on:
- Email domain (@ccs.edu → CCS department)
- Course enrollment data
- HR system integration

### 3. Department Access Audit Log
Track when users are granted/revoked department access:

```csharp
public class DepartmentAccessLog
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public int DepartmentId { get; set; }
    public string Action { get; set; } // "Granted" | "Revoked"
    public Guid PerformedBy { get; set; }
    public DateTime Timestamp { get; set; }
}
```

### 4. Bulk Department Assignment
Admin UI for CSV import/export of department assignments.

### 5. Department Access Requests
Self-service workflow where users request access, pending admin approval.

---

## Troubleshooting

### Issue: User can't access department after assignment

**Check:**
1. User has re-logged to get fresh JWT token
2. JWT contains correct `departmentId` claims (decode at jwt.io)
3. `UserDepartments` table has the assignment row
4. Department is active (`Departments.IsActive = true`)

**Fix:**
```sql
-- Verify assignment
SELECT * FROM "UserDepartments" WHERE "UserId" = 'user-guid';

-- Force log user out
DELETE FROM "Sessions" WHERE "UserId" = 'user-guid';
```

### Issue: Migration fails with duplicate key error

**Cause:** Existing data violates composite PK constraint.

**Fix:**
```sql
-- Find duplicates
SELECT "UserId", "DepartmentId", COUNT(*) 
FROM "UserDepartments" 
GROUP BY "UserId", "DepartmentId" 
HAVING COUNT(*) > 1;

-- Remove duplicates, keeping oldest
DELETE FROM "UserDepartments" a
USING "UserDepartments" b
WHERE a."UserId" = b."UserId" 
  AND a."DepartmentId" = b."DepartmentId"
  AND a."CreatedAt" > b."CreatedAt";
```

### Issue: Build warnings about obsolete properties

**Cause:** Code still referencing `User.DepartmentId` or `Department.Users`.

**Fix:**
- Search codebase: `rg "user\.DepartmentId|department\.Users"`
- Replace with `UserDepartments` collection
- Update DTOs to use `DepartmentIds` array

### Issue: Frontend shows "No departments" for valid user

**Cause:** Frontend calling wrong API endpoint.

**Fix:**
```javascript
// WRONG (admin endpoint, returns all departments)
const depts = await apiService.getDepartments();

// CORRECT (user-specific endpoint)
const depts = await apiService.getUserDepartments(user.userId);
```

---

## Security Considerations

1. **Authorization**: Always validate department access server-side; JWT claims are client-readable
2. **Least Privilege**: Assign only necessary departments per user
3. **Audit Trail**: Log department assignment changes in `ActivityLogs`
4. **Token Expiry**: Keep JWT expiry short (15-60 min) to limit stale claim impact
5. **Admin Actions**: Department assignments require `AdminOnly` policy

---

## Related Documentation

- [Generated Exam Save Flow](./generated-exam-save-flow.md) - Exam persistence workflow
- [API Documentation](../POSTMANCMD.MD) - Full API reference
- [Refactoring Guide](../REFACTORING_GUIDE.md) - Code structure guidelines

---

## Changelog

### March 7, 2026
- ✅ Created `UserDepartments` join table with migration
- ✅ Added `DepartmentAccessService` for permission checks
- ✅ Updated JWT to include multiple department claims
- ✅ Built admin API endpoints for department assignment
- ✅ Created `UserManagement` component with dark mode
- ✅ Updated `Dashboard` to show only assigned departments
- ✅ Fixed all obsolete warnings and synced EF model
- ✅ Applied `RemoveObsoleteDepartmentRelationship` migration

### Future
- ⏳ Drop legacy `Users.DepartmentId` column
- ⏳ Implement department-scoped roles
- ⏳ Add bulk assignment UI
- ⏳ Create access request workflow
