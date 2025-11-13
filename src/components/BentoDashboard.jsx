import React from 'react';
import { BentoCard, BentoGrid } from './ui/bento-grid';
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
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * BentoDashboard - Main dashboard showing all presentation slides as cards
 * 
 * Uses the Aceternity bento-grid component for authentic bento-style layout
 * Features:
 * - Authentic bento-style grid layout with varying card sizes
 * - Rich visual design with hover effects
 * - Clickable cards that navigate to specific slides
 * - Visual preview of each slide with icons and descriptions
 * - Responsive design for all screen sizes
 */
export const BentoDashboard = ({ slides, onSlideClick, currentSlideIndex = 0 }) => {
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
  const cardConfigs = [
    { 
      colSpan: 'col-span-3', // Full width - Executive Summary
      background: <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20" />
    },
    { 
      colSpan: 'col-span-1', // Small - Financial Performance
      background: <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-emerald-500/20 to-teal-500/20" />
    },
    { 
      colSpan: 'col-span-2', // Medium - Market Position
      background: <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-violet-500/20 to-fuchsia-500/20" />
    },
    { 
      colSpan: 'col-span-1', // Small - Business Model
      background: <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-amber-500/20 to-yellow-500/20" />
    },
    { 
      colSpan: 'col-span-1', // Small - Growth Strategy
      background: <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-blue-500/20 to-cyan-500/20" />
    },
    { 
      colSpan: 'col-span-1', // Small - Use of Funds
      background: <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-green-500/20 to-lime-500/20" />
    },
    { 
      colSpan: 'col-span-1', // Small - 36-Month Projection
      background: <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 via-pink-500/20 to-red-500/20" />
    },
    { 
      colSpan: 'col-span-2', // Medium - SaaS Metrics
      background: <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-indigo-500/20" />
    },
    { 
      colSpan: 'col-span-1', // Small - Financial Model
      background: <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 via-purple-500/20 to-fuchsia-500/20" />
    },
    { 
      colSpan: 'col-span-2', // Medium - Team & Compensation
      background: <div className="absolute inset-0 bg-gradient-to-br from-teal-500/20 via-cyan-500/20 to-blue-500/20" />
    },
    { 
      colSpan: 'col-span-1', // Small - AI Financial Report
      background: <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-red-500/20" />
    },
  ];

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
