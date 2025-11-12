from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.services.stripe_service import StripeService

router = APIRouter()


@router.get("/customers")
async def get_customers(
    tag: Optional[str] = Query(None, description="Filter by metadata tag"),
):
    """
    Fetch customers from Stripe, optionally filtered by tag

    Args:
        tag: Filter customers by metadata tag (e.g., 'tow' for TowPilot)
    """
    try:
        customers = await StripeService.get_all_customers(has_tag=tag)
        return {
            "count": len(customers),
            "customers": customers,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching customers: {str(e)}"
        )


@router.get("/subscriptions")
async def get_subscriptions():
    """Fetch all active subscriptions from Stripe"""
    try:
        subscriptions = await StripeService.get_active_subscriptions()
        return {
            "count": len(subscriptions),
            "subscriptions": subscriptions,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching subscriptions: {str(e)}"
        )


@router.get("/revenue-trend")
async def get_revenue_trend(months: int = Query(12, ge=1, le=24)):
    """
    Get revenue trend data for the past N months

    Args:
        months: Number of months of historical data (1-24)
    """
    try:
        trend = await StripeService.get_revenue_by_month(months=months)
        return {
            "months": months,
            "data": trend,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching revenue trend: {str(e)}"
        )


@router.get("/churn")
async def get_churn_metrics(months: int = Query(3, ge=1, le=12)):
    """
    Calculate churn rate over the specified period

    Args:
        months: Number of months to calculate churn over (1-12)
    """
    try:
        churn = await StripeService.calculate_churn_rate(months=months)
        return churn
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error calculating churn: {str(e)}"
        )


@router.get("/arpu")
async def get_arpu_metrics():
    """
    Calculate Average Revenue Per User (ARPU) from active subscriptions

    Returns:
        Dict with ARPU metrics including monthly and annual ARPU
    """
    try:
        arpu = await StripeService.calculate_arpu()
        return arpu
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating ARPU: {str(e)}")


@router.get("/churn-and-arpu")
async def get_churn_and_arpu(months: int = Query(3, ge=1, le=12)):
    """
    Get both churn and ARPU metrics in a single call

    Args:
        months: Number of months to calculate churn over (1-12)
    """
    try:
        churn = await StripeService.calculate_churn_rate(months=months)
        arpu = await StripeService.calculate_arpu()

        return {
            "churn": churn,
            "arpu": arpu,
            "timestamp": datetime.now().isoformat(),
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error calculating metrics: {str(e)}"
        )
