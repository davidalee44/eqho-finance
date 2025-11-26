/**
 * useProfitLoss - Hook for fetching P&L data from QuickBooks or cache
 * 
 * Attempts to fetch from QuickBooks API first, falls back to cached data,
 * then falls back to hardcoded values (until QuickBooks is connected).
 */

import { useState, useEffect, useCallback } from 'react';
import { apiFetch, fetchCachedMetrics } from '@/lib/api';

// Hardcoded P&L values (from Oct 2025 data) - used as last resort
// These should be replaced with live QuickBooks data when connected
const HARDCODED_PL = {
  total_revenue: 635390,      // YTD Revenue
  total_cogs: 280529.05,      // Cost of Goods Sold
  gross_profit: 354860.85,    // Gross Profit
  total_expenses: 1058976.92, // Operating Expenses
  net_income: -704116.07,     // Net Operating Income
  labor_cost: 124272,         // Total Oct Labor
  period: 'YTD Oct 2025',
  is_hardcoded: true,
};

/**
 * @typedef {Object} PLData
 * @property {number} total_revenue - Total revenue
 * @property {number} total_cogs - Cost of goods sold
 * @property {number} gross_profit - Gross profit
 * @property {number} total_expenses - Total operating expenses
 * @property {number} net_income - Net income/loss
 * @property {number} labor_cost - Labor costs (if available)
 * @property {Array} line_items - Detailed line items (if available)
 * @property {string} period - Period covered
 * @property {boolean} is_hardcoded - Whether using hardcoded fallback
 * @property {boolean} is_cached - Whether using cached data
 * @property {string} timestamp - When data was fetched
 * @property {string} source - Data source (quickbooks, cache, hardcoded)
 */

/**
 * Hook to fetch and manage P&L data
 * 
 * @returns {{
 *   data: PLData | null,
 *   loading: boolean,
 *   error: Error | null,
 *   timestamp: string | null,
 *   isCached: boolean,
 *   isHardcoded: boolean,
 *   refresh: () => Promise<void>,
 *   source: string
 * }}
 */
export function useProfitLoss() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timestamp, setTimestamp] = useState(null);
  const [isCached, setIsCached] = useState(false);
  const [isHardcoded, setIsHardcoded] = useState(false);
  const [source, setSource] = useState('loading');

  const fetchPL = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Try QuickBooks API first
      const response = await apiFetch('/api/v1/quickbooks/profit-loss/ytd');
      
      if (response && response.summary) {
        setData({
          ...response.summary,
          period: response.period,
          is_hardcoded: false,
          is_cached: response.is_cached || false,
        });
        setTimestamp(response.timestamp);
        setIsCached(response.is_cached || false);
        setIsHardcoded(false);
        setSource('quickbooks');
        return;
      }
    } catch (apiError) {
      console.warn('QuickBooks API unavailable, trying cache:', apiError.message);
    }

    // Try cached data from database
    try {
      const cached = await fetchCachedMetrics('quickbooks_pl');
      if (cached && cached.data) {
        const cachedData = cached.data;
        setData({
          total_revenue: cachedData.total_revenue || cachedData.summary?.total_revenue || 0,
          total_cogs: cachedData.total_cogs || cachedData.summary?.total_cogs || 0,
          gross_profit: cachedData.gross_profit || cachedData.summary?.gross_profit || 0,
          total_expenses: cachedData.total_expenses || cachedData.summary?.total_expenses || 0,
          net_income: cachedData.net_income || cachedData.summary?.net_income || 0,
          labor_cost: cachedData.labor_cost || 0,
          line_items: cachedData.line_items || cachedData.summary?.line_items || null,
          period: cachedData.period || 'Unknown',
          is_hardcoded: false,
          is_cached: true,
        });
        setTimestamp(cached.fetched_at);
        setIsCached(true);
        setIsHardcoded(false);
        setSource('cache');
        setLoading(false);
        return;
      }
    } catch (cacheError) {
      console.warn('Cache unavailable, using hardcoded data:', cacheError.message);
    }

    // Fall back to hardcoded values
    setData(HARDCODED_PL);
    setTimestamp(null);
    setIsCached(false);
    setIsHardcoded(true);
    setSource('hardcoded');
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPL();
  }, [fetchPL]);

  const refresh = useCallback(async () => {
    await fetchPL();
  }, [fetchPL]);

  return {
    data,
    loading,
    error,
    timestamp,
    isCached,
    isHardcoded,
    refresh,
    source,
  };
}

/**
 * Hook to fetch payroll/labor data
 */
export function usePayroll() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPayroll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch('/api/v1/quickbooks/payroll');
      setData(response);
    } catch (err) {
      console.warn('Payroll API error:', err.message);
      setError(err);
      
      // Try cache
      try {
        const cached = await fetchCachedMetrics('quickbooks_payroll');
        if (cached && cached.data) {
          setData({ ...cached.data, is_cached: true });
        }
      } catch (cacheErr) {
        console.warn('Payroll cache unavailable');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayroll();
  }, [fetchPayroll]);

  return { data, loading, error, refresh: fetchPayroll };
}

export default useProfitLoss;

