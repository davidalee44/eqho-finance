import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppRouter } from './components/AppRouter'
import PixelRocketHero from './components/PixelRocketHero'
import { AuthProvider } from './contexts/AuthContext'
import './index.css'
import { supabase } from './lib/supabaseClient'
import { ACTION_TYPES, logAction } from './services/auditService'

function AuthWrapper() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authView, setAuthView] = useState('sign_in')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setLoading(false)
      
      // Log auth events for audit trail
      if (event === 'SIGNED_IN' && session) {
        try {
          await logAction(ACTION_TYPES.LOGIN, {
            method: 'supabase_auth',
            timestamp: new Date().toISOString(),
          })
        } catch (error) {
          console.error('Failed to log signin:', error)
        }
      } else if (event === 'SIGNED_OUT') {
        try {
          await logAction(ACTION_TYPES.LOGOUT, {
            timestamp: new Date().toISOString(),
          })
        } catch (error) {
          console.error('Failed to log signout:', error)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <PixelRocketHero>
        <div className="w-screen px-2 md:w-full md:max-w-md md:mx-auto md:px-0">
          <div className="bg-black/60 backdrop-blur-xl rounded-lg sm:rounded-xl md:rounded-2xl shadow-2xl p-6 sm:p-7 md:p-8 border-2 border-cyan-500/30">
            {/* Header */}
            <div className="text-center mb-4 sm:mb-6 md:mb-8">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2">
                Eqho Investor Portal
              </h2>
              <p className="text-cyan-300 text-xs sm:text-sm">
                Secure Access Required
              </p>
            </div>

            {/* Auth Component */}
            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                style: {
                  button: {
                    background: 'rgba(59, 130, 246, 0.2)',
                    backdropFilter: 'blur(10px)',
                    border: '2px solid rgba(59, 130, 246, 0.5)',
                    color: 'white',
                    borderRadius: '0.75rem',
                    fontWeight: '700',
                    padding: '12px 16px',
                    fontSize: '14px',
                    minHeight: '44px',
                    touchAction: 'manipulation',
                  },
                  anchor: {
                    color: '#60a5fa',
                    fontSize: '13px',
                    padding: '8px',
                    minHeight: '44px',
                    display: 'inline-flex',
                    alignItems: 'center',
                  },
                  input: {
                    background: 'rgba(17, 24, 39, 0.8)',
                    border: '2px solid #374151',
                    borderRadius: '0.75rem',
                    color: 'white',
                    padding: '12px 14px',
                    fontSize: '16px',
                    minHeight: '44px',
                    touchAction: 'manipulation',
                  },
                  label: {
                    // Visually hidden but accessible
                    position: 'absolute',
                    width: '1px',
                    height: '1px',
                    padding: '0',
                    margin: '-1px',
                    overflow: 'hidden',
                    clip: 'rect(0, 0, 0, 0)',
                    whiteSpace: 'nowrap',
                    border: '0',
                  },
                  message: {
                    color: '#ef4444',
                    background: 'rgba(239, 68, 68, 0.1)',
                    padding: '8px 12px',
                    borderRadius: '0.5rem',
                    marginBottom: '12px',
                    fontSize: '13px',
                  },
                  divider: {
                    background: 'rgba(156, 163, 175, 0.3)',
                    margin: '16px 0',
                  },
                  container: {
                    gap: '12px',
                  },
                },
                variables: {
                  default: {
                    colors: {
                      brand: '#667eea',
                      brandAccent: '#764ba2',
                      brandButtonText: 'white',
                      defaultButtonBackground: 'rgba(55, 65, 81, 0.8)',
                      defaultButtonBackgroundHover: 'rgba(75, 85, 99, 0.8)',
                    },
                    radii: {
                      borderRadiusButton: '0.75rem',
                      inputBorderRadius: '0.75rem',
                    },
                  },
                },
              }}
              providers={['google']}
              onlyThirdPartyProviders={false}
              socialLayout="vertical"
              view={authView}
              showLinks={false}
              magicLink={false}
              redirectTo={window.location.origin}
              localization={{
                variables: {
                  sign_in: {
                    email_label: 'Email Address',
                    password_label: 'Password',
                    button_label: 'Sign In',
                    social_provider_text: 'Continue with {{provider}}',
                    email_input_placeholder: 'Your email',
                    password_input_placeholder: 'Your password',
                  },
                  sign_up: {
                    email_label: 'Email Address',
                    password_label: 'Create Password',
                    button_label: 'Create Account',
                    social_provider_text: 'Sign up with {{provider}}',
                    email_input_placeholder: 'Your email',
                    password_input_placeholder: 'Create a strong password',
                    confirmation_text: 'Check your email for confirmation link',
                  },
                },
              }}
            />

            {/* Custom Auth Links - workaround for Supabase Auth UI bug */}
            <div className="mt-4 flex flex-col items-center gap-2">
              {authView === 'sign_in' ? (
                <>
                  <button
                    onClick={() => setAuthView('forgotten_password')}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    Forgot your password?
                  </button>
                  <button
                    onClick={() => setAuthView('sign_up')}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    Don't have an account? Sign up
                  </button>
                </>
              ) : authView === 'sign_up' ? (
                <button
                  onClick={() => setAuthView('sign_in')}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  Already have an account? Sign in
                </button>
              ) : authView === 'forgotten_password' ? (
                <button
                  onClick={() => setAuthView('sign_in')}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  Back to Sign In
                </button>
              ) : null}
            </div>

            {/* Footer */}
            <div className="mt-4 sm:mt-6 text-center">
              <p className="text-gray-400 text-xs">
                🛡️ Secure Access Only
              </p>
              <p className="text-gray-600 text-xs mt-1 sm:mt-2">
                Powered by Eqho, Inc
              </p>
            </div>
          </div>
        </div>
      </PixelRocketHero>
    )
  }

  return <AppRouter />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AuthWrapper />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

