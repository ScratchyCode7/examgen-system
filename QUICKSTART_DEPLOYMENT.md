# Quick Start Deployment Guide

This is a condensed version of [DEPLOYMENT.md](DEPLOYMENT.md) for quick reference.

## 🚀 Prerequisites

Run the setup checker:
```bash
./deploy-setup.sh
```

This will:
- Check if you have all required tools
- Generate a JWT signing key
- Show a deployment checklist

## 📝 Deployment Steps (5 Steps)

### 1️⃣ Database Setup (Neon) - 5 minutes

1. Go to https://neon.tech → Sign up/Login
2. Create new project: `databank-production`
3. Copy connection string
4. Run migrations locally:
   ```bash
   cd src
   export ConnectionStrings__PostgresConnection="YOUR_NEON_CONNECTION_STRING"
   dotnet ef database update
   ```

### 2️⃣ Backend Deployment (Render) - 10 minutes

1. Go to https://dashboard.render.com → New + → Web Service
2. Connect GitHub repo
3. Configure:
   - Root Directory: `src`
   - Build: `dotnet publish -c Release -o out`
   - Start: `./out/src`
4. Add environment variables:
   ```bash
   ConnectionStrings__PostgresConnection=<from-neon>
   Jwt__SigningKey=<generate-with-script>
   Jwt__Issuer=https://your-backend.onrender.com
   Jwt__Audience=https://your-frontend.vercel.app
   FRONTEND_URL=https://your-frontend.vercel.app
   ASPNETCORE_ENVIRONMENT=Production
   ASPNETCORE_URLS=http://0.0.0.0:10000
   ```
5. Deploy and copy backend URL

### 3️⃣ Frontend Deployment (Vercel) - 5 minutes

1. Go to https://vercel.com/new
2. Import GitHub repo
3. Configure:
   - Root Directory: `client`
   - Framework: Create React App
4. Add environment variable:
   ```bash
   REACT_APP_API_BASE_URL=https://your-backend.onrender.com
   ```
5. Deploy and copy frontend URL

### 4️⃣ Update CORS (Render) - 2 minutes

1. Go back to Render → Your backend service → Environment
2. Update `FRONTEND_URL` with your actual Vercel URL
3. Restart service

### 5️⃣ Verify Deployment - 3 minutes

Run verification script:
```bash
./verify-deployment.sh
```

Or test manually:
1. Open your frontend URL
2. Login (admin / Admin123!)
3. Create a test question
4. Generate an exam

## 🔐 Generate JWT Key

```bash
./generate-jwt-key.sh
```

Save the output securely!

## 📊 Environment Variables Reference

### Backend (Render)
| Variable | Example |
|----------|---------|
| `ConnectionStrings__PostgresConnection` | `postgresql://user:password@neon.tech/db?sslmode=require` |
| `Jwt__SigningKey` | `<64-char-random-string>` |
| `Jwt__Issuer` | `https://databank-backend.onrender.com` |
| `Jwt__Audience` | `https://databank-frontend.vercel.app` |
| `FRONTEND_URL` | `https://databank-frontend.vercel.app` |
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `ASPNETCORE_URLS` | `http://0.0.0.0:10000` |

### Frontend (Vercel)
| Variable | Example |
|----------|---------|
| `REACT_APP_API_BASE_URL` | `https://databank-backend.onrender.com` |

## ⚠️ Common Issues

### Backend not responding
- **Cause**: Free tier cold start (15 min idle = sleep)
- **Solution**: Wait 30-60s for first request, or upgrade to Starter ($7/mo)

### CORS errors
- **Cause**: Wrong frontend URL in CORS config
- **Solution**: Verify `FRONTEND_URL` exactly matches Vercel URL (no trailing slash)

### Images not persisting
- **Cause**: Render ephemeral disk
- **Solution**: Add Render Disk (Settings → Disks → `/app/wwwroot/uploads`)

### Database connection failed
- **Cause**: Wrong connection string or SSL mode
- **Solution**: Ensure connection string includes `?sslmode=require`

## 💰 Costs

**Free Tier (Testing)**: $0/month
- Vercel: 100 GB bandwidth
- Render: 750 hours (sleeps after 15 min)
- Neon: 0.5 GB storage

**Production Minimum**: $8/month
- Vercel: Free
- Render Starter: $7/month (no sleep)
- Render Disk: $1/month (images)
- Neon: Free

## 📚 Full Documentation

For complete details, see:
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Complete deployment guide
- **[src/RENDER_DEPLOYMENT.md](src/RENDER_DEPLOYMENT.md)** - Backend-specific guide

## 🆘 Need Help?

1. Check logs:
   - Backend: Render dashboard → Logs
   - Frontend: Vercel dashboard → Deployments → Runtime Logs
2. Run verification: `./verify-deployment.sh`
3. Review common issues above
4. Check DEPLOYMENT.md for troubleshooting

---

**Deployment Time**: ~25 minutes total  
**Required**: GitHub account, Vercel account, Render account, Neon account

Good luck! 🚀
