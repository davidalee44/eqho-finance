import logging
from datetime import datetime, timedelta
from typing import Any, Callable, Dict, List, Optional

import stripe

from app.core.config import settings

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY

# Pagination constants
DEFAULT_PAGE_SIZE = 100
MAX_ITERATIONS = 100  # Safety limit to prevent infinite loops


class StripeService:
    """Service for interacting with Stripe API and calculating metrics"""

    @staticmethod
    async def _paginate_stripe_list(
        list_fn: Callable,
        params: Dict[str, Any],
        item_processor: Optional[Callable] = None,
        filter_fn: Optional[Callable] = None,
        page_size: int = DEFAULT_PAGE_SIZE,
    ) -> List[Dict]:
        """
        Generic pagination helper for Stripe list APIs.

        Ensures complete data retrieval by checking both has_more flag
        AND verifying if the page was full (hit the limit).

        Args:
            list_fn: Stripe list function (e.g., stripe.Customer.list)
            params: Base parameters for the API call
            item_processor: Optional function to transform each item
            filter_fn: Optional function to filter items (return True to include)
            page_size: Number of items per page (default 100)

        Returns:
            List of all items (processed and filtered)
        """
        results = []
        starting_after = None
        iteration = 0
        total_fetched = 0

        while iteration < MAX_ITERATIONS:
            iteration += 1

            # Build params with pagination
            page_params = {**params, "limit": page_size}
            if starting_after:
                page_params["starting_after"] = starting_after

            response = list_fn(**page_params)
            page_count = len(response.data)
            total_fetched += page_count

            logger.debug(
                f"Pagination: iteration={iteration}, page_count={page_count}, "
                f"total_fetched={total_fetched}, has_more={response.has_more}"
            )

            for item in response.data:
                # Apply filter if provided
                if filter_fn and not filter_fn(item):
                    continue

                # Process item or use as-is
                if item_processor:
                    processed = item_processor(item)
                    if processed is not None:
                        results.append(processed)
                else:
                    results.append(item)

            # Check if we should continue - use BOTH has_more and page fullness
            # This ensures we don't miss data if has_more is incorrectly set
            if not response.has_more:
                break

            # Safety check: if page wasn't full but has_more is True, trust has_more
            # If page was full, definitely continue
            if page_count < page_size:
                # Page wasn't full - API says there's more but page isn't full
                # This shouldn't happen normally, but trust the has_more flag
                logger.warning(
                    f"Pagination warning: has_more=True but page not full (got {page_count}, expected {page_size})"
                )

            if not response.data:
                # Empty page - shouldn't happen with has_more=True
                logger.warning("Empty page received despite has_more=True")
                break

            starting_after = response.data[-1].id

        if iteration >= MAX_ITERATIONS:
            logger.error(
                f"Pagination hit MAX_ITERATIONS ({MAX_ITERATIONS}). "
                f"Total fetched: {total_fetched}. Data may be incomplete."
            )

        logger.info(f"Pagination complete: {len(results)} results in {iteration} iterations")
        return results

    @staticmethod
    async def get_all_customers(has_tag: Optional[str] = None) -> List[Dict]:
        """
        Fetch all customers, optionally filtered by tag

        Args:
            has_tag: Filter customers by metadata tag (e.g., "tow" for TowPilot)
        """

        def process_customer(customer):
            return {
                "id": customer.id,
                "email": customer.email,
                "created": customer.created,
                "metadata": customer.metadata,
            }

        def filter_by_tag(customer):
            if not has_tag:
                return True
            # customer is a Stripe object, use dot notation not .get()
            metadata = customer.metadata or {}
            tags = metadata.get("tags", "") if isinstance(metadata, dict) else getattr(metadata, "tags", "")
            return has_tag in tags if tags else False

        return await StripeService._paginate_stripe_list(
            list_fn=stripe.Customer.list,
            params={},
            item_processor=process_customer,
            filter_fn=filter_by_tag if has_tag else None,
        )

    @staticmethod
    async def get_active_subscriptions(
        customer_ids: Optional[List[str]] = None,
    ) -> List[Dict]:
        """Fetch active subscriptions, optionally filtered by customer IDs"""
        customer_id_set = set(customer_ids) if customer_ids else None

        def process_subscription(sub):
            return {
                "id": sub.id,
                "customer": sub.customer,
                "status": sub.status,
                "current_period_start": sub.current_period_start,
                "current_period_end": sub.current_period_end,
                "items": [
                    {
                        "price": item.price.id,
                        "amount": item.price.unit_amount,
                        "currency": item.price.currency,
                        "interval": item.price.recurring.interval if item.price.recurring else None,
                        "interval_count": item.price.recurring.interval_count if item.price.recurring else 1,
                    }
                    for item in sub["items"].data  # Stripe objects support dict-style access
                ],
            }

        def filter_by_customer(sub):
            if not customer_id_set:
                return True
            return sub.customer in customer_id_set

        return await StripeService._paginate_stripe_list(
            list_fn=stripe.Subscription.list,
            params={"status": "active"},
            item_processor=process_subscription,
            filter_fn=filter_by_customer if customer_ids else None,
        )

    @staticmethod
    async def calculate_mrr(subscriptions: List[Dict]) -> float:
        """Calculate Monthly Recurring Revenue from subscriptions

        Excludes $0 subscriptions (trials, free tiers) from MRR calculation.
        """
        mrr = 0.0

        for sub in subscriptions:
            for item in sub["items"]:
                amount = item["amount"] / 100  # Convert cents to dollars

                # Skip $0 subscriptions (trials, free tiers)
                if amount == 0:
                    continue

                interval = item["interval"]
                interval_count = item.get("interval_count", 1) or 1

                # Normalize to monthly MRR
                # interval_count handles multi-period billing (e.g., every 3 months, every 2 years)
                if interval == "year":
                    mrr += amount / 12 / interval_count
                elif interval == "month":
                    # Handle quarterly (interval_count=3), semi-annual (6), etc.
                    mrr += amount / interval_count
                elif interval == "day":
                    mrr += (amount * 30) / interval_count
                elif interval == "week":
                    # Weekly subscriptions: (amount * 52 weeks) / 12 months
                    mrr += (amount * 52) / 12 / interval_count

        return round(mrr, 2)

    @staticmethod
    async def calculate_acv(subscriptions: List[Dict]) -> float:
        """Calculate Average Contract Value"""
        if not subscriptions:
            return 0.0

        total_annual_value = 0.0

        for sub in subscriptions:
            annual_value = 0.0
            for item in sub["items"]:
                amount = item["amount"] / 100
                interval = item["interval"]
                interval_count = item.get("interval_count", 1) or 1

                # Normalize to annual
                # interval_count handles multi-period billing (e.g., every 3 months, every 2 years)
                if interval == "year":
                    annual_value += amount / interval_count
                elif interval == "month":
                    annual_value += (amount * 12) / interval_count
                elif interval == "day":
                    annual_value += (amount * 365) / interval_count

            total_annual_value += annual_value

        return round(total_annual_value / len(subscriptions), 2)

    @staticmethod
    async def get_revenue_by_month(months: int = 12) -> List[Dict]:
        """
        Get revenue data for the past N months

        Args:
            months: Number of months of historical data to fetch
        """
        end_date = datetime.now()
        start_date = end_date - timedelta(days=months * 30)

        # Group by month
        monthly_revenue = {}

        def process_charge(charge):
            if not charge.paid:
                return None

            month_key = datetime.fromtimestamp(charge.created).strftime("%Y-%m")
            return {
                "month_key": month_key,
                "amount": charge.amount / 100,
            }

        # Fetch charges using pagination helper
        charges = await StripeService._paginate_stripe_list(
            list_fn=stripe.Charge.list,
            params={
                "created": {
                    "gte": int(start_date.timestamp()),
                    "lte": int(end_date.timestamp()),
                },
            },
            item_processor=process_charge,
        )

        # Aggregate by month
        for charge_data in charges:
            if charge_data is None:
                continue
            month_key = charge_data["month_key"]
            if month_key not in monthly_revenue:
                monthly_revenue[month_key] = 0.0
            monthly_revenue[month_key] += charge_data["amount"]

        # Format as list
        result = []
        for month_key in sorted(monthly_revenue.keys()):
            date_obj = datetime.strptime(month_key, "%Y-%m")
            result.append(
                {
                    "month": date_obj.strftime("%b %Y"),
                    "revenue": round(monthly_revenue[month_key], 2),
                }
            )

        return result

    @staticmethod
    async def _get_all_subscriptions_with_items() -> List[Dict]:
        """
        Fetch all subscriptions (active and canceled) with item details.
        Uses pagination helper to ensure complete data retrieval.
        """

        def process_subscription(sub):
            return {
                "id": sub.id,
                "customer": sub.customer,
                "status": sub.status,
                "canceled_at": sub.canceled_at,
                "created": sub.created,
                "current_period_start": sub.current_period_start,
                "items": [
                    {
                        "price": item.price.id,
                        "amount": item.price.unit_amount,
                        "currency": item.price.currency,
                        "interval": item.price.recurring.interval if item.price.recurring else None,
                    }
                    for item in sub["items"].data  # Stripe objects support dict-style access
                ],
            }

        return await StripeService._paginate_stripe_list(
            list_fn=stripe.Subscription.list,
            params={},
            item_processor=process_subscription,
        )

    @staticmethod
    async def _get_all_subscriptions_basic() -> List[Dict]:
        """
        Fetch all subscriptions (active and canceled) with basic details.
        Uses pagination helper to ensure complete data retrieval.
        """

        def process_subscription(sub):
            return {
                "id": sub.id,
                "customer": sub.customer,
                "status": sub.status,
                "canceled_at": sub.canceled_at,
                "created": sub.created,
            }

        return await StripeService._paginate_stripe_list(
            list_fn=stripe.Subscription.list,
            params={},
            item_processor=process_subscription,
        )

    @staticmethod
    async def calculate_churn_rate(months: int = 3) -> Dict:
        """
        Calculate customer and revenue churn rates from Stripe data

        Args:
            months: Number of months to analyze

        Returns:
            Dict with customer_churn_rate, revenue_churn_rate, and details
        """
        end_date = datetime.now()
        start_date = end_date - timedelta(days=months * 30)

        # Get all subscriptions (active and canceled) using pagination helper
        all_subscriptions = await StripeService._get_all_subscriptions_with_items()

        # Calculate MRR for active subscriptions
        active_subscriptions = [s for s in all_subscriptions if s["status"] == "active"]
        current_mrr = await StripeService.calculate_mrr(active_subscriptions)

        # Find subscriptions that were active at start_date but canceled before end_date
        start_timestamp = int(start_date.timestamp())
        end_timestamp = int(end_date.timestamp())

        # Subscriptions active at start of period
        active_at_start = [
            s
            for s in all_subscriptions
            if s["created"] < start_timestamp
            and (s["status"] == "active" or (s["canceled_at"] and s["canceled_at"] >= start_timestamp))
        ]

        # Subscriptions that churned during the period
        churned_subscriptions = [
            s for s in all_subscriptions if s["canceled_at"] and start_timestamp <= s["canceled_at"] < end_timestamp
        ]

        # Calculate MRR lost from churned subscriptions
        churned_mrr = await StripeService.calculate_mrr(churned_subscriptions)

        # Calculate MRR at start of period (approximate)
        # Use current MRR as proxy if we don't have historical data
        start_mrr = current_mrr + churned_mrr

        # Customer churn rate
        unique_customers_at_start = len(set(s["customer"] for s in active_at_start))
        unique_churned_customers = len(set(s["customer"] for s in churned_subscriptions))

        customer_churn_rate = (
            (unique_churned_customers / unique_customers_at_start * 100) if unique_customers_at_start > 0 else 0.0
        )

        # Revenue churn rate
        revenue_churn_rate = (churned_mrr / start_mrr * 100) if start_mrr > 0 else 0.0

        return {
            "customer_churn_rate": round(customer_churn_rate, 2),
            "revenue_churn_rate": round(revenue_churn_rate, 2),
            "period_months": months,
            "customers_at_start": unique_customers_at_start,
            "customers_churned": unique_churned_customers,
            "mrr_at_start": round(start_mrr, 2),
            "mrr_churned": round(churned_mrr, 2),
            "current_mrr": round(current_mrr, 2),
        }

    @staticmethod
    async def calculate_arpu(subscriptions: Optional[List[Dict]] = None) -> Dict:
        """
        Calculate Average Revenue Per User (ARPU)

        Args:
            subscriptions: Optional list of subscriptions. If None, fetches all active.

        Returns:
            Dict with ARPU metrics
        """
        if subscriptions is None:
            subscriptions = await StripeService.get_active_subscriptions()

        if not subscriptions:
            return {
                "arpu_monthly": 0.0,
                "arpu_annual": 0.0,
                "total_customers": 0,
                "total_mrr": 0.0,
            }

        # Calculate MRR
        total_mrr = await StripeService.calculate_mrr(subscriptions)

        # Get unique customers
        unique_customers = len(set(s["customer"] for s in subscriptions))

        # Calculate ARPU
        arpu_monthly = (total_mrr / unique_customers) if unique_customers > 0 else 0.0
        arpu_annual = arpu_monthly * 12

        return {
            "arpu_monthly": round(arpu_monthly, 2),
            "arpu_annual": round(arpu_annual, 2),
            "total_customers": unique_customers,
            "total_mrr": round(total_mrr, 2),
        }

    @staticmethod
    async def calculate_customer_metrics() -> Dict:
        """
        Calculate comprehensive customer metrics including active, churned, net adds, and growth

        Returns:
            Dict with customer counts, growth metrics, and historical data
        """
        # Get all subscriptions (active and canceled) using pagination helper
        all_subscriptions = await StripeService._get_all_subscriptions_basic()

        # Active customers (unique)
        active_subscriptions = [s for s in all_subscriptions if s["status"] == "active"]
        active_customers = len(set(s["customer"] for s in active_subscriptions))

        # Churned customers (all time - unique customers who have canceled)
        churned_subscriptions = [s for s in all_subscriptions if s.get("canceled_at")]
        churned_customers = len(set(s["customer"] for s in churned_subscriptions))

        # Calculate growth metrics (YTD - Jan 1 to now)
        current_year = datetime.now().year
        year_start = datetime(current_year, 1, 1)
        year_start_timestamp = int(year_start.timestamp())

        # Customers created this year
        new_customers_ytd = len(set(s["customer"] for s in all_subscriptions if s["created"] >= year_start_timestamp))

        # Customers at start of year (approximate - those created before year start)
        customers_at_year_start = len(
            set(s["customer"] for s in all_subscriptions if s["created"] < year_start_timestamp)
        )

        # Net adds = new customers - churned customers this year
        churned_this_year = len(
            set(
                s["customer"]
                for s in churned_subscriptions
                if s.get("canceled_at") and s["canceled_at"] >= year_start_timestamp
            )
        )
        net_adds = new_customers_ytd - churned_this_year

        # Growth rate calculation
        growth_rate = (
            ((active_customers - customers_at_year_start) / customers_at_year_start * 100)
            if customers_at_year_start > 0
            else 0.0
        )

        return {
            "active_customers": active_customers,
            "churned_customers": churned_customers,
            "total_customers_all_time": active_customers + churned_customers,
            "net_adds_ytd": net_adds,
            "new_customers_ytd": new_customers_ytd,
            "churned_ytd": churned_this_year,
            "growth_rate_ytd": round(growth_rate, 1),
            "customers_at_year_start": customers_at_year_start,
            "timestamp": datetime.now().isoformat(),
        }

    @staticmethod
    async def calculate_retention_by_segment() -> Dict:
        """
        Calculate retention rates by product segment (TowPilot vs Other Products)

        Returns:
            Dict with retention rates for TowPilot, Other Products, and Overall
        """
        # Cache for customer metadata to avoid repeated API calls
        customer_cache = {}

        def process_subscription_with_segment(sub):
            # Get customer metadata to identify TowPilot customers
            customer_id = sub.customer
            if customer_id not in customer_cache:
                try:
                    customer = stripe.Customer.retrieve(customer_id)
                    tags = customer.get("metadata", {}).get("tags", "")
                    customer_cache[customer_id] = "tow" in tags.lower() if tags else False
                except Exception as e:
                    logger.warning(f"Failed to retrieve customer {customer_id}: {e}")
                    customer_cache[customer_id] = False

            return {
                "id": sub.id,
                "customer": customer_id,
                "status": sub.status,
                "canceled_at": sub.canceled_at,
                "created": sub.created,
                "is_towpilot": customer_cache[customer_id],
            }

        # Get all subscriptions using pagination helper
        all_subscriptions = await StripeService._paginate_stripe_list(
            list_fn=stripe.Subscription.list,
            params={},
            item_processor=process_subscription_with_segment,
        )

        # Calculate retention for TowPilot
        towpilot_subs = [s for s in all_subscriptions if s["is_towpilot"]]
        towpilot_active = len([s for s in towpilot_subs if s["status"] == "active"])
        towpilot_churned = len([s for s in towpilot_subs if s.get("canceled_at")])
        towpilot_total = towpilot_active + towpilot_churned
        towpilot_retention = (towpilot_active / towpilot_total * 100) if towpilot_total > 0 else 0.0

        # Calculate retention for Other Products
        other_subs = [s for s in all_subscriptions if not s["is_towpilot"]]
        other_active = len([s for s in other_subs if s["status"] == "active"])
        other_churned = len([s for s in other_subs if s.get("canceled_at")])
        other_total = other_active + other_churned
        other_retention = (other_active / other_total * 100) if other_total > 0 else 0.0

        # Overall retention
        overall_active = len([s for s in all_subscriptions if s["status"] == "active"])
        overall_churned = len([s for s in all_subscriptions if s.get("canceled_at")])
        overall_total = overall_active + overall_churned
        overall_retention = (overall_active / overall_total * 100) if overall_total > 0 else 0.0

        return {
            "towpilot": {
                "retention_rate": round(towpilot_retention, 1),
                "active_customers": towpilot_active,
                "churned_customers": towpilot_churned,
                "total_customers": towpilot_total,
            },
            "other_products": {
                "retention_rate": round(other_retention, 1),
                "active_customers": other_active,
                "churned_customers": other_churned,
                "total_customers": other_total,
            },
            "overall": {
                "retention_rate": round(overall_retention, 1),
                "active_customers": overall_active,
                "churned_customers": overall_churned,
                "total_customers": overall_total,
            },
            "timestamp": datetime.now().isoformat(),
        }

    @staticmethod
    async def calculate_pricing_tier_breakdown() -> Dict:
        """
        Calculate pricing tier breakdown for TowPilot subscriptions

        Returns:
            Dict with tier breakdown including customers, MRR, ARPU, and percentages
        """
        # Get TowPilot subscriptions
        towpilot_customers = await StripeService.get_all_customers(has_tag="tow")
        towpilot_customer_ids = [c["id"] for c in towpilot_customers]
        towpilot_subscriptions = await StripeService.get_active_subscriptions(customer_ids=towpilot_customer_ids)

        # Group by pricing tier (based on MRR amount)
        # This is a simplified approach - in production, you'd use price IDs or metadata
        tiers = {
            "Heavy Duty": {"threshold": 1000, "customers": [], "mrr": 0.0},
            "Medium Duty": {"threshold": 500, "customers": [], "mrr": 0.0},
            "Standard": {"threshold": 400, "customers": [], "mrr": 0.0},
            "Basic/Light": {"threshold": 300, "customers": [], "mrr": 0.0},
            "Other/Custom": {"threshold": 0, "customers": [], "mrr": 0.0},
        }

        for sub in towpilot_subscriptions:
            sub_mrr = await StripeService.calculate_mrr([sub])
            customer_id = sub["customer"]

            # Categorize by MRR
            if sub_mrr >= tiers["Heavy Duty"]["threshold"]:
                tier = "Heavy Duty"
            elif sub_mrr >= tiers["Medium Duty"]["threshold"]:
                tier = "Medium Duty"
            elif sub_mrr >= tiers["Standard"]["threshold"]:
                tier = "Standard"
            elif sub_mrr >= tiers["Basic/Light"]["threshold"]:
                tier = "Basic/Light"
            else:
                tier = "Other/Custom"

            if customer_id not in tiers[tier]["customers"]:
                tiers[tier]["customers"].append(customer_id)
            tiers[tier]["mrr"] += sub_mrr

        # Calculate totals
        total_customers = sum(len(t["customers"]) for t in tiers.values())
        total_mrr = sum(t["mrr"] for t in tiers.values())

        # Format results
        result = []
        for tier_name, tier_data in tiers.items():
            customers = len(tier_data["customers"])
            mrr = tier_data["mrr"]
            arpu = (mrr / customers) if customers > 0 else 0.0
            percentage = (mrr / total_mrr * 100) if total_mrr > 0 else 0.0

            result.append(
                {
                    "tier": tier_name,
                    "customers": customers,
                    "mrr": round(mrr, 2),
                    "arpu": round(arpu, 2),
                    "percentage": round(percentage, 1),
                }
            )

        return {
            "tiers": result,
            "total_customers": total_customers,
            "total_mrr": round(total_mrr, 2),
            "timestamp": datetime.now().isoformat(),
        }

    @staticmethod
    async def calculate_expansion_metrics() -> Dict:
        """
        Calculate expansion metrics including gross and net retention

        Returns:
            Dict with gross retention, net retention, and expansion revenue metrics
        """
        # Look back 12 months for retention calculation
        end_date = datetime.now()
        start_date = end_date - timedelta(days=365)
        start_timestamp = int(start_date.timestamp())

        # Get all subscriptions with historical data using pagination helper
        all_subscriptions = await StripeService._get_all_subscriptions_with_items()

        # Subscriptions active at start of period
        active_at_start = [
            s
            for s in all_subscriptions
            if s["created"] < start_timestamp
            and (s["status"] == "active" or (s.get("canceled_at") and s["canceled_at"] >= start_timestamp))
        ]

        # Calculate MRR at start
        start_mrr = await StripeService.calculate_mrr(active_at_start)

        # Current active subscriptions (those still active from start period)
        still_active = [s for s in active_at_start if s["status"] == "active"]
        current_mrr = await StripeService.calculate_mrr(still_active)

        # Gross retention = (start_mrr - churned_mrr) / start_mrr
        churned_subs = [s for s in active_at_start if s.get("canceled_at") and s["canceled_at"] >= start_timestamp]
        churned_mrr = await StripeService.calculate_mrr(churned_subs)
        gross_retention = ((start_mrr - churned_mrr) / start_mrr * 100) if start_mrr > 0 else 0.0

        # Net retention = current_mrr / start_mrr (includes expansion)
        net_retention = (current_mrr / start_mrr * 100) if start_mrr > 0 else 0.0

        # Expansion revenue = net retention - gross retention
        expansion_revenue_pct = net_retention - gross_retention

        return {
            "gross_retention": round(gross_retention, 1),
            "net_retention": round(net_retention, 1),
            "expansion_revenue_pct": round(expansion_revenue_pct, 1),
            "mrr_at_start": round(start_mrr, 2),
            "current_mrr": round(current_mrr, 2),
            "churned_mrr": round(churned_mrr, 2),
            "timestamp": datetime.now().isoformat(),
        }

    @staticmethod
    async def calculate_unit_economics() -> Dict:
        """
        Calculate unit economics including CAC, LTV, LTV/CAC ratio, and payback period

        Note: CAC is assumed from investor deck data. LTV is calculated from ARPU and gross margin.

        Returns:
            Dict with CAC, LTV, LTV/CAC ratio, and payback period
        """
        # Get subscriptions and calculate ARPU
        subscriptions = await StripeService.get_active_subscriptions()
        arpu_data = await StripeService.calculate_arpu(subscriptions)

        # Assumed CAC from investor deck (could be made configurable)
        cac_total = 831.0
        cac_sales = 450.0
        cac_marketing = 381.0

        # Calculate LTV (36-month horizon @ 55.8% gross margin)
        gross_margin = 0.558
        ltv_months = 36
        monthly_gross_profit = arpu_data["arpu_monthly"] * gross_margin
        ltv = monthly_gross_profit * ltv_months

        # LTV/CAC ratio
        ltv_cac_ratio = (ltv / cac_total) if cac_total > 0 else 0.0

        # CAC payback period (months to recover CAC)
        cac_payback = (cac_total / monthly_gross_profit) if monthly_gross_profit > 0 else 0.0

        return {
            "cac": {
                "total": round(cac_total, 2),
                "sales": round(cac_sales, 2),
                "marketing": round(cac_marketing, 2),
            },
            "ltv": {
                "value": round(ltv, 2),
                "months": ltv_months,
                "gross_margin": gross_margin,
                "monthly_gross_profit": round(monthly_gross_profit, 2),
            },
            "ltv_cac_ratio": round(ltv_cac_ratio, 2),
            "cac_payback_months": round(cac_payback, 2),
            "arpu_monthly": arpu_data["arpu_monthly"],
            "timestamp": datetime.now().isoformat(),
        }

    @staticmethod
    async def get_stripe_balance() -> Dict:
        """
        Fetch Stripe account balance (available + pending).

        Returns:
            Dict with available, pending, and total balances per currency
        """
        try:
            balance = stripe.Balance.retrieve()

            # Process available balance
            available = []
            total_available_usd = 0
            for bal in balance.available:
                amount = bal.amount / 100  # Convert cents to dollars
                available.append(
                    {
                        "amount": amount,
                        "currency": bal.currency.upper(),
                    }
                )
                if bal.currency == "usd":
                    total_available_usd = amount

            # Process pending balance
            pending = []
            total_pending_usd = 0
            for bal in balance.pending:
                amount = bal.amount / 100
                pending.append(
                    {
                        "amount": amount,
                        "currency": bal.currency.upper(),
                    }
                )
                if bal.currency == "usd":
                    total_pending_usd = amount

            # Process instant available if present
            instant_available = []
            if hasattr(balance, "instant_available") and balance.instant_available:
                for bal in balance.instant_available:
                    instant_available.append(
                        {
                            "amount": bal.amount / 100,
                            "currency": bal.currency.upper(),
                        }
                    )

            return {
                "available": available,
                "pending": pending,
                "instant_available": instant_available,
                "total_available_usd": round(total_available_usd, 2),
                "total_pending_usd": round(total_pending_usd, 2),
                "total_balance_usd": round(total_available_usd + total_pending_usd, 2),
                "timestamp": datetime.now().isoformat(),
            }
        except Exception as e:
            logger.error(f"Error fetching Stripe balance: {e}")
            raise

    @staticmethod
    async def get_upcoming_billings(days: int = 30) -> Dict:
        """
        Get upcoming subscription billings for the next N days.

        Calculates expected billings based on active subscription renewal dates.

        Args:
            days: Number of days to look ahead (default 30)

        Returns:
            Dict with billings grouped by time period and cohort
        """
        now = datetime.now()
        today_start = datetime(now.year, now.month, now.day)
        tomorrow_start = today_start + timedelta(days=1)
        week_end = today_start + timedelta(days=7)
        month_end = today_start + timedelta(days=days)

        # Get all active subscriptions with billing info
        def process_subscription(sub):
            # Get customer metadata for cohort identification
            customer_id = sub.customer
            customer = None  # Initialize before try block to avoid NameError
            cohort = "unknown"

            try:
                customer = stripe.Customer.retrieve(customer_id)
                # Use dot notation for Stripe object (not .get() which is for dicts)
                metadata = customer.metadata or {}
                tags = metadata.get("tags", "") if isinstance(metadata, dict) else getattr(metadata, "tags", "")
                cohort = "towpilot" if tags and "tow" in tags.lower() else "eqho"
            except Exception as e:
                logger.debug(f"Could not retrieve customer {customer_id}: {e}")

            # Calculate monthly amount
            monthly_amount = 0
            for item in sub["items"].data:
                amount = (item.price.unit_amount or 0) / 100
                interval = item.price.recurring.interval if item.price.recurring else None
                interval_count = item.price.recurring.interval_count if item.price.recurring else 1

                if interval == "month":
                    monthly_amount += amount / interval_count
                elif interval == "year":
                    monthly_amount += amount / 12 / interval_count
                elif interval == "week":
                    monthly_amount += (amount * 52) / 12 / interval_count

            return {
                "id": sub.id,
                "customer_id": customer_id,
                "customer_email": customer.email if customer else None,
                "customer_name": customer.name if customer else None,
                "cohort": cohort,
                "amount": round(monthly_amount, 2),
                "currency": "usd",
                "current_period_end": sub.current_period_end,
                "billing_date": datetime.fromtimestamp(sub.current_period_end),
            }

        # Fetch active subscriptions
        subscriptions = await StripeService._paginate_stripe_list(
            list_fn=stripe.Subscription.list,
            params={"status": "active"},
            item_processor=process_subscription,
        )

        # Group by time period
        today_billings = []
        tomorrow_billings = []
        week_billings = []
        month_billings = []

        today_total = 0
        tomorrow_total = 0
        week_total = 0
        month_total = 0

        # Cohort totals
        cohort_totals = {
            "towpilot": {"today": 0, "tomorrow": 0, "week": 0, "month": 0},
            "eqho": {"today": 0, "tomorrow": 0, "week": 0, "month": 0},
            "unknown": {"today": 0, "tomorrow": 0, "week": 0, "month": 0},
        }

        for sub in subscriptions:
            billing_date = sub["billing_date"]
            amount = sub["amount"]
            cohort = sub["cohort"]

            billing_info = {
                "subscription_id": sub["id"],
                "customer_id": sub["customer_id"],
                "customer_email": sub["customer_email"],
                "customer_name": sub["customer_name"],
                "cohort": cohort,
                "amount": amount,
                "billing_date": billing_date.isoformat(),
            }

            # Categorize by time period (MUTUALLY EXCLUSIVE - each billing counted only once)
            # "this_week" and "this_month" are CUMULATIVE totals (include earlier periods)
            if today_start <= billing_date < tomorrow_start:
                # Today only
                today_billings.append(billing_info)
                today_total += amount
                cohort_totals[cohort]["today"] += amount
            elif tomorrow_start <= billing_date < tomorrow_start + timedelta(days=1):
                # Tomorrow only
                tomorrow_billings.append(billing_info)
                tomorrow_total += amount
                cohort_totals[cohort]["tomorrow"] += amount
            elif tomorrow_start + timedelta(days=1) <= billing_date < week_end:
                # Rest of week (days 2-6)
                week_billings.append(billing_info)
            elif week_end <= billing_date < month_end:
                # Rest of month (after week)
                month_billings.append(billing_info)

            # Calculate cumulative totals for week and month
            # "This week" = today + tomorrow + rest of week
            if today_start <= billing_date < week_end:
                week_total += amount
                cohort_totals[cohort]["week"] += amount

            # "This month" = entire month (includes week)
            if today_start <= billing_date < month_end:
                month_total += amount
                cohort_totals[cohort]["month"] += amount

        # Build cumulative details lists for week and month
        week_all_billings = today_billings + tomorrow_billings + week_billings
        month_all_billings = week_all_billings + month_billings

        return {
            # Today: just today's billings (exclusive)
            "today": {
                "amount": round(today_total, 2),
                "count": len(today_billings),
                "details": today_billings,
            },
            # Tomorrow: just tomorrow's billings (exclusive)
            "tomorrow": {
                "amount": round(tomorrow_total, 2),
                "count": len(tomorrow_billings),
                "details": tomorrow_billings,
            },
            # This week: CUMULATIVE total (today + tomorrow + rest of week)
            "this_week": {
                "amount": round(week_total, 2),
                "count": len(week_all_billings),
                "details": week_all_billings[:20],  # Limit for UI
            },
            # This month: CUMULATIVE total (entire month including week)
            "this_month": {
                "amount": round(month_total, 2),
                "count": len(month_all_billings),
                "details": month_all_billings[:20],  # Limit for UI
            },
            # Cohort breakdown (week/month are cumulative)
            "by_cohort": {
                "towpilot": {
                    "today": round(cohort_totals["towpilot"]["today"], 2),
                    "tomorrow": round(cohort_totals["towpilot"]["tomorrow"], 2),
                    "week": round(cohort_totals["towpilot"]["week"], 2),
                    "month": round(cohort_totals["towpilot"]["month"], 2),
                },
                "eqho": {
                    "today": round(cohort_totals["eqho"]["today"], 2),
                    "tomorrow": round(cohort_totals["eqho"]["tomorrow"], 2),
                    "week": round(cohort_totals["eqho"]["week"], 2),
                    "month": round(cohort_totals["eqho"]["month"], 2),
                },
            },
            "timestamp": datetime.now().isoformat(),
        }

    @staticmethod
    async def get_recent_payouts(limit: int = 10) -> List[Dict]:
        """
        Get recent Stripe payouts (transfers to bank account).

        Args:
            limit: Number of recent payouts to fetch

        Returns:
            List of recent payout details
        """
        try:
            payouts = stripe.Payout.list(limit=limit)

            result = []
            for payout in payouts.data:
                result.append(
                    {
                        "id": payout.id,
                        "amount": payout.amount / 100,
                        "currency": payout.currency.upper(),
                        "status": payout.status,
                        "arrival_date": datetime.fromtimestamp(payout.arrival_date).isoformat()
                        if payout.arrival_date
                        else None,
                        "created": datetime.fromtimestamp(payout.created).isoformat(),
                        "method": payout.method,
                        "type": payout.type,
                    }
                )

            return result
        except Exception as e:
            logger.error(f"Error fetching payouts: {e}")
            return []

    @staticmethod
    async def get_pending_charges() -> Dict:
        """
        Get charges that are pending (not yet captured or failed).

        Returns:
            Dict with pending charge details
        """
        try:
            # Get recent charges that haven't been captured
            charges = stripe.Charge.list(
                limit=100,
                created={"gte": int((datetime.now() - timedelta(days=7)).timestamp())},
            )

            pending = []
            pending_total = 0

            for charge in charges.data:
                if charge.status == "pending":
                    amount = charge.amount / 100
                    pending.append(
                        {
                            "id": charge.id,
                            "amount": amount,
                            "currency": charge.currency.upper(),
                            "customer": charge.customer,
                            "created": datetime.fromtimestamp(charge.created).isoformat(),
                        }
                    )
                    pending_total += amount

            return {
                "charges": pending,
                "total": round(pending_total, 2),
                "count": len(pending),
                "timestamp": datetime.now().isoformat(),
            }
        except Exception as e:
            logger.error(f"Error fetching pending charges: {e}")
            return {
                "charges": [],
                "total": 0,
                "count": 0,
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
            }
