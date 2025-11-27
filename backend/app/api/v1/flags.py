"""
Feature Flags API Endpoint

Provides feature flags for the frontend. Flags can be configured via:
1. Vercel Edge Config (production)
2. Environment variables (fallback)
3. Hardcoded defaults (last resort)

The endpoint caches flags in memory to reduce latency.
"""

import os
import time
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter

router = APIRouter()

# Default flags - used when Edge Config is unavailable
DEFAULT_FLAGS = {
    "show_admin_controls": False,
    "show_drill_downs": True,
    "show_api_errors": False,
    "show_debug_info": False,
    "enable_audit_log": True,
    "enable_data_export": True,
    "enable_snapshot_restore": False,
    "maintenance_mode": False,
    "read_only_mode": False,
    "use_cached_data_only": False,
    "show_data_timestamps": True,
}

# In-memory cache for flags
_flags_cache: dict[str, Any] = {
    "flags": None,
    "timestamp": 0,
}

# Cache TTL in seconds (5 minutes)
FLAGS_CACHE_TTL = 300


def get_flags_from_env() -> dict[str, Any]:
    """
    Read flag overrides from environment variables.
    Environment variables take precedence over defaults.

    Format: FEATURE_FLAG_{FLAG_NAME}=true|false
    Example: FEATURE_FLAG_MAINTENANCE_MODE=true
    """
    flags = DEFAULT_FLAGS.copy()

    for flag_name in DEFAULT_FLAGS:
        env_key = f"FEATURE_FLAG_{flag_name.upper()}"
        env_value = os.environ.get(env_key)

        if env_value is not None:
            # Convert string to boolean
            flags[flag_name] = env_value.lower() in ("true", "1", "yes")

    return flags


async def fetch_edge_config_flags() -> Optional[dict[str, Any]]:
    """
    Fetch flags from Vercel Edge Config.

    Requires EDGE_CONFIG environment variable to be set.
    Returns None if Edge Config is not configured or fails.
    """
    edge_config_url = os.environ.get("EDGE_CONFIG")

    if not edge_config_url:
        return None

    try:
        # Vercel Edge Config SDK would be used here in production
        # For now, we'll use environment variables as the primary source
        # This is a placeholder for Edge Config integration
        #
        # Example with Edge Config SDK:
        # from vercel_edge_config import get
        # flags = await get("feature_flags")
        # return flags

        return None
    except Exception as e:
        print(f"[Flags] Error fetching from Edge Config: {e}")
        return None


def get_cached_flags() -> Optional[dict[str, Any]]:
    """Get flags from cache if not expired."""
    if _flags_cache["flags"] is None:
        return None

    now = time.time()
    if now - _flags_cache["timestamp"] > FLAGS_CACHE_TTL:
        return None

    return _flags_cache["flags"]


def cache_flags(flags: dict[str, Any]) -> None:
    """Cache flags in memory."""
    _flags_cache["flags"] = flags
    _flags_cache["timestamp"] = time.time()


@router.get("")
@router.get("/")
async def get_feature_flags():
    """
    Get current feature flags.

    Priority order:
    1. Cached flags (if fresh)
    2. Vercel Edge Config
    3. Environment variables
    4. Hardcoded defaults

    Returns:
        dict: Current feature flags with metadata
    """
    # Check cache first
    cached = get_cached_flags()
    if cached is not None:
        return {
            "flags": cached,
            "source": "cache",
            "timestamp": datetime.now().isoformat(),
        }

    # Try Edge Config
    edge_flags = await fetch_edge_config_flags()
    if edge_flags is not None:
        # Merge with defaults to ensure all flags exist
        merged = {**DEFAULT_FLAGS, **edge_flags}
        cache_flags(merged)
        return {
            "flags": merged,
            "source": "edge_config",
            "timestamp": datetime.now().isoformat(),
        }

    # Fall back to environment variables
    env_flags = get_flags_from_env()
    cache_flags(env_flags)

    return {
        "flags": env_flags,
        "source": "environment",
        "timestamp": datetime.now().isoformat(),
    }


@router.post("/refresh")
async def refresh_flags():
    """
    Force refresh flags from source (bypass cache).

    Use this endpoint after updating Edge Config or environment variables.

    Returns:
        dict: Refreshed feature flags
    """
    # Clear cache
    _flags_cache["flags"] = None
    _flags_cache["timestamp"] = 0

    # Fetch fresh flags
    return await get_feature_flags()


@router.get("/defaults")
async def get_default_flags():
    """
    Get the default flag values.

    Useful for documentation and debugging.

    Returns:
        dict: Default feature flags
    """
    return {
        "flags": DEFAULT_FLAGS,
        "description": "Default flag values used when Edge Config is unavailable",
    }
