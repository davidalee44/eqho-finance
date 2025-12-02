import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Target,
  AlertTriangle,
  Lightbulb,
  ShieldAlert,
  Rocket
} from 'lucide-react';
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
    // Calculate actual burn = starting cash - lowest cash point
    const lowestCash = Math.min(...projections.map(m => m.cash));
    const totalBurn = variables.startingCash - lowestCash;

    const avgMonthlyGrowth = projections.slice(0, 3).reduce((sum, m, i) => {
      if (i === 0) return 0;
      const prevRev = projections[i - 1].revenue;
      return sum + ((m.revenue - prevRev) / prevRev * 100);
    }, 0) / 2;

    // Calculate runway based on burn before breakeven
    const breakevenIdx = projections.findIndex(m => m.noi > 0);
    let runway;
    if (breakevenIdx === -1) {
      const totalOperatingBurn = projections.reduce((sum, m) => sum + Math.min(0, m.noi), 0);
      const avgBurn = Math.abs(totalOperatingBurn / 12);
      runway = avgBurn > 0 ? Math.floor(variables.startingCash / avgBurn) : 99;
    } else if (breakevenIdx === 0) {
      runway = 99;
    } else {
      const burnBeforeBreakeven = projections.slice(0, breakevenIdx)
        .reduce((sum, m) => sum + Math.min(0, m.noi), 0);
      const avgMonthlyBurn = Math.abs(burnBeforeBreakeven / breakevenIdx);
      runway = avgMonthlyBurn > 0 ? Math.floor(variables.startingCash / avgMonthlyBurn) : 99;
    }

    return {
      summary: {
        totalBurn: totalBurn > 0 ? totalBurn : 0,
        runway,
        exitMRR: projections[11].revenue,
        riskLevel: totalBurn > 400000 ? 'high' : 'moderate'
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

  // Format currency helper
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  if (loading) {
    return (
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-blue-50/50">
          <CardTitle className="text-base flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            Generating AI Analysis...
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Analyzing financial projections and generating insights...</p>
        </CardContent>
      </Card>
    );
  }

  if (error && !insights) {
    return (
      <Card className="border-2 border-red-200">
        <CardHeader className="bg-red-50/50 flex flex-row items-center justify-between">
          <CardTitle className="text-base text-red-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Error Loading Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-red-700">
          {error}
        </CardContent>
      </Card>
    );
  }

  if (!insights) return null;

  const getRiskBadgeVariant = (level) => {
    switch (level) {
      case 'high': return 'destructive';
      case 'moderate': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* AI-Generated Summary - Bento Grid Layout */}
      <Card className="border-2">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            AI Financial Analysis
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Auto-generated
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Burn Card */}
            <Card className="border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Burn</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(insights.summary.totalBurn)}</div>
                <p className="text-xs text-muted-foreground mt-1">To lowest cash point</p>
              </CardContent>
            </Card>

            {/* Runway Card */}
            <Card className="border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Runway</CardTitle>
                <Clock className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {insights.summary.runway >= 99 ? '12+' : insights.summary.runway} months
                </div>
                <p className="text-xs text-muted-foreground mt-1">At current burn rate</p>
              </CardContent>
            </Card>

            {/* Exit MRR Card */}
            <Card className="border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Exit MRR</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(insights.summary.exitMRR)}</div>
                <p className="text-xs text-muted-foreground mt-1">Year-end projected</p>
              </CardContent>
            </Card>

            {/* Risk Level Card */}
            <Card className={`border ${
              insights.summary.riskLevel === 'high' ? 'border-red-200 bg-red-50/50' :
              insights.summary.riskLevel === 'moderate' ? 'border-amber-200 bg-amber-50/50' :
              'border-green-200 bg-green-50/50'
            }`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
                <ShieldAlert className={`h-4 w-4 ${
                  insights.summary.riskLevel === 'high' ? 'text-red-600' :
                  insights.summary.riskLevel === 'moderate' ? 'text-amber-600' :
                  'text-green-600'
                }`} />
              </CardHeader>
              <CardContent>
                <Badge
                  variant={getRiskBadgeVariant(insights.summary.riskLevel)}
                  className="text-sm px-3 py-1"
                >
                  {insights.summary.riskLevel.charAt(0).toUpperCase() + insights.summary.riskLevel.slice(1)}
                </Badge>
                <p className="text-xs text-muted-foreground mt-2">Based on burn analysis</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout for Recommendations and Risks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Recommendations */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-blue-600" />
              AI Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {insights.recommendations?.map((rec, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">{rec.title}</span>
                  <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}>
                    {rec.priority.charAt(0).toUpperCase() + rec.priority.slice(1)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{rec.category}</p>
                <ul className="space-y-1.5">
                  {rec.actions?.map((action, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">→</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Risks & Opportunities */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Risks & Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Risks Section */}
            {insights.risks?.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Risks</p>
                {insights.risks?.map((risk, idx) => (
                  <div key={idx} className={`p-4 rounded-lg border-l-4 ${
                    risk.level === 'high' ? 'border-l-red-500 bg-red-50/50' :
                    risk.level === 'moderate' ? 'border-l-amber-500 bg-amber-50/50' :
                    'border-l-yellow-500 bg-yellow-50/50'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getRiskBadgeVariant(risk.level)} className="text-xs">
                        {risk.level.charAt(0).toUpperCase() + risk.level.slice(1)}
                      </Badge>
                      <span className="font-semibold text-sm">{risk.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{risk.description}</p>
                  </div>
                ))}
              </div>
            )}

            {insights.risks?.length > 0 && insights.opportunities?.length > 0 && (
              <Separator />
            )}

            {/* Opportunities Section */}
            {insights.opportunities?.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Rocket className="h-3 w-3" />
                  Opportunities
                </p>
                {insights.opportunities?.map((opp, idx) => (
                  <div key={idx} className="p-4 rounded-lg border-l-4 border-l-green-500 bg-green-50/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={opp.impact === 'high' ? 'default' : 'secondary'} className="text-xs bg-green-600">
                        {opp.impact.charAt(0).toUpperCase() + opp.impact.slice(1)} Impact
                      </Badge>
                      <span className="font-semibold text-sm">{opp.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{opp.description}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

