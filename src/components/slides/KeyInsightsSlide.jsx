import { AlertCircle, Cloud, Megaphone, TrendingUp, Users } from 'lucide-react';
import React from 'react';
import { ReportSlide } from '../ReportSlide';
import { Separator } from '../ui/separator';

export const KeyInsightsSlide = () => {
  return (
    <ReportSlide
      title="Key Insights"
      description="Critical findings from October 2025 data"
      variant="warning"
    >
      <div className="space-y-6">
        <div className="flex items-start gap-4 p-5 bg-red-50 border-2 border-red-200 rounded-lg">
          <AlertCircle className="h-8 w-8 text-destructive mt-1 shrink-0" />
          <div>
            <p className="text-lg font-semibold mb-2">Unsustainable Burn Rate</p>
            <p className="text-base text-muted-foreground">
              Monthly losses of $117K will exhaust reserves in 3-6 months without immediate intervention
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-5 bg-orange-50 border-2 border-orange-200 rounded-lg">
          <Users className="h-8 w-8 text-orange-600 mt-1 shrink-0" />
          <div>
            <p className="text-lg font-semibold mb-2">Labor Cost Crisis</p>
            <p className="text-base text-muted-foreground">
              Contract labor at $124K/month represents 138% of revenue—highest risk category
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-5 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
          <Megaphone className="h-8 w-8 text-yellow-600 mt-1 shrink-0" />
          <div>
            <p className="text-lg font-semibold mb-2">Marketing Efficiency Unknown</p>
            <p className="text-base text-muted-foreground">
              $18K+ monthly ad spend (primarily Facebook) lacks clear ROI tracking
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-5 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <Cloud className="h-8 w-8 text-blue-600 mt-1 shrink-0" />
          <div>
            <p className="text-lg font-semibold mb-2">SaaS & Cloud Sprawl</p>
            <p className="text-base text-muted-foreground">
              $29K+ combined monthly spend across multiple vendors—likely contains redundancies
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-5 bg-green-50 border-2 border-green-200 rounded-lg">
          <TrendingUp className="h-8 w-8 text-green-600 mt-1 shrink-0" />
          <div>
            <p className="text-lg font-semibold mb-2">Strong Gross Margin</p>
            <p className="text-base text-muted-foreground">
              60.7% gross margin shows healthy unit economics—problem is operational overhead
            </p>
          </div>
        </div>
      </div>

      <Separator className="my-6" />

      <div className="bg-destructive/10 p-6 rounded-xl border-2 border-destructive">
        <p className="text-xl font-bold text-destructive mb-3">⚠️ Immediate Action Required</p>
        <p className="text-base">
          Without immediate cost reduction of $30K+/month, the company will face severe cash constraints within Q1 2026.
          Priority areas: Contract labor, marketing spend, and SaaS audit.
        </p>
      </div>
    </ReportSlide>
  );
};

