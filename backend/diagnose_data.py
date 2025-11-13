#!/usr/bin/env python3
"""
Data Diagnostic Script

Identifies filtering issues and data availability across Supabase and Stripe.
Run this to diagnose why backend metrics return $0 when Stripe shows $69K MRR.
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from app.services.stripe_service import StripeService
from app.services.supabase_service import SupabaseService


async def main():
    print("=" * 70)
    print("DATA DIAGNOSTIC REPORT")
    print("=" * 70)
    print()

    # Section 1: Supabase Connectivity
    print("1. SUPABASE CONNECTION")
    print("-" * 70)
    SupabaseService.connect()
    
    if SupabaseService.client:
        print("✓ Connected to Supabase successfully")
    else:
        print("✗ Failed to connect to Supabase")
    print()

    # Section 2: Supabase Table Contents
    print("2. SUPABASE TABLE DATA")
    print("-" * 70)
    
    if SupabaseService.client:
        # Check stripe_subscriptions table
        try:
            all_subs = SupabaseService.get_active_subscriptions()
            print(f"   stripe_subscriptions (all):      {len(all_subs)} records")
            
            towpilot_subs = SupabaseService.get_active_subscriptions(product_category="TowPilot")
            print(f"   stripe_subscriptions (TowPilot): {len(towpilot_subs)} records")
            
            if all_subs:
                # Show sample data structure
                print(f"\n   Sample subscription fields:")
                sample = all_subs[0]
                for key in sample.keys():
                    print(f"   - {key}: {type(sample[key]).__name__}")
            else:
                print("   ⚠️  Table is empty - no subscriptions found")
        except Exception as e:
            print(f"   ✗ Error querying stripe_subscriptions: {e}")
        
        # Check stripe_customers table
        try:
            customers = SupabaseService.get_customers()
            print(f"\n   stripe_customers:                {len(customers)} records")
        except Exception as e:
            print(f"\n   ✗ Error querying stripe_customers: {e}")
    else:
        print("   Skipped (no connection)")
    print()

    # Section 3: Stripe API Direct Access
    print("3. STRIPE API (DIRECT)")
    print("-" * 70)
    
    try:
        # Get all subscriptions
        stripe_subs = await StripeService.get_active_subscriptions()
        print(f"   Active subscriptions:            {len(stripe_subs)}")
        
        # Calculate MRR
        stripe_mrr = await StripeService.calculate_mrr(stripe_subs)
        print(f"   Total MRR:                       ${stripe_mrr:,.2f}")
        
        # Get unique customer count
        unique_customers = len(set(s["customer"] for s in stripe_subs))
        print(f"   Unique customers:                {unique_customers}")
        
        # Get TowPilot customers (with 'tow' tag)
        towpilot_customers = await StripeService.get_all_customers(has_tag="tow")
        print(f"   TowPilot customers (tag='tow'):  {len(towpilot_customers)}")
        
        if towpilot_customers:
            tp_customer_ids = [c["id"] for c in towpilot_customers]
            tp_subs = await StripeService.get_active_subscriptions(customer_ids=tp_customer_ids)
            tp_mrr = await StripeService.calculate_mrr(tp_subs)
            print(f"   TowPilot subscriptions:          {len(tp_subs)}")
            print(f"   TowPilot MRR:                    ${tp_mrr:,.2f}")
        
        # Show sample subscription
        if stripe_subs:
            print(f"\n   Sample subscription structure:")
            sample = stripe_subs[0]
            print(f"   - id: {sample['id']}")
            print(f"   - customer: {sample['customer']}")
            print(f"   - status: {sample['status']}")
            print(f"   - items: {len(sample['items'])} price(s)")
            if sample['items']:
                item = sample['items'][0]
                print(f"     - amount: ${item['amount']/100:.2f}")
                print(f"     - interval: {item['interval']}")
    
    except Exception as e:
        print(f"   ✗ Error accessing Stripe API: {e}")
    print()

    # Section 4: Diagnosis
    print("4. DIAGNOSIS")
    print("-" * 70)
    
    if SupabaseService.client:
        supabase_empty = len(SupabaseService.get_active_subscriptions()) == 0
    else:
        supabase_empty = True
    
    stripe_has_data = len(stripe_subs) > 0 if 'stripe_subs' in locals() else False
    
    if supabase_empty and stripe_has_data:
        print("   Issue: Supabase tables are empty, but Stripe has data")
        print("   ")
        print("   Cause: No sync has been run from Stripe → Supabase")
        print("   ")
        print("   Solution Options:")
        print("   1. Use Stripe API directly (RECOMMENDED - already implemented)")
        print("      - backend/app/services/metrics_calculator.py now uses StripeService")
        print("      - No Supabase sync required")
        print("   ")
        print("   2. Populate Supabase tables (optional, for caching)")
        print("      - Run: cd scripts && node sync_stripe_to_supabase.js")
    elif not stripe_has_data:
        print("   Issue: No data in Stripe API")
        print("   Check: Stripe API credentials in .env file")
    else:
        print("   ✓ Data sources look healthy")
    
    print()
    print("=" * 70)
    print("END OF DIAGNOSTIC REPORT")
    print("=" * 70)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nDiagnostic cancelled")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Diagnostic failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
