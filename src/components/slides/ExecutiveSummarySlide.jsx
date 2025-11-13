import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { ReportSlide } from '../ReportSlide';

export const ExecutiveSummarySlide = ({ metrics, showWithInvestment, capitalRaise, cashFlowForecast }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  return (
    <ReportSlide
      title="Executive Summary"
      description={`Financial Overview - ${metrics.period}`}
      variant="primary"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(metrics.totalIncome)}</div>
            <p className="text-sm text-muted-foreground mt-1">{metrics.period}</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Gross Profit</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(metrics.grossProfit)}</div>
            <p className="text-sm text-muted-foreground mt-1">{metrics.grossMargin}% margin</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Net Income</CardTitle>
            <TrendingDown className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{formatCurrency(metrics.netIncome)}</div>
            <p className="text-sm text-destructive mt-1">Critical: 131% loss ratio</p>
          </CardContent>
        </Card>

        <Card className={`border-2 ${showWithInvestment ? 'border-green-500' : 'border-red-200'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">90-Day Forecast</CardTitle>
            {showWithInvestment ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            {showWithInvestment ? (
              <>
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(cashFlowForecast[cashFlowForecast.length - 1].endingCash)}
                </div>
                <p className="text-sm text-green-600 mt-1">Ending cash position</p>
                <p className="text-xs text-muted-foreground mt-1">
                  With {formatCurrency(capitalRaise)} investment
                </p>
              </>
            ) : (
              <>
                <div className="text-3xl font-bold text-destructive">-{formatCurrency(337500)}</div>
                <p className="text-sm text-destructive mt-1">Projected cash burn</p>
                <p className="text-xs text-muted-foreground mt-1">Without investment</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Key Message */}
      <Card className={`mt-6 ${showWithInvestment ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'} border-2`}>
        <CardContent className="py-6">
          <div className="text-center space-y-2">
            {showWithInvestment ? (
              <>
                <Badge className="bg-green-600 text-lg px-4 py-1">Investment Scenario</Badge>
                <p className="text-lg font-medium">
                  With {formatCurrency(capitalRaise)} capital + operational improvements
                </p>
                <p className="text-sm text-muted-foreground">
                  20% monthly revenue growth • $30K cost reduction • Path to profitability
                </p>
              </>
            ) : (
              <>
                <Badge variant="destructive" className="text-lg px-4 py-1">Immediate Action Required</Badge>
                <p className="text-lg font-medium">
                  Monthly losses of $117K threaten operational continuity within Q1 2026
                </p>
                <p className="text-sm text-muted-foreground">
                  Labor costs at 138% of revenue • Unsustainable burn rate
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </ReportSlide>
  );
};

