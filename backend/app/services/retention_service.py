"""
Retention and cohort analysis service for customer churn and LTV calculations.

Provides data-driven attrition metrics:
- Early churn rate (0-60 days)
- Steady-state monthly churn (post-60 days)
- Cohort retention curves
- LTV derived from actual retention data
"""
import logging
from datetime import datetime
from typing import Optional

import stripe

from app.core.config import settings
from app.services.stripe_service import StripeService

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY

# Default gross margin from P&L data
DEFAULT_GROSS_MARGIN = 0.558


class RetentionService:
    """Service for calculating retention, churn, and LTV metrics from Stripe data"""

    @staticmethod
    async def get_all_subscriptions_with_lifecycle() -> list[dict]:
        """
        Fetch all subscriptions with lifecycle data for cohort analysis.

        Returns subscriptions with:
        - created: when subscription started
        - canceled_at: when canceled (if applicable)
        - customer: customer ID
        - mrr: monthly recurring revenue
        """
        all_subs = []
        starting_after = None

        while True:
            params = {"limit": 100, "status": "all"}
            if starting_after:
                params["starting_after"] = starting_after

            response = stripe.Subscription.list(**params)

            for sub in response.data:
                # Calculate MRR for this subscription
                mrr = 0.0
                # Stripe objects support dict-style access for nested objects
                for item in sub["items"].data:
                    amount = (item.price.unit_amount or 0) / 100
                    interval = item.price.recurring.interval if item.price.recurring else None
                    interval_count = item.price.recurring.interval_count if item.price.recurring else 1

                    if interval == "year":
                        mrr += amount / 12 / interval_count
                    elif interval == "month":
                        mrr += amount / interval_count
                    elif interval == "week":
                        mrr += (amount * 52) / 12 / interval_count
                    elif interval == "day":
                        mrr += (amount * 30) / interval_count

                all_subs.append({
                    "id": sub.id,
                    "customer": sub.customer,
                    "status": sub.status,
                    "created": sub.created,
                    "canceled_at": sub.canceled_at,
                    "mrr": round(mrr, 2),
                })

            if not response.has_more:
                break

            starting_after = response.data[-1].id

        logger.info(f"Fetched {len(all_subs)} total subscriptions for cohort analysis")
        return all_subs

    @staticmethod
    def group_into_cohorts(subscriptions: list[dict]) -> dict[str, list[dict]]:
        """
        Group subscriptions into monthly cohorts by signup date.

        Args:
            subscriptions: List of subscriptions with 'created' timestamp

        Returns:
            Dict mapping cohort key (YYYY-MM) to list of subscriptions
        """
        cohorts = {}

        for sub in subscriptions:
            created_dt = datetime.fromtimestamp(sub["created"])
            cohort_key = created_dt.strftime("%Y-%m")

            if cohort_key not in cohorts:
                cohorts[cohort_key] = []
            cohorts[cohort_key].append(sub)

        return cohorts

    @staticmethod
    def calculate_cohort_retention(
        cohort: list[dict],
        analysis_date: Optional[datetime] = None
    ) -> dict:
        """
        Calculate retention metrics for a single cohort.

        Args:
            cohort: List of subscriptions in this cohort
            analysis_date: Date to analyze retention at (defaults to now)

        Returns:
            Dict with retention at various intervals
        """
        if analysis_date is None:
            analysis_date = datetime.now()

        analysis_timestamp = int(analysis_date.timestamp())

        # Count subscriptions by retention period
        total = len(cohort)
        if total == 0:
            return {
                "total": 0,
                "retained_30d": 0,
                "retained_60d": 0,
                "retained_90d": 0,
                "retained_180d": 0,
                "retained_365d": 0,
                "retention_30d_pct": 0,
                "retention_60d_pct": 0,
                "retention_90d_pct": 0,
                "retention_180d_pct": 0,
                "retention_365d_pct": 0,
            }

        # Check retention at each interval
        retained_30d = 0
        retained_60d = 0
        retained_90d = 0
        retained_180d = 0
        retained_365d = 0

        for sub in cohort:
            created = sub["created"]
            canceled_at = sub.get("canceled_at")

            # Calculate days active
            if canceled_at:
                # Subscription was canceled
                days_active = (canceled_at - created) / 86400  # seconds to days
            else:
                # Still active - use analysis date
                days_active = (analysis_timestamp - created) / 86400

            # Check if retained at each interval
            if days_active >= 30:
                retained_30d += 1
            if days_active >= 60:
                retained_60d += 1
            if days_active >= 90:
                retained_90d += 1
            if days_active >= 180:
                retained_180d += 1
            if days_active >= 365:
                retained_365d += 1

        return {
            "total": total,
            "retained_30d": retained_30d,
            "retained_60d": retained_60d,
            "retained_90d": retained_90d,
            "retained_180d": retained_180d,
            "retained_365d": retained_365d,
            "retention_30d_pct": round((retained_30d / total) * 100, 1),
            "retention_60d_pct": round((retained_60d / total) * 100, 1),
            "retention_90d_pct": round((retained_90d / total) * 100, 1),
            "retention_180d_pct": round((retained_180d / total) * 100, 1),
            "retention_365d_pct": round((retained_365d / total) * 100, 1),
        }

    @staticmethod
    async def calculate_early_churn(
        subscriptions: list[dict],
        early_period_days: int = 60
    ) -> dict:
        """
        Calculate early churn rate (customers lost within first N days).

        Args:
            subscriptions: All subscriptions with lifecycle data
            early_period_days: Number of days to consider "early" (default 60)

        Returns:
            Dict with early churn metrics
        """
        now = datetime.now()
        now_timestamp = int(now.timestamp())

        # Only analyze subscriptions old enough to have completed the early period
        early_cutoff = now_timestamp - (early_period_days * 86400)

        eligible_subs = [s for s in subscriptions if s["created"] <= early_cutoff]

        if not eligible_subs:
            return {
                "period_days": early_period_days,
                "customers_analyzed": 0,
                "churned_early": 0,
                "churn_rate": 0,
                "retained_past_early": 0,
                "retention_rate": 0,
            }

        # Count churns within early period
        churned_early = 0
        for sub in eligible_subs:
            canceled_at = sub.get("canceled_at")
            if canceled_at:
                days_to_churn = (canceled_at - sub["created"]) / 86400
                if days_to_churn <= early_period_days:
                    churned_early += 1

        total = len(eligible_subs)
        retained = total - churned_early

        return {
            "period_days": early_period_days,
            "customers_analyzed": total,
            "churned_early": churned_early,
            "churn_rate": round((churned_early / total) * 100, 1) if total > 0 else 0,
            "retained_past_early": retained,
            "retention_rate": round((retained / total) * 100, 1) if total > 0 else 0,
        }

    @staticmethod
    async def calculate_steady_state_churn(
        subscriptions: list[dict],
        early_period_days: int = 60,
        lookback_months: int = 6
    ) -> dict:
        """
        Calculate steady-state monthly churn rate (post-early period).

        This measures churn of customers who survived the early period,
        giving a more accurate long-term churn rate.

        Args:
            subscriptions: All subscriptions with lifecycle data
            early_period_days: Days to consider "early" (excluded from this calculation)
            lookback_months: Months of data to analyze

        Returns:
            Dict with steady-state churn metrics
        """
        now = datetime.now()
        now_timestamp = int(now.timestamp())
        lookback_start = now_timestamp - (lookback_months * 30 * 86400)

        # Find subscriptions that:
        # 1. Survived the early period (created before now - early_period_days)
        # 2. Were active at start of lookback period
        early_cutoff = now_timestamp - (early_period_days * 86400)

        # Subscriptions that survived early period
        survivors = []
        for sub in subscriptions:
            if sub["created"] > early_cutoff:
                # Too new, hasn't completed early period
                continue

            canceled_at = sub.get("canceled_at")
            if canceled_at:
                days_to_churn = (canceled_at - sub["created"]) / 86400
                if days_to_churn <= early_period_days:
                    # Churned during early period
                    continue

            survivors.append(sub)

        if not survivors:
            return {
                "monthly_rate": 0,
                "annual_rate": 0,
                "customers_analyzed": 0,
                "churned_in_period": 0,
                "average_lifespan_months": 0,
                "lookback_months": lookback_months,
            }

        # Count churns during lookback period (post-early)
        churned_in_period = 0
        for sub in survivors:
            canceled_at = sub.get("canceled_at")
            if canceled_at and canceled_at >= lookback_start:
                # Verify it's a post-early churn
                days_to_churn = (canceled_at - sub["created"]) / 86400
                if days_to_churn > early_period_days:
                    churned_in_period += 1

        # Calculate monthly churn rate
        # Monthly churn = churned / (survivors * lookback_months)
        monthly_churn_rate = (churned_in_period / (len(survivors) * lookback_months)) * 100 if survivors else 0

        # Annualized churn rate
        annual_churn_rate = (1 - (1 - monthly_churn_rate / 100) ** 12) * 100

        # Average lifespan = 1 / monthly_churn_rate (in months)
        average_lifespan = (100 / monthly_churn_rate) if monthly_churn_rate > 0 else 120  # Cap at 10 years

        return {
            "monthly_rate": round(monthly_churn_rate, 2),
            "annual_rate": round(annual_churn_rate, 1),
            "customers_analyzed": len(survivors),
            "churned_in_period": churned_in_period,
            "average_lifespan_months": round(average_lifespan, 1),
            "lookback_months": lookback_months,
        }

    @staticmethod
    async def calculate_ltv(
        arpu_monthly: float,
        gross_margin: float,
        average_lifespan_months: float
    ) -> dict:
        """
        Calculate Customer Lifetime Value from retention-derived inputs.

        LTV = ARPU × Gross Margin × Average Lifespan (months)

        Args:
            arpu_monthly: Average Revenue Per User (monthly)
            gross_margin: Gross margin percentage (0-1)
            average_lifespan_months: Average customer lifespan in months

        Returns:
            Dict with LTV calculation and methodology
        """
        ltv = arpu_monthly * gross_margin * average_lifespan_months

        return {
            "value": round(ltv, 0),
            "methodology": "ARPU × Gross Margin × Average Lifespan",
            "inputs": {
                "arpu_monthly": round(arpu_monthly, 2),
                "gross_margin": gross_margin,
                "average_lifespan_months": round(average_lifespan_months, 1),
            },
            "breakdown": {
                "monthly_gross_profit": round(arpu_monthly * gross_margin, 2),
                "lifetime_gross_profit": round(ltv, 2),
            }
        }

    @staticmethod
    async def get_attrition_summary(
        early_period_days: int = 60,
        lookback_months: int = 6,
        gross_margin: Optional[float] = None
    ) -> dict:
        """
        Get comprehensive attrition summary with investor-ready narrative.

        This is the main entry point for attrition analysis, providing:
        - Early churn rate
        - Steady-state monthly churn
        - LTV calculation with methodology
        - Clear narrative explanation

        Args:
            early_period_days: Days for early churn window (default 60)
            lookback_months: Months of data for steady-state calculation
            gross_margin: Override gross margin (default uses P&L data)

        Returns:
            Dict with complete attrition analysis
        """
        margin = gross_margin if gross_margin is not None else DEFAULT_GROSS_MARGIN

        # Fetch all subscription lifecycle data
        subscriptions = await RetentionService.get_all_subscriptions_with_lifecycle()

        # Calculate early churn
        early_churn = await RetentionService.calculate_early_churn(
            subscriptions, early_period_days
        )

        # Calculate steady-state churn
        steady_state = await RetentionService.calculate_steady_state_churn(
            subscriptions, early_period_days, lookback_months
        )

        # Get current ARPU from Stripe
        active_subs = await StripeService.get_active_subscriptions()
        arpu_data = await StripeService.calculate_arpu(active_subs)
        arpu_monthly = arpu_data.get("arpu_monthly", 0)

        # Calculate LTV
        average_lifespan = steady_state.get("average_lifespan_months", 36)
        ltv = await RetentionService.calculate_ltv(arpu_monthly, margin, average_lifespan)

        # Generate narrative
        narrative = RetentionService._generate_narrative(
            early_churn, steady_state, ltv, arpu_monthly
        )

        return {
            "narrative": narrative,
            "early_churn": early_churn,
            "steady_state_churn": steady_state,
            "ltv": ltv,
            "arpu": {
                "monthly": arpu_monthly,
                "annual": arpu_monthly * 12,
            },
            "gross_margin": margin,
            "data_source": {
                "subscriptions_analyzed": len(subscriptions),
                "active_subscriptions": len(active_subs),
                "timestamp": datetime.now().isoformat(),
            }
        }

    @staticmethod
    def _generate_narrative(
        early_churn: dict,
        steady_state: dict,
        ltv: dict,
        arpu_monthly: float
    ) -> str:
        """
        Generate investor-ready narrative explaining attrition and LTV.
        """
        early_rate = early_churn.get("churn_rate", 0)
        early_period = early_churn.get("period_days", 60)
        monthly_rate = steady_state.get("monthly_rate", 0)
        lifespan = steady_state.get("average_lifespan_months", 0)
        ltv_value = ltv.get("value", 0)

        # Handle edge cases
        if early_churn.get("customers_analyzed", 0) == 0:
            return "Insufficient data to calculate attrition metrics. More subscription history needed."

        if monthly_rate == 0:
            return (
                f"{early_rate:.0f}% of customers churn within the first {early_period} days. "
                f"No steady-state churn observed in mature customers, indicating strong retention. "
                f"With ARPU of ${arpu_monthly:.0f}/month, LTV is estimated at ${ltv_value:,.0f}."
            )

        return (
            f"{early_rate:.0f}% of customers churn within the first {early_period} days. "
            f"After that initial period, monthly churn stabilizes at {monthly_rate:.1f}%, "
            f"giving an average customer lifespan of {lifespan:.0f} months and "
            f"LTV of ${ltv_value:,.0f}."
        )

    @staticmethod
    async def get_cohort_retention_data() -> dict:
        """
        Get detailed cohort retention data for visualization.

        Returns retention curves for each monthly cohort, suitable for
        charting survival curves.

        Returns:
            Dict with cohort-by-cohort retention data
        """
        subscriptions = await RetentionService.get_all_subscriptions_with_lifecycle()
        cohorts = RetentionService.group_into_cohorts(subscriptions)

        cohort_data = []
        for cohort_key in sorted(cohorts.keys()):
            cohort = cohorts[cohort_key]
            retention = RetentionService.calculate_cohort_retention(cohort)

            # Calculate MRR for this cohort
            cohort_mrr = sum(s.get("mrr", 0) for s in cohort if s.get("status") == "active")

            cohort_data.append({
                "cohort": cohort_key,
                "cohort_label": datetime.strptime(cohort_key, "%Y-%m").strftime("%b %Y"),
                "size": retention["total"],
                "current_mrr": round(cohort_mrr, 2),
                "retention": {
                    "30d": retention["retention_30d_pct"],
                    "60d": retention["retention_60d_pct"],
                    "90d": retention["retention_90d_pct"],
                    "180d": retention["retention_180d_pct"],
                    "365d": retention["retention_365d_pct"],
                },
                "retained": {
                    "30d": retention["retained_30d"],
                    "60d": retention["retained_60d"],
                    "90d": retention["retained_90d"],
                    "180d": retention["retained_180d"],
                    "365d": retention["retained_365d"],
                }
            })

        # Calculate averages across all cohorts
        total_cohorts = len(cohort_data)
        if total_cohorts > 0:
            avg_retention = {
                "30d": round(sum(c["retention"]["30d"] for c in cohort_data) / total_cohorts, 1),
                "60d": round(sum(c["retention"]["60d"] for c in cohort_data) / total_cohorts, 1),
                "90d": round(sum(c["retention"]["90d"] for c in cohort_data) / total_cohorts, 1),
                "180d": round(sum(c["retention"]["180d"] for c in cohort_data) / total_cohorts, 1),
                "365d": round(sum(c["retention"]["365d"] for c in cohort_data) / total_cohorts, 1),
            }
        else:
            avg_retention = {"30d": 0, "60d": 0, "90d": 0, "180d": 0, "365d": 0}

        return {
            "cohorts": cohort_data,
            "average_retention": avg_retention,
            "total_cohorts": total_cohorts,
            "timestamp": datetime.now().isoformat(),
        }

    @staticmethod
    async def get_ltv_calculation() -> dict:
        """
        Get detailed LTV calculation with full methodology breakdown.

        Returns:
            Dict with LTV value and complete calculation steps
        """
        # Get attrition data
        summary = await RetentionService.get_attrition_summary()

        ltv = summary.get("ltv", {})
        arpu = summary.get("arpu", {})
        steady_state = summary.get("steady_state_churn", {})
        early_churn = summary.get("early_churn", {})
        gross_margin = summary.get("gross_margin", DEFAULT_GROSS_MARGIN)

        return {
            "ltv_value": ltv.get("value", 0),
            "methodology": {
                "formula": "LTV = ARPU × Gross Margin × Average Lifespan",
                "steps": [
                    {
                        "step": 1,
                        "description": "Calculate ARPU from active subscriptions",
                        "value": arpu.get("monthly", 0),
                        "unit": "$/month"
                    },
                    {
                        "step": 2,
                        "description": "Apply gross margin from P&L",
                        "value": gross_margin,
                        "unit": "percentage"
                    },
                    {
                        "step": 3,
                        "description": "Derive average lifespan from steady-state churn",
                        "value": steady_state.get("average_lifespan_months", 0),
                        "unit": "months",
                        "calculation": f"1 / {steady_state.get('monthly_rate', 0):.2f}% monthly churn"
                    },
                    {
                        "step": 4,
                        "description": "Multiply to get LTV",
                        "value": ltv.get("value", 0),
                        "unit": "$"
                    }
                ]
            },
            "inputs": {
                "arpu_monthly": arpu.get("monthly", 0),
                "arpu_annual": arpu.get("annual", 0),
                "gross_margin": gross_margin,
                "early_churn_rate": early_churn.get("churn_rate", 0),
                "steady_state_monthly_churn": steady_state.get("monthly_rate", 0),
                "average_lifespan_months": steady_state.get("average_lifespan_months", 0),
            },
            "comparison": {
                "previous_hardcoded": 14100,
                "new_calculated": ltv.get("value", 0),
                "difference": ltv.get("value", 0) - 14100,
                "difference_pct": round(((ltv.get("value", 0) - 14100) / 14100) * 100, 1) if ltv.get("value", 0) else 0
            },
            "timestamp": datetime.now().isoformat(),
        }

