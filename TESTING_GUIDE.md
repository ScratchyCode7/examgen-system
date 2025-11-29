# Testing Guide - Databank System

Complete guide to running and testing the Databank Test Management System.

## Prerequisites

1. **PostgreSQL** - Running on `localhost:5432`
2. **.NET SDK 9.0** - For backend
3. **Node.js 18+** - For frontend
4. **Database created** - `databank_db` in PostgreSQL

## Step 1: Database Setup

1. Ensure PostgreSQL is running
2. Verify connection string in `src/appsettings.Development.json`:
   ```json
   {
     "ConnectionStrings": {
       "PostgresConnection": "Host=localhost;Port=5432;Database=databank_db;Username=postgres;Password=password;"
     }
   }
   ```
3. Apply migrations:
   ```bash
   cd src
   dotnet ef database update --project src.csproj
   ```

## Step 2: Start Backend API

1. Open a terminal in the project root:
   ```bash
   cd src
   dotnet run
   ```

2. The API will start on:
   - **HTTPS**: `https://localhost:5001` (or `https://localhost:7088`)
   - **HTTP**: `http://localhost:5012`

3. Verify backend is running:
   - Open browser: `https://localhost:5001`
   - Should see: "Databank connected!"
   - Swagger UI: `https://localhost:5001/swagger`

## Step 3: Start Frontend

1. Open a **new terminal** in the project root:
   ```bash
   cd client
   npm install  # Only needed first time
   npm run dev
   ```

2. The frontend will start on:
   - **URL**: `http://localhost:5173` (or port shown in terminal)

3. Browser will auto-open, or navigate to the URL shown

## Step 4: Test the System

### A. Test Login

1. Open frontend: `http://localhost:5173`
2. You should see the login page
3. **First, create an admin user via API** (see below)
4. Login with credentials

### B. Create Admin User (First Time)

Since registration requires admin access, create the first admin user via API:

**Option 1: Using Swagger UI**
1. Go to `https://localhost:5001/swagger`
2. Find `POST /api/users` endpoint
3. Click "Try it out"
4. Use this JSON (you'll need to bypass auth temporarily or use Postman):
   ```json
   {
     "firstName": "Admin",
     "lastName": "User",
     "department": "IT",
     "username": "admin",
     "password": "Admin123!",
     "email": "admin@databank.dev",
     "isAdmin": true
   }
   ```

**Option 2: Using Postman**
1. Import `postman/Databank.postman_collection.json`
2. Use the "Register User" endpoint
3. Note: You may need to temporarily remove auth requirement for first user

**Option 3: Using curl (PowerShell)**
```powershell
curl -X POST https://localhost:5001/api/users `
  -H "Content-Type: application/json" `
  -d '{\"firstName\":\"Admin\",\"lastName\":\"User\",\"department\":\"IT\",\"username\":\"admin\",\"password\":\"Admin123!\",\"email\":\"admin@databank.dev\",\"isAdmin\":true}'
```

**Note**: You may need to temporarily comment out `RequireAuthorization("AdminOnly")` in `CreateUserEndpoint.cs` for the first user, then uncomment it.

### C. Test Frontend Flow

1. **Login Page**
   - Enter username: `admin`
   - Enter password: `Admin123!` (or your password)
   - Click "Login"
   - Should redirect to dashboard

2. **Dashboard**
   - Should see welcome message
   - Should see college cards
   - Header with navigation
   - Sidebar on left

3. **Navigation**
   - Click on college cards (currently static)
   - Use header navigation (Home, Data Entry, Reports)

## Step 5: Test API Endpoints

### Using Swagger UI

1. Go to `https://localhost:5001/swagger`
2. Click "Authorize" button (top right)
3. Enter: `Bearer <your-token>`
4. Test endpoints:
   - Login: `POST /api/auth/login`
   - Get Users: `GET /api/users`
   - Get Subjects: `GET /api/subjects`
   - etc.

### Using Postman

1. Import collection: `postman/Databank.postman_collection.json`
2. Set environment variable:
   - `baseUrl`: `https://localhost:5001`
3. Run "Login" request first
4. Token will auto-populate
5. Test other endpoints

## Troubleshooting

### Backend Issues

**Port already in use:**
```bash
# Find process using port
netstat -ano | findstr :5001
# Kill process (replace PID)
taskkill /PID <PID> /F
```

**Database connection error:**
- Check PostgreSQL is running
- Verify connection string
- Check database exists: `psql -U postgres -l`

**SSL Certificate error:**
- Click "Advanced" → "Proceed to localhost" in browser
- Or use HTTP: `http://localhost:5012`

### Frontend Issues

**Port already in use:**
- Vite will auto-use next available port
- Check terminal for actual URL

**API connection error:**
- Check backend is running
- Verify `.env` file has correct `VITE_API_BASE_URL`
- Check CORS is configured in backend

**Module not found:**
```bash
cd client
npm install
```

### Common Issues

**"Unauthorized" errors:**
- Token expired - login again
- Check token is in localStorage (DevTools → Application)

**CORS errors:**
- Backend CORS is configured for localhost:3000, 5173, 5174
- If using different port, update `Program.cs`

**Build errors:**
```bash
# Backend
cd src
dotnet clean
dotnet build

# Frontend
cd client
npm install
npm run build
```

## Quick Test Checklist

- [ ] PostgreSQL running
- [ ] Database migrations applied
- [ ] Backend starts without errors
- [ ] Swagger UI accessible
- [ ] Frontend starts without errors
- [ ] Login page displays correctly
- [ ] Can create first admin user
- [ ] Can login successfully
- [ ] Dashboard displays after login
- [ ] API endpoints work via Swagger/Postman

## Development Workflow

1. **Terminal 1**: Backend (`dotnet run` in `src/`)
2. **Terminal 2**: Frontend (`npm run dev` in `client/`)
3. **Browser**: `http://localhost:5173`
4. **API Docs**: `https://localhost:5001/swagger`

Both servers support hot-reload, so changes will auto-refresh!

