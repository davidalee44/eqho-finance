import { useEffect } from 'react';
import interact from 'interactjs';

/**
 * Custom hook to make cards draggable and resizable
 * @param {boolean} enabled - Whether drag/resize is enabled
 */
export function useDraggableCards(enabled) {
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
        // Reset transforms and sizes on resize
        card.style.transform = '';
        card.removeAttribute('data-x');
        card.removeAttribute('data-y');
        card.style.width = '';
        card.style.height = '';
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
          // Restrict to viewport/container
          interact.modifiers.restrict({
            restriction: 'parent',
            endOnly: false,
            elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
          }),
          // Snap to grid for cleaner positioning
          interact.modifiers.snap({
            targets: [
              interact.snappers.grid({ x: 8, y: 8 })
            ],
            range: Infinity,
            relativePoints: [ { x: 0, y: 0 } ]
          })
        ],
        autoScroll: {
          container: document.querySelector('.edit-mode'),
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
          interact.modifiers.restrictSize({
            min: { width: 200, height: 100 },
            max: { width: 1200, height: 1000 }
          }),
          interact.modifiers.restrict({
            restriction: 'parent',
            endOnly: false
          })
        ],
      });

    function dragStartListener(event) {
      const target = event.target;
      target.classList.add('dragging');
      // Animate other cards out of the way
      animateOtherCards(target);
    }

    function dragMoveListener(event) {
      const target = event.target;
      const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
      const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

      // Update position with transform for smooth animation
      target.style.transform = `translate(${x}px, ${y}px)`;
      target.setAttribute('data-x', x);
      target.setAttribute('data-y', y);
    }

    function dragEndListener(event) {
      const target = event.target;
      target.classList.remove('dragging');
    }

    function resizeStartListener(event) {
      const target = event.target;
      target.classList.add('resizing');
    }

    function resizeMoveListener(event) {
      const target = event.target;
      let x = parseFloat(target.getAttribute('data-x')) || 0;
      let y = parseFloat(target.getAttribute('data-y')) || 0;

      target.style.width = event.rect.width + 'px';
      target.style.height = event.rect.height + 'px';

      x += event.deltaRect.left;
      y += event.deltaRect.top;

      target.style.transform = `translate(${x}px, ${y}px)`;
      target.setAttribute('data-x', x);
      target.setAttribute('data-y', y);
    }

    function resizeEndListener(event) {
      const target = event.target;
      target.classList.remove('resizing');
    }

    function animateOtherCards(draggedCard) {
      // Get all draggable cards
      const cards = document.querySelectorAll('.draggable-card');
      
      cards.forEach(card => {
        if (card !== draggedCard) {
          // Add smooth transition
          card.style.transition = 'transform 0.3s ease-out';
        }
      });
    }

    return () => {
      interact('.draggable-card').unset();
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimeout);
    };
  }, [enabled]);
}

