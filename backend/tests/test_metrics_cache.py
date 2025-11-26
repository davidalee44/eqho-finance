"""
Tests for MetricsCacheService

Tests database-backed caching for API metrics.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from app.services.metrics_cache_service import MetricsCacheService


class TestMetricsCacheService:
    """Tests for MetricsCacheService"""

    @pytest.fixture(autouse=True)
    def reset_client(self):
        """Reset the client before each test"""
        MetricsCacheService.client = None
        yield
        MetricsCacheService.client = None

    @pytest.fixture
    def mock_supabase_client(self):
        """Create a mock Supabase client"""
        client = MagicMock()
        return client

    @pytest.mark.asyncio
    async def test_save_metrics_success(self, mock_supabase_client):
        """Test successful metric saving"""
        # Setup mock
        mock_supabase_client.table.return_value.insert.return_value.execute.return_value.data = [
            {"id": "test-id"}
        ]
        MetricsCacheService.client = mock_supabase_client

        # Test
        result = await MetricsCacheService.save_metrics(
            metric_type="test_metric",
            data={"value": 100},
            source="test"
        )

        # Assert
        assert result is True
        mock_supabase_client.table.assert_called_with("metrics_cache")

    @pytest.mark.asyncio
    async def test_save_metrics_no_client(self):
        """Test save_metrics returns False when client unavailable"""
        MetricsCacheService.client = None

        with patch.object(MetricsCacheService, '_get_client', return_value=None):
            result = await MetricsCacheService.save_metrics(
                metric_type="test_metric",
                data={"value": 100},
                source="test"
            )

        assert result is False

    @pytest.mark.asyncio
    async def test_get_latest_metrics_success(self, mock_supabase_client):
        """Test successful metric retrieval"""
        # Setup mock
        mock_data = {
            "data": {"mrr": 100000},
            "fetched_at": "2025-11-25T12:00:00+00:00",
            "source": "stripe"
        }
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = [mock_data]
        MetricsCacheService.client = mock_supabase_client

        # Test
        result = await MetricsCacheService.get_latest_metrics("test_metric")

        # Assert
        assert result is not None
        assert result["data"] == {"mrr": 100000}
        assert result["is_cached"] is True

    @pytest.mark.asyncio
    async def test_get_latest_metrics_not_found(self, mock_supabase_client):
        """Test metric retrieval when no data found"""
        # Setup mock
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = []
        MetricsCacheService.client = mock_supabase_client

        # Test
        result = await MetricsCacheService.get_latest_metrics("nonexistent_metric")

        # Assert
        assert result is None

    @pytest.mark.asyncio
    async def test_get_all_latest_metrics(self, mock_supabase_client):
        """Test retrieving all cached metrics"""
        # Setup mock with multiple metric types
        mock_data = [
            {
                "metric_type": "comprehensive_metrics",
                "data": {"mrr": 100000},
                "fetched_at": "2025-11-25T12:00:00+00:00",
                "source": "stripe"
            },
            {
                "metric_type": "churn_arpu",
                "data": {"churn_rate": 5.0},
                "fetched_at": "2025-11-25T11:00:00+00:00",
                "source": "stripe"
            },
        ]
        mock_supabase_client.table.return_value.select.return_value.order.return_value.execute.return_value.data = mock_data
        MetricsCacheService.client = mock_supabase_client

        # Test
        result = await MetricsCacheService.get_all_latest_metrics()

        # Assert
        assert "comprehensive_metrics" in result
        assert "churn_arpu" in result
        assert result["comprehensive_metrics"]["data"]["mrr"] == 100000


class TestMetricsCacheIntegration:
    """Integration tests for metrics cache (requires running Supabase)"""

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_save_and_retrieve_metrics(self):
        """Test full save and retrieve cycle"""
        test_data = {
            "mrr": 104492,
            "customers": 143,
            "timestamp": datetime.now().isoformat(),
        }

        # Save
        save_result = await MetricsCacheService.save_metrics(
            metric_type="integration_test",
            data=test_data,
            source="test"
        )

        if not save_result:
            pytest.skip("Supabase not configured")

        # Retrieve
        retrieve_result = await MetricsCacheService.get_latest_metrics("integration_test")

        assert retrieve_result is not None
        assert retrieve_result["data"]["mrr"] == 104492
        assert retrieve_result["is_cached"] is True

