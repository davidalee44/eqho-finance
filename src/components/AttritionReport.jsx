import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch, fetchCachedMetrics } from '@/lib/api';
import { AlertCircle, ArrowDown, ArrowUp, Calendar, Loader2, RefreshCw, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DataTimestamp, CachedDataBanner } from '@/components/DataTimestamp';

/**
 * Attrition Report Component
 * 
 * Displays cohort-based retention analysis with:
 * - Early churn rate (first 60 days)
 * - Steady-state monthly churn (post-60 days)
 * - LTV calculation with methodology
 * - Investor-ready narrative summary
 * 
 * @param {boolean} investorMode - Hide error messages and internal indicators (for investor presentations)
 * @param {boolean} showCohorts - Show detailed cohort retention table (default false)
 */
export const AttritionReport = ({ investorMode = false, showCohorts = false }) => {
  const [summary, setSummary] = useState(null);
  const [cohorts, setCohorts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usingCache, setUsingCache] = useState(false);
  const [dataTimestamp, setDataTimestamp] = useState(null);

  useEffect(() => {
    fetchAttritionData();
  }, []);

  const fetchAttritionData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch summary and cohorts in parallel
      const [summaryData, cohortsData] = await Promise.all([
        apiFetch('/api/v1/attrition/summary'),
        showCohorts ? apiFetch('/api/v1/attrition/cohorts') : Promise.resolve(null),
      ]);
      
      setSummary(summaryData);
      if (cohortsData) setCohorts(cohortsData);
      setUsingCache(summaryData._from_cache || false);
      setDataTimestamp(summaryData.data_source?.timestamp);
      
    } catch (err) {
      console.error('Error fetching attrition data:', err);
      
      // Try database cache as fallback
      try {
        const dbCached = await fetchCachedMetrics('attrition_summary');
        if (dbCached && dbCached.data) {
          setSummary(dbCached.data);
          setUsingCache(true);
          setDataTimestamp(dbCached.fetched_at);
          setError(null);
          setLoading(false);
          return;
        }
      } catch (dbErr) {
        console.warn('Failed to fetch from database cache:', dbErr);
      }
      
      setError(err.message || 'Failed to load attrition data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '--';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '--';
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-slate-700">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <span className="ml-3 text-slate-400">Analyzing retention data...</span>
        </CardContent>
      </Card>
    );
  }

  if (error && !summary) {
    return (
      <Card className="bg-slate-900/50 border-red-900/50">
        <CardContent className="flex items-center justify-center py-12">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <span className="ml-3 text-red-400">{error}</span>
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-4" 
            onClick={fetchAttritionData}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const earlyChurn = summary?.early_churn || {};
  const steadyState = summary?.steady_state_churn || {};
  const ltv = summary?.ltv || {};
  const arpu = summary?.arpu || {};

  return (
    <div className="space-y-6">
      {/* Header with timestamp */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Attrition & LTV Analysis</h2>
          <p className="text-slate-400 text-sm mt-1">Data-driven retention metrics from Stripe</p>
        </div>
        <div className="flex items-center gap-3">
          {!investorMode && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchAttritionData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
          <DataTimestamp 
            timestamp={dataTimestamp} 
            source={usingCache ? 'cached' : 'live'} 
          />
        </div>
      </div>

      {/* Cached Data Banner */}
      {usingCache && !investorMode && (
        <CachedDataBanner 
          timestamp={dataTimestamp}
          onRefresh={fetchAttritionData}
        />
      )}

      {/* Narrative Summary Card */}
      <Card className="bg-gradient-to-br from-purple-900/30 to-slate-900/50 border-purple-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-400" />
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-300 text-lg leading-relaxed">
            {summary?.narrative || 'Analyzing customer retention patterns...'}
          </p>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Early Churn */}
        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Early Churn ({earlyChurn.period_days || 60} Days)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-red-400">
                {formatPercent(earlyChurn.churn_rate)}
              </span>
              <ArrowDown className="h-5 w-5 text-red-400" />
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {earlyChurn.churned_early || 0} of {earlyChurn.customers_analyzed || 0} customers
            </p>
          </CardContent>
        </Card>

        {/* Steady-State Churn */}
        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 flex items-center gap-1">
              <TrendingDown className="h-4 w-4" />
              Monthly Churn (Steady-State)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-amber-400">
                {formatPercent(steadyState.monthly_rate)}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {formatPercent(steadyState.annual_rate)} annualized
            </p>
          </CardContent>
        </Card>

        {/* Average Lifespan */}
        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 flex items-center gap-1">
              <Users className="h-4 w-4" />
              Average Lifespan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-emerald-400">
                {Math.round(steadyState.average_lifespan_months || 0)}
              </span>
              <span className="text-slate-400 text-sm">months</span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Based on {steadyState.customers_analyzed || 0} mature customers
            </p>
          </CardContent>
        </Card>

        {/* Calculated LTV */}
        <Card className="bg-gradient-to-br from-emerald-900/30 to-slate-900/50 border-emerald-700/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-emerald-300 flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Customer Lifetime Value
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-emerald-400">
                {formatCurrency(ltv.value)}
              </span>
            </div>
            <p className="text-sm text-emerald-300/70 mt-1">
              {ltv.methodology}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* LTV Calculation Breakdown */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">LTV Calculation Methodology</CardTitle>
          <CardDescription>Transparent derivation of Customer Lifetime Value</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* ARPU */}
            <div className="text-center p-4 bg-slate-800/50 rounded-lg">
              <p className="text-slate-400 text-sm mb-1">ARPU (Monthly)</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(arpu.monthly)}
              </p>
            </div>
            
            {/* Multiplication Sign */}
            <div className="flex items-center justify-center text-slate-500 text-2xl font-light">
              ×
            </div>
            
            {/* Gross Margin */}
            <div className="text-center p-4 bg-slate-800/50 rounded-lg">
              <p className="text-slate-400 text-sm mb-1">Gross Margin</p>
              <p className="text-2xl font-bold text-white">
                {formatPercent(summary?.gross_margin * 100)}
              </p>
            </div>
            
            {/* Multiplication Sign */}
            <div className="flex items-center justify-center text-slate-500 text-2xl font-light">
              ×
            </div>
            
            {/* Lifespan */}
            <div className="text-center p-4 bg-slate-800/50 rounded-lg">
              <p className="text-slate-400 text-sm mb-1">Avg Lifespan</p>
              <p className="text-2xl font-bold text-white">
                {Math.round(steadyState.average_lifespan_months || 0)} mo
              </p>
            </div>
            
            {/* Equals Sign */}
            <div className="flex items-center justify-center text-slate-500 text-2xl font-light">
              =
            </div>
            
            {/* LTV */}
            <div className="text-center p-4 bg-emerald-900/30 rounded-lg border border-emerald-700/50 col-span-2">
              <p className="text-emerald-300 text-sm mb-1">Lifetime Value</p>
              <p className="text-3xl font-bold text-emerald-400">
                {formatCurrency(ltv.value)}
              </p>
            </div>
          </div>
          
          {/* Comparison to Previous */}
          {!investorMode && (
            <div className="mt-6 pt-4 border-t border-slate-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Previous hardcoded LTV:</span>
                <span className="text-slate-500">{formatCurrency(14100)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-slate-400">New calculated LTV:</span>
                <span className="text-emerald-400">{formatCurrency(ltv.value)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-slate-400">Difference:</span>
                <span className={ltv.value > 14100 ? 'text-emerald-400' : 'text-red-400'}>
                  {ltv.value > 14100 ? '+' : ''}{formatCurrency(ltv.value - 14100)}
                  {' '}({ltv.value > 14100 ? '+' : ''}{(((ltv.value - 14100) / 14100) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Retention Funnel */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">Customer Retention Funnel</CardTitle>
          <CardDescription>Visualizing the customer lifecycle</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Early Period */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-400">Survived First {earlyChurn.period_days || 60} Days</span>
              <span className="text-white font-medium">{formatPercent(earlyChurn.retention_rate)}</span>
            </div>
            <Progress 
              value={earlyChurn.retention_rate || 0} 
              className="h-3 bg-slate-800"
            />
          </div>
          
          {/* After 90 Days */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-400">Retained After 90 Days (Est.)</span>
              <span className="text-white font-medium">
                {formatPercent((earlyChurn.retention_rate || 100) * (1 - (steadyState.monthly_rate || 0) / 100))}
              </span>
            </div>
            <Progress 
              value={(earlyChurn.retention_rate || 100) * (1 - (steadyState.monthly_rate || 0) / 100)} 
              className="h-3 bg-slate-800"
            />
          </div>
          
          {/* After 1 Year */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-400">Retained After 1 Year (Est.)</span>
              <span className="text-white font-medium">
                {formatPercent((earlyChurn.retention_rate || 100) * Math.pow(1 - (steadyState.monthly_rate || 0) / 100, 12))}
              </span>
            </div>
            <Progress 
              value={(earlyChurn.retention_rate || 100) * Math.pow(1 - (steadyState.monthly_rate || 0) / 100, 12)} 
              className="h-3 bg-slate-800"
            />
          </div>
        </CardContent>
      </Card>

      {/* Cohort Table (optional) */}
      {showCohorts && cohorts && cohorts.cohorts && (
        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">Cohort Retention Analysis</CardTitle>
            <CardDescription>Retention by signup month</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-400">Cohort</TableHead>
                  <TableHead className="text-slate-400 text-right">Size</TableHead>
                  <TableHead className="text-slate-400 text-right">30d</TableHead>
                  <TableHead className="text-slate-400 text-right">60d</TableHead>
                  <TableHead className="text-slate-400 text-right">90d</TableHead>
                  <TableHead className="text-slate-400 text-right">180d</TableHead>
                  <TableHead className="text-slate-400 text-right">365d</TableHead>
                  <TableHead className="text-slate-400 text-right">Current MRR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cohorts.cohorts.slice(-12).map((cohort) => (
                  <TableRow key={cohort.cohort} className="border-slate-700">
                    <TableCell className="text-white font-medium">{cohort.cohort_label}</TableCell>
                    <TableCell className="text-slate-300 text-right">{cohort.size}</TableCell>
                    <TableCell className="text-right">
                      <RetentionCell value={cohort.retention['30d']} />
                    </TableCell>
                    <TableCell className="text-right">
                      <RetentionCell value={cohort.retention['60d']} />
                    </TableCell>
                    <TableCell className="text-right">
                      <RetentionCell value={cohort.retention['90d']} />
                    </TableCell>
                    <TableCell className="text-right">
                      <RetentionCell value={cohort.retention['180d']} />
                    </TableCell>
                    <TableCell className="text-right">
                      <RetentionCell value={cohort.retention['365d']} />
                    </TableCell>
                    <TableCell className="text-emerald-400 text-right">
                      {formatCurrency(cohort.current_mrr)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Average Row */}
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="grid grid-cols-7 gap-4 text-sm">
                <div className="text-slate-400 font-medium">Averages:</div>
                <div className="text-right">
                  <RetentionCell value={cohorts.average_retention['30d']} showLabel />
                </div>
                <div className="text-right">
                  <RetentionCell value={cohorts.average_retention['60d']} showLabel />
                </div>
                <div className="text-right">
                  <RetentionCell value={cohorts.average_retention['90d']} showLabel />
                </div>
                <div className="text-right">
                  <RetentionCell value={cohorts.average_retention['180d']} showLabel />
                </div>
                <div className="text-right">
                  <RetentionCell value={cohorts.average_retention['365d']} showLabel />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Source Info (admin only) */}
      {!investorMode && summary?.data_source && (
        <Card className="bg-slate-800/30 border-slate-700/50">
          <CardContent className="py-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                Analyzed {summary.data_source.subscriptions_analyzed} total subscriptions
                ({summary.data_source.active_subscriptions} currently active)
              </span>
              <span>
                Gross margin: {formatPercent(summary.gross_margin * 100)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

/**
 * Helper component for retention cell coloring
 */
const RetentionCell = ({ value, showLabel = false }) => {
  if (value === null || value === undefined || value === 0) {
    return <span className="text-slate-600">--</span>;
  }
  
  // Color based on retention value
  let colorClass = 'text-red-400';
  if (value >= 90) colorClass = 'text-emerald-400';
  else if (value >= 75) colorClass = 'text-green-400';
  else if (value >= 60) colorClass = 'text-amber-400';
  else if (value >= 40) colorClass = 'text-orange-400';
  
  return (
    <span className={colorClass}>
      {value.toFixed(1)}%
    </span>
  );
};

export default AttritionReport;

