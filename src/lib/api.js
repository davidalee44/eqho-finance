/**
 * API utility functions for consistent error handling and health checks
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Fallback values when API is unavailable and no cached data exists.
 * All values are null to indicate no data available - components should
 * show "Data unavailable" state rather than fake numbers.
 */
export const FALLBACK_METRICS = {
  total: {
    mrr: null,
    arr: null,
    customers: null,
    subscriptions: null,
  },
  towpilot: {
    mrr: null,
    arr: null,
    customers: null,
    acv: null,
  },
  other: {
    mrr: null,
    arr: null,
    customers: null,
  },
  timestamp: null,
  is_fallback: true,
};

/**
 * Check if backend API is available
 */
export async function checkApiHealth() {
  try {
    console.log('[Health Check] Checking backend API health...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const isHealthy = response.ok;
    console.log(`[Health Check] Backend API is ${isHealthy ? '✓ healthy' : '✗ unhealthy'}`);
    return isHealthy;
  } catch (error) {
    console.error('[Health Check] ✗ Failed to reach backend API:', error.message);
    return false;
  }
}

/**
 * Enhanced fetch with better error handling and logging
 */
export async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const requestId = Math.random().toString(36).substring(7);
  
  console.log(`[API ${requestId}] → ${options.method || 'GET'} ${endpoint}`);
  
  try {
    // Create timeout controller (only if no signal provided)
    const controller = options.signal ? null : new AbortController();
    const timeoutId = controller ? setTimeout(() => controller.abort(), 10000) : null; // 10 second timeout
    
    const startTime = performance.now();
    const response = await fetch(url, {
      ...options,
      signal: controller?.signal || options.signal,
    });
    const duration = (performance.now() - startTime).toFixed(2);
    
    if (timeoutId) clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`[API ${requestId}] ✗ ${response.status} ${endpoint} (${duration}ms)`, errorText);
      throw new ApiError(
        `API returned ${response.status}: ${errorText}`,
        'http',
        response.status,
        url
      );
    }

    const data = await response.json();
    console.log(`[API ${requestId}] ✓ ${response.status} ${endpoint} (${duration}ms)`);
    return data;
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }

    // Detect network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error(`[API ${requestId}] ✗ Network error: ${endpoint}`, error);
      throw new ApiError(
        'Cannot connect to backend API. Make sure the backend is running.',
        'network',
        null,
        url
      );
    }

    // Detect timeout errors
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      console.error(`[API ${requestId}] ✗ Timeout: ${endpoint}`);
      throw new ApiError(
        'Request timed out. The backend may be slow or unavailable.',
        'timeout',
        null,
        url
      );
    }

    // Generic error
    console.error(`[API ${requestId}] ✗ Error: ${endpoint}`, error);
    throw new ApiError(
      error.message || 'Unknown error occurred',
      'unknown',
      null,
      url
    );
  }
}

/**
 * Custom API Error class with additional context
 */
export class ApiError extends Error {
  constructor(message, type, status, url) {
    super(message);
    this.name = 'ApiError';
    this.type = type; // 'network', 'http', 'timeout', 'unknown'
    this.status = status;
    this.url = url;
  }

  get isNetworkError() {
    return this.type === 'network';
  }

  get isHttpError() {
    return this.type === 'http';
  }

  get isTimeoutError() {
    return this.type === 'timeout';
  }

  get troubleshootingSteps() {
    if (this.isNetworkError) {
      return [
        'Check if the backend API is running',
        `Verify the API URL: ${this.url}`,
        'Check your network connection',
        'Ensure CORS is configured correctly',
      ];
    }
    if (this.isTimeoutError) {
      return [
        'The backend may be slow or overloaded',
        'Try refreshing the page',
        'Check backend server logs',
      ];
    }
    if (this.isHttpError) {
      return [
        `API returned status ${this.status}`,
        'Check backend server logs',
        'Verify the endpoint exists',
      ];
    }
    return ['Try refreshing the page', 'Check browser console for details'];
  }
}

/**
 * Get cached metrics from localStorage
 */
export function getCachedMetrics(key) {
  try {
    const cached = localStorage.getItem(`metrics_cache_${key}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Check if cache is less than 5 minutes old
      const cacheAge = Date.now() - parsed.timestamp;
      if (cacheAge < 5 * 60 * 1000) {
        return parsed.data;
      }
    }
  } catch (error) {
    console.warn('Failed to read cache:', error);
  }
  return null;
}

/**
 * Cache metrics to localStorage
 */
export function cacheMetrics(key, data) {
  try {
    localStorage.setItem(
      `metrics_cache_${key}`,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    );
  } catch (error) {
    console.warn('Failed to cache metrics:', error);
  }
}

/**
 * Fetch cached metrics from backend database when live API is unavailable.
 * Returns cached data with timestamp showing when it was last fetched.
 * 
 * @param {string} metricType - Type of metric to fetch (e.g., 'comprehensive_metrics', 'churn_arpu')
 * @returns {Promise<{data: object, fetched_at: string, source: string, is_cached: boolean} | null>}
 */
export async function fetchCachedMetrics(metricType) {
  try {
    console.log(`[Cache] Fetching cached ${metricType} from database...`);
    const response = await apiFetch(`/api/v1/stripe/cached/${metricType}`);
    console.log(`[Cache] ✓ Retrieved cached ${metricType} from ${response.fetched_at}`);
    return response;
  } catch (error) {
    console.warn(`[Cache] ✗ No cached data available for ${metricType}:`, error.message);
    return null;
  }
}

/**
 * Fetch all cached metrics from backend database.
 * Useful for initial load when backend API might be slow.
 * 
 * @returns {Promise<{metrics: object, count: number} | null>}
 */
export async function fetchAllCachedMetrics() {
  try {
    console.log('[Cache] Fetching all cached metrics from database...');
    const response = await apiFetch('/api/v1/stripe/cached');
    console.log(`[Cache] ✓ Retrieved ${response.count} cached metric types`);
    return response;
  } catch (error) {
    console.warn('[Cache] ✗ Failed to fetch cached metrics:', error.message);
    return null;
  }
}

/**
 * Format a timestamp for display
 * @param {string | null} timestamp - ISO timestamp string
 * @returns {string} Formatted date/time string
 */
export function formatDataTimestamp(timestamp) {
  if (!timestamp) return 'Unknown';
  
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // If less than 1 minute ago
    if (diffMins < 1) return 'Just now';
    
    // If less than 1 hour ago
    if (diffHours < 1) return `${diffMins} min ago`;
    
    // If less than 24 hours ago
    if (diffDays < 1) return `${diffHours} hr ago`;
    
    // Otherwise, show the date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return 'Unknown';
  }
}

export { API_BASE_URL };

