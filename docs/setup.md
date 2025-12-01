# Development Setup

## Prerequisites

- Node.js 18+
- Python 3.9+
- uv (Python package manager)
- Git

## Quick Start

```bash
# Clone and install
git clone <repo>
cd eqho-due-diligence
make setup

# Start development
make dev
```

## Manual Setup

### Frontend

```bash
npm install
npm run dev
# Opens http://localhost:5173
```

### Backend

```bash
cd backend
uv venv
source .venv/bin/activate  # macOS/Linux
uv pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# API: http://localhost:8000
# Docs: http://localhost:8000/docs
```

## Environment Variables

### Frontend (.env.local)

```bash
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Backend (backend/.env)

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
STRIPE_SECRET_KEY=sk_live_...

# Optional
STRIPE_PUBLISHABLE_KEY=pk_live_...
RESEND_API_KEY=re_...
CORS_ORIGINS=["http://localhost:5173"]
CACHE_TTL=300
```

## Supabase Setup

### Required Tables

1. **snapshots** - Report version history
2. **layouts** - Dashboard card configurations
3. **audit_logs** - User action tracking
4. **user_profiles** - User roles and metadata

### Row Level Security

All tables must have RLS enabled. Example policy:

```sql
CREATE POLICY "Users can view own data" ON snapshots
  FOR SELECT USING (auth.uid() = user_id);
```

See `backend/migrations/` for complete SQL migrations.

## Docker Setup

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build individual services
docker build -t eqho-backend ./backend
docker run -p 8000:8000 eqho-backend
```

## Makefile Commands

```bash
make help              # Show all commands
make setup             # Complete project setup
make dev               # Start frontend + backend
make dev-frontend      # Frontend only
make dev-backend       # Backend only
make build             # Build for production
make test              # Run all tests
make lint-py           # Lint Python code
make lint-py-fix       # Auto-fix Python lints
make clean             # Clean build artifacts
```

## Troubleshooting

### Backend won't start
- Check `backend/.env` has required keys
- Verify virtual environment is activated
- Check port 8000 is available

### Frontend shows loading forever
- Check VITE_API_URL points to running backend
- Check browser console for CORS errors
- Verify Supabase credentials

### API returns 401 Unauthorized
- Check Supabase session is active
- Verify JWT token is being sent
- Check RLS policies allow access

