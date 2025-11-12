-- =====================================================
-- Multi-App Authentication: User Roles & Profiles
-- =====================================================
-- This migration adds role-based access control for
-- segregating investor deck and sales dashboard users
-- within a single Supabase project
-- =====================================================

-- Create user profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('investor', 'sales', 'admin')),
  app_access TEXT[] NOT NULL DEFAULT ARRAY['investor-deck'],
  company TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_app_access ON user_profiles USING GIN(app_access);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM user_profiles WHERE id = auth.uid())
  );

-- Policy: Only admins can insert/update/delete any profiles
CREATE POLICY "Admins can manage all profiles"
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
  INSERT INTO public.user_profiles (id, role, app_access, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'investor'),
    ARRAY[COALESCE(NEW.raw_user_meta_data->>'app_access', 'investor-deck')],
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on profile changes
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create access logs table for audit trail
CREATE TABLE IF NOT EXISTS access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  app_name TEXT NOT NULL,
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster log queries
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_app_name ON access_logs(app_name);
CREATE INDEX IF NOT EXISTS idx_access_logs_accessed_at ON access_logs(accessed_at DESC);

-- Enable RLS for access logs
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own access logs
CREATE POLICY "Users can view own logs"
  ON access_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Admins can view all logs
CREATE POLICY "Admins can view all logs"
  ON access_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to log app access
CREATE OR REPLACE FUNCTION public.log_app_access(
  app_name TEXT,
  action TEXT DEFAULT 'view',
  ip_address TEXT DEFAULT NULL,
  user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO access_logs (user_id, app_name, action, ip_address, user_agent)
  VALUES (auth.uid(), app_name, action, ip_address, user_agent);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Example RLS Policies for App-Specific Data
-- =====================================================

-- Example: Investor-only data access
-- CREATE POLICY "Investors access investor data"
--   ON investor_metrics FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM user_profiles
--       WHERE id = auth.uid() AND 
--       (role = 'investor' OR role = 'admin')
--     )
--   );

-- Example: Sales-only data access
-- CREATE POLICY "Sales access sales data"
--   ON sales_pipeline FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM user_profiles
--       WHERE id = auth.uid() AND 
--       (role = 'sales' OR role = 'admin')
--     )
--   );

-- =====================================================
-- Helpful Queries
-- =====================================================

-- View all users with their roles
-- SELECT 
--   u.email,
--   p.role,
--   p.app_access,
--   p.company,
--   p.created_at
-- FROM auth.users u
-- JOIN user_profiles p ON u.id = p.id
-- ORDER BY p.created_at DESC;

-- Count users by role
-- SELECT role, COUNT(*) as user_count
-- FROM user_profiles
-- GROUP BY role;

-- Recent access logs
-- SELECT 
--   u.email,
--   l.app_name,
--   l.action,
--   l.accessed_at
-- FROM access_logs l
-- JOIN auth.users u ON l.user_id = u.id
-- ORDER BY l.accessed_at DESC
-- LIMIT 100;

