"""
Metrics Cache Service - Database-backed caching for API metrics

Stores metrics from Stripe, QuickBooks, and other sources in Supabase
for fallback when APIs are unavailable. Each metric includes a timestamp
for displaying data freshness to users.
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from supabase import Client

from app.core.config import settings

logger = logging.getLogger(__name__)


class MetricsCacheService:
    """
    Database-backed caching service for API metrics.
    
    Stores metrics in Supabase metrics_cache table with timestamps.
    Used as fallback when live APIs (Stripe, QuickBooks) are unavailable.
    """

    client: Optional[Client] = None

    @classmethod
    def _get_client(cls) -> Optional[Client]:
        """Get or create Supabase client"""
        if cls.client is None:
            if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
                logger.warning("Supabase credentials not configured for metrics cache")
                return None
            
            try:
                from supabase import create_client
                cls.client = create_client(
                    settings.SUPABASE_URL,
                    settings.SUPABASE_ANON_KEY
                )
                logger.info("✅ MetricsCacheService connected to Supabase")
            except Exception as e:
                logger.error(f"❌ Failed to connect to Supabase: {e}")
                return None
        
        return cls.client

    @classmethod
    async def save_metrics(
        cls,
        metric_type: str,
        data: Dict[str, Any],
        source: str = "stripe"
    ) -> bool:
        """
        Save metrics to database cache.
        
        Args:
            metric_type: Type of metric (e.g., 'stripe_mrr', 'stripe_customers')
            data: The metric data to cache
            source: Data source ('stripe', 'quickbooks', 'manual')
            
        Returns:
            True if saved successfully, False otherwise
        """
        client = cls._get_client()
        if not client:
            logger.error("Cannot save metrics: Supabase client unavailable")
            return False

        try:
            response = client.table("metrics_cache").insert({
                "metric_type": metric_type,
                "data": data,
                "source": source,
                "fetched_at": datetime.now().isoformat(),
            }).execute()

            if response.data:
                logger.info(f"✅ Cached metrics: {metric_type} from {source}")
                return True
            else:
                logger.warning(f"No data returned when caching {metric_type}")
                return False

        except Exception as e:
            logger.error(f"❌ Failed to cache metrics {metric_type}: {e}")
            return False

    @classmethod
    async def get_latest_metrics(
        cls,
        metric_type: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get the most recent cached metrics for a given type.
        
        Args:
            metric_type: Type of metric to retrieve
            
        Returns:
            Dict with 'data', 'fetched_at', and 'source' or None if not found
        """
        client = cls._get_client()
        if not client:
            logger.error("Cannot retrieve metrics: Supabase client unavailable")
            return None

        try:
            response = (
                client.table("metrics_cache")
                .select("data, fetched_at, source")
                .eq("metric_type", metric_type)
                .order("fetched_at", desc=True)
                .limit(1)
                .execute()
            )

            if response.data and len(response.data) > 0:
                entry = response.data[0]
                logger.info(f"📦 Retrieved cached {metric_type} from {entry['fetched_at']}")
                return {
                    "data": entry["data"],
                    "fetched_at": entry["fetched_at"],
                    "source": entry["source"],
                    "is_cached": True,
                }
            else:
                logger.info(f"No cached data found for {metric_type}")
                return None

        except Exception as e:
            logger.error(f"❌ Failed to retrieve cached metrics {metric_type}: {e}")
            return None

    @classmethod
    async def get_all_latest_metrics(cls) -> Dict[str, Any]:
        """
        Get the latest cached metrics for all types.
        Uses pagination to ensure all data is retrieved.
        
        Returns:
            Dict mapping metric_type to cached data
        """
        client = cls._get_client()
        if not client:
            return {}

        try:
            # Supabase default limit is 1000, but we paginate to be safe
            PAGE_SIZE = 1000
            MAX_ITERATIONS = 10
            
            all_entries = []
            offset = 0
            iteration = 0
            
            while iteration < MAX_ITERATIONS:
                iteration += 1
                
                response = (
                    client.table("metrics_cache")
                    .select("metric_type, data, fetched_at, source")
                    .order("fetched_at", desc=True)
                    .range(offset, offset + PAGE_SIZE - 1)
                    .execute()
                )
                
                if not response.data:
                    break
                    
                all_entries.extend(response.data)
                
                # If we got less than PAGE_SIZE, we've reached the end
                if len(response.data) < PAGE_SIZE:
                    break
                    
                offset += PAGE_SIZE
                logger.debug(f"Metrics cache pagination: iteration={iteration}, total={len(all_entries)}")

            if not all_entries:
                return {}

            # Group by metric_type, keeping only the latest
            latest_by_type = {}
            for entry in all_entries:
                mt = entry["metric_type"]
                if mt not in latest_by_type:
                    latest_by_type[mt] = {
                        "data": entry["data"],
                        "fetched_at": entry["fetched_at"],
                        "source": entry["source"],
                        "is_cached": True,
                    }

            return latest_by_type

        except Exception as e:
            logger.error(f"❌ Failed to retrieve all cached metrics: {e}")
            return {}

    @classmethod
    async def cleanup_old_entries(cls, keep_latest: int = 10) -> int:
        """
        Remove old cache entries, keeping only the N most recent per type.
        
        Args:
            keep_latest: Number of entries to keep per metric type
            
        Returns:
            Number of entries deleted
        """
        client = cls._get_client()
        if not client:
            return 0

        try:
            # Get all entries grouped by type
            response = (
                client.table("metrics_cache")
                .select("id, metric_type, fetched_at")
                .order("fetched_at", desc=True)
                .execute()
            )

            if not response.data:
                return 0

            # Find entries to delete
            entries_by_type: Dict[str, List[str]] = {}
            for entry in response.data:
                mt = entry["metric_type"]
                if mt not in entries_by_type:
                    entries_by_type[mt] = []
                entries_by_type[mt].append(entry["id"])

            # Collect IDs to delete (all but the first N for each type)
            ids_to_delete = []
            for mt, ids in entries_by_type.items():
                if len(ids) > keep_latest:
                    ids_to_delete.extend(ids[keep_latest:])

            if not ids_to_delete:
                logger.info("No old cache entries to clean up")
                return 0

            # Delete old entries
            for entry_id in ids_to_delete:
                client.table("metrics_cache").delete().eq("id", entry_id).execute()

            logger.info(f"🗑️ Cleaned up {len(ids_to_delete)} old cache entries")
            return len(ids_to_delete)

        except Exception as e:
            logger.error(f"❌ Failed to cleanup cache: {e}")
            return 0


# Singleton instance
metrics_cache = MetricsCacheService()

