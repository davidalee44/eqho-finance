# Project Rules & Standards

## Number Input Fields

### ❌ NEVER USE:
- Spinner arrows (up/down arrows) on number inputs
- `type="number"` with default browser spinners

### ✅ ALWAYS USE:
- Custom formatted inputs (`CurrencyInput` or `PercentageInput`)
- Text inputs with proper formatting and validation
- Direct typing support with auto-formatting

### Implementation:
- **Currency fields**: Use `<CurrencyInput />` component
  - Formats as dollars with $ prefix
  - Adds comma separators (e.g., $500,000)
  - Allows direct typing
  - Auto-formats on blur
  
- **Percentage fields**: Use `<PercentageInput />` component
  - Formats as percentage with % suffix
  - Supports decimals (e.g., 22.8%)
  - Allows direct typing
  - Auto-formats on blur

### CSS Rule:
All number inputs have spinner arrows removed globally via `src/index.css`:
```css
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
```

## Validation & Formatting

- All currency inputs must format with commas
- All percentage inputs must support decimals
- Users must be able to type directly into fields
- Formatting should happen on blur, not while typing
- Validation should be non-blocking (allow typing, validate on blur)

