/**
 * Fetch Stripe revenue data from Supabase for the financial deck
 */

import { supabase } from './supabase';

/**
 * Get current MRR and subscription stats
 */
export async function getCurrentMRR() {
  const { data, error } = await supabase
    .from('mrr_snapshots')
    .select('*')
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching MRR:', error);
    return null;
  }

  return data;
}

/**
 * Get all active subscriptions
 */
export async function getActiveSubscriptions() {
  const { data, error } = await supabase
    .from('stripe_subscriptions')
    .select('*')
    .eq('status', 'active')
    .order('amount_monthly', { ascending: false });

  if (error) {
    console.error('Error fetching subscriptions:', error);
    return [];
  }

  return data || [];
}

/**
 * Get revenue breakdown by category
 */
export async function getRevenueBreakdown() {
  const { data, error } = await supabase
    .from('stripe_subscriptions')
    .select('product_category, amount_monthly')
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching breakdown:', error);
    return {};
  }

  const breakdown = data.reduce((acc, sub) => {
    const category = sub.product_category || 'Other';
    if (!acc[category]) {
      acc[category] = { mrr: 0, count: 0 };
    }
    acc[category].mrr += sub.amount_monthly || 0;
    acc[category].count += 1;
    return acc;
  }, {});

  const totalMRR = Object.values(breakdown).reduce((sum, cat) => sum + cat.mrr, 0);

  // Add percentages
  Object.keys(breakdown).forEach(category => {
    breakdown[category].percent = totalMRR > 0 
      ? (breakdown[category].mrr / totalMRR * 100).toFixed(1)
      : 0;
  });

  return {
    breakdown,
    totalMRR,
    totalSubscriptions: data.length
  };
}

/**
 * Get top customers by MRR
 */
export async function getTopCustomers(limit = 10) {
  const { data, error } = await supabase
    .from('stripe_customers')
    .select('*')
    .order('total_mrr', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching top customers:', error);
    return [];
  }

  return data || [];
}

