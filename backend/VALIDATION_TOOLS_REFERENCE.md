# Validation Tools - Quick Reference Card

## Quick Commands

```bash
cd backend

# Daily workflow
make test-setup     # Verify environment (1 time)
make diagnose       # Identify issues
make validate       # Quick check (3 seconds)

# Deep investigation
make validate-tui   # Interactive dashboard

# Backend control
make dev            # Start backend
make clean          # Cleanup
```

## Current Data Status

| Metric | Backend (API) | SAAS KPIs (File) | Stripe Dashboard |
|--------|---------------|------------------|------------------|
| MRR | $145,257 | $47,913 | $69,593 |
| Customers | 111 | 74 | ~145 |
| Scope | All products | TowPilot only | All products |
| Source | Stripe API | Nov 11 snapshot | Stripe UI |

## Tool Output Examples

### make diagnose
```
✓ Supabase: Connected
  Tables empty (0 records)

✓ Stripe API: 145 subscriptions
  Total MRR: $145,257
  TowPilot tags: 0 found

Diagnosis: Backend using Stripe directly (working)
```

### make validate
```
┏━━━━━━━━┳━━━━━━━━━┳━━━━━━━━┳━━━━━━━━┓
┃ Metric ┃ Backend ┃ KPIs   ┃ Status ┃
┣━━━━━━━━╋━━━━━━━━━╋━━━━━━━━╋━━━━━━━━┫
│ MRR    │ $145K   │ $47K   │ ⚠️      │
│ Note   │ All     │ TowPilot only   │
└────────┴─────────┴────────┴────────┘

⚠️  Expected difference (different scopes)
```

### make test-setup
```
✓ Python 3.12
✓ Dependencies installed
✓ Environment configured
✓ Backend API healthy

7/7 checks passed
```

## Interpreting Results

### ✓ Match
Numbers within 1% = data sources in sync

### ✗ Mismatch  
Check reason:
- Different scopes? (All vs TowPilot)
- Time drift? (Real-time vs snapshot)
- Stale cache? (Clear with /api/v1/cache/clear)

### ⚠️ Expected
Known difference (documented behavior)

## Troubleshooting One-Liners

```bash
# Backend not responding?
pkill uvicorn && make dev

# Dependencies missing?
./setup_validator.sh

# Strange numbers?
make diagnose

# Want detailed logs?
tail -f /tmp/eqho-backend.log

# Clear backend cache?
curl -X POST http://localhost:8000/api/v1/cache/clear
```

## File Locations

```
backend/
├── diagnose_data.py          # Data diagnostic
├── quick_validate.py         # CLI validator
├── data_validator.py         # TUI validator
├── test_validation_setup.py  # Setup checker
├── Makefile                  # All commands
└── VALIDATOR_README.md       # Full docs
```

## Expected Behavior (Nov 2025)

Backend returns **all products** ($145K MRR) because:
- Stripe customers don't have 'tow' tags
- Can't filter for TowPilot only
- Returns comprehensive view instead

This is **documented and expected** - not a bug.

## Integration Examples

### Pre-Deployment Check
```bash
#!/bin/bash
cd backend
make test-setup || exit 1
make validate || exit 1
echo "Ready to deploy"
```

### Daily Monitoring
```bash
#!/bin/bash
cd backend
make validate > /tmp/metrics-$(date +%F).log
# Email if new mismatches detected
```

### Investigation Workflow
```bash
# 1. Quick check
make validate

# 2. Deep dive
make diagnose

# 3. Interactive exploration
make validate-tui

# 4. Check backend logs
tail -50 /tmp/eqho-backend.log
```

## Support

- **Documentation:** `backend/VALIDATOR_README.md`
- **Numbers:** `backend/NUMBERS_EXPLAINED.md`
- **Filtering:** `backend/FILTERING_ANALYSIS.md`
- **Fix Details:** `backend/BACKEND_METRICS_FIXED.md`

