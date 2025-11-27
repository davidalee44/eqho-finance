import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)


class InMemoryCache:
    """Fast in-memory cache with TTL (no persistence)"""

    def __init__(self, default_ttl: int = 300):
        """
        Initialize cache

        Args:
            default_ttl: Default time-to-live in seconds (5 minutes)
        """
        self._cache: dict[str, dict[str, Any]] = {}
        self._default_ttl = default_ttl
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache

        Args:
            key: Cache key

        Returns:
            Cached value or None if expired/not found
        """
        async with self._lock:
            if key not in self._cache:
                return None

            entry = self._cache[key]

            # Check if expired
            if datetime.now() > entry["expires_at"]:
                del self._cache[key]
                logger.debug(f"Cache expired for key: {key}")
                return None

            logger.debug(f"Cache hit for key: {key}")
            return entry["value"]

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """
        Set value in cache

        Args:
            key: Cache key
            value: Value to cache
            ttl: Time-to-live in seconds (uses default if not provided)
        """
        async with self._lock:
            ttl = ttl or self._default_ttl
            expires_at = datetime.now() + timedelta(seconds=ttl)

            self._cache[key] = {
                "value": value,
                "expires_at": expires_at,
                "created_at": datetime.now(),
            }

            logger.debug(f"Cache set for key: {key} (TTL: {ttl}s)")

    async def delete(self, key: str) -> bool:
        """
        Delete key from cache

        Args:
            key: Cache key

        Returns:
            True if key was deleted, False if not found
        """
        async with self._lock:
            if key in self._cache:
                del self._cache[key]
                logger.debug(f"Cache deleted for key: {key}")
                return True
            return False

    async def clear(self) -> None:
        """Clear all cache entries"""
        async with self._lock:
            self._cache.clear()
            logger.info("Cache cleared")

    async def get_or_set(
        self, key: str, factory: Callable, ttl: Optional[int] = None
    ) -> Any:
        """
        Get from cache or compute and set

        Args:
            key: Cache key
            factory: Async function to compute value if not cached
            ttl: Time-to-live in seconds

        Returns:
            Cached or computed value
        """
        # Try to get from cache first
        value = await self.get(key)

        if value is not None:
            return value

        # Cache miss - compute value
        logger.debug(f"Cache miss for key: {key}, computing...")
        value = await factory()

        # Store in cache
        await self.set(key, value, ttl)

        return value

    def get_stats(self) -> dict[str, Any]:
        """Get cache statistics"""
        return {
            "entries": len(self._cache),
            "keys": list(self._cache.keys()),
        }


class CacheService:
    """Simple in-memory caching service"""

    def __init__(self):
        from app.core.config import settings

        self.memory_cache = InMemoryCache(default_ttl=settings.CACHE_TTL)

    async def get_metrics(self, product: str, calculator: Callable) -> dict[str, Any]:
        """
        Get metrics with in-memory caching

        Args:
            product: Product name (e.g., 'towpilot')
            calculator: Async function to calculate metrics

        Returns:
            Metrics dictionary
        """
        cache_key = f"metrics:{product}"

        # Try in-memory cache
        value = await self.memory_cache.get(cache_key)
        if value:
            logger.info(f"📦 Cache hit for {product}")
            return value

        # Cache miss - compute fresh metrics
        logger.info(f"🔄 Computing fresh metrics for {product}")
        metrics = await calculator()

        # Store in cache
        await self.memory_cache.set(cache_key, metrics)

        return metrics

    async def invalidate(self, product: str) -> None:
        """
        Invalidate cache for a product

        Args:
            product: Product name
        """
        cache_key = f"metrics:{product}"
        await self.memory_cache.delete(cache_key)
        logger.info(f"🗑️  Cache invalidated for {product}")

    async def clear_all(self) -> None:
        """Clear all caches"""
        await self.memory_cache.clear()
        logger.info("🗑️  All caches cleared")

    def get_stats(self) -> dict[str, Any]:
        """Get cache statistics"""
        return {
            "memory_cache": self.memory_cache.get_stats(),
            "backend": "supabase",
        }


# Global cache instance
cache_service = CacheService()
