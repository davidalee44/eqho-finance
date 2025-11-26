/**
 * PLDrillDown - Profit & Loss drill-down component
 * 
 * Displays P&L data with expandable line items.
 * Similar pattern to MRRMetrics drill-down capability.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  DollarSign,
  ExternalLink,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useProfitLoss } from '@/hooks/useProfitLoss';
import { DataTimestamp } from '@/components/DataTimestamp';

/**
 * Format currency value
 */
const formatCurrency = (amount) => {
  if (amount == null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format currency in K notation
 */
const formatCurrencyK = (amount) => {
  if (amount == null) return 'N/A';
  if (Math.abs(amount) >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return formatCurrency(amount);
};

/**
 * PLDrillDown component
 * 
 * @param {Object} props
 * @param {boolean} props.investorMode - Hide error messages in investor presentations
 * @param {boolean} props.showDrillDown - Show expandable details (default: true)
 * @param {boolean} props.compact - Use compact display mode
 */
export function PLDrillDown({ investorMode = false, showDrillDown = true, compact = false }) {
  const { data, loading, error, timestamp, isCached, isHardcoded, refresh, source } = useProfitLoss();
  const [expandedSection, setExpandedSection] = useState(null);

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Profit & Loss Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
          Loading P&L data...
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    if (investorMode) return null;
    return (
      <Card className="border-amber-200">
        <CardContent className="p-6 text-center text-amber-700">
          <AlertCircle className="h-4 w-4 mx-auto mb-2" />
          <p className="text-sm">P&L data unavailable</p>
          <Button onClick={refresh} variant="outline" size="sm" className="mt-2">
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const grossMargin = data.total_revenue > 0 
    ? (data.gross_profit / data.total_revenue * 100).toFixed(1) 
    : 0;
  const netMargin = data.total_revenue > 0 
    ? (data.net_income / data.total_revenue * 100).toFixed(1) 
    : 0;

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">YTD Revenue</span>
          <span className="font-semibold">{formatCurrencyK(data.total_revenue)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Gross Profit</span>
          <span className="font-semibold text-green-600">{formatCurrencyK(data.gross_profit)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Net Income</span>
          <span className={`font-semibold ${data.net_income >= 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
            {formatCurrencyK(data.net_income)}
          </span>
        </div>
        {isHardcoded && !investorMode && (
          <p className="text-xs text-amber-600 mt-2">
            Using reference data - Connect QuickBooks for live data
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Profit & Loss Summary</CardTitle>
              <CardDescription className="text-xs">
                {isHardcoded && !investorMode ? (
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertCircle className="h-3 w-3" />
                    Reference data - Connect QuickBooks for live data
                  </span>
                ) : (
                  <DataTimestamp
                    timestamp={timestamp}
                    source={source === 'quickbooks' ? 'QuickBooks' : 'Cache'}
                    isCached={isCached}
                    onRefresh={refresh}
                  />
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {source === 'quickbooks' && (
                <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                  Live
                </Badge>
              )}
              {isCached && !investorMode && (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                  Cached
                </Badge>
              )}
              {isHardcoded && !investorMode && (
                <Badge variant="outline" className="text-xs text-gray-500 border-gray-300">
                  Reference
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="p-3 bg-blue-50 rounded-lg text-center">
              <p className="text-xs text-blue-700 mb-1">Revenue</p>
              <p className="text-xl font-bold text-blue-900">{formatCurrencyK(data.total_revenue)}</p>
              <p className="text-xs text-blue-600">{data.period || 'YTD'}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg text-center">
              <p className="text-xs text-green-700 mb-1">Gross Profit</p>
              <p className="text-xl font-bold text-green-900">{formatCurrencyK(data.gross_profit)}</p>
              <p className="text-xs text-green-600">{grossMargin}% margin</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg text-center">
              <p className="text-xs text-orange-700 mb-1">Expenses</p>
              <p className="text-xl font-bold text-orange-900">{formatCurrencyK(data.total_expenses)}</p>
              <p className="text-xs text-orange-600">Operating</p>
            </div>
            <div className={`p-3 rounded-lg text-center ${data.net_income >= 0 ? 'bg-green-50' : 'bg-gray-50'}`}>
              <p className={`text-xs mb-1 ${data.net_income >= 0 ? 'text-green-700' : 'text-muted-foreground'}`}>
                Net Income
              </p>
              <p className={`text-xl font-bold ${data.net_income >= 0 ? 'text-green-900' : 'text-muted-foreground'}`}>
                {formatCurrencyK(data.net_income)}
              </p>
              <p className={`text-xs ${data.net_income >= 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                {data.net_income >= 0 ? `${netMargin}% margin` : 'Pre-investment'}
              </p>
            </div>
          </div>

          {/* Drill-down sections */}
          {showDrillDown && data.line_items && (
            <div className="space-y-2 mt-4 pt-4 border-t">
              {/* Revenue Drill-Down */}
              {data.line_items.revenue && data.line_items.revenue.length > 0 && (
                <div>
                  <button
                    onClick={() => toggleSection('revenue')}
                    className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Revenue Breakdown</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{data.line_items.revenue.length} items</span>
                      {expandedSection === 'revenue' ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </button>
                  {expandedSection === 'revenue' && (
                    <div className="mt-2 max-h-48 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Item</TableHead>
                            <TableHead className="text-xs text-right">Amount</TableHead>
                            <TableHead className="text-xs text-right">%</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.line_items.revenue.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-xs">{item.name}</TableCell>
                              <TableCell className="text-xs text-right font-mono">
                                {formatCurrency(item.value)}
                              </TableCell>
                              <TableCell className="text-xs text-right text-muted-foreground">
                                {data.total_revenue > 0 
                                  ? ((item.value / data.total_revenue) * 100).toFixed(1)
                                  : 0}%
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}

              {/* COGS Drill-Down */}
              {data.line_items.cogs && data.line_items.cogs.length > 0 && (
                <div>
                  <button
                    onClick={() => toggleSection('cogs')}
                    className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-amber-600" />
                      <span className="font-medium">Cost of Goods Sold</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{data.line_items.cogs.length} items</span>
                      {expandedSection === 'cogs' ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </button>
                  {expandedSection === 'cogs' && (
                    <div className="mt-2 max-h-48 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Item</TableHead>
                            <TableHead className="text-xs text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.line_items.cogs.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-xs">{item.name}</TableCell>
                              <TableCell className="text-xs text-right font-mono">
                                {formatCurrency(item.value)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}

              {/* Expenses Drill-Down */}
              {data.line_items.expenses && data.line_items.expenses.length > 0 && (
                <div>
                  <button
                    onClick={() => toggleSection('expenses')}
                    className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      <span className="font-medium">Operating Expenses</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{data.line_items.expenses.length} items</span>
                      {expandedSection === 'expenses' ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </button>
                  {expandedSection === 'expenses' && (
                    <div className="mt-2 max-h-48 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Item</TableHead>
                            <TableHead className="text-xs text-right">Amount</TableHead>
                            <TableHead className="text-xs text-right">% of OpEx</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.line_items.expenses.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-xs">{item.name}</TableCell>
                              <TableCell className="text-xs text-right font-mono">
                                {formatCurrency(item.value)}
                              </TableCell>
                              <TableCell className="text-xs text-right text-muted-foreground">
                                {data.total_expenses > 0 
                                  ? ((item.value / data.total_expenses) * 100).toFixed(1)
                                  : 0}%
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* QuickBooks Link */}
          {source === 'quickbooks' && (
            <div className="mt-4 pt-4 border-t">
              <a
                href="https://app.qbo.intuit.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                View in QuickBooks
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PLDrillDown;

