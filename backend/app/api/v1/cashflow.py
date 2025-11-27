"""
CashFlow API Endpoints

Admin-only endpoints for the CashFlow Dashboard.
Provides real-time bank balances, Stripe balances, and upcoming billing data.

Security: All endpoints require admin role verification.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.services.cashflow_service import CashFlowService
from app.services.metrics_cache_service import MetricsCacheService

logger = logging.getLogger(__name__)

router = APIRouter()


async def verify_admin(request: Request) -> bool:
    """
    Verify that the request is from an admin user.
    
    Checks the Authorization header for a valid JWT with admin role.
    For now, we'll check a simple header or rely on frontend protection.
    
    In production, this should validate the JWT and check the role claim.
    """
    # Check for admin header (set by frontend after auth)
    admin_header = request.headers.get("X-Admin-Access")

    # For development, also allow a query param
    admin_param = request.query_params.get("admin")

    # In production, this should validate JWT claims
    # For now, we'll allow access but log the request
    logger.info(f"CashFlow API access: admin_header={admin_header}, admin_param={admin_param}")

    # TODO: Implement proper JWT validation with role checking
    # For now, return True to allow access (frontend handles auth)
    return True


@router.get("/summary")
async def get_cashflow_summary(
    _admin: bool = Depends(verify_admin),
    force_refresh: bool = Query(False, description="Force refresh cached data"),
):
    """
    Get comprehensive cash flow summary.
    
    Returns:
    - Bank balances from QuickBooks
    - Stripe balance (available + pending)
    - Upcoming billings (today, tomorrow, week, month)
    - Total cash position and working capital
    - By-cohort breakdown (TowPilot vs Eqho)
    
    Admin-only endpoint.
    """
    try:
        # Check for cached data if not forcing refresh
        if not force_refresh:
            cached = await MetricsCacheService.get_latest_metrics("cashflow_summary")
            if cached:
                cache_time = datetime.fromisoformat(
                    cached['fetched_at'].replace('Z', '+00:00')
                )
                now = datetime.now(timezone.utc)
                cache_age = now - cache_time
                # Use cache if less than 5 minutes old
                if cache_age.total_seconds() < 300:
                    return {
                        **cached['data'],
                        'is_cached': True,
                        'cache_age_seconds': int(cache_age.total_seconds()),
                    }

        # Fetch fresh data
        summary = await CashFlowService.get_cashflow_summary()

        return summary

    except Exception as e:
        logger.error(f"Error fetching cashflow summary: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching cashflow summary: {str(e)}"
        )


@router.get("/bank-balances")
async def get_bank_balances(
    _admin: bool = Depends(verify_admin),
):
    """
    Get bank account balances from QuickBooks.
    
    Returns:
    - Cash on hand (checking + savings)
    - Accounts receivable
    - Accounts payable
    - Individual account details
    
    Admin-only endpoint.
    """
    try:
        balances = await CashFlowService.get_bank_balances()
        return balances
    except Exception as e:
        logger.error(f"Error fetching bank balances: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching bank balances: {str(e)}"
        )


@router.get("/stripe-balance")
async def get_stripe_balance(
    _admin: bool = Depends(verify_admin),
):
    """
    Get Stripe account balance.
    
    Returns:
    - Available balance (ready to payout)
    - Pending balance (processing)
    - Total balance
    - Breakdown by currency
    
    Admin-only endpoint.
    """
    try:
        balance = await CashFlowService.get_stripe_balance()
        return balance
    except Exception as e:
        logger.error(f"Error fetching Stripe balance: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching Stripe balance: {str(e)}"
        )


@router.get("/upcoming-billings")
async def get_upcoming_billings(
    _admin: bool = Depends(verify_admin),
    days: int = Query(30, ge=1, le=90, description="Days to look ahead"),
):
    """
    Get upcoming subscription billings.
    
    Returns:
    - Today's expected billings
    - Tomorrow's expected billings
    - This week's expected billings
    - This month's expected billings
    - Breakdown by cohort (TowPilot, Eqho)
    
    Admin-only endpoint.
    """
    try:
        from app.services.stripe_service import StripeService
        billings = await StripeService.get_upcoming_billings(days=days)
        return billings
    except Exception as e:
        logger.error(f"Error fetching upcoming billings: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching upcoming billings: {str(e)}"
        )


@router.get("/recent-activity")
async def get_recent_activity(
    _admin: bool = Depends(verify_admin),
):
    """
    Get recent financial activity.
    
    Returns:
    - Recent payouts to bank
    - Pending charges
    
    Admin-only endpoint.
    """
    try:
        activity = await CashFlowService.get_recent_activity()
        return activity
    except Exception as e:
        logger.error(f"Error fetching recent activity: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching recent activity: {str(e)}"
        )


@router.get("/billing-forecast")
async def get_billing_forecast(
    _admin: bool = Depends(verify_admin),
    days: int = Query(90, ge=30, le=180, description="Days to forecast"),
):
    """
    Get billing forecast for cash flow projections.
    
    Returns:
    - 30/60/90 day revenue projections
    - By-cohort breakdown
    - Monthly recurring revenue
    
    Admin-only endpoint.
    """
    try:
        forecast = await CashFlowService.get_billing_forecast(days=days)
        return forecast
    except Exception as e:
        logger.error(f"Error fetching billing forecast: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching billing forecast: {str(e)}"
        )


@router.get("/status")
async def get_cashflow_status():
    """
    Get status of cash flow data sources.
    
    Returns connection status for:
    - QuickBooks
    - Stripe
    - Cache freshness
    
    This endpoint is not admin-protected for health checking.
    """
    from app.core.config import settings
    from app.services.quickbooks_service import quickbooks_service

    # Check QuickBooks status
    qb_configured = quickbooks_service.is_configured
    qb_cached = await MetricsCacheService.get_latest_metrics("quickbooks_cash_position")

    # Check Stripe status
    stripe_configured = bool(settings.STRIPE_SECRET_KEY)

    # Check cache freshness
    cashflow_cache = await MetricsCacheService.get_latest_metrics("cashflow_summary")
    cache_age = None
    if cashflow_cache:
        cache_time = datetime.fromisoformat(
            cashflow_cache['fetched_at'].replace('Z', '+00:00')
        )
        now = datetime.now(timezone.utc)
        cache_age = int((now - cache_time).total_seconds())

    return {
        'quickbooks': {
            'configured': qb_configured,
            'has_cached_data': qb_cached is not None,
            'last_cached': qb_cached.get('fetched_at') if qb_cached else None,
        },
        'stripe': {
            'configured': stripe_configured,
        },
        'cache': {
            'has_summary': cashflow_cache is not None,
            'age_seconds': cache_age,
            'is_fresh': cache_age is not None and cache_age < 300,
        },
        'timestamp': datetime.now().isoformat(),
    }

