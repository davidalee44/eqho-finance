#!/usr/bin/env python3
"""
Deep Dive into $2,391 Subscriptions

Checks actual Stripe subscription and price details to verify
if these are truly monthly or potentially quarterly.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import stripe
from app.core.config import settings
from rich.console import Console
from rich.table import Table

stripe.api_key = settings.STRIPE_SECRET_KEY
console = Console()


async def investigate_2391_subscriptions():
    console.print("\n[bold]Deep Dive: $2,391 Subscriptions[/bold]")
    console.print("=" * 80)
    console.print()
    
    # Find subscriptions around $2,391
    target_subs = []
    
    for sub in stripe.Subscription.list(status="active", limit=200).auto_paging_iter():
        for item in sub["items"].data:
            amount = item.price.unit_amount / 100
            if 2390 <= amount <= 2392:
                target_subs.append({
                    "subscription": sub,
                    "item": item
                })
                break
        
        if len(target_subs) >= 3:  # Check first 3
            break
    
    console.print(f"Found {len(target_subs)} subscriptions at $2,391")
    console.print()
    
    # Examine each one in detail
    for i, data in enumerate(target_subs, 1):
        sub = data["subscription"]
        item = data["item"]
        price = item.price
        
        console.print(f"[bold cyan]Subscription {i}: {sub.id}[/bold cyan]")
        console.print(f"Customer: {sub.customer}")
        console.print()
        
        # Price details
        console.print("Price Details:")
        console.print(f"  Price ID: {price.id}")
        console.print(f"  Amount: ${price.unit_amount / 100:,.2f}")
        console.print(f"  Currency: {price.currency.upper()}")
        console.print()
        
        # Recurring details
        if price.recurring:
            rec = price.recurring
            console.print("Billing Cycle:")
            console.print(f"  Interval: {rec.interval}")
            console.print(f"  Interval Count: {rec.interval_count}")
            console.print(f"  → Charged: ${price.unit_amount / 100:,.2f} every {rec.interval_count} {rec.interval}(s)")
            
            # Calculate what this means
            if rec.interval == "month" and rec.interval_count == 1:
                console.print(f"  ✓ This is MONTHLY billing")
                console.print(f"  → Customer pays ${price.unit_amount / 100:,.2f} every month")
                console.print(f"  → Annual: ${price.unit_amount / 100 * 12:,.2f}")
                monthly_mrr = price.unit_amount / 100
            elif rec.interval == "month" and rec.interval_count == 3:
                console.print(f"  ⚠️  This is QUARTERLY billing")
                console.print(f"  → Customer pays ${price.unit_amount / 100:,.2f} every 3 months")
                console.print(f"  → Annual: ${price.unit_amount / 100 * 4:,.2f}")
                console.print(f"  → MRR should be: ${price.unit_amount / 100 / 3:,.2f}")
                monthly_mrr = price.unit_amount / 100 / 3
            elif rec.interval == "year":
                console.print(f"  ⚠️  This is ANNUAL billing")
                console.print(f"  → Customer pays ${price.unit_amount / 100:,.2f} once per year")
                console.print(f"  → MRR should be: ${price.unit_amount / 100 / 12:,.2f}")
                monthly_mrr = price.unit_amount / 100 / 12
            else:
                console.print(f"  → {rec.interval} billing")
                monthly_mrr = price.unit_amount / 100
            
            console.print(f"\n  [bold green]Correct MRR: ${monthly_mrr:,.2f}/month[/bold green]")
        
        # Check product name for clues
        try:
            product = stripe.Product.retrieve(price.product)
            console.print(f"\nProduct:")
            console.print(f"  Name: {product.name}")
            console.print(f"  Description: {product.description or 'N/A'}")
        except:
            pass
        
        # Billing thresholds
        console.print(f"\nNext Billing:")
        console.print(f"  Start: {sub.current_period_start}")
        console.print(f"  End: {sub.current_period_end}")
        
        from datetime import datetime
        next_date = datetime.fromtimestamp(sub.current_period_end)
        console.print(f"  Next Invoice: {next_date.strftime('%B %d, %Y')}")
        
        console.print()
        console.print("-" * 80)
        console.print()
    
    # Summary
    console.print("[bold]SUMMARY[/bold]")
    console.print("=" * 80)
    
    # Count by interval_count
    monthly_count = sum(1 for k, v in interval_details.items() if "Monthly" in k or "every 1 month" in k)
    quarterly_count = sum(1 for k, v in interval_details.items() if "Quarterly" in k or "every 3 month" in k)
    
    console.print(f"Monthly subscriptions (interval_count=1):    {monthly_count}")
    console.print(f"Quarterly subscriptions (interval_count=3):  {quarterly_count}")
    console.print()
    
    if quarterly_count > 0:
        console.print("[bold red]⚠️  QUARTERLY SUBSCRIPTIONS FOUND![/bold red]")
        console.print()
        console.print("If customers at $2,391 are quarterly:")
        console.print(f"  Current MRR calc: ${2391 * quarterly_count:,.2f}")
        console.print(f"  Correct MRR calc: ${(2391 / 3) * quarterly_count:,.2f}")
        console.print(f"  Overcounting by:  ${(2391 * 2/3) * quarterly_count:,.2f}")
        console.print()
        console.print("The MRR calculation already handles this correctly!")
        console.print("(See stripe_service.py line 127: mrr += amount / interval_count)")
    else:
        console.print("[bold green]✓ All subscriptions are genuinely monthly (interval_count=1)[/bold green]")
        console.print()
        console.print("The $2,391/month pricing appears to be a standard tier.")
    
    console.print()


if __name__ == "__main__":
    asyncio.run(investigate_2391_subscriptions())

