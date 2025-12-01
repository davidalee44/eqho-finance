#!/usr/bin/env python3
"""
Analyze what will be collected this week (Dec 1-7, 2025)
Based on active subscriptions and their billing patterns
"""

import csv
from datetime import datetime, timedelta
from collections import defaultdict

# Load data
customers = []
with open('/Users/davidlee/eqho-due-diligence/unified_customers.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        customers.append(row)

# Filter to active, non-test customers
active_paying = []
for c in customers:
    email = c.get('Email', '').lower()
    status = c.get('Status', '').strip().lower()

    # Skip test accounts
    if '@eqho.ai' in email:
        continue

    # Only active subscriptions
    if status == 'active':
        active_paying.append(c)

print(f"Active paying customers: {len(active_paying)}")
print("=" * 80)

# The problem: we don't have "next billing date" in this export
# But we can estimate based on:
# 1. Created date (first billing)
# 2. Payment patterns (monthly billing cycles)

# Let's look at what we DO have
print("\nAnalyzing billing patterns...")
print("\nSample of active customers with payment data:\n")

today = datetime(2025, 12, 1)
week_end = today + timedelta(days=7)

def estimate_monthly(c):
    total = float(c.get('Total Spend', '0').replace(',', '') or 0)
    payments = int(c.get('Payment Count', '0') or 0)
    avg = float(c.get('Average Order', '0').replace(',', '') or 0)
    return avg if avg > 0 else (total / payments if payments > 0 else 0)

# For monthly subscriptions, billing typically occurs on the same day each month
# as the original signup. Let's estimate based on created date.

likely_this_week = []
total_expected = 0

for c in active_paying:
    created_str = c.get('Created (UTC)', '')
    if not created_str:
        continue

    try:
        created = datetime.strptime(created_str[:10], '%Y-%m-%d')
    except:
        continue

    # Get the day of month they signed up
    signup_day = created.day

    # Check if their billing day falls this week (Dec 1-7)
    # Also account for customers who signed up on days 29-31 might bill on 28th or last day
    billing_day = min(signup_day, 28)  # Cap at 28 for safety

    cancel_at_period_end = c.get('Cancel At Period End', '').lower() == 'true'
    monthly = estimate_monthly(c)

    # This week is Dec 1-7, so billing days 1-7 would be collected
    if 1 <= billing_day <= 7:
        likely_this_week.append({
            'name': c.get('Name'),
            'email': c.get('Email'),
            'billing_day': billing_day,
            'monthly': monthly,
            'canceling': cancel_at_period_end,
            'created': created_str[:10],
            'plan': c.get('Plan', 'Unknown')
        })
        if not cancel_at_period_end:
            total_expected += monthly

# Sort by billing day
likely_this_week.sort(key=lambda x: x['billing_day'])

print(f"\nCustomers likely billing Dec 1-7 (based on signup day of month):\n")
print(f"{'Day':<4} {'Name':<40} {'Monthly':<12} {'Status'}")
print("-" * 80)

for c in likely_this_week:
    status = "⚠️ CANCELING" if c['canceling'] else "Active"
    print(f"{c['billing_day']:<4} {c['name'][:38]:<40} ${c['monthly']:>8.2f}   {status}")

print("-" * 80)
print(f"\nExpected collections this week: ${total_expected:,.2f}")
print(f"(Excludes {sum(1 for c in likely_this_week if c['canceling'])} canceling customers)")

# Also show customers with $0 average (might be free trials or setup issues)
zero_avg = [c for c in likely_this_week if c['monthly'] == 0]
if zero_avg:
    print(f"\n⚠️  {len(zero_avg)} customers show $0 average - may be free trials or data issues:")
    for c in zero_avg:
        print(f"   - {c['name']} ({c['email']})")

# Past due customers who might pay this week
print("\n" + "=" * 80)
print("\nPAST DUE - Potential recovery this week:")
print("-" * 80)

past_due_total = 0
for c in customers:
    email = c.get('Email', '').lower()
    status = c.get('Status', '').strip().lower()

    if '@eqho.ai' in email:
        continue

    if status == 'past_due':
        monthly = estimate_monthly(c)
        total_spend = float(c.get('Total Spend', '0').replace(',', '') or 0)
        payments = int(c.get('Payment Count', '0') or 0)
        print(f"  {c.get('Name'):<40} ${monthly:>8.2f}/mo  (paid ${total_spend:.0f} over {payments} payments)")
        past_due_total += monthly

print(f"\nPast due MRR if recovered: ${past_due_total:,.2f}")

# Summary
print("\n" + "=" * 80)
print("\nTHIS WEEK COLLECTION SUMMARY")
print("=" * 80)
print(f"Expected from billing cycle (Dec 1-7):    ${total_expected:>10,.2f}")
print(f"Potential recovery (past due):            ${past_due_total:>10,.2f}")
print(f"                                          -----------")
print(f"Best case total:                          ${total_expected + past_due_total:>10,.2f}")
