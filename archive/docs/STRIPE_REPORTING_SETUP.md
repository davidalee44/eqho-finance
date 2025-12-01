# Stripe Reporting & Database Setup

## ✅ Status: COMPLETE

All 123 active subscriptions have been verified and are properly tracked in Supabase.

## Current Revenue Metrics

- **Total MRR:** $104,052.63/month
- **Total ARR:** $1,248,631.56/year  
- **Active Subscriptions:** 123
- **Active Customers:** ~110 unique customers

## Database Structure

### Tables Created

1. **`stripe_subscriptions`** - All subscription details
   - Subscription status, pricing, billing intervals
   - Product categorization
   - Monthly MRR calculation
   - Last sync timestamp

2. **`stripe_customers`** - Customer information
   - Customer details (email, name)
   - Total MRR per customer
   - Active subscription count

3. **`mrr_snapshots`** - Daily MRR snapshots
   - Historical MRR tracking
   - Growth metrics (new, churned, expansion)
   - Breakdown by product category

4. **`stripe_revenue_analytics`** - Aggregated analytics
   - Revenue breakdown by component
   - Platform License, Usage, Professional Services, Add-ons

## Sync Script

**Location:** `scripts/sync_stripe_to_supabase.js`

This script:
- ✅ Syncs all active subscriptions from Stripe
- ✅ Calculates monthly MRR (handles quarterly, weekly, etc.)
- ✅ Categorizes products (TowPilot, Enterprise, Pro, etc.)
- ✅ Updates customer records
- ✅ Creates daily MRR snapshots

### To Run Sync:

```bash
# Set your Stripe secret key
export STRIPE_SECRET_KEY=sk_live_...

# Run sync
node scripts/sync_stripe_to_supabase.js
```

### Recommended Schedule:

- **Daily:** Full sync (run at midnight)
- **Hourly:** Quick sync for real-time updates (optional)

## Frontend Integration

**Location:** `src/lib/stripeData.js`

Functions available:
- `getCurrentMRR()` - Get latest MRR snapshot
- `getActiveSubscriptions()` - Get all active subscriptions
- `getRevenueBreakdown()` - Get revenue by category
- `getTopCustomers()` - Get top customers by MRR

## Revenue Breakdown

| Category | Subscriptions | MRR | % of Total |
|----------|--------------|-----|------------|
| **TowPilot** | 94 | $59,752.63 | 57.4% |
| **Enterprise Tier 7** | 1 | $20,000.00 | 19.2% |
| **Enterprise $5K** | 2 | $10,000.00 | 9.6% |
| **Enterprise Vyde** | 1 | $5,000.00 | 4.8% |
| **Tow Dispatcher Annual** | 9 | $4,500.00 | 4.3% |
| **Pro** | 3 | $4,500.00 | 4.3% |
| **Other** | 13 | $300.00 | 0.3% |
| **TOTAL** | **123** | **$104,052.63** | **100%** |

## Next Steps

1. ✅ Database structure created
2. ✅ Sync script created
3. ⏳ Set up automated sync (cron job or scheduled task)
4. ⏳ Update financial deck to pull from Supabase
5. ⏳ Add real-time MRR display to dashboard

## Verification

All 123 subscriptions have been verified as **ACTIVE**:
- ✅ Status: `active` in Stripe
- ✅ Valid billing periods
- ✅ Proper MRR calculation
- ✅ Product categorization complete

## Notes

- The $20K/month Enterprise Tier 7 subscription (real estate) is included
- All high-value Enterprise subscriptions are tracked
- Monthly MRR properly calculated for quarterly/weekly billing
- Database ready to feed financial deck with real-time data

