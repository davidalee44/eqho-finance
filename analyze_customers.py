#!/usr/bin/env python3
"""
Analyze Stripe customer data for TowPilot/Eqho
- Filter out test customers (eqho.ai emails)
- Identify active subscriptions
- Calculate MRR by product tier
- Flag anomalies
"""

import csv
from collections import defaultdict
from datetime import datetime

# Load data
customers = []
with open('/Users/davidlee/eqho-due-diligence/unified_customers.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        customers.append(row)

print(f"Total records in CSV: {len(customers)}")
print("=" * 80)

# Identify test/internal customers (eqho.ai emails)
test_customers = []
real_customers = []

for c in customers:
    email = c.get('Email', '').lower()
    name = c.get('Name', '').lower()

    # Flag as test if eqho.ai email
    if '@eqho.ai' in email:
        test_customers.append(c)
    else:
        real_customers.append(c)

print(f"\n### TEST/INTERNAL CUSTOMERS (eqho.ai) - EXCLUDED ###")
print(f"Count: {len(test_customers)}")
for c in test_customers:
    status = c.get('Status', 'N/A')
    plan = c.get('Plan', 'N/A')
    print(f"  - {c.get('Email')} | {c.get('Name')} | Status: {status} | Plan: {plan}")

print("\n" + "=" * 80)

# Now analyze real customers
print(f"\n### REAL CUSTOMERS ###")
print(f"Total real customers: {len(real_customers)}")

# Categorize by subscription status
active_subs = []
canceled_subs = []
no_subscription = []

for c in real_customers:
    status = c.get('Status', '').strip().lower()
    plan = c.get('Plan', '').strip()

    if status == 'active':
        active_subs.append(c)
    elif status in ['canceled', 'cancelled']:
        canceled_subs.append(c)
    elif plan:  # Has a plan but status is something else
        canceled_subs.append(c)
    else:
        no_subscription.append(c)

print(f"Active subscriptions: {len(active_subs)}")
print(f"Canceled subscriptions: {len(canceled_subs)}")
print(f"No subscription: {len(no_subscription)}")

# Analyze active subscriptions by price/plan
print("\n" + "=" * 80)
print("\n### ACTIVE SUBSCRIPTIONS BREAKDOWN ###")

# Group by plan (price ID)
plan_groups = defaultdict(list)
for c in active_subs:
    plan = c.get('Plan', 'Unknown')
    plan_groups[plan].append(c)

# Known price mappings based on the data
price_names = {
    'price_1SKMzCCyexzwFObxv65F5GUv': 'TowPilot Standard ($249.50/mo)',
    'price_1SUrjACyexzwFObxUumWZrrV': 'TowPilot Pro ($299/mo)',
    'price_1PLp1XCyexzwFObxkRFlxkM8': 'TowPilot Free/Trial ($0)',
    'price_1ST2qZCyexzwFObxfZLH2Jiy': 'TowPilot Enterprise ($999/mo)',
    'price_1SXP8OCyexzwFObxc2qDkDox': 'TowPilot ($349/mo)',
    'price_1SRz7ICyexzwFObxuPbvSqEI': 'One-time ($100)',
    'price_1SSKL5CyexzwFObxuJjbhDmn': 'Unknown Plan',
    'price_1SSgk2CyexzwFObxPmEQvlYV': 'TowPilot Premium ($399.50/mo)',
    'price_1SG1E1CyexzwFObxQxcCPPh1': 'TowPilot ($497/mo)',
    'price_1SVcFkCyexzwFObxKxP1NPsW': 'TowPilot ($201/mo)',
    'price_1ST30FCyexzwFObxCcB9hOH7': 'TowPilot ($699/mo)',
    'price_1SVay6CyexzwFObxlLCQCSle': 'TowPilot ($199.50/mo)',
    'price_1SIKGHCyexzwFObxYlUh4Rmb': 'TowPilot ($348.50/mo - first payment $697)',
}

# Estimate monthly prices based on Total Spend / Payment Count
def estimate_monthly(c):
    total = float(c.get('Total Spend', '0').replace(',', '') or 0)
    payments = int(c.get('Payment Count', '0') or 0)
    avg = float(c.get('Average Order', '0').replace(',', '') or 0)
    return avg if avg > 0 else (total / payments if payments > 0 else 0)

print("\nActive customers by plan:")
total_mrr = 0
enterprise_mrr = 0
standard_mrr = 0

for plan, custs in sorted(plan_groups.items(), key=lambda x: -len(x[1])):
    plan_name = price_names.get(plan, f'Unknown ({plan})')
    print(f"\n{plan_name}")
    print(f"  Customers: {len(custs)}")

    plan_mrr = 0
    for c in custs:
        monthly = estimate_monthly(c)
        cancel_at_period_end = c.get('Cancel At Period End', '').lower() == 'true'
        cancel_flag = " ⚠️ CANCELING" if cancel_at_period_end else ""

        print(f"    - {c.get('Name')} ({c.get('Email')}) - ${monthly:.2f}/mo{cancel_flag}")

        if not cancel_at_period_end:
            plan_mrr += monthly

    print(f"  Plan MRR: ${plan_mrr:.2f}")
    total_mrr += plan_mrr

print("\n" + "=" * 80)
print(f"\n### TOTAL MRR (Active, Non-Canceling): ${total_mrr:.2f}")

# Enterprise vs Standard breakdown
print("\n" + "=" * 80)
print("\n### CUSTOMER TIERS ###")

enterprise_threshold = 500  # Monthly spend > $500 = enterprise
enterprise_customers = []
standard_customers = []

for c in active_subs:
    monthly = estimate_monthly(c)
    cancel_at_period_end = c.get('Cancel At Period End', '').lower() == 'true'

    if monthly >= enterprise_threshold:
        enterprise_customers.append((c, monthly, cancel_at_period_end))
    else:
        standard_customers.append((c, monthly, cancel_at_period_end))

print(f"\nEnterprise Tier (>${enterprise_threshold}/mo):")
enterprise_mrr = 0
for c, monthly, canceling in enterprise_customers:
    flag = " ⚠️ CANCELING" if canceling else ""
    print(f"  - {c.get('Name')} ({c.get('Email')}) - ${monthly:.2f}/mo{flag}")
    if not canceling:
        enterprise_mrr += monthly
print(f"  Enterprise MRR: ${enterprise_mrr:.2f}")

print(f"\nStandard Tier (<${enterprise_threshold}/mo):")
standard_mrr = 0
for c, monthly, canceling in standard_customers:
    flag = " ⚠️ CANCELING" if canceling else ""
    print(f"  - {c.get('Name')} ({c.get('Email')}) - ${monthly:.2f}/mo{flag}")
    if not canceling:
        standard_mrr += monthly
print(f"  Standard MRR: ${standard_mrr:.2f}")

# Anomalies: customers with payments but no active subscription
print("\n" + "=" * 80)
print("\n### ANOMALIES: Payments but No Active Subscription ###")

anomalies = []
for c in real_customers:
    status = c.get('Status', '').strip().lower()
    total_spend = float(c.get('Total Spend', '0').replace(',', '') or 0)
    payment_count = int(c.get('Payment Count', '0') or 0)

    # Has payments but not active
    if total_spend > 0 and status != 'active':
        anomalies.append(c)

if anomalies:
    for c in anomalies:
        print(f"  - {c.get('Name')} ({c.get('Email')})")
        print(f"    Status: {c.get('Status') or 'None'} | Total Spend: ${c.get('Total Spend')} | Payments: {c.get('Payment Count')}")
        print(f"    Created: {c.get('Created (UTC)')}")
else:
    print("  None found")

# Recent signups without subscription
print("\n" + "=" * 80)
print("\n### RECENT SIGNUPS WITHOUT SUBSCRIPTION (Last 30 days) ###")

from datetime import datetime, timedelta
cutoff = datetime.now() - timedelta(days=30)

recent_no_sub = []
for c in no_subscription:
    created_str = c.get('Created (UTC)', '')
    if created_str:
        try:
            created = datetime.strptime(created_str[:10], '%Y-%m-%d')
            if created >= cutoff:
                recent_no_sub.append((c, created))
        except:
            pass

if recent_no_sub:
    for c, created in sorted(recent_no_sub, key=lambda x: x[1], reverse=True):
        print(f"  - {c.get('Name')} ({c.get('Email')}) - Created: {created.strftime('%Y-%m-%d')}")
else:
    print("  None found")

# Summary
print("\n" + "=" * 80)
print("\n### SUMMARY ###")
print(f"Total records: {len(customers)}")
print(f"Test/Internal (excluded): {len(test_customers)}")
print(f"Real customers: {len(real_customers)}")
print(f"  - Active subscriptions: {len(active_subs)}")
print(f"  - Canceled: {len(canceled_subs)}")
print(f"  - No subscription: {len(no_subscription)}")
print(f"\nEnterprise customers: {len(enterprise_customers)}")
print(f"Standard customers: {len(standard_customers)}")
print(f"\nTotal MRR: ${total_mrr:.2f}")
print(f"  - Enterprise MRR: ${enterprise_mrr:.2f}")
print(f"  - Standard MRR: ${standard_mrr:.2f}")
