import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, ChevronDown, ChevronUp, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { apiFetch, ApiError, FALLBACK_METRICS, API_BASE_URL, cacheMetrics, getCachedMetrics } from '@/lib/api';

/**
 * Component to break down October 2025 revenue
 * Shows subscription MRR vs usage/services with drill-down
 */
export const OctoberRevenueBreakdown = () => {
  const [mrrData, setMrrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    fetchMRRData();
  }, []);

  const fetchMRRData = async (useCache = true) => {
    setLoading(true);
    setError(null);
    
    // Try to load from cache first
    if (useCache) {
      const cached = getCachedMetrics('october-revenue');
      if (cached) {
        setMrrData(cached);
        setUsingFallback(false);
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
      };

      setMrrData(newData);
      setUsingFallback(false);
      cacheMetrics('october-revenue', newData);
      setRetryCount(0);
    } catch (err) {
      console.error('Error fetching MRR data:', err);
      
      // Use fallback values
      const fallbackData = {
        totalMRR: FALLBACK_METRICS.total.mrr,
        totalARR: FALLBACK_METRICS.total.arr,
        subscriptionCount: FALLBACK_METRICS.total.subscriptions,
        customerCount: FALLBACK_METRICS.total.customers,
      };
      setMrrData(fallbackData);
      setUsingFallback(true);
      setError(err instanceof ApiError ? err : new ApiError(err.message, 'unknown', null, API_BASE_URL));
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchMRRData(false);
  };

  // October 2025 P&L data
  const octoberTotalRevenue = 89469.07;
  const subscriptionMRR = mrrData?.totalMRR || 55913; // Fallback to known value
  const usageServices = octoberTotalRevenue - subscriptionMRR;
  const subscriptionPercent = (subscriptionMRR / octoberTotalRevenue) * 100;
  const usagePercent = (usageServices / octoberTotalRevenue) * 100;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCurrencyK = (amount) => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return formatCurrency(amount);
  };

  if (loading && !mrrData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">October Revenue Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
          Loading revenue data...
        </CardContent>
      </Card>
    );
  }

  if (error && !mrrData) {
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
      {error && mrrData && (
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
                <CardTitle className="text-base">October 2025 Revenue Breakdown</CardTitle>
                {usingFallback && (
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                    Offline Mode
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs">
                {usingFallback ? (
                  <span className="flex items-center gap-1 text-amber-600">
                    <WifiOff className="h-3 w-3" />
                    Using fallback values (API unavailable)
                  </span>
                ) : (
                  `Total Revenue: ${formatCurrency(octoberTotalRevenue)} • From QuickBooks P&L`
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
        {/* Total Revenue */}
        <div className="text-center p-4 bg-primary/5 rounded-lg mb-4">
          <p className="text-xs text-muted-foreground mb-1">Total October Revenue (P&L)</p>
          <p className="text-3xl font-bold">{formatCurrency(octoberTotalRevenue)}</p>
          <p className="text-xs text-muted-foreground mt-1">QuickBooks Profit & Loss Report</p>
        </div>

        {/* Breakdown */}
        <div className="space-y-4">
          {/* Subscription MRR */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span className="text-sm font-medium">Subscription MRR</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{formatCurrency(subscriptionMRR)}</p>
                <p className="text-xs text-muted-foreground">{subscriptionPercent.toFixed(1)}%</p>
              </div>
            </div>
            <Progress value={subscriptionPercent} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Recurring subscriptions from Stripe • {formatCurrency(subscriptionMRR * 12)} ARR
              {mrrData?.subscriptionCount && (
                <> • {mrrData.subscriptionCount} active subscriptions</>
              )}
            </p>
          </div>

          {/* Usage & Services */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-amber-500" />
                <span className="text-sm font-medium">Usage & Services</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{formatCurrency(usageServices)}</p>
                <p className="text-xs text-muted-foreground">{usagePercent.toFixed(1)}%</p>
              </div>
            </div>
            <Progress value={usagePercent} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Per-minute charges, setup fees, professional services, onboarding
            </p>
          </div>

          <Separator />

          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-2 bg-blue-50 rounded">
              <p className="text-blue-700 font-medium">Recurring Revenue</p>
              <p className="text-lg font-bold text-blue-900">{subscriptionPercent.toFixed(1)}%</p>
              <p className="text-blue-600">Subscription MRR</p>
            </div>
            <div className="p-2 bg-amber-50 rounded">
              <p className="text-amber-700 font-medium">Variable Revenue</p>
              <p className="text-lg font-bold text-amber-900">{usagePercent.toFixed(1)}%</p>
              <p className="text-amber-600">Usage & Services</p>
            </div>
          </div>

          {/* Expanded Details */}
          {expanded && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs font-medium mb-3">Revenue Components:</p>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-muted-foreground">Subscription MRR (Stripe)</span>
                  <span className="font-medium">{formatCurrency(subscriptionMRR)}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-muted-foreground">Usage-based charges</span>
                  <span className="font-medium">~{formatCurrencyK(usageServices * 0.6)}</span>
                  <span className="text-muted-foreground text-xs">(estimated)</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-muted-foreground">Professional services</span>
                  <span className="font-medium">~{formatCurrencyK(usageServices * 0.3)}</span>
                  <span className="text-muted-foreground text-xs">(estimated)</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-muted-foreground">Setup/onboarding fees</span>
                  <span className="font-medium">~{formatCurrencyK(usageServices * 0.1)}</span>
                  <span className="text-muted-foreground text-xs">(estimated)</span>
                </div>
                <Separator />
                <div className="flex justify-between p-2 bg-primary/5 rounded font-medium">
                  <span>Total October Revenue</span>
                  <span>{formatCurrency(octoberTotalRevenue)}</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                <p className="text-xs font-medium text-blue-900 mb-1">💡 Revenue Model</p>
                <p className="text-xs text-blue-700">
                  Hybrid model: {subscriptionPercent.toFixed(1)}% predictable recurring revenue + {usagePercent.toFixed(1)}% variable usage-based revenue. 
                  This provides stability while capturing growth from increased customer usage.
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

