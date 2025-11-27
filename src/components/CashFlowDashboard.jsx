/**
 * CashFlow Dashboard
 * 
 * Admin-only dashboard displaying real-time cash flow data:
 * - Bank balances from QuickBooks
 * - Stripe balance (available + pending)
 * - Upcoming billings by time period and cohort
 * 
 * Light theme design matching the financial reports and slides.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCashFlow } from '@/hooks/useCashFlow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ============================================================================
// Icons (inline SVGs for simplicity)
// ============================================================================

const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
);

const DollarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const BankIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M12 2 3 9h18l-9-7z" />
  </svg>
);

const CreditCardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const TrendingUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

// ============================================================================
// Utility Functions
// ============================================================================

const formatCurrency = (amount, options = {}) => {
  const { compact = false, showSign = false } = options;
  
  if (amount === null || amount === undefined) {
    return '—';
  }
  
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: compact ? 0 : 2,
    notation: compact && Math.abs(amount) >= 10000 ? 'compact' : 'standard',
  });
  
  const formatted = formatter.format(Math.abs(amount));
  
  if (showSign && amount !== 0) {
    return amount >= 0 ? `+${formatted}` : `-${formatted}`;
  }
  
  return formatted;
};

const formatRelativeTime = (date) => {
  if (!date) return 'Never';
  
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

// ============================================================================
// Summary Card Component - Light Theme
// ============================================================================

const SummaryCard = ({ title, value, subtitle, icon: Icon, trend, variant = 'default' }) => {
  const variantStyles = {
    default: 'bg-white border-gray-200',
    success: 'bg-emerald-50 border-emerald-200',
    warning: 'bg-amber-50 border-amber-200',
    stripe: 'bg-indigo-50 border-indigo-200',
  };

  const iconBgStyles = {
    default: 'bg-gray-100 text-gray-600',
    success: 'bg-emerald-100 text-emerald-600',
    warning: 'bg-amber-100 text-amber-600',
    stripe: 'bg-indigo-100 text-indigo-600',
  };

  return (
    <Card className={`${variantStyles[variant]} border shadow-sm`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold tracking-tight text-gray-900">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-500">{subtitle}</p>
            )}
            {trend !== undefined && (
              <div className={`flex items-center gap-1 text-xs ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                <TrendingUpIcon />
                <span>{trend >= 0 ? '+' : ''}{trend}% vs last month</span>
              </div>
            )}
          </div>
          {Icon && (
            <div className={`p-3 rounded-lg ${iconBgStyles[variant]}`}>
              <Icon />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Billing Row Component
// ============================================================================

const BillingRow = ({ billing }) => (
  <TableRow className="hover:bg-gray-50 transition-colors">
    <TableCell className="font-medium">
      <div>
        <p className="text-sm text-gray-900">{billing.customer_name || billing.customer_email || 'Unknown'}</p>
        <p className="text-xs text-gray-500">{billing.customer_email}</p>
      </div>
    </TableCell>
    <TableCell>
      <Badge 
        variant="outline" 
        className={billing.cohort === 'towpilot' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-purple-300 bg-purple-50 text-purple-700'}
      >
        {billing.cohort === 'towpilot' ? 'TowPilot' : 'Eqho'}
      </Badge>
    </TableCell>
    <TableCell className="text-right font-mono text-emerald-600 font-medium">
      {formatCurrency(billing.amount)}
    </TableCell>
    <TableCell className="text-right text-gray-500 text-sm">
      {new Date(billing.billing_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })}
    </TableCell>
  </TableRow>
);

// ============================================================================
// Upcoming Billings Table Component
// ============================================================================

const UpcomingBillingsSection = ({ billings }) => {
  const [activeTab, setActiveTab] = useState('today');
  
  const tabs = [
    { id: 'today', label: 'Today', data: billings?.today },
    { id: 'tomorrow', label: 'Tomorrow', data: billings?.tomorrow },
    { id: 'week', label: 'This Week', data: billings?.this_week },
    { id: 'month', label: 'This Month', data: billings?.this_month },
  ];

  const activeData = tabs.find(t => t.id === activeTab)?.data;

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 rounded">
                <CalendarIcon />
              </div>
              Upcoming Billings
            </CardTitle>
            <CardDescription className="text-gray-500">
              Expected subscription renewals
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            {billings?.by_cohort && (
              <div className="text-right text-sm">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-blue-600 font-medium">TowPilot:</span>
                    <span className="ml-2 font-mono text-gray-900">
                      {formatCurrency(billings.by_cohort.towpilot?.month || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-purple-600 font-medium">Eqho:</span>
                    <span className="ml-2 font-mono text-gray-900">
                      {formatCurrency(billings.by_cohort.eqho?.month || 0)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-gray-100 border border-gray-200">
            {tabs.map(tab => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
              >
                <span>{tab.label}</span>
                <Badge variant="secondary" className="ml-2 bg-gray-200 text-gray-700 text-xs">
                  {formatCurrency(tab.data?.amount || 0, { compact: true })}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
          
          {tabs.map(tab => (
            <TabsContent key={tab.id} value={tab.id} className="mt-4">
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 border-gray-200 hover:bg-gray-50">
                      <TableHead className="text-gray-600 font-semibold">Customer</TableHead>
                      <TableHead className="text-gray-600 font-semibold">Cohort</TableHead>
                      <TableHead className="text-gray-600 font-semibold text-right">Amount</TableHead>
                      <TableHead className="text-gray-600 font-semibold text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeData?.details?.length > 0 ? (
                      activeData.details.map((billing, idx) => (
                        <BillingRow key={idx} billing={billing} />
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                          No billings scheduled for this period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
                <span>{activeData?.count || 0} subscriptions</span>
                <span className="font-mono text-emerald-600 font-medium">
                  Total: {formatCurrency(activeData?.amount || 0)}
                </span>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Balance Details Card
// ============================================================================

const BalanceDetailsCard = ({ bankBalances, stripeBalance }) => {
  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
          <div className="p-1.5 bg-emerald-100 rounded">
            <BankIcon />
          </div>
          Balance Details
        </CardTitle>
        <CardDescription className="text-gray-500">
          Breakdown by account and source
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* QuickBooks Section */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            QuickBooks
            {!bankBalances?.is_configured && (
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-xs">
                Not Connected
              </Badge>
            )}
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-gray-600 text-sm">Checking</span>
              <span className="font-mono text-gray-900 font-medium">
                {formatCurrency(bankBalances?.checking || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-gray-600 text-sm">Savings</span>
              <span className="font-mono text-gray-900 font-medium">
                {formatCurrency(bankBalances?.savings || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-gray-600 text-sm">Accounts Receivable</span>
              <span className="font-mono text-emerald-600 font-medium">
                {formatCurrency(bankBalances?.accounts_receivable || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-gray-600 text-sm">Accounts Payable</span>
              <span className="font-mono text-red-600 font-medium">
                ({formatCurrency(bankBalances?.accounts_payable || 0)})
              </span>
            </div>
          </div>
        </div>

        {/* Stripe Section */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
            Stripe
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-gray-600 text-sm">Available</span>
              <span className="font-mono text-emerald-600 font-medium">
                {formatCurrency(stripeBalance?.available || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-gray-600 text-sm">Pending</span>
              <span className="font-mono text-amber-600 font-medium">
                {formatCurrency(stripeBalance?.pending || 0)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Main CashFlow Dashboard Component
// ============================================================================

export const CashFlowDashboard = () => {
  const { isAdmin, user } = useAuth();
  const {
    data,
    loading,
    error,
    lastUpdated,
    isRefreshing,
    bankBalances,
    stripeBalance,
    upcomingBillings,
    totals,
    refresh,
    isCached,
  } = useCashFlow({ autoRefresh: true });

  // Admin gate
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="bg-white border border-gray-200 shadow-sm max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-500 mb-4">
              This dashboard is restricted to administrators only.
            </p>
            <Button variant="outline" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading cash flow data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="bg-white border border-gray-200 shadow-sm max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h2>
            <p className="text-gray-500 mb-4">{error.message}</p>
            <Button onClick={refresh}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Cash Flow Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Real-time financial overview for {user?.email}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {isCached && (
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                  Cached Data
                </Badge>
              )}
              <div className="text-right text-sm">
                <p className="text-gray-400">Last updated</p>
                <p className="text-gray-700 font-medium">{formatRelativeTime(lastUpdated)}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                disabled={isRefreshing}
                className="border-gray-300 hover:bg-gray-50"
              >
                <span className={isRefreshing ? 'animate-spin' : ''}>
                  <RefreshIcon />
                </span>
                <span className="ml-2">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
              </Button>
              <Link to="/admin/integrations">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-300 hover:bg-gray-50"
                >
                  <SettingsIcon />
                  <span className="ml-2">Integrations</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SummaryCard
            title="Total Cash Available"
            value={formatCurrency(totals?.total_cash_available || 0)}
            subtitle="Bank + Stripe available"
            icon={DollarIcon}
            variant="success"
          />
          <SummaryCard
            title="Stripe Balance"
            value={formatCurrency(stripeBalance?.total || 0)}
            subtitle={`${formatCurrency(stripeBalance?.pending || 0)} pending`}
            icon={CreditCardIcon}
            variant="stripe"
          />
          <SummaryCard
            title="Expected This Week"
            value={formatCurrency(upcomingBillings?.this_week?.amount || 0)}
            subtitle={`${upcomingBillings?.this_week?.count || 0} renewals`}
            icon={CalendarIcon}
          />
          <SummaryCard
            title="Expected This Month"
            value={formatCurrency(upcomingBillings?.this_month?.amount || 0)}
            subtitle={`${upcomingBillings?.this_month?.count || 0} renewals`}
            icon={TrendingUpIcon}
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Billings - Takes 2 columns */}
          <div className="lg:col-span-2">
            <UpcomingBillingsSection billings={upcomingBillings} />
          </div>

          {/* Balance Details - Takes 1 column */}
          <div>
            <BalanceDetailsCard 
              bankBalances={bankBalances} 
              stripeBalance={stripeBalance}
            />
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div className="flex items-center gap-4">
              <span>Data sources: QuickBooks, Stripe</span>
              {bankBalances?.is_cached && (
                <Badge variant="outline" className="border-gray-300 text-gray-500 text-xs">
                  QB: Cached
                </Badge>
              )}
            </div>
            <span>Auto-refreshes every 5 minutes</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CashFlowDashboard;
