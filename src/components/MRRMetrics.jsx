import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, ChevronDown, ChevronUp, ExternalLink, Loader2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError, FALLBACK_METRICS, API_BASE_URL, cacheMetrics, getCachedMetrics } from '@/lib/api';

/**
 * Component to fetch and display MRR metrics with drill-down capabilities
 * All MRR values are backed by actual Stripe subscription data
 */
export const MRRMetrics = ({ showDrillDown = true }) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);
  const [subscriptions, setSubscriptions] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    fetchMRRMetrics();
  }, []);

  const fetchMRRMetrics = async (useCache = true) => {
    setLoading(true);
    setError(null);
    
    // Try to load from cache first
    if (useCache) {
      const cached = getCachedMetrics('mrr');
      if (cached) {
        setMetrics(cached);
        setUsingFallback(false);
        setLoading(false);
        // Still try to fetch fresh data in background
        fetchMRRMetrics(false);
        return;
      }
    }
    
    try {
      // Fetch TowPilot metrics
      const towpilotData = await apiFetch('/api/v1/metrics/towpilot');

      // Fetch all products metrics for total
      const allProductsData = await apiFetch('/api/v1/metrics/all-products');

      // Calculate Other MRR
      const towpilotMRR = towpilotData.revenue_metrics?.mrr || 0;
      const totalMRR = allProductsData.mrr || 0;
      const otherMRR = totalMRR - towpilotMRR;

      const newMetrics = {
        total: {
          mrr: totalMRR,
          arr: totalMRR * 12,
          customers: allProductsData.customer_count || 0,
          subscriptions: allProductsData.subscription_count || 0,
        },
        towpilot: {
          mrr: towpilotMRR,
          arr: towpilotMRR * 12,
          customers: towpilotData.customer_metrics?.towpilot_customers || 0,
          acv: towpilotData.revenue_metrics?.acv || 0,
        },
        other: {
          mrr: otherMRR,
          arr: otherMRR * 12,
          customers: (allProductsData.customer_count || 0) - (towpilotData.customer_metrics?.towpilot_customers || 0),
        },
        timestamp: towpilotData.timestamp || new Date().toISOString(),
      };

      setMetrics(newMetrics);
      setUsingFallback(false);
      cacheMetrics('mrr', newMetrics);
      setRetryCount(0);
    } catch (err) {
      console.error('Error fetching MRR metrics:', err);
      
      // Use fallback values
      const fallbackMetrics = {
        ...FALLBACK_METRICS,
        timestamp: new Date().toISOString(),
      };
      setMetrics(fallbackMetrics);
      setUsingFallback(true);
      setError(err instanceof ApiError ? err : new ApiError(err.message, 'unknown', null, API_BASE_URL));
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchMRRMetrics(false);
  };

  const fetchSubscriptions = async (customerTag = null) => {
    if (subscriptions && expandedSection === customerTag) {
      setExpandedSection(null);
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch('/api/v1/stripe/subscriptions');
      
      // Filter by TowPilot if needed
      if (customerTag === 'towpilot') {
        // Fetch TowPilot customer IDs
        const customersData = await apiFetch('/api/v1/stripe/customers?tag=tow');
        const towpilotCustomerIds = new Set(customersData.customers?.map(c => c.id) || []);
        
        setSubscriptions({
          type: 'towpilot',
          subscriptions: data.subscriptions?.filter(sub => 
            towpilotCustomerIds.has(sub.customer)
          ) || [],
        });
      } else if (customerTag === 'other') {
        // Fetch TowPilot customer IDs to exclude
        const customersData = await apiFetch('/api/v1/stripe/customers?tag=tow');
        const towpilotCustomerIds = new Set(customersData.customers?.map(c => c.id) || []);
        
        setSubscriptions({
          type: 'other',
          subscriptions: data.subscriptions?.filter(sub => 
            !towpilotCustomerIds.has(sub.customer)
          ) || [],
        });
      } else {
        setSubscriptions({
          type: 'all',
          subscriptions: data.subscriptions || [],
        });
      }
      
      setExpandedSection(customerTag);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      setError(err instanceof ApiError ? err : new ApiError(err.message, 'unknown', null, API_BASE_URL));
    } finally {
      setLoading(false);
    }
  };

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

  const calculateSubscriptionMRR = (subscription) => {
    let mrr = 0;
    subscription.items?.forEach(item => {
      const amount = item.amount / 100; // Convert cents to dollars
      const interval = item.interval;
      const intervalCount = item.interval_count || 1;
      
      // Normalize to monthly MRR
      if (interval === 'year') {
        mrr += amount / 12;
      } else if (interval === 'month') {
        mrr += amount / intervalCount; // Handle quarterly (interval_count=3), etc.
      } else if (interval === 'day') {
        mrr += amount * 30;
      } else if (interval === 'week') {
        mrr += (amount * 52) / 12; // Weekly to monthly
      }
    });
    return mrr;
  };

  if (loading && !metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">MRR Metrics</CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
          Loading MRR data from Stripe API...
        </CardContent>
      </Card>
    );
  }

  if (error && !metrics) {
    const apiError = error instanceof ApiError ? error : null;
    return (
      <Card className="border-red-200">
        <CardHeader className="bg-red-50">
          <CardTitle className="text-sm text-red-900 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Error Loading MRR Metrics
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

  const towpilotPercent = metrics.total.mrr > 0 
    ? (metrics.towpilot.mrr / metrics.total.mrr * 100).toFixed(1)
    : 0;
  const otherPercent = metrics.total.mrr > 0
    ? (metrics.other.mrr / metrics.total.mrr * 100).toFixed(1)
    : 0;

  return (
    <>
      {error && metrics && (
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
    <div className="space-y-4">
      {/* Total MRR Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">MRR Breakdown</CardTitle>
              <CardDescription className="text-xs">
                {usingFallback ? (
                  <span className="flex items-center gap-1 text-amber-600">
                    <WifiOff className="h-3 w-3" />
                    Using fallback values (API unavailable)
                  </span>
                ) : (
                  `Calculated from all active Stripe subscriptions • Last updated: ${new Date(metrics.timestamp).toLocaleString()}`
                )}
              </CardDescription>
            </div>
            {usingFallback && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                Offline Mode
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-primary/5 rounded">
              <p className="text-xs text-muted-foreground">Total MRR</p>
              <p className="text-2xl font-bold">{formatCurrencyK(metrics.total.mrr)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(metrics.total.arr)} ARR
              </p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded">
              <p className="text-xs text-blue-700">TowPilot MRR</p>
              <p className="text-2xl font-bold text-blue-900">{formatCurrencyK(metrics.towpilot.mrr)}</p>
              <p className="text-xs text-blue-700 mt-1">
                {formatCurrency(metrics.towpilot.arr)} ARR
              </p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded">
              <p className="text-xs text-muted-foreground">Other MRR</p>
              <p className="text-2xl font-bold">{formatCurrencyK(metrics.other.mrr)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(metrics.other.arr)} ARR
              </p>
            </div>
          </div>

          {/* Customer Counts */}
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div className="text-center">
              <p className="text-muted-foreground">Total Customers</p>
              <p className="text-lg font-semibold">{metrics.total.customers}</p>
            </div>
            <div className="text-center">
              <p className="text-blue-700">TowPilot Customers</p>
              <p className="text-lg font-semibold text-blue-900">{metrics.towpilot.customers}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Other Customers</p>
              <p className="text-lg font-semibold">{metrics.other.customers}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TowPilot Details */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">TowPilot</CardTitle>
              <CardDescription className="text-xs">
                {towpilotPercent}% of total MRR • {metrics.towpilot.customers} customers
              </CardDescription>
            </div>
            {showDrillDown && (
              <button
                onClick={() => fetchSubscriptions('towpilot')}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                {expandedSection === 'towpilot' ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    Show Subscriptions
                  </>
                )}
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">MRR</p>
              <p className="text-xl font-bold text-blue-900">{formatCurrency(metrics.towpilot.mrr)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ARR</p>
              <p className="text-xl font-bold text-blue-900">{formatCurrency(metrics.towpilot.arr)}</p>
            </div>
          </div>
          {expandedSection === 'towpilot' && subscriptions && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs font-medium mb-2">
                {subscriptions.subscriptions.length} Active Subscriptions
              </p>
              <div className="max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Subscription ID</TableHead>
                      <TableHead className="text-xs text-right">MRR</TableHead>
                      <TableHead className="text-xs text-right">Interval</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.subscriptions.map((sub) => {
                      const subMRR = calculateSubscriptionMRR(sub);
                      return (
                        <TableRow key={sub.id}>
                          <TableCell className="text-xs font-mono">
                            <a
                              href={`https://dashboard.stripe.com/subscriptions/${sub.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              {sub.id.substring(0, 20)}...
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </TableCell>
                          <TableCell className="text-xs text-right font-medium">
                            {formatCurrency(subMRR)}
                          </TableCell>
                          <TableCell className="text-xs text-right text-muted-foreground">
                            {sub.items?.[0]?.interval || 'N/A'}
                            {sub.items?.[0]?.interval_count && sub.items?.[0]?.interval_count > 1 
                              ? ` (${sub.items[0].interval_count})` 
                              : ''}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Other Products Details */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Other Products</CardTitle>
              <CardDescription className="text-xs">
                {otherPercent}% of total MRR • {metrics.other.customers} customers
              </CardDescription>
            </div>
            {showDrillDown && (
              <button
                onClick={() => fetchSubscriptions('other')}
                className="text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1"
              >
                {expandedSection === 'other' ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    Show Subscriptions
                  </>
                )}
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">MRR</p>
              <p className="text-xl font-bold">{formatCurrency(metrics.other.mrr)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ARR</p>
              <p className="text-xl font-bold">{formatCurrency(metrics.other.arr)}</p>
            </div>
          </div>
          {expandedSection === 'other' && subscriptions && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs font-medium mb-2">
                {subscriptions.subscriptions.length} Active Subscriptions
              </p>
              <div className="max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Subscription ID</TableHead>
                      <TableHead className="text-xs text-right">MRR</TableHead>
                      <TableHead className="text-xs text-right">Interval</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.subscriptions.map((sub) => {
                      const subMRR = calculateSubscriptionMRR(sub);
                      return (
                        <TableRow key={sub.id}>
                          <TableCell className="text-xs font-mono">
                            <a
                              href={`https://dashboard.stripe.com/subscriptions/${sub.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              {sub.id.substring(0, 20)}...
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </TableCell>
                          <TableCell className="text-xs text-right font-medium">
                            {formatCurrency(subMRR)}
                          </TableCell>
                          <TableCell className="text-xs text-right text-muted-foreground">
                            {sub.items?.[0]?.interval || 'N/A'}
                            {sub.items?.[0]?.interval_count && sub.items?.[0]?.interval_count > 1 
                              ? ` (${sub.items[0].interval_count})` 
                              : ''}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  );
};

