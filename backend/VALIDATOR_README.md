# Financial Data Validator

Terminal-based tools for validating Eqho financial metrics against multiple data sources.

## Overview

This validator connects to the FastAPI backend and compares metrics against stored analysis files to ensure data consistency across the stack.

## Tools

### 1. Quick Validator (CLI)

Fast command-line validation with rich output.

```bash
python quick_validate.py
```

**Features:**
- ✓ Backend health check
- ✓ Fetch live metrics from API
- ✓ Compare against SAAS KPIs file
- ✓ Rich formatted tables
- ✓ Pass/fail status for each metric

**Use when:** You need a quick sanity check or want to run validation in CI/CD.

### 2. Data Validator (TUI)

Interactive terminal UI built with Textual.

```bash
python data_validator.py
```

**Features:**
- ✓ Live metric dashboard
- ✓ Multi-tab interface (Backend, Comparison, Stripe)
- ✓ Real-time API status indicator
- ✓ Operation logs
- ✓ Interactive buttons for data refresh
- ✓ Color-coded match/mismatch indicators

**Use when:** You need to explore data interactively or debug discrepancies.

**Keyboard Shortcuts:**
- `r` - Refresh all data
- `c` - Clear logs
- `q` - Quit

## Setup

### Using uv (Recommended)

```bash
# Create virtual environment
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies with uv
uv pip install -r requirements.txt
uv pip install -r validator_requirements.txt
```

### Using pip

```bash
cd backend
python -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt -r validator_requirements.txt
```

## Prerequisites

### 1. Backend API Running

Start the FastAPI backend:

```bash
cd backend
uvicorn app.main:app --reload
```

The API should be accessible at `http://localhost:8000`.

### 2. Environment Variables

Create `.env` file in backend directory:

```bash
# Backend API
API_BASE_URL=http://localhost:8000

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_key
```

### 3. SAAS KPIs File

Ensure the SAAS KPIs analysis file exists:

```
stripe-analysis/saas_kpis.json
```

## Validation Metrics

The validator compares these key metrics:

| Metric | Description | Source |
|--------|-------------|--------|
| **MRR** | Monthly Recurring Revenue | Supabase subscriptions |
| **ARR** | Annual Recurring Revenue (MRR × 12) | Calculated |
| **Customers** | Active customer count | Supabase unique users |
| **ARPU** | Average Revenue Per User | MRR / Customers |
| **LTV** | Customer Lifetime Value | ARPU × avg lifetime |
| **CAC** | Customer Acquisition Cost | Sales + Marketing spend |
| **Retention** | Customer retention rate | Active / Total customers |

## How It Works

### Data Flow (Updated)

```
┌─────────────────┐
│  Stripe API     │◄──── Primary source (145 subscriptions, $145K MRR)
└────────┬────────┘
         │
         │ Direct API calls (no sync needed)
         ▼
┌─────────────────────┐
│  FastAPI Backend    │  Uses StripeService directly
│  metrics_calculator │  Bypasses empty Supabase tables
└────────┬────────────┘
         │
         │ HTTP
         ▼
┌──────────────────┐      ┌─────────────────┐
│  Validator CLI   │◄─────┤  saas_kpis.json │  TowPilot only ($47K MRR)
└──────────────────┘      └─────────────────┘
         │
         ▼
  Comparison Report
  (expects discrepancy)
```

**Important:** Backend returns **all products** ($145K) while `saas_kpis.json` contains **TowPilot only** ($47K). This is expected since Stripe customer tags aren't populated.

### Validation Logic

1. **Health Check**: Verifies backend API is responding
2. **Data Fetch**: Retrieves metrics from `/api/v1/metrics/summary`
3. **File Load**: Reads cached metrics from `saas_kpis.json`
4. **Comparison**: Calculates differences and percentage deltas
5. **Threshold Check**: Flags discrepancies > 1% as mismatches
6. **Report**: Displays results with pass/fail indicators

## Example Output

### Quick Validator

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  🔍 Eqho Financial Data Validator      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

✓ Backend API is healthy
✓ Fetched backend metrics
✓ Loaded SAAS KPIs

        📊 Metric Validation Results
┏━━━━━━━━━━━━┳━━━━━━━━━━━━┳━━━━━━━━━━┳━━━━━━━━━━┳━━━━━━━━┓
┃ Metric     ┃ Backend API┃ SAAS KPIs┃ Δ Diff   ┃ Status ┃
┡━━━━━━━━━━━━╇━━━━━━━━━━━━╇━━━━━━━━━━╇━━━━━━━━━━╇━━━━━━━━┩
│ MRR        │    $47,913 │  $47,913 │ $0       │   ✓    │
│ ARR        │   $574,956 │ $574,956 │ $0       │   ✓    │
│ Customers  │         74 │       74 │ 0        │   ✓    │
│ ARPU       │       $647 │     $647 │ $0       │   ✓    │
└────────────┴────────────┴──────────┴──────────┴────────┘

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ✅ All metrics validated successfully!┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### Data Validator (TUI)

Interactive interface with:
- Real-time status indicators
- Tabbed navigation
- Metric cards with color coding
- Operation log viewer
- Refresh controls

## Troubleshooting

### Backend Connection Error

```
❌ Cannot connect to backend API
```

**Solution:**
1. Verify backend is running: `ps aux | grep uvicorn`
2. Check the URL in `.env` matches your backend
3. Test manually: `curl http://localhost:8000/health`

### Missing SAAS KPIs File

```
❌ Failed to load SAAS KPIs: File not found
```

**Solution:**
1. Run the Stripe analysis script to generate it:
   ```bash
   cd stripe-analysis
   python saas_kpis.py
   ```

### Metric Discrepancies

```
⚠️  Some metrics have discrepancies
```

**Expected Discrepancies (Nov 2025):**
- Backend MRR: ~$145K (all products, 111 customers)
- SAAS KPIs: ~$47K (TowPilot only, 74 customers)
- Difference: ~200% (expected since different product scopes)

**Causes:**
- Product filtering: Backend returns all products, SAAS KPIs is TowPilot-filtered
- Customer tags not set in Stripe (no 'tow' tag in metadata)
- Stale cached data (clear cache with `/api/v1/cache/clear`)
- Recent subscription changes not yet processed
- Different calculation windows

**Investigation:**
1. Check backend logs for calculation errors
2. Run diagnostic: `python diagnose_data.py`
3. Compare timestamps in both data sources
4. Verify customer tags in Stripe: `/api/v1/stripe/customers?tag=tow`

## Integration with CI/CD

Run validation in automated tests:

```bash
#!/bin/bash
# test-metrics.sh

# Start backend in background
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait for backend to be ready
sleep 5

# Run validation
python quick_validate.py

# Capture exit code
RESULT=$?

# Cleanup
kill $BACKEND_PID

exit $RESULT
```

## Development

### Adding New Metrics

1. **Backend**: Add endpoint in `app/api/v1/metrics.py`
2. **Calculator**: Update `MetricsCalculator` if needed
3. **Validator**: Add comparison in `compare_metrics()`
4. **TUI**: Add metric card in `compose()` method

### Extending Comparisons

To add new data sources:

1. Create loader function (e.g., `load_quickbooks_data()`)
2. Add comparison method
3. Create new tab in TUI if interactive exploration needed
4. Update CLI to include in comparison table

## Security Notes

- ❌ Never commit `.env` file with real credentials
- ✓ Use read-only API keys when possible
- ✓ Rotate keys regularly (especially if shared)
- ✓ Validate input from external APIs
- ✓ Log errors without exposing sensitive data

## Performance

- Quick validator completes in ~2-3 seconds
- TUI is responsive with async operations
- Backend API calls cached (default 5 minutes)
- File loads are cached in memory

## Support

For issues or questions:
1. Check backend logs: `docker-compose logs backend`
2. Review this README
3. Check project docs: `PROJECT_RULES.md`
4. Contact the development team

