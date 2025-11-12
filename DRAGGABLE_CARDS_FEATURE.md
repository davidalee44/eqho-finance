# Draggable & Resizable Cards Feature

## Implementation Summary

Added a new "Edit Layout" feature that makes all cards on the investor deck draggable and resizable!

## Features

- **Toggle Edit Mode**: Click "Edit Layout" button in header
- **Visual Feedback**: Cards show grip handles when in edit mode
- **Drag & Drop**: Click and drag cards to reposition
- **Resize**: Drag bottom-right corner to resize cards
- **Reset Layout**: Button to reset all card positions
- **Persistent State**: Layout changes saved to localStorage

## Technical Details

### Libraries Added
- `interactjs` - For drag and drop functionality
- `react-grid-layout` - Grid layout system

### Key Files Modified
- `src/App.jsx` - Added edit mode state and UI controls
- `src/index.css` - Added drag/resize styling
- `src/hooks/useDraggableCards.js` - Custom hook for drag logic
- `package.json` - Added dependencies

### CSS Classes
- `.edit-mode` - Applied to container when editing
- `.draggable-card` - Applied to cards dynamically
- Visual indicators (grip icons) appear on hover

### How It Works

1. Click "Edit Layout" in the header
2. Cards get `.draggable-card` class automatically
3. CSS shows visual indicators (grip handles)
4. Interact.js enables drag and resize
5. Card positions stored in localStorage
6. Click "Lock Layout" to disable editing

## Usage

**To Enable Editing:**
- Click "Edit Layout" button in header
- Drag cards by clicking and dragging
- Resize from bottom-right corner

**To Reset:**
- Click "Reset Layout" button
- All cards return to default positions

## Notes

- Works on all 11 slides
- Layout persists across page refreshes
- Smooth transitions with visual feedback
- No changes to underlying data structure

## Browser Compatibility

Tested and working on:
- Chrome ✓
- Firefox ✓
- Safari ✓

## Recent Enhancements

### Smooth Animations
- Cards smoothly slide out of the way when dragging
- Other cards animate with cubic-bezier easing
- Transitions disabled during active drag for immediate feedback
- Reset animation with smooth easing

### Viewport Restrictions
- Cards cannot be dragged outside the viewport
- Snap-to-grid for cleaner positioning (8px grid)
- Auto-scroll when dragging near edges
- Maximum card size limits (1200x1000px)
- Minimum card size enforced (200x100px)

### Mobile Responsive
- Larger touch targets on mobile
- Visible grip handles on mobile (always visible)
- Larger resize indicators
- Responsive text sizing
- Hidden edit mode badge on small screens
- Prevents horizontal scroll on mobile

### Visual Enhancements
- Cards lift slightly on hover (scale + translate)
- Stronger shadows when dragging
- Animated grip handles (scale on hover)
- Dashed border during resize
- Smoother cubic-bezier transitions

## Mobile Usage

On mobile devices:
- Grip handles are always visible in edit mode
- Tap and hold to drag
- Pinch bottom-right corner to resize
- Larger hit areas for easier interaction

## Technical Improvements

**Interact.js Modifiers:**
- `restrict` - Keeps cards in viewport
- `snap` - 8px grid snapping for alignment
- `restrictSize` - Min/max size enforcement

**CSS Enhancements:**
- `cubic-bezier(0.4, 0, 0.2, 1)` - Natural easing
- `transform` animations for GPU acceleration
- `transition` toggling for smooth/immediate feedback
- `overflow-x: hidden` on body for mobile

**Responsive Breakpoints:**
- `@media (max-width: 768px)` for mobile adjustments
- Conditional badge visibility
- Responsive text sizes


## Window Resize Fix

**Issue:** Cards were squishing when browser window was resized.

**Solution:** 
- Added window resize event listener
- Debounced resize handler (150ms)
- Automatically resets card positions and sizes on resize
- Smooth transition back to original layout
- Cleanup on component unmount

**Behavior:**
When the browser window is resized, all card positions and custom sizes are reset to their default state. This prevents squishing and maintains proper responsive layout.

**Implementation:**
```javascript
const handleResize = () => {
  const cards = document.querySelectorAll('.draggable-card');
  cards.forEach(card => {
    card.style.transform = '';
    card.removeAttribute('data-x');
    card.removeAttribute('data-y');
    card.style.width = '';
    card.style.height = '';
  });
};

// Debounced (150ms delay)
window.addEventListener('resize', debouncedResize);
```

This ensures cards maintain their responsive grid layout regardless of viewport size.
