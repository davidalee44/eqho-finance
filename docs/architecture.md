# Architecture

## System Overview

The Eqho Due Diligence platform is a full-stack application for presenting investor materials with real-time financial metrics.

## Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Component library
- **Framer Motion** - Animations
- **Three.js** - 3D elements (login screen)

### Backend
- **FastAPI** - Python web framework
- **Pydantic** - Data validation
- **Supabase** - PostgreSQL database + Auth
- **Stripe API** - Payment/subscription data

### Infrastructure
- **Vercel** - Frontend hosting + Edge Config
- **Railway** - Backend hosting
- **Supabase** - Database + Auth + Storage

## Data Flow

```
User Request
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│ Frontend (React SPA)                                    │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│ │ AuthContext │  │FeatureFlags │  │ API Client  │     │
│ └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
     │                    │                 │
     ▼                    ▼                 ▼
┌───────────┐     ┌───────────────┐   ┌───────────────┐
│ Supabase  │     │ Vercel Edge   │   │ FastAPI       │
│ Auth      │     │ Config        │   │ Backend       │
└───────────┘     └───────────────┘   └───────────────┘
                                            │
                        ┌───────────────────┼───────────────────┐
                        ▼                   ▼                   ▼
                  ┌───────────┐       ┌───────────┐       ┌───────────┐
                  │ Supabase  │       │ Stripe    │       │ Cache     │
                  │ Database  │       │ API       │       │ (Memory)  │
                  └───────────┘       └───────────┘       └───────────┘
```

## Component Architecture

### Frontend Structure

```
src/
├── App.jsx                 # Main application with 11 slides
├── main.jsx               # React entry point with router
├── components/
│   ├── Sidebar.jsx        # Collapsible navigation
│   ├── BentoDashboard.jsx # Dashboard view with bento grid
│   ├── slides/            # Individual slide components
│   │   ├── ExecutiveSummarySlide.jsx
│   │   └── ...
│   └── ui/                # shadcn/ui components
├── contexts/
│   └── AuthContext.jsx    # Authentication state
├── hooks/
│   ├── useFeatureFlags.js # Feature flag access
│   └── useDraggableCards.js # Admin layout editing
├── lib/
│   ├── featureFlags.js    # Flag definitions
│   ├── investmentConstants.js # Investment data
│   └── api.js             # API client
└── services/
    └── layoutService.js   # Layout persistence
```

### Backend Structure

```
backend/app/
├── main.py                # FastAPI app initialization
├── api/v1/
│   ├── metrics.py        # Business metrics endpoints
│   ├── stripe_data.py    # Stripe integration
│   ├── flags.py          # Feature flag API
│   └── ...
├── services/
│   ├── stripe_service.py # Stripe API wrapper
│   ├── cache_service.py  # In-memory caching
│   └── ...
└── core/
    └── config.py         # Configuration
```

## Authentication Flow

1. User lands on login page (PixelRocketHero)
2. Authenticates via Supabase (Google OAuth or email/password)
3. JWT token stored in session
4. Backend validates JWT on protected endpoints
5. RLS policies enforce data isolation per user
6. Admin role grants additional feature flag overrides

## Caching Strategy

- **Browser**: localStorage for feature flags, metrics (5 min TTL)
- **Backend**: In-memory dict cache for Stripe data (5 min TTL)
- **Database**: Supabase caches table for fallback metrics

## Version Control (Snapshots)

The platform supports saving "snapshots" of the current state:
- Stored in Supabase `snapshots` table
- Includes metadata, filters, parameters
- Optional screenshot via html2canvas
- Admin-only restore functionality

## Security

- Row Level Security (RLS) on all Supabase tables
- JWT validation on all protected endpoints
- Admin role check for sensitive operations
- CORS restricted to allowed origins
- No sensitive data logged

