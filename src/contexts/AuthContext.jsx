import { supabase } from '@/lib/supabaseClient';
import { logAction, ACTION_TYPES } from '@/services/auditService';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

// Storage key for persisting impersonation across page refreshes
const IMPERSONATION_STORAGE_KEY = 'eqho_impersonation';

const AuthContext = createContext({
  // Real authenticated user
  user: null,
  role: null,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
  // Impersonation state
  impersonatedUser: null,
  isImpersonating: false,
  startImpersonation: async () => {},
  stopImpersonation: () => {},
  // Effective values (impersonated if active, otherwise real)
  effectiveUser: null,
  effectiveRole: null,
  effectiveIsAdmin: false,
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
  
  // Impersonation state
  const [impersonatedUser, setImpersonatedUser] = useState(null);

  // Load saved impersonation on mount (if admin session is still valid)
  useEffect(() => {
    if (isAdmin && !loading) {
      try {
        const saved = localStorage.getItem(IMPERSONATION_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Only restore if it was saved within the last hour
          const savedTime = parsed._savedAt || 0;
          const oneHour = 60 * 60 * 1000;
          if (Date.now() - savedTime < oneHour) {
            console.log('[AuthContext] Restoring impersonation:', parsed.email);
            setImpersonatedUser(parsed);
          } else {
            // Clear stale impersonation
            localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
          }
        }
      } catch (e) {
        console.error('[AuthContext] Failed to restore impersonation:', e);
        localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
      }
    }
  }, [isAdmin, loading]);

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
          // Clear impersonation on sign out
          setImpersonatedUser(null);
          localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
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
      // Clear impersonation first
      setImpersonatedUser(null);
      localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
      
      await supabase.auth.signOut();
      setUser(null);
      setRole(null);
      setIsAdmin(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  /**
   * Start impersonating a user
   * Only available to admins
   * @param {Object} targetUser - User profile object with id, email, role, etc.
   */
  const startImpersonation = useCallback(async (targetUser) => {
    if (!isAdmin) {
      console.error('[AuthContext] Cannot impersonate - not an admin');
      return;
    }
    
    if (!targetUser || !targetUser.id) {
      console.error('[AuthContext] Invalid target user for impersonation');
      return;
    }
    
    // Don't allow impersonating admins
    if (targetUser.role === 'admin' || targetUser.role === 'super_admin') {
      console.error('[AuthContext] Cannot impersonate admin users');
      return;
    }
    
    console.log('[AuthContext] Starting impersonation:', targetUser.email);
    
    // Log to audit trail
    try {
      await logAction(ACTION_TYPES.IMPERSONATION_START, {
        target_user_id: targetUser.id,
        target_user_email: targetUser.email,
        target_user_role: targetUser.role,
        target_user_company: targetUser.company,
      });
    } catch (err) {
      console.warn('[AuthContext] Failed to log impersonation start:', err);
    }
    
    // Store with timestamp for expiry
    const toStore = { ...targetUser, _savedAt: Date.now() };
    localStorage.setItem(IMPERSONATION_STORAGE_KEY, JSON.stringify(toStore));
    setImpersonatedUser(targetUser);
  }, [isAdmin]);

  /**
   * Stop impersonating and return to admin view
   */
  const stopImpersonation = useCallback(async () => {
    const wasImpersonating = impersonatedUser;
    
    console.log('[AuthContext] Stopping impersonation');
    setImpersonatedUser(null);
    localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
    
    // Log to audit trail
    if (wasImpersonating) {
      try {
        await logAction(ACTION_TYPES.IMPERSONATION_END, {
          target_user_id: wasImpersonating.id,
          target_user_email: wasImpersonating.email,
        });
      } catch (err) {
        console.warn('[AuthContext] Failed to log impersonation end:', err);
      }
    }
  }, [impersonatedUser]);

  // Computed values - use impersonated user if active
  const isImpersonating = Boolean(impersonatedUser);
  
  // Effective user/role for rendering the UI
  const effectiveUser = isImpersonating ? {
    id: impersonatedUser.id,
    email: impersonatedUser.email,
    user_metadata: {
      role: impersonatedUser.role,
      full_name: impersonatedUser.full_name,
      company: impersonatedUser.company,
      app_access: impersonatedUser.app_access,
    }
  } : user;
  
  const effectiveRole = isImpersonating ? impersonatedUser.role : role;
  
  // When impersonating, never show admin features
  const effectiveIsAdmin = isImpersonating ? false : isAdmin;

  const value = {
    // Real user (always the authenticated admin)
    user,
    role,
    isAdmin,
    loading,
    signOut,
    // Impersonation state
    impersonatedUser,
    isImpersonating,
    startImpersonation,
    stopImpersonation,
    // Effective values for UI rendering
    effectiveUser,
    effectiveRole,
    effectiveIsAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
