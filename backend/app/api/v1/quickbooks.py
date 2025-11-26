"""
QuickBooks API endpoints for P&L and financial data

Provides:
- OAuth callback handling
- P&L report fetching
- Payroll/labor cost summary
- Cached data retrieval
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.services.metrics_cache_service import MetricsCacheService
from app.services.quickbooks_service import quickbooks_service

router = APIRouter()


@router.get("/auth/url")
async def get_auth_url(state: Optional[str] = None):
    """
    Get QuickBooks OAuth authorization URL.
    
    Returns URL to redirect user to for authorizing QuickBooks access.
    """
    try:
        if not quickbooks_service.is_configured:
            raise HTTPException(
                status_code=503,
                detail="QuickBooks integration not configured. Please set QUICKBOOKS_CLIENT_ID, QUICKBOOKS_CLIENT_SECRET, and QUICKBOOKS_REDIRECT_URI environment variables."
            )

        auth_url = quickbooks_service.get_authorization_url(state)
        return {"authorization_url": auth_url}
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating auth URL: {str(e)}")


@router.get("/auth/callback")
async def auth_callback(code: str, state: Optional[str] = None, realmId: Optional[str] = None):
    """
    OAuth callback endpoint for QuickBooks authorization.
    
    After user authorizes, QuickBooks redirects here with the authorization code.
    """
    try:
        # Store the realm ID if provided
        if realmId:
            quickbooks_service.realm_id = realmId

        # Exchange code for tokens
        tokens = await quickbooks_service.exchange_code_for_tokens(code)

        return {
            "success": True,
            "message": "QuickBooks connected successfully",
            "realm_id": realmId,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OAuth callback failed: {str(e)}")


@router.get("/profit-loss")
async def get_profit_loss(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    accounting_method: str = Query("Accrual", description="Accounting method: Accrual or Cash"),
):
    """
    Fetch Profit & Loss report from QuickBooks.
    
    Args:
        start_date: Start date for the report period
        end_date: End date for the report period
        accounting_method: Accounting method to use
        
    Returns:
        P&L report data from QuickBooks
    """
    try:
        if not quickbooks_service.is_configured:
            # Return cached data if available
            cached = await MetricsCacheService.get_latest_metrics("quickbooks_pl")
            if cached:
                return {
                    **cached,
                    "warning": "Using cached data - QuickBooks not configured",
                }
            raise HTTPException(
                status_code=503,
                detail="QuickBooks integration not configured and no cached data available"
            )

        data = await quickbooks_service.get_profit_and_loss(
            start_date=start_date,
            end_date=end_date,
            accounting_method=accounting_method,
        )

        return {
            "data": data,
            "timestamp": datetime.now().isoformat(),
            "is_cached": False,
        }
    except HTTPException:
        raise
    except Exception as e:
        # Try to return cached data on error
        cached = await MetricsCacheService.get_latest_metrics("quickbooks_pl")
        if cached:
            return {
                **cached,
                "warning": f"Using cached data due to error: {str(e)}",
            }
        raise HTTPException(status_code=500, detail=f"Error fetching P&L: {str(e)}")


@router.get("/profit-loss/ytd")
async def get_profit_loss_ytd():
    """
    Get Year-to-Date Profit & Loss summary.
    
    Returns summarized P&L data with key metrics.
    """
    try:
        if not quickbooks_service.is_configured:
            # Return cached data if available
            cached = await MetricsCacheService.get_latest_metrics("quickbooks_pl")
            if cached:
                return {
                    **cached,
                    "warning": "Using cached data - QuickBooks not configured",
                }
            raise HTTPException(
                status_code=503,
                detail="QuickBooks integration not configured and no cached data available"
            )

        data = await quickbooks_service.get_profit_and_loss_ytd()
        return data
    except HTTPException:
        raise
    except Exception as e:
        # Try to return cached data on error
        cached = await MetricsCacheService.get_latest_metrics("quickbooks_pl")
        if cached:
            return {
                **cached,
                "warning": f"Using cached data due to error: {str(e)}",
            }
        raise HTTPException(status_code=500, detail=f"Error fetching YTD P&L: {str(e)}")


@router.get("/payroll")
async def get_payroll_summary(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
):
    """
    Get payroll/labor cost summary.
    
    Extracts labor costs from P&L expense categories.
    """
    try:
        if not quickbooks_service.is_configured:
            # Return cached data if available
            cached = await MetricsCacheService.get_latest_metrics("quickbooks_payroll")
            if cached:
                return {
                    **cached,
                    "warning": "Using cached data - QuickBooks not configured",
                }
            raise HTTPException(
                status_code=503,
                detail="QuickBooks integration not configured and no cached data available"
            )

        data = await quickbooks_service.get_payroll_summary(
            start_date=start_date,
            end_date=end_date,
        )

        # Cache the result
        await MetricsCacheService.save_metrics(
            metric_type="quickbooks_payroll",
            data=data,
            source="quickbooks"
        )

        return data
    except HTTPException:
        raise
    except Exception as e:
        # Try to return cached data on error
        cached = await MetricsCacheService.get_latest_metrics("quickbooks_payroll")
        if cached:
            return {
                **cached,
                "warning": f"Using cached data due to error: {str(e)}",
            }
        raise HTTPException(status_code=500, detail=f"Error fetching payroll: {str(e)}")


@router.get("/status")
async def get_quickbooks_status():
    """
    Get QuickBooks integration status.
    
    Returns whether QuickBooks is configured and connected.
    """
    try:
        is_configured = quickbooks_service.is_configured

        # Check if we have cached tokens
        cached_tokens = await MetricsCacheService.get_latest_metrics("quickbooks_tokens")
        is_connected = cached_tokens is not None

        return {
            "is_configured": is_configured,
            "is_connected": is_connected,
            "last_token_refresh": cached_tokens.get("fetched_at") if cached_tokens else None,
            "timestamp": datetime.now().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking status: {str(e)}")


@router.post("/manual-pl")
async def store_manual_pl(pl_data: dict):
    """
    Store manually-entered P&L data.
    
    Use this when QuickBooks isn't connected but you want to store
    P&L data for display in the dashboard.
    """
    try:
        # Validate required fields
        required_fields = ['total_revenue', 'total_cogs', 'gross_profit', 'total_expenses', 'net_income']
        for field in required_fields:
            if field not in pl_data:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required field: {field}"
                )

        # Add metadata
        pl_data['is_manual'] = True
        pl_data['submitted_at'] = datetime.now().isoformat()

        # Store in cache
        await MetricsCacheService.save_metrics(
            metric_type="quickbooks_pl",
            data=pl_data,
            source="manual"
        )

        return {
            "success": True,
            "message": "P&L data stored successfully",
            "timestamp": datetime.now().isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error storing P&L data: {str(e)}")

