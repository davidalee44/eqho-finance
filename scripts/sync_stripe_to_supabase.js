/**
 * Sync Stripe subscriptions and customers to Supabase
 * This script will populate the database with real-time Stripe data
 * Run this regularly (daily/hourly) to keep the financial deck updated
 */

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabaseUrl = 'https://yindsqbhygvskolbccqq.supabase.co'; // TODO: are we on the right supabase?
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpbmRzcWJoeWd2c2tvbGJjY3FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NTM1NjksImV4cCI6MjA3ODMyOTU2OX0.y9uuFjCDVLWsSgZkt8YkccT4X66s9bmBaajGmdrJmP8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize Stripe (you'll need to set STRIPE_SECRET_KEY in environment)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Calculate monthly MRR from a price
 */
function calculateMonthlyMRR(price) {
  if (!price || !price.unit_amount) return 0;
  
  const amount = price.unit_amount / 100;
  const interval = price.recurring?.interval || 'month';
  const intervalCount = price.recurring?.interval_count || 1;
  
  if (interval === 'month') {
    return amount / intervalCount;
  } else if (interval === 'year') {
    return amount / 12;
  } else if (interval === 'quarter') {
    return amount / 3;
  } else if (interval === 'week') {
    return amount * 4.33;
  } else if (interval === 'day') {
    return amount * 30;
  }
  
  return amount;
}

/**
 * Categorize product
 */
function categorizeProduct(productName, priceId) {
  const name = (productName || '').toLowerCase();
  
  if (name.includes('towpilot') || name.includes('tow')) {
    return 'TowPilot';
  } else if (name.includes('enterprise') || name.includes('tier 7') || name.includes('vyde') || name.includes('attyx')) {
    return 'Enterprise';
  } else if (name.includes('pro')) {
    return 'Pro';
  } else if (name.includes('legacy') || name.includes('sandbox') || name.includes('internal')) {
    return 'Legacy/Internal';
  } else if (name.includes('pay-as-you-go') || name.includes('pay as you go')) {
    return 'PayAsYouGo';
  }
  
  return 'Other';
}

/**
 * Sync all active subscriptions
 */
async function syncSubscriptions() {
  console.log('🔄 Syncing Stripe subscriptions...');
  
  let hasMore = true;
  let startingAfter = null;
  let totalSynced = 0;
  
  while (hasMore) {
    const params = {
      status: 'active',
      limit: 100,
      expand: ['data.items.data.price']
    };
    
    if (startingAfter) {
      params.starting_after = startingAfter;
    }
    
    const subscriptions = await stripe.subscriptions.list(params);
    
    for (const sub of subscriptions.data) {
      const item = sub.items.data[0];
      const price = item.price;
      // Fetch product separately to avoid expansion limits
      const product = await stripe.products.retrieve(price.product);
      
      const monthlyMRR = calculateMonthlyMRR(price);
      const category = categorizeProduct(product.name, price.id);
      
      const subscriptionData = {
        stripe_subscription_id: sub.id,
        stripe_customer_id: sub.customer,
        status: sub.status,
        current_period_start: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
        current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
        cancel_at_period_end: sub.cancel_at_period_end || false,
        price_id: price.id,
        product_id: product.id,
        product_name: product.name,
        amount_cents: price.unit_amount || 0,
        amount_monthly: monthlyMRR,
        currency: price.currency || 'usd',
        billing_interval: price.recurring?.interval || 'month',
        product_category: category,
        revenue_segment: 'Platform License',
        metadata: {
          quantity: item.quantity,
          stripe_created: sub.created,
          ...sub.metadata
        },
        last_synced_at: new Date().toISOString()
      };
      
      // Upsert subscription
      const { error } = await supabase
        .from('stripe_subscriptions')
        .upsert(subscriptionData, {
          onConflict: 'stripe_subscription_id',
          ignoreDuplicates: false
        });
      
      if (error) {
        console.error(`Error syncing subscription ${sub.id}:`, error);
      } else {
        totalSynced++;
      }
    }
    
    hasMore = subscriptions.has_more;
    if (hasMore && subscriptions.data.length > 0) {
      startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
    }
  }
  
  console.log(`✅ Synced ${totalSynced} subscriptions`);
  return totalSynced;
}

/**
 * Sync customers
 */
async function syncCustomers() {
  console.log('🔄 Syncing Stripe customers...');
  
  // Get unique customer IDs from subscriptions
  const { data: subscriptions } = await supabase
    .from('stripe_subscriptions')
    .select('stripe_customer_id');
  
  const customerIds = [...new Set(subscriptions.map(s => s.stripe_customer_id))];
  
  let totalSynced = 0;
  
  for (const customerId of customerIds) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      
      // Calculate customer's total MRR
      const { data: customerSubs } = await supabase
        .from('stripe_subscriptions')
        .select('amount_monthly')
        .eq('stripe_customer_id', customerId)
        .eq('status', 'active');
      
      const totalMRR = customerSubs.reduce((sum, sub) => sum + (sub.amount_monthly || 0), 0);
      
      const customerData = {
        stripe_customer_id: customer.id,
        email: customer.email,
        name: customer.name,
        description: customer.description,
        active_subscriptions_count: customerSubs.length,
        total_mrr: totalMRR,
        metadata: customer.metadata || {},
        last_synced_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('stripe_customers')
        .upsert(customerData, {
          onConflict: 'stripe_customer_id',
          ignoreDuplicates: false
        });
      
      if (error) {
        console.error(`Error syncing customer ${customerId}:`, error);
      } else {
        totalSynced++;
      }
    } catch (error) {
      console.error(`Error fetching customer ${customerId}:`, error.message);
    }
  }
  
  console.log(`✅ Synced ${totalSynced} customers`);
  return totalSynced;
}

/**
 * Create MRR snapshot
 */
async function createMRRSnapshot() {
  console.log('📊 Creating MRR snapshot...');
  
  const { data: subscriptions } = await supabase
    .from('stripe_subscriptions')
    .select('*')
    .eq('status', 'active');
  
  const totalMRR = subscriptions.reduce((sum, sub) => sum + (sub.amount_monthly || 0), 0);
  const totalSubscriptions = subscriptions.length;
  
  // Get unique customers
  const uniqueCustomers = new Set(subscriptions.map(s => s.stripe_customer_id));
  const totalCustomers = uniqueCustomers.size;
  
  // Breakdown by category
  const breakdown = subscriptions.reduce((acc, sub) => {
    const category = sub.product_category || 'Other';
    if (!acc[category]) {
      acc[category] = { mrr: 0, count: 0 };
    }
    acc[category].mrr += sub.amount_monthly || 0;
    acc[category].count += 1;
    return acc;
  }, {});
  
  const snapshotData = {
    snapshot_date: new Date().toISOString().split('T')[0],
    total_mrr: totalMRR,
    total_subscriptions: totalSubscriptions,
    total_customers: totalCustomers,
    towpilot_mrr: breakdown.TowPilot?.mrr || 0,
    towpilot_count: breakdown.TowPilot?.count || 0,
    enterprise_mrr: breakdown.Enterprise?.mrr || 0,
    enterprise_count: breakdown.Enterprise?.count || 0,
    pro_mrr: breakdown.Pro?.mrr || 0,
    pro_count: breakdown.Pro?.count || 0,
    other_mrr: (breakdown.Other?.mrr || 0) + (breakdown['Legacy/Internal']?.mrr || 0) + (breakdown.PayAsYouGo?.mrr || 0),
    other_count: (breakdown.Other?.count || 0) + (breakdown['Legacy/Internal']?.count || 0) + (breakdown.PayAsYouGo?.count || 0),
    metadata: {
      breakdown,
      synced_at: new Date().toISOString()
    }
  };
  
  const { error } = await supabase
    .from('mrr_snapshots')
    .upsert(snapshotData, {
      onConflict: 'snapshot_date',
      ignoreDuplicates: false
    });
  
  if (error) {
    console.error('Error creating MRR snapshot:', error);
  } else {
    console.log(`✅ Created MRR snapshot: $${totalMRR.toFixed(2)}/mo from ${totalSubscriptions} subscriptions`);
  }
  
  return snapshotData;
}

/**
 * Main sync function
 */
async function sync() {
  try {
    console.log('🚀 Starting Stripe to Supabase sync...\n');
    
    await syncSubscriptions();
    await syncCustomers();
    const snapshot = await createMRRSnapshot();
    
    console.log('\n✨ Sync complete!');
    console.log(`📈 Current MRR: $${snapshot.total_mrr.toFixed(2)}/month`);
    console.log(`👥 Active Customers: ${snapshot.total_customers}`);
    console.log(`📋 Active Subscriptions: ${snapshot.total_subscriptions}`);
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  sync();
}

export { createMRRSnapshot, sync, syncCustomers, syncSubscriptions };

