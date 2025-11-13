#!/usr/bin/env python3
"""
Check Subscription Intervals

Investigate if customers are billed quarterly (interval_count=3) 
rather than monthly (interval_count=1)
"""

import asyncio
import sys
from pathlib import Path
from collections import Counter

sys.path.insert(0, str(Path(__file__).parent))

from app.services.stripe_service import StripeService
import stripe
from app.core.config import settings

stripe.api_key = settings.STRIPE_SECRET_KEY


async def main():
    print("=" * 80)
    print("SUBSCRIPTION INTERVAL ANALYSIS")
    print("=" * 80)
    print()
    
    # Get subscriptions
    all_subs = await StripeService.get_active_subscriptions()
    
    print(f"Total subscriptions: {len(all_subs)}")
    print()
    
    # Analyze intervals
    print("INTERVAL BREAKDOWN")
    print("-" * 80)
    
    interval_details = Counter()
    customers_by_interval = {}
    
    for sub in all_subs:
        for item in sub["items"]:
            amount = item["amount"] / 100
            
            if amount == 0:
                continue
            
            interval = item["interval"]
            interval_count = item.get("interval_count", 1)
            
            # Create key
            if interval == "month":
                if interval_count == 1:
                    key = "Monthly"
                elif interval_count == 3:
                    key = "Quarterly (every 3 months)"
                elif interval_count == 6:
                    key = "Semi-annual (every 6 months)"
                elif interval_count == 12:
                    key = "Annual (billed as months)"
                else:
                    key = f"Every {interval_count} months"
            elif interval == "year":
                key = "Annual (billed yearly)"
            elif interval == "week":
                key = f"Weekly (every {interval_count} week(s))"
            elif interval == "day":
                key = f"Daily (every {interval_count} day(s))"
            else:
                key = f"Unknown: {interval}"
            
            interval_details[key] += 1
            
            if key not in customers_by_interval:
                customers_by_interval[key] = []
            
            customers_by_interval[key].append({
                "customer": sub["customer"],
                "amount": amount,
                "interval": interval,
                "interval_count": interval_count,
                "mrr": amount / interval_count if interval == "month" else amount / 12
            })
    
    # Display breakdown
    for key, count in sorted(interval_details.items(), key=lambda x: x[1], reverse=True):
        customers = customers_by_interval[key]
        total_mrr = sum(c["mrr"] for c in customers)
        print(f"{key:35} {count:3} subs → ${total_mrr:>12,.2f} MRR")
    
    print()
    
    # Check for suspicious $2,391 amounts
    print("INVESTIGATING $2,391 SUBSCRIPTIONS")
    print("-" * 80)
    
    suspicious = []
    for sub in all_subs:
        for item in sub["items"]:
            amount = item["amount"] / 100
            
            if 2390 <= amount <= 2392:  # Around $2,391
                interval_count = item.get("interval_count", 1)
                suspicious.append({
                    "customer": sub["customer"],
                    "amount": amount,
                    "interval": item["interval"],
                    "interval_count": interval_count,
                    "charged_as": f"${amount:,.2f} every {interval_count} {item['interval']}(s)"
                })
    
    print(f"Found {len(suspicious)} subscriptions around $2,391:")
    print()
    
    # Group by interval_count
    by_count = Counter(s["interval_count"] for s in suspicious)
    for count, freq in sorted(by_count.items()):
        print(f"  interval_count={count}: {freq} customers")
    
    print()
    
    if suspicious:
        print("Sample customers:")
        for i, s in enumerate(suspicious[:5], 1):
            monthly_mrr = s["amount"] / s["interval_count"] if s["interval"] == "month" else s["amount"] / 12
            print(f"{i}. {s['customer']}")
            print(f"   Charged: {s['charged_as']}")
            print(f"   MRR: ${monthly_mrr:,.2f}/month")
            
            if s["interval_count"] == 3:
                print(f"   ⚠️  THIS IS QUARTERLY - Customer pays ${s['amount']:,.2f} every 3 months")
                print(f"      Annual: ${s['amount'] * 4:,.2f}")
            print()
    
    # Recalculate MRR if quarterly
    print("=" * 80)
    print("MRR IMPACT IF QUARTERLY")
    print("=" * 80)
    
    quarterly_subs = [s for s in suspicious if s["interval_count"] == 3]
    
    if quarterly_subs:
        # Current calculation treats as monthly
        wrong_mrr = sum(s["amount"] for s in quarterly_subs)
        
        # Correct calculation (quarterly)
        correct_mrr = sum(s["amount"] / 3 for s in quarterly_subs)
        
        difference = wrong_mrr - correct_mrr
        
        print(f"If {len(quarterly_subs)} customers are quarterly:")
        print(f"  Current MRR (treating as monthly):  ${wrong_mrr:,.2f}")
        print(f"  Correct MRR (quarterly):            ${correct_mrr:,.2f}")
        print(f"  Overcounting by:                    ${difference:,.2f}")
        print()
        print(f"  Adjusted Total MRR: ${145257 - difference:,.2f}")
        print()
    else:
        print("No quarterly subscriptions detected with interval_count=3")
        print("All $2,391 subscriptions appear to be monthly.")
    
    print()


if __name__ == "__main__":
    asyncio.run(main())

