import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yindsqbhygvskolbccqq.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpbmRzcWJoeWd2c2tvbGJjY3FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NTM1NjksImV4cCI6MjA3ODMyOTU2OX0.y9uuFjCDVLWsSgZkt8YkccT4X66s9bmBaajGmdrJmP8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

