/**
 * Generate AI-powered financial insights
 * This can call an AI API or use a local analysis engine
 */

export async function generateFinancialInsights(financialData) {
  // For now, use intelligent analysis based on the data
  // In production, this would call OpenAI, Anthropic, or another AI service
  
  const { baseline, projections, targets, milestones } = financialData;
  
  // Calculate key metrics
  // Total operating burn = sum of negative NOI months
  const totalOperatingBurn = projections.reduce((sum, m) => sum + Math.min(0, m.noi), 0);

  // Actual cash burn = starting cash - lowest cash point (accounts for recovery)
  const cashPositions = projections.map(m => m.cash);
  const lowestCash = Math.min(...cashPositions);
  const actualBurn = targets.startingCash - lowestCash;

  // Use actual burn for display (more accurate representation)
  const totalBurn = actualBurn > 0 ? actualBurn : Math.abs(totalOperatingBurn);

  const avgMonthlyGrowth = projections.slice(0, 3).reduce((sum, m, i) => {
    if (i === 0) return 0;
    const prevRev = projections[i - 1].revenue;
    return sum + ((m.revenue - prevRev) / prevRev * 100);
  }, 0) / 2;

  // Calculate runway based on burn rate before breakeven
  const breakevenIdx = projections.findIndex(m => m.noi > 0);
  let runway;
  if (breakevenIdx === -1) {
    // No breakeven - use average monthly burn from all months
    const avgBurn = Math.abs(totalOperatingBurn / 12);
    runway = avgBurn > 0 ? Math.floor(targets.startingCash / avgBurn) : 99;
  } else if (breakevenIdx === 0) {
    // Already profitable from month 1
    runway = 99;
  } else {
    // Calculate actual burn before breakeven
    const burnBeforeBreakeven = projections.slice(0, breakevenIdx)
      .reduce((sum, m) => sum + Math.min(0, m.noi), 0);
    const monthsToBreakeven = breakevenIdx;
    const avgMonthlyBurn = Math.abs(burnBeforeBreakeven / monthsToBreakeven);
    runway = avgMonthlyBurn > 0 ? Math.floor(targets.startingCash / avgMonthlyBurn) : 99;
  }

  const exitMRR = projections[11].revenue;
  
  // Determine risk level based on burn amount (now a positive value)
  let riskLevel = 'low';
  if (totalBurn > 450000) riskLevel = 'high';
  else if (totalBurn > 350000) riskLevel = 'moderate';
  
  // Generate recommendations based on analysis
  const recommendations = [];
  
  // Revenue recommendations
  if (avgMonthlyGrowth < targets.cmgr) {
    recommendations.push({
      priority: 'high',
      category: 'Revenue',
      title: 'Accelerate Revenue Growth',
      actions: [
        `Current growth (${avgMonthlyGrowth.toFixed(1)}%) below target (${targets.cmgr}%)`,
        'Increase sales & marketing investment',
        'Focus on Enterprise customer acquisition',
        'Launch upsell campaigns to existing customers'
      ]
    });
  } else {
    recommendations.push({
      priority: 'medium',
      category: 'Revenue',
      title: 'Maintain Growth Momentum',
      actions: [
        `Growth on track at ${avgMonthlyGrowth.toFixed(1)}% CMGR`,
        'Continue current sales & marketing strategy',
        'Explore expansion into new market segments'
      ]
    });
  }
  
  // OpEx recommendations
  const avgOpex = projections.reduce((sum, m) => sum + (m.opex || m.totalOpex || 0), 0) / projections.length;
  if (avgOpex > targets.targetOpex * 1.1) {
    recommendations.push({
      priority: 'high',
      category: 'Operations',
      title: 'Monitor OpEx Closely',
      actions: [
        `OpEx averaging $${(avgOpex / 1000).toFixed(0)}K vs target $${(targets.targetOpex / 1000).toFixed(0)}K`,
        'Review spending categories monthly',
        'Ensure OpEx scales with revenue growth'
      ]
    });
  } else {
    recommendations.push({
      priority: 'medium',
      category: 'Operations',
      title: 'OpEx Management',
      actions: [
        'Maintain current OpEx levels',
        'Track unit economics weekly',
        'Optimize infrastructure costs as scale increases'
      ]
    });
  }
  
  // Cash management
  recommendations.push({
    priority: milestones.breakevenMonth ? 'low' : 'high',
    category: 'Cash Management',
    title: 'Cash Preservation Strategy',
    actions: [
      milestones.breakevenMonth 
        ? `Breakeven projected: ${milestones.breakevenMonth}`
        : 'Breakeven beyond 12 months - consider adjustments',
      `Runway: ${runway} months at current burn`,
      'Maintain $100K+ reserve for contingencies',
      'Monitor cash position daily'
    ]
  });
  
  // Generate risks
  const risks = [];
  
  if (avgMonthlyGrowth < 15) {
    risks.push({
      level: 'high',
      title: 'Revenue Growth Risk',
      description: `CMGR of ${avgMonthlyGrowth.toFixed(1)}% may extend breakeven timeline. Consider increasing sales investment.`
    });
  }
  
  if (totalBurn > 450000) {
    risks.push({
      level: 'high',
      title: 'High Burn Rate',
      description: `Total burn of $${(totalBurn / 1000).toFixed(0)}K reduces runway. Monitor spending closely.`
    });
  }
  
  if (!milestones.breakevenMonth) {
    risks.push({
      level: 'moderate',
      title: 'Delayed Breakeven',
      description: 'Breakeven not projected within 12 months. May need additional funding or cost optimization.'
    });
  }
  
  // Generate opportunities
  const opportunities = [];
  
  if (exitMRR > 200000) {
    opportunities.push({
      title: 'Strong Exit Position',
      impact: 'high',
      description: `Projected $${(exitMRR / 1000).toFixed(0)}K MRR at year-end positions well for next round.`
    });
  }
  
  opportunities.push({
    title: 'Enterprise Expansion',
    impact: 'high',
    description: 'Focus on Enterprise Tier 7 ($20K/mo) customers for high-value revenue.'
  });
  
  if (projections[11].grossMargin > 75) {
    opportunities.push({
      title: 'Margin Expansion',
      impact: 'medium',
      description: `Gross margin expanding to ${projections[11].grossMargin.toFixed(1)}% - strong unit economics.`
    });
  }
  
  return {
    summary: {
      totalBurn, // Already a positive value representing total cash burned
      runway,
      exitMRR,
      riskLevel,
      avgMonthlyGrowth: avgMonthlyGrowth.toFixed(1)
    },
    recommendations,
    risks,
    opportunities,
    generatedAt: new Date().toISOString()
  };
}

