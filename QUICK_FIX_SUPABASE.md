# Quick Fix - Get Supabase Service Role Key

## Steps (2 minutes)

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard/project/yindsqbhygvskolbccqq

2. **Get Service Role Key**
   - Click **Settings** (bottom left)
   - Click **API**
   - Scroll to **Project API keys**
   - Copy the **service_role** key (Secret, not Public)

3. **Update Sync Script**

Edit `scripts/sync_stripe_to_supabase.js` line 11:

```javascript
// Replace this line:
const supabaseAnonKey = 'eyJ...';

// With:
const supabaseServiceKey = 'YOUR_SERVICE_ROLE_KEY';  // Paste from dashboard
const supabase = createClient(supabaseUrl, supabaseServiceKey);
```

4. **Run Sync Again**

```bash
STRIPE_SECRET_KEY=sk_live_... node scripts/sync_stripe_to_supabase.js
```

## Expected Output

```
🚀 Starting Stripe to Supabase sync...
🔄 Syncing Stripe subscriptions...
✅ Synced 123 subscriptions
🔄 Syncing Stripe customers...
✅ Synced 45 customers
📊 Creating MRR snapshot...
✅ Created MRR snapshot: $89,500/mo from 123 subscriptions
```

That's it!

