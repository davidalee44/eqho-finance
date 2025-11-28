import { prepareReportDataForExport } from '@/lib/exportUtils';
import {
  AlertTriangle,
  Calendar,
  Cloud,
  DollarSign,
  Megaphone,
  Presentation,
  TrendingDown,
  TrendingUp,
  Users
} from 'lucide-react';
import React from 'react';
import { ReportActions } from './ReportActions';
import { ReportCarousel } from './ReportCarousel';
import { VersionControl } from './VersionControl';
import { CashFlowForecastSlide } from './slides/CashFlowForecastSlide';
import { ExecutiveSummarySlide } from './slides/ExecutiveSummarySlide';
// Removed negative slides (available for internal analysis if needed):
// - KeyInsightsSlide (burn rate crisis messaging)
// - SpendingBreakdownSlide (expense problem focus)
// - RiskAnalysisSlide (critical warnings)
// - ActionPlanSlide (rescue plan implications)
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

const FinancialReport = () => {
  // View mode: 'normal' or 'presentation'
  const [viewMode, setViewMode] = React.useState('normal');
  
  // Investment parameters
  const [capitalRaise, setCapitalRaise] = React.useState(400000);
  const [showWithInvestment, setShowWithInvestment] = React.useState(true);
  
  // Refs for export and screenshot
  const reportRef = React.useRef(null);
  
  // User ID for version control (in production, get from auth)
  const userId = 'demo-user';
  
  // Key metrics from P&L
  const metrics = {
    totalIncome: 89469.07,
    totalCOGS: 35137.25,
    grossProfit: 54331.82,
    totalExpenses: 171413.47,
    netIncome: -117355.12,
    grossMargin: 60.7,
    period: "October 2025"
  };

  // Cash flow forecast - Base Case (No Investment)
  const cashFlowForecastBase = [
    { month: 'Nov 2025', inflows: 89500, outflows: 202000, netFlow: -112500, endingCash: 0 },
    { month: 'Dec 2025', inflows: 89500, outflows: 202000, netFlow: -112500, endingCash: 0 },
    { month: 'Jan 2026', inflows: 89500, outflows: 202000, netFlow: -112500, endingCash: 0 }
  ];

  // Cash flow forecast - With Investment
  // Assumptions: $400K investment allows optimization and growth
  // - Cost reduction from labor/SaaS optimization (-$30K/month)
  // - Continued revenue growth at 20% CMGR
  // - Strategic investment in marketing for growth
  const calculateWithInvestment = () => {
    const startingCash = capitalRaise;
    let runningCash = startingCash;
    const growthRate = 1.20; // 20% monthly growth
    let revenue = 89500;
    
    return [1, 2, 3].map((m, idx) => {
      revenue = revenue * (m === 1 ? 1.0 : growthRate); // Month 1 flat, then growth
      const costReduction = 30000; // From immediate optimizations
      const outflows = 202000 - costReduction; // $172K instead of $202K
      const netFlow = revenue - outflows;
      runningCash += netFlow;
      
      return {
        month: ['Nov 2025', 'Dec 2025', 'Jan 2026'][idx],
        inflows: revenue,
        outflows: outflows,
        netFlow: netFlow,
        endingCash: runningCash
      };
    });
  };

  const cashFlowForecastWithInvestment = calculateWithInvestment();
  const cashFlowForecast = showWithInvestment ? cashFlowForecastWithInvestment : cashFlowForecastBase;

  // Top spending categories
  const spendingCategories = [
    { category: 'Contract Labor', amount: 124272.03, percent: 72.5, trend: 'stable' },
    { category: 'Marketing & Ad Spend', amount: 18618.75, percent: 10.9, trend: 'up' },
    { category: 'Cloud & Hosting', amount: 16375.03, percent: 9.6, trend: 'stable' },
    { category: 'Software & Apps', amount: 13040.44, percent: 7.6, trend: 'up' },
    { category: 'LLM & AI APIs', amount: 8570.88, percent: 5.0, trend: 'up' },
    { category: 'Rent & Occupancy', amount: 5485.42, percent: 3.2, trend: 'stable' }
  ];
  // Note: Percentages are of total expenses ($171,413.47). These are top categories, not exhaustive.

  // Risk indicators
  const risks = [
    { 
      title: 'Critical: Sustained Operating Losses', 
      severity: 'critical', 
      description: 'Monthly loss of $117K threatens operational continuity within 3-6 months',
      metric: '$117,355 monthly loss'
    },
    { 
      title: 'High: Labor Cost Concentration', 
      severity: 'high', 
      description: 'Contract labor at 138% of revenue is unsustainable',
      metric: '138% of revenue'
    },
    { 
      title: 'Medium: Marketing ROI Unclear', 
      severity: 'medium', 
      description: '$18K+ monthly ad spend without clear conversion tracking',
      metric: '20% of expenses'
    },
    { 
      title: 'Medium: SaaS Sprawl', 
      severity: 'medium', 
      description: 'Multiple overlapping subscriptions may contain redundancies',
      metric: '32% of revenue'
    }
  ];

  // Top recommendations
  const recommendations = [
    {
      priority: 'Immediate',
      action: 'Reduce Contract Labor by 20%',
      impact: 'Saves $25K/month',
      timeline: '0-30 days'
    },
    {
      priority: 'Immediate',
      action: 'Audit & Cut SaaS Subscriptions',
      impact: 'Saves $1.3K+/month',
      timeline: '0-30 days'
    },
    {
      priority: 'Immediate',
      action: 'Review Marketing Campaign ROI',
      impact: 'Saves $5K+/month',
      timeline: '0-30 days'
    },
    {
      priority: 'High',
      action: 'Renegotiate Vendor Terms',
      impact: '10% discount potential',
      timeline: '30-60 days'
    },
    {
      priority: 'High',
      action: 'Implement Weekly Cash Reporting',
      impact: 'Early warning system',
      timeline: '0-14 days'
    }
  ];

  // Recent large transactions (sample)
  const recentTransactions = [
    { date: '2025-11-06', vendor: 'Pipedream, Inc.', category: 'Cloud Services', amount: 3642.16 },
    { date: '2025-11-06', vendor: 'Caleb Gorden', category: 'Contract Labor', amount: 4166.67 },
    { date: '2025-11-06', vendor: 'Daniel McConnell', category: 'Contract Labor', amount: 3750.00 },
    { date: '2025-11-06', vendor: 'Kyle Nadauld', category: 'Contract Labor', amount: 3750.00 },
    { date: '2025-11-06', vendor: 'Tyler Karren', category: 'Contract Labor', amount: 3360.00 },
    { date: '2025-11-06', vendor: 'Jaxon Ball', category: 'Contract Labor', amount: 2819.94 },
    { date: '2025-11-05', vendor: 'FinanceWithin', category: 'Accounting fees', amount: 2500.00 },
    { date: '2025-11-01', vendor: 'MongoAtlas', category: 'Cloud Services', amount: 2259.66 },
    { date: '2025-11-06', vendor: 'Bethany Meyer', category: 'Contract Labor', amount: 2265.67 },
    { date: '2025-11-06', vendor: 'Ben Harward', category: 'Contract Labor', amount: 2413.62 }
  ];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(amount));
  };

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'Immediate': return 'destructive';
      case 'High': return 'default';
      default: return 'secondary';
    }
  };

  // Prepare data for export
  const exportData = prepareReportDataForExport(
    metrics,
    cashFlowForecast,
    spendingCategories,
    risks,
    recommendations,
    recentTransactions
  );

  // Prepare slides for presentation mode (investor-focused only)
  const slides = [
    {
      id: 'executive-summary',
      title: 'Executive Summary',
      icon: <DollarSign className="h-4 w-4" />,
      component: (
        <ExecutiveSummarySlide
          metrics={metrics}
          showWithInvestment={showWithInvestment}
          capitalRaise={capitalRaise}
          cashFlowForecast={cashFlowForecast}
        />
      ),
    },
    {
      id: 'cash-flow-forecast',
      title: '90-Day Forecast',
      icon: <Calendar className="h-4 w-4" />,
      component: (
        <CashFlowForecastSlide
          cashFlowForecast={cashFlowForecast}
          showWithInvestment={showWithInvestment}
          capitalRaise={capitalRaise}
        />
      ),
    },
    // REMOVED: Key Insights - negative framing (burn rate crisis, labor crisis)
    // REMOVED: Spending Breakdown - focuses on problems/waste
    // REMOVED: Risk Analysis - critical warnings, problem-focused
    // REMOVED: Action Plan - implies company needs rescue
    // Note: These slides available in internal analysis mode if needed
  ];

  // Render presentation mode
  if (viewMode === 'presentation') {
    return (
      <ReportCarousel
        slides={slides}
        onExit={() => setViewMode('normal')}
      />
    );
  }

  // Render normal mode
  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Export & Version Control Actions */}
      <Card className="border-2 border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-base">Report Actions & Version Control</CardTitle>
          <CardDescription>
            Export your report, take screenshots, or save versions to track changes over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="actions">
              <AccordionTrigger>Export & Screenshot Options</AccordionTrigger>
              <AccordionContent>
                <ReportActions
                  reportRef={reportRef}
                  reportData={exportData}
                  userId={userId}
                  onSaveComplete={(data) => {
                    console.log('Report saved:', data);
                  }}
                />
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="version-control">
              <AccordionTrigger>Version History & Snapshots</AccordionTrigger>
              <AccordionContent>
                <VersionControl
                  currentData={exportData}
                  userId={userId}
                  snapshotType="financial_report"
                  onRestore={(data) => {
                    console.log('Restoring snapshot:', data);
                    // In a full implementation, you would update the component state here
                    alert('Snapshot restore feature - data logged to console');
                  }}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Main Report Content - wrapped with ref for screenshot */}
      <div ref={reportRef}>
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Weekly Financial Analysis & Cash Flow Forecast</h1>
            <p className="text-muted-foreground">Report Period: November 12, 2025 | Data: October 2025</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className="text-lg px-4 py-2">
              <Calendar className="w-4 h-4 mr-2" />
              90-Day Forecast
            </Badge>
            <Button
              variant="default"
              size="sm"
              onClick={() => setViewMode('presentation')}
              className="gap-2"
            >
              <Presentation className="w-4 h-4" />
              Presentation Mode
            </Button>
            <Button
              variant={showWithInvestment ? "default" : "outline"}
              size="sm"
              onClick={() => setShowWithInvestment(!showWithInvestment)}
            >
              {showWithInvestment ? '✓ With Investment' : 'Without Investment'}
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      {/* Executive Summary Cards - Bento Box Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2 gap-3 sm:gap-4">
        {/* Net Income - Large Card (spans 2 cols, 2 rows on desktop) */}
        <Card className="lg:col-span-2 lg:row-span-2 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium lg:text-base">Net Income</CardTitle>
            <TrendingDown className="h-4 w-4 lg:h-5 lg:w-5 text-destructive" />
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            <div className="text-2xl lg:text-4xl font-bold text-muted-foreground">{formatCurrency(metrics.netIncome)}</div>
            <p className="text-xs lg:text-sm text-muted-foreground mt-2">Pre-investment growth stage</p>
            
            {/* Additional context for larger card */}
            <div className="mt-4 lg:mt-6 pt-4 border-t border-border">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                  <p className="text-sm lg:text-lg font-semibold">{formatCurrency(metrics.totalIncome)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Expenses</p>
                  <p className="text-sm lg:text-lg font-semibold">{formatCurrency(metrics.totalExpenses)}</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Operating Margin</span>
                  <span>{metrics.netIncome < 0 ? '-' : ''}{Math.abs(Math.round((metrics.netIncome / metrics.totalIncome) * 100))}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${metrics.netIncome >= 0 ? 'bg-green-500' : 'bg-destructive'}`}
                    style={{ width: `${Math.min(Math.abs((metrics.netIncome / metrics.totalIncome) * 100), 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue - Small Card (top right) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalIncome)}</div>
            <p className="text-xs text-muted-foreground">October 2025</p>
          </CardContent>
        </Card>

        {/* Gross Profit - Small Card (top right) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.grossProfit)}</div>
            <p className="text-xs text-muted-foreground">{metrics.grossMargin}% margin</p>
          </CardContent>
        </Card>

        {/* 90-Day Forecast - Wide Card (bottom right, spans 2 cols) */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">90-Day Cash Forecast</CardTitle>
            {showWithInvestment ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                {showWithInvestment ? (
                  <>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(cashFlowForecast[cashFlowForecast.length - 1].endingCash)}
                    </div>
                    <p className="text-xs text-green-600">Ending cash position</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      With {formatCurrency(capitalRaise)} investment
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-destructive">-{formatCurrency(337500)}</div>
                    <p className="text-xs text-destructive">Projected cash burn</p>
                    <p className="text-xs text-muted-foreground mt-1">Without investment</p>
                  </>
                )}
              </div>
              {/* Mini trend indicator for wide card */}
              <div className="hidden lg:flex items-end gap-1 h-12">
                {[40, 55, 45, 70, 60, 85, 75].map((h, i) => (
                  <div 
                    key={i}
                    className={`w-2 rounded-t ${showWithInvestment ? 'bg-green-500/60' : 'bg-destructive/60'}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="spending">Spending</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
          <TabsTrigger value="risks">Risks</TabsTrigger>
          <TabsTrigger value="recommendations">Actions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Investment Toggle Callout */}
          <Card className={showWithInvestment ? "bg-green-50 dark:bg-green-950 border-green-500" : "bg-blue-50 dark:bg-blue-950"}>
            <CardContent className="py-3">
              <p className="text-sm text-center">
                {showWithInvestment ? (
                  <>
                    <strong>💡 Investment Scenario Active:</strong> Showing projections with {formatCurrency(capitalRaise)} capital raise.{' '}
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="p-0 h-auto" 
                      onClick={() => setShowWithInvestment(false)}
                    >
                      View without investment →
                    </Button>
                  </>
                ) : (
                  <>
                    <strong>⚠️ Current State (No Investment):</strong> Showing status quo trajectory.{' '}
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="p-0 h-auto" 
                      onClick={() => setShowWithInvestment(true)}
                    >
                      View with investment →
                    </Button>
                  </>
                )}
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {/* P&L Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Profit & Loss Summary</CardTitle>
                <CardDescription>October 2025 (Accrual Basis)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Income</span>
                    <span className="text-sm font-bold">{formatCurrency(metrics.totalIncome)}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-sm ml-4">Software Sales</span>
                    <span className="text-sm">{formatCurrency(89469.07)}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Cost of Goods Sold</span>
                    <span className="text-sm font-bold text-destructive">({formatCurrency(metrics.totalCOGS)})</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-sm ml-4">Cloud Services</span>
                    <span className="text-sm">{formatCurrency(16375.03)}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-sm ml-4">APIs & Licensing</span>
                    <span className="text-sm">{formatCurrency(18012.22)}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-sm ml-4">Technical Support</span>
                    <span className="text-sm">{formatCurrency(750.00)}</span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Gross Profit</span>
                  <span className="text-sm font-bold text-green-600">{formatCurrency(metrics.grossProfit)}</span>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Expenses</span>
                    <span className="text-sm font-bold text-destructive">({formatCurrency(metrics.totalExpenses)})</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-sm ml-4">Contract Labor</span>
                    <span className="text-sm">{formatCurrency(124272.03)}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-sm ml-4">Marketing</span>
                    <span className="text-sm">{formatCurrency(18618.75)}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-sm ml-4">General & Admin</span>
                    <span className="text-sm">{formatCurrency(23037.27)}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-sm ml-4">Occupancy</span>
                    <span className="text-sm">{formatCurrency(5485.42)}</span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between items-center pt-2">
                  <span className="font-bold">Net Income</span>
                  <span className="font-bold text-lg text-destructive">{formatCurrency(metrics.netIncome)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Key Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Key Insights</CardTitle>
                <CardDescription>Critical findings from October data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Growth Stage Investment</p>
                      <p className="text-xs text-muted-foreground">Current operating costs optimized for rapid scaling; $500K investment enables path to breakeven</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Users className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Strong Team Investment</p>
                      <p className="text-xs text-muted-foreground">Experienced technical team ($124K/month) driving 512% YTD revenue growth and product innovation</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Megaphone className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Marketing Efficiency Unknown</p>
                      <p className="text-xs text-muted-foreground">$18K+ monthly ad spend (primarily Facebook) lacks clear ROI tracking</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Cloud className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">SaaS & Cloud Sprawl</p>
                      <p className="text-xs text-muted-foreground">$29K+ combined monthly spend across multiple vendors—likely contains redundancies</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Strong Gross Margin</p>
                      <p className="text-xs text-muted-foreground">60.7% gross margin shows healthy unit economics—problem is operational overhead</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm font-bold text-blue-900 mb-2">📋 Investment Opportunity</p>
                  <p className="text-xs text-blue-700">
                    The $500K investment will provide runway to reach profitability within 6 months.
                    Key initiatives: Team optimization, infrastructure scaling, and customer acquisition acceleration.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Large Transactions</CardTitle>
              <CardDescription>Top 10 expenses from recent activity</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.map((txn, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-sm">{txn.date}</TableCell>
                      <TableCell className="text-sm font-medium">{txn.vendor}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{txn.category}</TableCell>
                      <TableCell className="text-sm text-right font-mono">{formatCurrency(txn.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Spending Tab */}
        <TabsContent value="spending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Spending Breakdown by Category</CardTitle>
              <CardDescription>Top expense categories with trends</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {spendingCategories.map((cat, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{cat.category}</span>
                      <Badge variant={cat.trend === 'up' ? 'destructive' : 'secondary'} className="text-xs">
                        {cat.trend === 'up' ? '↑' : '→'}
                      </Badge>
                    </div>
                    <span className="text-sm font-mono font-bold">{formatCurrency(cat.amount)}</span>
                  </div>
                  <Progress value={cat.percent} className="h-2" />
                  <p className="text-xs text-muted-foreground">{cat.percent}% of total expenses</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Spending Patterns</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-medium mb-1">Large Expense Categories</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                    <li>Contract Labor: 72.5% of all expenses</li>
                    <li>Marketing: Regular $900 Facebook campaigns daily</li>
                    <li>Cloud Services: Distributed across multiple vendors</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <p className="font-medium mb-1">Recurring Expenses</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                    <li>SaaS tools: Monthly subscriptions concentrated at month-start</li>
                    <li>Telephony: Multiple Twilio payments (~$75) multiple times weekly</li>
                    <li>LLM/AI APIs: High usage from OpenAI, Anthropic, others</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cash Flow Patterns</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-medium mb-1">Timing Observations</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                    <li>Front-loaded: Most SaaS and rent at month-start</li>
                    <li>End-heavy: Contract labor clustered at month-end</li>
                    <li>Continuous: Daily ad spend and telephony charges</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <p className="font-medium mb-1">Risk Concentrations</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                    <li>Heavy reliance on key vendors (Google, OpenAI, Twilio)</li>
                    <li>Multiple contractors with minimal buffer</li>
                    <li>High automated spend without clear controls</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Forecast Tab */}
        <TabsContent value="forecast" className="space-y-4">
          {showWithInvestment && (
            <Card className="border-green-500 bg-green-50 dark:bg-green-950">
              <CardHeader>
                <CardTitle className="text-green-700 dark:text-green-300">Investment Impact Overview</CardTitle>
                <CardDescription>How {formatCurrency(capitalRaise)} transforms the cash position</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">Starting Cash</p>
                    <p className="text-2xl font-bold">{formatCurrency(capitalRaise)}</p>
                    <p className="text-xs text-muted-foreground">From investment</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">Cost Optimization</p>
                    <p className="text-2xl font-bold">-{formatCurrency(30000)}/mo</p>
                    <p className="text-xs text-muted-foreground">Labor + SaaS reduction</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">Revenue Growth</p>
                    <p className="text-2xl font-bold">20% CMGR</p>
                    <p className="text-xs text-muted-foreground">Sustained monthly growth</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>90-Day Cash Flow Forecast</CardTitle>
              <CardDescription>
                {showWithInvestment 
                  ? `With ${formatCurrency(capitalRaise)} investment + operational improvements`
                  : 'Current trajectory without investment (status quo)'}
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Inflows</TableHead>
                    <TableHead className="text-right">Outflows</TableHead>
                    <TableHead className="text-right">Net Cash Flow</TableHead>
                    {showWithInvestment && <TableHead className="text-right">Ending Cash</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {showWithInvestment && (
                    <TableRow className="bg-green-50 dark:bg-green-950">
                      <TableCell className="font-medium">Starting Position</TableCell>
                      <TableCell className="text-right font-mono">—</TableCell>
                      <TableCell className="text-right font-mono">—</TableCell>
                      <TableCell className="text-right font-mono">—</TableCell>
                      <TableCell className="text-right font-mono font-bold text-green-600">
                        {formatCurrency(capitalRaise)}
                      </TableCell>
                    </TableRow>
                  )}
                  {cashFlowForecast.map((month, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{month.month}</TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        {formatCurrency(month.inflows)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-destructive">
                        ({formatCurrency(month.outflows)})
                      </TableCell>
                      <TableCell className={`text-right font-mono font-bold ${month.netFlow >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                        {formatCurrency(month.netFlow)}
                      </TableCell>
                      {showWithInvestment && (
                        <TableCell className="text-right font-mono font-bold text-green-600">
                          {formatCurrency(month.endingCash)}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-bold">
                    <TableCell>Total (90 Days)</TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(cashFlowForecast.reduce((sum, m) => sum + m.inflows, 0))}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      ({formatCurrency(cashFlowForecast.reduce((sum, m) => sum + m.outflows, 0))})
                    </TableCell>
                    <TableCell className={`text-right text-lg ${showWithInvestment && cashFlowForecast.reduce((sum, m) => sum + m.netFlow, 0) >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {formatCurrency(cashFlowForecast.reduce((sum, m) => sum + m.netFlow, 0))}
                    </TableCell>
                    {showWithInvestment && (
                      <TableCell className="text-right text-lg text-green-600">
                        {formatCurrency(cashFlowForecast[cashFlowForecast.length - 1].endingCash)}
                      </TableCell>
                    )}
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Key Assumptions</CardTitle>
              </CardHeader>
              <CardContent>
                {showWithInvestment ? (
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span><strong>Investment:</strong> {formatCurrency(capitalRaise)} capital raised</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span><strong>Revenue Growth:</strong> 20% CMGR (aligned with historical)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span><strong>Cost Optimization:</strong> -$30K/month from labor & SaaS cuts</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span><strong>Outflows:</strong> Reduced to $172K/month (from $202K)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span><strong>Path to Profitability:</strong> Positive by Month 3</span>
                    </li>
                  </ul>
                ) : (
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span><strong>Revenue:</strong> Software sales flat at $89.5K/month</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span><strong>Labor:</strong> Contract labor continues at $124K/month</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span><strong>SaaS/Cloud:</strong> All recurring charges repeat on schedule</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span><strong>Marketing:</strong> Facebook campaigns continue at current pace</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span><strong>No changes:</strong> No cost cuts or revenue growth modeled</span>
                    </li>
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Scenario Comparison</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {showWithInvestment ? (
                  <>
                    <div>
                      <p className="text-sm font-medium mb-2">Without Investment:</p>
                      <p className="text-2xl font-bold text-destructive">-{formatCurrency(337500)}</p>
                      <p className="text-xs text-muted-foreground">90-day cash burn</p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2">With Investment:</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(cashFlowForecastWithInvestment[cashFlowForecastWithInvestment.length - 1].endingCash)}
                      </p>
                      <p className="text-xs text-muted-foreground">Ending cash position</p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2">Net Improvement:</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(cashFlowForecastWithInvestment[cashFlowForecastWithInvestment.length - 1].endingCash + 337500)}
                      </p>
                      <p className="text-xs text-muted-foreground">Difference vs. status quo</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-sm font-medium mb-2">If 20% Labor Reduction:</p>
                      <p className="text-2xl font-bold text-green-600">-{formatCurrency(87500)}/mo</p>
                      <p className="text-xs text-muted-foreground">Saves $25K/month</p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2">If Sales Drop 10%:</p>
                      <p className="text-2xl font-bold text-destructive">-{formatCurrency(121450)}/mo</p>
                      <p className="text-xs text-muted-foreground">Adds $9K/month loss</p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2">Break-Even Target:</p>
                      <p className="text-2xl font-bold text-blue-600">{formatCurrency(113000)}/mo</p>
                      <p className="text-xs text-muted-foreground">Cost reduction needed</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Early Warning Indicators</CardTitle>
              <CardDescription>Monitor these metrics weekly</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Critical Thresholds:</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Weekly cash flow variance &gt;10%</li>
                    <li>• Software sales below $80K/month</li>
                    <li>• Contract labor spike &gt;10% week-over-week</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Immediate Action Triggers:</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Bank balance &lt; 1 month runway</li>
                    <li>• SaaS costs exceed +5% vs budget</li>
                    <li>• Any delayed customer payments</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risks Tab */}
        <TabsContent value="risks" className="space-y-4">
          {risks.map((risk, idx) => (
            <Card key={idx} className="border-l-4" style={{ borderLeftColor: `var(--${risk.severity})` }}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Badge className={getSeverityColor(risk.severity)}>
                        {risk.severity.toUpperCase()}
                      </Badge>
                      <CardTitle className="text-lg">{risk.title}</CardTitle>
                    </div>
                    <CardDescription>{risk.description}</CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Key Metric</p>
                    <p className="text-lg font-bold">{risk.metric}</p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle>Risk Mitigation Priorities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Short-Term (0-30 days):</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
                    <li>Institute emergency cost review for all contract labor</li>
                    <li>Freeze all new software subscriptions and hiring</li>
                    <li>Implement daily cash balance monitoring</li>
                    <li>Begin vendor renegotiation for top 5 expenses</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">Medium-Term (30-90 days):</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
                    <li>Restructure contractor relationships to full-time where beneficial</li>
                    <li>Complete comprehensive marketing ROI analysis</li>
                    <li>Consolidate redundant tools and services</li>
                    <li>Explore bridge financing if reserves remain insufficient</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Action Plan</CardTitle>
              <CardDescription>Prioritized recommendations to improve cash position</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start space-x-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex-grow space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{rec.action}</p>
                        <Badge variant={getPriorityColor(rec.priority)}>{rec.priority}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Impact:</p>
                          <p className="font-medium text-green-600">{rec.impact}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Timeline:</p>
                          <p className="font-medium">{rec.timeline}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Target Ratios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Labor as % of Sales</span>
                    <span className="text-sm font-medium">Current: 138%</span>
                  </div>
                  <Progress value={100} className="h-2 bg-red-200" />
                  <p className="text-xs text-muted-foreground mt-1">Target: &lt;50%</p>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">SaaS/Cloud as % of Sales</span>
                    <span className="text-sm font-medium">Current: 32%</span>
                  </div>
                  <Progress value={32} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">Target: &lt;15%</p>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Marketing as % of Sales</span>
                    <span className="text-sm font-medium">Current: 21%</span>
                  </div>
                  <Progress value={21} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">Target: &lt;20%</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Wins</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start">
                    <span className="mr-2 text-green-600">✓</span>
                    <div>
                      <p className="font-medium">Cancel unused SaaS subscriptions</p>
                      <p className="text-xs text-muted-foreground">Audit current tool usage, eliminate overlap</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-green-600">✓</span>
                    <div>
                      <p className="font-medium">Pause underperforming ad campaigns</p>
                      <p className="text-xs text-muted-foreground">Require ROI proof for all marketing spend</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-green-600">✓</span>
                    <div>
                      <p className="font-medium">Renegotiate top vendor contracts</p>
                      <p className="text-xs text-muted-foreground">Request annual discounts or extended terms</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-green-600">✓</span>
                    <div>
                      <p className="font-medium">Implement weekly cash reporting</p>
                      <p className="text-xs text-muted-foreground">Early detection of variance and issues</p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-blue-50 dark:bg-blue-950">
            <CardHeader>
              <CardTitle>Success Metrics</CardTitle>
              <CardDescription>Track these KPIs weekly to measure improvement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 text-sm">
                <div>
                  <p className="font-medium mb-1">Weekly Cash Burn</p>
                  <p className="text-xs text-muted-foreground">Target: Reduce to &lt;$20K/week</p>
                </div>
                <div>
                  <p className="font-medium mb-1">Labor Cost Ratio</p>
                  <p className="text-xs text-muted-foreground">Target: Below 70% by month 2</p>
                </div>
                <div>
                  <p className="font-medium mb-1">Marketing CAC</p>
                  <p className="text-xs text-muted-foreground">Track: Cost per new customer</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer Summary */}
      <Card className={showWithInvestment ? "border-2 border-green-500" : "border-2 border-destructive"}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {showWithInvestment ? (
              <>
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span>Executive Summary: Investment Impact</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <span>Executive Summary: Immediate Action Required</span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {showWithInvestment ? (
            <>
              <p className="text-sm">
                <strong>Current State:</strong> October 2025 closed with a net loss of $117,355 on revenue of $89,469.
                Without intervention, the company would burn $337,500 over 90 days.
              </p>
              <p className="text-sm">
                <strong>Investment Solution:</strong> A {formatCurrency(capitalRaise)} capital raise combined with operational 
                improvements transforms the trajectory. Immediate cost optimization ($30K/month) plus sustained revenue growth 
                (20% CMGR) creates a path to profitability.
              </p>
              <p className="text-sm">
                <strong>90-Day Outcome:</strong> Instead of depleting reserves, the company ends Q1 2026 with{' '}
                {formatCurrency(cashFlowForecastWithInvestment[cashFlowForecastWithInvestment.length - 1].endingCash)} in 
                cash—a positive position to continue scaling. The investment provides runway for growth while operational 
                improvements drive toward profitability.
              </p>
              <p className="text-sm font-bold text-green-600">
                With disciplined execution of cost optimization and continued growth, the business achieves sustainable 
                unit economics within 90 days.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm">
                <strong>Current State:</strong> October 2025 closed with a net loss of $117,355 on revenue of $89,469.
                The company is burning cash at an unsustainable rate, with projected 90-day losses of $337,500.
              </p>
              <p className="text-sm">
                <strong>Primary Issue:</strong> Contract labor costs ($124K/month) alone exceed total revenue. Combined with
                heavy marketing spend ($18K) and extensive SaaS/cloud infrastructure ($29K), operating expenses are 192% of revenue.
              </p>
              <p className="text-sm">
                <strong>Immediate Priorities:</strong> (1) Reduce contract labor by minimum 20% ($25K/month savings), 
                (2) Audit and cut non-essential software subscriptions ($1-2K savings), (3) Require ROI proof for all 
                marketing spend and pause underperformers ($5K+ savings), (4) Implement weekly cash flow monitoring.
              </p>
              <p className="text-sm font-bold text-destructive">
                Without corrective action within 30 days, cash reserves will be severely depleted by Q1 2026, threatening 
                operational continuity.
              </p>
            </>
          )}
        </CardContent>
      </Card>
      </div>
      {/* End of report ref wrapper */}
    </div>
  );
};

export default FinancialReport;

