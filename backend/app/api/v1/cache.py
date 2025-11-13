from fastapi import APIRouter

from app.services.cache_service import cache_service

router = APIRouter()


@router.post("/refresh/{product}")
async def refresh_cache(product: str):
    """
    Manually refresh cache for a specific product

    Args:
        product: Product name (e.g., 'towpilot', 'all_products')
    """
    await cache_service.invalidate(product)

    return {
        "message": f"Cache refreshed for {product}",
        "product": product,
    }


@router.post("/clear")
async def clear_cache():
    """Clear all caches"""
    await cache_service.clear_all()

    return {
        "message": "All caches cleared",
    }


@router.get("/stats")
async def get_cache_stats():
    """Get cache statistics"""
    return cache_service.get_stats()
