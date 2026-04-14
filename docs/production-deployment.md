# Production Deployment Documentation

**Deployment Date**: March 12, 2026  
**Status**: ✅ Live and Operational

## Deployment Stack

### Frontend - Vercel
- **URL**: https://test-databank-system.vercel.app
- **Framework**: React 18 (Create React App)
- **Build Command**: `npm run build`
- **Output Directory**: `build`
- **Root Directory**: `client`
- **Region**: Washington, D.C., USA (East) - iad1
- **Environment Variables**:
  - `REACT_APP_API_BASE_URL`: https://examgen-system.onrender.com

### Backend - Render
- **URL**: https://examgen-system.onrender.com
- **Framework**: ASP.NET Core 9.0
- **Runtime**: Docker
- **Region**: Oregon (US West)
- **Build**: Multi-stage Dockerfile
- **Port**: 10000
- **Environment Variables** (8 total):
  1. `ASPNETCORE_ENVIRONMENT`: Production
  2. `ASPNETCORE_URLS`: http://+:10000
   3. `DOTNET_HOSTBUILDER__RELOADCONFIGONCHANGE`: false
   4. `ConnectionStrings__PostgresConnection`: Neon connection string
   5. `FRONTEND_URL`: https://test-databank-system.vercel.app
   6. `Jwt__Audience`: TestDatabankUsers
   7. `Jwt__Issuer`: TestDatabank
   8. `Jwt__SigningKey`: 128-char base64 key

### Database - Neon
- **Type**: PostgreSQL 17 (Serverless)
- **Region**: Singapore (ap-southeast-1)
- **Project Name**: TestDatabank
- **Database**: neondb
- **Connection**: Pooled connection via Neon proxy
- **Migrations Applied**: All 13 EF Core migrations
- **Tables**: 14 core tables (Departments, Courses, Subjects, Topics, Questions, etc.)

## Deployment Timeline

### Phase 1: Database Setup (✅ Complete)
1. Created Neon PostgreSQL database in Singapore region
2. Configured connection string with SSL and pooling
3. Applied all 13 Entity Framework migrations
4. Verified database tables and schema

### Phase 2: Backend Deployment (✅ Complete)
1. Created Dockerfile for ASP.NET Core 9.0
2. Fixed path configurations (appsettings.json location)
3. Resolved JWT configuration mismatch (`Jwt__Key` → `Jwt__SigningKey`)
4. Deployed to Render with Docker runtime
5. Verified service health and logs
6. Backend fully operational without errors

### Phase 3: Frontend Deployment (✅ Complete)
1. Removed invalid `client/vercel.json` with JSON comment
2. Fixed git push issues (multiple upstream branches)
3. Resolved ESLint errors blocking CI build:
   - Removed unused `isDarkMode` import
   - Fixed React Hook dependencies with `useCallback`
   - Removed unused variables and state
4. Successfully built and deployed to Vercel
5. Updated CORS configuration with full frontend URL

### Phase 4: Initial Data Setup (✅ Complete)
1. Created admin user: username `admin`, password `Admin123!`
2. Added 3 core departments:
   - **CCS** (College of Computer Studies)
   - **CBA** (College of Business Administration)
   - **CAS** (College of Arts and Sciences)

## Key Issues Resolved

### Backend Issues
1. **JWT Key Not Found**
   - **Problem**: Service crashed with "IDX10703: Cannot create SymmetricSecurityKey, key length is zero"
   - **Root Cause**: Environment variable named `Jwt__Key` but code expects `Jwt__SigningKey`
   - **Solution**: Renamed Render env var to `Jwt__SigningKey` to match JwtOptions.cs property

2. **Connection String Naming**
   - **Problem**: Backend couldn't find database connection
   - **Root Cause**: Environment variable vs configuration mismatch
   - **Solution**: Used `ConnectionStrings__PostgresConnection` format

### Frontend Issues
1. **Invalid vercel.json**
   - **Problem**: `client/vercel.json` had JSON comment on line 1
   - **Root Cause**: JSON doesn't support comments
   - **Solution**: Deleted file, committed, and pushed to GitHub

2. **Git Push Failure**
   - **Problem**: "Multiple upstream branches, refusing to push"
   - **Root Cause**: Local main branch had duplicate upstream configs
   - **Solution**: `git branch --unset-upstream`, `git branch --set-upstream-to=origin/main`

3. **ESLint Errors in CI**
   - **Problem**: Vercel treats warnings as errors (`process.env.CI = true`)
   - **Errors Fixed**:
     - `UserManagement.jsx`: Removed unused `isDarkMode` import
     - `ActivityLogs.jsx`: Fixed `useEffect` missing dependency by adding `useCallback`
     - `CourseTopic.jsx`: Removed unused `error` state and all `setError` calls
     - `DashboardAdmin.jsx`: Removed unused `Printer` import
     - `SavedExamsReport.jsx`: Removed unused variables
   - **Solution**: Multiple git commits fixing each error incrementally

4. **CORS Blocking**
   - **Problem**: Frontend couldn't call backend API
   - **Root Cause**: `FRONTEND_URL` set to `test-databank-system.vercel.app` (no protocol)
   - **Solution**: Updated to `https://test-databank-system.vercel.app` with full URL

## Current System Status

### ✅ Fully Operational Components
- User authentication (JWT-based login/logout)
- Admin dashboard with department management
- Department CRUD operations
- Course and Topic management
- Dark mode theme support
- Responsive UI design

### 🎯 Production URLs
- **Frontend**: https://test-databank-system.vercel.app
- **Backend API**: https://examgen-system.onrender.com
- **Health Check**: https://examgen-system.onrender.com/ (returns "Test Databank API is running")

### 📊 Performance Metrics
- **Frontend Build Time**: ~41 seconds
- **Backend Build Time**: ~120 seconds
- **Backend Startup Time**: ~5-10 seconds
- **Database Query Latency**: 94-157ms (acceptable for Neon serverless)

## Testing Checklist

### ✅ Completed Tests
- [x] Admin login with correct credentials
- [x] JWT token generation and storage
- [x] Protected route access
- [x] Department list API call
- [x] CORS policy working correctly
- [x] Dark mode persistence
- [x] Navigation between pages
- [x] Logout functionality

### 🔜 Pending Tests
- [ ] Create new courses via UI
- [ ] Create subjects and topics
- [ ] Question encoding workflow
- [ ] Exam generation
- [ ] Multi-department user access
- [ ] Activity log tracking

## Git Commits During Deployment

1. `f5ecabe` - fix: remove invalid vercel.json
2. `6c27ed6` - fix: resolve ESLint errors for Vercel build
3. `86b2dd6` - fix: restore setError state variable in CourseTopic
4. `058442f` - fix: remove unused error state variable
5. `d3f08ae` - fix: remove all setError calls from CourseTopic

## Environment Configuration Reference

### Render Backend Environment
```bash
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:10000
ConnectionStrings__PostgresConnection=Host=<neon-host>;Port=5432;Database=<db>;Username=<user>;Password=<password>;SSL Mode=Require;Trust Server Certificate=true
FRONTEND_URL=https://<your-frontend>.vercel.app
Jwt__Audience=<audience>
Jwt__Issuer=<issuer>
Jwt__SigningKey=<generate-secure-key>
```

### Vercel Frontend Environment
```bash
REACT_APP_API_BASE_URL=https://examgen-system.onrender.com
```

### Neon Database Configuration
```
Host: <neon-host>
Port: 5432
Database: <db>
Username: <user>
SSL Mode: Require
```

## Maintenance & Monitoring

### Log Access
- **Render Logs**: Dashboard → examgen-system → Logs tab
- **Vercel Logs**: Dashboard → test-databank-system → Deployments → Click deployment → Logs
- **Neon Monitoring**: Dashboard → TestDatabank → Monitoring

### Common Operations

#### Redeploy Backend
1. Go to Render dashboard
2. Click "Manual Deploy" → "Deploy latest commit"
3. Or update environment variable and save (auto-redeploys)

#### Redeploy Frontend
1. Push to GitHub main branch (auto-deploys)
2. Or go to Vercel → Deployments → Redeploy

#### Database Backup
- Neon automatically backs up serverless databases
- Export via `pg_dump` if manual backup needed

## Security Notes

### ✅ Implemented Security
- JWT authentication with secure signing key
- HTTPS enforced on all endpoints
- CORS configured for specific frontend origin
- Database SSL connection required
- Admin-only endpoints protected

### 🔒 Production Best Practices
- JWT signing key is 128-character base64 random string
- Admin password follows strong password policy
- Database credentials stored in environment variables
- No secrets committed to Git repository

## Troubleshooting Guide

### Frontend won't connect to backend
1. Check Render logs for backend errors
2. Verify `FRONTEND_URL` in Render matches Vercel URL exactly
3. Check browser console for CORS errors
4. Verify `REACT_APP_API_BASE_URL` in Vercel settings

### Backend crashes on startup
1. Check Render logs for error details
2. Verify all environment variables are set
3. Check JWT configuration matches JwtOptions.cs property names
4. Verify database connection string is correct

### Database connection fails
1. Check Neon dashboard for database status
2. Verify connection string includes pooler endpoint
3. Ensure SSL Mode=Require is set
4. Check Neon connection limits (free tier: 10 concurrent)

## Next Steps

1. **Add More Departments**: Create additional academic units as needed
2. **Create Courses**: Add degree programs under each department
3. **Setup Subjects & Topics**: Build syllabus hierarchy
4. **Encode Questions**: Start building question databank
5. **Test Exam Generation**: Validate automated exam creation
6. **User Management**: Create additional admin and faculty accounts
7. **Multi-Department Access**: Assign users to multiple departments

## Support & Resources

- **GitHub Repository**: ScratchyCode7/examgen-system
- **Main Documentation**: [README.md](../README.md)
- **Deployment Guide**: [DEPLOYMENT.md](../DEPLOYMENT.md)
- **Quick Start**: [QUICKSTART_DEPLOYMENT.md](../QUICKSTART_DEPLOYMENT.md)

---

**Last Updated**: March 12, 2026  
**Deployment Status**: ✅ Production Ready  
**System Version**: v2.8 (Question Image Support)
