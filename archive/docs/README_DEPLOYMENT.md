# Quick Deployment Guide

## 🚀 Deploy in 5 Minutes

### 1. Deploy Frontend to Vercel

```bash
# Option A: Using Vercel CLI
npm i -g vercel
vercel login
vercel --prod

# Option B: Via GitHub
# Push to GitHub and import in Vercel dashboard
```

### 2. Configure Domain

In Vercel Dashboard:
1. Go to **Settings** → **Domains**
2. Add: `financis.eqho.ai`
3. Copy DNS records

In your DNS provider:
```
Type: CNAME
Name: financis
Value: cname.vercel-dns.com
```

### 3. Set Environment Variables

In Vercel Dashboard → **Settings** → **Environment Variables**:

```bash
VITE_API_URL=https://api.eqho.ai
VITE_PIPEDREAM_CONNECT_TOKEN=your_token
VITE_PIPEDREAM_ENVIRONMENT=production
```

### 4. Deploy Backend

**Railway (Recommended)**:
```bash
npm i -g @railway/cli
railway login
cd backend
railway up
```

**Or use Docker**:
```bash
docker-compose up -d
```

### 5. Set Up Pipedream

1. Go to [pipedream.com](https://pipedream.com)
2. Create project: `eqho-investor-deck`
3. Set up Stripe Connect
4. Copy Connect Token to Vercel env vars

---

## 📋 Post-Deployment

✅ Check deployment: https://financis.eqho.ai  
✅ Verify API: https://api.eqho.ai/health  
✅ Test Connect flow  
✅ Monitor errors

---

## 📚 Full Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment guide
- [PIPEDREAM_SETUP.md](./PIPEDREAM_SETUP.md) - Pipedream integration
- [DOCKER_SETUP.md](./DOCKER_SETUP.md) - Docker & MongoDB setup

---

**Need Help?** Check the full deployment guides above or contact the team.

