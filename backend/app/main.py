import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import audit, cache, customer_mrr, emails, layouts, metrics, revenue_projections, snapshots, stripe_data
from app.core.config import settings
from app.services.supabase_service import SupabaseService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# Set specific loggers to DEBUG for more detailed output
logging.getLogger('app.services.auth').setLevel(logging.DEBUG)
logging.getLogger('app.services.supabase_service').setLevel(logging.DEBUG)
logging.getLogger('app.api.v1.audit').setLevel(logging.INFO)

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Eqho Due Diligence API",
    description="API for investor deck metrics and financial data",
    version="1.0.0",
)


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("🚀 Starting Eqho Due Diligence API...")
    logger.info(f"CORS Origins: {settings.CORS_ORIGINS}")
    SupabaseService.connect()
    logger.info("✅ Startup complete")

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
app.include_router(revenue_projections.router, prefix="/api/v1/revenue", tags=["Revenue Projections"])
app.include_router(customer_mrr.router, prefix="/api/v1/customer-mrr", tags=["Customer MRR"])
app.include_router(stripe_data.router, prefix="/api/v1/stripe", tags=["stripe"])
app.include_router(cache.router, prefix="/api/v1/cache", tags=["cache"])
app.include_router(snapshots.router, prefix="/api/v1/snapshots", tags=["snapshots"])
app.include_router(emails.router, prefix="/api/v1/emails", tags=["emails"])
app.include_router(layouts.router, prefix="/api/v1", tags=["layouts"])
app.include_router(audit.router, prefix="/api/v1", tags=["audit"])


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
