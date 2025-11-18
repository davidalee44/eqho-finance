# CRITICAL: Shared Database Security Issue

**Issue**: The due diligence application is sharing the same Supabase database with your sales team application.

## Evidence

1. **Migration file explicitly states shared database**:
```sql
-- From add_user_roles.sql:
-- This migration adds role-based access control for
-- segregating investor deck and sales dashboard users
-- within a single Supabase project
```

2. **TODO comment in sync script**:
```javascript
// From sync_stripe_to_supabase.js:
const supabaseUrl = 'https://yindsqbhygvskolbccqq.supabase.co'; // TODO: are we on the right supabase?
```

3. **Same Supabase URL across all environments**: `yindsqbhygvskolbccqq.supabase.co`

## Why This Is a Serious Problem

### 1. Security & Data Isolation
- **Cross-contamination risk**: A bug in one app could expose data from the other
- **RLS complexity**: Row Level Security becomes exponentially harder with multiple apps
- **Attack surface**: Compromise of one app endangers the other
- **Compliance**: Many compliance frameworks (SOC 2, ISO 27001) require logical data separation

### 2. Performance & Scaling
- **Resource contention**: Both apps compete for same database connections
- **Query optimization**: Can't optimize for specific app patterns
- **Backup/restore**: Can't restore one app without affecting the other
- **Rate limiting**: Shared quotas between applications

### 3. Development & Maintenance
- **Migration conflicts**: Schema changes for one app may break the other
- **Testing isolation**: Can't safely test destructive operations
- **Debugging complexity**: Hard to trace issues when logs are mixed
- **Version mismatch**: Apps may need different Supabase features/versions

### 4. Business Risk
- **Sales data exposure**: Investor due diligence users could potentially access sales pipeline data
- **Financial data leakage**: Sales team could potentially see investor metrics
- **Audit trail confusion**: Mixed audit logs make compliance harder
- **Legal liability**: Data breach in one app affects both business functions

## Current Vulnerability Assessment

Your current setup relies on:
- `app_access` arrays to control which app users can access
- Role-based policies (`investor`, `sales`, `admin`)
- RLS policies checking user roles

**Problem**: This is security through complexity, not isolation. One misconfigured policy or bug could expose everything.

## Immediate Recommendations

### Option 1: Complete Database Separation (Recommended)
1. Create new Supabase project for due diligence app
2. Migrate all due diligence tables to new database
3. Update all connection strings
4. Test thoroughly before switching

**Pros**: 
- True isolation
- Independent scaling
- Clean security boundary
- Simplified RLS

**Cons**: 
- Migration effort (1-2 days)
- Potential downtime during cutover

### Option 2: Schema Separation (Temporary Mitigation)
1. Create separate schemas within same database
2. Move due diligence tables to `due_diligence` schema
3. Update all queries to use schema prefix
4. Restrict schema access via roles

**Pros**: 
- Faster to implement
- No new Supabase project needed

**Cons**: 
- Still sharing resources
- Not true isolation
- Temporary solution only

## Migration Plan (Option 1 - Recommended)

### Phase 1: Setup (Day 1)
```bash
# 1. Create new Supabase project
# 2. Get new credentials
NEW_SUPABASE_URL=https://[new-project].supabase.co
NEW_SUPABASE_ANON_KEY=eyJ...

# 3. Run migrations on new database
psql $NEW_DATABASE_URL -f backend/migrations/*.sql
```

### Phase 2: Data Migration (Day 1-2)
```sql
-- Export due diligence specific data
pg_dump --data-only \
  --table=report_snapshots \
  --table=card_layouts \
  --table=audit_logs \
  --table=pipedream_connections \
  old_db > dd_data.sql

-- Import to new database
psql new_db < dd_data.sql
```

### Phase 3: Code Updates (Day 2)
1. Update all environment variables
2. Update `supabaseClient.js`
3. Update backend config
4. Update sync scripts
5. Test all endpoints

### Phase 4: Cutover (Day 2)
1. Stop writes to old database
2. Final data sync
3. Update production configs
4. Monitor for issues

## Cost Implications

- New Supabase project: ~$25/month (Pro plan)
- One-time migration effort: 2-3 days
- Ongoing: Simplified maintenance

## Risk of Not Separating

1. **Immediate**: Accidental data exposure via misconfigured RLS
2. **Short-term**: Performance degradation as both apps grow
3. **Long-term**: Compliance violations, audit failures
4. **Catastrophic**: Data breach affecting both business functions

## Conclusion

The current shared database architecture poses significant security, compliance, and operational risks. While it may have started as a convenience, it's now a liability that should be addressed immediately.

**My recommendation**: Proceed with Option 1 (complete separation) as soon as possible. The 2-3 day investment now prevents potentially catastrophic issues later.

The fact that someone already added a TODO comment questioning "are we on the right supabase?" shows the team recognized this concern. It's time to act on it.
