"""
Customer MRR Breakdown API

Provides detailed customer-by-customer MRR breakdown with expandable details.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Query

from app.services.stripe_service import StripeService

router = APIRouter()


@router.get("/list")
async def get_customer_mrr_list(
    min_mrr: Optional[float] = Query(None, description="Filter customers with MRR >= this amount"),
    sort_by: str = Query("mrr", description="Sort by: mrr, customer, or email"),
    sort_desc: bool = Query(True, description="Sort descending")
):
    """
    Get detailed customer-by-customer MRR breakdown

    Returns a list of all paying customers with their:
    - Customer ID and email
    - Subscription details
    - MRR contribution
    - Billing interval
    - Next invoice date

    Use this for detailed analysis, exports, or building expandable UI tables.
    """

    # Get all subscriptions
    all_subscriptions = await StripeService.get_active_subscriptions()

    # Build customer MRR list
    customer_mrr_list = []

    for sub in all_subscriptions:
        # Calculate MRR for this subscription
        sub_mrr = 0.0
        subscription_items = []

        for item in sub["items"]:
            amount = item["amount"] / 100

            if amount == 0:
                continue

            interval = item["interval"]
            interval_count = item.get("interval_count", 1) or 1

            # Calculate monthly equivalent
            # interval_count handles multi-period billing (e.g., every 3 months, every 2 years)
            if interval == "year":
                monthly_amount = amount / 12 / interval_count
            elif interval == "month":
                monthly_amount = amount / interval_count
            elif interval == "week":
                monthly_amount = (amount * 52) / 12 / interval_count
            elif interval == "day":
                monthly_amount = (amount * 30) / interval_count
            else:
                monthly_amount = 0

            sub_mrr += monthly_amount

            subscription_items.append({
                "price_id": item["price"],
                "amount": amount,
                "interval": interval,
                "interval_count": interval_count,
                "monthly_equivalent": round(monthly_amount, 2)
            })

        # Skip $0 subscriptions
        if sub_mrr == 0:
            continue

        customer_mrr_list.append({
            "customer_id": sub["customer"],
            "subscription_id": sub["id"],
            "status": sub["status"],
            "mrr": round(sub_mrr, 2),
            "current_period_start": sub.get("current_period_start"),
            "current_period_end": sub.get("current_period_end"),
            "items": subscription_items,
            "item_count": len(subscription_items)
        })

    # Apply filters
    if min_mrr is not None:
        customer_mrr_list = [c for c in customer_mrr_list if c["mrr"] >= min_mrr]

    # Sort
    if sort_by == "mrr":
        customer_mrr_list.sort(key=lambda x: x["mrr"], reverse=sort_desc)
    elif sort_by == "customer":
        customer_mrr_list.sort(key=lambda x: x["customer_id"], reverse=sort_desc)

    # Calculate totals
    total_mrr = sum(c["mrr"] for c in customer_mrr_list)

    return {
        "total_customers": len(customer_mrr_list),
        "total_mrr": round(total_mrr, 2),
        "customers": customer_mrr_list,
        "generated_at": datetime.now().isoformat()
    }


@router.get("/summary-by-tier")
async def get_mrr_by_tier():
    """
    Get MRR breakdown by customer tier

    Categorizes customers into tiers based on MRR amount.
    """

    all_subscriptions = await StripeService.get_active_subscriptions()

    # Calculate MRR for each subscription
    customer_mrr = []
    for sub in all_subscriptions:
        sub_mrr = 0.0
        for item in sub["items"]:
            amount = item["amount"] / 100
            if amount == 0:
                continue

            interval = item["interval"]
            interval_count = item.get("interval_count", 1) or 1
            # interval_count handles multi-period billing (e.g., every 3 months, every 2 years)
            if interval == "year":
                sub_mrr += amount / 12 / interval_count
            elif interval == "month":
                sub_mrr += amount / interval_count

        if sub_mrr > 0:
            customer_mrr.append({
                "customer_id": sub["customer"],
                "mrr": sub_mrr
            })

    # Define tiers
    tiers = {
        "Enterprise ($5K+)": [],
        "High-Value ($1K-$5K)": [],
        "Standard ($500-$1K)": [],
        "Growth ($100-$500)": [],
        "Starter (<$100)": []
    }

    for customer in customer_mrr:
        mrr = customer["mrr"]
        if mrr >= 5000:
            tiers["Enterprise ($5K+)"].append(customer)
        elif mrr >= 1000:
            tiers["High-Value ($1K-$5K)"].append(customer)
        elif mrr >= 500:
            tiers["Standard ($500-$1K)"].append(customer)
        elif mrr >= 100:
            tiers["Growth ($100-$500)"].append(customer)
        else:
            tiers["Starter (<$100)"].append(customer)

    # Calculate tier summaries
    tier_summary = []
    for tier_name, customers in tiers.items():
        if customers:
            tier_mrr = sum(c["mrr"] for c in customers)
            tier_summary.append({
                "tier": tier_name,
                "customer_count": len(customers),
                "total_mrr": round(tier_mrr, 2),
                "average_mrr": round(tier_mrr / len(customers), 2),
                "customers": customers
            })

    total_mrr = sum(t["total_mrr"] for t in tier_summary)

    return {
        "total_mrr": round(total_mrr, 2),
        "total_customers": sum(t["customer_count"] for t in tier_summary),
        "tiers": tier_summary,
        "generated_at": datetime.now().isoformat()
    }


@router.get("/export-csv")
async def export_customer_mrr_csv():
    """
    Export customer MRR list as CSV format

    Returns CSV string that can be saved to file.
    """

    all_subscriptions = await StripeService.get_active_subscriptions()

    # Build CSV rows
    rows = []
    rows.append("Customer ID,Subscription ID,MRR,Interval,Amount,Next Invoice,Status")

    for sub in all_subscriptions:
        sub_mrr = 0.0
        primary_item = None

        for item in sub["items"]:
            amount = item["amount"] / 100
            if amount == 0:
                continue

            interval = item["interval"]
            interval_count = item.get("interval_count", 1) or 1
            # interval_count handles multi-period billing (e.g., every 3 months, every 2 years)
            if interval == "year":
                monthly = amount / 12 / interval_count
            elif interval == "month":
                monthly = amount / interval_count
            else:
                monthly = 0

            sub_mrr += monthly
            if primary_item is None or amount > primary_item["amount"]:
                primary_item = item

        if sub_mrr == 0:
            continue

        # Format next invoice date
        next_invoice = datetime.fromtimestamp(sub["current_period_end"]).strftime("%Y-%m-%d")

        rows.append(
            f"{sub['customer']},"
            f"{sub['id']},"
            f"{sub_mrr:.2f},"
            f"{primary_item['interval'] if primary_item else 'unknown'},"
            f"{primary_item['amount']/100 if primary_item else 0},"
            f"{next_invoice},"
            f"{sub['status']}"
        )

    csv_content = "\n".join(rows)

    return {
        "csv": csv_content,
        "row_count": len(rows) - 1,  # Exclude header
        "generated_at": datetime.now().isoformat()
    }

