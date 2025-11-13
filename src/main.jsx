import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { AppRouter } from './components/AppRouter'
import PixelRocketHero from './components/PixelRocketHero'
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
      <PixelRocketHero>
        <div className="w-full max-w-md mx-auto">
          <div className="bg-black/60 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border-2 border-cyan-500/30">
            {/* Confidential Badge */}
            <div className="text-center mb-6">
              <div className="inline-block px-4 py-2 bg-red-600/80 backdrop-blur-sm rounded-lg border border-red-400/50 mb-4">
                <p className="text-white text-xs font-bold tracking-wider">
                  🔒 CONFIDENTIAL
                </p>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Eqho Investor Portal
              </h2>
              <p className="text-cyan-300 text-sm">
                $500K Seed Round | TowPilot Product
              </p>
            </div>

            {/* Auth Component */}
            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                style: {
                  button: {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    borderRadius: '0.75rem',
                    fontWeight: '700',
                    padding: '12px',
                    border: 'none',
                  },
                  anchor: {
                    color: '#60a5fa',
                  },
                  input: {
                    background: 'rgba(17, 24, 39, 0.8)',
                    border: '2px solid #374151',
                    borderRadius: '0.75rem',
                    color: 'white',
                    padding: '12px',
                  },
                  label: {
                    color: '#9ca3af',
                    fontWeight: '600',
                  },
                  message: {
                    color: '#ef4444',
                    background: 'rgba(239, 68, 68, 0.1)',
                    padding: '8px',
                    borderRadius: '0.5rem',
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
                    button_label: '🚀 Launch Mission',
                    social_provider_text: '{{provider}} Mission Control',
                    link_text: "New to Eqho? Create Account",
                  },
                  sign_up: {
                    email_label: 'Email Address',
                    password_label: 'Create Password',
                    button_label: '🚀 Create Eqho Account',
                    social_provider_text: 'Continue with {{provider}}',
                    link_text: 'Already have clearance? Sign in',
                  },
                },
              }}
            />

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-gray-400 text-xs">
                🛡️ Secure Access Only
              </p>
              <p className="text-gray-600 text-xs mt-2">
                Powered by Supabase + Google OAuth
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
    <AuthWrapper />
  </React.StrictMode>,
)

