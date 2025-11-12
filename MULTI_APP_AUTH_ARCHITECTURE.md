# 🏗️ Multi-App Authentication Architecture

## Problem:
- Same Supabase project for **Investor Deck** AND **Sales Dashboard**
- Need complete user segregation
- Investors should NEVER see sales dashboard
- Sales users should NEVER see investor deck

## Solution: Role-Based Access Control

Use Supabase user metadata + Row Level Security (RLS) + frontend routing.

---

## 🎯 Architecture Overview

### User Types:

```typescript
type UserRole = 'investor' | 'sales' | 'admin'

interface UserMetadata {
  role: UserRole
  app_access: string[]  // ['investor-deck', 'sales-dashboard']
  company?: string      // Optional: for organization filtering
}
```

### Flow:

```
1. User signs in → Supabase Auth
2. Backend checks user metadata → role
3. Frontend routes to correct app based on role
4. RLS policies enforce data segregation at database level
```

---

## 📋 Implementation Steps

### Step 1: Update Database Schema

Add a `user_profiles` table to store extended user data:

```sql
-- Create user profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('investor', 'sales', 'admin')),
  app_access TEXT[] NOT NULL DEFAULT ARRAY['investor-deck'],
  company TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Policy: Only admins can insert/update profiles
CREATE POLICY "Admins can manage profiles"
  ON user_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role, app_access)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'investor'),
    ARRAY[COALESCE(NEW.raw_user_meta_data->>'app_access', 'investor-deck')]
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Step 2: Update Frontend Routing

Create `src/components/AppRouter.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import InvestorDeck from '../App'  // Your current investor deck
import SalesDashboard from './SalesDashboard'  // Your sales dashboard
import UnauthorizedAccess from './UnauthorizedAccess'

export function AppRouter() {
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function getUserProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role, app_access, company')
          .eq('id', user.id)
          .single()
        
        setUserProfile(profile)
      }
      
      setLoading(false)
    }

    getUserProfile()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  // Route based on role and app_access
  if (!userProfile) {
    return <UnauthorizedAccess />
  }

  // Check URL path to determine which app to show
  const path = window.location.pathname
  
  if (path.includes('/sales') || userProfile.role === 'sales') {
    if (!userProfile.app_access.includes('sales-dashboard')) {
      return <UnauthorizedAccess />
    }
    return <SalesDashboard />
  }
  
  // Default: Investor Deck
  if (!userProfile.app_access.includes('investor-deck')) {
    return <UnauthorizedAccess />
  }
  
  return <InvestorDeck />
}
```

### Step 3: Update Main Entry Point

```jsx
// src/main.jsx
import { AuthWrapper } from './components/AuthWrapper'
import { AppRouter } from './components/AppRouter'

function AuthenticatedApp() {
  return <AppRouter />
}

// In AuthWrapper, render AppRouter instead of App directly
```

---

## 👥 User Management

### Adding Investor Users:

**Supabase Dashboard → Auth → Users:**

```javascript
// Metadata when creating user:
{
  "role": "investor",
  "app_access": ["investor-deck"],
  "company": "VC Firm Name"
}
```

### Adding Sales Users:

```javascript
// Metadata when creating user:
{
  "role": "sales",
  "app_access": ["sales-dashboard"],
  "company": "Eqho"
}
```

### Admin Users (Both Apps):

```javascript
{
  "role": "admin",
  "app_access": ["investor-deck", "sales-dashboard"],
  "company": "Eqho"
}
```

---

## 🔒 Database-Level Security

### Example RLS Policies:

**Investor-Only Data:**
```sql
-- Investors can only see investor-related data
CREATE POLICY "Investors access investor data"
  ON investor_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'investor'
    )
  );
```

**Sales-Only Data:**
```sql
-- Sales users can only see sales data
CREATE POLICY "Sales access sales data"
  ON sales_pipeline FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'sales'
    )
  );
```

**Admin Access (Everything):**
```sql
-- Admins can see everything
CREATE POLICY "Admins see all"
  ON [table_name] FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

## 🎯 Implementation Options

### Option 1: Separate Subdomains (Recommended)

**Best for clear separation:**

- **Investor Deck:** https://investors.eqho.ai
- **Sales Dashboard:** https://sales.eqho.ai

**Pros:**
- ✅ Clear separation
- ✅ Easy to manage
- ✅ Different URLs for different audiences

**Implementation:**
```javascript
// Check subdomain on app load
const subdomain = window.location.hostname.split('.')[0]

if (subdomain === 'investors') {
  // Show investor deck
  if (userProfile.role !== 'investor' && userProfile.role !== 'admin') {
    return <UnauthorizedAccess />
  }
  return <InvestorDeck />
}

if (subdomain === 'sales') {
  // Show sales dashboard
  if (userProfile.role !== 'sales' && userProfile.role !== 'admin') {
    return <UnauthorizedAccess />
  }
  return <SalesDashboard />
}
```

### Option 2: URL Path Based

**Same domain, different paths:**

- **Investor Deck:** https://eqho-due-diligence.vercel.app/
- **Sales Dashboard:** https://eqho-due-diligence.vercel.app/sales

**Implementation:**
```javascript
// Use React Router
<Routes>
  <Route path="/" element={
    <ProtectedRoute allowedRoles={['investor', 'admin']}>
      <InvestorDeck />
    </ProtectedRoute>
  } />
  
  <Route path="/sales/*" element={
    <ProtectedRoute allowedRoles={['sales', 'admin']}>
      <SalesDashboard />
    </ProtectedRoute>
  } />
</Routes>
```

### Option 3: Auto-Redirect After Login

**Simplest approach:**

```javascript
// After successful login, redirect based on role
useEffect(() => {
  if (userProfile) {
    if (userProfile.role === 'investor') {
      // Stay on investor deck
    } else if (userProfile.role === 'sales') {
      // Redirect to sales dashboard
      window.location.href = 'https://your-sales-dashboard-url.vercel.app'
    }
  }
}, [userProfile])
```

---

## 🔐 Security Best Practices

### 1. Always Check Role on Frontend + Backend

**Frontend (UX):**
```javascript
if (userProfile.role !== 'investor') {
  return <UnauthorizedAccess />
}
```

**Backend (Security):**
```sql
-- RLS enforces at database level
WHERE auth.uid() IN (
  SELECT id FROM user_profiles WHERE role = 'investor'
)
```

### 2. Audit User Access

**Log when users access different apps:**

```sql
CREATE TABLE access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  app_name TEXT NOT NULL,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger to log access
CREATE OR REPLACE FUNCTION log_app_access()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO access_logs (user_id, app_name)
  VALUES (auth.uid(), TG_ARGV[0]);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 3. Email Domain Restrictions

**Restrict investors to specific domains:**

```sql
-- Only allow specific email domains for investors
CREATE POLICY "Investor email domain check"
  ON user_profiles FOR INSERT
  WITH CHECK (
    CASE
      WHEN role = 'investor' THEN
        email LIKE '%@vc-firm.com' OR
        email LIKE '%@investor.com'
      WHEN role = 'sales' THEN
        email LIKE '%@eqho.ai'
      ELSE TRUE
    END
  );
```

---

## 📝 Quick Setup Script

I'll create a migration to set this up:

```bash
# Run this in your backend folder
cd backend/migrations

# Create the migration
cat > add_user_roles.sql << 'EOF'
-- Add user roles and profiles
[SQL from Step 1 above]
EOF

# Apply migration
psql $DATABASE_URL < add_user_roles.sql
```

---

## 🎯 Recommended Approach:

For your use case, I recommend **Option 1: Separate Subdomains**

**Why:**
- ✅ Clear separation (investors.eqho.ai vs sales.eqho.ai)
- ✅ Can't accidentally access wrong app
- ✅ Easy to explain to users
- ✅ Professional presentation
- ✅ Same Supabase project (shared auth)
- ✅ Different frontends/deployments

**How it works:**
1. **Single Supabase Project** - One auth system
2. **Two Vercel Projects:**
   - `eqho-investor-deck` → investors.eqho.ai
   - `eqho-sales-dashboard` → sales.eqho.ai
3. **Shared User Pool** - Same login, different access
4. **Role Metadata** - User has "investor" or "sales" role
5. **Frontend Check** - Each app checks role on mount

---

## 💡 Implementation Plan:

Want me to:
1. Create the user_profiles table migration?
2. Set up role-based routing in the frontend?
3. Add middleware to check user roles?
4. Create documentation for managing users with different roles?

Let me know which option you prefer (subdomains, paths, or auto-redirect) and I'll implement it!
