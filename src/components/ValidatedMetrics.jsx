import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, RefreshCw, Wifi } from 'lucide-react';
import { apiFetch, ApiError, API_BASE_URL, cacheMetrics, getCachedMetrics } from '@/lib/api';

/**
 * Component to fetch and display validated churn and ARPU metrics from backend
 */
export const ValidatedMetrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async (useCache = true) => {
    setLoading(true);
    setError(null);
    
    // Try to load from cache first
    if (useCache) {
      const cached = getCachedMetrics('validated-metrics');
      if (cached) {
        setMetrics(cached);
        setLoading(false);
        // Still try to fetch fresh data in background
        fetchMetrics(false);
        return;
      }
    }
    
    try {
      const data = await apiFetch('/api/v1/stripe/churn-and-arpu?months=3');
      setMetrics(data);
      cacheMetrics('validated-metrics', data);
      setRetryCount(0);
    } catch (err) {
      console.error('Error fetching validated metrics:', err);
      setError(err instanceof ApiError ? err : new ApiError(err.message, 'unknown', null, API_BASE_URL));
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchMetrics(false);
  };

  if (loading) {
    return (
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-blue-50 pb-3">
          <CardTitle className="text-sm text-blue-900 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Validated Metrics (from Stripe API)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Calculating churn and ARPU from backend...
        </CardContent>
      </Card>
    );
  }

  if (error && !metrics) {
    const apiError = error instanceof ApiError ? error : null;
    return (
      <Card className="border-2 border-red-200">
        <CardHeader className="bg-red-50 pb-3">
          <CardTitle className="text-sm text-red-900 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Error Loading Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="text-sm text-red-700">
            <p className="font-medium mb-2">{apiError?.message || error.message || 'Failed to fetch metrics'}</p>
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

  if (!metrics) {
    return null;
  }

  const { churn, arpu } = metrics;

  return (
    <Card className="border-2 border-green-200">
      <CardHeader className="bg-green-50 pb-3">
        <CardTitle className="text-sm text-green-900">
          ✅ Validated Metrics (Backend Calculated)
        </CardTitle>
        <p className="text-xs text-green-700 mt-1">
          Calculated from Stripe API data • Last updated: {new Date(metrics.timestamp).toLocaleString()}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Churn Metrics */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Churn Rate (Last {churn.period_months} months)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-xs text-red-600 mb-1">Customer Churn</p>
              <p className="text-2xl font-bold text-red-900 font-mono">
                {churn.customer_churn_rate}%
              </p>
              <p className="text-xs text-red-700 mt-1">
                {churn.customers_churned} of {churn.customers_at_start} customers
              </p>
            </div>
            <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
              <p className="text-xs text-orange-600 mb-1">Revenue Churn</p>
              <p className="text-2xl font-bold text-orange-900 font-mono">
                {churn.revenue_churn_rate}%
              </p>
              <p className="text-xs text-orange-700 mt-1">
                ${(churn.mrr_churned / 1000).toFixed(1)}K MRR lost
              </p>
            </div>
          </div>
          <div className="p-2 rounded bg-gray-50 text-xs text-gray-600">
            <p><strong>MRR at Start:</strong> ${(churn.mrr_at_start / 1000).toFixed(1)}K</p>
            <p><strong>Current MRR:</strong> ${(churn.current_mrr / 1000).toFixed(1)}K</p>
          </div>
        </div>

        {/* ARPU Metrics */}
        <div className="space-y-3 pt-2 border-t">
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Average Revenue Per User (ARPU)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-xs text-blue-600 mb-1">Monthly ARPU</p>
              <p className="text-2xl font-bold text-blue-900 font-mono">
                ${arpu.arpu_monthly.toLocaleString()}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                per customer/month
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
              <p className="text-xs text-purple-600 mb-1">Annual ARPU</p>
              <p className="text-2xl font-bold text-purple-900 font-mono">
                ${arpu.arpu_annual.toLocaleString()}
              </p>
              <p className="text-xs text-purple-700 mt-1">
                per customer/year
              </p>
            </div>
          </div>
          <div className="p-2 rounded bg-gray-50 text-xs text-gray-600">
            <p><strong>Total Customers:</strong> {arpu.total_customers}</p>
            <p><strong>Total MRR:</strong> ${(arpu.total_mrr / 1000).toFixed(1)}K</p>
          </div>
        </div>

        {/* Refresh Button */}
        <Button
          onClick={() => fetchMetrics(false)}
          variant="outline"
          size="sm"
          className="w-full mt-4 flex items-center justify-center gap-2"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh Metrics
        </Button>
        {error && (
          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
            <p className="font-medium">Note: Showing cached data</p>
            <p className="text-amber-700">{error instanceof ApiError ? error.message : 'API unavailable'}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

