"""
Pytest configuration and fixtures for backend tests
"""

import asyncio
from unittest.mock import MagicMock

import pytest


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_supabase_response():
    """Factory for creating mock Supabase responses"""
    def _create_response(data=None, error=None):
        response = MagicMock()
        response.data = data or []
        response.error = error
        return response
    return _create_response


@pytest.fixture
def mock_stripe_subscription():
    """Sample Stripe subscription data"""
    return {
        "id": "sub_test123",
        "customer": "cus_test123",
        "status": "active",
        "items": {
            "data": [
                {
                    "id": "si_test123",
                    "price": {
                        "id": "price_test123",
                        "unit_amount": 99900,  # $999.00
                        "recurring": {
                            "interval": "month",
                            "interval_count": 1,
                        }
                    }
                }
            ]
        },
        "current_period_start": 1700000000,
        "current_period_end": 1702592000,
    }


@pytest.fixture
def mock_stripe_customer():
    """Sample Stripe customer data"""
    return {
        "id": "cus_test123",
        "email": "test@example.com",
        "name": "Test Customer",
        "metadata": {
            "company": "Test Company",
        },
        "created": 1690000000,
    }


@pytest.fixture
def sample_pl_data():
    """Sample P&L data for testing"""
    return {
        "total_revenue": 635390,
        "total_cogs": 280529.05,
        "gross_profit": 354860.85,
        "total_expenses": 1058976.92,
        "net_income": -704116.07,
        "line_items": {
            "revenue": [
                {"name": "Product Revenue", "value": 500000},
                {"name": "Service Revenue", "value": 135390},
            ],
            "cogs": [
                {"name": "Direct Costs", "value": 280529.05},
            ],
            "expenses": [
                {"name": "Payroll", "value": 600000},
                {"name": "Marketing", "value": 200000},
                {"name": "Operations", "value": 258976.92},
            ],
        },
    }


@pytest.fixture
def sample_comprehensive_metrics():
    """Sample comprehensive metrics for testing"""
    return {
        "customer_metrics": {
            "active_customers": 147,
            "churned_customers": 16,
            "total_customers_all_time": 163,
            "net_adds_ytd": 125,
            "new_customers_ytd": 141,
            "churned_ytd": 16,
            "growth_rate_ytd": 1125.0,
        },
        "retention_by_segment": {
            "towpilot": {"retention_rate": 95.0},
            "other_products": {"retention_rate": 90.2},
            "overall": {"retention_rate": 90.2},
        },
        "pricing_tiers": {
            "tiers": [
                {"tier": "Heavy Duty", "customers": 8, "mrr": 48182.67},
                {"tier": "Medium Duty", "customers": 55, "mrr": 36907.0},
                {"tier": "Standard", "customers": 38, "mrr": 18913.33},
            ],
        },
        "arpu": {
            "arpu_monthly": 727.11,
            "arpu_annual": 8725.31,
            "total_customers": 147,
            "total_mrr": 106885.0,
        },
        "churn": {
            "customer_churn_rate": 24.62,
            "revenue_churn_rate": 12.85,
        },
        "timestamp": "2025-11-25T12:00:00",
    }


# Markers for different test types
def pytest_configure(config):
    """Configure custom markers"""
    config.addinivalue_line(
        "markers", "integration: mark test as integration test (requires live services)"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )

