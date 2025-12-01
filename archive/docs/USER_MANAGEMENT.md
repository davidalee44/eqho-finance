# 👥 User Management Guide - Role-Based Access

## Overview

Your Supabase project now supports **role-based access control** with complete segregation between:
- 📊 **Investor Deck** (investors only)
- 📈 **Sales Dashboard** (sales team only)  
- 🔑 **Admin** (access to both)

---

## 🚀 Quick Start: Adding Users

### Step 1: Run Database Migration

Apply the user roles migration:

```bash
cd backend

# Using psql
psql postgresql://postgres:[password]@db.yindsqbhygvskolbccqq.supabase.co:5432/postgres -f migrations/add_user_roles.sql

# OR using Supabase Dashboard SQL Editor
# Copy contents of migrations/add_user_roles.sql
# Paste into: https://supabase.com/dashboard/project/yindsqbhygvskolbccqq/sql
# Run query
```

### Step 2: Add Users with Roles

**Option A: Supabase Dashboard (GUI)**

1. Go to: https://supabase.com/dashboard/project/yindsqbhygvskolbccqq/auth/users
2. Click "Add user"
3. Enter email
4. In "User Metadata" field, add:

**For Investor:**
```json
{
  "role": "investor",
  "app_access": ["investor-deck"],
  "full_name": "John Smith",
  "company": "Accel Partners"
}
```

**For Sales User:**
```json
{
  "role": "sales",
  "app_access": ["sales-dashboard"],
  "full_name": "Jane Doe",
  "company": "Eqho"
}
```

**For Admin:**
```json
{
  "role": "admin",
  "app_access": ["investor-deck", "sales-dashboard"],
  "full_name": "David Lee",
  "company": "Eqho"
}
```

**Option B: SQL (Bulk Import)**

```sql
-- Add investor user
INSERT INTO auth.users (email, raw_user_meta_data)
VALUES (
  'investor@vc-firm.com',
  '{"role": "investor", "app_access": ["investor-deck"], "company": "VC Firm"}'::jsonb
);

-- Add sales user
INSERT INTO auth.users (email, raw_user_meta_data)
VALUES (
  'sales@eqho.ai',
  '{"role": "sales", "app_access": ["sales-dashboard"], "company": "Eqho"}'::jsonb
);

-- Add admin
INSERT INTO auth.users (email, raw_user_meta_data)
VALUES (
  'admin@eqho.ai',
  '{"role": "admin", "app_access": ["investor-deck", "sales-dashboard"]}'::jsonb
);
```

---

## 🔐 Access Control Flow

### What Happens When Users Sign In:

**Investor Signs In:**
1. Logs in with email/password or Google
2. Backend checks `user_profiles.role` = "investor"
3. Frontend verifies `app_access` includes "investor-deck"
4. User sees ✅ Investor Deck
5. User sees ❌ Sales Dashboard (blocked)

**Sales User Signs In:**
1. Logs in with email/password or Google
2. Backend checks `user_profiles.role` = "sales"
3. Frontend verifies `app_access` includes "sales-dashboard"
4. User sees ❌ Investor Deck (blocked)
5. User sees ✅ Sales Dashboard

**Admin Signs In:**
1. Logs in with email/password or Google
2. Backend checks `user_profiles.role` = "admin"
3. Frontend shows both apps available
4. User sees ✅ Investor Deck
5. User sees ✅ Sales Dashboard

---

## 📊 Database-Level Security

### RLS Policies Enforce Segregation:

**Investor Data:**
```sql
-- Only investors and admins can query investor_metrics
CREATE POLICY "Investors only" ON investor_metrics
FOR SELECT USING (
  (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('investor', 'admin')
);
```

**Sales Data:**
```sql
-- Only sales and admins can query sales_pipeline
CREATE POLICY "Sales only" ON sales_pipeline
FOR SELECT USING (
  (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('sales', 'admin')
);
```

**This ensures:**
- ✅ Even if investor tries to hack frontend
- ✅ Database rejects unauthorized queries
- ✅ Complete data segregation
- ✅ Secure at every level

---

## 🎯 User Management Commands

### View All Users:

```sql
SELECT 
  u.email,
  p.role,
  p.app_access,
  p.company,
  p.created_at
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id
ORDER BY p.created_at DESC;
```

### Count Users by Role:

```sql
SELECT 
  role,
  COUNT(*) as user_count
FROM user_profiles
GROUP BY role;
```

### View Access Logs:

```sql
SELECT 
  u.email,
  l.app_name,
  l.action,
  l.accessed_at
FROM access_logs l
JOIN auth.users u ON l.user_id = u.id
ORDER BY l.accessed_at DESC
LIMIT 50;
```

### Change User Role:

```sql
-- Promote user to admin
UPDATE user_profiles
SET 
  role = 'admin',
  app_access = ARRAY['investor-deck', 'sales-dashboard']
WHERE id = (SELECT id FROM auth.users WHERE email = 'user@example.com');

-- Convert investor to sales user
UPDATE user_profiles
SET 
  role = 'sales',
  app_access = ARRAY['sales-dashboard']
WHERE id = (SELECT id FROM auth.users WHERE email = 'investor@vc-firm.com');
```

### Delete User:

```sql
-- Delete user (cascades to user_profiles and access_logs)
DELETE FROM auth.users
WHERE email = 'user@example.com';
```

---

## 📧 Email Domain Restrictions (Optional)

### Restrict Investors to Specific Domains:

```sql
-- Only allow specific email domains for investor role
CREATE OR REPLACE FUNCTION check_investor_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'investor' THEN
    IF NOT (
      NEW.email LIKE '%@eqho.ai' OR
      NEW.email LIKE '%@gmail.com' OR
      NEW.email LIKE '%@vc-firm.com'
    ) THEN
      RAISE EXCEPTION 'Email domain not authorized for investor role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_investor_email_trigger
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION check_investor_email();
```

### Restrict Sales to Company Domain:

```sql
-- Only allow @eqho.ai for sales role
CREATE OR REPLACE FUNCTION check_sales_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'sales' THEN
    IF NEW.email NOT LIKE '%@eqho.ai' THEN
      RAISE EXCEPTION 'Sales users must have @eqho.ai email';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_sales_email_trigger
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION check_sales_email();
```

---

## 🎨 Frontend Routes

### Option 1: Subdomain-Based (Recommended)

**Deploy two separate Vercel projects:**

- **Investor Deck:**
  - URL: https://investors.eqho.ai
  - Checks: `role === 'investor' || role === 'admin'`
  - Shows: Current investor presentation

- **Sales Dashboard:**
  - URL: https://sales.eqho.ai
  - Checks: `role === 'sales' || role === 'admin'`
  - Shows: Sales dashboard

### Option 2: Path-Based (Same Domain)

**Single deployment with routing:**

```javascript
// Check URL path
if (window.location.pathname.startsWith('/sales')) {
  // Sales dashboard
  if (role !== 'sales' && role !== 'admin') {
    return <Unauthorized />
  }
  return <SalesDashboard />
}

// Default: Investor deck
if (role !== 'investor' && role !== 'admin') {
  return <Unauthorized />
}
return <InvestorDeck />
```

---

## 📱 User Experience

### Investor Login Flow:

```
1. Go to https://investors.eqho.ai (or main URL)
2. See: "Eqho Investor Deck - Confidential"
3. Options:
   - Create Eqho Account (email/password)
   - Sign in with Google
4. After login → See investor presentation
5. If try to access /sales → "Unauthorized"
```

### Sales Login Flow:

```
1. Go to https://sales.eqho.ai
2. See: "Eqho Sales Dashboard"
3. Options:
   - Sign in with @eqho.ai email
   - Sign in with Google (if @eqho.ai)
4. After login → See sales dashboard
5. If try to access investor deck → "Unauthorized"
```

### Admin Login Flow:

```
1. Sign in from either URL
2. See app switcher or menu
3. Can access both:
   - Investor Deck
   - Sales Dashboard
4. Full access to everything
```

---

## 🧪 Testing

### Test Each Role:

**1. Create Test Investor:**
```bash
# In Supabase Dashboard
Email: test-investor@gmail.com
Metadata: {"role": "investor", "app_access": ["investor-deck"]}
```

**2. Create Test Sales User:**
```bash
Email: test-sales@eqho.ai
Metadata: {"role": "sales", "app_access": ["sales-dashboard"]}
```

**3. Create Test Admin:**
```bash
Email: admin@eqho.ai
Metadata: {"role": "admin", "app_access": ["investor-deck", "sales-dashboard"]}
```

**4. Test Access:**
- Sign in as investor → Can ONLY see investor deck
- Sign in as sales → Can ONLY see sales dashboard
- Sign in as admin → Can see BOTH

---

## 🔧 Implementation Status:

✅ **Database Schema:** Migration file created
✅ **Frontend Router:** AppRouter.jsx created
✅ **Role Checking:** Implemented
✅ **Unauthorized Page:** Built-in
✅ **Auth Integration:** Complete

**Next Steps:**
1. Run database migration
2. Test user creation
3. Deploy and verify

---

## 📝 Quick Commands:

```bash
# Run database migration
cd backend
psql $SUPABASE_URL -f migrations/add_user_roles.sql

# Deploy with role-based auth
vercel --prod

# Test locally
npm run dev
```

---

## 💡 Best Practices:

1. **Always use metadata** when creating users
2. **Test role enforcement** before sharing URLs
3. **Monitor access logs** regularly
4. **Use subdomains** for clearest separation
5. **Admin accounts** for internal team only
6. **Email domain restrictions** for extra security

---

## ✅ You're All Set!

With this setup:
- ✅ One Supabase project
- ✅ Complete user segregation
- ✅ Investor deck protected
- ✅ Sales dashboard protected
- ✅ Database-level security
- ✅ Easy user management

**Both apps share auth, zero cross-contamination!**

