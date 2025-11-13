# Deploy Backend to Railway - 5 Minute Guide

## Why Railway?

✅ **Auto-deploys from GitHub** (every push)  
✅ **Zero config** (detects Python/FastAPI)  
✅ **Simple pricing** (~$5/month for your backend)  
✅ **Built-in monitoring** (logs, metrics, alerts)  
✅ **Integrates with Supabase** (environment variables)  
✅ **Vercel-friendly** (CORS, custom domains)

**vs GCP:** Railway is like Vercel for backends - push and forget!

---

## Step-by-Step Deployment

### 1. Go to Railway (1 min)

**URL:** https://railway.app

- Click "Login"
- Choose "Login with GitHub"
- Authorize Railway

### 2. Create New Project (1 min)

- Click "+ New Project"
- Select "Deploy from GitHub repo"
- Choose: `davidalee44/eqho-finance` (or your repo name)
- Railway will scan the repo

### 3. Configure Service (2 min)

**Root Directory:**
- Click "Settings"
- Set "Root Directory" to `backend`
- Railway will detect Python + FastAPI automatically

**Environment Variables:**
- Click "Variables" tab
- Add these (copy from your local `backend/.env`):

```
SUPABASE_URL=https://yindsqbhygvskolbccqq.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
STRIPE_SECRET_KEY=sk_live_51ONIel...
CORS_ORIGINS=https://eqho-due-diligence-467vfz9v4-eqho.vercel.app,https://eqho.ai
PORT=8000
```

**Note:** Railway automatically sets `$PORT` - your app uses it

### 4. Deploy (Automatic)

Railway will:
- ✅ Detect `requirements.txt`
- ✅ Install dependencies
- ✅ Start with `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- ✅ Generate a public URL

**Wait ~2 minutes for first deploy**

### 5. Get Your Backend URL

- Go to "Settings" → "Networking"
- Click "Generate Domain"
- You'll get: `https://eqho-backend-production.up.railway.app`
- Or add custom domain: `api.eqho.ai`

### 6. Update Vercel Frontend (1 min)

```bash
cd /Users/davidlee/eqho-due-diligence

# Add Railway backend URL to Vercel
vercel env add VITE_API_URL production
# Paste: https://eqho-backend-production.up.railway.app

# Redeploy frontend with new backend URL
vercel --prod
```

**Done!** ✅

---

## Test Your Deployed Backend

```bash
# Health check
curl https://eqho-backend-production.up.railway.app/health

# Get metrics
curl https://eqho-backend-production.up.railway.app/api/v1/metrics/summary

# November revenue
curl https://eqho-backend-production.up.railway.app/api/v1/revenue/current-month
```

---

## Auto-Deploy Setup

**Already configured!** Railway watches your GitHub repo.

**Workflow:**
```bash
# Make changes
git add .
git commit -m "feat: new feature"
git push origin main

# Railway automatically:
# 1. Detects push
# 2. Builds new image
# 3. Deploys to production
# 4. Zero downtime
```

**Just like Vercel!** 🎉

---

## Pricing

**Railway Starter:**
- $5 credit/month (free)
- Pay only for what you use beyond that
- Your FastAPI backend: ~$5-10/month estimate

**Cost breakdown:**
- CPU: $0.000463/min (~$10/month if always on)
- Memory: $0.000231/GB-min
- But scales to zero if no traffic

**vs GCP Cloud Run:**
- Similar pricing (~$5-10/month)
- But Railway is simpler to manage

---

## Monitoring & Logs

**Railway Dashboard:**
- Real-time logs (tail -f style)
- CPU/Memory graphs
- Request metrics
- Deploy history
- Environment variables UI

**Access:**
- https://railway.app/project/YOUR-PROJECT
- Click on service name
- "View Logs" tab

---

## Custom Domain (Optional)

**To use api.eqho.ai:**

1. Railway: Settings → Networking → Custom Domain
2. Add: `api.eqho.ai`
3. Railway gives you: CNAME record
4. Add to your DNS:
   ```
   CNAME api.eqho.ai → your-app.up.railway.app
   ```
5. Wait 5-10 minutes for DNS
6. Update CORS_ORIGINS to include api.eqho.ai

---

## Files Added for Railway

```
backend/
├── railway.json      # Railway config (optional)
├── nixpacks.toml     # Build configuration
├── Dockerfile        # Already exists (Railway can use this)
└── requirements.txt  # Already exists
```

Railway detects these automatically!

---

## Comparison: Railway vs GCP for Your Use Case

### Railway
```bash
# Deploy
git push origin main

# Done! Auto-deployed in 2 minutes
```

### GCP Cloud Run
```bash
# Deploy
gcloud builds submit --tag gcr.io/project/backend
gcloud run deploy backend --image gcr.io/project/backend
# Set environment variables manually
# Configure Cloud Build triggers
# Setup secrets in Secret Manager
# Configure VPC if needed
# Done in 30-45 minutes
```

**Railway wins for simplicity** while keeping professional-grade infrastructure.

---

## Next Steps (Your Choice)

### Option A: Deploy to Railway Now (5 min)
1. Go to https://railway.app
2. New Project → GitHub → `backend/`
3. Add environment variables
4. Deploy
5. Update Vercel
6. Done!

### Option B: Deploy to Railway Tomorrow (5 min)
Same as above, but when you're rested.

### Option C: Stick with GCP (30 min)
I can help set up Cloud Run + GitHub Actions.

---

**My strong recommendation: Railway**

It's like Vercel for backends - push and forget. Perfect for your stack (Vercel + Supabase + FastAPI).

Want me to wait while you set it up (5 min) or call it a night? 😊

Good night! 🌙
