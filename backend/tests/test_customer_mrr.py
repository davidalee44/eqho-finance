"""
Tests for Customer MRR API endpoints
"""

from datetime import datetime
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


# Sample subscription data for testing
def create_mock_subscription(
    customer_id: str,
    sub_id: str,
    amount: int,  # in cents
    interval: str = "month",
    interval_count: int = 1,
    status: str = "active",
):
    """Create a mock subscription with items"""
    return {
        "id": sub_id,
        "customer": customer_id,
        "status": status,
        "items": [
            {
                "price": f"price_{sub_id}",
                "amount": amount,
                "interval": interval,
                "interval_count": interval_count,
            }
        ],
        "current_period_start": 1700000000,
        "current_period_end": 1702592000,
    }


class TestCustomerMRRList:
    """Tests for /customer-mrr/list endpoint"""

    @pytest.mark.asyncio
    async def test_empty_subscriptions_list(self):
        """Should return empty list when no subscriptions"""
        with patch(
            "app.api.v1.customer_mrr.StripeService.get_active_subscriptions",
            new_callable=AsyncMock,
            return_value=[],
        ):
            response = client.get("/api/v1/customer-mrr/list")
            assert response.status_code == 200
            data = response.json()
            assert data["total_customers"] == 0
            assert data["total_mrr"] == 0
            assert data["customers"] == []
            assert "generated_at" in data

    @pytest.mark.asyncio
    async def test_monthly_subscription_mrr(self):
        """Should calculate MRR correctly for monthly subscriptions"""
        mock_subs = [
            create_mock_subscription("cus_1", "sub_1", 9900, "month"),  # $99/mo
        ]
        with patch(
            "app.api.v1.customer_mrr.StripeService.get_active_subscriptions",
            new_callable=AsyncMock,
            return_value=mock_subs,
        ):
            response = client.get("/api/v1/customer-mrr/list")
            assert response.status_code == 200
            data = response.json()
            assert data["total_customers"] == 1
            assert data["total_mrr"] == 99.0
            assert data["customers"][0]["mrr"] == 99.0

    @pytest.mark.asyncio
    async def test_yearly_subscription_mrr(self):
        """Should calculate MRR correctly for yearly subscriptions (divide by 12)"""
        mock_subs = [
            create_mock_subscription("cus_1", "sub_1", 120000, "year"),  # $1200/yr = $100/mo
        ]
        with patch(
            "app.api.v1.customer_mrr.StripeService.get_active_subscriptions",
            new_callable=AsyncMock,
            return_value=mock_subs,
        ):
            response = client.get("/api/v1/customer-mrr/list")
            assert response.status_code == 200
            data = response.json()
            assert data["total_mrr"] == 100.0
            assert data["customers"][0]["mrr"] == 100.0

    @pytest.mark.asyncio
    async def test_weekly_subscription_mrr(self):
        """Should calculate MRR correctly for weekly subscriptions"""
        mock_subs = [
            create_mock_subscription("cus_1", "sub_1", 2500, "week"),  # $25/wk = ~$108.33/mo
        ]
        with patch(
            "app.api.v1.customer_mrr.StripeService.get_active_subscriptions",
            new_callable=AsyncMock,
            return_value=mock_subs,
        ):
            response = client.get("/api/v1/customer-mrr/list")
            assert response.status_code == 200
            data = response.json()
            # $25 * 52 / 12 = $108.33
            assert abs(data["total_mrr"] - 108.33) < 0.01

    @pytest.mark.asyncio
    async def test_daily_subscription_mrr(self):
        """Should calculate MRR correctly for daily subscriptions"""
        mock_subs = [
            create_mock_subscription("cus_1", "sub_1", 100, "day"),  # $1/day = $30/mo
        ]
        with patch(
            "app.api.v1.customer_mrr.StripeService.get_active_subscriptions",
            new_callable=AsyncMock,
            return_value=mock_subs,
        ):
            response = client.get("/api/v1/customer-mrr/list")
            assert response.status_code == 200
            data = response.json()
            assert data["total_mrr"] == 30.0

    @pytest.mark.asyncio
    async def test_interval_count_handling(self):
        """Should handle interval_count for multi-period billing"""
        mock_subs = [
            create_mock_subscription("cus_1", "sub_1", 30000, "month", interval_count=3),  # $300/3mo = $100/mo
        ]
        with patch(
            "app.api.v1.customer_mrr.StripeService.get_active_subscriptions",
            new_callable=AsyncMock,
            return_value=mock_subs,
        ):
            response = client.get("/api/v1/customer-mrr/list")
            assert response.status_code == 200
            data = response.json()
            assert data["total_mrr"] == 100.0

    @pytest.mark.asyncio
    async def test_skip_zero_amount_subscriptions(self):
        """Should skip subscriptions with $0 amount"""
        mock_subs = [
            create_mock_subscription("cus_1", "sub_1", 0, "month"),  # $0 - should be skipped
            create_mock_subscription("cus_2", "sub_2", 9900, "month"),  # $99/mo
        ]
        with patch(
            "app.api.v1.customer_mrr.StripeService.get_active_subscriptions",
            new_callable=AsyncMock,
            return_value=mock_subs,
        ):
            response = client.get("/api/v1/customer-mrr/list")
            assert response.status_code == 200
            data = response.json()
            assert data["total_customers"] == 1
            assert data["customers"][0]["customer_id"] == "cus_2"

    @pytest.mark.asyncio
    async def test_min_mrr_filter(self):
        """Should filter customers by minimum MRR"""
        mock_subs = [
            create_mock_subscription("cus_1", "sub_1", 5000, "month"),  # $50/mo
            create_mock_subscription("cus_2", "sub_2", 15000, "month"),  # $150/mo
        ]
        with patch(
            "app.api.v1.customer_mrr.StripeService.get_active_subscriptions",
            new_callable=AsyncMock,
            return_value=mock_subs,
        ):
            response = client.get("/api/v1/customer-mrr/list?min_mrr=100")
            assert response.status_code == 200
            data = response.json()
            assert data["total_customers"] == 1
            assert data["customers"][0]["mrr"] == 150.0

    @pytest.mark.asyncio
    async def test_sort_by_mrr_descending(self):
        """Should sort by MRR descending by default"""
        mock_subs = [
            create_mock_subscription("cus_1", "sub_1", 5000, "month"),  # $50/mo
            create_mock_subscription("cus_2", "sub_2", 15000, "month"),  # $150/mo
            create_mock_subscription("cus_3", "sub_3", 10000, "month"),  # $100/mo
        ]
        with patch(
            "app.api.v1.customer_mrr.StripeService.get_active_subscriptions",
            new_callable=AsyncMock,
            return_value=mock_subs,
        ):
            response = client.get("/api/v1/customer-mrr/list")
            assert response.status_code == 200
            data = response.json()
            mrr_values = [c["mrr"] for c in data["customers"]]
            assert mrr_values == [150.0, 100.0, 50.0]

    @pytest.mark.asyncio
    async def test_sort_by_mrr_ascending(self):
        """Should sort by MRR ascending when specified"""
        mock_subs = [
            create_mock_subscription("cus_1", "sub_1", 5000, "month"),
            create_mock_subscription("cus_2", "sub_2", 15000, "month"),
        ]
        with patch(
            "app.api.v1.customer_mrr.StripeService.get_active_subscriptions",
            new_callable=AsyncMock,
            return_value=mock_subs,
        ):
            response = client.get("/api/v1/customer-mrr/list?sort_desc=false")
            assert response.status_code == 200
            data = response.json()
            mrr_values = [c["mrr"] for c in data["customers"]]
            assert mrr_values == [50.0, 150.0]

    @pytest.mark.asyncio
    async def test_sort_by_customer_id(self):
        """Should sort by customer ID when specified"""
        mock_subs = [
            create_mock_subscription("cus_z", "sub_1", 5000, "month"),
            create_mock_subscription("cus_a", "sub_2", 15000, "month"),
        ]
        with patch(
            "app.api.v1.customer_mrr.StripeService.get_active_subscriptions",
            new_callable=AsyncMock,
            return_value=mock_subs,
        ):
            response = client.get("/api/v1/customer-mrr/list?sort_by=customer&sort_desc=false")
            assert response.status_code == 200
            data = response.json()
            customer_ids = [c["customer_id"] for c in data["customers"]]
            assert customer_ids == ["cus_a", "cus_z"]


class TestMRRByTier:
    """Tests for /customer-mrr/summary-by-tier endpoint"""

    @pytest.mark.asyncio
    async def test_empty_tier_summary(self):
        """Should return empty tiers when no subscriptions"""
        with patch(
            "app.api.v1.customer_mrr.StripeService.get_active_subscriptions",
            new_callable=AsyncMock,
            return_value=[],
        ):
            response = client.get("/api/v1/customer-mrr/summary-by-tier")
            assert response.status_code == 200
            data = response.json()
            assert data["total_mrr"] == 0
            assert data["total_customers"] == 0
            assert data["tiers"] == []

    @pytest.mark.asyncio
    async def test_tier_classification(self):
        """Should classify customers into correct tiers"""
        mock_subs = [
            create_mock_subscription("cus_enterprise", "sub_1", 600000, "month"),  # $6000/mo - Enterprise
            create_mock_subscription("cus_high", "sub_2", 200000, "month"),  # $2000/mo - High-Value
            create_mock_subscription("cus_standard", "sub_3", 75000, "month"),  # $750/mo - Standard
            create_mock_subscription("cus_growth", "sub_4", 25000, "month"),  # $250/mo - Growth
            create_mock_subscription("cus_starter", "sub_5", 5000, "month"),  # $50/mo - Starter
        ]
        with patch(
            "app.api.v1.customer_mrr.StripeService.get_active_subscriptions",
            new_callable=AsyncMock,
            return_value=mock_subs,
        ):
            response = client.get("/api/v1/customer-mrr/summary-by-tier")
            assert response.status_code == 200
            data = response.json()
            
            assert data["total_customers"] == 5
            
            # Get tiers by name
            tiers_by_name = {t["tier"]: t for t in data["tiers"]}
            
            assert tiers_by_name["Enterprise ($5K+)"]["customer_count"] == 1
            assert tiers_by_name["High-Value ($1K-$5K)"]["customer_count"] == 1
            assert tiers_by_name["Standard ($500-$1K)"]["customer_count"] == 1
            assert tiers_by_name["Growth ($100-$500)"]["customer_count"] == 1
            assert tiers_by_name["Starter (<$100)"]["customer_count"] == 1

    @pytest.mark.asyncio
    async def test_tier_average_mrr(self):
        """Should calculate average MRR per tier correctly"""
        mock_subs = [
            create_mock_subscription("cus_1", "sub_1", 10000, "month"),  # $100/mo - Growth
            create_mock_subscription("cus_2", "sub_2", 30000, "month"),  # $300/mo - Growth
        ]
        with patch(
            "app.api.v1.customer_mrr.StripeService.get_active_subscriptions",
            new_callable=AsyncMock,
            return_value=mock_subs,
        ):
            response = client.get("/api/v1/customer-mrr/summary-by-tier")
            assert response.status_code == 200
            data = response.json()
            
            growth_tier = next(t for t in data["tiers"] if t["tier"] == "Growth ($100-$500)")
            assert growth_tier["customer_count"] == 2
            assert growth_tier["total_mrr"] == 400.0
            assert growth_tier["average_mrr"] == 200.0


class TestCustomerMRRExport:
    """Tests for /customer-mrr/export-csv endpoint"""

    @pytest.mark.asyncio
    async def test_export_csv_empty(self):
        """Should return CSV with header only when no data"""
        with patch(
            "app.api.v1.customer_mrr.StripeService.get_active_subscriptions",
            new_callable=AsyncMock,
            return_value=[],
        ):
            response = client.get("/api/v1/customer-mrr/export-csv")
            assert response.status_code == 200
            data = response.json()
            assert data["row_count"] == 0
            assert "Customer ID,Subscription ID,MRR" in data["csv"]

    @pytest.mark.asyncio
    async def test_export_csv_with_data(self):
        """Should export customer data as CSV"""
        mock_subs = [
            create_mock_subscription("cus_test123", "sub_test456", 9900, "month"),
        ]
        with patch(
            "app.api.v1.customer_mrr.StripeService.get_active_subscriptions",
            new_callable=AsyncMock,
            return_value=mock_subs,
        ):
            response = client.get("/api/v1/customer-mrr/export-csv")
            assert response.status_code == 200
            data = response.json()
            
            assert data["row_count"] == 1
            assert "cus_test123" in data["csv"]
            assert "sub_test456" in data["csv"]
            assert "99.00" in data["csv"]
            assert "month" in data["csv"]

    @pytest.mark.asyncio
    async def test_export_csv_skips_zero_mrr(self):
        """Should not include $0 subscriptions in CSV"""
        mock_subs = [
            create_mock_subscription("cus_free", "sub_free", 0, "month"),
            create_mock_subscription("cus_paid", "sub_paid", 9900, "month"),
        ]
        with patch(
            "app.api.v1.customer_mrr.StripeService.get_active_subscriptions",
            new_callable=AsyncMock,
            return_value=mock_subs,
        ):
            response = client.get("/api/v1/customer-mrr/export-csv")
            assert response.status_code == 200
            data = response.json()
            
            assert data["row_count"] == 1
            assert "cus_free" not in data["csv"]
            assert "cus_paid" in data["csv"]
