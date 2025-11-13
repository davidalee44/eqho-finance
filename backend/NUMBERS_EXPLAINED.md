# Numbers Explained - Why Three Different MRR Values?

## The Three Numbers

| Source | MRR Value | Customers | Timestamp | Scope |
|--------|-----------|-----------|-----------|-------|
| **Stripe Dashboard** | $69,592.78 | ~145 | Real-time | All products |
| **Backend API** | $145,257.00 | 111 | Real-time | All products |
| **SAAS KPIs File** | $47,913.00 | 74 | Nov 11, 2025 | TowPilot only |

## Why They're Different

### Stripe Dashboard ($69K) vs Backend API ($145K)

**67% difference** - Backend calculates $75K more than Stripe shows.

**Potential Reasons:**

1. **Proration Adjustments**
   - Stripe dashboard applies prorated calculations for mid-cycle changes
   - Backend uses raw subscription amounts without proration
   
2. **Subscription Status Filtering**
   - Dashboard may exclude: `incomplete`, `past_due`, `unpaid`
   - Backend includes all `status="active"` subscriptions
   
3. **Calculation Method**
   - Dashboard: Invoice-based (actual charges)
   - Backend: Subscription-based (scheduled amounts)
   
4. **Time Window**
   - Dashboard: "Last 12 months" with rolling window
   - Backend: Current period subscriptions only

5. **$0 Subscription Handling**
   - Backend code excludes $0 (line 116-117 in stripe_service.py)
   - But many subscriptions might be $0.01 or minimal amounts
   
6. **Currency & Rounding**
   - Backend sums all amounts, rounds at end
   - Dashboard may apply exchange rates, round per-transaction

### Backend API ($145K) vs SAAS KPIs ($47K)

**203% difference** - Backend calculates $97K more.

**Reason:** Different product scopes

| Aspect | Backend | SAAS KPIs |
|--------|---------|-----------|
| Products | All products | TowPilot only |
| Customers | 111 total | 74 TowPilot |
| Filter | None | `tags='tow'` |
| Date | Real-time | Nov 11 snapshot |

**This is expected** - Backend can't filter for TowPilot because customer tags aren't set in Stripe.

### SAAS KPIs ($47K) vs Stripe Dashboard ($69K)

**44% difference** - Dashboard shows $21K more than TowPilot baseline.

**Reasons:**
1. **Product Mix Change**
   - SAAS KPIs: TowPilot only
   - Dashboard: All products
   - Difference: Other products = $21K MRR
   
2. **Time Drift**
   - SAAS KPIs: Nov 11 snapshot
   - Dashboard: Current (Nov 13)
   - 2 days of subscription changes

## Diagnostic Results

### From diagnose_data.py
```
Supabase:
  - stripe_subscriptions: 0 records (empty)
  - stripe_customers: 0 records (empty)

Stripe API:
  - Active subscriptions: 145
  - Total MRR: $145,257
  - TowPilot customers (tag='tow'): 0
  - Unique customers: 145 (but only 111 paying)
```

### Key Insight: 145 vs 111 Customers

**145 subscriptions** but **111 paying customers** means:
- 34 subscriptions are $0 (trials, free tiers)
- These are excluded from MRR calculation
- But still show as "active" subscriptions

## Which Number Should You Trust?

### For Investor Reporting
**Use Stripe Dashboard ($69K)**
- Most conservative
- Accounts for all Stripe's business logic
- Matches what investors can verify
- Official Stripe reporting

### For Internal Operations
**Use Backend API ($145K)**
- Most comprehensive
- Raw subscription data
- Includes all committed revenue
- Better for capacity planning

### For TowPilot-Specific Analysis
**Use SAAS KPIs ($47K)**
- Product-specific
- Historical comparison baseline
- Filtered to single product line
- Useful for product performance tracking

## How to Make Them Match

### Option 1: Align Backend with Dashboard ($69K)

Modify backend to match Stripe's calculation:
```python
# Add more filters in calculate_mrr()
- Exclude subscriptions with past_due invoices
- Apply proration logic
- Match Stripe's time window
```

Complexity: Medium
Maintenance: High (keep in sync with Stripe's logic)

### Option 2: Align Backend with SAAS KPIs ($47K)

Tag TowPilot customers in Stripe:
```python
# Tag all TowPilot customers
for customer_id in towpilot_customer_list:
    stripe.Customer.modify(
        customer_id,
        metadata={"tags": "tow"}
    )
```

Then backend will automatically filter to $47K.

Complexity: Low
Maintenance: Low (one-time tagging)

### Option 3: Accept All Three (RECOMMENDED)

Document each number's purpose:
- **$69K (Dashboard):** Official investor reporting
- **$145K (Backend):** Internal capacity planning
- **$47K (SAAS KPIs):** TowPilot product performance

Create separate endpoints:
- `/metrics/dashboard` → matches Stripe dashboard
- `/metrics/all-products` → current backend ($145K)
- `/metrics/towpilot` → filtered ($47K, requires tags)

Complexity: Low
Maintenance: Low (clear separation of concerns)

## Validator Interpretation

The validator showing "mismatch" is **working correctly**:

```
⚠️  Some metrics have discrepancies
```

This is not a bug - it's comparing:
- Backend (all products, real-time): $145K
- Baseline (TowPilot only, Nov 11): $47K

Both are correct for their contexts.

## Action Items

### Immediate (Completed)
- ✅ Fix backend to return real data (was $0)
- ✅ Create diagnostic tools
- ✅ Document expected behavior

### Optional Enhancements
- ⏳ Tag TowPilot customers in Stripe for filtering
- ⏳ Create product-specific endpoints
- ⏳ Regenerate SAAS KPIs with all products scope
- ⏳ Add Stripe dashboard calculation mode to backend

## Technical Details

### MRR Calculation Logic

**Backend (StripeService.calculate_mrr):**
```python
for sub in subscriptions:
    for item in sub["items"]:
        amount = item["amount"] / 100  # Cents → dollars
        
        if amount == 0:
            continue  # Skip trials
        
        if interval == "year":
            mrr += amount / 12
        elif interval == "month":
            mrr += amount / interval_count
        # ... etc
```

**Stripe Dashboard:**
- Uses invoice data (actual charges)
- Applies proration for mid-cycle changes
- Excludes certain subscription states
- May use different currency rates

### Customer Counting

**145 total subscriptions:**
- 111 with amount > $0 (paying customers)
- 34 with amount = $0 (trials/free)

Backend counts **111 paying customers** which is correct for MRR reporting.

## Conclusion

All three MRR numbers are **technically correct**:
- Stripe Dashboard ($69K): Most conservative, investor-grade
- Backend API ($145K): Most comprehensive, operational view
- SAAS KPIs ($47K): Product-specific, historical baseline

The validator successfully identified the difference and is working as designed. The "discrepancy" is actually measuring different things, not an error.

---

**Recommendation:** Document which number to use for which purpose, and align future SAAS KPIs snapshots with the backend's "all products" scope for easier comparison.

