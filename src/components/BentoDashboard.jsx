import React, { useState, useEffect } from 'react';
import { BentoCard, BentoGrid } from './ui/bento-grid';
import { GridDashboard } from './GridDashboard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { fetchRGLLayout, saveRGLLayout } from '@/services/layoutService';
import { useAuth } from '@/contexts/AuthContext';
import { 
  BarChart, 
  TrendingUp, 
  Target, 
  Zap, 
  DollarSign, 
  Users, 
  Calendar,
  FileText,
  Presentation,
  PieChart,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * BentoDashboard - Main dashboard showing all presentation slides as cards
 * 
 * Now uses GridDashboard (react-grid-layout) for drag-and-drop card arrangement.
 * Features:
 * - Trello-style drag and drop with auto-reflow
 * - Smooth animations and grid snapping
 * - Responsive design for all screen sizes
 * - Admin-only edit mode with layout persistence
 */
export const BentoDashboard = ({ 
  slides, 
  onSlideClick, 
  currentSlideIndex = 0,
  editMode = false,
  onLayoutChange,
}) => {
  const { isAdmin, user } = useAuth();
  const [layout, setLayout] = useState([]);
  const [layoutLoaded, setLayoutLoaded] = useState(false);
  
  // Fetch saved layout on mount (always for admins, so it's ready when edit mode is toggled)
  useEffect(() => {
    const loadLayout = async () => {
      try {
        const savedLayout = await fetchRGLLayout();
        // fetchRGLLayout now always returns a valid layout (saved, localStorage, or default)
        setLayout(savedLayout);
        setLayoutLoaded(true);
        console.log('[BentoDashboard] Layout loaded:', savedLayout.length, 'items');
      } catch (error) {
        console.error('[BentoDashboard] Failed to load layout:', error);
        setLayoutLoaded(true); // Still mark as loaded so we don't block rendering
      }
    };
    
    if (isAdmin && !layoutLoaded) {
      loadLayout();
    }
  }, [isAdmin, layoutLoaded]);
  
  // Handle layout changes
  const handleLayoutChange = async (newLayout) => {
    if (!isAdmin || !user) return;
    
    // Update local state immediately for persistence
    setLayout(newLayout);
    
    try {
      // saveRGLLayout saves to localStorage immediately and attempts backend save
      await saveRGLLayout(newLayout, user.id);
      onLayoutChange?.(newLayout);
    } catch (error) {
      // Layout is still saved to localStorage even if backend fails
      console.error('[BentoDashboard] Backend save failed (localStorage saved):', error);
    }
  };
  // Icon mapping for each slide type
  const slideIcons = [
    Presentation, // Executive Summary
    BarChart,     // Financial Performance
    Target,       // Market Position
    Zap,          // Business Model
    TrendingUp,   // Growth Strategy
    DollarSign,   // Use of Funds
    Calendar,     // 36-Month Projection
    PieChart,     // SaaS Metrics
    FileText,     // Financial Model
    Users,        // Team & Compensation
    AlertTriangle // AI Financial Report
  ];

  // Define card configurations with sizes and backgrounds
  // Using col-span classes: 1 = small, 2 = medium, 3 = large (full width in 3-col grid)
  // Clean minimal design - all white cards
  const cardConfigs = [
    { 
      colSpan: 'col-span-3', // Full width - Executive Summary
      background: <div className="absolute inset-0 bg-white" />
    },
    { 
      colSpan: 'col-span-1', // Small - Financial Performance
      background: <div className="absolute inset-0 bg-white" />
    },
    { 
      colSpan: 'col-span-2', // Medium - Market Position
      background: <div className="absolute inset-0 bg-white" />
    },
    { 
      colSpan: 'col-span-1', // Small - Business Model
      background: <div className="absolute inset-0 bg-white" />
    },
    { 
      colSpan: 'col-span-1', // Small - Growth Strategy
      background: <div className="absolute inset-0 bg-white" />
    },
    { 
      colSpan: 'col-span-1', // Small - Use of Funds
      background: <div className="absolute inset-0 bg-white" />
    },
    { 
      colSpan: 'col-span-1', // Small - 36-Month Projection
      background: <div className="absolute inset-0 bg-white" />
    },
    { 
      colSpan: 'col-span-2', // Medium - SaaS Metrics
      background: <div className="absolute inset-0 bg-white" />
    },
    { 
      colSpan: 'col-span-1', // Small - Financial Model
      background: <div className="absolute inset-0 bg-white" />
    },
    { 
      colSpan: 'col-span-2', // Medium - Team & Compensation
      background: <div className="absolute inset-0 bg-white" />
    },
    { 
      colSpan: 'col-span-1', // Small - AI Financial Report
      background: <div className="absolute inset-0 bg-white" />
    },
  ];

  // Render using GridDashboard for drag-and-drop support
  if (editMode && isAdmin) {
    return (
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            Presentation Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Drag cards to reposition • Changes are saved automatically
          </p>
        </div>

        {/* Draggable Grid */}
        <GridDashboard
          editMode={editMode}
          layout={layout}
          onLayoutChange={handleLayoutChange}
        >
          {slides.map((slide, index) => {
            const Icon = slideIcons[index] || Presentation;
            const isActive = index === currentSlideIndex;

            return (
              <Card
                key={`slide-${index}`}
                className={cn(
                  'h-full transition-all select-none',
                  'cursor-grab active:cursor-grabbing',
                  'hover:shadow-xl hover:border-primary/50',
                  isActive && 'ring-2 ring-primary ring-offset-2'
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <Icon className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-lg">{slide.title}</CardTitle>
                      <CardDescription className="text-sm line-clamp-2">
                        {slide.subtitle}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span className="opacity-60">Drag to reposition</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </GridDashboard>

        {/* Footer Info */}
        <div className="text-center space-y-2 pt-6 border-t">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">{slides.length} slides</span> available • Drag to reposition
          </p>
        </div>
      </div>
    );
  }

  // Default: Read-only bento grid layout
  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">
          Presentation Dashboard
        </h1>
        <p className="text-muted-foreground text-lg">
          Navigate through all presentation slides
        </p>
      </div>

      {/* Bento Grid */}
      <BentoGrid className="md:grid-cols-3">
        {slides.map((slide, index) => {
          const Icon = slideIcons[index] || Presentation;
          const config = cardConfigs[index] || { 
            colSpan: 'col-span-1',
            background: <div className="absolute inset-0 bg-gradient-to-br from-gray-500/20 to-gray-500/10" />
          };
          const isActive = index === currentSlideIndex;

          return (
            <BentoCard
              key={index}
              name={slide.title}
              description={slide.subtitle}
              href="#"
              cta="View Slide"
              Icon={Icon}
              background={config.background}
              onClick={() => onSlideClick?.(index)}
              className={cn(
                config.colSpan,
                isActive && 'ring-2 ring-primary ring-offset-2'
              )}
            />
          );
        })}
      </BentoGrid>

      {/* Footer Info */}
      <div className="text-center space-y-2 pt-6 border-t">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">{slides.length} slides</span> available • Click any card to navigate
        </p>
        <p className="text-xs text-muted-foreground/70">
          Use arrow keys or click cards to navigate between slides
        </p>
      </div>
    </div>
  );
};
