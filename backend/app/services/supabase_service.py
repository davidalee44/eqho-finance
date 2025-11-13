import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from supabase import Client, create_client

from app.core.config import settings

logger = logging.getLogger(__name__)


class SupabaseService:
    """Service for Supabase operations - fetch Stripe data and calculate metrics"""

    client: Optional[Client] = None

    @classmethod
    def connect(cls):
        """Connect to Supabase"""
        if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
            logger.warning("Supabase credentials not configured")
            return

        try:
            logger.info(f"Connecting to Supabase: {settings.SUPABASE_URL}")
            cls.client = create_client(
                settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY
            )
            logger.info("✅ Connected to Supabase successfully")
        except Exception as e:
            logger.error(f"❌ Failed to connect to Supabase: {e}", exc_info=True)
            cls.client = None

    @classmethod
    def get_active_subscriptions(
        cls, product_category: Optional[str] = None
    ) -> List[Dict]:
        """
        Get active subscriptions from Supabase

        Args:
            product_category: Filter by product category (e.g., 'TowPilot')
        """
        filter_info = f" (category: {product_category})" if product_category else ""
        logger.debug(f"Fetching active subscriptions{filter_info}")
        
        if not cls.client:
            logger.info("Client not initialized, attempting connection")
            cls.connect()

        if not cls.client:
            logger.error("Cannot fetch subscriptions: Supabase client unavailable")
            return []

        try:
            query = (
                cls.client.table("stripe_subscriptions")
                .select("*")
                .eq("status", "active")
            )

            if product_category:
                query = query.eq("product_category", product_category)

            response = query.execute()
            logger.info(f"Retrieved {len(response.data)} active subscriptions{filter_info}")
            return response.data
        except Exception as e:
            logger.error(f"Error fetching subscriptions{filter_info}: {e}", exc_info=True)
            return []

    @classmethod
    def get_customers(cls) -> List[Dict]:
        """Get all customers from Supabase"""
        if not cls.client:
            cls.connect()

        if not cls.client:
            return []

        try:
            response = cls.client.table("stripe_customers").select("*").execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching customers: {e}")
            return []

    @classmethod
    def get_latest_mrr_snapshot(cls) -> Optional[Dict]:
        """Get the most recent MRR snapshot"""
        if not cls.client:
            cls.connect()

        if not cls.client:
            return None

        try:
            response = (
                cls.client.table("mrr_snapshots")
                .select("*")
                .order("snapshot_date", desc=True)
                .limit(1)
                .execute()
            )

            if response.data:
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Error fetching MRR snapshot: {e}")
            return None

    @classmethod
    def get_mrr_snapshots(cls, limit: int = 12) -> List[Dict]:
        """
        Get historical MRR snapshots

        Args:
            limit: Number of snapshots to retrieve
        """
        if not cls.client:
            cls.connect()

        if not cls.client:
            return []

        try:
            response = (
                cls.client.table("mrr_snapshots")
                .select("*")
                .order("snapshot_date", desc=True)
                .limit(limit)
                .execute()
            )
            return response.data
        except Exception as e:
            logger.error(f"Error fetching MRR snapshots: {e}")
            return []

    @classmethod
    def calculate_towpilot_metrics(cls) -> Dict[str, Any]:
        """Calculate all metrics specific to TowPilot product"""

        # Get TowPilot subscriptions
        towpilot_subs = cls.get_active_subscriptions(product_category="TowPilot")
        all_subs = cls.get_active_subscriptions()

        # Get customers
        all_customers = cls.get_customers()

        # Calculate MRR and ARR
        towpilot_mrr = sum(sub.get("amount_monthly", 0) for sub in towpilot_subs)
        towpilot_arr = towpilot_mrr * 12

        # Calculate average ACV for TowPilot
        if towpilot_subs:
            towpilot_acv = sum(
                sub.get("amount_monthly", 0) * 12 for sub in towpilot_subs
            ) / len(towpilot_subs)
        else:
            towpilot_acv = 0

        # Get unique customer IDs
        towpilot_customer_ids = set(
            sub.get("stripe_customer_id") for sub in towpilot_subs
        )
        towpilot_customer_count = len(towpilot_customer_ids)

        # CAC metrics (from your data)
        cac_metrics = {
            "total_cac": 831,
            "sales_cost": 450,
            "marketing_cost": 381,
            "sales_percentage": 54.2,
            "marketing_percentage": 45.8,
        }

        # LTV and CAC calculations
        average_ltv = 14100
        ltv_cac_ratio = round(average_ltv / cac_metrics["total_cac"], 2)

        # CAC Payback calculation
        gross_margin = 0.69
        if towpilot_acv > 0:
            monthly_gross_profit = (towpilot_acv * gross_margin) / 12
            cac_payback_months = round(
                cac_metrics["total_cac"] / monthly_gross_profit, 2
            )
        else:
            cac_payback_months = 0

        # Get revenue trend
        snapshots = cls.get_mrr_snapshots(limit=10)
        revenue_trend = [
            {
                "month": snapshot.get("snapshot_date"),
                "revenue": snapshot.get("towpilot_mrr", 0),
            }
            for snapshot in reversed(snapshots)
        ]

        return {
            "timestamp": datetime.now().isoformat(),
            "customer_metrics": {
                "total_customers": len(all_customers),
                "towpilot_customers": towpilot_customer_count,
                "other_customers": len(all_customers) - towpilot_customer_count,
            },
            "revenue_metrics": {
                "mrr": towpilot_mrr,
                "arr": towpilot_arr,
                "acv": towpilot_acv,
                "monthly_trend": revenue_trend,
            },
            "cac_metrics": cac_metrics,
            "ltv_metrics": {
                "average_ltv": average_ltv,
                "ltv_cac_ratio": ltv_cac_ratio,
                "cac_payback_months": cac_payback_months,
            },
            "financial_metrics": {
                "gross_margin": gross_margin,
                "gross_margin_percentage": gross_margin * 100,
            },
        }

    @classmethod
    def calculate_all_products_metrics(cls) -> Dict[str, Any]:
        """Calculate metrics for all products combined"""

        all_customers = cls.get_customers()
        all_subscriptions = cls.get_active_subscriptions()

        # Calculate total MRR
        total_mrr = sum(sub.get("amount_monthly", 0) for sub in all_subscriptions)
        total_arr = total_mrr * 12

        # Get revenue trend
        snapshots = cls.get_mrr_snapshots(limit=10)
        revenue_trend = [
            {
                "month": snapshot.get("snapshot_date"),
                "revenue": snapshot.get("total_mrr", 0),
            }
            for snapshot in reversed(snapshots)
        ]

        return {
            "timestamp": datetime.now().isoformat(),
            "customer_count": len(all_customers),
            "subscription_count": len(all_subscriptions),
            "mrr": total_mrr,
            "arr": total_arr,
            "revenue_trend": revenue_trend,
        }
