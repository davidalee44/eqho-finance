import React from 'react';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { ReportSlide } from '../ReportSlide';

export const SpendingBreakdownSlide = ({ spendingCategories }) => {
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
      title="Spending Breakdown"
      description="Top expense categories with trends"
      variant="warning"
    >
      <div className="space-y-8">
        {spendingCategories.map((cat, idx) => (
          <div key={idx} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                  idx === 0 ? 'bg-red-500' : idx === 1 ? 'bg-orange-500' : 'bg-blue-500'
                }`}>
                  {idx + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">{cat.category}</span>
                    <Badge variant={cat.trend === 'up' ? 'destructive' : 'secondary'} className="text-sm">
                      {cat.trend === 'up' ? '↑ Rising' : '→ Stable'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{cat.percent}% of total expenses</p>
                </div>
              </div>
              <span className="text-2xl font-bold font-mono">{formatCurrency(cat.amount)}</span>
            </div>
            <Progress value={cat.percent} className="h-3" />
          </div>
        ))}
      </div>

      {/* Quick Insights */}
      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-red-900 mb-1">Highest Risk</p>
          <p className="text-xl font-bold text-red-700">Contract Labor</p>
          <p className="text-sm text-red-600 mt-1">138% of revenue - immediate reduction needed</p>
        </div>
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-blue-900 mb-1">Quick Win</p>
          <p className="text-xl font-bold text-blue-700">SaaS Audit</p>
          <p className="text-sm text-blue-600 mt-1">$29K+ spend likely has redundancies</p>
        </div>
      </div>
    </ReportSlide>
  );
};

