import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yindsqbhygvskolbccqq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpbmRzcWJoeWd2c2tvbGJjY3FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NTM1NjksImV4cCI6MjA3ODMyOTU2OX0.y9uuFjCDVLWsSgZkt8YkccT4X66s9bmBaajGmdrJmP8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Fetch latest revenue analytics from Stripe data
 */
export async function getRevenueAnalytics() {
  const { data, error } = await supabase
    .from('stripe_revenue_analytics')
    .select('*')
    .order('analysis_date', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    console.error('Error fetching revenue analytics:', error)
    return null
  }

  return data
}

/**
 * Get current user's role from metadata
 * @returns {Promise<string|null>} User role or null
 */
export async function getUserRole() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return null
    }
    
    return user.user_metadata?.role || null
  } catch (error) {
    console.error('Error fetching user role:', error)
    return null
  }
}

/**
 * Check if current user is an admin
 * @returns {Promise<boolean>} True if user is admin or super_admin
 */
export async function isAdmin() {
  const role = await getUserRole()
  return role === 'admin' || role === 'super_admin'
}

/**
 * Get current user ID
 * @returns {Promise<string|null>} User ID or null
 */
export async function getCurrentUserId() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id || null
  } catch (error) {
    console.error('Error fetching user ID:', error)
    return null
  }
}

