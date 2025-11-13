import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from './ui/button';
import { SlideThumbnails } from './SlideThumbnails';

/**
 * ReportCarousel - Presentation-style slideshow for financial reports
 * 
 * Features:
 * - Drag-to-swipe navigation with velocity detection
 * - Previous/Next button controls
 * - Keyboard navigation (arrow keys, Escape)
 * - Bottom thumbnail navigator
 * - Slide counter overlay
 * - Auto-advance timer (optional)
 */
export const ReportCarousel = ({ slides, onExit, autoAdvanceInterval = null }) => {
  const [index, setIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);
  const x = useMotionValue(0);
  const autoAdvanceTimer = useRef(null);

  // Animate to current slide when index changes
  useEffect(() => {
    if (!isDragging && containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth || 1;
      const targetX = -index * containerWidth;
      animate(x, targetX, {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      });
    }
  }, [index, x, isDragging]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onExit?.();
      } else if (e.key === 'Home') {
        e.preventDefault();
        setIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setIndex(slides.length - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [index, slides.length, onExit]);

  // Auto-advance timer
  useEffect(() => {
    if (autoAdvanceInterval && autoAdvanceInterval > 0) {
      autoAdvanceTimer.current = setInterval(() => {
        setIndex((current) => {
          if (current >= slides.length - 1) {
            return 0; // Loop back to start
          }
          return current + 1;
        });
      }, autoAdvanceInterval);

      return () => {
        if (autoAdvanceTimer.current) {
          clearInterval(autoAdvanceTimer.current);
        }
      };
    }
  }, [autoAdvanceInterval, slides.length]);

  const handlePrevious = () => {
    setIndex((i) => Math.max(0, i - 1));
    // Reset auto-advance timer on manual navigation
    if (autoAdvanceTimer.current) {
      clearInterval(autoAdvanceTimer.current);
    }
  };

  const handleNext = () => {
    setIndex((i) => Math.min(slides.length - 1, i + 1));
    // Reset auto-advance timer on manual navigation
    if (autoAdvanceTimer.current) {
      clearInterval(autoAdvanceTimer.current);
    }
  };

  const handleDragEnd = (e, info) => {
    setIsDragging(false);
    const containerWidth = containerRef.current?.offsetWidth || 1;
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    let newIndex = index;

    // Fast swipe: use velocity
    if (Math.abs(velocity) > 500) {
      newIndex = velocity > 0 ? index - 1 : index + 1;
    }
    // Slow drag: use threshold (30% of container width)
    else if (Math.abs(offset) > containerWidth * 0.3) {
      newIndex = offset > 0 ? index - 1 : index + 1;
    }

    // Clamp index to valid range
    newIndex = Math.max(0, Math.min(slides.length - 1, newIndex));
    setIndex(newIndex);

    // Reset auto-advance timer on manual navigation
    if (autoAdvanceTimer.current) {
      clearInterval(autoAdvanceTimer.current);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Exit Button */}
      {onExit && (
        <Button
          onClick={onExit}
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-50 rounded-full bg-background/80 hover:bg-background shadow-lg"
          aria-label="Exit presentation mode"
        >
          <X className="h-5 w-5" />
        </Button>
      )}

      {/* Main Carousel */}
      <div className="flex flex-col h-full">
        {/* Slides Container */}
        <div className="flex-1 relative overflow-hidden" ref={containerRef}>
          <motion.div
            className="flex h-full"
            drag="x"
            dragElastic={0.2}
            dragMomentum={false}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            style={{ x, cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            {slides.map((slide, idx) => (
              <div
                key={slide.id}
                className="shrink-0 w-full h-full overflow-y-auto"
                style={{ userSelect: isDragging ? 'none' : 'auto' }}
              >
                <div className="min-h-full p-8 flex items-center justify-center">
                  <div className="w-full max-w-7xl">
                    {slide.component}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Previous Button - Middle Left */}
          <Button
            disabled={index === 0}
            onClick={handlePrevious}
            variant="ghost"
            size="icon"
            className={`absolute left-8 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full shadow-2xl transition-all z-20
              ${
                index === 0
                  ? 'opacity-20 cursor-not-allowed'
                  : 'bg-background/90 hover:bg-background hover:scale-125 hover:shadow-3xl'
              }`}
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-10 h-10" />
          </Button>

          {/* Next Button - Middle Right */}
          <Button
            disabled={index === slides.length - 1}
            onClick={handleNext}
            variant="ghost"
            size="icon"
            className={`absolute right-8 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full shadow-2xl transition-all z-20
              ${
                index === slides.length - 1
                  ? 'opacity-20 cursor-not-allowed'
                  : 'bg-background/90 hover:bg-background hover:scale-125 hover:shadow-3xl'
              }`}
            aria-label="Next slide"
          >
            <ChevronRight className="w-10 h-10" />
          </Button>
        </div>

        {/* Footer - Always Visible */}
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/98 backdrop-blur-md border-t shadow-lg">
          {/* Slide Counter - Prominent */}
          <div className="flex items-center justify-center py-3 border-b">
            <div className="bg-primary/10 text-primary px-6 py-2 rounded-full text-base font-semibold">
              Slide {index + 1} of {slides.length}
            </div>
          </div>
          
          {/* Thumbnail Navigator */}
          <SlideThumbnails
            slides={slides}
            index={index}
            setIndex={setIndex}
          />
        </div>
      </div>
    </div>
  );
};

