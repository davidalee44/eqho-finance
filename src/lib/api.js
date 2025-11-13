/**
 * API utility functions for consistent error handling and health checks
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Fallback values when API is unavailable (last known good state)
 */
export const FALLBACK_METRICS = {
  total: {
    mrr: 55913,
    arr: 670956,
    customers: 85,
    subscriptions: 85,
  },
  towpilot: {
    mrr: 47913,
    arr: 574956,
    customers: 74,
    acv: 8027,
  },
  other: {
    mrr: 8000,
    arr: 96000,
    customers: 11,
  },
  timestamp: new Date().toISOString(),
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

export { API_BASE_URL };

