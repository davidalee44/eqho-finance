import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const FULL_WIDTH_PX = 120;
const COLLAPSED_WIDTH_PX = 35;
const GAP_PX = 2;
const MARGIN_PX = 2;

/**
 * SlideThumbnails - Bottom navigation bar with expandable thumbnails
 * 
 * Features:
 * - Active thumbnail expands to 120px, others collapse to 35px
 * - Auto-scrolls to keep active thumbnail centered
 * - Click to jump to specific slide
 * - Smooth animations
 */
export const SlideThumbnails = ({ slides, index, setIndex }) => {
  const thumbnailsRef = useRef(null);

  // Auto-scroll to center active thumbnail
  useEffect(() => {
    if (thumbnailsRef.current) {
      let scrollPosition = 0;
      
      // Calculate scroll position based on collapsed widths
      for (let i = 0; i < index; i++) {
        scrollPosition += COLLAPSED_WIDTH_PX + GAP_PX;
      }
      
      scrollPosition += MARGIN_PX;
      
      // Center the active (expanded) thumbnail
      const containerWidth = thumbnailsRef.current.offsetWidth;
      const centerOffset = containerWidth / 2 - FULL_WIDTH_PX / 2;
      scrollPosition -= centerOffset;

      thumbnailsRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'smooth',
      });
    }
  }, [index]);

  return (
    <div
      ref={thumbnailsRef}
      className="overflow-x-auto"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      <style>{`
        .overflow-x-auto::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="flex gap-0.5 h-20 pb-2 pt-2" style={{ width: 'fit-content' }}>
        {slides.map((slide, i) => (
          <motion.button
            key={slide.id}
            onClick={() => setIndex(i)}
            initial={false}
            animate={i === index ? 'active' : 'inactive'}
            variants={{
              active: {
                width: FULL_WIDTH_PX,
                marginLeft: MARGIN_PX,
                marginRight: MARGIN_PX,
              },
              inactive: {
                width: COLLAPSED_WIDTH_PX,
                marginLeft: 0,
                marginRight: 0,
              },
            }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative shrink-0 h-full overflow-hidden rounded bg-muted hover:bg-muted/80 transition-colors"
            aria-label={`Go to slide ${i + 1}: ${slide.title}`}
          >
            {/* Thumbnail Preview */}
            <div className="w-full h-full flex items-center justify-center p-2">
              {slide.thumbnail ? (
                <img
                  src={slide.thumbnail}
                  alt={slide.title}
                  className="w-full h-full object-cover pointer-events-none select-none"
                  draggable={false}
                />
              ) : (
                <div className="text-center">
                  <div className="text-xs font-medium text-muted-foreground truncate">
                    {i === index ? slide.title : `${i + 1}`}
                  </div>
                  {slide.icon && (
                    <div className="mt-1 flex items-center justify-center">
                      {slide.icon}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Active Indicator */}
            {i === index && (
              <motion.div
                layoutId="activeThumbnail"
                className="absolute bottom-0 left-0 right-0 h-1 bg-primary"
                initial={false}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

