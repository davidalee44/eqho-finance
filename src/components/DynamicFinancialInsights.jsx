import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { generateFinancialInsights } from '@/lib/generateFinancialInsights';

/**
 * Dynamic AI-powered financial insights component
 * Generates real-time analysis and recommendations based on financial model
 */
export const DynamicFinancialInsights = ({ projections, variables, breakeven, cfPositive }) => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    generateInsights();
  }, [projections, variables, breakeven, cfPositive]);

  const generateInsights = async () => {
    setLoading(true);
    setError(null);

    try {
      // Prepare financial data for AI analysis
      const financialData = {
        baseline: {
          revenue: variables.septRevenue,
          grossMargin: 69.1,
          opex: 150286,
          monthlyBurn: variables.septRevenue - 150286
        },
        projections: projections.map(m => ({
          month: m.monthLabel,
          revenue: m.revenue,
          grossMargin: m.grossMargin,
          opex: m.totalOpex,
          noi: m.noi,
          cash: m.cash
        })),
        targets: {
          cmgr: variables.cmgr,
          targetGrossMargin: variables.targetGrossMargin,
          targetOpex: variables.targetOpex,
          startingCash: variables.startingCash
        },
        milestones: {
          breakevenMonth: breakeven?.monthLabel || null,
          cfPositiveMonth: cfPositive?.monthLabel || null,
          yearEndCash: projections[11]?.cash || 0
        }
      };

      // Generate insights using local AI analysis
      // In production, this could call OpenAI/Anthropic API
      // Add small delay to simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 500));
      const data = await generateFinancialInsights(financialData);
      setInsights(data);
    } catch (err) {
      console.error('Error generating insights:', err);
      setError(err.message);
      // Fallback to static insights if analysis fails
      setInsights(generateFallbackInsights());
    } finally {
      setLoading(false);
    }
  };

  const generateFallbackInsights = () => {
    // Fallback insights based on calculations
    const totalBurn = projections.reduce((sum, m) => sum + Math.min(0, m.noi), 0);
    const avgMonthlyGrowth = projections.slice(0, 3).reduce((sum, m, i) => {
      if (i === 0) return 0;
      const prevRev = projections[i - 1].revenue;
      return sum + ((m.revenue - prevRev) / prevRev * 100);
    }, 0) / 2;

    return {
      summary: {
        totalBurn: Math.abs(totalBurn),
        runway: Math.floor(variables.startingCash / Math.abs(totalBurn / 12)),
        exitMRR: projections[11].revenue,
        riskLevel: totalBurn > -400000 ? 'moderate' : 'high'
      },
      recommendations: [
        {
          priority: 'high',
          category: 'Revenue',
          title: 'Accelerate Revenue Growth',
          actions: [
            'Maintain 20%+ CMGR through aggressive sales',
            'Invest in marketing to expand pipeline',
            'Launch upsell initiatives to existing customers'
          ]
        },
        {
          priority: 'high',
          category: 'Operations',
          title: 'Optimize OpEx Efficiency',
          actions: [
            'Monitor burn rate weekly',
            'Ensure OpEx scales with revenue',
            'Maintain 70%+ gross margins'
          ]
        },
        {
          priority: 'medium',
          category: 'Cash Management',
          title: 'Preserve Runway',
          actions: [
            `Breakeven target: ${breakeven?.monthLabel || 'TBD'}`,
            'Keep $100K reserve for contingencies',
            'Track cash position daily'
          ]
        }
      ],
      risks: [
        {
          level: 'moderate',
          title: 'Revenue Growth Risk',
          description: 'If CMGR drops below 15%, breakeven extends beyond 12 months'
        },
        {
          level: 'low',
          title: 'OpEx Overrun Risk',
          description: 'Monitor actual vs. projected OpEx monthly'
        }
      ],
      opportunities: [
        {
          title: 'Enterprise Expansion',
          impact: 'high',
          description: 'Focus on Enterprise Tier 7 ($20K/mo) customers'
        },
        {
          title: 'Upsell Existing Customers',
          impact: 'medium',
          description: 'Increase ARPU through feature upgrades'
        }
      ]
    };
  };

  if (loading) {
    return (
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-blue-50/50">
          <CardTitle className="text-sm flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating Dynamic Insights...
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Analyzing financial model and generating recommendations...
        </CardContent>
      </Card>
    );
  }

  if (error && !insights) {
    return (
      <Card className="border-2 border-red-200">
        <CardHeader className="bg-red-50/50">
          <CardTitle className="text-sm text-red-900">Error Loading Insights</CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-sm text-red-700">
          {error}
        </CardContent>
      </Card>
    );
  }

  if (!insights) return null;

  return (
    <div className="space-y-4">
      {/* AI-Generated Summary */}
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-blue-50/50">
          <CardTitle className="text-sm text-blue-900">AI-Generated Financial Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-white/80 border border-blue-200">
              <p className="text-blue-600 font-medium mb-1 text-xs">Total Burn</p>
              <p className="font-bold text-blue-900 text-lg">${(insights.summary.totalBurn / 1000).toFixed(0)}K</p>
            </div>
            <div className="p-3 rounded-lg bg-white/80 border border-purple-200">
              <p className="text-purple-600 font-medium mb-1 text-xs">Runway</p>
              <p className="font-bold text-purple-900 text-lg">{insights.summary.runway} mo</p>
            </div>
            <div className="p-3 rounded-lg bg-white/80 border border-green-200">
              <p className="text-green-600 font-medium mb-1 text-xs">Exit MRR</p>
              <p className="font-bold text-green-900 text-lg">${(insights.summary.exitMRR / 1000).toFixed(0)}K</p>
            </div>
            <div className="p-3 rounded-lg bg-white/80 border border-amber-200">
              <p className="text-amber-600 font-medium mb-1 text-xs">Risk Level</p>
              <Badge variant={insights.summary.riskLevel === 'high' ? 'destructive' : 'default'} className="text-xs">
                {insights.summary.riskLevel}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-blue-50/50">
            <CardTitle className="text-sm text-blue-900">AI Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {insights.recommendations?.map((rec, idx) => (
              <div key={idx} className="space-y-2 p-3 rounded-lg bg-white/60 border border-blue-100">
                <div className="flex items-center gap-2">
                  <Badge variant={rec.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                    {rec.priority}
                  </Badge>
                  <span className="font-semibold text-blue-800 text-xs">{rec.category}</span>
                </div>
                <p className="font-semibold text-blue-900 text-xs">{rec.title}</p>
                <ul className="space-y-1">
                  {rec.actions?.map((action, i) => (
                    <li key={i} className="text-blue-700 text-xs flex items-start gap-2">
                      <span>→</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200">
          <CardHeader className="bg-green-50/50">
            <CardTitle className="text-sm text-green-900">Risks & Opportunities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {insights.risks?.map((risk, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-white/60 border border-orange-100">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={risk.level === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                    {risk.level}
                  </Badge>
                  <span className="font-semibold text-orange-900 text-xs">{risk.title}</span>
                </div>
                <p className="text-orange-700 text-xs">{risk.description}</p>
              </div>
            ))}
            
            <Separator className="my-3" />
            
            {insights.opportunities?.map((opp, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-green-50/60 border border-green-200">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={opp.impact === 'high' ? 'default' : 'outline'} className="text-xs">
                    {opp.impact}
                  </Badge>
                  <span className="font-semibold text-green-900 text-xs">{opp.title}</span>
                </div>
                <p className="text-green-700 text-xs">{opp.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

