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

