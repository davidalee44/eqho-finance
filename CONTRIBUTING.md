# Contributing to Eqho Due Diligence Deck

## Development Setup

### Prerequisites
- Node.js 18+ and npm
- Git

### Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd eqho-due-diligence
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```
   
   The app will be available at http://localhost:5173

## Project Structure

```
src/
├── App.jsx           # Main presentation component with all slides
├── main.jsx          # React entry point
├── index.css         # Global styles + Tailwind config
├── components/       # UI components
│   └── ui/          # shadcn/ui components
└── lib/             # Utility functions
    └── utils.ts     # CN utility for class merging
```

## Making Changes

### Updating Financial Data

All financial data is stored in the `slides` array within `src/App.jsx`. Each slide is a JavaScript object with:
- `title`: Slide heading
- `subtitle`: Subheading
- `content`: JSX content for the slide

Example:
```jsx
{
  title: "Financial Performance Analysis",
  subtitle: "Revenue Growth & Unit Economics",
  content: (
    <div>
      {/* Slide content */}
    </div>
  )
}
```

### Adding New Slides

1. Add a new object to the `slides` array in `App.jsx`
2. Follow the existing structure
3. Use the shadcn/ui components for consistency

### Styling Guidelines

- Use Tailwind utility classes for styling
- Follow the existing color scheme:
  - Primary: Dark blue/slate
  - Success: Green
  - Warning: Yellow
  - Destructive: Red
- Keep spacing consistent (space-y-2, space-y-3, space-y-4)
- Use the shadcn components for cards, tables, progress bars, etc.

## Component Usage

### Card Components
```jsx
<Card>
  <CardHeader className="pb-2">
    <CardTitle className="text-sm">Title</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Tables
```jsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Column</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Data</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Progress Bars
```jsx
<Progress value={69} className="h-2" />
```

### Badges
```jsx
<Badge variant="success">+89%</Badge>
```

## Code Quality

### Linting
```bash
npm run lint
```

### Before Committing
1. Test all slides for layout issues
2. Verify all metrics are accurate
3. Check for console errors
4. Ensure responsive design works
5. Run linter and fix any issues

## Git Workflow

### Branch Naming
- `feature/description` - New features
- `fix/description` - Bug fixes
- `update/description` - Content updates

### Commit Messages
Use conventional commits:
- `feat: Add new financial projection slide`
- `fix: Correct CAC calculation`
- `update: Refresh Q3 2025 revenue data`
- `style: Improve card spacing on slide 2`
- `docs: Update README with new metrics`

### Pull Request Process
1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit PR with description of changes
5. Request review from team

## Testing Checklist

Before deploying or merging:

- [ ] All slides render correctly
- [ ] Navigation works (Previous/Next buttons)
- [ ] Slide indicators function properly
- [ ] All charts/graphs display data accurately
- [ ] Tables are properly formatted
- [ ] Progress bars show correct percentages
- [ ] No console errors
- [ ] Mobile responsive (if applicable)
- [ ] All metrics match source data
- [ ] Links work (if any)
- [ ] Colors are consistent with brand

## Data Sources

### TowPilot Metrics
All TowPilot-specific metrics should be tagged appropriately:
- Customers have "tow" tag in Stripe
- CAC, LTV, ACV are TowPilot-specific
- Financial data is segmented by product line

### Updating Metrics
When updating metrics, ensure you update:
1. Executive Summary benchmarks
2. Financial Performance Analysis cards
3. Growth projections (if applicable)
4. Any comparison tables

## Deployment

### Build for Production
```bash
npm run build
```

This creates an optimized build in `dist/`.

### Preview Production Build
```bash
npm run preview
```

### Deploy to Vercel/Netlify
Follow the standard deployment process for your hosting platform.

## Questions or Issues?

Contact the development team or open an issue in the repository.

## License

This is proprietary software. © 2025 Eqho, Inc.




