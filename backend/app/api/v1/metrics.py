
from fastapi import APIRouter, HTTPException

from app.services.metrics_calculator import MetricsCalculator

router = APIRouter()


@router.get("/towpilot", response_model=dict)
async def get_towpilot_metrics():
    """
    Get all metrics specific to TowPilot product

    Returns comprehensive metrics including:
    - Customer counts (TowPilot vs. others)
    - MRR, ARR, ACV
    - CAC breakdown
    - LTV and LTV/CAC ratio
    - CAC payback period
    - Revenue trends
    """
    try:
        metrics = await MetricsCalculator.calculate_towpilot_metrics()
        return metrics
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error calculating metrics: {str(e)}"
        )


@router.get("/all-products", response_model=dict)
async def get_all_products_metrics():
    """
    Get metrics for all products combined

    Returns:
    - Total customer count
    - Total MRR/ARR
    - Revenue trends
    - Churn metrics
    """
    try:
        metrics = await MetricsCalculator.calculate_all_products_metrics()
        return metrics
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error calculating metrics: {str(e)}"
        )


@router.get("/summary")
async def get_metrics_summary():
    """
    Get a high-level summary of key metrics for the investor deck
    """
    try:
        towpilot = await MetricsCalculator.calculate_towpilot_metrics()

        return {
            "towpilot": {
                "customers": towpilot["customer_metrics"]["towpilot_customers"],
                "arr": towpilot["revenue_metrics"]["arr"],
                "mrr": towpilot["revenue_metrics"]["mrr"],
                "acv": towpilot["revenue_metrics"]["acv"],
                "ltv": towpilot["ltv_metrics"]["average_ltv"],
                "cac": towpilot["cac_metrics"]["total_cac"],
                "ltv_cac_ratio": towpilot["ltv_metrics"]["ltv_cac_ratio"],
                "cac_payback_months": towpilot["ltv_metrics"]["cac_payback_months"],
                "gross_margin": towpilot["financial_metrics"][
                    "gross_margin_percentage"
                ],
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error generating summary: {str(e)}"
        )
