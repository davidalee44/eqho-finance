import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

// Import react-grid-layout styles
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// Import custom GridDashboard styles
import './GridDashboard.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Grid configuration
const COLS = { lg: 24, md: 20, sm: 12, xs: 8, xxs: 4 };
const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const ROW_HEIGHT = 40;
const MARGIN = [16, 16];

// Card size constraints (in grid units)
const CARD_CONSTRAINTS = {
  minW: 4,
  minH: 3,
  maxW: 24,
  maxH: 16,
};

/**
 * GridDashboard - Trello-style drag and drop grid layout for KPI cards
 * 
 * Uses react-grid-layout for smooth, responsive, auto-reflowing card arrangement.
 * Cards snap to a 24-column grid with 40px row heights.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Card elements to render in the grid
 * @param {boolean} props.editMode - Whether drag/resize is enabled
 * @param {Array} props.layout - Initial layout configuration
 * @param {Function} props.onLayoutChange - Callback when layout changes
 * @param {string} props.className - Additional CSS classes
 */
export function GridDashboard({
  children,
  editMode = false,
  layout: initialLayout,
  onLayoutChange,
  className,
}) {
  const containerRef = useRef(null);
  const [layouts, setLayouts] = useState(() => generateDefaultLayouts(children));
  const [isDragging, setIsDragging] = useState(false);
  const [currentBreakpoint, setCurrentBreakpoint] = useState('lg');

  // Generate layouts for all breakpoints from initial or default
  useEffect(() => {
    if (initialLayout && initialLayout.length > 0) {
      // Convert single layout to responsive layouts
      const responsiveLayouts = generateResponsiveLayouts(initialLayout, children);
      setLayouts(responsiveLayouts);
      console.log('[GridDashboard] Loaded saved layout with', initialLayout.length, 'items');
    } else {
      const defaultLayouts = generateDefaultLayouts(children);
      setLayouts(defaultLayouts);
      console.log('[GridDashboard] Using generated default layout');
    }
  }, [initialLayout, React.Children.count(children)]);

  // Handle layout changes
  const handleLayoutChange = useCallback((currentLayout, allLayouts) => {
    setLayouts(allLayouts);
    
    if (onLayoutChange && editMode) {
      // Debounce is handled by the caller (layoutService)
      onLayoutChange(currentLayout);
    }
  }, [onLayoutChange, editMode]);

  // Handle breakpoint changes
  const handleBreakpointChange = useCallback((newBreakpoint) => {
    setCurrentBreakpoint(newBreakpoint);
  }, []);

  // Drag event handlers for visual feedback
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragStop = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Convert children to grid items with proper keys
  const gridItems = React.Children.map(children, (child, index) => {
    if (!React.isValidElement(child)) return null;
    
    const key = child.key || `card-${index}`;
    
    return (
      <div 
        key={key} 
        className={cn(
          'grid-dashboard-item h-full',
          editMode && 'grid-dashboard-item--editable',
          isDragging && 'grid-dashboard-item--dragging-active'
        )}
      >
        {/* Drag handle - only visible in edit mode */}
        {editMode && (
          <div className="grid-dashboard-drag-handle">
            <GripVertical className="w-4 h-4" />
          </div>
        )}
        <div className="grid-dashboard-item-content h-full">
          {child}
        </div>
      </div>
    );
  });

  return (
    <div 
      ref={containerRef}
      className={cn(
        'grid-dashboard relative w-full max-w-[1400px] mx-auto',
        editMode && 'grid-dashboard--edit-mode',
        isDragging && 'grid-dashboard--dragging',
        className
      )}
    >
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={BREAKPOINTS}
        cols={COLS}
        rowHeight={ROW_HEIGHT}
        margin={MARGIN}
        containerPadding={[0, 0]}
        isDraggable={editMode}
        isResizable={editMode}
        compactType="vertical"
        preventCollision={false}
        useCSSTransforms={true}
        transformScale={1}
        // No draggableHandle - entire card is draggable for Trello-style UX
        onLayoutChange={handleLayoutChange}
        onBreakpointChange={handleBreakpointChange}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        onResizeStart={handleDragStart}
        onResizeStop={handleDragStop}
      >
        {gridItems}
      </ResponsiveGridLayout>
    </div>
  );
}

/**
 * Generate default layouts for all breakpoints based on children count
 */
function generateDefaultLayouts(children) {
  const items = React.Children.toArray(children).filter(React.isValidElement);
  const layouts = {};
  
  Object.keys(COLS).forEach(breakpoint => {
    const cols = COLS[breakpoint];
    layouts[breakpoint] = items.map((child, index) => {
      const key = child.key || `card-${index}`;
      
      // Calculate default dimensions based on breakpoint
      let w, h;
      if (breakpoint === 'lg' || breakpoint === 'md') {
        // Larger screens: 2-3 cards per row
        w = Math.min(8, cols);
        h = 5;
      } else if (breakpoint === 'sm') {
        // Medium screens: 2 cards per row
        w = Math.min(6, cols);
        h = 4;
      } else {
        // Small screens: 1 card per row
        w = cols;
        h = 4;
      }
      
      // Calculate position (flow layout)
      const cardsPerRow = Math.floor(cols / w);
      const x = (index % cardsPerRow) * w;
      const y = Math.floor(index / cardsPerRow) * h;
      
      return {
        i: key,
        x,
        y,
        w,
        h,
        ...CARD_CONSTRAINTS,
      };
    });
  });
  
  return layouts;
}

/**
 * Generate responsive layouts from a single layout configuration
 */
function generateResponsiveLayouts(layout, children) {
  const items = React.Children.toArray(children).filter(React.isValidElement);
  const layouts = {};
  
  // Create a map of existing layout items
  const layoutMap = new Map(layout.map(item => [item.i, item]));
  
  Object.keys(COLS).forEach(breakpoint => {
    const cols = COLS[breakpoint];
    const scaleFactor = cols / COLS.lg; // Scale relative to large breakpoint
    
    layouts[breakpoint] = items.map((child, index) => {
      const key = child.key || `card-${index}`;
      const existing = layoutMap.get(key);
      
      if (existing) {
        // Scale existing layout to this breakpoint
        const scaledW = Math.max(
          CARD_CONSTRAINTS.minW,
          Math.min(cols, Math.round(existing.w * scaleFactor))
        );
        
        return {
          i: key,
          x: Math.min(existing.x, cols - scaledW),
          y: existing.y,
          w: scaledW,
          h: existing.h,
          ...CARD_CONSTRAINTS,
        };
      }
      
      // Fallback to default layout
      const w = Math.min(8, cols);
      const cardsPerRow = Math.floor(cols / w);
      
      return {
        i: key,
        x: (index % cardsPerRow) * w,
        y: Math.floor(index / cardsPerRow) * 5,
        w,
        h: 5,
        ...CARD_CONSTRAINTS,
      };
    });
  });
  
  return layouts;
}

/**
 * Convert RGL layout format to backend storage format
 */
export function layoutToStorageFormat(layout) {
  return layout.map(item => ({
    id: item.i,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
  }));
}

/**
 * Convert backend storage format to RGL layout format
 */
export function storageToLayoutFormat(storageLayout) {
  return storageLayout.map(item => ({
    i: item.id,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    ...CARD_CONSTRAINTS,
  }));
}

export default GridDashboard;

