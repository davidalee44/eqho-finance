#!/usr/bin/env python3
"""Check a specific subscription's calculation"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.services.stripe_service import StripeService
import stripe
from app.core.config import settings

stripe.api_key = settings.STRIPE_SECRET_KEY


async def check_subscription(sub_id):
    """Check detailed calculation for a subscription"""
    
    # Fetch the subscription directly from Stripe
    sub = stripe.Subscription.retrieve(sub_id)
    
    print(f"\nSubscription: {sub.id}")
    print(f"Customer: {sub.customer}")
    print(f"Status: {sub.status}")
    print(f"Items ({len(sub['items'].data)}):")
    
    total_monthly = 0
    for item in sub["items"].data:
        price = item.price
        amount = price.unit_amount / 100
        interval = price.recurring.interval if price.recurring else "one_time"
        interval_count = price.recurring.interval_count if price.recurring else 1
        
        print(f"\n  Price: {price.id}")
        print(f"  Amount: ${amount:,.2f}")
        print(f"  Interval: {interval}")
        print(f"  Interval Count: {interval_count}")
        
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
        
        print(f"  → Monthly MRR: ${monthly:,.2f}")
        total_monthly += monthly
    
    print(f"\nTotal MRR for this subscription: ${total_monthly:,.2f}")
    return total_monthly


async def main():
    print("Checking suspicious high-value subscriptions...")
    
    # Check the $20K subscription
    await check_subscription("sub_1SSnUWCyexzwFObx2wosNQdd")
    
    # Get top 3 by visual inspection
    all_subs = await StripeService.get_active_subscriptions()
    
    # Find subscriptions with high amounts
    high_value = []
    for sub in all_subs:
        total = sum(item["amount"] / 100 for item in sub["items"])
        if total > 3000:
            high_value.append((sub["id"], total))
    
    print(f"\n\nFound {len(high_value)} subscriptions over $3K:")
    for sub_id, amount in sorted(high_value, key=lambda x: x[1], reverse=True)[:3]:
        print(f"\n{'='*60}")
        await check_subscription(sub_id)


if __name__ == "__main__":
    asyncio.run(main())

