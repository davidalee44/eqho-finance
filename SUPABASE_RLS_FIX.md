# Supabase RLS (Row-Level Security) Fix

## Issue

The sync script is getting "new row violates row-level security policy" errors because it's using the anon key which has restricted permissions.

## Solution Options

### Option 1: Use Service Role Key (Recommended for Backend)

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/yindsqbhygvskolbccqq
2. Go to **Settings** → **API**
3. Copy the **service_role** key (starts with `eyJ...` and is much longer)
4. Update your sync script to use service_role key instead of anon key

**Update `scripts/sync_stripe_to_supabase.js`:**
```javascript
const supabaseServiceKey = 'YOUR_SERVICE_ROLE_KEY_HERE';  // From dashboard
const supabase = createClient(supabaseUrl, supabaseServiceKey);
```

**Or use environment variable:**
```javascript
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || supabaseAnonKey;
const supabase = createClient(supabaseUrl, supabaseKey);
```

### Option 2: Disable RLS (Not Recommended for Production)

Only for testing - disable RLS on tables:

```sql
-- In Supabase SQL Editor
ALTER TABLE stripe_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE mrr_snapshots DISABLE ROW LEVEL SECURITY;
```

### Option 3: Add RLS Policy for Anon Key

Create policies that allow inserts from service/backend:

```sql
-- Allow inserts for authenticated users or service role
CREATE POLICY "Allow service inserts" ON stripe_subscriptions
  FOR INSERT
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service updates" ON stripe_subscriptions
  FOR UPDATE
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);
```

## Recommended Approach

**Use service_role key for backend and sync scripts:**

1. Get service_role key from Supabase dashboard
2. Add to `backend/.env`:
   ```bash
   SUPABASE_SERVICE_KEY=eyJ...your_service_role_key
   ```
3. Update sync script to use it
4. Keep anon key for read-only frontend operations

## Security Note

- **service_role key**: Full database access, bypass all RLS
- **anon key**: Limited access, respects RLS policies
- **Never expose service_role key in frontend code**


