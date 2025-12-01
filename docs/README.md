# Eqho Due Diligence Documentation

Technical documentation for the Eqho investor deck platform.

## Documentation Index

| Document | Description |
|----------|-------------|
| [Architecture](./architecture.md) | System architecture, version control, data flow |
| [Setup](./setup.md) | Development environment setup, dependencies |
| [Deployment](./deployment.md) | Deployment guides for Vercel, Railway, Docker |
| [Stripe Integration](./stripe.md) | Stripe API integration, metrics calculation |
| [API Reference](./api-reference.md) | Backend API endpoints and usage |

## Quick Links

- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI + Supabase + Stripe
- **Live App**: https://financis.eqho.ai
- **API Docs**: https://api.eqho.ai/docs

## Key Configuration Files

| File | Purpose |
|------|---------|
| `src/lib/featureFlags.js` | Feature flag definitions and defaults |
| `src/lib/investmentConstants.js` | Investment metrics single source of truth |
| `backend/app/core/config.py` | Backend configuration and environment variables |

## Development Commands

```bash
# Full stack development
make dev

# Frontend only
npm run dev

# Backend only
cd backend && uvicorn app.main:app --reload --port 8000

# Run tests
npm test
make lint-py
```

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React SPA     │────▶│   FastAPI       │────▶│   Supabase      │
│   (Vite)        │     │   Backend       │     │   PostgreSQL    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │                       ▼
        │               ┌─────────────────┐
        │               │   Stripe API    │
        │               │   (Metrics)     │
        │               └─────────────────┘
        │
        ▼
┌─────────────────┐
│ Vercel Edge     │
│ Config (Flags)  │
└─────────────────┘
```

## Feature Flags

The app uses Vercel Edge Config for feature flags. Admin users get automatic overrides for certain flags.

| Flag | Default | Admin Override | Description |
|------|---------|----------------|-------------|
| `show_admin_controls` | false | true | Layout editing controls |
| `show_sidebar` | false | true | Sidebar navigation |
| `quick_investor_view` | false | - | Curated 5-slide subset |
| `maintenance_mode` | false | - | Maintenance banner |

See [featureFlags.js](../src/lib/featureFlags.js) for complete list.

