# ✅ Vercel Deployment - Ready to Deploy!

## 🎯 Quick Deploy

### Deploy Frontend to Vercel

```bash
# Option 1: CLI (Fastest)
npm i -g vercel
vercel --prod

# Option 2: GitHub Integration
git push origin main
# Then import in Vercel dashboard
```

---

## 📋 Configuration Files Created

✅ **vercel.json** - Vercel configuration  
✅ **.vercelignore** - Files to exclude from deployment  
✅ **.env.production** - Production environment template  
✅ **DEPLOYMENT.md** - Complete deployment guide  
✅ **PIPEDREAM_SETUP.md** - Pipedream Connect integration guide  
✅ **README_DEPLOYMENT.md** - Quick reference guide

---

## 🌐 Domain Setup: financis.eqho.ai

### DNS Configuration

Add this CNAME record to your DNS provider (Cloudflare, Route53, etc.):

```
Type: CNAME
Name: financis
Value: cname.vercel-dns.com
TTL: Auto
```

### In Vercel Dashboard:

1. Go to **Settings** → **Domains**
2. Add domain: `financis.eqho.ai`
3. Wait for DNS propagation (10-15 minutes)
4. SSL certificate will be auto-provisioned

---

## 🔐 Environment Variables (Vercel)

Set these in Vercel Dashboard → **Settings** → **Environment Variables**:

```bash
# Backend API (update after backend deployment)
VITE_API_URL=https://api.eqho.ai

# Pipedream Connect
VITE_PIPEDREAM_CONNECT_TOKEN=pc_xxx_your_token
VITE_PIPEDREAM_ENVIRONMENT=production
VITE_PIPEDREAM_WEBHOOK_URL=https://api.eqho.ai/api/v1/webhooks/pipedream
```

**Scopes**: ✅ Production ✅ Preview ✅ Development

---

## 🔗 Pipedream Connect Setup

### From Your Screenshot Config:

```yaml
External User ID: investor-{{user_id}}
Environment: production
Webhook URI: https://api.eqho.ai/api/v1/webhooks/pipedream
Success Redirect: https://financis.eqho.ai/connect/success
Error Redirect: https://financis.eqho.ai/connect/error
```

### Steps:

1. **Create Pipedream Project**
   - Go to [pipedream.com](https://pipedream.com)
   - Create project: `eqho-investor-deck`

2. **Set Up Connect Component**
   - Add Stripe connection
   - Configure URLs as shown above
   - Copy Connect Token

3. **Add Token to Vercel**
   - Add `VITE_PIPEDREAM_CONNECT_TOKEN` in Vercel env vars

---

## 🚀 Deployment Checklist

### Before Deployment
- [ ] Code pushed to GitHub/GitLab
- [ ] Environment variables ready
- [ ] Domain DNS configured
- [ ] Backend deployed (Railway/Render/Docker)

### Deploy Frontend
- [ ] Run `vercel --prod` or connect GitHub repo
- [ ] Verify build succeeds
- [ ] Check deployment URL works

### Configure Domain
- [ ] Add `financis.eqho.ai` in Vercel
- [ ] Update DNS records
- [ ] Wait for SSL provisioning (automatic)
- [ ] Test HTTPS connection

### Set Environment Variables
- [ ] Add `VITE_API_URL`
- [ ] Add Pipedream tokens
- [ ] Verify all scopes enabled

### Pipedream Setup
- [ ] Create Pipedream project
- [ ] Configure Connect component
- [ ] Set webhook URLs
- [ ] Test connection flow

### Backend Setup
- [ ] Deploy backend to Railway/Render
- [ ] Add CORS origin: `https://financis.eqho.ai`
- [ ] Test `/health` endpoint
- [ ] Verify MongoDB connection

### Final Testing
- [ ] Visit https://financis.eqho.ai
- [ ] Test API calls
- [ ] Test Pipedream Connect flow
- [ ] Check error handling
- [ ] Monitor logs

---

## 📊 Expected URLs

| Service | URL | Status |
|---------|-----|--------|
| Frontend | https://financis.eqho.ai | ⏳ After deployment |
| Backend API | https://api.eqho.ai | ⏳ After backend setup |
| API Docs | https://api.eqho.ai/docs | ⏳ After backend setup |
| MongoDB | localhost:27017 or cloud | ⏳ Optional |

---

## 🎯 Next Steps

### 1. Deploy Frontend (Now)

```bash
# From project root
vercel --prod
```

### 2. Configure Domain (Immediate)

Add DNS record for `financis.eqho.ai`

### 3. Deploy Backend (Next)

Choose one:
- **Railway**: `railway up` from backend folder
- **Render**: Connect repo and configure
- **Docker**: Deploy container to any platform

### 4. Set Up Pipedream (Last)

Follow [PIPEDREAM_SETUP.md](./PIPEDREAM_SETUP.md)

---

## 🆘 Troubleshooting

### Build Fails
```bash
# Check logs in Vercel dashboard
# Common fix: ensure all dependencies in package.json
npm install
npm run build  # Test locally
```

### Domain Not Working
```bash
# Check DNS propagation
nslookup financis.eqho.ai
# Wait 10-15 minutes, then retry
```

### API Calls Failing
```bash
# Verify CORS in backend
# Check VITE_API_URL is correct
# Test API directly: curl https://api.eqho.ai/health
```

---

## 📚 Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete deployment guide (all platforms)
- **[PIPEDREAM_SETUP.md](./PIPEDREAM_SETUP.md)** - Pipedream Connect integration
- **[DOCKER_SETUP.md](./DOCKER_SETUP.md)** - MongoDB & Docker setup
- **[README_DEPLOYMENT.md](./README_DEPLOYMENT.md)** - Quick reference

---

## ✅ Success Criteria

Your deployment is successful when:

✅ https://financis.eqho.ai loads the investor deck  
✅ SSL certificate is active (padlock in browser)  
✅ API calls work to backend  
✅ Pipedream Connect flow completes  
✅ No console errors  
✅ All 6 slides navigate properly  

---

## 📞 Support

- **Vercel Support**: support@vercel.com
- **Vercel Docs**: https://vercel.com/docs
- **Pipedream Support**: support@pipedream.com
- **MongoDB Atlas**: support@mongodb.com

---

**Status**: 🚀 Ready to deploy!

**Time to Deploy**: ~15 minutes (frontend + domain)  
**Total Setup Time**: ~1 hour (including backend + Pipedream)

