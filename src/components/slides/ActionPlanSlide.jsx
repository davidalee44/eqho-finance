import { CheckCircle2 } from 'lucide-react';
import React from 'react';
import { ReportSlide } from '../ReportSlide';
import { Badge } from '../ui/badge';

export const ActionPlanSlide = ({ recommendations }) => {
  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'Immediate': return 'destructive';
      case 'High': return 'default';
      default: return 'secondary';
    }
  };

  const getPriorityBg = (priority) => {
    switch(priority) {
      case 'Immediate': return 'bg-red-50 border-red-200';
      case 'High': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <ReportSlide
      title="Action Plan"
      description="Prioritized recommendations to improve cash position"
      variant="success"
    >
      <div className="space-y-5">
        {recommendations.map((rec, idx) => (
          <div key={idx} className={`flex items-start gap-4 p-5 border-2 rounded-xl ${getPriorityBg(rec.priority)}`}>
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
              {idx + 1}
            </div>
            <div className="flex-grow space-y-3">
              <div className="flex items-center justify-between gap-4">
                <p className="font-semibold text-lg">{rec.action}</p>
                <Badge variant={getPriorityColor(rec.priority)} className="text-sm px-3 py-1">
                  {rec.priority}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Impact:</p>
                    <p className="font-semibold text-green-600 text-base">{rec.impact}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Timeline:</p>
                    <p className="font-semibold text-base">{rec.timeline}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Success Metrics */}
      <div className="mt-8 bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
        <h3 className="text-xl font-bold mb-4 text-blue-900">Success Metrics to Track Weekly</h3>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="font-semibold text-base mb-1">Weekly Cash Burn</p>
            <p className="text-sm text-muted-foreground">Target: Reduce to &lt;$20K/week</p>
          </div>
          <div>
            <p className="font-semibold text-base mb-1">Labor Cost Ratio</p>
            <p className="text-sm text-muted-foreground">Target: Below 70% by month 2</p>
          </div>
          <div>
            <p className="font-semibold text-base mb-1">Marketing CAC</p>
            <p className="text-sm text-muted-foreground">Track: Cost per new customer</p>
          </div>
        </div>
      </div>
    </ReportSlide>
  );
};

