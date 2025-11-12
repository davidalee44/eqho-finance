from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import cache, metrics, snapshots, stripe_data
from app.core.config import settings
from app.services.supabase_service import SupabaseService


app = FastAPI(
    title="Eqho Due Diligence API",
    description="API for investor deck metrics and financial data",
    version="1.0.0",
)


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    SupabaseService.connect()

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(metrics.router, prefix="/api/v1/metrics", tags=["metrics"])
app.include_router(stripe_data.router, prefix="/api/v1/stripe", tags=["stripe"])
app.include_router(cache.router, prefix="/api/v1/cache", tags=["cache"])
app.include_router(snapshots.router, prefix="/api/v1/snapshots", tags=["snapshots"])


@app.get("/")
async def root():
    return {
        "message": "Eqho Due Diligence API",
        "version": "1.0.0",
        "docs": "/docs",
        "backend": "supabase",
    }


@app.get("/health")
async def health_check():
    from app.services.cache_service import cache_service

    return {
        "status": "healthy",
        "cache_stats": cache_service.get_stats(),
    }
