#!/usr/bin/env python3
"""
Detailed MRR Analysis Script

Breaks down the $145K MRR to understand where it's coming from.
"""

import asyncio
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.services.stripe_service import StripeService


async def main():
    print("=" * 80)
    print("DETAILED MRR ANALYSIS")
    print("=" * 80)
    print()

    # Get all subscriptions
    print("Fetching subscriptions from Stripe API...")
    all_subs = await StripeService.get_active_subscriptions()
    print(f"Total active subscriptions: {len(all_subs)}")
    print()

    # Analyze subscription amounts
    print("SUBSCRIPTION BREAKDOWN")
    print("-" * 80)

    zero_subs = []
    paying_subs = []
    amount_ranges = Counter()

    for sub in all_subs:
        sub_total = 0
        for item in sub["items"]:
            amount = item["amount"] / 100  # Convert to dollars
            sub_total += amount

        if sub_total == 0:
            zero_subs.append(sub)
        else:
            paying_subs.append({
                "id": sub["id"],
                "customer": sub["customer"],
                "amount": sub_total,
                "interval": sub["items"][0]["interval"] if sub["items"] else "unknown"
            })

            # Categorize by amount range
            if sub_total < 100:
                amount_ranges["$0-$99"] += 1
            elif sub_total < 500:
                amount_ranges["$100-$499"] += 1
            elif sub_total < 1000:
                amount_ranges["$500-$999"] += 1
            elif sub_total < 5000:
                amount_ranges["$1K-$4.9K"] += 1
            else:
                amount_ranges["$5K+"] += 1

    print(f"$0 subscriptions (trials/free):  {len(zero_subs)}")
    print(f"Paying subscriptions:             {len(paying_subs)}")
    print()

    # Show amount distribution
    print("AMOUNT DISTRIBUTION")
    print("-" * 80)
    for range_label, count in sorted(amount_ranges.items()):
        print(f"{range_label:15} {count:3} subscriptions")
    print()

    # Show top 10 subscriptions by amount
    print("TOP 10 SUBSCRIPTIONS BY AMOUNT")
    print("-" * 80)
    paying_subs_sorted = sorted(paying_subs, key=lambda x: x["amount"], reverse=True)

    total_top_10 = 0
    for i, sub in enumerate(paying_subs_sorted[:10], 1):
        monthly_amount = sub["amount"]
        interval = sub["interval"]

        # Normalize to monthly for display
        if interval == "year":
            display_amount = monthly_amount / 12
            display_note = f"(${monthly_amount:,.2f}/year → ${display_amount:,.2f}/month)"
        elif interval == "month":
            display_amount = monthly_amount
            display_note = f"(${monthly_amount:,.2f}/month)"
        else:
            display_amount = monthly_amount
            display_note = f"({interval})"

        print(f"{i:2}. {sub['customer']:20} ${display_amount:>10,.2f}/mo {display_note}")
        total_top_10 += display_amount

    print(f"\nTop 10 represent ${total_top_10:,.2f}/month of MRR")
    print()

    # Calculate actual MRR
    print("MRR CALCULATION")
    print("-" * 80)

    total_mrr = await StripeService.calculate_mrr(all_subs)
    print(f"Total MRR (all subscriptions):    ${total_mrr:,.2f}")

    # Calculate average
    if paying_subs:
        avg_amount = sum(s["amount"] for s in paying_subs) / len(paying_subs)
        print(f"Average subscription amount:      ${avg_amount:,.2f}")
        print(f"Number of paying customers:       {len(paying_subs)}")
        print(f"Average MRR per customer:         ${total_mrr / len(paying_subs):,.2f}")
    print()

    # Check if there are any outliers
    print("POTENTIAL ISSUES")
    print("-" * 80)

    outliers = [s for s in paying_subs if s["amount"] > 5000]
    if outliers:
        print(f"⚠️  {len(outliers)} subscriptions over $5,000/month:")
        for sub in outliers:
            print(f"   - {sub['customer']}: ${sub['amount']:,.2f}/{sub['interval']}")
        print()

    # Check for duplicates
    customer_counts = Counter(s["customer"] for s in paying_subs)
    multi_subs = {cust: count for cust, count in customer_counts.items() if count > 1}

    if multi_subs:
        print(f"⚠️  {len(multi_subs)} customers with multiple subscriptions:")
        for customer, count in sorted(multi_subs.items(), key=lambda x: x[1], reverse=True)[:5]:
            cust_subs = [s for s in paying_subs if s["customer"] == customer]
            total = sum(s["amount"] for s in cust_subs)
            print(f"   - {customer}: {count} subs = ${total:,.2f}/month")
        print()

    # Compare to Stripe dashboard ($69K)
    print("COMPARISON TO STRIPE DASHBOARD")
    print("-" * 80)
    stripe_dashboard_mrr = 69592.78
    difference = total_mrr - stripe_dashboard_mrr
    diff_pct = (difference / stripe_dashboard_mrr * 100)

    print(f"Stripe Dashboard MRR:             ${stripe_dashboard_mrr:,.2f}")
    print(f"Backend Calculated MRR:           ${total_mrr:,.2f}")
    print(f"Difference:                       ${difference:,.2f} ({diff_pct:+.1f}%)")
    print()

    if abs(diff_pct) > 50:
        print("⚠️  SIGNIFICANT DISCREPANCY DETECTED")
        print()
        print("Possible causes:")
        print("1. Subscriptions have annual pricing being double-counted")
        print("2. Multiple subscription items per customer being summed")
        print("3. Stripe dashboard applies additional filters")
        print("4. Currency conversion or proration issues")
        print()
        print("Recommendation: Review top 10 subscriptions above for anomalies")

    print()
    print("=" * 80)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nAnalysis cancelled")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Analysis failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

