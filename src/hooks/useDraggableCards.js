/**
 * @deprecated This hook is deprecated in favor of GridDashboard component which uses react-grid-layout.
 * 
 * The new GridDashboard provides:
 * - Trello-style drag and drop with auto-reflow
 * - Smooth animations and grid snapping
 * - Responsive breakpoints
 * - Better accessibility
 * 
 * Migration:
 * 1. Replace useDraggableCards hook with GridDashboard component
 * 2. Wrap your cards in <GridDashboard editMode={true}>{cards}</GridDashboard>
 * 3. Use layoutService.saveRGLLayout() for persistence
 * 
 * This file is kept for reference and potential fallback scenarios.
 * 
 * @see src/components/GridDashboard.jsx
 * @see src/services/layoutService.js
 */

import interact from 'interactjs';
import { useEffect, useRef } from 'react';

// Grid configuration - invisible to users but enforces structure
const GRID_SIZE = 20; // 20px grid cells
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
 * Get occupied grid cells for a card
 */
function getOccupiedCells(element) {
  const rect = element.getBoundingClientRect();
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

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function assignCardIdentifiers() {
  const cards = document.querySelectorAll('.draggable-card');
  const usedIds = new Set();

  cards.forEach((card, index) => {
    let cardId = card.getAttribute('data-card-id');

    if (!cardId) {
      const existingId = card.getAttribute('id');
      if (existingId) {
        cardId = existingId;
      } else {
        const heading = card.querySelector('h1, h2, h3, h4, h5, h6');
        if (heading?.textContent) {
          cardId = slugify(heading.textContent);
        }
      }

      if (!cardId || usedIds.has(cardId)) {
        let fallback = `card-${index}`;
        let counter = 1;
        while (usedIds.has(fallback)) {
          fallback = `card-${index}-${counter++}`;
        }
        cardId = fallback;
      }

      card.setAttribute('data-card-id', cardId);
    }

    if (usedIds.has(cardId)) {
      let dedupedId = cardId;
      let counter = 1;
      while (usedIds.has(dedupedId)) {
        dedupedId = `${cardId}-${counter++}`;
      }
      card.setAttribute('data-card-id', dedupedId);
      usedIds.add(dedupedId);
    } else {
      usedIds.add(cardId);
    }
  });
}

/**
 * Check if draggable cards exist in the DOM
 */
function checkCardsExist() {
  const cards = document.querySelectorAll('.draggable-card');
  return cards.length > 0;
}

/**
 * Wait for cards to be available in the DOM
 * Returns a promise that resolves when cards are found or times out
 */
function waitForCards(maxAttempts = 20, delay = 100) {
  return new Promise((resolve) => {
    let attempts = 0;
    
    const check = () => {
      attempts++;
      const cardsExist = checkCardsExist();
      
      if (cardsExist) {
        resolve(true);
        return;
      }
      
      if (attempts >= maxAttempts) {
        console.warn('[useDraggableCards] Cards not found after', attempts, 'attempts');
        resolve(false);
        return;
      }
      
      setTimeout(check, delay);
    };
    
    check();
  });
}

export function useDraggableCards(enabled, onLayoutChange) {
  const lastValidPosition = useRef(new Map());
  const interactInstance = useRef(null);
  const resizeTimeoutRef = useRef(null);
  const debouncedResizeRef = useRef(null);
  
  useEffect(() => {
    if (!enabled) {
      // Cleanup any existing interactions
      if (interactInstance.current) {
        interactInstance.current.unset();
        interactInstance.current = null;
      }
      if (debouncedResizeRef.current) {
        window.removeEventListener('resize', debouncedResizeRef.current);
        debouncedResizeRef.current = null;
      }
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
    const debouncedResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(handleResize, 150);
    };
    
    debouncedResizeRef.current = debouncedResize;
    window.addEventListener('resize', debouncedResize);

    // Initialize interact.js after cards are available
    const initializeInteract = async () => {
      try {
        // Wait for cards to exist in DOM
        const cardsFound = await waitForCards(20, 100);
        
        if (!cardsFound) {
          console.warn('[useDraggableCards] No draggable cards found after waiting. Make sure cards have the .draggable-card class and are rendered in the DOM.');
          return;
        }
        
        const cards = document.querySelectorAll('.draggable-card');
        if (cards.length === 0) {
          console.warn('[useDraggableCards] Cards were found but querySelectorAll returned 0 results. This may indicate a timing issue.');
          return;
        }
        
        console.log('[useDraggableCards] Found', cards.length, 'draggable cards');

        try {
          assignCardIdentifiers();
        } catch (error) {
          console.error('[useDraggableCards] Error assigning card identifiers:', error);
          // Continue anyway - cards might still work without IDs
        }

        // Store interact instance for cleanup
        try {
          interactInstance.current = interact('.draggable-card')
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
      
          console.log('[useDraggableCards] Interact.js initialized successfully');
        } catch (error) {
          console.error('[useDraggableCards] Error initializing interact.js:', error);
          interactInstance.current = null;
          return;
        }
      } catch (error) {
        console.error('[useDraggableCards] Unexpected error during initialization:', error);
      }
    };

    // Use requestAnimationFrame to ensure DOM is ready, then wait for cards
    const rafId = requestAnimationFrame(() => {
      initializeInteract();
    });

    function dragStartListener(event) {
      try {
        const target = event.target;
        target.classList.add('dragging');
        
        // Store last valid position
        let cardId = target.getAttribute('data-card-id');
        if (!cardId) {
          try {
            assignCardIdentifiers();
            cardId = target.getAttribute('data-card-id');
          } catch (error) {
            console.warn('[useDraggableCards] Error assigning card ID during drag start:', error);
            cardId = `card-${Date.now()}`;
            target.setAttribute('data-card-id', cardId);
          }
        }
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
      } catch (error) {
        console.error('[useDraggableCards] Error in dragStartListener:', error);
      }
    }

    function dragMoveListener(event) {
      try {
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
      } catch (error) {
        console.error('[useDraggableCards] Error in dragMoveListener:', error);
      }
    }

    function dragEndListener(event) {
      try {
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
            try {
              saveLayoutState();
            } catch (error) {
              console.error('[useDraggableCards] Error saving layout state:', error);
            }
          }
        }
      } catch (error) {
        console.error('[useDraggableCards] Error in dragEndListener:', error);
      }
    }

    function resizeStartListener(event) {
      try {
        const target = event.target;
        target.classList.add('resizing');
      } catch (error) {
        console.error('[useDraggableCards] Error in resizeStartListener:', error);
      }
    }

    function resizeMoveListener(event) {
      try {
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
      } catch (error) {
        console.error('[useDraggableCards] Error in resizeMoveListener:', error);
      }
    }

    function resizeEndListener(event) {
      try {
        const target = event.target;
        target.classList.remove('resizing');
        target.style.boxShadow = '';
        
        const x = parseFloat(target.getAttribute('data-x')) || 0;
        const y = parseFloat(target.getAttribute('data-y')) || 0;
        
        // Verify final size doesn't collide
        if (wouldCollide(target, x, y, target.offsetWidth, target.offsetHeight)) {
          // Revert to last valid state (would need to store size too)
          // For now, just notify user
          console.warn('[useDraggableCards] Resize would cause collision');
        } else {
          // Save layout change
          if (onLayoutChange) {
            try {
              saveLayoutState();
            } catch (error) {
              console.error('[useDraggableCards] Error saving layout state after resize:', error);
            }
          }
        }
      } catch (error) {
        console.error('[useDraggableCards] Error in resizeEndListener:', error);
      }
    }

    function saveLayoutState() {
      try {
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
      } catch (error) {
        console.error('[useDraggableCards] Error in saveLayoutState:', error);
        throw error; // Re-throw so caller can handle
      }
    }

    return () => {
      cancelAnimationFrame(rafId);
      if (interactInstance.current) {
        interactInstance.current.unset();
        interactInstance.current = null;
      }
      if (debouncedResizeRef.current) {
        window.removeEventListener('resize', debouncedResizeRef.current);
        debouncedResizeRef.current = null;
      }
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;
      }
    };
  }, [enabled, onLayoutChange]);
}
