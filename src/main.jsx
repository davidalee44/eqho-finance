import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from './lib/supabaseClient'
import App from './App.jsx'
import './index.css'

function AuthWrapper() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-full max-w-md">
          <div className="bg-gray-800 rounded-lg shadow-xl p-8">
            <h1 className="text-3xl font-bold text-white text-center mb-4">
              🔒 Eqho Investor Deck
            </h1>
            <p className="text-gray-400 text-center mb-8">
              Confidential - Sign in to access the investor presentation
            </p>
            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: '#3b82f6',
                      brandAccent: '#2563eb',
                    },
                  },
                },
              }}
              providers={['google']}
              onlyThirdPartyProviders={false}
            />
          </div>
        </div>
      </div>
    )
  }

  return <App />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthWrapper />
  </React.StrictMode>,
)

