from datetime import datetime, timedelta
from typing import Dict, List, Optional

import stripe

from app.core.config import settings

stripe.api_key = settings.STRIPE_SECRET_KEY


class StripeService:
    """Service for interacting with Stripe API and calculating metrics"""

    @staticmethod
    async def get_all_customers(has_tag: Optional[str] = None) -> List[Dict]:
        """
        Fetch all customers, optionally filtered by tag

        Args:
            has_tag: Filter customers by metadata tag (e.g., "tow" for TowPilot)
        """
        customers = []
        starting_after = None

        while True:
            params = {"limit": 100}
            if starting_after:
                params["starting_after"] = starting_after

            response = stripe.Customer.list(**params)

            for customer in response.data:
                # Filter by tag if specified
                if has_tag:
                    tags = customer.get("metadata", {}).get("tags", "")
                    if has_tag not in tags:
                        continue

                customers.append(
                    {
                        "id": customer.id,
                        "email": customer.email,
                        "created": customer.created,
                        "metadata": customer.metadata,
                    }
                )

            if not response.has_more:
                break

            starting_after = response.data[-1].id

        return customers

    @staticmethod
    async def get_active_subscriptions(
        customer_ids: Optional[List[str]] = None,
    ) -> List[Dict]:
        """Fetch active subscriptions, optionally filtered by customer IDs"""
        subscriptions = []
        starting_after = None

        while True:
            params = {"limit": 100, "status": "active"}
            if starting_after:
                params["starting_after"] = starting_after

            response = stripe.Subscription.list(**params)

            for sub in response.data:
                # Filter by customer IDs if specified
                if customer_ids and sub.customer not in customer_ids:
                    continue

                subscriptions.append(
                    {
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
                                "interval": item.price.recurring.interval
                                if item.price.recurring
                                else None,
                            }
                            for item in sub["items"].data
                        ],
                    }
                )

            if not response.has_more:
                break

            starting_after = response.data[-1].id

        return subscriptions

    @staticmethod
    async def calculate_mrr(subscriptions: List[Dict]) -> float:
        """Calculate Monthly Recurring Revenue from subscriptions"""
        mrr = 0.0

        for sub in subscriptions:
            for item in sub["items"]:
                amount = item["amount"] / 100  # Convert cents to dollars
                interval = item["interval"]
                interval_count = item.get("interval_count", 1)

                # Normalize to monthly MRR
                if interval == "year":
                    mrr += amount / 12
                elif interval == "month":
                    # Handle quarterly (interval_count=3), semi-annual (6), etc.
                    mrr += amount / interval_count
                elif interval == "day":
                    mrr += amount * 30
                elif interval == "week":
                    # Weekly subscriptions: (amount * 52 weeks) / 12 months
                    mrr += (amount * 52) / 12

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

                # Normalize to annual
                if interval == "year":
                    annual_value += amount
                elif interval == "month":
                    annual_value += amount * 12
                elif interval == "day":
                    annual_value += amount * 365

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

        # Fetch charges/invoices for the time period
        charges = stripe.Charge.list(
            created={
                "gte": int(start_date.timestamp()),
                "lte": int(end_date.timestamp()),
            },
            limit=100,
        )

        # Group by month
        monthly_revenue = {}
        for charge in charges.auto_paging_iter():
            if not charge.paid:
                continue

            month_key = datetime.fromtimestamp(charge.created).strftime("%Y-%m")
            amount = charge.amount / 100

            if month_key not in monthly_revenue:
                monthly_revenue[month_key] = 0.0

            monthly_revenue[month_key] += amount

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

        # Get all subscriptions (active and canceled)
        all_subscriptions = []
        starting_after = None

        while True:
            params = {"limit": 100}
            if starting_after:
                params["starting_after"] = starting_after

            response = stripe.Subscription.list(**params)

            for sub in response.data:
                all_subscriptions.append(
                    {
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
                                "interval": item.price.recurring.interval
                                if item.price.recurring
                                else None,
                            }
                            for item in sub["items"].data
                        ],
                    }
                )

            if not response.has_more:
                break

            starting_after = response.data[-1].id

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
            and (
                s["status"] == "active"
                or (s["canceled_at"] and s["canceled_at"] >= start_timestamp)
            )
        ]

        # Subscriptions that churned during the period
        churned_subscriptions = [
            s
            for s in all_subscriptions
            if s["canceled_at"] and start_timestamp <= s["canceled_at"] < end_timestamp
        ]

        # Calculate MRR lost from churned subscriptions
        churned_mrr = await StripeService.calculate_mrr(churned_subscriptions)

        # Calculate MRR at start of period (approximate)
        # Use current MRR as proxy if we don't have historical data
        start_mrr = current_mrr + churned_mrr

        # Customer churn rate
        unique_customers_at_start = len(set(s["customer"] for s in active_at_start))
        unique_churned_customers = len(
            set(s["customer"] for s in churned_subscriptions)
        )

        customer_churn_rate = (
            (unique_churned_customers / unique_customers_at_start * 100)
            if unique_customers_at_start > 0
            else 0.0
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
