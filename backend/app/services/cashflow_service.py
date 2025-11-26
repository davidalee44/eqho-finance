"""
CashFlow Service

Aggregates financial data from QuickBooks (bank balances) and Stripe 
(account balance, upcoming billings) to provide a comprehensive cash flow view.

This service is the backbone of the admin CashFlow Dashboard.
"""

import logging
from datetime import datetime
from typing import Any, Dict

from app.services.metrics_cache_service import MetricsCacheService
from app.services.quickbooks_service import quickbooks_service
from app.services.stripe_service import StripeService

logger = logging.getLogger(__name__)

# Cache TTL for cashflow data (5 minutes)
CASHFLOW_CACHE_TTL = 300


class CashFlowService:
    """
    Service for aggregating cash flow data from multiple sources.
    
    Combines:
    - QuickBooks bank account balances
    - Stripe account balance (available + pending)
    - Upcoming billing forecasts
    """

    @staticmethod
    async def get_bank_balances() -> Dict[str, Any]:
        """
        Get bank account balances from QuickBooks.
        
        Returns cached data if QuickBooks is not configured or on error.
        """
        try:
            if quickbooks_service.is_configured:
                return await quickbooks_service.get_cash_position()
            else:
                # Try to get cached data
                cached = await MetricsCacheService.get_latest_metrics("quickbooks_cash_position")
                if cached:
                    return {
                        **cached.get('data', {}),
                        'is_cached': True,
                        'cache_timestamp': cached.get('fetched_at'),
                        'warning': 'QuickBooks not configured - using cached data',
                    }
                
                # Return placeholder if no cached data
                return {
                    'cash_on_hand': 0,
                    'accounts_receivable': 0,
                    'accounts_payable': 0,
                    'net_cash_position': 0,
                    'bank_accounts': {'checking': {'total': 0}, 'savings': {'total': 0}},
                    'warning': 'QuickBooks not configured and no cached data available',
                    'timestamp': datetime.now().isoformat(),
                }
        except Exception as e:
            logger.error(f"Error fetching bank balances: {e}")
            # Try cached data on error
            cached = await MetricsCacheService.get_latest_metrics("quickbooks_cash_position")
            if cached:
                return {
                    **cached.get('data', {}),
                    'is_cached': True,
                    'cache_timestamp': cached.get('fetched_at'),
                    'error': str(e),
                }
            return {
                'cash_on_hand': 0,
                'error': str(e),
                'timestamp': datetime.now().isoformat(),
            }

    @staticmethod
    async def get_stripe_balance() -> Dict[str, Any]:
        """
        Get Stripe account balance.
        """
        try:
            return await StripeService.get_stripe_balance()
        except Exception as e:
            logger.error(f"Error fetching Stripe balance: {e}")
            return {
                'available': [],
                'pending': [],
                'total_available_usd': 0,
                'total_pending_usd': 0,
                'total_balance_usd': 0,
                'error': str(e),
                'timestamp': datetime.now().isoformat(),
            }

    @staticmethod
    async def get_upcoming_billings() -> Dict[str, Any]:
        """
        Get upcoming billings from Stripe subscriptions.
        """
        try:
            return await StripeService.get_upcoming_billings(days=30)
        except Exception as e:
            logger.error(f"Error fetching upcoming billings: {e}")
            return {
                'today': {'billings': [], 'total': 0, 'count': 0},
                'tomorrow': {'billings': [], 'total': 0, 'count': 0},
                'this_week': {'billings': [], 'total': 0, 'count': 0},
                'this_month': {'billings': [], 'total': 0, 'count': 0},
                'by_cohort': {},
                'error': str(e),
                'timestamp': datetime.now().isoformat(),
            }

    @staticmethod
    async def get_cashflow_summary() -> Dict[str, Any]:
        """
        Get comprehensive cash flow summary combining all sources.
        
        Returns:
            Dict with:
            - bank_balances: QuickBooks bank account data
            - stripe_balance: Stripe available + pending
            - upcoming_billings: Expected inflows by time period
            - total_cash_position: Combined cash position
            - runway_estimate: Basic runway calculation
        """
        # Fetch all data sources
        bank_data = await CashFlowService.get_bank_balances()
        stripe_data = await CashFlowService.get_stripe_balance()
        billings_data = await CashFlowService.get_upcoming_billings()
        
        # Calculate total cash position
        qb_cash = bank_data.get('cash_on_hand', 0) or 0
        stripe_available = stripe_data.get('total_available_usd', 0) or 0
        stripe_pending = stripe_data.get('total_pending_usd', 0) or 0
        
        total_cash = qb_cash + stripe_available
        total_with_pending = total_cash + stripe_pending
        
        # Get receivables and payables
        ar = bank_data.get('accounts_receivable', 0) or 0
        ap = bank_data.get('accounts_payable', 0) or 0
        
        # Net working capital
        net_working_capital = total_cash + ar - ap
        
        # Upcoming inflows
        expected_today = billings_data.get('today', {}).get('total', 0)
        expected_tomorrow = billings_data.get('tomorrow', {}).get('total', 0)
        expected_week = billings_data.get('this_week', {}).get('total', 0)
        expected_month = billings_data.get('this_month', {}).get('total', 0)
        
        # Build summary
        summary = {
            'bank_balances': {
                'quickbooks': {
                    'cash_on_hand': round(qb_cash, 2),
                    'accounts_receivable': round(ar, 2),
                    'accounts_payable': round(ap, 2),
                    'checking': bank_data.get('bank_accounts', {}).get('checking', {}).get('total', 0),
                    'savings': bank_data.get('bank_accounts', {}).get('savings', {}).get('total', 0),
                    'is_configured': quickbooks_service.is_configured,
                    'is_cached': bank_data.get('is_cached', False),
                },
            },
            'stripe_balance': {
                'available': round(stripe_available, 2),
                'pending': round(stripe_pending, 2),
                'total': round(stripe_available + stripe_pending, 2),
            },
            'upcoming_billings': {
                'today': {
                    'amount': round(expected_today, 2),
                    'count': billings_data.get('today', {}).get('count', 0),
                    'details': billings_data.get('today', {}).get('billings', [])[:10],
                },
                'tomorrow': {
                    'amount': round(expected_tomorrow, 2),
                    'count': billings_data.get('tomorrow', {}).get('count', 0),
                    'details': billings_data.get('tomorrow', {}).get('billings', [])[:10],
                },
                'this_week': {
                    'amount': round(expected_week, 2),
                    'count': billings_data.get('this_week', {}).get('count', 0),
                },
                'this_month': {
                    'amount': round(expected_month, 2),
                    'count': billings_data.get('this_month', {}).get('count', 0),
                },
                'by_cohort': billings_data.get('by_cohort', {}),
            },
            'totals': {
                'total_cash_available': round(total_cash, 2),
                'total_with_pending': round(total_with_pending, 2),
                'net_working_capital': round(net_working_capital, 2),
                'expected_inflows_week': round(expected_week, 2),
                'expected_inflows_month': round(expected_month, 2),
            },
            'health_indicators': {
                'cash_runway_days': CashFlowService._estimate_runway(total_cash, expected_month),
                'ar_days_outstanding': None,  # Would need more data
                'ap_days_outstanding': None,  # Would need more data
            },
            'timestamp': datetime.now().isoformat(),
        }
        
        # Cache the summary
        await MetricsCacheService.save_metrics(
            metric_type="cashflow_summary",
            data=summary,
            source="aggregated"
        )
        
        return summary

    @staticmethod
    def _estimate_runway(cash_on_hand: float, monthly_revenue: float) -> int:
        """
        Estimate cash runway in days based on current cash and expected revenue.
        
        This is a simplified calculation. For accurate runway, you'd need:
        - Historical burn rate
        - Monthly operating expenses
        - Seasonal adjustments
        """
        if monthly_revenue <= 0:
            return 0
        
        # Assume a 60% gross margin and 80% of revenue covers operating costs
        # This is a rough estimate - actual should use real expense data
        estimated_monthly_burn = monthly_revenue * 0.8  # Rough operating cost estimate
        
        if estimated_monthly_burn <= 0:
            return 365  # Default to 1 year if no burn
        
        # Days of runway
        monthly_net = monthly_revenue - estimated_monthly_burn
        if monthly_net >= 0:
            return 365  # Cash flow positive, unlimited runway
        
        runway_months = cash_on_hand / abs(monthly_net)
        return int(runway_months * 30)

    @staticmethod
    async def get_recent_activity() -> Dict[str, Any]:
        """
        Get recent financial activity for the dashboard feed.
        
        Returns:
            Dict with recent payouts, charges, and invoice activity
        """
        try:
            payouts = await StripeService.get_recent_payouts(limit=5)
            pending_charges = await StripeService.get_pending_charges()
            
            return {
                'recent_payouts': payouts,
                'pending_charges': pending_charges,
                'timestamp': datetime.now().isoformat(),
            }
        except Exception as e:
            logger.error(f"Error fetching recent activity: {e}")
            return {
                'recent_payouts': [],
                'pending_charges': {'charges': [], 'total': 0},
                'error': str(e),
                'timestamp': datetime.now().isoformat(),
            }

    @staticmethod
    async def get_billing_forecast(days: int = 90) -> Dict[str, Any]:
        """
        Get billing forecast for the next N days.
        
        Useful for cash flow projections and investor reporting.
        
        Args:
            days: Number of days to forecast
            
        Returns:
            Dict with daily/weekly/monthly billing projections
        """
        try:
            # Get extended billing data
            billings = await StripeService.get_upcoming_billings(days=days)
            
            # For now, return the standard billings with extended projections
            monthly_recurring = billings.get('this_month', {}).get('total', 0)
            
            return {
                'next_30_days': monthly_recurring,
                'next_60_days': monthly_recurring * 2,  # Simplified projection
                'next_90_days': monthly_recurring * 3,  # Simplified projection
                'by_cohort': billings.get('by_cohort', {}),
                'monthly_recurring_revenue': monthly_recurring,
                'timestamp': datetime.now().isoformat(),
            }
        except Exception as e:
            logger.error(f"Error creating billing forecast: {e}")
            return {
                'next_30_days': 0,
                'next_60_days': 0,
                'next_90_days': 0,
                'error': str(e),
                'timestamp': datetime.now().isoformat(),
            }


# Singleton-style access
cashflow_service = CashFlowService()

