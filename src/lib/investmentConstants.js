/**
 * Investment Constants - Single source of truth for investment data
 * 
 * All investment-related figures should reference this file to ensure
 * consistency across the application and documentation.
 */

export const INVESTMENT = {
  // Round details
  raising: 500000,
  preMoneyValuation: 15000000,
  postMoneyValuation: 15500000,
  minimumInvestment: 50000,
  runway: '6 months to breakeven',
  
  // Use of funds breakdown (percentages)
  useOfFunds: {
    salesAndMarketing: { percentage: 40, amount: 200000, description: 'Customer acquisition' },
    infrastructure: { percentage: 30, amount: 150000, description: 'Scale for growth' },
    productEngineering: { percentage: 20, amount: 100000, description: 'Platform enhancements' },
    workingCapital: { percentage: 10, amount: 50000, description: 'Buffer' },
  },
};

// TowPilot-specific metrics
export const TOWPILOT_METRICS = {
  cac: {
    total: 831,
    sales: 450,
    marketing: 381,
  },
  ltv: 14100,
  ltvCacRatio: 17,
  cacPaybackMonths: 1.8,
  annualSubscriptionValue: 8027,
  grossMargin: 69, // Improving from 53% YTD
};

// Format helpers
export const formatCurrency = (amount, options = {}) => {
  const { compact = false, decimals = 0 } = options;
  
  if (compact && amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (compact && amount >= 1000) {
    return `$${(amount / 1000).toFixed(decimals)}K`;
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
};

export const formatValuation = (amount) => formatCurrency(amount, { compact: true, decimals: 1 });

