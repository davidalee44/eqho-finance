/**
 * CashFlow Dashboard
 * 
 * Admin-only dashboard displaying real-time cash flow data:
 * - Bank balances from QuickBooks
 * - Stripe balance (available + pending)
 * - Upcoming billings by time period and cohort
 * 
 * Designed for investor-ready cash flow analysis.
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

// Icons (inline SVGs for simplicity)
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

/**
 * Format currency for display
 */
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

/**
 * Format relative time
 */
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

/**
 * Summary Card Component
 */
const SummaryCard = ({ title, value, subtitle, icon: Icon, trend, variant = 'default' }) => {
  const variantStyles = {
    default: 'bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700',
    success: 'bg-gradient-to-br from-emerald-950 to-emerald-900 border-emerald-800',
    warning: 'bg-gradient-to-br from-amber-950 to-amber-900 border-amber-800',
    stripe: 'bg-gradient-to-br from-indigo-950 to-indigo-900 border-indigo-800',
  };

  return (
    <Card className={`${variantStyles[variant]} text-white border shadow-lg`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-300">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-slate-400">{subtitle}</p>
            )}
            {trend !== undefined && (
              <div className={`flex items-center gap-1 text-xs ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                <TrendingUpIcon />
                <span>{trend >= 0 ? '+' : ''}{trend}% vs last month</span>
              </div>
            )}
          </div>
          {Icon && (
            <div className="p-3 bg-white/10 rounded-lg">
              <Icon />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Billing Row Component
 */
const BillingRow = ({ billing }) => (
  <TableRow className="hover:bg-slate-800/50 transition-colors">
    <TableCell className="font-medium">
      <div>
        <p className="text-sm">{billing.customer_name || billing.customer_email || 'Unknown'}</p>
        <p className="text-xs text-slate-500">{billing.customer_email}</p>
      </div>
    </TableCell>
    <TableCell>
      <Badge 
        variant="outline" 
        className={billing.cohort === 'towpilot' ? 'border-blue-500 text-blue-400' : 'border-purple-500 text-purple-400'}
      >
        {billing.cohort === 'towpilot' ? 'TowPilot' : 'Eqho'}
      </Badge>
    </TableCell>
    <TableCell className="text-right font-mono text-emerald-400">
      {formatCurrency(billing.amount)}
    </TableCell>
    <TableCell className="text-right text-slate-400 text-sm">
      {new Date(billing.billing_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })}
    </TableCell>
  </TableRow>
);

/**
 * Upcoming Billings Table Component
 */
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
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <CalendarIcon />
              Upcoming Billings
            </CardTitle>
            <CardDescription className="text-slate-400">
              Expected subscription renewals
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            {billings?.by_cohort && (
              <div className="text-right text-sm">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-blue-400">TowPilot:</span>
                    <span className="ml-2 font-mono text-white">
                      {formatCurrency(billings.by_cohort.towpilot?.month || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-purple-400">Eqho:</span>
                    <span className="ml-2 font-mono text-white">
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
          <TabsList className="bg-slate-800 border border-slate-700">
            {tabs.map(tab => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
                className="data-[state=active]:bg-slate-700 data-[state=active]:text-white"
              >
                <span>{tab.label}</span>
                <Badge variant="secondary" className="ml-2 bg-slate-600 text-xs">
                  {formatCurrency(tab.data?.amount || 0, { compact: true })}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
          
          {tabs.map(tab => (
            <TabsContent key={tab.id} value={tab.id} className="mt-4">
              <div className="rounded-lg border border-slate-800 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400">Customer</TableHead>
                      <TableHead className="text-slate-400">Cohort</TableHead>
                      <TableHead className="text-slate-400 text-right">Amount</TableHead>
                      <TableHead className="text-slate-400 text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeData?.details?.length > 0 ? (
                      activeData.details.map((billing, idx) => (
                        <BillingRow key={idx} billing={billing} />
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-slate-500 py-8">
                          No billings scheduled for this period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
                <span>{activeData?.count || 0} subscriptions</span>
                <span className="font-mono text-emerald-400">
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

/**
 * Balance Details Card
 */
const BalanceDetailsCard = ({ bankBalances, stripeBalance }) => {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <BankIcon />
          Balance Details
        </CardTitle>
        <CardDescription className="text-slate-400">
          Breakdown by account and source
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* QuickBooks Section */}
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            QuickBooks
            {!bankBalances?.is_configured && (
              <Badge variant="outline" className="border-amber-500 text-amber-400 text-xs">
                Not Connected
              </Badge>
            )}
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-lg">
              <span className="text-slate-400 text-sm">Checking</span>
              <span className="font-mono text-white">
                {formatCurrency(bankBalances?.checking || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-lg">
              <span className="text-slate-400 text-sm">Savings</span>
              <span className="font-mono text-white">
                {formatCurrency(bankBalances?.savings || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-lg">
              <span className="text-slate-400 text-sm">Accounts Receivable</span>
              <span className="font-mono text-emerald-400">
                {formatCurrency(bankBalances?.accounts_receivable || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-lg">
              <span className="text-slate-400 text-sm">Accounts Payable</span>
              <span className="font-mono text-red-400">
                ({formatCurrency(bankBalances?.accounts_payable || 0)})
              </span>
            </div>
          </div>
        </div>

        {/* Stripe Section */}
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
            Stripe
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-lg">
              <span className="text-slate-400 text-sm">Available</span>
              <span className="font-mono text-emerald-400">
                {formatCurrency(stripeBalance?.available || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-lg">
              <span className="text-slate-400 text-sm">Pending</span>
              <span className="font-mono text-amber-400">
                {formatCurrency(stripeBalance?.pending || 0)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Main CashFlow Dashboard Component
 */
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="bg-slate-900 border-slate-800 max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
            <p className="text-slate-400 mb-4">
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading cash flow data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="bg-slate-900 border-slate-800 max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Error Loading Data</h2>
            <p className="text-slate-400 mb-4">{error.message}</p>
            <Button onClick={refresh}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                Cash Flow Dashboard
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Real-time financial overview for {user?.email}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {isCached && (
                <Badge variant="outline" className="border-amber-500 text-amber-400">
                  Cached Data
                </Badge>
              )}
              <div className="text-right text-sm">
                <p className="text-slate-400">Last updated</p>
                <p className="text-white font-medium">{formatRelativeTime(lastUpdated)}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                disabled={isRefreshing}
                className="border-slate-700 hover:bg-slate-800"
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
                  className="border-slate-700 hover:bg-slate-800"
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
        <div className="mt-8 pt-6 border-t border-slate-800">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <div className="flex items-center gap-4">
              <span>Data sources: QuickBooks, Stripe</span>
              {bankBalances?.is_cached && (
                <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
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

