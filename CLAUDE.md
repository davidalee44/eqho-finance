# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Interactive investor deck for Eqho's $500K seed funding round. Presents TowPilot product metrics, financial analysis, and investment terms through a React-based dashboard with presentation carousel mode.

## Development Commands

### Frontend
```bash
npm install              # Install dependencies
npm run dev             # Start Vite dev server (http://localhost:5173)
npm run build           # Production build to dist/
npm run preview         # Preview production build
npm run lint            # Run ESLint
```

### Backend (FastAPI)
```bash
cd backend
uv venv                              # Create virtual environment
source .venv/bin/activate            # Activate venv
uv pip install -r requirements.txt   # Install dependencies
uvicorn app.main:app --reload --port 8000  # Start dev server
```

### Makefile (Recommended)
```bash
make setup              # Complete project setup (frontend + backend)
make dev                # Run both frontend and backend in parallel
make dev-frontend       # Frontend only
make dev-backend        # Backend only
make build             # Build for production
make test              # Run all tests
make clean             # Clean build artifacts
```

## Architecture

### Frontend Structure (`src/`)

**Main Components:**
- `App.jsx` - Financial model slide with interactive projections calculator
- `FinancialReport.jsx` - Multi-slide report with carousel presentation mode
- `AppRouter.jsx` - Route management and auth-based navigation
- `PixelRocketHero.jsx` - Landing page component

**Presentation System:**
- `ReportCarousel.jsx` - Swipeable slide navigation with touch/keyboard support
- `ReportSlide.jsx` - Individual slide wrapper with animations
- `SlideThumbnails.jsx` - Slide preview navigation
- `components/slides/*` - Individual slide components (ExecutiveSummary, SpendingBreakdown, CashFlowForecast, etc.)

**Core Services:**
- `services/layoutService.js` - Dashboard card layout persistence (admin only)
- `services/auditService.js` - Action logging with batched writes and sync/async flush
- `lib/supabase.js` - Supabase client, auth helpers, RLS-aware queries

**State Management:**
- `contexts/AuthContext.jsx` - User authentication, role management, admin checks
- `hooks/useDraggableCards.js` - Drag-and-drop card positioning

**Data Features:**
- Version control system with snapshot creation/restore
- Real-time Stripe data integration for metrics
- Financial model calculator with localStorage persistence
- Export functionality (screenshots, Excel, CSV)

### Backend Structure (`backend/app/`)

**API Endpoints (`api/v1/`):**
- `metrics.py` - Business metrics calculations (CAC, LTV, MRR, churn)
- `stripe_data.py` - Stripe API integration for customer/revenue data
- `cache.py` - Cache management with TTL and invalidation
- `snapshots.py` - Report version control (create, restore, list, delete)
- `layouts.py` - Dashboard layout persistence (admin only)
- `audit.py` - Action logging with pagination and CSV export
- `emails.py` - Email sending via Resend API

**Services (`services/`):**
- `stripe_service.py` - Stripe API wrapper, TowPilot customer filtering
- `metrics_calculator.py` - SaaS metrics calculations
- `cache_service.py` - In-memory cache with stats
- `supabase_service.py` - Supabase connection and queries
- `snapshot_service.py` - Snapshot CRUD with RLS
- `auth.py` - JWT validation and role-based access control

**Configuration:**
- `core/config.py` - Pydantic settings for environment variables
- RLS enforced on all Supabase queries with user_id filtering

### Database (Supabase PostgreSQL)

Key tables with Row Level Security:
- `snapshots` - Report versions with metadata, screenshot URLs
- `layouts` - Dashboard card configurations
- `audit_logs` - User action tracking
- `profiles` - User roles and metadata

### Authentication Flow

1. Supabase Auth provides JWT tokens
2. Frontend stores tokens in session
3. Backend validates JWT and extracts user_id from claims
4. RLS policies enforce data isolation per user
5. Admin role checked via `profiles.role` column

### Key Design Patterns

**Audit Logging:**
- Batched writes every 5 seconds to reduce API calls
- Synchronous flush on page unload (XMLHttpRequest fallback)
- Keepalive flag for async flush during visibility changes
- Cached auth headers to avoid async lookups in sync contexts

**Layout Management:**
- Admin-only write access via RLS
- All users read from shared layout
- Debounced saves during drag operations (500ms)
- Audit log entry on layout changes

**Cache Strategy:**
- 5-minute TTL for Stripe data
- Manual invalidation endpoints
- Health check exposes cache stats

**Snapshot System:**
- Screenshot generation via html2canvas
- Metadata includes filters, parameters, user context
- Restore applies snapshot data to current state
- List view shows thumbnails and timestamps

## Environment Variables

### Frontend (`.env.local`)
```bash
VITE_API_URL=http://localhost:8000        # Backend API
VITE_SUPABASE_URL=                        # Required
VITE_SUPABASE_ANON_KEY=                   # Required
```

### Backend (`backend/.env`)
```bash
SUPABASE_URL=                             # Required
SUPABASE_ANON_KEY=                        # Required
STRIPE_SECRET_KEY=                        # Required for metrics
STRIPE_PUBLISHABLE_KEY=
RESEND_API_KEY=                           # For email sending
CORS_ORIGINS=["http://localhost:5173"]   # Frontend URLs
CACHE_TTL=300                             # 5 minutes
```

## Important Code Patterns

### Supabase Query with RLS
```python
# Always check client exists
if not SupabaseService.client:
    SupabaseService.connect()

# RLS automatically filters by user_id from JWT
response = (
    SupabaseService.client
    .table("snapshots")
    .select("*")
    .eq("user_id", user_id)  # Still explicit for clarity
    .execute()
)
```

### Auth-Protected API Calls
```javascript
// layoutService.js pattern
async function getAuthHeader() {
  const { supabase } = await import('@/lib/supabase');
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('No active session');
  }

  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}
```

### React Component Organization
```javascript
// Standard structure followed in codebase
import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { apiFetch } from '@/lib/api';

export const Component = ({ prop1, prop2 }) => {
  // 1. State and hooks
  const [data, setData] = useState(null);

  // 2. Effects
  useEffect(() => { /* ... */ }, []);

  // 3. Event handlers
  const handleClick = () => { /* ... */ };

  // 4. Render
  return <div>...</div>;
};
```

## Testing

```bash
# Frontend linting
npm run lint

# Backend tests (when available)
cd backend && pytest tests/
```

## Security Considerations

- All Supabase tables use Row Level Security (RLS)
- Admin role required for layout writes and audit log access
- JWT validation on all backend endpoints
- No sensitive data logged (API keys, tokens, PII)
- CORS restricted to allowed origins
- Audit trail for compliance and security monitoring

## Data Segmentation

- TowPilot customers identified by "tow" tag in Stripe metadata
- Separate product lines tracked independently
- Metrics calculations filter by TOWPILOT_TAG env var

## Path Aliases

Frontend uses Vite path alias:
```javascript
import { Button } from '@/components/ui/button';  // Resolves to src/components/ui/button
```

## Styling

- Tailwind CSS with custom theme in `tailwind.config.js`
- shadcn/ui components in `src/components/ui/`
- CSS variables for theming in `src/index.css`
- Dark mode support via `darkMode: ["class"]` in Tailwind config

## Commit Message Convention

Follow conventional commits format from `.cursorrules`:
- `feat: add snapshot restore functionality`
- `fix: resolve race condition in cache service`
- `docs: update API reference`
- `refactor: extract payment processing logic`
- `test: add integration tests for webhooks`
