"""
Revenue Projections API

Provides month-to-date and projected monthly revenue based on actual invoice schedules.
Critical for cash flow planning and accurate revenue forecasting.
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict
from calendar import monthrange

from fastapi import APIRouter, Query, HTTPException

from app.services.stripe_service import StripeService

router = APIRouter()


@router.get("/current-month")
async def get_current_month_projections():
    """
    Get actual and projected revenue for the current month
    
    Returns:
    - customers_invoicing: Count of customers with invoices this month
    - invoiced_to_date: Amount already invoiced/collected
    - projected_remaining: Amount expected from pending invoices
    - total_projected: Total month projection
    - mrr_represented: MRR value of invoicing customers
    - collection_by_week: Weekly breakdown
    """
    
    now = datetime.now()
    current_month = now.month
    current_year = now.year
    
    # Get all subscriptions
    all_subs = await StripeService.get_active_subscriptions()
    
    # Analyze current month
    month_invoices = []
    invoiced_to_date = 0.0
    projected_remaining = 0.0
    
    for sub in all_subs:
        # Calculate subscription amount and MRR
        sub_amount = 0.0
        sub_mrr = 0.0
        interval_info = None
        
        for item in sub["items"]:
            amount = item["amount"] / 100
            
            if amount == 0:
                continue
            
            interval = item["interval"]
            interval_count = item.get("interval_count", 1)
            
            # Calculate monthly MRR
            if interval == "year":
                monthly = amount / 12
            elif interval == "month":
                monthly = amount / interval_count
            elif interval == "week":
                monthly = (amount * 52) / 12
            else:
                monthly = 0
            
            sub_mrr += monthly
            sub_amount = amount
            interval_info = {
                "interval": interval,
                "interval_count": interval_count
            }
        
        if sub_mrr == 0:
            continue
        
        # Check if invoice is in current month
        next_invoice_ts = sub["current_period_end"]
        next_invoice_date = datetime.fromtimestamp(next_invoice_ts)
        
        if next_invoice_date.year == current_year and next_invoice_date.month == current_month:
            invoice_data = {
                "customer_id": sub["customer"],
                "invoice_date": next_invoice_date,
                "invoice_amount": sub_amount,
                "mrr": sub_mrr,
                "interval": interval_info["interval"],
                "interval_count": interval_info["interval_count"]
            }
            
            month_invoices.append(invoice_data)
            
            # Categorize as already invoiced or projected
            if next_invoice_date <= now:
                invoiced_to_date += sub_amount
            else:
                projected_remaining += sub_amount
    
    # Weekly breakdown
    _, days_in_month = monthrange(current_year, current_month)
    weeks = []
    
    for week_num in range(1, 6):  # Max 5 weeks in a month
        week_start_day = (week_num - 1) * 7 + 1
        week_end_day = min(week_num * 7, days_in_month)
        
        if week_start_day > days_in_month:
            break
        
        week_start = datetime(current_year, current_month, week_start_day)
        week_end = datetime(current_year, current_month, week_end_day, 23, 59, 59)
        
        week_invoices = [
            inv for inv in month_invoices 
            if week_start <= inv["invoice_date"] <= week_end
        ]
        
        if week_invoices:
            week_total = sum(inv["invoice_amount"] for inv in week_invoices)
            weeks.append({
                "week_number": week_num,
                "date_range": f"{current_month}/{week_start_day}-{week_end_day}",
                "customer_count": len(week_invoices),
                "total_amount": round(week_total, 2),
                "customers": [inv["customer_id"] for inv in week_invoices]
            })
    
    total_mrr = sum(inv["mrr"] for inv in month_invoices)
    
    return {
        "month": now.strftime("%B %Y"),
        "as_of_date": now.strftime("%Y-%m-%d %H:%M:%S"),
        "summary": {
            "customers_invoicing": len(month_invoices),
            "invoiced_to_date": round(invoiced_to_date, 2),
            "projected_remaining": round(projected_remaining, 2),
            "total_projected": round(invoiced_to_date + projected_remaining, 2),
            "mrr_represented": round(total_mrr, 2)
        },
        "collection_by_week": weeks,
        "note": "Invoice amounts may differ from MRR for quarterly/annual subscriptions"
    }


@router.get("/month-detail")
async def get_month_detail(
    year: int = Query(None, description="Year (defaults to current)"),
    month: int = Query(None, description="Month 1-12 (defaults to current)")
):
    """
    Get detailed invoice breakdown for a specific month
    
    Shows every customer invoicing in the specified month with:
    - Customer ID
    - Invoice date
    - Invoice amount
    - MRR contribution
    - Billing interval
    
    Useful for cash flow forecasting and revenue planning.
    """
    
    # Default to current month
    now = datetime.now()
    target_year = year or now.year
    target_month = month or now.month
    
    # Validate month
    if not 1 <= target_month <= 12:
        raise HTTPException(status_code=400, detail="Month must be between 1 and 12")
    
    # Get subscriptions
    all_subs = await StripeService.get_active_subscriptions()
    
    # Find invoices in target month
    month_invoices = []
    
    for sub in all_subs:
        sub_amount = 0.0
        sub_mrr = 0.0
        interval_info = None
        
        for item in sub["items"]:
            amount = item["amount"] / 100
            
            if amount == 0:
                continue
            
            interval = item["interval"]
            interval_count = item.get("interval_count", 1)
            
            # Calculate MRR
            if interval == "year":
                monthly = amount / 12
            elif interval == "month":
                monthly = amount / interval_count
            elif interval == "week":
                monthly = (amount * 52) / 12
            else:
                monthly = 0
            
            sub_mrr += monthly
            sub_amount = amount
            interval_info = {
                "interval": interval,
                "interval_count": interval_count
            }
        
        if sub_mrr == 0:
            continue
        
        # Check if invoice in target month
        next_invoice_ts = sub["current_period_end"]
        next_invoice_date = datetime.fromtimestamp(next_invoice_ts)
        
        if next_invoice_date.year == target_year and next_invoice_date.month == target_month:
            month_invoices.append({
                "customer_id": sub["customer"],
                "subscription_id": sub["id"],
                "invoice_date": next_invoice_date.strftime("%Y-%m-%d"),
                "invoice_amount": round(sub_amount, 2),
                "mrr": round(sub_mrr, 2),
                "interval": interval_info["interval"],
                "interval_count": interval_info["interval_count"],
                "billing_description": f"${sub_amount:,.2f} every {interval_info['interval_count']} {interval_info['interval']}(s)"
            })
    
    # Sort by invoice date
    month_invoices.sort(key=lambda x: x["invoice_date"])
    
    total_amount = sum(inv["invoice_amount"] for inv in month_invoices)
    total_mrr = sum(inv["mrr"] for inv in month_invoices)
    
    month_name = datetime(target_year, target_month, 1).strftime("%B %Y")
    
    return {
        "month": month_name,
        "year": target_year,
        "month_number": target_month,
        "customer_count": len(month_invoices),
        "total_invoice_amount": round(total_amount, 2),
        "total_mrr_represented": round(total_mrr, 2),
        "invoices": month_invoices,
        "generated_at": datetime.now().isoformat()
    }


@router.get("/quarterly-forecast")
async def get_quarterly_revenue_forecast(
    quarters: int = Query(4, ge=1, le=8, description="Number of quarters to project")
):
    """
    Project revenue for upcoming quarters based on subscription billing schedules
    
    Returns quarterly breakdown of expected invoice amounts and MRR.
    Useful for financial planning and investor projections.
    """
    
    now = datetime.now()
    all_subs = await StripeService.get_active_subscriptions()
    
    # Build quarterly projections
    quarterly_data = []
    
    for quarter_offset in range(quarters):
        # Calculate quarter date range
        quarter_start_month = now.month + (quarter_offset * 3)
        quarter_year = now.year + (quarter_start_month - 1) // 12
        quarter_start_month = ((quarter_start_month - 1) % 12) + 1
        
        quarter_invoices = []
        quarter_total = 0.0
        quarter_mrr = 0.0
        
        # Check each of 3 months in quarter
        for month_offset in range(3):
            month = quarter_start_month + month_offset
            year = quarter_year
            
            if month > 12:
                month -= 12
                year += 1
            
            # Find subscriptions invoicing in this month
            for sub in all_subs:
                next_invoice_date = datetime.fromtimestamp(sub["current_period_end"])
                
                if next_invoice_date.year == year and next_invoice_date.month == month:
                    # Calculate amounts
                    sub_amount = 0.0
                    sub_mrr = 0.0
                    
                    for item in sub["items"]:
                        amount = item["amount"] / 100
                        if amount == 0:
                            continue
                        
                        interval = item["interval"]
                        interval_count = item.get("interval_count", 1)
                        
                        if interval == "year":
                            monthly = amount / 12
                        elif interval == "month":
                            monthly = amount / interval_count
                        elif interval == "week":
                            monthly = (amount * 52) / 12
                        else:
                            monthly = 0
                        
                        sub_mrr += monthly
                        sub_amount = amount
                    
                    quarter_total += sub_amount
                    quarter_mrr += sub_mrr
        
        quarter_name = f"Q{((quarter_start_month - 1) // 3) + 1} {quarter_year}"
        
        quarterly_data.append({
            "quarter": quarter_name,
            "year": quarter_year,
            "quarter_number": ((quarter_start_month - 1) // 3) + 1,
            "projected_invoice_amount": round(quarter_total, 2),
            "average_mrr": round(quarter_mrr / 3, 2),  # Average over 3 months
            "months": f"{datetime(quarter_year, quarter_start_month, 1).strftime('%b')}-"
                      f"{datetime(quarter_year, min(quarter_start_month + 2, 12), 1).strftime('%b')}"
        })
    
    return {
        "projection_period": f"{quarters} quarters",
        "generated_at": datetime.now().isoformat(),
        "quarters": quarterly_data,
        "note": "Based on current subscription billing schedules"
    }


@router.get("/annual-forecast")
async def get_annual_revenue_forecast():
    """
    Project revenue for the next 12 months based on subscription schedules
    
    Shows month-by-month breakdown of expected collections.
    """
    
    now = datetime.now()
    all_subs = await StripeService.get_active_subscriptions()
    
    monthly_projections = []
    
    for month_offset in range(12):
        target_date = now + timedelta(days=month_offset * 30)
        target_month = target_date.month
        target_year = target_date.year
        
        month_total = 0.0
        month_customer_count = 0
        month_mrr = 0.0
        
        for sub in all_subs:
            next_invoice_date = datetime.fromtimestamp(sub["current_period_end"])
            
            if next_invoice_date.year == target_year and next_invoice_date.month == target_month:
                # Calculate amounts
                sub_amount = 0.0
                sub_mrr = 0.0
                
                for item in sub["items"]:
                    amount = item["amount"] / 100
                    if amount == 0:
                        continue
                    
                    interval = item["interval"]
                    interval_count = item.get("interval_count", 1)
                    
                    if interval == "year":
                        monthly = amount / 12
                    elif interval == "month":
                        monthly = amount / interval_count
                    elif interval == "week":
                        monthly = (amount * 52) / 12
                    else:
                        monthly = 0
                    
                    sub_mrr += monthly
                    sub_amount = amount
                
                month_total += sub_amount
                month_customer_count += 1
                month_mrr += sub_mrr
        
        monthly_projections.append({
            "month": target_date.strftime("%B %Y"),
            "month_number": target_month,
            "year": target_year,
            "customers_invoicing": month_customer_count,
            "projected_invoice_amount": round(month_total, 2),
            "mrr_represented": round(month_mrr, 2)
        })
    
    return {
        "forecast_period": "12 months",
        "generated_at": datetime.now().isoformat(),
        "monthly_projections": monthly_projections,
        "note": "Based on current subscription billing cycles"
    }

