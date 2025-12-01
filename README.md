# Eqho Due Diligence - Investor Deck

An interactive investor presentation for Eqho's $500K seed round funding.

## 🚀 Quick Start

### Full Stack Setup (Frontend + Backend)

```bash
# Complete setup with Makefile
make setup
make dev

# Or manually:
# Frontend
npm install
npm run dev  # http://localhost:5173

# Backend (in another terminal)
cd backend
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
cp .env.example .env  # Add your Stripe API keys
uvicorn app.main:app --reload --port 8000  # http://localhost:8000
```

### Frontend Only

```bash
npm install
npm run dev
```

## 📊 Project Overview

This is an interactive investor deck showcasing:
- **TowPilot** product metrics and growth
- Financial performance analysis
- Market positioning and competitive benchmarks
- Investment terms and use of funds
- Growth projections (10% M/M to breakeven)

## 🛠️ Tech Stack

### Frontend
- **React** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Component library
- **Lucide React** - Icons

### Backend
- **FastAPI** - Python web framework
- **Stripe API** - Payment and customer data
- **Pydantic** - Data validation
- **uvicorn** - ASGI server

## 📁 Project Structure

```
eqho-due-diligence/
├── src/                    # Frontend React app
│   ├── App.jsx            # Main presentation component
│   ├── main.jsx           # React entry point
│   ├── index.css          # Global styles + Tailwind
│   ├── components/ui/     # shadcn/ui components
│   └── lib/utils.ts       # Utility functions
├── backend/               # FastAPI backend
│   ├── app/
│   │   ├── main.py       # FastAPI entry point
│   │   ├── api/v1/       # API endpoints
│   │   ├── services/     # Business logic
│   │   ├── models/       # Data models
│   │   └── core/         # Configuration
│   ├── requirements.txt  # Python dependencies
│   └── Dockerfile        # Container configuration
├── public/               # Static assets
├── index.html           # HTML entry point
├── Makefile             # Project commands
├── package.json         # Frontend dependencies
└── README.md            # This file
```

## 📈 Key Metrics (TowPilot)

- **CAC**: $831 (Sales: $450 + Marketing: $381)
- **LTV**: $14,100
- **LTV/CAC Ratio**: 17x
- **CAC Payback**: 1.8 months
- **Annual Subscription Value**: $8,027
- **Gross Margin**: 69% (improving from 53% YTD)

## 💰 Investment Details

- **Raising**: $500K seed round
- **Pre-Money Valuation**: $15.0M
- **Post-Money Valuation**: $15.5M
- **Runway to Breakeven**: 6 months
- **Minimum Investment**: $50K

## 🎯 Use of Funds

1. **Sales & Marketing** (40%): $200K - Customer acquisition
2. **Infrastructure & COGS** (30%): $150K - Scale for growth
3. **Product & Engineering** (20%): $100K - Platform enhancements
4. **Working Capital** (10%): $50K - Buffer

## 🔐 Environment Variables

Create a `.env.local` file for sensitive data:

```bash
# Stripe API (if using Stripe MCP)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
```

## 📚 Documentation

Detailed documentation is available in the `/docs` folder:

- [Architecture](./docs/architecture.md) - System design and data flow
- [Setup](./docs/setup.md) - Development environment configuration
- [Deployment](./docs/deployment.md) - Production deployment guides
- [Stripe Integration](./docs/stripe.md) - Metrics and API integration
- [API Reference](./docs/api-reference.md) - Backend endpoints

## 🌐 Navigation

- **Dashboard View**: Bento grid overview of all slides
- **Slide View**: Full presentation mode with arrow key navigation
- **Sidebar**: Collapsible navigation (admin feature)
- **Quick Investor View**: Curated 5-slide subset (feature flag)

### Feature Flags

The app uses feature flags for runtime configuration:

| Flag | Description |
|------|-------------|
| `show_sidebar` | Collapsible sidebar navigation |
| `quick_investor_view` | Show curated 5-slide investor deck |
| `show_admin_controls` | Layout editing tools |

See [featureFlags.js](./src/lib/featureFlags.js) for full list.

## 🚢 Deployment

```bash
# Build for production
npm run build

# Deploy to Vercel
vercel --prod
```

See [deployment docs](./docs/deployment.md) for detailed guides.

## 🤝 Contributing

This is a private investor deck. See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

Proprietary - Eqho, Inc. © 2025
