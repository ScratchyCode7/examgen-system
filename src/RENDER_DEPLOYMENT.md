# Databank Backend - Render Deployment Guide

## Quick Start

### 1. Create Web Service on Render

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `databank-backend`
   - **Runtime**: `.NET`
   - **Root Directory**: `src`
   - **Build Command**: `dotnet publish -c Release -o out`
   - **Start Command**: `./out/src`
   - **Instance Type**: Free (or Starter for production)

### 2. Environment Variables

Add these in Render dashboard → Environment tab:

```bash
# Database (from Neon)
ConnectionStrings__PostgresConnection=postgresql://...

# JWT Configuration
Jwt__Issuer=https://your-backend.onrender.com
Jwt__Audience=https://your-frontend.vercel.app
Jwt__SigningKey=<generate-secure-key>

# CORS
FRONTEND_URL=https://your-frontend.vercel.app

# ASP.NET
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://0.0.0.0:10000
```

### 3. Generate JWT Signing Key

```bash
openssl rand -base64 64
```

### 4. Optional: Add Persistent Disk (for image uploads)

1. In Render dashboard → Your service → Disks
2. Add disk:
   - **Name**: `uploads`
   - **Mount Path**: `/app/wwwroot/uploads`
   - **Size**: 1 GB
   - **Cost**: $1/month

This prevents image uploads from being deleted on redeploy.

### 5. Deploy

Click "Create Web Service" and wait for deployment (5-10 minutes).

### 6. Verify Deployment

```bash
# Test health endpoint
curl https://your-backend.onrender.com/

# Test login
curl -X POST https://your-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}'
```

## Troubleshooting

### Issue: Build fails with "dotnet not found"
- **Solution**: Ensure Runtime is set to ".NET" in Render dashboard

### Issue: App crashes on startup
- **Solution**: Check logs in Render dashboard. Common causes:
  - Missing environment variables
  - Invalid database connection string
  - Port binding issue (ensure `ASPNETCORE_URLS=http://0.0.0.0:10000`)

### Issue: Database connection errors
- **Solution**: 
  - Verify Neon connection string includes `?sslmode=require`
  - Check Neon database is active (not suspended)
  - Test connection locally first

### Issue: Images not persisting
- **Solution**: Add persistent disk (see step 4) or migrate to Cloudinary

## Auto-Deploy

Enable automatic deployments:
1. Push to `main` branch → Auto-deploy
2. Push to other branches → Manual deploy only

Configure in: Settings → Build & Deploy → Auto-Deploy

## Monitoring

- **Logs**: Dashboard → Logs tab
- **Metrics**: Dashboard → Metrics tab (CPU, memory, requests)
- **Health Checks**: Configured at `/` endpoint

## Scaling

### Free Tier Limitations:
- 512 MB RAM
- Sleeps after 15 min inactivity
- 750 hours/month limit

### Upgrade Options:
- **Starter**: $7/month - No sleep, 512 MB RAM
- **Standard**: $25/month - 1 GB RAM
- **Pro**: $85/month - 4 GB RAM

## Cost Optimization

For free tier:
- Use uptime monitor to keep app awake (ping every 5 min)
- Accept cold starts (30-60s first request after idle)

For production:
- Upgrade to Starter tier ($7/month) minimum
- Add disk storage only if needed ($1/GB/month)
