from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.services.metrics_cache_service import MetricsCacheService
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
        result = {
            "count": len(subscriptions),
            "subscriptions": subscriptions,
            "timestamp": datetime.now().isoformat(),
        }

        # Calculate MRR from subscriptions (using items array, not plan)
        total_mrr = 0
        for sub in subscriptions:
            for item in sub.get("items", []):
                amount = item.get("amount", 0) or 0
                interval = item.get("interval")
                interval_count = item.get("interval_count", 1) or 1

                # Normalize to monthly MRR
                # interval_count handles multi-period billing (e.g., every 3 months, every 2 years)
                if interval == "month":
                    total_mrr += (amount / 100) / interval_count
                elif interval == "year":
                    total_mrr += (amount / 100) / 12 / interval_count

        # Cache MRR metrics for fallback
        await MetricsCacheService.save_metrics(
            metric_type="mrr_subscriptions",
            data={
                "total_mrr": total_mrr,
                "count": len(subscriptions),
                "timestamp": datetime.now().isoformat(),
            },
            source="stripe"
        )

        return result
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

        result = {
            "churn": churn,
            "arpu": arpu,
            "timestamp": datetime.now().isoformat(),
        }

        # Cache the result for fallback
        await MetricsCacheService.save_metrics(
            metric_type="churn_arpu",
            data=result,
            source="stripe"
        )

        return result
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error calculating metrics: {str(e)}"
        )


@router.get("/customer-metrics")
async def get_customer_metrics():
    """
    Get comprehensive customer metrics including active, churned, net adds, and growth

    Returns validated customer counts and growth metrics from Stripe data
    """
    try:
        metrics = await StripeService.calculate_customer_metrics()

        # Cache the result for fallback
        await MetricsCacheService.save_metrics(
            metric_type="customer_metrics",
            data=metrics,
            source="stripe"
        )

        return metrics
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error calculating customer metrics: {str(e)}"
        )


@router.get("/retention-by-segment")
async def get_retention_by_segment():
    """
    Get retention rates by product segment (TowPilot vs Other Products)

    Returns validated retention rates calculated from Stripe subscription data
    """
    try:
        retention = await StripeService.calculate_retention_by_segment()
        return retention
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error calculating retention metrics: {str(e)}"
        )


@router.get("/pricing-tiers")
async def get_pricing_tier_breakdown():
    """
    Get pricing tier breakdown for TowPilot subscriptions

    Returns tier breakdown with customers, MRR, ARPU, and percentages
    """
    try:
        tiers = await StripeService.calculate_pricing_tier_breakdown()
        return tiers
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error calculating pricing tiers: {str(e)}"
        )


@router.get("/expansion-metrics")
async def get_expansion_metrics():
    """
    Get expansion metrics including gross and net retention

    Returns validated retention metrics calculated from historical Stripe data
    """
    try:
        metrics = await StripeService.calculate_expansion_metrics()
        return metrics
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error calculating expansion metrics: {str(e)}"
        )


@router.get("/unit-economics")
async def get_unit_economics():
    """
    Get unit economics including CAC, LTV, LTV/CAC ratio, and payback period

    Returns validated unit economics calculated from Stripe data and configured CAC
    """
    try:
        economics = await StripeService.calculate_unit_economics()
        return economics
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error calculating unit economics: {str(e)}"
        )


@router.get("/comprehensive-metrics")
async def get_comprehensive_metrics():
    """
    Get all validated metrics in a single call for dashboard display

    Returns comprehensive metrics including:
    - Customer metrics
    - Retention by segment
    - Pricing tiers
    - Expansion metrics
    - Unit economics
    - Churn and ARPU
    """
    try:
        customer_metrics = await StripeService.calculate_customer_metrics()
        retention = await StripeService.calculate_retention_by_segment()
        pricing_tiers = await StripeService.calculate_pricing_tier_breakdown()
        expansion = await StripeService.calculate_expansion_metrics()
        unit_economics = await StripeService.calculate_unit_economics()
        churn_arpu = await StripeService.calculate_churn_rate(months=3)
        arpu = await StripeService.calculate_arpu()

        result = {
            "customer_metrics": customer_metrics,
            "retention_by_segment": retention,
            "pricing_tiers": pricing_tiers,
            "expansion_metrics": expansion,
            "unit_economics": unit_economics,
            "churn": churn_arpu,
            "arpu": arpu,
            "timestamp": datetime.now().isoformat(),
        }

        # Cache the result to database for fallback
        await MetricsCacheService.save_metrics(
            metric_type="comprehensive_metrics",
            data=result,
            source="stripe"
        )

        return result
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error calculating comprehensive metrics: {str(e)}"
        )


@router.get("/cached/{metric_type}")
async def get_cached_metrics(metric_type: str):
    """
    Get cached metrics from database when live API is unavailable.
    
    Args:
        metric_type: Type of metrics to retrieve (e.g., 'comprehensive_metrics', 'churn_arpu', 'mrr')
    
    Returns:
        Cached metrics with timestamp showing when data was last fetched
    """
    try:
        cached = await MetricsCacheService.get_latest_metrics(metric_type)

        if cached is None:
            raise HTTPException(
                status_code=404,
                detail=f"No cached data found for {metric_type}"
            )

        return {
            "data": cached["data"],
            "fetched_at": cached["fetched_at"],
            "source": cached["source"],
            "is_cached": True,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving cached metrics: {str(e)}"
        )


@router.get("/cached")
async def get_all_cached_metrics():
    """
    Get all cached metrics from database.
    
    Returns:
        Dict mapping metric_type to cached data with timestamps
    """
    try:
        all_cached = await MetricsCacheService.get_all_latest_metrics()

        return {
            "metrics": all_cached,
            "count": len(all_cached),
            "timestamp": datetime.now().isoformat(),
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving cached metrics: {str(e)}"
        )
