"""
Tests for Authentication and Authorization Service
"""

from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app.services.auth import (
    get_current_user,
    get_user_role,
    is_admin_role,
    require_admin,
)


class TestGetCurrentUser:
    """Tests for get_current_user function"""

    @pytest.mark.asyncio
    async def test_missing_authorization_header(self):
        """Should raise 401 when authorization header is missing"""
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(authorization=None)
        assert exc_info.value.status_code == 401
        assert "Missing or invalid authorization header" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_invalid_authorization_format(self):
        """Should raise 401 when authorization header doesn't start with Bearer"""
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(authorization="Basic sometoken")
        assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_valid_token(self):
        """Should return user_id when token is valid"""
        mock_user = MagicMock()
        mock_user.user = MagicMock()
        mock_user.user.id = "user-123"

        mock_client = MagicMock()
        mock_client.auth.get_user.return_value = mock_user

        with patch("app.services.auth.SupabaseService") as mock_supabase:
            mock_supabase.client = mock_client

            user_id = await get_current_user(authorization="Bearer valid_token")
            assert user_id == "user-123"
            mock_client.auth.get_user.assert_called_once_with("valid_token")

    @pytest.mark.asyncio
    async def test_invalid_token(self):
        """Should raise 401 when token is invalid"""
        mock_client = MagicMock()
        mock_client.auth.get_user.return_value = None

        with patch("app.services.auth.SupabaseService") as mock_supabase:
            mock_supabase.client = mock_client

            with pytest.raises(HTTPException) as exc_info:
                await get_current_user(authorization="Bearer invalid_token")
            assert exc_info.value.status_code == 401
            assert "Invalid or expired token" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_no_supabase_client(self):
        """Should raise 503 when Supabase client is unavailable"""
        with patch("app.services.auth.SupabaseService") as mock_supabase:
            mock_supabase.client = None
            mock_supabase.connect.return_value = None

            with pytest.raises(HTTPException) as exc_info:
                await get_current_user(authorization="Bearer valid_token")
            assert exc_info.value.status_code == 503
            assert "Database connection unavailable" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_exception_during_validation(self):
        """Should raise 401 when exception occurs during token validation"""
        mock_client = MagicMock()
        mock_client.auth.get_user.side_effect = Exception("Network error")

        with patch("app.services.auth.SupabaseService") as mock_supabase:
            mock_supabase.client = mock_client

            with pytest.raises(HTTPException) as exc_info:
                await get_current_user(authorization="Bearer valid_token")
            assert exc_info.value.status_code == 401
            assert "Authentication failed" in exc_info.value.detail


class TestGetUserRole:
    """Tests for get_user_role function"""

    @pytest.mark.asyncio
    async def test_returns_user_role(self):
        """Should return user role from metadata"""
        mock_user = MagicMock()
        mock_user.user = MagicMock()
        mock_user.user.user_metadata = {"role": "admin"}

        mock_client = MagicMock()
        mock_client.auth.admin.get_user_by_id.return_value = mock_user

        with patch("app.services.auth.SupabaseService") as mock_supabase:
            mock_supabase.client = mock_client

            role = await get_user_role("user-123")
            assert role == "admin"

    @pytest.mark.asyncio
    async def test_returns_none_for_no_role(self):
        """Should return None when user has no role"""
        mock_user = MagicMock()
        mock_user.user = MagicMock()
        mock_user.user.user_metadata = {}

        mock_client = MagicMock()
        mock_client.auth.admin.get_user_by_id.return_value = mock_user

        with patch("app.services.auth.SupabaseService") as mock_supabase:
            mock_supabase.client = mock_client

            role = await get_user_role("user-123")
            assert role is None

    @pytest.mark.asyncio
    async def test_returns_none_for_no_user(self):
        """Should return None when user is not found"""
        mock_client = MagicMock()
        mock_client.auth.admin.get_user_by_id.return_value = None

        with patch("app.services.auth.SupabaseService") as mock_supabase:
            mock_supabase.client = mock_client

            role = await get_user_role("nonexistent-user")
            assert role is None

    @pytest.mark.asyncio
    async def test_returns_none_on_exception(self):
        """Should return None when exception occurs"""
        mock_client = MagicMock()
        mock_client.auth.admin.get_user_by_id.side_effect = Exception("Error")

        with patch("app.services.auth.SupabaseService") as mock_supabase:
            mock_supabase.client = mock_client

            role = await get_user_role("user-123")
            assert role is None

    @pytest.mark.asyncio
    async def test_no_supabase_client(self):
        """Should return None when Supabase client is unavailable"""
        with patch("app.services.auth.SupabaseService") as mock_supabase:
            mock_supabase.client = None
            mock_supabase.connect.return_value = None

            role = await get_user_role("user-123")
            assert role is None


class TestRequireAdmin:
    """Tests for require_admin dependency"""

    @pytest.mark.asyncio
    async def test_allows_admin_user(self):
        """Should allow admin users"""
        with patch("app.services.auth.get_user_role", return_value="admin"):
            user_id = await require_admin(user_id="admin-user-123")
            assert user_id == "admin-user-123"

    @pytest.mark.asyncio
    async def test_allows_super_admin_user(self):
        """Should allow super_admin users"""
        with patch("app.services.auth.get_user_role", return_value="super_admin"):
            user_id = await require_admin(user_id="super-admin-123")
            assert user_id == "super-admin-123"

    @pytest.mark.asyncio
    async def test_rejects_regular_user(self):
        """Should reject regular users with 403"""
        with patch("app.services.auth.get_user_role", return_value="investor"):
            with pytest.raises(HTTPException) as exc_info:
                await require_admin(user_id="regular-user-123")
            assert exc_info.value.status_code == 403
            assert "Admin access required" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_rejects_user_with_no_role(self):
        """Should reject users with no role"""
        with patch("app.services.auth.get_user_role", return_value=None):
            with pytest.raises(HTTPException) as exc_info:
                await require_admin(user_id="no-role-user-123")
            assert exc_info.value.status_code == 403


class TestIsAdminRole:
    """Tests for is_admin_role helper"""

    def test_admin_role_is_admin(self):
        """Should return True for admin role"""
        assert is_admin_role("admin") is True

    def test_super_admin_role_is_admin(self):
        """Should return True for super_admin role"""
        assert is_admin_role("super_admin") is True

    def test_investor_role_is_not_admin(self):
        """Should return False for investor role"""
        assert is_admin_role("investor") is False

    def test_office_role_is_not_admin(self):
        """Should return False for office role"""
        assert is_admin_role("office") is False

    def test_none_role_is_not_admin(self):
        """Should return False for None role"""
        assert is_admin_role(None) is False

    def test_empty_string_is_not_admin(self):
        """Should return False for empty string role"""
        assert is_admin_role("") is False

    def test_unknown_role_is_not_admin(self):
        """Should return False for unknown roles"""
        assert is_admin_role("unknown") is False
