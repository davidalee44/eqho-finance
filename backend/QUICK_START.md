# Quick Start - Data Validator

## TL;DR

```bash
# Setup (one time)
cd backend
./setup_validator.sh

# Run validation
make validate          # Quick CLI
make validate-tui      # Interactive TUI
```

## What This Does

Validates financial metrics from your backend API against cached SAAS KPI data to catch discrepancies.

## Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `make test-setup` | Check if setup is correct | First run or after changes |
| `make diagnose` | Deep data source analysis | Investigating discrepancies |
| `make validate` | Quick CLI validation | Daily checks, CI/CD |
| `make validate-tui` | Interactive dashboard | Debugging, exploration |

## Reading the Output

### Quick Validator

```
✓ = Match (difference < 1%)
✗ = Mismatch (needs investigation)
```

### Status Indicators

- 🟢 Backend Connected
- 🟡 Backend responding with errors
- 🔴 Cannot connect to backend

## Troubleshooting

### "Cannot connect to backend"

Start the backend:
```bash
cd backend
uvicorn app.main:app --reload
```

### "Dependencies missing"

Re-run setup:
```bash
./setup_validator.sh
```

### "All metrics show zero"

Sync Stripe data to Supabase:
```bash
cd ../scripts
node sync_stripe_to_supabase.js
```

## Full Documentation

See `VALIDATOR_README.md` for complete details.

