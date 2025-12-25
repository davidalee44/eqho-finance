# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Interactive investor deck for Eqho's $500K seed funding round. Presents TowPilot product metrics, financial analysis, and investment terms through a React-based dashboard with presentation carousel mode. Includes QuickBooks integration for P&L data and real-time cash flow monitoring.

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
pytest tests/                        # Run backend tests
pytest tests/ --cov=app              # Run with coverage
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

### Linting Commands
```bash
make lint-py            # Check Python code with Ruff (no changes)
make lint-py-fix        # Auto-fix Python code (safe fixes only)
make lint-py-unsafe     # Auto-fix Python code (including unsafe)
make lint-py-format     # Format Python code with Ruff
make lint-frontend      # Check frontend code with ESLint
make lint-all           # Run all linters (frontend + backend)
```

### Environment Validation
```bash
make validate-env       # Validate all environment variables
make validate-env-fe    # Validate frontend env vars only
make validate-env-be    # Validate backend env vars only
make validate-env-ci    # CI/CD environment validation
```

## Architecture

### Frontend Structure (`src/`)

**Main Application:**
- `App.jsx` - Financial model slide with interactive projections calculator
- `main.jsx` - React app entry point

**Routing & Layout:**
- `components/AppRouter.jsx` - Route management and auth-based navigation
- `components/Sidebar.jsx` - Navigation sidebar
- `components/Footer.jsx` - App footer

**Dashboard Components:**
- `components/BentoDashboard.jsx` - Bento grid layout dashboard
- `components/GridDashboard.jsx` - Grid-based dashboard layout
- `components/ComprehensiveMetrics.jsx` - Main metrics dashboard
- `components/CashFlowDashboard.jsx` - Admin-only cash flow monitoring

**Presentation System:**
- `components/FinancialReport.jsx` - Multi-slide report with carousel presentation mode
- `components/ReportCarousel.jsx` - Swipeable slide navigation with touch/keyboard support
- `components/ReportSlide.jsx` - Individual slide wrapper with animations
- `components/SlideThumbnails.jsx` - Slide preview navigation
- `components/ReportActions.jsx` - Report action buttons (export, screenshot)

**Slide Components (`components/slides/`):**
- `ExecutiveSummarySlide.jsx` - Executive summary
- `SpendingBreakdownSlide.jsx` - Spending breakdown visualization
- `CashFlowForecastSlide.jsx` - Cash flow projections
- `RiskAnalysisSlide.jsx` - Risk assessment
- `KeyInsightsSlide.jsx` - Key financial insights
- `ActionPlanSlide.jsx` - Recommended actions

**Metrics & Analytics:**
- `components/ValidatedMetrics.jsx` - Metrics validation and display
- `components/MRRMetrics.jsx` - Monthly Recurring Revenue tracking
- `components/OctoberRevenueBreakdown.jsx` - Revenue breakdown visualization
- `components/DynamicFinancialInsights.jsx` - AI-generated financial insights
- `components/AttritionReport.jsx` - Customer retention analysis
- `components/PLDrillDown.jsx` - P&L drill-down component

**Admin Components:**
- `components/AuditLogViewer.jsx` - Action logging viewer
- `components/ImpersonationBanner.jsx` - Shows when impersonating user
- `components/ImpersonationSelector.jsx` - Admin user selection
- `components/MaintenanceBanner.jsx` - Maintenance mode indicator
- `components/TeamCompensationPage.jsx` - Team compensation management

**User Management:**
- `components/UserProfile.jsx` - User profile management
- `components/VersionControl.jsx` - Snapshot creation/restore
- `components/IntegrationsPage.jsx` - Third-party integrations setup

**Interactive Components:**
- `components/DraggableCard.jsx` - Drag-and-drop card component
- `components/DataTimestamp.jsx` - Data freshness indicator
- `components/LandingPage.jsx` - Marketing landing page
- `components/PixelRocketHero.jsx` - Landing page 3D animation
- `components/PixelRocketTimeline.jsx` - Animated timeline

**UI Components Library (`components/ui/`):**

Standard shadcn/ui components:
- `button.jsx`, `card.jsx`, `input.jsx`, `label.jsx`
- `table.jsx`, `tabs.jsx`, `badge.jsx`, `accordion.jsx`
- `separator.jsx`, `progress.jsx`, `select.jsx`
- `alert-dialog.jsx`, `dialog.jsx`, `collapsible.jsx`, `switch.jsx`

Custom components:
- `currency-input.jsx` - Currency formatted input
- `percentage-input.jsx` - Percentage formatted input
- `magnetic-cursor.jsx` - Magnetic cursor effect
- `tour.jsx` - Guided tour component
- `img-sphere.jsx` - 3D image sphere with Three.js
- `bento-grid.jsx` - Bento grid layout
- `timeline.jsx` - Timeline visualization

**React Hooks (`hooks/`):**
- `useDraggableCards.js` - Drag-and-drop card positioning
- `useCashFlow.js` - Cash flow data fetching with caching
- `useFeatureFlags.js` - Feature flag access and caching
- `useProfitLoss.js` - P&L data fetching
- `useIntegrations.js` - Integration state management

**Core Services (`services/`):**
- `layoutService.js` - Dashboard card layout persistence (admin only)
- `auditService.js` - Action logging with batched writes and sync/async flush

**Utility Libraries (`lib/`):**
- `api.js` - API client with auth headers, caching
- `supabase.js` - Supabase client, auth helpers, RLS-aware queries
- `supabaseClient.js` - Alternative Supabase client wrapper
- `stripeData.js` - Stripe data integration
- `exportUtils.js` - Excel/CSV export utilities
- `screenshotUtils.js` - Screenshot generation with html2canvas
- `generateFinancialInsights.js` - Financial analysis generation
- `featureFlags.js` - Feature flag utilities and defaults
- `investmentConstants.js` - Investment-related constants
- `utils.ts` - Tailwind class merging utility (cn function)

**State Management (`contexts/`):**
- `AuthContext.jsx` - User authentication, role management, admin checks

### Backend Structure (`backend/app/`)

**API Endpoints (`api/v1/`):**
- `metrics.py` - Business metrics calculations (CAC, LTV, MRR, churn)
- `revenue_projections.py` - Revenue forecasting endpoints
- `customer_mrr.py` - Customer MRR data (list, summary-by-tier, export)
- `stripe_data.py` - Stripe API integration for customer/revenue data
- `quickbooks.py` - QuickBooks OAuth and P&L data
- `cashflow.py` - Cash flow dashboard (admin only)
- `attrition.py` - Customer attrition/retention analysis
- `cache.py` - Cache management with TTL and invalidation
- `snapshots.py` - Report version control (create, restore, list, delete)
- `layouts.py` - Dashboard layout persistence (admin only)
- `audit.py` - Action logging with pagination and CSV export
- `emails.py` - Email sending via Resend API
- `flags.py` - Feature flags (Edge Config, env vars, defaults)
- `admin.py` - Admin user management and impersonation
- `integrations.py` - Third-party integration management

**Backend Services (`services/`):**
- `stripe_service.py` - Stripe API wrapper, TowPilot customer filtering
- `metrics_calculator.py` - SaaS metrics calculations
- `metrics_cache_service.py` - Metrics-specific caching
- `cache_service.py` - In-memory cache with stats
- `supabase_service.py` - Supabase connection and queries
- `snapshot_service.py` - Snapshot CRUD with RLS
- `email_service.py` - Email service integration
- `auth.py` - JWT validation and role-based access control
- `quickbooks_service.py` - QuickBooks API integration
- `cashflow_service.py` - Cash flow data aggregation
- `retention_service.py` - Retention/attrition analysis
- `pipedream_service.py` - Pipedream integration service

**Models (`models/`):**
- `metrics.py` - Pydantic models for metrics data

**Configuration (`core/`):**
- `config.py` - Pydantic settings for environment variables
- `env_validator.py` - Environment variable validation

**Entry Point:**
- `main.py` - FastAPI app initialization with CORS, routes, middleware

### Database (Supabase PostgreSQL)

Key tables with Row Level Security:
- `snapshots` - Report versions with metadata, screenshot URLs
- `layouts` - Dashboard card configurations
- `audit_logs` - User action tracking
- `user_profiles` - User roles, metadata, app access

### Authentication Flow

1. Supabase Auth provides JWT tokens
2. Frontend stores tokens in session
3. Backend validates JWT and extracts user_id from claims
4. RLS policies enforce data isolation per user
5. Admin role checked via `user_profiles.role` column
6. Impersonation allows admins to view as other users

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
- 5-minute TTL for Stripe data and feature flags
- Manual invalidation endpoints
- Health check exposes cache stats
- Stale-while-revalidate pattern for UI responsiveness

**Feature Flags:**
- Priority: Cache → Edge Config → Environment → Defaults
- Admin overrides for admin users
- LocalStorage caching in frontend

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
# Required
SUPABASE_URL=
SUPABASE_ANON_KEY=
STRIPE_SECRET_KEY=                        # Required for metrics

# Optional - Supabase
SUPABASE_SERVICE_ROLE_KEY=                # For backend RLS bypass
STRIPE_PUBLISHABLE_KEY=

# Optional - Email
RESEND_API_KEY=                           # For email sending

# Optional - QuickBooks Integration
QUICKBOOKS_CLIENT_ID=
QUICKBOOKS_CLIENT_SECRET=
QUICKBOOKS_REDIRECT_URI=http://localhost:8000/api/v1/quickbooks/auth/callback
QUICKBOOKS_REALM_ID=                      # Your company ID
QUICKBOOKS_USE_SANDBOX=false

# Optional - Pipedream Integration
PIPEDREAM_PROJECT_ID=
PIPEDREAM_CLIENT_ID=
PIPEDREAM_CLIENT_SECRET=
PIPEDREAM_ENVIRONMENT=production
PIPEDREAM_WORKSPACE_ID=
PIPEDREAM_WEBHOOK_SECRET=

# Optional - Feature Flags (via Vercel Edge Config)
EDGE_CONFIG=                              # Vercel Edge Config URL
FEATURE_FLAG_MAINTENANCE_MODE=false       # Override flags via env

# Configuration
CORS_ORIGINS=["http://localhost:5173"]   # Frontend URLs
CACHE_TTL=300                             # 5 minutes
FRONTEND_URL=http://localhost:5173        # For OAuth redirects
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

### Feature Flags Hook
```javascript
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

function MyComponent() {
  const { flags, loading, error, refresh } = useFeatureFlags();

  if (flags.maintenance_mode) {
    return <MaintenanceBanner />;
  }

  if (flags.show_admin_controls && isAdmin) {
    return <AdminPanel />;
  }

  return <NormalView />;
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

### Admin-Only Endpoints
```python
from app.services.auth import require_admin

@router.get("/users")
async def list_users(
    admin_user_id: str = Depends(require_admin)
):
    """Admin-only endpoint - require_admin validates JWT and role"""
    # ... implementation
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
pytest tests/                    # Run all tests
pytest tests/ -v                 # Verbose output
pytest tests/ --cov=app          # With coverage
pytest tests/ -k "test_stripe"   # Run specific tests
```

Test files located in `backend/tests/`:
- `test_auth.py` - Authentication and JWT tests
- `test_admin_endpoints.py` - Admin API tests
- `test_cache_endpoints.py` - Cache management tests
- `test_customer_mrr.py` - Customer MRR tests
- `test_models.py` - Pydantic model tests
- `test_metrics_cache.py` - Metrics cache tests
- `test_quickbooks.py` - QuickBooks integration tests
- `test_revenue_projections.py` - Revenue projection tests
- `test_mrr_calculations.py` - MRR calculation tests
- `test_stripe_endpoints.py` - Stripe API tests

Configuration: `backend/tests/conftest.py`
- Fixtures for mock Supabase, Stripe, P&L data
- Custom markers: `integration`, `slow`

## Linting

### Python (Ruff)
Configuration in `backend/ruff.toml`:
- Target: Python 3.9+
- Line length: 120
- Rules: E, F, I, W, UP, B, SIM (pycodestyle, pyflakes, isort, pyupgrade, bugbear, simplify)
- Ignores: E501 (line length), B008 (FastAPI Depends in defaults)

### Frontend (ESLint)
Configuration in `.eslintrc.json`:
- React plugin enabled
- Standard ES6+ rules

## Security Considerations

- All Supabase tables use Row Level Security (RLS)
- Admin role required for layout writes and audit log access
- JWT validation on all backend endpoints
- No sensitive data logged (API keys, tokens, PII)
- CORS restricted to allowed origins
- Audit trail for compliance and security monitoring
- Impersonation logged for security review

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

Follow conventional commits format:
- `feat: add snapshot restore functionality`
- `fix: resolve race condition in cache service`
- `docs: update API reference`
- `refactor: extract payment processing logic`
- `test: add integration tests for webhooks`

DO NOT include attribution to Claude in commits or PRs.

## Code Documentation Standards

- Write as a professional developer documenting for the team
- Be factual, clear, and objective
- Developer humor acceptable, stay professional
- No congratulatory, patronizing, or marketing language
- Avoid excessive emojis
- Document for long-term maintenance (2+ years in production)
- Only comment non-obvious behavior, not obvious code
- Do NOT use phrases like "You're all set!", "Congratulations!", "Amazing!"

---

## API Endpoints Reference

### Metrics
- `GET /api/v1/metrics/towpilot` - TowPilot-specific metrics
- `GET /api/v1/metrics/all-products` - All product metrics
- `GET /api/v1/metrics/summary` - Metrics summary

### Revenue
- `GET /api/v1/revenue/current-month` - Current month revenue
- `GET /api/v1/revenue/month-detail` - Monthly breakdown
- `GET /api/v1/revenue/quarterly-forecast` - Quarterly projections
- `GET /api/v1/revenue/annual-forecast` - Annual projections

### Customer MRR
- `GET /api/v1/customer-mrr/list` - Customer MRR list
- `GET /api/v1/customer-mrr/summary-by-tier` - Summary by pricing tier
- `GET /api/v1/customer-mrr/export-csv` - CSV export

### Stripe
- `GET /api/v1/stripe/customers` - Stripe customer data
- `GET /api/v1/stripe/subscriptions` - Subscription data

### QuickBooks
- `GET /api/v1/quickbooks/auth/url` - OAuth authorization URL
- `GET /api/v1/quickbooks/auth/callback` - OAuth callback
- `GET /api/v1/quickbooks/pl` - P&L report data
- `GET /api/v1/quickbooks/payroll` - Payroll/labor costs

### Cash Flow (Admin Only)
- `GET /api/v1/cashflow/summary` - Cash flow summary
- `GET /api/v1/cashflow/projections` - Cash flow projections

### Feature Flags
- `GET /api/v1/flags` - Current feature flags
- `POST /api/v1/flags/refresh` - Force refresh flags
- `GET /api/v1/flags/defaults` - Default flag values

### Admin (Admin Only)
- `GET /api/v1/admin/users` - List users for impersonation
- `GET /api/v1/admin/users/{user_id}` - Get user details

### Other
- `GET /api/v1/cache/*` - Cache management
- `GET /api/v1/snapshots/*` - Version control
- `GET /api/v1/layouts/*` - Dashboard layouts
- `GET /api/v1/audit/*` - Audit logging
- `GET /api/v1/attrition/*` - Attrition analysis
- `GET /api/v1/integrations/*` - Integration status

### Health Check
- `GET /` - API info
- `GET /health` - Health status with cache stats

---

## Verification Status (Dec 2025)

### Servers
| Service | Port | Status |
|---------|------|--------|
| Backend (FastAPI/Uvicorn) | 8000 | Available |
| Frontend (Vite) | 5173 | Available |
| Supabase | Cloud | Connected |

### Backend Health
```json
{
  "status": "healthy",
  "cache_stats": {"memory_cache": {"entries": 0, "keys": []}},
  "backend": "supabase"
}
```

### Frontend Features
- Login page with "To the Moon!" pixel art hero
- Supabase Auth UI component with Google OAuth and email/password
- Space theme with starfield background animation
- Feature flags for dynamic feature toggling
- Admin impersonation support

### Known Issues
1. **Google OAuth Redirect URI**: Add redirect URI to Google Cloud Console:
   ```
   https://ikaepdczwgwesmndvcdd.supabase.co/auth/v1/callback
   ```

2. **Super Admin Account** (`davidalee44@gmail.com`):
   - Has `super_admin` role in `public.user_profiles` table
   - Auth via Google OAuth
   - Full access to all admin features

3. **Test Account** (`test@eqho.ai` / `TestUser123!`):
   - Has `investor` role
   - Email confirmed, password auth enabled

4. **Auth UI Bug**: The `@supabase/auth-ui-react` component may show "missing email or phone" error. Workaround: use Google OAuth or test via API directly.

### Dependencies
Frontend: React 18, Vite 5, Tailwind CSS 3, shadcn/ui, Three.js, Framer Motion, Recharts
Backend: FastAPI 0.104, Uvicorn, Stripe 7.4, Supabase 2.10, Pydantic 2.5, httpx 0.27
Testing: Vitest 4.0 (frontend), pytest 8.0 (backend)
Linting: ESLint 8 (frontend), Ruff 0.8 (backend)
