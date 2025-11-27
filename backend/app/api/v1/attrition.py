"""
Attrition and LTV API endpoints.

Provides data-driven attrition analysis:
- /summary - High-level metrics with investor narrative
- /cohorts - Detailed cohort retention data for visualization
- /ltv - LTV calculation with full methodology breakdown
"""
import contextlib
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.services.metrics_cache_service import MetricsCacheService
from app.services.retention_service import RetentionService

router = APIRouter()


@router.get("/summary")
async def get_attrition_summary(
    early_period_days: int = Query(60, description="Days for early churn window"),
    lookback_months: int = Query(6, description="Months of data for steady-state calculation"),
    gross_margin: Optional[float] = Query(None, description="Override gross margin (0-1)"),
):
    """
    Get comprehensive attrition summary with investor-ready narrative.

    Returns:
        - Narrative explanation of attrition and LTV
        - Early churn rate (first N days)
        - Steady-state monthly churn (post-early period)
        - LTV calculation with methodology
        - ARPU and gross margin inputs

    Example response:
    ```json
    {
      "narrative": "32% of customers churn within the first 60 days...",
      "early_churn": {
        "period_days": 60,
        "churn_rate": 32.0,
        "customers_analyzed": 200
      },
      "steady_state_churn": {
        "monthly_rate": 2.1,
        "annual_rate": 22.5,
        "average_lifespan_months": 47
      },
      "ltv": {
        "value": 14847,
        "methodology": "ARPU × Gross Margin × Average Lifespan",
        "inputs": {...}
      }
    }
    ```
    """
    try:
        summary = await RetentionService.get_attrition_summary(
            early_period_days=early_period_days,
            lookback_months=lookback_months,
            gross_margin=gross_margin,
        )

        # Cache the results for fallback
        with contextlib.suppress(Exception):
            MetricsCacheService.save_metrics("attrition_summary", summary, source="stripe")

        return summary

    except Exception as e:
        # Try to return cached data if available
        try:
            cached = MetricsCacheService.get_latest_metrics("attrition_summary")
            if cached:
                cached["_from_cache"] = True
                return cached
        except Exception:
            pass

        raise HTTPException(
            status_code=500, detail=f"Error calculating attrition summary: {str(e)}"
        )


@router.get("/cohorts")
async def get_cohort_retention():
    """
    Get detailed cohort retention data for visualization.

    Returns retention curves for each monthly cohort, suitable for
    charting survival curves.

    Response includes:
        - cohorts: Array of cohort data with retention at 30/60/90/180/365 days
        - average_retention: Average retention across all cohorts
        - total_cohorts: Number of cohorts analyzed

    Example response:
    ```json
    {
      "cohorts": [
        {
          "cohort": "2024-01",
          "cohort_label": "Jan 2024",
          "size": 15,
          "current_mrr": 12500.00,
          "retention": {
            "30d": 93.3,
            "60d": 80.0,
            "90d": 73.3,
            "180d": 66.7,
            "365d": 53.3
          }
        }
      ],
      "average_retention": {
        "30d": 91.5,
        "60d": 78.2,
        ...
      }
    }
    ```
    """
    try:
        cohort_data = await RetentionService.get_cohort_retention_data()

        # Cache the results
        with contextlib.suppress(Exception):
            MetricsCacheService.save_metrics("cohort_retention", cohort_data, source="stripe")

        return cohort_data

    except Exception as e:
        # Try cached data
        with contextlib.suppress(Exception):
            cached = MetricsCacheService.get_latest_metrics("cohort_retention")
            if cached:
                cached["_from_cache"] = True
                return cached

        raise HTTPException(
            status_code=500, detail=f"Error calculating cohort retention: {str(e)}"
        )


@router.get("/ltv")
async def get_ltv_calculation():
    """
    Get detailed LTV calculation with full methodology breakdown.

    Returns LTV value with:
        - Complete calculation steps
        - All input values (ARPU, gross margin, churn rates)
        - Comparison to previous hardcoded value

    Example response:
    ```json
    {
      "ltv_value": 14847,
      "methodology": {
        "formula": "LTV = ARPU × Gross Margin × Average Lifespan",
        "steps": [
          {"step": 1, "description": "Calculate ARPU", "value": 727, "unit": "$/month"},
          ...
        ]
      },
      "comparison": {
        "previous_hardcoded": 14100,
        "new_calculated": 14847,
        "difference": 747,
        "difference_pct": 5.3
      }
    }
    ```
    """
    try:
        ltv_data = await RetentionService.get_ltv_calculation()

        # Cache the results
        with contextlib.suppress(Exception):
            MetricsCacheService.save_metrics("ltv_calculation", ltv_data, source="stripe")

        return ltv_data

    except Exception as e:
        # Try cached data
        with contextlib.suppress(Exception):
            cached = MetricsCacheService.get_latest_metrics("ltv_calculation")
            if cached:
                cached["_from_cache"] = True
                return cached

        raise HTTPException(
            status_code=500, detail=f"Error calculating LTV: {str(e)}"
        )


@router.get("/early-churn")
async def get_early_churn(
    period_days: int = Query(60, description="Days to consider 'early' churn"),
):
    """
    Get early churn analysis (customers lost within first N days).

    Args:
        period_days: Number of days to consider "early" (default 60)

    Returns:
        - churn_rate: Percentage of customers who churned within early period
        - customers_analyzed: Number of customers old enough to analyze
        - churned_early: Number of customers who churned early
        - retention_rate: Percentage of customers who survived early period
    """
    try:
        subscriptions = await RetentionService.get_all_subscriptions_with_lifecycle()
        early_churn = await RetentionService.calculate_early_churn(
            subscriptions, period_days
        )
        return early_churn

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error calculating early churn: {str(e)}"
        )


@router.get("/steady-state-churn")
async def get_steady_state_churn(
    early_period_days: int = Query(60, description="Days for early period (excluded)"),
    lookback_months: int = Query(6, description="Months of data to analyze"),
):
    """
    Get steady-state monthly churn rate (post-early period).

    Measures churn of customers who survived the early period,
    providing a more accurate long-term churn rate.

    Args:
        early_period_days: Days to exclude as "early" (default 60)
        lookback_months: Months of data to analyze (default 6)

    Returns:
        - monthly_rate: Monthly churn percentage
        - annual_rate: Annualized churn percentage
        - average_lifespan_months: Expected customer lifespan (1/monthly_rate)
        - customers_analyzed: Number of mature customers analyzed
    """
    try:
        subscriptions = await RetentionService.get_all_subscriptions_with_lifecycle()
        steady_state = await RetentionService.calculate_steady_state_churn(
            subscriptions, early_period_days, lookback_months
        )
        return steady_state

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error calculating steady-state churn: {str(e)}"
        )

