# API Reference

Base URL: `https://api.eqho.ai` (production) or `http://localhost:8000` (development)

## Health Check

### GET /health
System health and cache status.

**Response:**
```json
{
  "status": "healthy",
  "cache_stats": {
    "memory_cache": {
      "entries": 5,
      "keys": ["towpilot_metrics", "comprehensive_metrics"]
    }
  },
  "backend": "supabase"
}
```

## Metrics Endpoints

### GET /api/v1/metrics/towpilot
TowPilot product metrics.

**Response:**
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

### GET /api/v1/metrics/all-products
Combined metrics for all products.

### GET /api/v1/metrics/summary
High-level summary for deck display.

## Stripe Data Endpoints

### GET /api/v1/stripe/comprehensive-metrics
Full metrics breakdown.

**Response:**
```json
{
  "customer_metrics": {
    "active_customers": 74,
    "churned_customers": 3,
    "net_adds_ytd": 45,
    "growth_rate_ytd": 155.2
  },
  "retention_by_segment": {
    "towpilot": { "retention_rate": 96.2, "active_customers": 74, "churned_customers": 3 },
    "other_products": { "retention_rate": 91.5, "active_customers": 12, "churned_customers": 1 },
    "overall": { "retention_rate": 95.3 }
  },
  "pricing_tiers": {
    "tiers": [
      { "tier": "Heavy Duty", "customers": 14, "mrr": 15744, "arpu": 1125, "percentage": 32.9 }
    ]
  },
  "unit_economics": {
    "cac": { "total": 831, "sales": 450, "marketing": 381 },
    "ltv": { "value": 14100 },
    "ltv_cac_ratio": 17.0,
    "cac_payback_months": 1.8
  },
  "timestamp": "2025-11-28T10:30:00Z"
}
```

### GET /api/v1/stripe/customers?tag=tow
List customers with optional tag filter.

### GET /api/v1/stripe/subscriptions
Active subscriptions list.

### GET /api/v1/stripe/revenue-trend?months=12
Monthly revenue trend.

## Customer MRR Endpoints

### GET /api/v1/customer-mrr/list
Customer-level MRR breakdown.

### GET /api/v1/customer-mrr/summary-by-tier
MRR summary grouped by pricing tier.

### GET /api/v1/customer-mrr/export-csv
Export customer MRR as CSV file.

## Revenue Endpoints

### GET /api/v1/revenue/current-month
Current month revenue data.

### GET /api/v1/revenue/quarterly-forecast
Quarterly revenue forecast.

### GET /api/v1/revenue/annual-forecast
Annual revenue projection.

## Feature Flags

### GET /api/v1/flags
Get current feature flag values.

**Response:**
```json
{
  "flags": {
    "show_admin_controls": false,
    "show_sidebar": false,
    "quick_investor_view": false,
    "maintenance_mode": false
  }
}
```

## Snapshots (Version Control)

### GET /api/v1/snapshots
List saved snapshots.

**Headers:** `Authorization: Bearer <jwt_token>`

### POST /api/v1/snapshots
Create new snapshot.

**Body:**
```json
{
  "name": "Q4 Investor Meeting",
  "snapshot_type": "financial_report",
  "data": { ... },
  "screenshot_url": "https://..."
}
```

### DELETE /api/v1/snapshots/{id}
Delete snapshot.

## Layouts (Admin Only)

### GET /api/v1/layouts
Get current dashboard layout.

### PUT /api/v1/layouts
Save dashboard layout.

**Body:**
```json
{
  "layout_data": [
    { "id": "card-1", "x": 0, "y": 0, "width": 6, "height": 4 }
  ]
}
```

## Audit Logs (Admin Only)

### GET /api/v1/audit?page=1&limit=50
Paginated audit logs.

### GET /api/v1/audit/export-csv
Export audit logs as CSV.

## Cache Management

### POST /api/v1/cache/invalidate
Clear all caches.

### GET /api/v1/cache/stats
Cache statistics.

## Authentication

Most endpoints require JWT authentication via Supabase.

**Header:**
```
Authorization: Bearer <supabase_jwt_token>
```

## Error Responses

```json
{
  "detail": "Error description",
  "status_code": 400
}
```

| Code | Description |
|------|-------------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 500 | Internal Server Error |

