# Deployment Guide - Vercel + financis.eqho.ai

## 🚀 Vercel Deployment

### Prerequisites
- GitHub/GitLab account with this repository
- Vercel account (free tier works)
- Domain access to eqho.ai

---

## Step 1: Deploy to Vercel

### Option 1: Deploy from Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New Project"**
3. Import your Git repository
4. Configure build settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. Click **"Deploy"**

### Option 2: Deploy from CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (from project root)
vercel

# Deploy to production
vercel --prod
```

---

## Step 2: Configure Domain (financis.eqho.ai)

### In Vercel Dashboard:

1. Go to your project → **Settings** → **Domains**
2. Add domain: `financis.eqho.ai`
3. Vercel will provide DNS records

### In your DNS Provider (e.g., Cloudflare, Route53):

Add the following DNS records for `financis.eqho.ai`:

**Option A: CNAME (Recommended)**
```
Type: CNAME
Name: financis
Value: cname.vercel-dns.com
TTL: Auto
```

**Option B: A Record**
```
Type: A
Name: financis
Value: 76.76.19.19  (Vercel's IP - check Vercel dashboard)
TTL: 60
```

**For HTTPS (automatic with Vercel):**
- Vercel automatically provisions SSL certificates
- HTTPS will be available within minutes after DNS propagation

### Verify Domain:
```bash
# Check DNS propagation
dig financis.eqho.ai

# Test HTTPS
curl -I https://financis.eqho.ai
```

---

## Step 3: Environment Variables

### Set in Vercel Dashboard:

Go to **Settings** → **Environment Variables**, add:

```bash
# Backend API URL
VITE_API_URL=https://api.eqho.ai

# Pipedream Connect
VITE_PIPEDREAM_CONNECT_TOKEN=your_token_here
VITE_PIPEDREAM_ENVIRONMENT=production

# Optional: Analytics
VITE_ANALYTICS_ID=your_analytics_id
```

### Environment Scopes:
- ✅ Production
- ✅ Preview  
- ✅ Development

---

## Step 4: Backend Deployment

### Option A: Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link project
railway link

# Deploy backend
cd backend
railway up
```

### Option B: Render

1. Go to [render.com](https://render.com)
2. Create **New Web Service**
3. Connect repository
4. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Environment**: Python 3.11

### Option C: Docker on Any Platform

```bash
# Build image
docker build -t eqho-backend ./backend

# Push to registry
docker tag eqho-backend your-registry/eqho-backend
docker push your-registry/eqho-backend

# Deploy to cloud platform
```

---

## Step 5: Update CORS Settings

After deploying backend, update `backend/app/core/config.py`:

```python
CORS_ORIGINS: List[str] = [
    "http://localhost:5173",
    "https://financis.eqho.ai",
    "https://*.vercel.app",  # Preview deployments
]
```

---

## 🔗 Pipedream Connect Integration

### Backend Webhooks

Update `backend/.env` with Pipedream endpoints:

```bash
# Pipedream Webhooks
PIPEDREAM_WEBHOOK_URL=https://your-pipedream-endpoint.m.pipedream.net
PIPEDREAM_SUCCESS_REDIRECT=https://financis.eqho.ai/connect/success
PIPEDREAM_ERROR_REDIRECT=https://financis.eqho.ai/connect/error
```

### Frontend Integration

Create `src/config/pipedream.js`:

```javascript
export const pipedreamConfig = {
  connectToken: import.meta.env.VITE_PIPEDREAM_CONNECT_TOKEN,
  environment: import.meta.env.VITE_PIPEDREAM_ENVIRONMENT || 'production',
  webhookUrl: import.meta.env.VITE_PIPEDREAM_WEBHOOK_URL,
  successRedirect: 'https://financis.eqho.ai/connect/success',
  errorRedirect: 'https://financis.eqho.ai/connect/error',
};
```

---

## 📊 Post-Deployment Checklist

### Frontend (Vercel)
- [ ] Domain configured and SSL active
- [ ] Environment variables set
- [ ] Build successful
- [ ] Site accessible at https://financis.eqho.ai
- [ ] API calls working to backend

### Backend (Railway/Render/Docker)
- [ ] Service deployed and healthy
- [ ] Environment variables configured
- [ ] MongoDB connected
- [ ] Stripe API working
- [ ] CORS configured for frontend domain
- [ ] API docs accessible

### DNS & SSL
- [ ] DNS records propagated (24-48 hours max)
- [ ] SSL certificate issued
- [ ] HTTPS working
- [ ] Redirects working (HTTP → HTTPS)

### Monitoring
- [ ] Set up error tracking (Sentry, LogRocket)
- [ ] Configure uptime monitoring
- [ ] Set up analytics
- [ ] API response time monitoring

---

## 🔧 Troubleshooting

### "Domain not verified"
```bash
# Check DNS propagation
nslookup financis.eqho.ai

# Wait 10-15 minutes, then verify in Vercel
```

### "Build failed"
```bash
# Check build logs in Vercel dashboard
# Common issues:
# 1. Node version mismatch
# 2. Missing environment variables
# 3. Build command incorrect
```

### "API calls failing"
```bash
# Check CORS settings in backend
# Verify VITE_API_URL is correct
# Check browser console for errors
```

### "Pipedream not connecting"
```bash
# Verify token is set in environment
# Check Pipedream dashboard for connection status
# Verify webhook URLs are correct
```

---

## 🚀 Continuous Deployment

### Automatic Deployments

Vercel automatically deploys:
- **Production**: Pushes to `main` branch
- **Preview**: Pull requests and other branches

### Manual Deployment

```bash
# Deploy specific branch
vercel --prod

# Deploy with specific environment
vercel --prod --env=production
```

---

## 📈 Performance Optimization

### Vercel Edge Network
- Automatic CDN distribution
- Edge caching enabled
- Gzip/Brotli compression

### Build Optimizations

Update `vite.config.js`:

```javascript
export default defineConfig({
  build: {
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react'],
        },
      },
    },
  },
});
```

---

## 🔐 Security

### Security Headers

Add to `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ]
}
```

---

## 📞 Support

- **Vercel Docs**: https://vercel.com/docs
- **Vercel Support**: support@vercel.com
- **Deployment Issues**: Check Vercel dashboard logs

---

## ✅ Final URLs

- **Production**: https://financis.eqho.ai
- **Backend API**: https://api.eqho.ai
- **API Docs**: https://api.eqho.ai/docs
- **Vercel Dashboard**: https://vercel.com/dashboard

**Status**: Ready for deployment! 🚀

