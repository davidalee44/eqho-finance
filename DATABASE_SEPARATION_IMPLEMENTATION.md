# Database Separation Implementation Guide

## Step-by-Step Implementation

### 1. Create New Supabase Project

1. Go to https://app.supabase.com
2. Create new project: "eqho-due-diligence-prod"
3. Save credentials:
   - Project URL: `https://[new-id].supabase.co`
   - Anon Key: `eyJ...`
   - Service Role Key: `eyJ...` (for migrations)

### 2. Identify Tables to Migrate

**Due Diligence Specific Tables**:
- `report_snapshots` - Financial report snapshots
- `card_layouts` - Dashboard layouts
- `pipedream_connections` - Integration connections
- `audit_logs` - User activity (filter by app)

**Shared Tables (need filtering)**:
- `auth.users` - Only due diligence users
- `user_profiles` - Only users with `app_access` containing 'investor-deck'
- `user_roles` - Related to above users

**Sales-Only Tables (DO NOT MIGRATE)**:
- `sales_pipeline`
- `sales_metrics`
- Any tables with "sales_" prefix

### 3. Migration Scripts

Create `backend/migrations/separate_database.sql`:

```sql
-- Export due diligence users
CREATE TEMP TABLE dd_users AS
SELECT DISTINCT u.*
FROM auth.users u
JOIN user_profiles p ON u.id = p.id
WHERE 'investor-deck' = ANY(p.app_access);

-- Export user profiles
CREATE TEMP TABLE dd_profiles AS
SELECT p.*
FROM user_profiles p
WHERE 'investor-deck' = ANY(p.app_access);

-- Export related data
CREATE TEMP TABLE dd_snapshots AS
SELECT s.*
FROM report_snapshots s
WHERE s.user_id IN (SELECT id::text FROM dd_users);

CREATE TEMP TABLE dd_audit_logs AS
SELECT a.*
FROM audit_logs a
WHERE a.user_id IN (SELECT id FROM dd_users);

CREATE TEMP TABLE dd_pipedream AS
SELECT p.*
FROM pipedream_connections p
WHERE p.user_id IN (SELECT id FROM dd_users);

-- Generate export commands
\copy dd_users TO 'dd_users.csv' CSV HEADER;
\copy dd_profiles TO 'dd_profiles.csv' CSV HEADER;
\copy dd_snapshots TO 'dd_snapshots.csv' CSV HEADER;
\copy dd_audit_logs TO 'dd_audit_logs.csv' CSV HEADER;
\copy dd_pipedream TO 'dd_pipedream.csv' CSV HEADER;
```

### 4. Environment File Updates

Create new `.env.migration`:

```bash
# OLD DATABASE (for export)
OLD_SUPABASE_URL=https://yindsqbhygvskolbccqq.supabase.co
OLD_SUPABASE_SERVICE_KEY=eyJ...  # Need service key for auth.users access

# NEW DATABASE (for import)
NEW_SUPABASE_URL=https://[new-id].supabase.co
NEW_SUPABASE_ANON_KEY=eyJ...
NEW_SUPABASE_SERVICE_KEY=eyJ...
```

### 5. Update Application Code

**Frontend - src/lib/supabaseClient.js**:
```javascript
// OLD (remove)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yindsqbhygvskolbccqq.supabase.co'

// NEW
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL is required')
}
```

**Backend - all .env files**:
```bash
# Update in:
# - backend/.env
# - .env.production
# - .env.local

SUPABASE_URL=https://[new-id].supabase.co
SUPABASE_ANON_KEY=eyJ[new-key]...
```

**Sync Script - scripts/sync_stripe_to_supabase.js**:
```javascript
// REMOVE hardcoded URL
// const supabaseUrl = 'https://yindsqbhygvskolbccqq.supabase.co';

// ADD environment variable
const supabaseUrl = process.env.SUPABASE_URL;
if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL environment variable is required');
  process.exit(1);
}
```

### 6. Update RLS Policies

Since we'll have a dedicated database, we can simplify RLS:

```sql
-- Simplified RLS for dedicated due diligence database
ALTER TABLE report_snapshots ENABLE ROW LEVEL SECURITY;

-- No need to check app_access anymore
CREATE POLICY "Users can view own snapshots"
    ON report_snapshots FOR SELECT
    USING (auth.uid()::text = user_id);

-- Remove complex role checking
DROP POLICY IF EXISTS "Complex multi-app policy";
```

### 7. Testing Checklist

```bash
# 1. Test authentication
curl -X POST https://[new-id].supabase.co/auth/v1/token/...

# 2. Test API endpoints
curl http://localhost:8000/api/v1/metrics/summary

# 3. Test data access
# - Login as investor user
# - Verify can see snapshots
# - Verify CANNOT see sales data

# 4. Test sync script
SUPABASE_URL=https://[new-id].supabase.co npm run sync

# 5. Test frontend
# - All dashboard features
# - Snapshot save/load
# - User profile access
```

### 8. Rollback Plan

If issues arise:

1. **Keep old database running** - Don't delete immediately
2. **Environment switch** - Can revert by changing env vars
3. **Data backup** - Keep CSV exports for 30 days
4. **Dual running** - Can run both databases temporarily

### 9. Cleanup After Migration

Once confirmed working:

1. Remove due diligence users from old database
2. Remove due diligence tables from old database
3. Update all documentation
4. Remove hardcoded URLs
5. Archive migration scripts

## Timeline

- **Day 1**: Create new Supabase project, run migrations
- **Day 2**: Migrate data, update code
- **Day 3**: Testing and cutover
- **Week 2**: Monitor and cleanup

## Commands Summary

```bash
# Export from old database
psql $OLD_DATABASE_URL < export_dd_data.sql

# Create structure in new database  
psql $NEW_DATABASE_URL < backend/migrations/*.sql

# Import data
psql $NEW_DATABASE_URL < import_dd_data.sql

# Update environment
cp .env.new .env

# Test
npm run dev
cd backend && uvicorn app.main:app --reload

# Deploy
git add .
git commit -m "feat: migrate to dedicated Supabase instance"
git push
```

This migration will give you true data isolation and eliminate the security risks of a shared database.
