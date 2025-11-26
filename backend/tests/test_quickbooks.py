"""
Tests for QuickBooks service and endpoints

Tests OAuth flow, P&L fetching, and caching behavior.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.quickbooks_service import QuickBooksService

client = TestClient(app)


class TestQuickBooksService:
    """Tests for QuickBooksService"""

    def test_service_init_without_config(self):
        """Test service initializes without crashing when not configured"""
        service = QuickBooksService()
        assert service.is_configured is False

    def test_is_configured_check(self):
        """Test is_configured property"""
        service = QuickBooksService()
        service.client_id = "test_id"
        service.client_secret = "test_secret"
        service.redirect_uri = "http://localhost/callback"

        assert service.is_configured is True

    def test_api_base_url_sandbox(self):
        """Test sandbox URL is used by default"""
        service = QuickBooksService()
        service.use_sandbox = True

        assert "sandbox" in service.api_base_url

    def test_api_base_url_production(self):
        """Test production URL when not in sandbox mode"""
        service = QuickBooksService()
        service.use_sandbox = False

        assert "sandbox" not in service.api_base_url

    def test_parse_pl_report_empty(self):
        """Test P&L parsing handles empty data"""
        service = QuickBooksService()
        result = service._parse_pl_report({})

        assert result["total_revenue"] == 0
        assert result["gross_profit"] == 0
        assert result["net_income"] == 0


class TestQuickBooksEndpoints:
    """Tests for QuickBooks API endpoints"""

    def test_quickbooks_status_not_configured(self):
        """Test status endpoint when not configured"""
        response = client.get("/api/v1/quickbooks/status")
        assert response.status_code == 200
        data = response.json()

        assert "is_configured" in data
        assert "is_connected" in data
        assert "timestamp" in data

    def test_quickbooks_auth_url_not_configured(self):
        """Test auth URL endpoint returns error when not configured"""
        response = client.get("/api/v1/quickbooks/auth/url")

        # Should return 503 when not configured
        assert response.status_code == 503

    def test_quickbooks_profit_loss_not_configured(self):
        """Test P&L endpoint returns cached or error when not configured"""
        response = client.get("/api/v1/quickbooks/profit-loss")

        # Should return 503 or cached data
        assert response.status_code in [200, 503]

        if response.status_code == 200:
            data = response.json()
            # Should indicate it's cached or have a warning
            assert "warning" in data or "is_cached" in data

    def test_quickbooks_payroll_not_configured(self):
        """Test payroll endpoint returns error when not configured"""
        response = client.get("/api/v1/quickbooks/payroll")

        # Should return 503 or cached data
        assert response.status_code in [200, 503]

    def test_quickbooks_manual_pl_valid_data(self):
        """Test manual P&L submission with valid data"""
        pl_data = {
            "total_revenue": 635390,
            "total_cogs": 280529.05,
            "gross_profit": 354860.85,
            "total_expenses": 1058976.92,
            "net_income": -704116.07,
        }

        response = client.post("/api/v1/quickbooks/manual-pl", json=pl_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_quickbooks_manual_pl_missing_fields(self):
        """Test manual P&L submission with missing required fields"""
        pl_data = {
            "total_revenue": 635390,
            # Missing other required fields
        }

        response = client.post("/api/v1/quickbooks/manual-pl", json=pl_data)
        assert response.status_code == 400


class TestQuickBooksOAuth:
    """Tests for QuickBooks OAuth flow"""

    @patch.object(QuickBooksService, 'is_configured', True)
    def test_get_authorization_url_format(self):
        """Test authorization URL format"""
        service = QuickBooksService()
        service.client_id = "test_client_id"
        service.client_secret = "test_secret"
        service.redirect_uri = "http://localhost:8000/callback"

        url = service.get_authorization_url(state="test_state")

        assert "client_id=test_client_id" in url
        assert "redirect_uri" in url
        assert "state=test_state" in url
        assert "scope=com.intuit.quickbooks.accounting" in url

    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_exchange_code_for_tokens(self, mock_client_class):
        """Test token exchange"""
        # Setup mock
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "access_token": "test_access_token",
            "refresh_token": "test_refresh_token",
            "expires_in": 3600,
            "token_type": "bearer",
        }

        mock_client = MagicMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock()
        mock_client_class.return_value = mock_client

        service = QuickBooksService()
        service.client_id = "test_id"
        service.client_secret = "test_secret"
        service.redirect_uri = "http://localhost/callback"

        with patch.object(service, '_store_tokens', AsyncMock()):
            result = await service.exchange_code_for_tokens("test_code")

        assert result["access_token"] == "test_access_token"
        assert result["refresh_token"] == "test_refresh_token"


class TestQuickBooksCaching:
    """Tests for QuickBooks caching behavior"""

    def test_manual_pl_is_cached(self):
        """Test that manually submitted P&L is cached"""
        pl_data = {
            "total_revenue": 100000,
            "total_cogs": 40000,
            "gross_profit": 60000,
            "total_expenses": 50000,
            "net_income": 10000,
        }

        # Submit manual P&L
        response = client.post("/api/v1/quickbooks/manual-pl", json=pl_data)
        assert response.status_code == 200

        # Check it's in the cache
        cache_response = client.get("/api/v1/stripe/cached/quickbooks_pl")

        if cache_response.status_code == 200:
            cache_data = cache_response.json()
            assert cache_data["is_cached"] is True
            assert cache_data["source"] == "manual"


class TestQuickBooksIntegration:
    """Integration tests requiring configured QuickBooks"""

    @pytest.mark.integration
    def test_quickbooks_configured_status(self):
        """Test status when QuickBooks is configured"""
        response = client.get("/api/v1/quickbooks/status")
        assert response.status_code == 200
        data = response.json()

        if data["is_configured"]:
            # If configured, should have more info
            assert "is_connected" in data

    @pytest.mark.integration
    def test_profit_loss_with_cache(self):
        """Test P&L endpoint uses cache when API unavailable"""
        # First, ensure there's cached data
        manual_pl = {
            "total_revenue": 635390,
            "total_cogs": 280529.05,
            "gross_profit": 354860.85,
            "total_expenses": 1058976.92,
            "net_income": -704116.07,
        }
        client.post("/api/v1/quickbooks/manual-pl", json=manual_pl)

        # Now request P&L - should return cached if QB not configured
        response = client.get("/api/v1/quickbooks/profit-loss")

        if response.status_code == 200:
            data = response.json()
            # Should indicate source
            assert "warning" in data or "is_cached" in data or "data" in data

