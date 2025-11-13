import { useEffect, useRef } from 'react';
import interact from 'interactjs';

// Grid configuration - invisible to users but enforces structure
const GRID_SIZE = 20; // 20px grid cells
const GRID_COLUMNS = 24; // 24 columns for responsive layouts
const MIN_CARD_WIDTH = 240; // 4 columns minimum
const MIN_CARD_HEIGHT = 180; // 3 rows minimum
const MAX_CARD_WIDTH = 720; // 12 columns maximum
const MAX_CARD_HEIGHT = 480; // 8 rows maximum

/**
 * Calculate grid cell coordinates from pixel position
 */
function pixelsToGrid(pixels) {
  return Math.round(pixels / GRID_SIZE);
}

/**
 * Calculate pixel position from grid cell coordinates
 */
function gridToPixels(gridUnits) {
  return gridUnits * GRID_SIZE;
}

/**
 * Get occupied grid cells for a card
 */
function getOccupiedCells(element) {
  const rect = element.getBoundingClientRect();
  const parent = element.parentElement.getBoundingClientRect();
  
  const x = parseFloat(element.getAttribute('data-x')) || 0;
  const y = parseFloat(element.getAttribute('data-y')) || 0;
  
  const gridX = pixelsToGrid(x);
  const gridY = pixelsToGrid(y);
  const gridWidth = pixelsToGrid(rect.width);
  const gridHeight = pixelsToGrid(rect.height);
  
  const cells = [];
  for (let row = gridY; row < gridY + gridHeight; row++) {
    for (let col = gridX; col < gridX + gridWidth; col++) {
      cells.push(`${row},${col}`);
    }
  }
  
  return {
    cells,
    gridX,
    gridY,
    gridWidth,
    gridHeight
  };
}

/**
 * Check if new position would cause collision with other cards
 */
function wouldCollide(movingElement, newX, newY, newWidth, newHeight) {
  const cards = document.querySelectorAll('.draggable-card');
  
  const newGridX = pixelsToGrid(newX);
  const newGridY = pixelsToGrid(newY);
  const newGridWidth = pixelsToGrid(newWidth || movingElement.offsetWidth);
  const newGridHeight = pixelsToGrid(newHeight || movingElement.offsetHeight);
  
  // Calculate cells the card would occupy
  const newCells = new Set();
  for (let row = newGridY; row < newGridY + newGridHeight; row++) {
    for (let col = newGridX; col < newGridX + newGridWidth; col++) {
      newCells.add(`${row},${col}`);
    }
  }
  
  // Check against all other cards
  for (const card of cards) {
    if (card === movingElement) continue;
    
    const occupied = getOccupiedCells(card);
    
    // Check for overlap
    for (const cell of occupied.cells) {
      if (newCells.has(cell)) {
        return true; // Collision detected
      }
    }
  }
  
  return false; // No collision
}

/**
 * Custom hook to make cards draggable and resizable with collision detection
 * @param {boolean} enabled - Whether drag/resize is enabled (admin only)
 * @param {function} onLayoutChange - Callback when layout changes
 */
export function useDraggableCards(enabled, onLayoutChange) {
  const lastValidPosition = useRef(new Map());
  
  useEffect(() => {
    if (!enabled) {
      // Cleanup any existing interactions
      interact('.draggable-card').unset();
      return;
    }

    // Handle window resize - reset card positions
    const handleResize = () => {
      const cards = document.querySelectorAll('.draggable-card');
      cards.forEach(card => {
        // Validate positions are still within bounds
        const x = parseFloat(card.getAttribute('data-x')) || 0;
        const y = parseFloat(card.getAttribute('data-y')) || 0;
        
        // Re-apply transform to ensure consistency
        card.style.transform = `translate(${x}px, ${y}px)`;
      });
    };

    // Debounced resize handler
    let resizeTimeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', debouncedResize);

    // Make cards draggable
    interact('.draggable-card')
      .draggable({
        inertia: false,
        modifiers: [
          // Restrict to parent container
          interact.modifiers.restrict({
            restriction: 'parent',
            endOnly: false,
            elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
          }),
          // Invisible grid snapping
          interact.modifiers.snap({
            targets: [
              interact.snappers.grid({ x: GRID_SIZE, y: GRID_SIZE })
            ],
            range: Infinity,
            relativePoints: [ { x: 0, y: 0 } ]
          })
        ],
        autoScroll: {
          container: document.querySelector('.edit-mode') || window,
          margin: 50,
          speed: 300
        },
        listeners: {
          start: dragStartListener,
          move: dragMoveListener,
          end: dragEndListener
        }
      })
      .resizable({
        edges: { left: false, right: true, bottom: true, top: false },
        listeners: {
          start: resizeStartListener,
          move: resizeMoveListener,
          end: resizeEndListener
        },
        modifiers: [
          // Enforce min/max sizes
          interact.modifiers.restrictSize({
            min: { width: MIN_CARD_WIDTH, height: MIN_CARD_HEIGHT },
            max: { width: MAX_CARD_WIDTH, height: MAX_CARD_HEIGHT }
          }),
          // Snap resize to grid
          interact.modifiers.snapSize({
            targets: [
              interact.snappers.grid({ width: GRID_SIZE, height: GRID_SIZE })
            ]
          }),
          // Keep within parent
          interact.modifiers.restrict({
            restriction: 'parent',
            endOnly: false
          })
        ],
      });

    function dragStartListener(event) {
      const target = event.target;
      target.classList.add('dragging');
      
      // Store last valid position
      const cardId = target.getAttribute('data-card-id');
      const x = parseFloat(target.getAttribute('data-x')) || 0;
      const y = parseFloat(target.getAttribute('data-y')) || 0;
      lastValidPosition.current.set(cardId, { x, y });
      
      // Visual feedback for other cards
      const cards = document.querySelectorAll('.draggable-card');
      cards.forEach(card => {
        if (card !== target) {
          card.style.opacity = '0.6';
        }
      });
    }

    function dragMoveListener(event) {
      const target = event.target;
      const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
      const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

      // Check for collision at new position
      if (!wouldCollide(target, x, y)) {
        // Update position if no collision
        target.style.transform = `translate(${x}px, ${y}px)`;
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
      } else {
        // Visual feedback for collision
        target.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.5)';
      }
    }

    function dragEndListener(event) {
      const target = event.target;
      target.classList.remove('dragging');
      
      // Remove collision indicator
      target.style.boxShadow = '';
      
      // Restore opacity to other cards
      const cards = document.querySelectorAll('.draggable-card');
      cards.forEach(card => {
        card.style.opacity = '';
      });
      
      const x = parseFloat(target.getAttribute('data-x')) || 0;
      const y = parseFloat(target.getAttribute('data-y')) || 0;
      
      // Verify final position doesn't collide
      if (wouldCollide(target, x, y)) {
        // Revert to last valid position
        const cardId = target.getAttribute('data-card-id');
        const lastValid = lastValidPosition.current.get(cardId);
        if (lastValid) {
          target.style.transform = `translate(${lastValid.x}px, ${lastValid.y}px)`;
          target.setAttribute('data-x', lastValid.x);
          target.setAttribute('data-y', lastValid.y);
        }
      } else {
        // Save layout change
        if (onLayoutChange) {
          saveLayoutState();
        }
      }
    }

    function resizeStartListener(event) {
      const target = event.target;
      target.classList.add('resizing');
    }

    function resizeMoveListener(event) {
      const target = event.target;
      let x = parseFloat(target.getAttribute('data-x')) || 0;
      let y = parseFloat(target.getAttribute('data-y')) || 0;

      // Update width and height
      target.style.width = event.rect.width + 'px';
      target.style.height = event.rect.height + 'px';

      // Adjust position if edges moved
      x += event.deltaRect.left;
      y += event.deltaRect.top;

      // Check for collision with new size
      if (!wouldCollide(target, x, y, event.rect.width, event.rect.height)) {
        target.style.transform = `translate(${x}px, ${y}px)`;
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
      } else {
        // Show collision indicator
        target.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.5)';
      }
    }

    function resizeEndListener(event) {
      const target = event.target;
      target.classList.remove('resizing');
      target.style.boxShadow = '';
      
      const x = parseFloat(target.getAttribute('data-x')) || 0;
      const y = parseFloat(target.getAttribute('data-y')) || 0;
      
      // Verify final size doesn't collide
      if (wouldCollide(target, x, y, target.offsetWidth, target.offsetHeight)) {
        // Revert to last valid state (would need to store size too)
        // For now, just notify user
        console.warn('Resize would cause collision');
      } else {
        // Save layout change
        if (onLayoutChange) {
          saveLayoutState();
        }
      }
    }

    function saveLayoutState() {
      const cards = document.querySelectorAll('.draggable-card');
      const layout = Array.from(cards).map(card => {
        const cardId = card.getAttribute('data-card-id');
        const x = parseFloat(card.getAttribute('data-x')) || 0;
        const y = parseFloat(card.getAttribute('data-y')) || 0;
        const width = card.offsetWidth;
        const height = card.offsetHeight;
        
        return {
          id: cardId,
          x: pixelsToGrid(x),
          y: pixelsToGrid(y),
          width: pixelsToGrid(width),
          height: pixelsToGrid(height),
        };
      });
      
      if (onLayoutChange) {
        onLayoutChange(layout);
      }
    }

    return () => {
      interact('.draggable-card').unset();
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimeout);
    };
  }, [enabled, onLayoutChange]);
}
