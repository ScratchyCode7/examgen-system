# Login Troubleshooting Guide

## Step 1: Create Your First Admin User

Since registration requires admin access, you need to create the first user. I've added a seed endpoint for this.

### Option A: Using the Seed Endpoint (Easiest)

1. Make sure backend is running
2. Open browser or Postman and call:
   ```
   POST https://localhost:7088/api/users/seed-admin
   ```
   (No authentication needed for this endpoint)

3. This will create:
   - Username: `admin`
   - Password: `Admin123!`
   - Email: `admin@databank.dev`

### Option B: Using Swagger UI

1. Go to `https://localhost:7088/swagger`
2. Find `POST /api/users/seed-admin`
3. Click "Try it out" → "Execute"
4. You should get a success message with credentials

### Option C: Using curl (PowerShell)

```powershell
curl -X POST https://localhost:7088/api/users/seed-admin -k
```

## Step 2: Verify Backend is Running

1. Check backend terminal - should show:
   ```
   Now listening on: https://localhost:7088
   ```

2. Test backend directly:
   - Open: `https://localhost:7088`
   - Should see: "Databank connected!"

3. Check Swagger:
   - Open: `https://localhost:7088/swagger`
   - Should see API documentation

## Step 3: Check Frontend Configuration

1. Verify `.env` file exists in `client/` directory:
   ```
   VITE_API_BASE_URL=https://localhost:7088
   ```

2. If `.env` doesn't exist, create it:
   ```bash
   cd client
   echo VITE_API_BASE_URL=https://localhost:7088 > .env
   ```

3. Restart frontend after creating `.env`:
   ```bash
   # Stop frontend (Ctrl+C)
   npm run dev
   ```

## Step 4: Test Login

1. Open frontend: `http://localhost:5173`
2. Enter credentials:
   - **Email/Username**: `admin`
   - **Password**: `Admin123!`
3. Click "Login"

## Common Issues

### Issue: "Network Error" or "Failed to fetch"

**Cause**: Backend not running or wrong API URL

**Solution**:
- Check backend is running on `https://localhost:7088`
- Verify `.env` file has correct URL
- Check browser console (F12) for detailed error

### Issue: "Unauthorized" or "Login failed"

**Cause**: User doesn't exist or wrong credentials

**Solution**:
- Create user using seed endpoint (Step 1)
- Verify username is `admin` (not email)
- Check password is exactly `Admin123!`

### Issue: CORS Error

**Cause**: Frontend URL not in CORS whitelist

**Solution**:
- Backend CORS is configured for ports 3000, 5173, 5174
- Make sure frontend is on one of these ports
- Check backend `Program.cs` CORS configuration

### Issue: SSL Certificate Error

**Cause**: Self-signed certificate warning

**Solution**:
- Click "Advanced" → "Proceed to localhost" in browser
- Or use HTTP: `http://localhost:5012` (update `.env` accordingly)

## Debug Steps

1. **Check Browser Console (F12)**:
   - Look for errors in Console tab
   - Check Network tab for failed requests

2. **Check Backend Logs**:
   - Look at backend terminal for errors
   - Check if login request is received

3. **Test API Directly**:
   - Use Swagger: `https://localhost:7088/swagger`
   - Try login endpoint: `POST /api/auth/login`
   - Use: `{"username": "admin", "password": "Admin123!"}`

4. **Verify Database**:
   - Check if user exists in PostgreSQL
   - Connect to database and query: `SELECT * FROM "Users";`

## Quick Test Checklist

- [ ] Backend running on `https://localhost:7088`
- [ ] Frontend running on `http://localhost:5173`
- [ ] `.env` file exists with correct API URL
- [ ] Admin user created (use seed endpoint)
- [ ] Browser console shows no errors
- [ ] Network tab shows login request

## Still Having Issues?

1. Check browser console (F12) for exact error message
2. Check backend terminal for any errors
3. Verify database connection is working
4. Try testing login via Swagger UI first
5. Check that both servers are actually running

