#!/usr/bin/env python3
"""
Comprehensive SaaS KPI Analysis from Stripe Data
Segments: TowPilot vs Other Customers
"""

import json
from datetime import datetime
from collections import defaultdict

# All subscription data from Stripe
subscriptions = [
    {"id":"sub_1SSOptCyexzwFObxEomK37Wf","customer":"cus_TPDGtZT7czUKDo","status":"active","items":{"data":[{"id":"si_TPDGQJ58lyi8wo","price":{"id":"price_1PLp1XCyexzwFObxkRFlxkM8"},"quantity":1}]}},
    {"id":"sub_1SSKkfCyexzwFObxadz9XuAX","customer":"cus_Sqi0YxxOyJohzF","status":"active","items":{"data":[{"id":"si_TP92jICrxV8EJy","price":{"id":"price_1SQifFCyexzwFObxEjRmdhUU"},"quantity":1}]}},
    {"id":"sub_1SSKPyCyexzwFObxFFnrw5GD","customer":"cus_TJtouw9w4is11I","status":"active","items":{"data":[{"id":"si_TP8hKl2574ywfJ","price":{"id":"price_1SKMzCCyexzwFObxv65F5GUv"},"quantity":1}]}},
    {"id":"sub_1SSKO4CyexzwFObxC6pwOIzt","customer":"cus_TNKLep72SlVlPL","status":"active","items":{"data":[{"id":"si_TP8fbgkZ0PQkaS","price":{"id":"price_1SKMzCCyexzwFObxv65F5GUv"},"quantity":1}]}},
    {"id":"sub_1SSKMbCyexzwFObxzQo3hvQ6","customer":"cus_TP8bPxVynNoeoR","status":"active","items":{"data":[{"id":"si_TP8dO6s7qHmTIV","price":{"id":"price_1SSKL5CyexzwFObxuJjbhDmn"},"quantity":1}]}},
    {"id":"sub_1SSKG7CyexzwFObxhHVrYfEq","customer":"cus_TMuCmzE58xk8Ci","status":"active","items":{"data":[{"id":"si_TP8XByO3T3Eb07","price":{"id":"price_1SIKGHCyexzwFObxYlUh4Rmb"},"quantity":1}]}},
    {"id":"sub_1SS3GXCyexzwFObxb78NlxCc","customer":"cus_TNGvZ1faDiJ1oN","status":"active","items":{"data":[{"id":"si_TOqyEKszHLq0YJ","price":{"id":"price_1SIKGHCyexzwFObxYlUh4Rmb"},"quantity":1}]}},
    {"id":"sub_1SRz94CyexzwFObxPk9zB3JE","customer":"cus_TOmcnhVtUR9GDw","status":"active","items":{"data":[{"id":"si_TOmiVvJ86uCAnX","price":{"id":"price_1SRz7ICyexzwFObxuPbvSqEI"},"quantity":1}]}},
    {"id":"sub_1SQsMVCyexzwFObxJjUZKYQR","customer":"cus_TMX1T2Uw7g4Ytb","status":"active","items":{"data":[{"id":"si_TNddYPnmYmVwVS","price":{"id":"price_1SKMzCCyexzwFObxv65F5GUv"},"quantity":1}]}},
    {"id":"sub_1SQWb2CyexzwFObxURBWmgkm","customer":"cus_TGzQ7sirC7TlxU","status":"active","items":{"data":[{"id":"si_TNH9ESHeG9hgqb","price":{"id":"price_1SO0JsCyexzwFObx4kj4kYEN"},"quantity":1}]}},
    {"id":"sub_1SQEt3CyexzwFObxkMr1wxFV","customer":"cus_TMyqPxtFZOxDeP","status":"active","items":{"data":[{"id":"si_TMyqgDt5w36yyk","price":{"id":"price_1SG1E1CyexzwFObxQxcCPPh1"},"quantity":1}]}},
    {"id":"sub_1SQBm4CyexzwFObxjvoGkqwN","customer":"cus_TJZSEnpOBvASTt","status":"active","items":{"data":[{"id":"si_TMvdajbi9XdYi4","price":{"id":"price_1SKMzCCyexzwFObxv65F5GUv"},"quantity":1}]}},
    {"id":"sub_1SQ9icCyexzwFObxgiRymXEt","customer":"cus_TJshKOSvPptW9g","status":"active","items":{"data":[{"id":"si_TMtVlkTWcX47ek","price":{"id":"price_1SO0JsCyexzwFObx4kj4kYEN"},"quantity":1}]}},
    {"id":"sub_1SPoaFCyexzwFObxpXlZrcak","customer":"cus_TMXcntBEhHJfg6","status":"active","items":{"data":[{"id":"si_TMXfpCgxTLvSlG","price":{"id":"price_1SKMzCCyexzwFObxv65F5GUv"},"quantity":1}]}},
    {"id":"sub_1SPn2sCyexzwFObxK5NpiKr3","customer":"cus_TJabm2HUPKsgOd","status":"active","items":{"data":[{"id":"si_TMW5c6USp9iIXQ","price":{"id":"price_1SNxDqCyexzwFObx7uJNqM1N"},"quantity":1}]}},
    {"id":"sub_1SPn12CyexzwFObxw3oAViGV","customer":"cus_TL2A2ZN5ww0mAU","status":"active","items":{"data":[{"id":"si_TMW3l7mRQ8AGff","price":{"id":"price_1SO0JsCyexzwFObx4kj4kYEN"},"quantity":1}]}},
    {"id":"sub_1SPQjeCyexzwFObxEOEva233","customer":"cus_TM8zvqFy3SnAck","status":"active","items":{"data":[{"id":"si_TM91SCA6s2z1XK","price":{"id":"price_1SO0JsCyexzwFObx4kj4kYEN"},"quantity":1}]}},
    {"id":"sub_1SO0M6CyexzwFObxzkwDvfYv","customer":"cus_TKe4KyUdNWLhlc","status":"active","items":{"data":[{"id":"si_TKfhWTJGLamqgs","price":{"id":"price_1SO0JsCyexzwFObx4kj4kYEN"},"quantity":1}]}},
    {"id":"sub_1SO0ErCyexzwFObxTg0TpgAz","customer":"cus_TIPc83UyrlTkxW","status":"active","items":{"data":[{"id":"si_TKfaaYAGqzozn6","price":{"id":"price_1SO0CZCyexzwFObxnisjHmVY"},"quantity":1}]}},
    {"id":"sub_1SNyxGCyexzwFObx533r4y5Y","customer":"cus_THg0tIqq8PITej","status":"active","items":{"data":[{"id":"si_TKeFNMPtdqcBm9","price":{"id":"price_1SKMzCCyexzwFObxv65F5GUv"},"quantity":1}]}},
    {"id":"sub_1SNyD8CyexzwFObxjiYtKYO9","customer":"cus_TKJL50shqwFspE","status":"active","items":{"data":[{"id":"si_TKdUYuSAnyFEk7","price":{"id":"price_1SL4rXCyexzwFObxAvwean1Z"},"quantity":1}]}},
    {"id":"sub_1SNxG0CyexzwFObxvBXVK2FT","customer":"cus_TKIKfd7NBY1M2U","status":"active","items":{"data":[{"id":"si_TKcVa37UGRepMg","price":{"id":"price_1SNxDqCyexzwFObx7uJNqM1N"},"quantity":1}]}},
    {"id":"sub_1SNm6sCyexzwFObxfKkrYPir","customer":"cus_TKQyPdWUgu4yGt","status":"active","items":{"data":[{"id":"si_TKQytlmrjflPQR","price":{"id":"price_1RMBl0CyexzwFObxVfkDppky"},"quantity":1}]}},
    {"id":"sub_1SNj2aCyexzwFObx2VXiSxxT","customer":"cus_THHmI0ZexNBfWn","status":"active","items":{"data":[{"id":"si_TKNoJelMk6lmMj","price":{"id":"price_1SKMzCCyexzwFObxv65F5GUv"},"quantity":1}]}},
    {"id":"sub_1SNc63CyexzwFObxOBhqYDgd","customer":"cus_TJveUGppbgAGhI","status":"active","items":{"data":[{"id":"si_TKGdS8mMVr0j3o","price":{"id":"price_1SNc4SCyexzwFObxypfWmH20"},"quantity":1}]}},
    {"id":"sub_1SNbviCyexzwFObxkmz1QLxe","customer":"cus_TIMolX0yvMEkol","status":"active","items":{"data":[{"id":"si_TKGSrJvGhUndCt","price":{"id":"price_1SL4rXCyexzwFObxAvwean1Z"},"quantity":1}]}},
]

# Comprehensive price mapping
price_to_product = {
    "price_1SSKL5CyexzwFObxuJjbhDmn": {"amount": 39700, "product": "prod_TP8cwYyzOgQ0ay", "interval": "month", "interval_count": 1},
    "price_1SRz7ICyexzwFObxuPbvSqEI": {"amount": 19900, "product": "prod_TOmggISVI1QqWg", "interval": "month", "interval_count": 1},
    "price_1SQifFCyexzwFObxEjRmdhUU": {"amount": 49700, "product": "prod_TEnsSPkf6Ui7hE", "interval": "month", "interval_count": 1},
    "price_1SO0JsCyexzwFObx4kj4kYEN": {"amount": 59900, "product": "prod_TKffM2dcQnENSb", "interval": "month", "interval_count": 1},
    "price_1SO0CZCyexzwFObxnisjHmVY": {"amount": 79700, "product": "prod_TKfXPux6V4fvmn", "interval": "month", "interval_count": 1},
    "price_1SNxDqCyexzwFObx7uJNqM1N": {"amount": 89900, "product": "prod_TKcS0njdSMTCMq", "interval": "month", "interval_count": 1},
    "price_1SNc4SCyexzwFObxypfWmH20": {"amount": 39900, "product": "prod_TEnsSPkf6Ui7hE", "interval": "month", "interval_count": 1},
    "price_1SL4rXCyexzwFObxAvwean1Z": {"amount": 59900, "product": "prod_TEnsSPkf6Ui7hE", "interval": "month", "interval_count": 1},
    "price_1SKMzCCyexzwFObxv65F5GUv": {"amount": 49900, "product": "prod_TEnsSPkf6Ui7hE", "interval": "month", "interval_count": 1},
    "price_1SIXyBCyexzwFObx39iy4rmu": {"amount": 11500, "product": "prod_SSlCOA9MC9XB7J", "interval": "week", "interval_count": 1},
    "price_1SIKKjCyexzwFObxDqU8XJ4j": {"amount": 239100, "product": "prod_TEnww7uD8t78hI", "interval": "month", "interval_count": 3},
    "price_1SIKGHCyexzwFObxYlUh4Rmb": {"amount": 69700, "product": "prod_TEnsSPkf6Ui7hE", "interval": "month", "interval_count": 1},
    "price_1SG1E1CyexzwFObxQxcCPPh1": {"amount": 49700, "product": "prod_TCQ4z4tgg8FNWo", "interval": "month", "interval_count": 1},
    "price_1SFfHICyexzwFObxDa6YeVWc": {"amount": 79700, "product": "prod_SSlFCGIQ3jM7pi", "interval": "month", "interval_count": 1},
    "price_1S97fOCyexzwFObxdyTnBc5c": {"amount": 500000, "product": "prod_T5IFwK7S6PrZsw", "interval": "month", "interval_count": 1},
    "price_1S5SkFCyexzwFObx2F4A23A6": {"amount": 119600, "product": "prod_SSlFCGIQ3jM7pi", "interval": "week", "interval_count": 6},
    "price_1RycXLCyexzwFObxjPgji6kA": {"amount": 49700, "product": "prod_SSlCOA9MC9XB7J", "interval": "month", "interval_count": 1},
    "price_1RyaR2CyexzwFObxpf5JSYVQ": {"amount": 79700, "product": "prod_SSlFCGIQ3jM7pi", "interval": "month", "interval_count": 1},
    "price_1RXpgKCyexzwFObxxTGR6Pmx": {"amount": 149100, "product": "prod_SSlCOA9MC9XB7J", "interval": "month", "interval_count": 3},
    "price_1RXpiZCyexzwFObxfIhAdHU3": {"amount": 239100, "product": "prod_SSlFCGIQ3jM7pi", "interval": "month", "interval_count": 3},
    "price_1RkuW6CyexzwFObxTkNdkKLN": {"amount": 89100, "product": "prod_SSl4ZRinfgmkWx", "interval": "month", "interval_count": 3},
    "price_1Rku9CCyexzwFObxJEaeIKxN": {"amount": 99700, "product": "prod_SSlFCGIQ3jM7pi", "interval": "month", "interval_count": 1},
    "price_1Rku8dCyexzwFObxukCQIVS8": {"amount": 69700, "product": "prod_SSlCOA9MC9XB7J", "interval": "month", "interval_count": 1},
    "price_1RMBl0CyexzwFObxVfkDppky": {"amount": 0, "product": "prod_SGjD7N4g07ZEGy", "interval": "month", "interval_count": 1},
    "price_1PLp1XCyexzwFObxkRFlxkM8": {"amount": 0, "product": "prod_QCDSbbKqd7MIXF", "interval": "month", "interval_count": 1},
    "price_1QpJOSCyexzwFObxYah4pJou": {"amount": 0, "product": "prod_RikuIjk9iarlSR", "interval": "month", "interval_count": 1},
}

# Product names mapping
product_names = {
    "prod_TP8cwYyzOgQ0ay": "TowPilot Ai Dispatcher",
    "prod_TOmggISVI1QqWg": "TowPilot Ai Dispatch Basic Agent",
    "prod_TMZnPglu4GNzye": "TowPilot Ai Dispatch",
    "prod_TMZmArQJfvWG3o": "TowPilot Ai Dispatching",
    "prod_TL5fHiWytKSmUD": "TowPilot Ai Agent",
    "prod_TKffM2dcQnENSb": "Towpilot Ai Dispatch",
    "prod_TKfXPux6V4fvmn": "TowPilot Ai Dispatch Subscription",
    "prod_TKcS0njdSMTCMq": "TowPilot Dispatch Agent Subscription",
    "prod_TEnww7uD8t78hI": "TowPilot Ai Dispatcher - Premium Quarterly",
    "prod_TEnuidQ3bIlk3v": "TowPilot Ai Dispatcher - Premium Monthly",
    "prod_TEnsSPkf6Ui7hE": "TowPilot Ai Dispatcher - Standard Monthly",
    "prod_TEnplNTvG4H8TG": "TowPilot Ai Dispatcher - Standard Quarterly",
    "prod_TCQ4z4tgg8FNWo": "TowPilot Ai Dispatcher - Basic Monthly",
    "prod_TCQIHykZzB59xw": "TowPilot Ai Dispatcher - Basic Quarterly",
    "prod_SSlFCGIQ3jM7pi": "TowPilot Ai Dispatcher - Heavy Duty",
    "prod_SSlCOA9MC9XB7J": "TowPilot Ai Dispatcher - Medium Duty",
    "prod_SSl4ZRinfgmkWx": "TowPilot Ai Dispatcher - Light Duty",
    "prod_SzIVgbxgpwem7f": "TowPilot Ai Dispatching - Enterprise Plan",
    "prod_SzIOHZy98mlwAz": "TowPilot Starter Plan",
    "prod_T5IFwK7S6PrZsw": "Enterprise | Vyde",
    "prod_SGjD7N4g07ZEGy": "sandbox",
    "prod_QCDSbbKqd7MIXF": "legacy | $0 | Internal",
    "prod_RikuIjk9iarlSR": "Pay-As-You-Go",
}

# Identify TowPilot products
towpilot_keywords = ['towpilot', 'tow pilot', 'tow-pilot', 'towing']

def is_towpilot_product(product_id):
    """Check if product is TowPilot-related"""
    product_name = product_names.get(product_id, "").lower()
    return any(keyword in product_name for keyword in towpilot_keywords)

# Calculate monthly MRR from price
def calculate_mrr(amount, interval='month', interval_count=1):
    """Convert subscription price to MRR (cents)"""
    if interval == 'week':
        return (amount * 52) / 12  # Weekly to monthly
    elif interval == 'month':
        return amount / interval_count  # Quarterly/etc to monthly
    else:
        return amount / 12  # Annual to monthly

# Analyze subscriptions
towpilot_subs = []
other_subs = []
towpilot_mrr = 0
other_mrr = 0

towpilot_customers = set()
other_customers = set()

for sub in subscriptions:
    if sub['status'] not in ['active', 'past_due']:
        continue
    
    customer_id = sub['customer']
    
    # Get price details
    for item in sub['items']['data']:
        price_id = item['price']['id']
        price_info = price_to_product.get(price_id, {})
        
        if not price_info:
            continue
        
        product_id = price_info['product']
        amount = price_info['amount']
        interval = price_info.get('interval', 'month')
        interval_count = price_info.get('interval_count', 1)
        
        mrr = calculate_mrr(amount, interval, interval_count)
        
        if is_towpilot_product(product_id):
            towpilot_subs.append({
                'sub_id': sub['id'],
                'customer': customer_id,
                'product': product_id,
                'product_name': product_names.get(product_id, 'Unknown'),
                'price_id': price_id,
                'mrr': mrr,
                'amount': amount,
                'status': sub['status']
            })
            towpilot_mrr += mrr
            towpilot_customers.add(customer_id)
        else:
            other_subs.append({
                'sub_id': sub['id'],
                'customer': customer_id,
                'product': product_id,
                'product_name': product_names.get(product_id, 'Unknown'),
                'price_id': price_id,
                'mrr': mrr,
                'amount': amount,
                'status': sub['status']
            })
            other_mrr += mrr
            other_customers.add(customer_id)

# Summary statistics
print("="*120)
print("SAAS KPI ANALYSIS - PRELIMINARY DATA (FROM SAMPLE)")
print("="*120)

print(f"\n📊 CUSTOMER SEGMENTATION:")
print(f"-" * 120)
print(f"{'Segment':<30} {'Active Subs':>15} {'Unique Customers':>20} {'MRR (USD)':>20} {'ARR (USD)':>20}")
print(f"-" * 120)
print(f"{'TowPilot'::<30} {len(towpilot_subs):>15} {len(towpilot_customers):>20} ${towpilot_mrr/100:>18,.2f} ${towpilot_mrr*12/100:>18,.2f}")
print(f"{'Other Products'::<30} {len(other_subs):>15} {len(other_customers):>20} ${other_mrr/100:>18,.2f} ${other_mrr*12/100:>18,.2f}")
print(f"-" * 120)
print(f"{'TOTAL'::<30} {len(towpilot_subs) + len(other_subs):>15} {len(towpilot_customers | other_customers):>20} ${(towpilot_mrr + other_mrr)/100:>18,.2f} ${(towpilot_mrr + other_mrr)*12/100:>18,.2f}")
print("="*120)

print(f"\n💰 AVERAGE REVENUE PER USER (ARPU):")
print(f"  TowPilot ARPU: ${(towpilot_mrr/100/len(towpilot_customers)) if len(towpilot_customers) > 0 else 0:,.2f}/month")
print(f"  Other ARPU:    ${(other_mrr/100/len(other_customers)) if len(other_customers) > 0 else 0:,.2f}/month")

print(f"\n📈 TOP TOWPILOT PRICING TIERS:")
print(f"-" * 120)
tier_summary = defaultdict(lambda: {'count': 0, 'mrr': 0})
for sub in towpilot_subs:
    tier_summary[sub['product_name']]['count'] += 1
    tier_summary[sub['product_name']]['mrr'] += sub['mrr']

for tier_name, data in sorted(tier_summary.items(), key=lambda x: x[1]['mrr'], reverse=True):
    print(f"  {tier_name:<60} {data['count']:>3} subs  ${data['mrr']/100:>10,.2f}/mo")

print("\n" + "="*120)
print("⚠️  NOTE: This is based on ~24 sample subscriptions. Full analysis requires all subscription data.")
print("="*120)

EOF

