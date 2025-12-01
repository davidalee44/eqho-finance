# Deployment Guide

## Overview

- **Frontend**: Vercel (recommended) or any static host
- **Backend**: Railway (recommended), Render, or Docker
- **Database**: Supabase (managed PostgreSQL)

## Frontend Deployment (Vercel)

### Quick Deploy

```bash
npm i -g vercel
vercel --prod
```

### Configuration

1. Connect GitHub repository to Vercel
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variables:
   - `VITE_API_URL` - Backend URL
   - `VITE_SUPABASE_URL` - Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Supabase anon key

### Custom Domain

```
financis.eqho.ai -> CNAME -> cname.vercel-dns.com
```

### Edge Config (Feature Flags)

1. Create Edge Config in Vercel dashboard
2. Add flag values as JSON
3. Backend reads via `/api/v1/flags` endpoint

## Backend Deployment (Railway)

### Quick Deploy

1. Create new project in Railway
2. Connect GitHub repository
3. Set root directory: `backend`
4. Add environment variables (see Setup docs)

### Configuration Files

**railway.json**
```json
{
  "build": {
    "builder": "nixpacks"
  },
  "deploy": {
    "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
  }
}
```

**railway.toml**
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
```

## Docker Deployment

### Build Image

```bash
cd backend
docker build -t eqho-backend .
```

### Run Container

```bash
docker run -d \
  -p 8000:8000 \
  -e SUPABASE_URL=... \
  -e SUPABASE_ANON_KEY=... \
  -e STRIPE_SECRET_KEY=... \
  eqho-backend
```

### Docker Compose

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file:
      - ./backend/.env
```

## Supabase Configuration

### Auth Redirect URIs

Add to Supabase Auth settings:
- `https://financis.eqho.ai`
- `https://your-app.vercel.app`
- `http://localhost:5173` (development)

### Google OAuth

1. Create OAuth app in Google Cloud Console
2. Add authorized redirect URI:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```
3. Copy Client ID and Secret to Supabase Auth settings

## Environment Checklist

### Production Frontend
- [ ] VITE_API_URL points to production backend
- [ ] VITE_SUPABASE_URL is production Supabase
- [ ] Build succeeds without errors

### Production Backend
- [ ] SUPABASE_URL is production
- [ ] STRIPE_SECRET_KEY is live key (not test)
- [ ] CORS_ORIGINS includes frontend domain
- [ ] Health check responds at /health

### Supabase
- [ ] RLS enabled on all tables
- [ ] Auth redirect URIs configured
- [ ] Service role key secured (never in frontend)

## Monitoring

### Health Endpoints

- Frontend: Check Vercel deployment status
- Backend: `GET /health` returns system status
- Supabase: Dashboard monitoring

### Logs

- Vercel: Functions tab in dashboard
- Railway: Deployment logs
- Supabase: Database logs, Auth logs

