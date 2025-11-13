import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { API_BASE_URL, ApiError, apiFetch, cacheMetrics, getCachedMetrics } from '@/lib/api';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Comprehensive metrics component that fetches all validated metrics from backend
 * Replaces hardcoded values with backend-calculated metrics from Stripe data
 */
export const ComprehensiveMetrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [usingCache, setUsingCache] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async (useCache = true) => {
    setLoading(true);
    setError(null);
    
    // Try to load from cache first
    if (useCache) {
      const cached = getCachedMetrics('comprehensive-metrics');
      if (cached) {
        setMetrics(cached);
        setUsingCache(true);
        setLoading(false);
        // Still try to fetch fresh data in background
        fetchMetrics(false);
        return;
      }
    }
    
    try {
      const data = await apiFetch('/api/v1/stripe/comprehensive-metrics');
      setMetrics(data);
      setUsingCache(false);
      cacheMetrics('comprehensive-metrics', data);
      setRetryCount(0);
    } catch (err) {
      console.error('Error fetching comprehensive metrics:', err);
      setError(err instanceof ApiError ? err : new ApiError(err.message, 'unknown', null, API_BASE_URL));
      // Try to use cached data if available
      const cached = getCachedMetrics('comprehensive-metrics');
      if (cached) {
        setMetrics(cached);
        setUsingCache(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchMetrics(false);
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

  if (loading && !metrics) {
    return (
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-blue-50 pb-3">
          <CardTitle className="text-sm text-blue-900 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading Validated Metrics...
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Fetching all metrics from backend...
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

  const {
    customer_metrics,
    retention_by_segment,
    pricing_tiers,
    expansion_metrics,
    unit_economics,
    churn,
    arpu,
    timestamp,
  } = metrics;

  return (
    <div className="space-y-4">
      {/* Header with validation badge */}
      <Card className="border-2 border-green-200 bg-green-50/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <CardTitle className="text-sm text-green-900">
                ✅ All Metrics Validated by Backend
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-xs border-green-300 text-green-700">
              Backend Calculated
            </Badge>
          </div>
          <CardDescription className="text-xs text-green-700 mt-1">
            All metrics calculated from Stripe API data • Last updated: {new Date(timestamp).toLocaleString()}
            {usingCache && ' • Showing cached data'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Button
              onClick={() => fetchMetrics(false)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh All Metrics
            </Button>
            {error && (
              <div className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error instanceof ApiError ? error.message : 'API unavailable'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Customer Metrics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Customer Metrics</CardTitle>
          <CardDescription className="text-xs">Validated from Stripe subscription data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2 border rounded text-center">
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-xl font-bold text-green-600">{customer_metrics.active_customers}</p>
            </div>
            <div className="p-2 border rounded text-center">
              <p className="text-xs text-muted-foreground">Churned</p>
              <p className="text-xl font-bold text-red-600">{customer_metrics.churned_customers}</p>
            </div>
            <div className="p-2 border rounded text-center">
              <p className="text-xs text-muted-foreground">Net Adds (YTD)</p>
              <p className="text-xl font-bold">+{customer_metrics.net_adds_ytd}</p>
            </div>
            <div className="p-2 border rounded text-center">
              <p className="text-xs text-muted-foreground">Growth (YTD)</p>
              <p className="text-xl font-bold">{customer_metrics.growth_rate_ytd}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Retention by Segment */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Retention by Segment</CardTitle>
          <CardDescription className="text-xs">Retention rates calculated from Stripe data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>TowPilot Retention</span>
                <span className="font-medium text-green-600">
                  {retention_by_segment.towpilot.retention_rate}%
                </span>
              </div>
              <Progress value={retention_by_segment.towpilot.retention_rate} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {retention_by_segment.towpilot.active_customers} active, {retention_by_segment.towpilot.churned_customers} churned
              </p>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Other Products</span>
                <span className="font-medium">
                  {retention_by_segment.other_products.retention_rate}%
                </span>
              </div>
              <Progress value={retention_by_segment.other_products.retention_rate} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {retention_by_segment.other_products.active_customers} active, {retention_by_segment.other_products.churned_customers} churned
              </p>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold">Overall Platform</span>
                <span className="font-semibold text-green-600">
                  {retention_by_segment.overall.retention_rate}%
                </span>
              </div>
              <Progress value={retention_by_segment.overall.retention_rate} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Tiers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">TowPilot Pricing Tiers</CardTitle>
          <CardDescription className="text-xs">Tier breakdown from active subscriptions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Tier</TableHead>
                <TableHead className="text-xs text-right">Customers</TableHead>
                <TableHead className="text-xs text-right">MRR</TableHead>
                <TableHead className="text-xs text-right">ARPU</TableHead>
                <TableHead className="text-xs text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pricing_tiers.tiers.map((tier, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-xs font-medium">{tier.tier}</TableCell>
                  <TableCell className="text-xs text-right">{tier.customers}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{formatCurrencyK(tier.mrr)}</TableCell>
                  <TableCell className="text-xs text-right font-mono">${tier.arpu.toFixed(0)}</TableCell>
                  <TableCell className="text-xs text-right">{tier.percentage}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Unit Economics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Unit Economics</CardTitle>
          <CardDescription className="text-xs">Calculated from ARPU and configured CAC</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total CAC</span>
              <span className="font-medium">{formatCurrency(unit_economics.cac.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground ml-4">Sales Cost</span>
              <span>{formatCurrency(unit_economics.cac.sales)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground ml-4">Marketing Cost</span>
              <span>{formatCurrency(unit_economics.cac.marketing)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">LTV (36mo)</span>
              <span className="font-medium">{formatCurrency(unit_economics.ltv.value)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payback Period</span>
              <span className="font-medium text-green-600">
                {unit_economics.cac_payback_months.toFixed(1)} months
              </span>
            </div>
            <Separator />
            <div className="p-2 bg-blue-50 rounded text-center">
              <p className="font-medium text-blue-800">LTV/CAC</p>
              <p className="text-2xl font-bold text-blue-900">{unit_economics.ltv_cac_ratio.toFixed(1)}x</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expansion Metrics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Expansion Metrics</CardTitle>
          <CardDescription className="text-xs">Gross and net retention from historical data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gross Retention</span>
              <span className="font-medium">{expansion_metrics.gross_retention}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Net Retention</span>
              <span className="font-medium text-green-600">{expansion_metrics.net_retention}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expansion Revenue</span>
              <span className="font-medium">{expansion_metrics.expansion_revenue_pct}%</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">ACV</span>
              <span className="font-medium">{formatCurrency(arpu.arpu_annual)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

