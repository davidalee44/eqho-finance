import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import App from '../App'

function UnauthorizedAccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-2xl p-8 text-center">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-3xl font-bold text-white mb-4">
          Unauthorized Access
        </h1>
        <p className="text-gray-400 mb-6">
          You don't have permission to access this application.
        </p>
        <p className="text-gray-500 text-sm mb-6">
          Please contact your administrator if you believe this is an error.
        </p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}

export function AppRouter() {
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function getUserProfile() {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) throw userError
        
        if (user) {
          // First check if user_profiles table exists by trying to query it
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('role, app_access, company, full_name')
            .eq('id', user.id)
            .single()
          
          if (profileError) {
            // Table doesn't exist yet or user doesn't have profile
            // Default to investor role for now
            console.warn('User profile not found, defaulting to investor role:', profileError)
            setUserProfile({
              email: user.email,
              name: user.user_metadata?.name || user.user_metadata?.full_name,
              role: user.user_metadata?.role || 'investor',
              app_access: user.user_metadata?.app_access || ['investor-deck'],
              company: user.user_metadata?.company,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0]
            })
          } else {
            setUserProfile({
              ...profile,
              email: user.email,
              name: user.user_metadata?.name || user.user_metadata?.full_name
            })
          }

          // Log access (optional - will fail if table doesn't exist yet)
          try {
            await supabase.rpc('log_app_access', {
              app_name: 'investor-deck',
              action: 'view',
              ip_address: null,
              user_agent: navigator.userAgent
            })
          } catch (e) {
            console.warn('Access logging not available yet:', e)
          }
        }
        
        setLoading(false)
      } catch (err) {
        console.error('Error loading user profile:', err)
        setError(err.message)
        setLoading(false)
      }
    }

    getUserProfile()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading user profile...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="max-w-md bg-gray-800 rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-4">Error Loading Profile</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!userProfile) {
    return <UnauthorizedAccess />
  }

  // Check if user has access to investor deck
  const hasInvestorAccess = 
    userProfile.role === 'investor' || 
    userProfile.role === 'admin' ||
    userProfile.app_access?.includes('investor-deck')

  if (!hasInvestorAccess) {
    return <UnauthorizedAccess />
  }

  // Show investor deck
  return <App userProfile={userProfile} />
}

