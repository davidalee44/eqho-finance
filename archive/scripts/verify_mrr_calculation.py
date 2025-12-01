#!/usr/bin/env python3
"""
Verify MRR Calculation Logic

Double-checks the calculation to ensure no double-counting or errors.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.services.stripe_service import StripeService


async def manual_mrr_calculation():
    """Manually calculate MRR step by step to verify"""

    print("=" * 80)
    print("MRR CALCULATION VERIFICATION")
    print("=" * 80)
    print()

    all_subs = await StripeService.get_active_subscriptions()

    print(f"Step 1: Fetched {len(all_subs)} active subscriptions")
    print()

    # Manual calculation
    manual_mrr = 0.0
    zero_count = 0
    paying_count = 0
    subscription_contributions = []

    for sub in all_subs:
        sub_mrr = 0.0

        for item in sub["items"]:
            amount = item["amount"] / 100  # Cents to dollars

            if amount == 0:
                zero_count += 1
                continue

            interval = item["interval"]
            interval_count = item.get("interval_count", 1)

            # Calculate monthly equivalent
            if interval == "year":
                monthly = amount / 12
            elif interval == "month":
                monthly = amount / interval_count
            elif interval == "week":
                monthly = (amount * 52) / 12
            elif interval == "day":
                monthly = amount * 30
            else:
                monthly = 0

            sub_mrr += monthly

        if sub_mrr > 0:
            paying_count += 1
            subscription_contributions.append({
                "sub_id": sub["id"],
                "customer": sub["customer"],
                "mrr": sub_mrr
            })

        manual_mrr += sub_mrr

    print("Step 2: Calculation breakdown")
    print(f"  - $0 subscription items:  {zero_count}")
    print(f"  - Paying subscriptions:   {paying_count}")
    print(f"  - Manual MRR total:       ${manual_mrr:,.2f}")
    print()

    # Use the service method
    service_mrr = await StripeService.calculate_mrr(all_subs)
    print(f"Step 3: Service method MRR:   ${service_mrr:,.2f}")
    print()

    # Verify they match
    if abs(manual_mrr - service_mrr) < 0.01:
        print("✓ Manual calculation matches service method")
    else:
        print(f"✗ MISMATCH: Manual ${manual_mrr:,.2f} vs Service ${service_mrr:,.2f}")
    print()

    # Check for unique customers
    unique_customers = set(contrib["customer"] for contrib in subscription_contributions)
    print(f"Step 4: Unique paying customers: {len(unique_customers)}")
    print()

    # Check for customers with multiple subscriptions
    from collections import Counter
    customer_counts = Counter(contrib["customer"] for contrib in subscription_contributions)
    multi_sub_customers = {cust: count for cust, count in customer_counts.items() if count > 1}

    if multi_sub_customers:
        print(f"Step 5: Customers with multiple subscriptions: {len(multi_sub_customers)}")
        print()
        print("Top customers with multiple subs:")
        for customer, count in sorted(multi_sub_customers.items(), key=lambda x: x[1], reverse=True)[:5]:
            cust_mrr = sum(c["mrr"] for c in subscription_contributions if c["customer"] == customer)
            print(f"  - {customer}: {count} subs = ${cust_mrr:,.2f}/month")
        print()

    # Show MRR distribution
    print("Step 6: MRR contribution analysis")
    sorted_contribs = sorted(subscription_contributions, key=lambda x: x["mrr"], reverse=True)

    top_10_mrr = sum(c["mrr"] for c in sorted_contribs[:10])
    top_20_mrr = sum(c["mrr"] for c in sorted_contribs[:20])
    bottom_half = sum(c["mrr"] for c in sorted_contribs[len(sorted_contribs)//2:])

    print(f"  - Top 10 subscriptions:     ${top_10_mrr:,.2f} ({top_10_mrr/manual_mrr*100:.1f}%)")
    print(f"  - Top 20 subscriptions:     ${top_20_mrr:,.2f} ({top_20_mrr/manual_mrr*100:.1f}%)")
    print(f"  - Bottom 50% subscriptions: ${bottom_half:,.2f} ({bottom_half/manual_mrr*100:.1f}%)")
    print()

    # Compare to expected
    print("=" * 80)
    print("COMPARISON")
    print("=" * 80)
    print("Stripe Dashboard:      $69,592.78")
    print(f"Backend Calculated:   ${manual_mrr:,.2f}")
    print("SAAS KPIs (TowPilot): $47,913.00")
    print()

    diff_from_dashboard = manual_mrr - 69592.78
    print(f"Backend vs Dashboard:  ${abs(diff_from_dashboard):,.2f} difference ({diff_from_dashboard/69592.78*100:+.1f}%)")
    print()

    if manual_mrr > 100000:
        print("⚠️  Backend MRR over $100K seems high")
        print()
        print("Possible causes:")
        print("1. Multiple subscription items per customer (counted separately)")
        print("2. Annual subscriptions not properly converted to monthly")
        print("3. Stripe dashboard excludes certain subscription statuses")
        print("4. Recent subscription changes not reflected in dashboard")
        print()
        print("Recommendation: ")
        print("- Review calculation logic in stripe_service.py:104-134")
        print("- Check if subscriptions have multiple items that should be combined")
        print("- Verify interval_count is being used correctly")


if __name__ == "__main__":
    asyncio.run(manual_mrr_calculation())

