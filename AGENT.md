# Agent Guidelines & Reminders

## Project Overview

**Eqho Due Diligence** is an interactive investor deck for Eqho's $500K seed funding round. It presents TowPilot product metrics, financial analysis, and investment terms through a React-based dashboard with presentation carousel mode.

### Tech Stack
- **Frontend**: React 18 + Vite + Tailwind CSS + shadcn/ui (port 5173)
- **Backend**: FastAPI + Stripe + Supabase (port 8000)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Auth**: Supabase Auth with email/password and Google OAuth

### Development URLs
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Integrations: http://localhost:5173/settings/integrations (admin only)
- Audit Logs: http://localhost:5173/audit-logs (admin only)

### Quick Start
```bash
# Terminal 1: Backend
cd backend && source .venv/bin/activate
python -m uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
npm run dev
```

---

## Current State (Nov 2025)

### Working Features
- Backend API is healthy and connected to Supabase
- All API endpoints documented at /docs (metrics, revenue, customer-mrr, stripe, cache, snapshots, emails, pipedream, layouts, audit)
- Frontend login UI renders with Supabase Auth (Google OAuth + email/password)
- Pixel art "To the Moon!" landing page with space theme
- 3D animations and visual effects on login page

### Known Issues
- **Auth**: The user `dave@eqho.ai` was created via **Google OAuth only**. Email/password login and password reset won't work until the Google OAuth redirect URI is configured.

### CRITICAL: Google OAuth Setup Required

The "Continue with Google" button fails with `redirect_uri_mismatch` error until you add the Supabase callback URL to Google Cloud Console.

**Add this redirect URI to Google Cloud Console:**
```
https://ikaepdczwgwesmndvcdd.supabase.co/auth/v1/callback
```

**Steps:**
1. Go to https://console.cloud.google.com/apis/credentials
2. Click on OAuth 2.0 Client ID: `733123703123-j5ernilt7frt9ulba0an8g177smmhgat`
3. In "Authorized redirect URIs", click "ADD URI"
4. Paste: `https://ikaepdczwgwesmndvcdd.supabase.co/auth/v1/callback`
5. Click "SAVE"

After adding the redirect URI, Google OAuth will work and `dave@eqho.ai` can sign in.

### Super Admin Configuration
- User: `davidalee44@gmail.com` (David Lee)
- Role: `super_admin` (set in `public.user_profiles` table)
- Auth Method: Google OAuth
- Supabase Project: `ikaepdczwgwesmndvcdd`

### Database Notes
- User profiles table: `user_profiles` (not `profiles`)
- Uses `is_admin()` security definer function for RLS
- Allowed roles: `investor`, `sales`, `admin`, `super_admin`

### Test User Account (for automated testing)
- Email: `test@eqho.ai`
- Password: `TestUser123!`
- Role: `investor`
- Note: Email/password login works via API but the `@supabase/auth-ui-react` component has a "missing email or phone" bug. Use curl or Postman to test API auth:
  ```bash
  curl -X POST "https://ikaepdczwgwesmndvcdd.supabase.co/auth/v1/token?grant_type=password" \
    -H "apikey: YOUR_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{"email": "test@eqho.ai", "password": "TestUser123!"}'
  ```

### Backend API Endpoints
| Category | Endpoints |
|----------|-----------|
| Metrics | `/api/v1/metrics/towpilot`, `/api/v1/metrics/all-products`, `/api/v1/metrics/summary` |
| Revenue | `/api/v1/revenue/current-month`, `/api/v1/revenue/month-detail`, `/api/v1/revenue/quarterly-forecast`, `/api/v1/revenue/annual-forecast` |
| Customer MRR | `/api/v1/customer-mrr/list`, `/api/v1/customer-mrr/summary-by-tier`, `/api/v1/customer-mrr/export-csv` |
| Stripe | Various Stripe data endpoints |
| Cache | Cache management with TTL |
| Snapshots | Version control for reports |
| Pipedream | Integration webhooks |
| Layouts | Dashboard card layouts (admin only) |
| Audit | Action logging and export |

---

## Documentation Standards

### Code Documentation Philosophy

**Write documentation like a professional developer leaving clear notes for the team.**

#### Core Principles

1. **Professional Tone**: Document objectively, factually, and clearly
2. **Developer-First**: Write for engineers who will maintain this code
3. **Long-Term Thinking**: Assume this code will be in production for years
4. **No Patronizing Language**: Never use phrases like "you're all set!", "congratulations!", or treat the reader like they need hand-holding
5. **Developer Humor is OK**: Dry wit and technical humor are fine, but stay professional

#### What to Include

- **Purpose**: Why this code exists
- **Architecture**: How components fit together
- **Usage**: Clear examples of how to use the code
- **Gotchas**: Edge cases, performance considerations, security notes
- **Dependencies**: What this code relies on
- **Testing**: How to test the functionality

#### What to Avoid

- ❌ Congratulatory language ("You did it!", "Success!")
- ❌ Marketing speak ("Amazing feature!", "Revolutionary!")
- ❌ Patronizing tone ("Don't worry", "It's easy!")
- ❌ Excessive emojis (one or two for visual hierarchy is fine)
- ❌ Acting like you did the reader a favor
- ❌ Documenting the obvious

#### Good Examples

```markdown
# Version Control System

## Overview

Provides snapshot-based version control for financial reports using PostgreSQL 
and Supabase Storage. Snapshots include complete report state, metadata, and 
optional screenshots.

## Architecture

- `snapshot_service.py`: CRUD operations, validates user access
- `snapshots.py`: REST API endpoints with Pydantic validation
- PostgreSQL table with Row Level Security for user isolation
```

#### Bad Examples

```markdown
# 🎉 Version Control System - You're Going to Love This!

## What You Get

You now have an AMAZING version control system that will blow your mind! 
We've built something truly special here. Let me tell you all about it...

Congratulations on getting this far! You're all set! 🎊
```

#### README Structure

For implementation documentation:

1. **What This Is**: Brief, factual description
2. **Architecture**: Components and how they interact
3. **Setup**: Required steps to deploy
4. **Usage**: Code examples
5. **API Reference**: Endpoints, parameters, responses
6. **Security**: Authentication, authorization, data protection
7. **Testing**: How to verify functionality
8. **Troubleshooting**: Common issues and solutions

#### Comments in Code

```python
# Good: Explains why, not what
def calculate_mrr(subscriptions):
    # Filter out subscriptions in grace period - they're still counted as active
    # but shouldn't contribute to MRR until grace period ends
    active_subs = [s for s in subscriptions if not s.get('in_grace_period')]
    
    return sum(s['amount'] for s in active_subs)
```

```python
# Bad: States the obvious or over-explains
def calculate_mrr(subscriptions):
    # This function calculates MRR! It's super important!
    # First, we create an empty list to store our subscriptions
    active_subs = []
    # Then we loop through each subscription (isn't that cool?)
    for s in subscriptions:
        # We check if it's active (wow!)
        if s.get('status') == 'active':
            # And add it to our list! Amazing!
            active_subs.append(s)
```

## Stripe MCP Pagination Limits

### ⚠️ CRITICAL: Stripe MCP Pagination

**ALWAYS REMEMBER:** Stripe MCP calls have a default `limit: 100` parameter. This means:

1. **You may not get all data** - If there are more than 100 subscriptions, customers, prices, etc., you will only see the first 100
2. **MRR calculations may be incomplete** - Missing subscriptions = incorrect MRR totals
3. **Always check for pagination** - Look for `has_more` flags or total counts in responses
4. **Use multiple calls if needed** - If you need all data, make multiple calls with different offsets or use pagination parameters

### When Fetching Stripe Data:

- ✅ **DO**: Check the total count vs. returned count
- ✅ **DO**: Use pagination if available (offset, starting_after, etc.)
- ✅ **DO**: Verify MRR calculations match expected totals
- ✅ **DO**: Consider using backend API endpoints that handle pagination automatically
- ❌ **DON'T**: Assume `limit: 100` returns all data
- ❌ **DON'T**: Calculate MRR from partial subscription lists
- ❌ **DON'T**: Trust totals without verifying completeness

### Example Pattern:

```javascript
// BAD - May miss data
const subscriptions = await mcp_stripe_list_subscriptions({ limit: 100 });

// BETTER - Check if more data exists
const subscriptions = await mcp_stripe_list_subscriptions({ limit: 100 });
if (subscriptions.length === 100) {
  // Likely more data exists - need pagination
}

// BEST - Use backend API that handles pagination
const response = await fetch('/api/v1/stripe/churn-and-arpu');
// Backend handles all pagination internally
```

### For MRR Calculations:

- Always verify the subscription count matches expected totals
- If calculating manually, ensure you have ALL active subscriptions
- Prefer using backend-calculated MRR values over manual calculations
- When in doubt, use the backend API endpoints that aggregate all data

