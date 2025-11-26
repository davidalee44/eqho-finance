import { DataTimestamp } from '@/components/DataTimestamp';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { API_BASE_URL, ApiError, apiFetch, cacheMetrics, FALLBACK_METRICS, fetchCachedMetrics, getCachedMetrics } from '@/lib/api';
import { AlertCircle, ChevronDown, ChevronUp, Loader2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Component to break down October 2025 revenue
 * Shows subscription MRR vs usage/services with drill-down
 * 
 * @param {boolean} investorMode - Hide error messages and fallback indicators (for investor presentations)
 */
export const OctoberRevenueBreakdown = ({ investorMode = false }) => {
  const [mrrData, setMrrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [dataTimestamp, setDataTimestamp] = useState(null);

  useEffect(() => {
    fetchMRRData();
  }, []);

  const fetchMRRData = async (useLocalCache = true) => {
    setLoading(true);
    setError(null);
    
    // Try to load from localStorage cache first
    if (useLocalCache) {
      const cached = getCachedMetrics('october-revenue');
      if (cached) {
        setMrrData(cached);
        setUsingFallback(false);
        setDataTimestamp(cached.timestamp);
        setLoading(false);
        // Still try to fetch fresh data in background
        fetchMRRData(false);
        return;
      }
    }
    
    try {
      // Fetch all products metrics for total MRR (handles pagination automatically)
      const allProductsData = await apiFetch('/api/v1/metrics/all-products');

      const newData = {
        totalMRR: allProductsData.mrr || 0,
        totalARR: (allProductsData.mrr || 0) * 12,
        subscriptionCount: allProductsData.subscription_count || 0,
        customerCount: allProductsData.customer_count || 0,
        timestamp: new Date().toISOString(),
      };

      setMrrData(newData);
      setUsingFallback(false);
      setDataTimestamp(newData.timestamp);
      cacheMetrics('october-revenue', newData);
      setRetryCount(0);
    } catch (err) {
      console.error('Error fetching MRR data:', err);
      
      // Try to fetch from database cache
      try {
        const dbCached = await fetchCachedMetrics('comprehensive_metrics');
        if (dbCached && dbCached.data) {
          const cachedData = dbCached.data;
          const newData = {
            totalMRR: cachedData.arpu?.total_mrr || 0,
            totalARR: (cachedData.arpu?.total_mrr || 0) * 12,
            subscriptionCount: cachedData.customer_metrics?.active_customers || 0,
            customerCount: cachedData.customer_metrics?.active_customers || 0,
            timestamp: dbCached.fetched_at,
          };
          setMrrData(newData);
          setUsingFallback(false);
          setDataTimestamp(dbCached.fetched_at);
          setError(err instanceof ApiError ? err : new ApiError(err.message, 'unknown', null, API_BASE_URL));
          setLoading(false);
          return;
        }
      } catch (dbErr) {
        console.warn('Failed to fetch from database cache:', dbErr);
      }
      
      // Use null fallback if no cached data
      const fallbackData = {
        totalMRR: FALLBACK_METRICS.total.mrr,
        totalARR: FALLBACK_METRICS.total.arr,
        subscriptionCount: FALLBACK_METRICS.total.subscriptions,
        customerCount: FALLBACK_METRICS.total.customers,
        timestamp: null,
      };
      setMrrData(fallbackData);
      setUsingFallback(true);
      setDataTimestamp(null);
      setError(err instanceof ApiError ? err : new ApiError(err.message, 'unknown', null, API_BASE_URL));
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchMRRData(false);
  };

  // Current Stripe MRR data - display actual live MRR, not October comparison
  // Note: The component now shows current MRR metrics rather than trying to break down historical P&L
  const subscriptionMRR = mrrData?.totalMRR;
  const hasValidMRR = subscriptionMRR !== null && subscriptionMRR !== undefined && !Number.isNaN(subscriptionMRR);
  
  // Only calculate ARR if we have valid MRR data
  const subscriptionARR = hasValidMRR ? subscriptionMRR * 12 : null;
  const customerCount = mrrData?.customerCount;
  const subscriptionCount = mrrData?.subscriptionCount;

  const formatCurrency = (amount) => {
    // Handle null/undefined/NaN values
    if (amount === null || amount === undefined || Number.isNaN(amount)) {
      return '--';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCurrencyK = (amount) => {
    // Handle null/undefined/NaN values
    if (amount === null || amount === undefined || Number.isNaN(amount)) {
      return '--';
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return formatCurrency(amount);
  };

  if (loading && !mrrData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Current Revenue Metrics</CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
          Loading revenue data...
        </CardContent>
      </Card>
    );
  }

  // Hide error completely in investor mode
  if (error && !mrrData) {
    if (investorMode) return null;
    const apiError = error instanceof ApiError ? error : null;
    return (
      <Card className="border-red-200">
        <CardHeader className="bg-red-50">
          <CardTitle className="text-sm text-red-900 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Error Loading Revenue Data
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="text-sm text-red-700">
            <p className="font-medium mb-2">{apiError?.message || error.message || 'Failed to fetch data'}</p>
            {apiError && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-red-800">Troubleshooting Steps:</p>
                <ul className="text-xs space-y-1 list-disc list-inside text-red-600">
                  {apiError.troubleshootingSteps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ul>
                <p className="text-xs mt-3 text-red-600">
                  <strong>API URL:</strong> {apiError.url || API_BASE_URL}
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleRetry}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              Retry {retryCount > 0 && `(${retryCount})`}
            </Button>
            <Button
              onClick={() => {
                window.open(`${API_BASE_URL}/health`, '_blank');
              }}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Wifi className="h-3 w-3" />
              Check Backend Status
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Hide error warning in investor mode */}
      {error && mrrData && !investorMode && (
        <Card className="border-amber-200 bg-amber-50/50 mb-4">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="h-4 w-4" />
                <p className="text-xs">
                  Showing fallback values. {error instanceof ApiError ? error.message : 'API unavailable'}
                </p>
              </div>
              <Button
                onClick={handleRetry}
                variant="outline"
                size="sm"
                className="h-7 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Current Revenue Metrics</CardTitle>
                {usingFallback && !investorMode && (
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                    Offline Mode
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs">
                {usingFallback && !investorMode ? (
                  <span className="flex items-center gap-1 text-amber-600">
                    <WifiOff className="h-3 w-3" />
                    No data available (API unavailable)
                  </span>
                ) : (
                  <DataTimestamp
                    timestamp={dataTimestamp}
                    source="Stripe"
                    isCached={!!error && !!mrrData}
                    onRefresh={() => fetchMRRData(false)}
                  />
                )}
              </CardDescription>
            </div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 ml-2"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  Show Breakdown
                </>
              )}
            </button>
          </div>
        </CardHeader>
      <CardContent>
        {/* Current MRR - Live from Stripe */}
        <div className="text-center p-4 bg-primary/5 rounded-lg mb-4">
          <p className="text-xs text-muted-foreground mb-1">Current Monthly Recurring Revenue</p>
          <p className="text-3xl font-bold">{formatCurrency(subscriptionMRR)}</p>
          <p className="text-xs text-muted-foreground mt-1">Live from Stripe API</p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* ARR */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700 font-medium">Annual Run Rate (ARR)</p>
            <p className="text-xl font-bold text-blue-900">{formatCurrency(subscriptionARR)}</p>
            <p className="text-xs text-blue-600">MRR × 12</p>
          </div>

          {/* Active Customers */}
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-xs text-green-700 font-medium">Active Customers</p>
            <p className="text-xl font-bold text-green-900">{customerCount ?? '--'}</p>
            <p className="text-xs text-green-600">{subscriptionCount ?? '--'} subscriptions</p>
          </div>
        </div>

        {/* Breakdown Details (expandable) */}
        <div className="space-y-4">
          {/* Subscription Details */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span className="text-sm font-medium">Subscription Revenue</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{formatCurrencyK(subscriptionMRR)}</p>
                <p className="text-xs text-muted-foreground">per month</p>
              </div>
            </div>
            {hasValidMRR && <Progress value={100} className="h-2" />}
            <p className="text-xs text-muted-foreground mt-1">
              Recurring subscriptions from Stripe
              {subscriptionCount && (
                <> • {subscriptionCount} active subscriptions</>
              )}
            </p>
          </div>

          <Separator />

          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-2 bg-blue-50 rounded">
              <p className="text-blue-700 font-medium">Monthly Recurring</p>
              <p className="text-lg font-bold text-blue-900">{formatCurrencyK(subscriptionMRR)}</p>
              <p className="text-blue-600">Subscription MRR</p>
            </div>
            <div className="p-2 bg-green-50 rounded">
              <p className="text-green-700 font-medium">Annual Run Rate</p>
              <p className="text-lg font-bold text-green-900">{formatCurrencyK(subscriptionARR)}</p>
              <p className="text-green-600">ARR</p>
            </div>
          </div>

          {/* Expanded Details */}
          {expanded && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs font-medium mb-3">Subscription Details:</p>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-muted-foreground">Monthly Recurring Revenue</span>
                  <span className="font-medium">{formatCurrency(subscriptionMRR)}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-muted-foreground">Annual Run Rate</span>
                  <span className="font-medium">{formatCurrency(subscriptionARR)}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-muted-foreground">Active Customers</span>
                  <span className="font-medium">{customerCount ?? '--'}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-muted-foreground">Active Subscriptions</span>
                  <span className="font-medium">{subscriptionCount ?? '--'}</span>
                </div>
                {hasValidMRR && customerCount > 0 && (
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="text-muted-foreground">Average Revenue Per Customer</span>
                    <span className="font-medium">{formatCurrency(subscriptionMRR / customerCount)}/mo</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between p-2 bg-primary/5 rounded font-medium">
                  <span>Current MRR (Stripe)</span>
                  <span>{formatCurrency(subscriptionMRR)}</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                <p className="text-xs font-medium text-blue-900 mb-1">💡 Data Source</p>
                <p className="text-xs text-blue-700">
                  All metrics are calculated live from Stripe subscription data. 
                  MRR includes monthly subscriptions and annualized portions of yearly plans.
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    </>
  );
};

