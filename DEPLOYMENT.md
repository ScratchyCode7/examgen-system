# Deployment Guide - Databank Test Management System

This guide walks you through deploying your Databank application to production using:
- **Frontend**: Vercel
- **Backend**: Render
- **Database**: Neon (PostgreSQL)

## 📋 Prerequisites

- [ ] GitHub account
- [ ] Vercel account (sign up at https://vercel.com)
- [ ] Render account (sign up at https://render.com)
- [ ] Neon account (sign up at https://neon.tech)
- [ ] Project pushed to GitHub repository

---

## 🗄️ Step 1: Database Setup (Neon)

### 1.1 Create Neon Project

1. Go to https://neon.tech and sign in
2. Click **"Create Project"**
3. Configure:
   - **Project Name**: `databank-production`
   - **Database Name**: `databank_refactored`
   - **Region**: Choose closest to your users
4. Click **"Create Project"**

### 1.2 Get Connection String

1. In your Neon dashboard, click **"Connection Details"**
2. Select **"Connection String"**
3. Copy the connection string (format: `postgresql://user:password@host/database?sslmode=require`)
4. **Save this securely** — you'll need it for the backend deployment

### 1.3 Enable Connection Pooling (Recommended)

1. In Neon dashboard, go to **"Connection Pooling"**
2. Enable pooler
3. Copy the **pooled connection string** (uses port 5432)
4. Use this for your backend (`PostgresConnection`)

### 1.4 Run Database Migrations

**Option A: Local Migration (Recommended)**
```bash
cd src

# Update connection string temporarily
export ConnectionStrings__PostgresConnection="YOUR_NEON_CONNECTION_STRING"

# Run migrations
dotnet ef database update

# Verify tables created
# Connect to Neon via their SQL Editor and check tables
```

**Option B: From Render (After backend deployment)**
```bash
# SSH into Render service
# Run: dotnet ef database update
```

---

## 🔧 Step 2: Backend Setup (Render)

### 2.1 Prepare Backend Configuration

1. Ensure your `src/appsettings.json` has production-ready settings:
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*"
}
```

2. Environment variables will override these settings on Render

### 2.2 Create Render Web Service

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `databank-backend`
   - **Region**: Same as your Neon database
   - **Branch**: `main` (or your production branch)
   - **Root Directory**: `src`
   - **Runtime**: `.NET`
   - **Build Command**: `dotnet publish -c Release -o out`
   - **Start Command**: `./out/src`

### 2.3 Configure Environment Variables

In Render dashboard → Environment tab, add:

```bash
# Database
ConnectionStrings__PostgresConnection=postgresql://user:password@neon-host/databank_refactored?sslmode=require

# JWT Configuration
Jwt__Issuer=https://your-backend.onrender.com
Jwt__Audience=https://your-frontend.vercel.app
Jwt__SigningKey=YOUR_SECURE_RANDOM_KEY_HERE_AT_LEAST_32_CHARACTERS

# CORS (Frontend URL)
FRONTEND_URL=https://your-frontend.vercel.app

# Environment
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://0.0.0.0:10000
```

**Generate a secure JWT signing key:**
```bash
# Run this locally:
openssl rand -base64 64
```

### 2.4 Health Check Configuration

1. In Render dashboard → Settings
2. Set **Health Check Path**: `/api/admin/health` (if public) or create a public health endpoint
3. **Grace Period**: 300 seconds

### 2.5 Deploy Backend

1. Click **"Create Web Service"**
2. Wait for build to complete (5-10 minutes)
3. Once deployed, copy your backend URL: `https://databank-backend-xxxx.onrender.com`

### 2.6 Test Backend

```bash
# Health check
curl https://your-backend.onrender.com/api/admin/health

# Login test
curl -X POST https://your-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}'
```

---

## 🎨 Step 3: Frontend Setup (Vercel)

### 3.1 Prepare Frontend Configuration

1. Create `.env.production` in `client/` folder:
```bash
REACT_APP_API_BASE_URL=https://your-backend.onrender.com
```

2. Update `client/.gitignore` to keep `.env.production` private:
```
# Environment files
.env.local
.env.development.local
.env.test.local
.env.production.local
```

### 3.2 Create Vercel Project

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure:
   - **Project Name**: `databank-frontend`
   - **Framework Preset**: Create React App
   - **Root Directory**: `client`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `build` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

### 3.3 Configure Environment Variables

In Vercel dashboard → Settings → Environment Variables:

```bash
REACT_APP_API_BASE_URL=https://your-backend.onrender.com
```

**Important**: 
- Set for **Production** environment
- You can also add for **Preview** and **Development** if needed

### 3.4 Deploy Frontend

1. Click **"Deploy"**
2. Wait for build (2-5 minutes)
3. Once deployed, copy your frontend URL: `https://databank-frontend.vercel.app`

---

## 🔐 Step 4: Update CORS Configuration

Now that you have your frontend URL, update backend CORS:

1. Go to Render dashboard → Your backend service
2. Update environment variable:
   ```bash
   FRONTEND_URL=https://databank-frontend.vercel.app
   ```
3. Restart the service (Manual Deploy → Clear cache & Deploy)

---

## ✅ Step 5: Verification & Testing

### 5.1 Test Complete Flow

1. **Navigate to your frontend**: `https://databank-frontend.vercel.app`
2. **Login** with admin credentials:
   - Username: `admin`
   - Password: `Admin123!`
3. **Test features**:
   - Navigate to Course-Topic page
   - Create a test subject and topic
   - Navigate to Test Encoding
   - Create a test question
   - Generate an exam

### 5.2 Check Logs

**Backend logs (Render):**
- Go to Render dashboard → Your service → Logs
- Monitor for errors

**Frontend logs (Vercel):**
- Go to Vercel dashboard → Your project → Deployments → Click deployment → Runtime Logs

### 5.3 Common Issues & Solutions

**Issue**: CORS errors in browser console
- **Solution**: Verify `FRONTEND_URL` matches exactly (no trailing slash)
- Check backend CORS configuration is using environment variable

**Issue**: Backend not responding (504 errors)
- **Solution**: Render free tier has cold starts (15 min idle = sleep)
- First request may take 30-60 seconds
- Consider upgrading to paid tier ($7/month)

**Issue**: JWT errors ("Invalid token")
- **Solution**: Ensure `Jwt__SigningKey` matches on backend
- Verify `Jwt__Issuer` and `Jwt__Audience` match your URLs

**Issue**: Database connection errors
- **Solution**: Check Neon connection string is correct
- Verify SSL mode is set: `?sslmode=require`
- Check Neon database is active (free tier suspends after 7 days inactivity)

---

## ⚠️ Important Considerations

### File Storage (Images)

**Current Issue**: Your app stores images in `wwwroot/uploads/questions/`. Render's disk is **ephemeral** — files will be deleted on redeploy.

**Solutions:**

**Option A: Add Render Disk Storage** (Simplest)
1. Go to Render dashboard → Your service → Disks
2. Add disk: `/app/wwwroot/uploads` → 1 GB → $1/month
3. Images persist across deploys

**Option B: Use Cloudinary** (Recommended for production)
1. Sign up at https://cloudinary.com (free tier: 25 GB/month)
2. Install package: `dotnet add package CloudinaryDotNet`
3. Update `FileStorageService` to upload to Cloudinary
4. Add environment variable: `CLOUDINARY_URL=cloudinary://...`

**Option C: Use AWS S3 / Backblaze B2**
- More complex setup
- Low cost (~$0.01/GB/month)

### Database Backups

**Neon Free Tier:**
- Automatic backups for 7 days
- Point-in-time recovery

**Recommendation**: Export database weekly:
```bash
pg_dump $NEON_CONNECTION_STRING > backup-$(date +%Y%m%d).sql
```

### Monitoring & Uptime

**Free Tier Limitations:**
- Render: Sleeps after 15 min inactivity
- Neon: Suspends after 7 days inactivity

**Solutions:**
- Upgrade Render to Starter ($7/month) — no sleep
- Use uptime monitor (e.g., UptimeRobot) to ping your app every 5 min
- Upgrade Neon to Pro ($19/month) — no suspension

---

## 🚀 Post-Deployment Setup

### Create Production Admin User

If you need to seed the admin user:

```bash
curl -X POST https://your-backend.onrender.com/api/users/seed-admin
```

Then login with:
- Username: `admin`
- Password: `Admin123!`

**Security Recommendation**: Change the default admin password immediately:
- Login to frontend
- Navigate to user management
- Update admin password

---

## 📊 Cost Breakdown

### Free Tier (Development/Testing)

| Service | Free Tier Limits | Cost |
|---------|-----------------|------|
| Vercel | 100 GB bandwidth/month | $0 |
| Render | 750 hours/month, sleeps after 15 min | $0 |
| Neon | 0.5 GB storage, suspends after 7 days | $0 |
| **Total** | | **$0/month** |

### Recommended Production Setup

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Hobby (plenty for most uses) | $0 |
| Render | Starter (no cold starts, 512 MB RAM) | $7/month |
| Neon | Free (sufficient unless high traffic) | $0 |
| Render Disk | 1 GB for images | $1/month |
| **Total** | | **$8/month** |

### Full Production Setup (High Traffic)

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Pro (if needed for team features) | $20/month |
| Render | Standard (1 GB RAM) | $25/month |
| Neon | Pro (no limits, better performance) | $19/month |
| Cloudinary | Free Tier (image hosting) | $0 |
| **Total** | | **$64/month** |

---

## 🔄 Continuous Deployment

Both Vercel and Render support automatic deployments:

**Vercel (Auto-Deploy)**:
- Push to `main` branch → Auto-deploy to production
- Push to other branches → Preview deployments

**Render (Auto-Deploy)**:
- Go to Settings → Build & Deploy
- Enable "Auto-Deploy" for `main` branch
- Push to `main` → Automatic rebuild and deploy

---

## 🛠️ Useful Commands

### Update Backend (Render)
```bash
# Manual deploy via dashboard
# OR push to GitHub (if auto-deploy enabled)
git add .
git commit -m "feat: update backend"
git push origin main
```

### Update Frontend (Vercel)
```bash
# Push to GitHub (auto-deploy enabled by default)
git add .
git commit -m "feat: update frontend"
git push origin main
```

### View Backend Logs (Render)
```bash
# Via dashboard: Logs tab
# OR via CLI:
render logs -s databank-backend
```

### Rollback Deployment
**Vercel**: Deployments → Select previous deployment → Promote to Production
**Render**: Manual Deploy → Select previous commit

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)
- [Neon Documentation](https://neon.tech/docs)
- [ASP.NET Core Deployment](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/)

---

## 🆘 Support & Troubleshooting

If you encounter issues:

1. **Check logs first**: Backend (Render) and Frontend (Vercel) logs
2. **Verify environment variables**: Ensure all required vars are set
3. **Test API directly**: Use curl or Postman to test backend endpoints
4. **Browser console**: Check for CORS or network errors
5. **Health checks**: Verify `/api/admin/health` responds

---

**Deployment Date**: March 12, 2026  
**Version**: v2.8 (Question Image Support)  
**Maintained By**: Databank Development Team

---

## ✅ Deployment Checklist

Print this and check off as you complete each step:

### Database (Neon)
- [ ] Created Neon project
- [ ] Copied connection string
- [ ] Ran migrations (`dotnet ef database update`)
- [ ] Verified tables exist in Neon SQL Editor
- [ ] Seeded admin user

### Backend (Render)
- [ ] Created web service
- [ ] Set root directory to `src`
- [ ] Configured build/start commands
- [ ] Added all environment variables
- [ ] Generated secure JWT signing key
- [ ] Set health check path
- [ ] Deployed successfully
- [ ] Tested login endpoint

### Frontend (Vercel)
- [ ] Created Vercel project
- [ ] Set root directory to `client`
- [ ] Added `REACT_APP_API_BASE_URL` environment variable
- [ ] Deployed successfully
- [ ] Verified app loads

### Final Configuration
- [ ] Updated CORS with production frontend URL
- [ ] Tested complete login flow
- [ ] Created test question with image
- [ ] Generated test exam
- [ ] Verified printing works

### Production Readiness
- [ ] Changed default admin password
- [ ] Set up file storage solution (disk/cloud)
- [ ] Configured automatic backups
- [ ] Set up uptime monitoring (optional)
- [ ] Documented production URLs
- [ ] Informed users of new URL

**Status**: ⬜ Not Started | 🟡 In Progress | ✅ Completed

---

Good luck with your deployment! 🚀
