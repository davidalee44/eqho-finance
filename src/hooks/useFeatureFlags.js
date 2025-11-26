import { useAuth } from '@/contexts/AuthContext';
import {
    applyAdminOverrides,
    DEFAULT_FLAGS,
    FLAGS_CACHE_KEY,
    FLAGS_CACHE_TTL,
    mergeFlags,
} from '@/lib/featureFlags';
import { useCallback, useEffect, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * React hook for accessing feature flags
 * 
 * Features:
 * - Fetches flags from backend (which reads from Edge Config)
 * - Caches flags in localStorage with TTL
 * - Applies admin overrides for admin users
 * - Falls back to defaults when unavailable
 * 
 * Usage:
 *   const { flags, loading, error, refresh } = useFeatureFlags();
 *   if (flags.show_admin_controls) { ... }
 */
export function useFeatureFlags() {
  const { isAdmin } = useAuth();
  const [flags, setFlags] = useState(() => {
    // Initialize from cache or defaults
    const cached = getCachedFlags();
    return applyAdminOverrides(cached || DEFAULT_FLAGS, isAdmin);
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFlags = useCallback(async (useCache = true) => {
    // Check cache first
    if (useCache) {
      const cached = getCachedFlags();
      if (cached) {
        setFlags(applyAdminOverrides(cached, isAdmin));
        setLoading(false);
        // Still fetch fresh in background
        fetchFlags(false);
        return;
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/flags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch flags: ${response.status}`);
      }

      const data = await response.json();
      const mergedFlags = mergeFlags(data.flags);
      
      // Cache the flags
      cacheFlags(mergedFlags);
      
      // Apply admin overrides
      setFlags(applyAdminOverrides(mergedFlags, isAdmin));
      setError(null);
    } catch (err) {
      console.warn('[FeatureFlags] Failed to fetch flags, using defaults:', err.message);
      setError(err);
      // Use cached or defaults on error
      const cached = getCachedFlags();
      setFlags(applyAdminOverrides(cached || DEFAULT_FLAGS, isAdmin));
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Fetch flags on mount
  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  // Update flags when admin status changes
  useEffect(() => {
    setFlags(current => applyAdminOverrides(current, isAdmin));
  }, [isAdmin]);

  const refresh = useCallback(() => {
    setLoading(true);
    return fetchFlags(false);
  }, [fetchFlags]);

  return {
    flags,
    loading,
    error,
    refresh,
    isAdmin,
  };
}

/**
 * Get cached flags from localStorage
 * @returns {object|null} Cached flags or null if expired/missing
 */
function getCachedFlags() {
  try {
    const cached = localStorage.getItem(FLAGS_CACHE_KEY);
    if (!cached) return null;

    const { flags, timestamp } = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is expired
    if (now - timestamp > FLAGS_CACHE_TTL) {
      localStorage.removeItem(FLAGS_CACHE_KEY);
      return null;
    }

    return flags;
  } catch {
    return null;
  }
}

/**
 * Cache flags to localStorage
 * @param {object} flags - Flags to cache
 */
function cacheFlags(flags) {
  try {
    localStorage.setItem(
      FLAGS_CACHE_KEY,
      JSON.stringify({
        flags,
        timestamp: Date.now(),
      })
    );
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Simple provider component for feature flags context
 * Use this if you need to access flags in class components or deeply nested trees
 */
export { DEFAULT_FLAGS };

