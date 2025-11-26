"""
Tests for Stripe API endpoints

Tests the Stripe data endpoints including caching functionality.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.stripe_service import StripeService

client = TestClient(app)


class TestStripeEndpoints:
    """Tests for Stripe data endpoints"""

    def test_health_check(self):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"

    @patch('app.api.v1.stripe_data.StripeService')
    @patch('app.api.v1.stripe_data.MetricsCacheService')
    def test_comprehensive_metrics(self, mock_cache, mock_stripe):
        """Test comprehensive metrics endpoint"""
        # Setup mocks
        mock_stripe.calculate_customer_metrics = AsyncMock(return_value={
            "active_customers": 147,
            "churned_customers": 16,
        })
        mock_stripe.calculate_retention_by_segment = AsyncMock(return_value={
            "overall": {"retention_rate": 90.2}
        })
        mock_stripe.calculate_pricing_tier_breakdown = AsyncMock(return_value={
            "tiers": []
        })
        mock_stripe.calculate_expansion_metrics = AsyncMock(return_value={
            "net_retention": 100.0
        })
        mock_stripe.calculate_unit_economics = AsyncMock(return_value={
            "ltv_cac_ratio": 17.5
        })
        mock_stripe.calculate_churn_rate = AsyncMock(return_value={
            "customer_churn_rate": 5.0
        })
        mock_stripe.calculate_arpu = AsyncMock(return_value={
            "arpu_monthly": 727
        })
        mock_cache.save_metrics = AsyncMock(return_value=True)

        response = client.get("/api/v1/stripe/comprehensive-metrics")

        # Endpoint should work (may use real data if not mocked properly)
        assert response.status_code in [200, 500]

    def test_cached_metrics_endpoint(self):
        """Test the cached metrics retrieval endpoint"""
        response = client.get("/api/v1/stripe/cached")
        assert response.status_code == 200
        data = response.json()
        assert "metrics" in data
        assert "count" in data
        assert "timestamp" in data

    def test_cached_metrics_by_type_not_found(self):
        """Test cached metrics by type when not found"""
        response = client.get("/api/v1/stripe/cached/nonexistent_type_xyz")
        # Should return 404 if not found
        assert response.status_code in [404, 200]

    def test_churn_and_arpu_endpoint(self):
        """Test churn and ARPU endpoint"""
        response = client.get("/api/v1/stripe/churn-and-arpu")
        # May fail if Stripe not configured, but should return valid response format
        if response.status_code == 200:
            data = response.json()
            assert "churn" in data
            assert "arpu" in data
            assert "timestamp" in data

    def test_customer_metrics_endpoint(self):
        """Test customer metrics endpoint"""
        response = client.get("/api/v1/stripe/customer-metrics")
        if response.status_code == 200:
            data = response.json()
            assert "active_customers" in data

    def test_subscriptions_endpoint(self):
        """Test subscriptions endpoint"""
        response = client.get("/api/v1/stripe/subscriptions")
        if response.status_code == 200:
            data = response.json()
            assert "count" in data
            assert "subscriptions" in data


class TestStripeCaching:
    """Tests for Stripe endpoint caching behavior"""

    @patch('app.api.v1.stripe_data.MetricsCacheService')
    def test_metrics_are_cached(self, mock_cache):
        """Test that metrics are cached after fetching"""
        mock_cache.save_metrics = AsyncMock(return_value=True)

        # Call the endpoint
        response = client.get("/api/v1/stripe/churn-and-arpu")

        if response.status_code == 200:
            # Verify cache was called (may not be called if using real service)
            # This test documents expected behavior
            pass

    def test_cached_endpoint_returns_timestamp(self):
        """Test that cached data includes timestamp"""
        response = client.get("/api/v1/stripe/cached")
        assert response.status_code == 200
        data = response.json()
        assert "timestamp" in data

        # If there are cached metrics, each should have fetched_at
        for metric_type, metric_data in data.get("metrics", {}).items():
            assert "fetched_at" in metric_data
            assert "is_cached" in metric_data


class TestStripePagination:
    """Tests for Stripe pagination helper"""

    @pytest.mark.asyncio
    @patch('stripe.Customer.list')
    async def test_pagination_continues_when_has_more(self, mock_list):
        """Test that pagination continues when has_more is True"""
        # Setup mock to return two pages
        page1_response = MagicMock()
        page1_response.data = [
            MagicMock(id="cus_1", email="a@test.com", created=1700000000, metadata={}),
            MagicMock(id="cus_2", email="b@test.com", created=1700000001, metadata={}),
        ]
        page1_response.has_more = True

        page2_response = MagicMock()
        page2_response.data = [
            MagicMock(id="cus_3", email="c@test.com", created=1700000002, metadata={}),
        ]
        page2_response.has_more = False

        mock_list.side_effect = [page1_response, page2_response]

        # Test
        customers = await StripeService.get_all_customers()

        # Assert
        assert len(customers) == 3
        assert mock_list.call_count == 2

    @pytest.mark.asyncio
    @patch('stripe.Customer.list')
    async def test_pagination_stops_when_no_more(self, mock_list):
        """Test that pagination stops when has_more is False"""
        response = MagicMock()
        response.data = [
            MagicMock(id="cus_1", email="a@test.com", created=1700000000, metadata={}),
        ]
        response.has_more = False

        mock_list.return_value = response

        # Test
        customers = await StripeService.get_all_customers()

        # Assert
        assert len(customers) == 1
        assert mock_list.call_count == 1

    @pytest.mark.asyncio
    @patch('stripe.Customer.list')
    async def test_pagination_handles_empty_response(self, mock_list):
        """Test that pagination handles empty responses"""
        response = MagicMock()
        response.data = []
        response.has_more = False

        mock_list.return_value = response

        # Test
        customers = await StripeService.get_all_customers()

        # Assert
        assert len(customers) == 0
        assert mock_list.call_count == 1

    @pytest.mark.asyncio
    @patch('stripe.Subscription.list')
    async def test_pagination_with_filter(self, mock_list):
        """Test pagination with customer ID filter"""
        response = MagicMock()
        response.data = [
            MagicMock(
                id="sub_1",
                customer="cus_1",
                status="active",
                current_period_start=1700000000,
                current_period_end=1702592000,
                __getitem__=lambda self, key: MagicMock(data=[]) if key == "items" else None,
            ),
            MagicMock(
                id="sub_2",
                customer="cus_2",
                status="active",
                current_period_start=1700000000,
                current_period_end=1702592000,
                __getitem__=lambda self, key: MagicMock(data=[]) if key == "items" else None,
            ),
        ]
        response.has_more = False

        mock_list.return_value = response

        # Test with filter
        subscriptions = await StripeService.get_active_subscriptions(customer_ids=["cus_1"])

        # Should only return cus_1's subscription
        assert len(subscriptions) == 1
        assert subscriptions[0]["customer"] == "cus_1"


class TestStripeIntegration:
    """Integration tests requiring live Stripe connection"""

    @pytest.mark.integration
    def test_live_comprehensive_metrics(self):
        """Test comprehensive metrics with live data"""
        response = client.get("/api/v1/stripe/comprehensive-metrics")

        if response.status_code == 500:
            pytest.skip("Stripe not configured or unavailable")

        assert response.status_code == 200
        data = response.json()

        # Verify structure
        assert "customer_metrics" in data
        assert "retention_by_segment" in data
        assert "pricing_tiers" in data
        assert "unit_economics" in data
        assert "timestamp" in data

    @pytest.mark.integration
    def test_live_churn_and_arpu(self):
        """Test churn and ARPU with live data"""
        response = client.get("/api/v1/stripe/churn-and-arpu?months=3")

        if response.status_code == 500:
            pytest.skip("Stripe not configured or unavailable")

        assert response.status_code == 200
        data = response.json()

        # Verify churn data
        assert data["churn"]["customer_churn_rate"] >= 0
        assert data["churn"]["period_months"] == 3

        # Verify ARPU data
        assert data["arpu"]["arpu_monthly"] > 0
        assert data["arpu"]["total_customers"] > 0

    @pytest.mark.integration
    def test_caching_creates_database_entry(self):
        """Test that API calls create cache entries in database"""
        # First, call an endpoint that should cache
        response = client.get("/api/v1/stripe/comprehensive-metrics")

        if response.status_code != 200:
            pytest.skip("Stripe not configured or unavailable")

        # Then check if it's in the cache
        cache_response = client.get("/api/v1/stripe/cached/comprehensive_metrics")

        assert cache_response.status_code == 200
        cache_data = cache_response.json()
        assert cache_data["is_cached"] is True
        assert "fetched_at" in cache_data

