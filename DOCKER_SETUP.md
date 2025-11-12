# Docker Setup Guide - MongoDB 8 (Optional)

**Note:** MongoDB is now optional. The backend uses Supabase as the primary data source with in-memory caching.

## 🚀 Quick Start with Docker

### Option 1: Full Stack (Frontend + Backend + MongoDB)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

**Services:**
- **MongoDB 8**: http://localhost:27017
- **Backend API**: http://localhost:8000
- **Frontend**: Run separately with `npm run dev`

### Option 2: MongoDB Only

```bash
# Start just MongoDB
docker-compose up -d mongodb

# Run backend locally (for development)
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

---

## 📊 Caching Architecture

### Multi-Tier Caching Strategy

```
Request → In-Memory Cache (L1) → MongoDB Cache (L2) → Stripe API
            ↓ Hit (< 1ms)           ↓ Hit (< 10ms)      ↓ Miss (100ms+)
           Return                  Return              Compute & Store
```

**Performance:**
- **L1 (In-Memory)**: < 1ms - Fastest, cleared on restart
- **L2 (MongoDB)**: < 10ms - Persistent, survives restarts
- **L3 (Stripe API)**: 100-500ms - Called only on cache miss

**Benefits:**
1. ⚡ **Fast**: In-memory cache serves most requests instantly
2. 💾 **Persistent**: MongoDB preserves data across restarts
3. 📊 **Historical**: MongoDB stores all historical metrics
4. 🔄 **Auto-refresh**: Configurable TTL (default 5 minutes)

---

## 🔧 Configuration

### Environment Variables

Update `backend/.env`:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# MongoDB (for Docker)
MONGODB_URL=mongodb://admin:eqho_secure_password_change_me@localhost:27017/eqho_metrics?authSource=admin
MONGODB_DATABASE=eqho_metrics

# Cache TTL (seconds)
CACHE_TTL=300  # 5 minutes
```

### MongoDB Credentials

Default credentials (change in production):
- **Username**: `admin`
- **Password**: `eqho_secure_password_change_me`
- **Database**: `eqho_metrics`

---

## 📡 API Endpoints

### Metrics (with Caching)

```bash
# Get TowPilot metrics (cached)
GET /api/v1/metrics/towpilot

# Get all products metrics (cached)
GET /api/v1/metrics/all-products

# Get summary (cached)
GET /api/v1/metrics/summary
```

### Cache Management

```bash
# Refresh cache for specific product
POST /api/v1/cache/refresh/towpilot

# Clear all caches
POST /api/v1/cache/clear

# Get cache statistics
GET /api/v1/cache/stats
```

### Example: Refresh Cache

```bash
# Invalidate and refresh TowPilot metrics
curl -X POST http://localhost:8000/api/v1/cache/refresh/towpilot

# Clear all caches
curl -X POST http://localhost:8000/api/v1/cache/clear
```

---

## 🗄️ MongoDB Collections

### `metrics` Collection

Stores calculated metrics with timestamps:

```json
{
  "_id": "...",
  "product": "towpilot",
  "timestamp": "2025-11-12T12:00:00",
  "metrics": {
    "customer_metrics": {...},
    "revenue_metrics": {...},
    "cac_metrics": {...},
    "ltv_metrics": {...}
  }
}
```

**Indexes:**
- `timestamp` (desc) - For latest metrics
- `product + timestamp` (compound) - For product-specific queries

### `stripe_cache` Collection

Caches raw Stripe API responses:

```json
{
  "_id": "...",
  "cache_key": "customers:tow",
  "timestamp": "2025-11-12T12:00:00",
  "data": [...]
}
```

**Features:**
- TTL index (auto-delete after 1 hour)
- Reduces Stripe API calls

---

## 🔍 Monitoring

### Check Cache Stats

```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "status": "healthy",
  "cache_stats": {
    "memory_cache": {
      "entries": 2,
      "keys": ["metrics:towpilot", "metrics:all_products"]
    },
    "mongodb_enabled": true
  }
}
```

### View MongoDB Data

```bash
# Connect to MongoDB
docker exec -it eqho-mongodb mongosh -u admin -p eqho_secure_password_change_me

# Switch to database
use eqho_metrics

# View latest metrics
db.metrics.find().sort({timestamp: -1}).limit(5)

# View cache entries
db.stripe_cache.find()

# Count metrics by product
db.metrics.aggregate([
  {$group: {_id: "$product", count: {$sum: 1}}}
])
```

---

## 🎯 Cache Behavior

### When to Use Each Tier

| Scenario | Cache Tier | Response Time |
|----------|-----------|---------------|
| Repeat request (< 5 min) | In-Memory (L1) | < 1ms |
| After server restart | MongoDB (L2) | < 10ms |
| First request / expired | Stripe API | 100-500ms |
| Manual refresh | Stripe API | 100-500ms |

### Cache Invalidation

**Automatic:**
- TTL expires (default 5 minutes)
- Server restart (clears in-memory only)

**Manual:**
```bash
# Refresh specific product
POST /api/v1/cache/refresh/towpilot

# Clear everything
POST /api/v1/cache/clear
```

---

## 🚀 Performance Tips

### 1. Adjust Cache TTL

For faster-changing data:
```bash
# backend/.env
CACHE_TTL=60  # 1 minute
```

For slower-changing data:
```bash
CACHE_TTL=1800  # 30 minutes
```

### 2. Pre-warm Cache

```bash
# Warm up caches on deployment
curl http://localhost:8000/api/v1/metrics/towpilot
curl http://localhost:8000/api/v1/metrics/all-products
```

### 3. Monitor Cache Hit Rate

Check logs for cache hits/misses:
```bash
docker-compose logs backend | grep "cache hit\|cache miss"
```

---

## 🔐 Security

### Production Checklist

- [ ] Change MongoDB password in `docker-compose.yml`
- [ ] Use strong password (20+ characters)
- [ ] Enable MongoDB authentication
- [ ] Use SSL/TLS for MongoDB connections
- [ ] Limit MongoDB port exposure (remove from `ports:` in docker-compose)
- [ ] Set up MongoDB backup strategy
- [ ] Use environment-specific `.env` files

### MongoDB Security

```yaml
# docker-compose.yml (production)
mongodb:
  ports:
    - "127.0.0.1:27017:27017"  # Only localhost access
  environment:
    - MONGODB_INITDB_ROOT_USERNAME=admin
    - MONGODB_INITDB_ROOT_PASSWORD=${MONGODB_PASSWORD}  # From env var
```

---

## 🧪 Testing

### Test Cache Layers

```python
# Test in-memory cache
import pytest
from app.services.cache_service import InMemoryCache

@pytest.mark.asyncio
async def test_memory_cache():
    cache = InMemoryCache(default_ttl=60)
    
    await cache.set("test_key", {"value": 123})
    result = await cache.get("test_key")
    
    assert result == {"value": 123}
```

### Test MongoDB Connection

```bash
# backend/tests/test_mongodb.py
pytest tests/test_mongodb.py -v
```

---

## 📈 Monitoring & Alerting

### Key Metrics to Monitor

1. **Cache Hit Rate**: Should be > 80%
2. **MongoDB Response Time**: Should be < 10ms
3. **Stripe API Calls**: Should decrease with caching
4. **Memory Usage**: Monitor in-memory cache size

### Add Logging

```python
# app/main.py
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

---

## 🛠️ Troubleshooting

### MongoDB Won't Start

```bash
# Check logs
docker-compose logs mongodb

# Common issues:
# 1. Port 27017 already in use
lsof -i :27017

# 2. Permissions issues with volumes
docker-compose down -v
docker-compose up -d
```

### Cache Not Working

```bash
# Check cache stats
curl http://localhost:8000/api/v1/cache/stats

# Check MongoDB connection
docker exec -it eqho-mongodb mongosh -u admin -p eqho_secure_password_change_me
```

### Slow API Responses

```bash
# Check if MongoDB is running
docker ps | grep mongodb

# Check cache hit rate
curl http://localhost:8000/health

# If low hit rate, increase TTL
# Edit backend/.env
CACHE_TTL=600  # 10 minutes
```

---

## 📚 Additional Resources

- [MongoDB 8 Documentation](https://www.mongodb.com/docs/v8.0/)
- [Motor (Async MongoDB Driver)](https://motor.readthedocs.io/)
- [FastAPI Background Tasks](https://fastapi.tiangolo.com/tutorial/background-tasks/)
- [Docker Compose Reference](https://docs.docker.com/compose/)

---

## 🎯 Summary

✅ **MongoDB 8** for persistent caching and historical data  
✅ **In-Memory cache** for ultra-fast reads  
✅ **Multi-tier architecture** for best performance  
✅ **Auto TTL expiration** for fresh data  
✅ **Manual cache refresh** endpoints  
✅ **Production-ready** with Docker support

**Next Steps:**
1. Start services: `docker-compose up -d`
2. Update `backend/.env` with Stripe keys
3. Test API: `curl http://localhost:8000/api/v1/metrics/towpilot`
4. Monitor cache: `curl http://localhost:8000/api/v1/cache/stats`

