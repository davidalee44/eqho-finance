/**
 * useCashFlow Hook
 * 
 * Fetches and manages cash flow data from the backend API.
 * Includes caching, auto-refresh, and error handling.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch, getCachedMetrics, cacheMetrics } from '@/lib/api';

const CACHE_KEY = 'cashflow_summary';
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Hook for fetching and managing cash flow dashboard data
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoRefresh - Enable auto-refresh (default: true)
 * @param {number} options.refreshInterval - Refresh interval in ms (default: 5 minutes)
 * @returns {Object} Cash flow data and control functions
 */
export function useCashFlow({ autoRefresh = true, refreshInterval = REFRESH_INTERVAL } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const refreshTimerRef = useRef(null);
  const mountedRef = useRef(true);

  /**
   * Fetch cash flow summary from API
   */
  const fetchCashFlowSummary = useCallback(async (forceRefresh = false) => {
    if (!mountedRef.current) return;

    try {
      // Check cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cached = getCachedMetrics(CACHE_KEY);
        if (cached) {
          setData(cached);
          setLastUpdated(new Date(cached.timestamp));
          setLoading(false);
          // Still fetch fresh data in background
        }
      }

      setIsRefreshing(true);
      
      const response = await apiFetch(`/api/v1/cashflow/summary?force_refresh=${forceRefresh}`);
      
      if (!mountedRef.current) return;

      setData(response);
      setLastUpdated(new Date(response.timestamp));
      setError(null);
      
      // Cache the response
      cacheMetrics(CACHE_KEY, response);
      
    } catch (err) {
      if (!mountedRef.current) return;
      
      console.error('[CashFlow] Error fetching summary:', err);
      setError(err);
      
      // Try to use cached data on error
      const cached = getCachedMetrics(CACHE_KEY);
      if (cached && !data) {
        setData(cached);
        setLastUpdated(new Date(cached.timestamp));
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [data]);

  /**
   * Force refresh data
   */
  const refresh = useCallback(() => {
    return fetchCashFlowSummary(true);
  }, [fetchCashFlowSummary]);

  /**
   * Fetch specific data sections
   */
  const fetchBankBalances = useCallback(async () => {
    try {
      return await apiFetch('/api/v1/cashflow/bank-balances');
    } catch (err) {
      console.error('[CashFlow] Error fetching bank balances:', err);
      throw err;
    }
  }, []);

  const fetchStripeBalance = useCallback(async () => {
    try {
      return await apiFetch('/api/v1/cashflow/stripe-balance');
    } catch (err) {
      console.error('[CashFlow] Error fetching Stripe balance:', err);
      throw err;
    }
  }, []);

  const fetchUpcomingBillings = useCallback(async (days = 30) => {
    try {
      return await apiFetch(`/api/v1/cashflow/upcoming-billings?days=${days}`);
    } catch (err) {
      console.error('[CashFlow] Error fetching upcoming billings:', err);
      throw err;
    }
  }, []);

  const fetchRecentActivity = useCallback(async () => {
    try {
      return await apiFetch('/api/v1/cashflow/recent-activity');
    } catch (err) {
      console.error('[CashFlow] Error fetching recent activity:', err);
      throw err;
    }
  }, []);

  const fetchBillingForecast = useCallback(async (days = 90) => {
    try {
      return await apiFetch(`/api/v1/cashflow/billing-forecast?days=${days}`);
    } catch (err) {
      console.error('[CashFlow] Error fetching billing forecast:', err);
      throw err;
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      return await apiFetch('/api/v1/cashflow/status');
    } catch (err) {
      console.error('[CashFlow] Error fetching status:', err);
      throw err;
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    fetchCashFlowSummary();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchCashFlowSummary]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    refreshTimerRef.current = setInterval(() => {
      if (mountedRef.current) {
        fetchCashFlowSummary(false);
      }
    }, refreshInterval);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, fetchCashFlowSummary]);

  // Extracted values for convenience
  const bankBalances = data?.bank_balances?.quickbooks || null;
  const stripeBalance = data?.stripe_balance || null;
  const upcomingBillings = data?.upcoming_billings || null;
  const totals = data?.totals || null;
  const healthIndicators = data?.health_indicators || null;

  return {
    // Main data
    data,
    loading,
    error,
    lastUpdated,
    isRefreshing,
    
    // Extracted sections
    bankBalances,
    stripeBalance,
    upcomingBillings,
    totals,
    healthIndicators,
    
    // Actions
    refresh,
    fetchBankBalances,
    fetchStripeBalance,
    fetchUpcomingBillings,
    fetchRecentActivity,
    fetchBillingForecast,
    fetchStatus,
    
    // Helper computed values
    totalCash: totals?.total_cash_available || 0,
    expectedThisWeek: upcomingBillings?.this_week?.amount || 0,
    expectedThisMonth: upcomingBillings?.this_month?.amount || 0,
    isCached: data?.is_cached || false,
  };
}

export default useCashFlow;

