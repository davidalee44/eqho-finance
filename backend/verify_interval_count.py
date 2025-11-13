#!/usr/bin/env python3
"""
Verify interval_count is being captured from Stripe API

Checks if get_active_subscriptions() is properly capturing interval_count field.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.services.stripe_service import StripeService


async def main():
    print("=" * 80)
    print("VERIFYING INTERVAL_COUNT CAPTURE")
    print("=" * 80)
    print()
    
    # Get subscriptions using our service
    all_subs = await StripeService.get_active_subscriptions()
    
    # Find $2,391 subscriptions
    quarterly_subs = []
    
    for sub in all_subs:
        for item in sub["items"]:
            amount = item["amount"] / 100
            
            if 2390 <= amount <= 2392:
                print(f"Found $2,391 subscription:")
                print(f"  Customer: {sub['customer']}")
                print(f"  Amount: ${amount:,.2f}")
                print(f"  Interval: {item['interval']}")
                print(f"  Interval Count: {item.get('interval_count', 'MISSING!')}")
                print()
                
                interval_count = item.get("interval_count", 1)
                
                if interval_count == 3:
                    correct_mrr = amount / 3
                    wrong_mrr = amount
                    print(f"  ⚠️  QUARTERLY - interval_count=3")
                    print(f"  Correct MRR: ${correct_mrr:,.2f}")
                    print(f"  If treated as monthly: ${wrong_mrr:,.2f}")
                    print(f"  Overcounting by: ${wrong_mrr - correct_mrr:,.2f}")
                    quarterly_subs.append({
                        "customer": sub["customer"],
                        "amount": amount,
                        "correct_mrr": correct_mrr,
                        "wrong_mrr": wrong_mrr
                    })
                elif interval_count == 1:
                    print(f"  ✓ MONTHLY - interval_count=1")
                    print(f"  MRR: ${amount:,.2f}")
                else:
                    print(f"  ? interval_count={interval_count}")
                
                print("-" * 80)
                print()
    
    # Calculate impact
    if quarterly_subs:
        print()
        print("=" * 80)
        print("IMPACT ON TOTAL MRR")
        print("=" * 80)
        
        wrong_total = sum(s["wrong_mrr"] for s in quarterly_subs)
        correct_total = sum(s["correct_mrr"] for s in quarterly_subs)
        overcount = wrong_total - correct_total
        
        print(f"Found {len(quarterly_subs)} quarterly subscriptions")
        print()
        print(f"If treated as monthly MRR:  ${wrong_total:,.2f}")
        print(f"Correct quarterly MRR:      ${correct_total:,.2f}")
        print(f"Overcounting by:            ${overcount:,.2f}")
        print()
        print(f"Current Total MRR:  $145,257.00")
        print(f"Corrected Total MRR: ${145257 - overcount:,.2f}")
        print()
        print("=" * 80)
        print()
        
        if overcount > 10000:
            print("[bold red]⚠️  SIGNIFICANT ERROR FOUND![/bold red]")
            print()
            print(f"We're overcounting MRR by ${overcount:,.2f} due to quarterly subscriptions")
            print("being treated as monthly.")
            print()
            print("Check if stripe_service.py:127 is properly dividing by interval_count")
        else:
            print("✓ MRR calculation appears correct")
            print(f"  (Overcounting is ${overcount:,.2f}, likely already handled)")
    else:
        print("No quarterly subscriptions found")


if __name__ == "__main__":
    asyncio.run(main())

