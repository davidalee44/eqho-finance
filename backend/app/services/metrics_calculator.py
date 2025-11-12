from typing import Dict
from app.services.supabase_service import SupabaseService
from app.services.cache_service import cache_service


class MetricsCalculator:
    """Calculate investor metrics from Supabase data"""

    @staticmethod
    async def calculate_towpilot_metrics() -> Dict:
        """Calculate all metrics specific to TowPilot product with caching"""

        # Use cache service
        return await cache_service.get_metrics(
            product="towpilot", calculator=MetricsCalculator._compute_towpilot_metrics
        )

    @staticmethod
    async def _compute_towpilot_metrics() -> Dict:
        """Internal method to compute TowPilot metrics (called on cache miss)"""

        # Get metrics from Supabase
        return SupabaseService.calculate_towpilot_metrics()
        
    @staticmethod
    async def calculate_all_products_metrics() -> Dict:
        """Calculate metrics for all products combined with caching"""

        # Use cache service
        return await cache_service.get_metrics(
            product="all_products", calculator=MetricsCalculator._compute_all_products_metrics
        )

    @staticmethod
    async def _compute_all_products_metrics() -> Dict:
        """Internal method to compute all products metrics (called on cache miss)"""

        # Get metrics from Supabase
        return SupabaseService.calculate_all_products_metrics()

