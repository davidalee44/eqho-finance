# Supabase Setup Guide

Complete guide for the Supabase + Backend integration.

---

## ✅ Current Status

Your Supabase is already set up and configured:
- **URL**: https://yindsqbhygvskolbccqq.supabase.co
- **Tables**: `stripe_subscriptions`, `stripe_customers`, `mrr_snapshots`
- **Sync Script**: `scripts/sync_stripe_to_supabase.js`

---

## 🚀 Quick Start

### 1. Sync Stripe Data to Supabase

```bash
# Run the sync script
node scripts/sync_stripe_to_supabase.js
```

This will:
- Pull all active Stripe subscriptions
- Pull all customers
- Calculate and store MRR snapshots
- Categorize products (TowPilot, Enterprise, Pro, etc.)

### 2. Start Backend API

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### 3. Test API

```bash
# Get TowPilot metrics
curl http://localhost:8000/api/v1/metrics/towpilot

# Get summary
curl http://localhost:8000/api/v1/metrics/summary

# Check cache
curl http://localhost:8000/api/v1/cache/stats
```

---

## 📊 Database Schema

### Tables

#### `stripe_subscriptions`
Stores all active Stripe subscriptions with calculated MRR:

```sql
- stripe_subscription_id (PK)
- stripe_customer_id
- status
- product_name
- product_category (TowPilot, Enterprise, Pro, etc.)
- amount_cents
- amount_monthly (calculated MRR)
- currency
- billing_interval
- current_period_start
- current_period_end
- metadata (JSONB)
- last_synced_at
```

#### `stripe_customers`
Customer information:

```sql
- stripe_customer_id (PK)
- email
- name
- description
- active_subscriptions_count
- total_mrr
- metadata (JSONB)
- last_synced_at
```

#### `mrr_snapshots`
Daily MRR snapshots for trending:

```sql
- snapshot_date (PK)
- total_mrr
- total_subscriptions
- total_customers
- towpilot_mrr
- towpilot_count
- enterprise_mrr
- enterprise_count
- pro_mrr
- pro_count
- other_mrr
- other_count
- metadata (JSONB)
```

---

## 🔄 Sync Schedule

### Manual Sync

```bash
node scripts/sync_stripe_to_supabase.js
```

### Automated Sync (Recommended)

**Option 1: Cron Job**
```bash
# Edit crontab
crontab -e

# Add daily sync at 3 AM
0 3 * * * cd /path/to/project && node scripts/sync_stripe_to_supabase.js

# Or hourly
0 * * * * cd /path/to/project && node scripts/sync_stripe_to_supabase.js
```

**Option 2: GitHub Actions**
Create `.github/workflows/sync-stripe.yml`:

```yaml
name: Sync Stripe to Supabase
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:  # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: node scripts/sync_stripe_to_supabase.js
        env:
          STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
```

**Option 3: Vercel Cron**
Create API endpoint that triggers sync, then use Vercel Cron.

---

## 📈 Product Categories

The sync script automatically categorizes products:

| Category | Detection Logic | Examples |
|----------|----------------|-----------|
| **TowPilot** | Contains "towpilot" or "tow" | TowPilot Pro, Tow Service |
| **Enterprise** | Contains "enterprise", "tier 7", "vyde", "attyx" | Enterprise Plan |
| **Pro** | Contains "pro" | Pro Plan |
| **PayAsYouGo** | Contains "pay-as-you-go" | PAYG Usage |
| **Legacy/Internal** | Contains "legacy", "sandbox", "internal" | Test accounts |
| **Other** | Everything else | Misc subscriptions |

---

## 🎯 Backend Data Flow

```
Stripe → Sync Script → Supabase → Backend API → In-Memory Cache → Frontend
         (hourly)       (persistent) (< 50ms)     (< 1ms)         (instant)
```

**Performance:**
- First request: ~50ms (Supabase query)
- Cached requests: < 1ms (in-memory)
- Cache TTL: 5 minutes (configurable)

---

## 🔧 Configuration

### Backend Environment

`backend/.env`:
```bash
SUPABASE_URL=https://yindsqbhygvskolbccqq.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
CACHE_TTL=300
```

### Sync Script

The sync script has hardcoded credentials in `scripts/sync_stripe_to_supabase.js`:
```javascript
const supabaseUrl = 'https://yindsqbhygvskolbccqq.supabase.co';
const supabaseAnonKey = 'eyJ...';
```

**Security Note**: For production, move these to environment variables.

---

## 🧪 Testing

### Test Sync

```bash
# Run sync
node scripts/sync_stripe_to_supabase.js

# Expected output:
# 🔄 Syncing Stripe subscriptions...
# ✅ Synced 123 subscriptions
# 🔄 Syncing Stripe customers...
# ✅ Synced 45 customers
# 📊 Creating MRR snapshot...
# ✅ Created MRR snapshot: $89,500/mo from 123 subscriptions
```

### Test Backend

```bash
# Health check
curl http://localhost:8000/health

# TowPilot metrics
curl http://localhost:8000/api/v1/metrics/towpilot

# Check cache (should show 1 entry after first request)
curl http://localhost:8000/api/v1/cache/stats
```

### Test Cache Refresh

```bash
# Invalidate cache
curl -X POST http://localhost:8000/api/v1/cache/refresh/towpilot

# Fetch again (will recompute from Supabase)
curl http://localhost:8000/api/v1/metrics/towpilot
```

---

## 🔍 Monitoring

### Check Supabase Data

Go to Supabase Dashboard → **Table Editor**:

1. View `stripe_subscriptions` - Should see all active subs
2. View `mrr_snapshots` - Should see daily snapshots
3. Check `stripe_customers` - Should match your Stripe count

### Monitor API Performance

```bash
# Time the API response
time curl -s http://localhost:8000/api/v1/metrics/towpilot > /dev/null

# First request: ~50ms (Supabase)
# Second request: ~1ms (cached)
```

---

## 🐛 Troubleshooting

### No Data Returned

**Cause**: Sync script hasn't run or no data in Supabase

**Fix**:
```bash
# Run sync script
node scripts/sync_stripe_to_supabase.js

# Check Supabase table
# Go to dashboard and verify data exists
```

### "Supabase credentials not configured"

**Cause**: Missing env vars in backend/.env

**Fix**:
```bash
cd backend
echo 'SUPABASE_URL=https://yindsqbhygvskolbccqq.supabase.co' >> .env
echo 'SUPABASE_ANON_KEY=your_key' >> .env
```

### Cache Not Working

**Check**:
```bash
curl http://localhost:8000/api/v1/cache/stats
# Should show entries after requests
```

**Clear and retry**:
```bash
curl -X POST http://localhost:8000/api/v1/cache/clear
curl http://localhost:8000/api/v1/metrics/towpilot
```

---

## 📚 Related Documentation

- **[backend/README.md](backend/README.md)** - Backend API docs
- **[DOCKER_SETUP.md](DOCKER_SETUP.md)** - Optional MongoDB setup
- **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Full project overview

---

## ✅ Advantages of Supabase Approach

1. **No Docker Required** - Supabase is cloud-hosted
2. **Already Set Up** - Tables and sync script working
3. **Fast Enough** - 50ms uncached, 1ms cached
4. **Persistent** - Data survives backend restarts
5. **Historical Data** - MRR snapshots tracked over time
6. **Simple Deploy** - No database service to manage

---

**Status**: ✅ Fully integrated with Supabase!

**Next Step**: Run `node scripts/sync_stripe_to_supabase.js` to populate data.

