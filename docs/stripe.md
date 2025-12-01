# Stripe Integration

## Overview

The platform integrates with Stripe to pull real-time subscription and revenue metrics for the investor deck.

## Data Sources

### Subscriptions
- Active subscription count
- MRR (Monthly Recurring Revenue)
- Subscription tier breakdown
- Churn metrics

### Customers
- TowPilot customers (tagged with "tow" metadata)
- Customer growth metrics
- Retention rates

## TowPilot Filtering

TowPilot-specific metrics are filtered using Stripe metadata:

```python
# Backend filtering logic
TOWPILOT_TAG = "tow"

def is_towpilot_customer(customer):
    metadata = customer.get("metadata", {})
    tags = metadata.get("tags", "").lower()
    return TOWPILOT_TAG in tags
```

## API Endpoints

### GET /api/v1/metrics/towpilot
Returns TowPilot-specific metrics:
```json
{
  "customers": 74,
  "arr": 1068000,
  "mrr": 89000,
  "acv": 8027,
  "ltv": 14100,
  "cac": 831,
  "ltv_cac_ratio": 17.0,
  "cac_payback_months": 1.8,
  "gross_margin": 69.0
}
```

### GET /api/v1/stripe/comprehensive-metrics
Full metrics breakdown including:
- Customer metrics (active, churned, net adds)
- Retention by segment
- Pricing tier breakdown
- Unit economics
- ARPU calculations

### GET /api/v1/stripe/revenue-trend?months=12
Monthly revenue trend data.

### GET /api/v1/customer-mrr/list
Customer-level MRR breakdown.

## Metric Calculations

### MRR (Monthly Recurring Revenue)
Sum of all active subscription amounts normalized to monthly.

```python
mrr = sum(
    sub.plan.amount / 100 * 
    (12 if sub.plan.interval == "year" else 1)
    for sub in active_subscriptions
)
```

### LTV (Lifetime Value)
```python
ltv = arpu * average_customer_lifespan_months
# Where average lifespan = 1 / monthly_churn_rate
```

### CAC Payback
```python
cac_payback_months = cac / arpu
```

### LTV/CAC Ratio
```python
ltv_cac_ratio = ltv / cac
```

## Caching Strategy

Stripe data is cached to avoid rate limits:

1. **In-memory cache**: 5 minute TTL
2. **Database cache**: Supabase `metrics_cache` table
3. **Browser cache**: localStorage for offline fallback

### Cache Invalidation

```bash
# Manual cache clear
curl -X POST https://api.eqho.ai/api/v1/cache/invalidate
```

## Environment Variables

```bash
STRIPE_SECRET_KEY=sk_live_...  # Required - Stripe API key
STRIPE_PUBLISHABLE_KEY=pk_live_...  # Optional
TOWPILOT_TAG=tow  # Default: "tow"
CACHE_TTL=300  # Cache TTL in seconds
```

## Stripe Webhook (Optional)

For real-time updates, configure webhook at:
```
https://api.eqho.ai/api/v1/stripe/webhook
```

Events to subscribe:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`

## Troubleshooting

### Metrics show zero
- Check STRIPE_SECRET_KEY is set correctly
- Verify API key has read access to subscriptions
- Check TowPilot customers are tagged properly

### Stale data
- Clear cache via API
- Check CACHE_TTL setting
- Verify backend is running latest code

### Rate limit errors
- Increase CACHE_TTL
- Check for runaway API calls
- Monitor Stripe dashboard for usage

