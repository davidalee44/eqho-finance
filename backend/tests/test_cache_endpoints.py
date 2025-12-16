"""
Tests for cache API endpoints
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestCacheEndpoints:
    """Tests for /api/v1/cache endpoints"""

    def test_refresh_cache_towpilot(self):
        """Test refreshing cache for towpilot product"""
        response = client.post("/api/v1/cache/refresh/towpilot")
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Cache refreshed for towpilot"
        assert data["product"] == "towpilot"

    def test_refresh_cache_all_products(self):
        """Test refreshing cache for all_products"""
        response = client.post("/api/v1/cache/refresh/all_products")
        
        assert response.status_code == 200
        data = response.json()
        assert data["product"] == "all_products"

    def test_clear_all_cache(self):
        """Test clearing all caches"""
        response = client.post("/api/v1/cache/clear")
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "All caches cleared"

    def test_get_cache_stats(self):
        """Test getting cache statistics"""
        response = client.get("/api/v1/cache/stats")
        
        assert response.status_code == 200
        data = response.json()
        assert "memory_cache" in data
        assert "backend" in data
        assert data["backend"] == "supabase"

    def test_cache_stats_structure(self):
        """Test cache stats response structure"""
        response = client.get("/api/v1/cache/stats")
        
        data = response.json()
        memory_cache = data["memory_cache"]
        assert "entries" in memory_cache
        assert "keys" in memory_cache
        assert isinstance(memory_cache["entries"], int)
        assert isinstance(memory_cache["keys"], list)

    def test_refresh_and_stats_workflow(self):
        """Test typical cache workflow: refresh then check stats"""
        # First clear all
        clear_response = client.post("/api/v1/cache/clear")
        assert clear_response.status_code == 200
        
        # Check stats after clear
        stats_response = client.get("/api/v1/cache/stats")
        stats = stats_response.json()
        assert stats["memory_cache"]["entries"] == 0

    def test_refresh_custom_product(self):
        """Test refreshing cache for a custom product name"""
        response = client.post("/api/v1/cache/refresh/custom_product_123")
        
        assert response.status_code == 200
        data = response.json()
        assert data["product"] == "custom_product_123"
