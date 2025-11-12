# Eqho Due Diligence - Complete Setup Guide

## 📋 Quick Setup

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Open http://localhost:5173
```

## 🏗️ Repository Structure

```
eqho-due-diligence/
├── src/
│   ├── App.jsx                 # Main presentation with all 6 slides
│   ├── main.jsx                # React entry point
│   ├── index.css               # Global styles + Tailwind
│   ├── components/
│   │   └── ui/                # shadcn/ui components
│   │       ├── badge.jsx
│   │       ├── button.jsx
│   │       ├── card.jsx
│   │       ├── progress.jsx
│   │       ├── separator.jsx
│   │       ├── table.jsx
│   │       └── tabs.jsx
│   └── lib/
│       └── utils.ts           # Utility functions (cn)
├── public/                     # Static assets
├── .env.example               # Environment variable template
├── .env.local                 # Your local env vars (not committed)
├── .gitignore                 # Git ignore rules
├── .eslintrc.json             # ESLint configuration
├── .prettierrc                # Prettier code formatting
├── index.html                 # HTML entry point
├── vite.config.js             # Vite build configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── postcss.config.js          # PostCSS configuration
├── package.json               # Dependencies and scripts
├── README.md                  # Project overview
├── CONTRIBUTING.md            # Contribution guidelines
└── SETUP.md                   # This file
```

## 🔧 Configuration Files

### package.json
Contains all dependencies and npm scripts:
- `npm run dev` - Start development server (Vite)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### vite.config.js
Vite configuration with:
- React plugin
- Path aliases (`@` → `./src`)
- Build optimizations

### tailwind.config.js
Tailwind CSS configuration with:
- shadcn/ui theme variables
- Custom colors from CSS variables
- Dark mode support (class-based)

### .gitignore
Properly configured to ignore:
- `node_modules/`
- `.env.local` and all `.env.*` files
- Build outputs (`dist/`, `build/`)
- Editor files (`.vscode/`, `.idea`)
- OS files (`.DS_Store`)
- Sensitive data (`*.key`, `*.pem`)

## 🎨 Styling System

### Tailwind CSS
The project uses Tailwind CSS for utility-first styling. All styles are defined in:
- `src/index.css` - Base styles and CSS variables
- Component files - Using Tailwind classes

### CSS Variables
Defined in `src/index.css`:
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  /* ... more variables */
}
```

### shadcn/ui Components
Pre-built, customizable components in `src/components/ui/`:
- Fully styled with Tailwind
- Accessible (built on Radix UI)
- Customizable via variants

## 📊 Data Structure

### Slides Array
All presentation content is in `src/App.jsx` in the `slides` array:

```javascript
const slides = [
  {
    title: "Executive Summary",
    subtitle: "Company Overview & Key Metrics",
    content: (
      <div>
        {/* JSX content */}
      </div>
    )
  },
  // ... more slides
];
```

### Key Metrics (TowPilot)
All metrics are hardcoded for now:
- **CAC**: $831 (Sales: $450 + Marketing: $381)
- **LTV**: $14,100
- **ACV**: $8,027
- **Gross Margin**: 69% (was 53% in Jan 2025)
- **LTV/CAC**: 17x
- **CAC Payback**: 1.8 months

## 🔐 Environment Variables

### .env.local
Create this file for sensitive data:

```bash
# Stripe API Keys (if using Stripe MCP)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...

# Other API keys as needed
```

### .env.example
Template file (committed to git) showing required variables.

## 🚀 Development Workflow

### 1. Start Development
```bash
npm run dev
```
- Server starts on http://localhost:5173
- Hot module reload (HMR) enabled
- Changes auto-refresh in browser

### 2. Making Changes

**Update Financial Data:**
- Edit `src/App.jsx`
- Find the relevant slide in the `slides` array
- Update the JSX content

**Add New Components:**
- Create in `src/components/`
- Import and use in `App.jsx`

**Styling:**
- Use Tailwind utility classes
- Follow existing patterns for consistency

### 3. Testing
```bash
# Check for linting issues
npm run lint

# Build to verify production works
npm run build

# Preview production build
npm run preview
```

### 4. Commit Changes
```bash
git add .
git commit -m "feat: description of changes"
git push
```

## 🏗️ Build & Deploy

### Production Build
```bash
npm run build
```
- Creates optimized bundle in `dist/`
- Minified JS/CSS
- Tree-shaking applied
- Assets hashed for caching

### Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Deploy to Netlify
1. Build: `npm run build`
2. Publish directory: `dist`
3. Build command: `npm run build`

### Deploy to GitHub Pages
```bash
# Update vite.config.js with base path
export default defineConfig({
  base: '/eqho-due-diligence/',
  // ...
})

# Build and deploy
npm run build
# Upload dist/ to gh-pages branch
```

## 🔍 Troubleshooting

### Dev Server Won't Start
```bash
# Check if port 5173 is in use
lsof -i :5173

# Kill process if needed
kill -9 <PID>

# Restart
npm run dev
```

### Build Errors
```bash
# Clear cache
rm -rf node_modules .vite dist
npm install
npm run build
```

### Styling Issues
```bash
# Regenerate Tailwind
rm -rf dist .vite
npm run dev
```

### Environment Variables Not Loading
- Ensure `.env.local` exists
- Restart dev server after changes
- Variables must start with `VITE_` to be accessible in client code

## 📚 Key Dependencies

### Core
- `react` (^18.2.0) - UI framework
- `react-dom` (^18.2.0) - React rendering
- `vite` (^5.0.8) - Build tool

### UI Components
- `@radix-ui/react-*` - Headless UI primitives
- `lucide-react` (^0.294.0) - Icons
- `tailwindcss` (^3.3.6) - CSS framework

### Utilities
- `class-variance-authority` - Component variants
- `clsx` + `tailwind-merge` - Class name utilities

## 🎯 Next Steps

### Integrating Real Data
1. Set up Stripe MCP connection
2. Pull customer data with "tow" tag
3. Calculate metrics dynamically
4. Update slides with real-time data

### Enhancements
- Add more interactive charts
- Implement data refresh button
- Add export to PDF functionality
- Create printable version

## 🤝 Getting Help

- Check `README.md` for overview
- Review `CONTRIBUTING.md` for contribution guidelines
- Contact dev team for questions

## 📄 License

Proprietary - Eqho, Inc. © 2025




