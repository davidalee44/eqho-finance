import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ReportSlide } from '../ReportSlide';

export const CashFlowForecastSlide = ({ 
  cashFlowForecast, 
  showWithInvestment, 
  capitalRaise 
}) => {
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
      title="90-Day Cash Flow Forecast"
      description={showWithInvestment 
        ? `With ${formatCurrency(capitalRaise)} investment + operational improvements`
        : 'Current trajectory without investment (status quo)'}
      variant={showWithInvestment ? 'success' : 'danger'}
    >
      {showWithInvestment && (
        <Card className="border-green-500 bg-green-50 mb-6">
          <CardContent className="py-4">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-sm font-medium text-green-700 mb-1">Starting Cash</p>
                <p className="text-3xl font-bold">{formatCurrency(capitalRaise)}</p>
                <p className="text-xs text-muted-foreground mt-1">From investment</p>
              </div>
              <div>
                <p className="text-sm font-medium text-green-700 mb-1">Cost Optimization</p>
                <p className="text-3xl font-bold">-{formatCurrency(30000)}/mo</p>
                <p className="text-xs text-muted-foreground mt-1">Labor + SaaS reduction</p>
              </div>
              <div>
                <p className="text-sm font-medium text-green-700 mb-1">Revenue Growth</p>
                <p className="text-3xl font-bold">20% CMGR</p>
                <p className="text-xs text-muted-foreground mt-1">Sustained monthly growth</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Table>
        <TableHeader>
          <TableRow className="text-base">
            <TableHead className="text-base">Month</TableHead>
            <TableHead className="text-right text-base">Inflows</TableHead>
            <TableHead className="text-right text-base">Outflows</TableHead>
            <TableHead className="text-right text-base">Net Cash Flow</TableHead>
            {showWithInvestment && <TableHead className="text-right text-base">Ending Cash</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {showWithInvestment && (
            <TableRow className="bg-green-50">
              <TableCell className="font-medium text-base">Starting Position</TableCell>
              <TableCell className="text-right font-mono text-base">—</TableCell>
              <TableCell className="text-right font-mono text-base">—</TableCell>
              <TableCell className="text-right font-mono text-base">—</TableCell>
              <TableCell className="text-right font-mono font-bold text-green-600 text-xl">
                {formatCurrency(capitalRaise)}
              </TableCell>
            </TableRow>
          )}
          {cashFlowForecast.map((month, idx) => (
            <TableRow key={idx} className="text-base">
              <TableCell className="font-medium text-base">{month.month}</TableCell>
              <TableCell className="text-right font-mono text-green-600 text-lg">
                {formatCurrency(month.inflows)}
              </TableCell>
              <TableCell className="text-right font-mono text-destructive text-lg">
                ({formatCurrency(month.outflows)})
              </TableCell>
              <TableCell className={`text-right font-mono font-bold text-lg ${
                month.netFlow >= 0 ? 'text-green-600' : 'text-destructive'
              }`}>
                {formatCurrency(month.netFlow)}
              </TableCell>
              {showWithInvestment && (
                <TableCell className="text-right font-mono font-bold text-green-600 text-xl">
                  {formatCurrency(month.endingCash)}
                </TableCell>
              )}
            </TableRow>
          ))}
          <TableRow className="border-t-4 font-bold text-lg">
            <TableCell className="text-lg">Total (90 Days)</TableCell>
            <TableCell className="text-right text-green-600 text-xl">
              {formatCurrency(cashFlowForecast.reduce((sum, m) => sum + m.inflows, 0))}
            </TableCell>
            <TableCell className="text-right text-destructive text-xl">
              ({formatCurrency(cashFlowForecast.reduce((sum, m) => sum + m.outflows, 0))})
            </TableCell>
            <TableCell className={`text-right text-2xl ${
              showWithInvestment && cashFlowForecast.reduce((sum, m) => sum + m.netFlow, 0) >= 0 
                ? 'text-green-600' 
                : 'text-destructive'
            }`}>
              {formatCurrency(cashFlowForecast.reduce((sum, m) => sum + m.netFlow, 0))}
            </TableCell>
            {showWithInvestment && (
              <TableCell className="text-right text-2xl text-green-600 font-bold">
                {formatCurrency(cashFlowForecast[cashFlowForecast.length - 1].endingCash)}
              </TableCell>
            )}
          </TableRow>
        </TableBody>
      </Table>
    </ReportSlide>
  );
};

