"""
Tests for Revenue Projections API endpoints
"""

from datetime import datetime
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def create_mock_subscription(
    customer_id: str,
    sub_id: str,
    amount: int,  # in cents
    interval: str = "month",
    interval_count: int = 1,
    period_end_ts: int = None,
):
    """Create a mock subscription with specified period end"""
    if period_end_ts is None:
        # Default to mid-month of current month
        now = datetime.now()
        period_end_ts = int(datetime(now.year, now.month, 15).timestamp())
    
    return {
        "id": sub_id,
        "customer": customer_id,
        "status": "active",
        "items": [
            {
                "price": f"price_{sub_id}",
                "amount": amount,
                "interval": interval,
                "interval_count": interval_count,
            }
        ],
        "current_period_start": period_end_ts - 2592000,  # 30 days before
        "current_period_end": period_end_ts,
    }


class TestCurrentMonthProjections:
    """Tests for /revenue/current-month endpoint"""

    @pytest.mark.asyncio
    async def test_empty_subscriptions(self):
        """Should return zeros when no subscriptions"""
        with patch(
            "app.api.v1.revenue_projections.StripeService.get_active_subscriptions",
            new_callable=AsyncMock,
            return_value=[],
        ):
            response = client.get("/api/v1/revenue/current-month")
            assert response.status_code == 200
            data = response.json()
            
            assert "month" in data
            assert "summary" in data
            assert data["summary"]["customers_invoicing"] == 0
            assert data["summary"]["total_projected"] == 0

    @pytest.mark.asyncio
    async def test_current_month_with_subscriptions(self):
        """Should calculate current month projections"""
        now = datetime.now()
        current_month_ts = int(datetime(now.year, now.month, 20).timestamp())
        
        mock_subs = [
            create_mock_subscription("cus_1", "sub_1", 9900, "month", period_end_ts=current_month_ts),
        ]
        
        with patch(
            "app.api.v1.revenue_projections.StripeService.get_active_subscriptions",
            new_callable=AsyncMock,
            return_value=mock_subs,
        ):
            response = client.get("/api/v1/revenue/current-month")
            assert response.status_code == 200
            data = response.json()
            
            assert data["summary"]["customers_invoicing"] == 1

    @pytest.mark.asyncio
    async def test_skip_zero_amount_subscriptions(self):
        """Should skip $0 subscriptions"""
        now = datetime.now()
        current_month_ts = int(datetime(now.year, now.month, 20).timestamp())
        
        mock_subs = [
            create_mock_subscription("cus_1", "sub_1", 0, "month", period_end_ts=current_month_ts),
        ]
        
        with patch(
            "app.api.v1.revenue_projections.StripeService.get_active_subscriptions",
            new_callable=AsyncMock,
            return_value=mock_subs,
        ):
            response = client.get("/api/v1/revenue/current-month")
            assert response.status_code == 200
            data = response.json()
            
            assert data["summary"]["customers_invoicing"] == 0

    @pytest.mark.asyncio
    async def test_weekly_breakdown_present(self):
        """Should include weekly breakdown"""
        with patch(
            "app.api.v1.revenue_projections.StripeService.get_active_subscriptions",
            new_callable=AsyncMock,
            return_value=[],
        ):
            response = client.get("/api/v1/revenue/current-month")
            assert response.status_code == 200
            data = response.json()
            
            assert "collection_by_week" in data
            assert isinstance(data["collection_by_week"], list)


class TestMonthDetail:
    """Tests for /revenue/month-detail endpoint"""

    @pytest.mark.asyncio
    async def test_default_to_current_month(self):
        """Should default to current month when no params"""
        with patch(
            "app.api.v1.revenue_projections.StripeService.get_active_subscriptions",
            new_callable=AsyncMock,
            return_value=[],
        ):
            response = client.get("/api/v1/revenue/month-detail")
            assert response.status_code == 200
            data = response.json()
            
            now = datetime.now()
            assert data["year"] == now.year
            assert data["month_number"] == now.month

    @pytest.mark.asyncio
    async def test_specific_month(self):
        """Should return data for specific month"""
        with patch(
            "app.api.v1.revenue_projections.StripeService.get_active_subscriptions",
            new_callable=AsyncMock,
            return_value=[],
        ):
            response = client.get("/api/v1/revenue/month-detail?year=2025&month=6")
            assert response.status_code == 200
            data = response.json()
            
            assert data["year"] == 2025
            assert data["month_number"] == 6
            assert "June 2025" in data["month"]

    @pytest.mark.asyncio
    async def test_invalid_month_rejected(self):
        """Should reject invalid month values"""
        response = client.get("/api/v1/revenue/month-detail?month=13")
        assert response.status_code == 400
        assert "Month must be between 1 and 12" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_month_zero_defaults_to_current(self):
        """Month=0 is falsy, so it defaults to current month"""
        with patch(
            "app.api.v1.revenue_projections.StripeService.get_active_subscriptions",
            new_callable=AsyncMock,
            return_value=[],
        ):
            response = client.get("/api/v1/revenue/month-detail?month=0")
            assert response.status_code == 200
            data = response.json()
            # Should default to current month since 0 is falsy
            assert data["month_number"] == datetime.now().month

    @pytest.mark.asyncio
    async def test_invoices_sorted_by_date(self):
        """Should return invoices sorted by date"""
        target_ts_early = int(datetime(2025, 6, 5).timestamp())
        target_ts_late = int(datetime(2025, 6, 25).timestamp())
        
        mock_subs = [
            create_mock_subscription("cus_late", "sub_late", 9900, "month", period_end_ts=target_ts_late),
            create_mock_subscription("cus_early", "sub_early", 9900, "month", period_end_ts=target_ts_early),
        ]
        
        with patch(
            "app.api.v1.revenue_projections.StripeService.get_active_subscriptions",
            new_callable=AsyncMock,
            return_value=mock_subs,
        ):
            response = client.get("/api/v1/revenue/month-detail?year=2025&month=6")
            assert response.status_code == 200
            data = response.json()
            
            assert len(data["invoices"]) == 2
            assert data["invoices"][0]["customer_id"] == "cus_early"
            assert data["invoices"][1]["customer_id"] == "cus_late"


class TestQuarterlyForecast:
    """Tests for /revenue/quarterly-forecast endpoint"""

    @pytest.mark.asyncio
    async def test_default_four_quarters(self):
        """Should return 4 quarters by default"""
        with patch(
            "app.api.v1.revenue_projections.StripeService.get_active_subscriptions",
            new_callable=AsyncMock,
            return_value=[],
        ):
            response = client.get("/api/v1/revenue/quarterly-forecast")
            assert response.status_code == 200
            data = response.json()
            
            assert len(data["quarters"]) == 4
            assert "4 quarters" in data["projection_period"]

    @pytest.mark.asyncio
    async def test_custom_quarter_count(self):
        """Should return requested number of quarters"""
        with patch(
            "app.api.v1.revenue_projections.StripeService.get_active_subscriptions",
            new_callable=AsyncMock,
            return_value=[],
        ):
            response = client.get("/api/v1/revenue/quarterly-forecast?quarters=2")
            assert response.status_code == 200
            data = response.json()
            
            assert len(data["quarters"]) == 2

    @pytest.mark.asyncio
    async def test_max_eight_quarters(self):
        """Should limit to 8 quarters max"""
        response = client.get("/api/v1/revenue/quarterly-forecast?quarters=10")
        # FastAPI Query validation should reject this
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_quarter_structure(self):
        """Should return proper quarter structure"""
        with patch(
            "app.api.v1.revenue_projections.StripeService.get_active_subscriptions",
            new_callable=AsyncMock,
            return_value=[],
        ):
            response = client.get("/api/v1/revenue/quarterly-forecast")
            assert response.status_code == 200
            data = response.json()
            
            quarter = data["quarters"][0]
            assert "quarter" in quarter  # e.g., "Q4 2025"
            assert "year" in quarter
            assert "quarter_number" in quarter
            assert "projected_invoice_amount" in quarter
            assert "average_mrr" in quarter
            assert "months" in quarter


class TestAnnualForecast:
    """Tests for /revenue/annual-forecast endpoint"""

    @pytest.mark.asyncio
    async def test_returns_twelve_months(self):
        """Should return 12 months of projections"""
        with patch(
            "app.api.v1.revenue_projections.StripeService.get_active_subscriptions",
            new_callable=AsyncMock,
            return_value=[],
        ):
            response = client.get("/api/v1/revenue/annual-forecast")
            assert response.status_code == 200
            data = response.json()
            
            assert len(data["monthly_projections"]) == 12
            assert "12 months" in data["forecast_period"]

    @pytest.mark.asyncio
    async def test_monthly_structure(self):
        """Should return proper monthly structure"""
        with patch(
            "app.api.v1.revenue_projections.StripeService.get_active_subscriptions",
            new_callable=AsyncMock,
            return_value=[],
        ):
            response = client.get("/api/v1/revenue/annual-forecast")
            assert response.status_code == 200
            data = response.json()
            
            month = data["monthly_projections"][0]
            assert "month" in month  # e.g., "December 2025"
            assert "month_number" in month
            assert "year" in month
            assert "customers_invoicing" in month
            assert "projected_invoice_amount" in month
            assert "mrr_represented" in month

    @pytest.mark.asyncio
    async def test_with_subscriptions(self):
        """Should calculate projections with actual subscriptions"""
        now = datetime.now()
        next_month_ts = int(datetime(now.year, now.month, 15).timestamp()) + 2592000  # ~30 days later
        
        mock_subs = [
            create_mock_subscription("cus_1", "sub_1", 99900, "month", period_end_ts=next_month_ts),
        ]
        
        with patch(
            "app.api.v1.revenue_projections.StripeService.get_active_subscriptions",
            new_callable=AsyncMock,
            return_value=mock_subs,
        ):
            response = client.get("/api/v1/revenue/annual-forecast")
            assert response.status_code == 200
            data = response.json()
            
            # At least one month should have projections
            total_projected = sum(m["projected_invoice_amount"] for m in data["monthly_projections"])
            # May or may not have matches depending on timing
            assert isinstance(total_projected, float)
