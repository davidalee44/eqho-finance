"""
Tests for admin API endpoints
"""

from datetime import datetime

from fastapi.testclient import TestClient

from app.api.v1.admin import UserProfile, UsersListResponse
from app.main import app

client = TestClient(app)


class TestUserProfile:
    """Tests for UserProfile model"""

    def test_valid_user_profile(self):
        """Test creating valid user profile"""
        profile = UserProfile(
            id="user-123",
            email="test@example.com",
            full_name="Test User",
            company="Test Company",
            role="investor",
            app_access=["investor-deck"],
            created_at=datetime.now(),
        )
        assert profile.id == "user-123"
        assert profile.email == "test@example.com"
        assert profile.role == "investor"

    def test_user_profile_minimal(self):
        """Test user profile with minimal required fields"""
        profile = UserProfile(
            id="user-456",
            email="minimal@example.com",
            role="investor",
        )
        assert profile.id == "user-456"
        assert profile.full_name is None
        assert profile.company is None
        assert profile.app_access is None

    def test_user_profile_with_admin_role(self):
        """Test user profile with admin role"""
        profile = UserProfile(
            id="admin-123",
            email="admin@example.com",
            role="admin",
        )
        assert profile.role == "admin"

    def test_user_profile_with_super_admin_role(self):
        """Test user profile with super_admin role"""
        profile = UserProfile(
            id="super-admin-123",
            email="superadmin@example.com",
            role="super_admin",
        )
        assert profile.role == "super_admin"


class TestUsersListResponse:
    """Tests for UsersListResponse model"""

    def test_empty_users_list(self):
        """Test response with empty users list"""
        response = UsersListResponse(users=[], total=0)
        assert response.users == []
        assert response.total == 0

    def test_users_list_with_data(self):
        """Test response with user data"""
        users = [
            UserProfile(id="1", email="user1@example.com", role="investor"),
            UserProfile(id="2", email="user2@example.com", role="sales"),
        ]
        response = UsersListResponse(users=users, total=2)
        assert len(response.users) == 2
        assert response.total == 2


class TestAdminEndpoints:
    """Tests for /api/v1/admin endpoints"""

    def test_list_users_unauthenticated(self):
        """Test that listing users requires authentication"""
        response = client.get("/api/v1/admin/users")
        
        # Should fail without auth header
        assert response.status_code in [401, 403]

    def test_list_users_with_invalid_token(self):
        """Test that listing users rejects invalid tokens"""
        response = client.get(
            "/api/v1/admin/users",
            headers={"Authorization": "Bearer invalid-token"}
        )
        
        # Should fail with invalid token
        assert response.status_code in [401, 403]

    def test_get_user_unauthenticated(self):
        """Test that getting a user requires authentication"""
        response = client.get("/api/v1/admin/users/user-123")
        
        assert response.status_code in [401, 403]

    def test_get_user_with_invalid_token(self):
        """Test that getting a user rejects invalid tokens"""
        response = client.get(
            "/api/v1/admin/users/user-123",
            headers={"Authorization": "Bearer invalid-token"}
        )
        
        assert response.status_code in [401, 403]


class TestAdminEndpointModels:
    """Tests for admin endpoint model validation"""

    def test_user_profile_serialization(self):
        """Test UserProfile can be serialized to dict"""
        profile = UserProfile(
            id="user-789",
            email="serialize@example.com",
            full_name="Serialize Test",
            company="Test Corp",
            role="investor",
            app_access=["investor-deck", "dashboard"],
            created_at=datetime(2025, 1, 1, 12, 0, 0),
        )
        data = profile.model_dump()
        
        assert data["id"] == "user-789"
        assert data["email"] == "serialize@example.com"
        assert data["full_name"] == "Serialize Test"
        assert len(data["app_access"]) == 2

    def test_users_list_response_serialization(self):
        """Test UsersListResponse can be serialized"""
        users = [
            UserProfile(id="1", email="a@test.com", role="investor"),
            UserProfile(id="2", email="b@test.com", role="sales"),
            UserProfile(id="3", email="c@test.com", role="admin"),
        ]
        response = UsersListResponse(users=users, total=3)
        data = response.model_dump()
        
        assert data["total"] == 3
        assert len(data["users"]) == 3
        assert data["users"][0]["email"] == "a@test.com"
