# Eqho Due Diligence - FastAPI Backend

Backend API for calculating investor metrics from Supabase (synced Stripe data).

## 🚀 Quick Start

### Using uv (Recommended)

```bash
cd backend

# Create virtual environment
uv venv

# Activate virtual environment
source .venv/bin/activate  # On macOS/Linux
# or
.venv\Scripts\activate  # On Windows

# Install dependencies
uv pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your Stripe API keys

# Run the server
uvicorn app.main:app --reload --port 8000
```

### Using pip

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up .env and run
uvicorn app.main:app --reload --port 8000
```

## 📋 API Endpoints

### Health Check
- `GET /` - API info
- `GET /health` - Health check

### Metrics Endpoints
- `GET /api/v1/metrics/towpilot` - TowPilot-specific metrics
- `GET /api/v1/metrics/all-products` - All products metrics
- `GET /api/v1/metrics/summary` - High-level summary

### Stripe Data Endpoints
- `GET /api/v1/stripe/customers?tag=tow` - Fetch customers (filtered by tag)
- `GET /api/v1/stripe/subscriptions` - Active subscriptions
- `GET /api/v1/stripe/revenue-trend?months=12` - Revenue trend
- `GET /api/v1/stripe/churn?months=3` - Churn metrics

## 📊 Calculated Metrics

### TowPilot Metrics
- Customer counts (TowPilot vs. others)
- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)
- ACV (Average Contract Value)
- CAC (Customer Acquisition Cost) breakdown
- LTV (Lifetime Value)
- LTV/CAC ratio
- CAC payback period
- Gross margin
- Revenue trends

### Response Example

```json
{
  "timestamp": "2025-11-12T12:00:00",
  "customer_metrics": {
    "total_customers": 150,
    "towpilot_customers": 26,
    "other_customers": 124
  },
  "revenue_metrics": {
    "mrr": 89000,
    "arr": 1068000,
    "acv": 8027
  },
  "cac_metrics": {
    "total_cac": 831,
    "sales_cost": 450,
    "marketing_cost": 381
  },
  "ltv_metrics": {
    "average_ltv": 14100,
    "ltv_cac_ratio": 17.0,
    "cac_payback_months": 1.8
  }
}
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
# Stripe (for direct API calls if needed)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Supabase (primary data source)
SUPABASE_URL=https://yindsqbhygvskolbccqq.supabase.co
SUPABASE_ANON_KEY=your_anon_key

# Configuration
TOWPILOT_TAG=tow
CACHE_TTL=300
```

### CORS Configuration

The API is configured to accept requests from:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (Alternative port)

Update `app/core/config.py` to add production URLs.

## 📁 Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app entry point
│   ├── core/
│   │   └── config.py        # Configuration and settings
│   ├── api/
│   │   └── v1/
│   │       ├── metrics.py   # Metrics endpoints
│   │       └── stripe_data.py  # Stripe data endpoints
│   ├── models/
│   │   └── metrics.py       # Pydantic models
│   ├── services/
│   │   ├── stripe_service.py      # Stripe API integration
│   │   └── metrics_calculator.py  # Metrics calculation logic
│   └── schemas/             # Request/response schemas
├── tests/                   # Unit tests
├── .env.example            # Environment template
├── .env                    # Your environment variables (not committed)
├── requirements.txt        # Python dependencies
└── README.md              # This file
```

## 🧪 Testing

```bash
# Run tests (once implemented)
pytest tests/

# With coverage
pytest --cov=app tests/
```

## 🔐 Security

- Never commit `.env` files
- Use environment variables for all sensitive data
- Stripe secret keys should be `sk_test_` for development
- Use `sk_live_` only in production with proper security

## 🚢 Deployment

### Docker (Recommended)

```bash
# Build image
docker build -t eqho-backend .

# Run container
docker run -p 8000:8000 --env-file .env eqho-backend
```

### Railway / Render / Heroku

1. Set environment variables in the platform
2. Use `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Deploy from git repository

## 📚 API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔗 Integration with Frontend

Update your React app to call the backend:

```javascript
// src/services/api.js
const API_BASE_URL = 'http://localhost:8000/api/v1';

export async function getTowPilotMetrics() {
  const response = await fetch(`${API_BASE_URL}/metrics/towpilot`);
  return response.json();
}
```

## 📝 Notes

### TowPilot Customer Tagging

Customers must be tagged in Stripe metadata:
```json
{
  "metadata": {
    "tags": "tow"
  }
}
```

### Calculation Logic

- **MRR**: Sum of all subscription amounts normalized to monthly
- **ARR**: MRR × 12
- **ACV**: Average annual contract value across all subscriptions
- **LTV/CAC**: Using provided LTV of $14,100 and calculated CAC
- **CAC Payback**: CAC / (ACV × Gross Margin / 12)

## 🤝 Contributing

See main `CONTRIBUTING.md` in the root directory.

## 📄 License

Proprietary - Eqho, Inc. © 2025

