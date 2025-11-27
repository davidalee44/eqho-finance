import { supabase } from '@/lib/supabaseClient';
import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext({
  user: null,
  role: null,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
});

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    // Synchronous localStorage fallback for when Supabase API hangs
    const getSessionFromStorage = () => {
      try {
        const keys = Object.keys(localStorage);
        const sessionKey = keys.find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
        if (sessionKey) {
          const stored = localStorage.getItem(sessionKey);
          if (stored) {
            return JSON.parse(stored);
          }
        }
      } catch (e) {
        console.error('[AuthContext] Failed to read session from storage:', e);
      }
      return null;
    };
    
    // Timeout to use localStorage fallback
    const timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('[AuthContext] Auth timeout - using localStorage fallback');
        const stored = getSessionFromStorage();
        if (stored?.user) {
          const u = stored.user;
          setUser(u);
          const userRole = u.user_metadata?.role || null;
          setRole(userRole);
          setIsAdmin(userRole === 'admin' || userRole === 'super_admin');
          console.log('[AuthContext] Recovered from localStorage:', u.email, 'role:', userRole);
        }
        setLoading(false);
      }
    }, 3000); // 3 second timeout
    
    // Check active session on mount
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (session?.user) {
          setUser(session.user);
          // Use user_metadata directly instead of making another network call
          const userRole = session.user.user_metadata?.role || null;
          setRole(userRole);
          setIsAdmin(userRole === 'admin' || userRole === 'super_admin');
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (isMounted) {
          clearTimeout(timeoutId);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        if (session?.user) {
          setUser(session.user);
          // Use user_metadata directly instead of network calls
          const userRole = session.user.user_metadata?.role || null;
          setRole(userRole);
          setIsAdmin(userRole === 'admin' || userRole === 'super_admin');
        } else {
          setUser(null);
          setRole(null);
          setIsAdmin(false);
        }
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription?.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setRole(null);
      setIsAdmin(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    role,
    isAdmin,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

