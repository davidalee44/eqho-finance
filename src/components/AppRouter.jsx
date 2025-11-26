import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import App from '../App'
import { AuditLogViewer } from './AuditLogViewer'
import { CashFlowDashboard } from './CashFlowDashboard'
import IntegrationsPage from './IntegrationsPage'
import { useAuth } from '../contexts/AuthContext'

// SECURITY: DEV_BYPASS removed - was a security risk if DEV flag incorrectly set in production

/**
 * Protected route component for admin-only routes.
 * Must be defined OUTSIDE AppRouter to prevent remounting on re-renders.
 */
function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth()
  
  // Wait for auth to complete before making decisions
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Checking permissions...</div>
      </div>
    )
  }
  
  if (!isAdmin) {
    return <Navigate to="/" replace />
  }
  
  return children
}

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
    let isMounted = true
    
    // Timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('[AppRouter] Auth timeout - forcing load complete')
        setLoading(false)
      }
    }, 10000) // 10 second timeout

    async function getUserProfile() {
      try {
        console.log('[AppRouter] Fetching user...')
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (!isMounted) return
        
        if (userError) throw userError
        
        console.log('[AppRouter] User:', user?.email || 'not logged in')
        
        if (user) {
          // Try to fetch user profile from database (graceful fallback if table doesn't exist)
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('role, app_access, company, full_name')
            .eq('id', user.id)
            .single()
          
          if (!isMounted) return
          
          if (profileError) {
            // Profile table doesn't exist or user not found - use metadata from auth
            if (profileError.code !== 'PGRST116' && profileError.message && !profileError.message.includes('404')) {
              console.info('[Auth] Using user metadata (profile table not configured):', user.user_metadata?.role || 'investor')
            }
            setUserProfile({
              email: user.email,
              name: user.user_metadata?.name || user.user_metadata?.full_name,
              role: user.user_metadata?.role || 'investor',
              app_access: user.user_metadata?.app_access || ['investor-deck'],
              company: user.user_metadata?.company,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0]
            })
          } else {
            console.log('[AppRouter] Profile loaded:', profile?.role)
            setUserProfile({
              ...profile,
              email: user.email,
              name: user.user_metadata?.name || user.user_metadata?.full_name
            })
          }

          // Optional: Log access if RPC function exists (silent fail if not configured)
          try {
            await supabase.rpc('log_app_access', {
              app_name: 'investor-deck',
              action: 'view',
              ip_address: null,
              user_agent: navigator.userAgent
            })
          } catch (e) {
            // Silently fail - this is optional logging
            if (e.message && !e.message.includes('404') && !e.message.includes('not found')) {
              console.debug('[Access Log] Optional logging not configured')
            }
          }
        }
        
        if (isMounted) {
          console.log('[AppRouter] Setting loading to false')
          setLoading(false)
        }
      } catch (err) {
        console.error('Error loading user profile:', err)
        if (isMounted) {
          setError(err.message)
          setLoading(false)
        }
      }
    }

    getUserProfile()
    
    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
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
    userProfile.role === 'super_admin' ||
    userProfile.app_access?.includes('investor-deck')

  if (!hasInvestorAccess) {
    return <UnauthorizedAccess />
  }

  // Show routes
  return (
    <Routes>
      <Route path="/" element={<App userProfile={userProfile} />} />
      <Route 
        path="/audit-logs" 
        element={
          <AdminRoute>
            <AuditLogViewer />
          </AdminRoute>
        } 
      />
      <Route 
        path="/admin/cashflow" 
        element={
          <AdminRoute>
            <CashFlowDashboard />
          </AdminRoute>
        } 
      />
      <Route 
        path="/admin/integrations" 
        element={
          <AdminRoute>
            <IntegrationsPage />
          </AdminRoute>
        } 
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

