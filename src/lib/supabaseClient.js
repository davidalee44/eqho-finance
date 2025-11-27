import { createClient } from '@supabase/supabase-js'

// IMPORTANT: These must match your Supabase project
// Primary source: .env.local (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ikaepdczwgwesmndvcdd.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrYWVwZGN6d2d3ZXNtbmR2Y2RkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMzI1MzMsImV4cCI6MjA3OTYwODUzM30.fNZvk4P-DnGAN6lzn9pv-n3qfAPBb1bRZ5hVMQc9HaY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

