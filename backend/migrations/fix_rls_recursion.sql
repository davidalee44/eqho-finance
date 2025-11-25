-- =====================================================
-- Fix RLS Infinite Recursion on user_profiles
-- =====================================================
-- The original policies reference user_profiles within
-- policies ON user_profiles, causing infinite recursion.
-- This fix uses auth.users.raw_user_meta_data instead.
-- =====================================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all logs" ON access_logs;

-- Recreate update policy without self-reference
-- Users can only update their own profile, role changes not allowed via direct update
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin check using auth.users metadata (no recursion)
CREATE POLICY "Admins can manage all profiles"
  ON user_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_admin')
    )
  );

-- Fix access_logs admin policy too
CREATE POLICY "Admins can view all logs"
  ON access_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- Also ensure dave@eqho.ai has super_admin in metadata
-- =====================================================
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "super_admin"}'::jsonb
WHERE email = 'dave@eqho.ai';

-- Insert/update user_profiles entry for dave@eqho.ai
INSERT INTO user_profiles (id, role, app_access, full_name)
SELECT 
  id,
  'super_admin',
  ARRAY['investor-deck', 'sales-dashboard'],
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
FROM auth.users
WHERE email = 'dave@eqho.ai'
ON CONFLICT (id) DO UPDATE SET
  role = 'super_admin',
  app_access = ARRAY['investor-deck', 'sales-dashboard'],
  updated_at = NOW();

