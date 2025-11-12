import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { AppRouter } from './components/AppRouter'
import './index.css'
import { supabase } from './lib/supabaseClient'

function AuthWrapper() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
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
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="w-full max-w-md">
          <div className="bg-gray-800 rounded-lg shadow-2xl p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">🔒</div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Eqho Investor Deck
              </h1>
              <p className="text-gray-400">
                Confidential Investment Opportunity
              </p>
              <div className="mt-4 px-4 py-2 bg-blue-900/30 border border-blue-500/50 rounded-lg">
                <p className="text-blue-300 text-sm">
                  $500K Seed Round | TowPilot Product
                </p>
              </div>
            </div>

            {/* Auth Component */}
            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                style: {
                  button: {
                    background: '#3b82f6',
                    color: 'white',
                    borderRadius: '0.5rem',
                    fontWeight: '600',
                  },
                  anchor: {
                    color: '#60a5fa',
                  },
                  input: {
                    background: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '0.5rem',
                    color: 'white',
                  },
                  label: {
                    color: '#9ca3af',
                  },
                  message: {
                    color: '#ef4444',
                  },
                },
                variables: {
                  default: {
                    colors: {
                      brand: '#3b82f6',
                      brandAccent: '#2563eb',
                      brandButtonText: 'white',
                      defaultButtonBackground: '#374151',
                      defaultButtonBackgroundHover: '#4b5563',
                    },
                  },
                },
              }}
              providers={['google']}
              onlyThirdPartyProviders={false}
              socialLayout="vertical"
              view="sign_in"
              showLinks={true}
              localization={{
                variables: {
                  sign_in: {
                    email_label: 'Email Address',
                    password_label: 'Password',
                    button_label: 'Sign In',
                    social_provider_text: 'Sign in with {{provider}}',
                    link_text: "Don't have an account? Sign up",
                  },
                  sign_up: {
                    email_label: 'Email Address',
                    password_label: 'Create Password',
                    button_label: 'Create Eqho Account',
                    social_provider_text: 'Continue with {{provider}}',
                    link_text: 'Already have an account? Sign in',
                  },
                },
              }}
            />

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-gray-500 text-xs">
                By signing in, you agree to access confidential information
              </p>
              <p className="text-gray-600 text-xs mt-2">
                Powered by Supabase
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <AppRouter />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthWrapper />
  </React.StrictMode>,
)

