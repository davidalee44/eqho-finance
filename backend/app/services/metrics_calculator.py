import logging
from typing import Dict

from app.services.cache_service import cache_service
from app.services.stripe_service import StripeService

logger = logging.getLogger(__name__)

# Fallback values if retention service fails
FALLBACK_LTV = 14100
FALLBACK_GROSS_MARGIN = 0.558


class MetricsCalculator:
    """Calculate investor metrics from Stripe API (bypassing Supabase)"""

    @staticmethod
    async def calculate_towpilot_metrics() -> Dict:
        """Calculate all metrics specific to TowPilot product with caching"""

        # Use cache service
        return await cache_service.get_metrics(
            product="towpilot", calculator=MetricsCalculator._compute_towpilot_metrics
        )

    @staticmethod
    async def _compute_towpilot_metrics() -> Dict:
        """Internal method to compute metrics from Stripe API
        
        Note: Currently returns ALL products since customer tags are not populated.
        To filter for TowPilot only, add 'tags': 'tow' to customer metadata in Stripe.
        """

        # Get all subscriptions from Stripe
        # TODO: Filter for TowPilot once customer tags are properly set in Stripe
        all_subscriptions = await StripeService.get_active_subscriptions()

        # Calculate MRR and ARR from all subscriptions
        towpilot_mrr = await StripeService.calculate_mrr(all_subscriptions)
        towpilot_arr = towpilot_mrr * 12

        # Calculate ACV (Average Contract Value)
        towpilot_acv = await StripeService.calculate_acv(all_subscriptions)

        # Get unique customer count (only paying customers, exclude $0 subscriptions)
        paying_subscriptions = [
            s for s in all_subscriptions
            if any(item["amount"] > 0 for item in s["items"])
        ]
        towpilot_customer_count = len(set(s["customer"] for s in paying_subscriptions))

        # Calculate ARPU
        arpu_monthly = (
            (towpilot_mrr / towpilot_customer_count)
            if towpilot_customer_count > 0
            else 0
        )

        # CAC metrics (hardcoded from investor data)
        cac_total = 831
        cac_sales = 450
        cac_marketing = 381

        # LTV calculation - try to get from retention service, fallback to hardcoded
        try:
            from app.services.retention_service import RetentionService

            # Get LTV from retention analysis
            ltv_data = await RetentionService.get_ltv_calculation()
            average_ltv = ltv_data.get("ltv_value", FALLBACK_LTV)
            gross_margin = ltv_data.get("inputs", {}).get("gross_margin", FALLBACK_GROSS_MARGIN)
            ltv_source = "calculated"
        except Exception as e:
            logger.warning(f"Failed to calculate LTV from retention data: {e}. Using fallback.")
            average_ltv = FALLBACK_LTV
            gross_margin = FALLBACK_GROSS_MARGIN
            ltv_source = "fallback"

        # LTV/CAC ratio
        ltv_cac_ratio = round(average_ltv / cac_total, 2) if cac_total > 0 else 0

        # CAC payback period
        if towpilot_acv > 0:
            monthly_gross_profit = (towpilot_acv * gross_margin) / 12
            cac_payback_months = (
                round(cac_total / monthly_gross_profit, 2)
                if monthly_gross_profit > 0
                else 0
            )
        else:
            cac_payback_months = 0

        # Build response
        return {
            "customer_metrics": {
                "towpilot_customers": towpilot_customer_count,
                "total_customers": len(set(s["customer"] for s in all_subscriptions)),
            },
            "revenue_metrics": {
                "mrr": round(towpilot_mrr, 2),
                "arr": round(towpilot_arr, 2),
                "acv": round(towpilot_acv, 2),
                "arpu_monthly": round(arpu_monthly, 2),
            },
            "cac_metrics": {
                "total_cac": cac_total,
                "sales_cost": cac_sales,
                "marketing_cost": cac_marketing,
                "sales_percentage": 54.2,
                "marketing_percentage": 45.8,
            },
            "ltv_metrics": {
                "average_ltv": average_ltv,
                "ltv_cac_ratio": ltv_cac_ratio,
                "cac_payback_months": cac_payback_months,
                "ltv_source": ltv_source,
            },
            "financial_metrics": {
                "gross_margin_percentage": gross_margin * 100,
            },
        }

    @staticmethod
    async def calculate_all_products_metrics() -> Dict:
        """Calculate metrics for all products combined with caching"""

        # Use cache service
        return await cache_service.get_metrics(
            product="all_products",
            calculator=MetricsCalculator._compute_all_products_metrics,
        )

    @staticmethod
    async def _compute_all_products_metrics() -> Dict:
        """Internal method to compute all products metrics from Stripe API"""

        # Get all subscriptions from Stripe
        all_subscriptions = await StripeService.get_active_subscriptions()

        # Calculate total MRR
        total_mrr = await StripeService.calculate_mrr(all_subscriptions)
        total_arr = total_mrr * 12

        # Get customer count
        total_customers = len(set(s["customer"] for s in all_subscriptions))

        # Calculate metrics
        return {
            "total_customers": total_customers,
            "mrr": round(total_mrr, 2),
            "arr": round(total_arr, 2),
            "subscriptions_count": len(all_subscriptions),
        }
