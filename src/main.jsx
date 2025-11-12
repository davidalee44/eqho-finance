import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider, SignIn, SignedIn, SignedOut } from '@clerk/clerk-react'
import App from './App.jsx'
import './index.css'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key")
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <SignedOut>
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="w-full max-w-md">
            <h1 className="text-3xl font-bold text-white text-center mb-8">
              Eqho Investor Deck
            </h1>
            <p className="text-gray-400 text-center mb-6">
              Please sign in to access the confidential investor presentation
            </p>
            <SignIn routing="path" path="/sign-in" />
          </div>
        </div>
      </SignedOut>
      <SignedIn>
        <App />
      </SignedIn>
    </ClerkProvider>
  </React.StrictMode>,
)

