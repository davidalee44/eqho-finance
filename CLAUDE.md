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
npm test                # Run Vitest tests
npm run test:ui         # Run tests with UI
npm run test:run        # Run tests once (CI mode)
npm run test:coverage   # Generate coverage report
```

### Backend (FastAPI)
```bash
cd backend
uv venv                              # Create virtual environment
source .venv/bin/activate            # Activate venv (macOS/Linux)
uv pip install -r requirements.txt   # Install dependencies
uvicorn app.main:app --reload --port 8000  # Start dev server
pytest tests/                        # Run backend tests (when available)
```

### Makefile (Recommended)
```bash
make setup              # Complete project setup (frontend + backend)
make dev                # Run both frontend and backend in parallel
make dev-frontend       # Frontend only
make dev-backend        # Backend only
make build             # Build for production
make test              # Run all tests (frontend lint + backend tests)
make clean             # Clean build artifacts
make clean-all         # Remove all dependencies
```

### Docker Commands
```bash
make docker-up          # Start MongoDB 8 + Backend API
make docker-down        # Stop all services
make docker-logs        # View Docker logs
make docker-mongodb     # Start MongoDB only
make docker-clean       # Remove volumes (deletes data)
```

## Architecture

### Frontend Structure (`src/`)

**Main Components:**
- `App.jsx` - Financial model slide with interactive projections calculator
- `FinancialReport.jsx` - Multi-slide report with carousel presentation mode
- `AppRouter.jsx` - Route management and auth-based navigation
- `PixelRocketHero.jsx` - Landing page component with 3D animations
- `BentoDashboard.jsx` - Bento grid layout dashboard
- `ComprehensiveMetrics.jsx` - Main metrics dashboard

**Presentation System:**
- `ReportCarousel.jsx` - Swipeable slide navigation with touch/keyboard support
- `ReportSlide.jsx` - Individual slide wrapper with animations
- `SlideThumbnails.jsx` - Slide preview navigation
- `components/slides/` - Individual slide components:
  - `ExecutiveSummarySlide.jsx`
  - `SpendingBreakdownSlide.jsx`
  - `CashFlowForecastSlide.jsx`
  - `RiskAnalysisSlide.jsx`
  - `KeyInsightsSlide.jsx`
  - `ActionPlanSlide.jsx`

**Metrics & Data:**
- `ValidatedMetrics.jsx` - Metrics validation and display
- `MRRMetrics.jsx` - Monthly Recurring Revenue tracking
- `OctoberRevenueBreakdown.jsx` - Revenue breakdown visualization
- `DynamicFinancialInsights.jsx` - AI-generated financial insights
- `DraggableCard.jsx` - Drag-and-drop card component

**Core Services:**
- `services/layoutService.js` - Dashboard card layout persistence (admin only)
- `services/auditService.js` - Action logging with batched writes and sync/async flush
- `lib/supabase.js` - Supabase client, auth helpers, RLS-aware queries
- `lib/supabaseClient.js` - Alternative Supabase client wrapper
- `lib/api.js` - API client with auth headers
- `lib/stripeData.js` - Stripe data integration
- `lib/exportUtils.js` - Excel/CSV export utilities
- `lib/screenshotUtils.js` - Screenshot generation with html2canvas
- `lib/generateFinancialInsights.js` - Financial analysis generation

**State Management:**
- `contexts/AuthContext.jsx` - User authentication, role management, admin checks
- `hooks/useDraggableCards.js` - Drag-and-drop card positioning

**Data Features:**
- Version control system with snapshot creation/restore (`VersionControl.jsx`)
- Real-time Stripe data integration for metrics
- Financial model calculator with localStorage persistence
- Export functionality (screenshots, Excel, CSV) via `exportUtils.js`
- Audit logging with viewer component (`AuditLogViewer.jsx`)
- User profile management (`UserProfile.jsx`)

**UI Components Library:**
Custom shadcn/ui components in `components/ui/`:
- Standard: `button`, `card`, `input`, `label`, `table`, `tabs`, `badge`, `accordion`, `separator`, `progress`, `select`, `alert-dialog`
- Custom: `currency-input`, `percentage-input`, `magnetic-cursor`, `tour`, `img-sphere`, `bento-grid`

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
- `email_service.py` - Email service integration
- `auth.py` - JWT validation and role-based access control

**Configuration:**
- `core/config.py` - Pydantic settings for environment variables
- `main.py` - FastAPI app initialization with CORS, routes, middleware
- RLS enforced on all Supabase queries with user_id filtering

**Dependencies:**
- FastAPI 0.104.1 with Uvicorn
- Stripe 7.4.0 for payment data
- Supabase 2.10.0 for database/auth
- Pydantic 2.5.0 for data validation
- httpx 0.27.0 for async HTTP requests

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

### Frontend Tests (Vitest)
```bash
npm test                # Watch mode
npm run test:run        # Single run (CI mode)
npm run test:ui         # Interactive UI
npm run test:coverage   # Generate coverage report
```

Test files located in `src/**/__tests__/`:
- Component tests: `src/components/ui/__tests__/`
- Service tests: `src/services/__tests__/`
- Hook tests: `src/hooks/__tests__/`
- Context tests: `src/contexts/__tests__/`
- Utility tests: `src/lib/__tests__/`

Configuration: `vitest.config.js`
- Environment: jsdom
- Setup file: `src/test/setup.js`
- Coverage: v8 provider

### Backend Tests (pytest)
```bash
cd backend
source .venv/bin/activate
pytest tests/           # When tests are available
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
- Custom animations: framer-motion, GSAP, three.js
- 3D components: `img-sphere.jsx` (3D image sphere with Three.js)
- Layout: `bento-grid.jsx` for dashboard layouts

## Commit Message Convention

Follow conventional commits format from `.cursorrules`:
- `feat: add snapshot restore functionality`
- `fix: resolve race condition in cache service`
- `docs: update API reference`
- `refactor: extract payment processing logic`
- `test: add integration tests for webhooks`

DO NOT include attribution to Claude in commits or PRs per user's global instructions.

## Code Documentation Standards

From `.cursorrules`:
- Write as a professional developer documenting for the team
- Be factual, clear, and objective
- Developer humor acceptable, stay professional
- No congratulatory, patronizing, or marketing language
- Avoid excessive emojis
- Document for long-term maintenance (2+ years in production)
- Only comment non-obvious behavior, not obvious code
- Do NOT use phrases like "You're all set!", "Congratulations!", "Amazing!"
