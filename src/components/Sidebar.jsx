import { useAuth } from '@/contexts/AuthContext';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { cn } from '@/lib/utils';
import {
  Activity,
  BarChart3,
  Briefcase,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Menu,
  Plug,
  RefreshCw,
  ScrollText,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';

const SIDEBAR_STORAGE_KEY = 'eqho_sidebar_open';
const INVESTOR_SLIDES_OPEN_KEY = 'eqho_investor_slides_open';
const ADMIN_SLIDES_OPEN_KEY = 'eqho_admin_slides_open';

// Slide indices that are investor-facing (polished, forward-looking)
// Based on slide titles: Executive Summary, Market Position, Business Model, Growth Strategy, Investment Terms, 36-Month Projection
const INVESTOR_SLIDE_INDICES = [0, 2, 3, 4, 5, 6];

// Admin/internal slides (detailed analysis, internal data)
// Financial Performance, SaaS Metrics, Interactive Model, Team & Compensation, AI Financial Report
const ADMIN_SLIDE_INDICES = [1, 7, 8, 9, 10];

/**
 * Collapsible Sidebar Navigation
 * 
 * Features:
 * - Grouped slides: Investor Slides and Admin Slides in collapsible sections
 * - Admin tools section (audit logs, cashflow, integrations)
 * - Collapsible design (hidden by default for investors)
 * - Persists state to localStorage
 * - Mobile-friendly overlay mode
 */
export const Sidebar = ({
  slides = [],
  currentSlideIndex = 0,
  onSlideClick,
  viewMode = 'dashboard',
  onViewModeChange,
}) => {
  const { isAdmin } = useAuth();
  const { flags, refresh: refreshFlags } = useFeatureFlags();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Initialize from localStorage or feature flag default
  const [isOpen, setIsOpen] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored !== null) {
      return stored === 'true';
    }
    return isAdmin && flags.sidebar_default_open;
  });

  // Collapsible section states
  const [investorSlidesOpen, setInvestorSlidesOpen] = useState(() => {
    const stored = localStorage.getItem(INVESTOR_SLIDES_OPEN_KEY);
    return stored !== null ? stored === 'true' : true;
  });

  const [adminSlidesOpen, setAdminSlidesOpen] = useState(() => {
    const stored = localStorage.getItem(ADMIN_SLIDES_OPEN_KEY);
    return stored !== null ? stored === 'true' : true;
  });

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isOpen));
  }, [isOpen]);

  useEffect(() => {
    localStorage.setItem(INVESTOR_SLIDES_OPEN_KEY, String(investorSlidesOpen));
  }, [investorSlidesOpen]);

  useEffect(() => {
    localStorage.setItem(ADMIN_SLIDES_OPEN_KEY, String(adminSlidesOpen));
  }, [adminSlidesOpen]);

  // Update default state when admin status changes
  useEffect(() => {
    if (isAdmin && flags.sidebar_default_open) {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (stored === null) {
        setIsOpen(true);
      }
    }
  }, [isAdmin, flags.sidebar_default_open]);

  const toggleSidebar = () => setIsOpen(!isOpen);

  // Group slides into investor and admin categories
  const { investorSlides, adminSlides } = useMemo(() => {
    const investor = [];
    const admin = [];
    
    slides.forEach((slide, index) => {
      const slideWithIndex = { ...slide, originalIndex: index };
      
      // Check if this slide index is in the investor list
      if (INVESTOR_SLIDE_INDICES.includes(index)) {
        investor.push(slideWithIndex);
      } else if (ADMIN_SLIDE_INDICES.includes(index)) {
        admin.push(slideWithIndex);
      } else {
        // Default to investor for any unclassified slides
        investor.push(slideWithIndex);
      }
    });
    
    return { investorSlides: investor, adminSlides: admin };
  }, [slides]);

  // Admin navigation items
  const adminNavItems = [
    {
      icon: ScrollText,
      label: 'Audit Logs',
      path: '/audit-logs',
      badge: null,
    },
    {
      icon: BarChart3,
      label: 'Cash Flow Dashboard',
      path: '/admin/cashflow',
      badge: null,
    },
    {
      icon: Plug,
      label: 'Integrations',
      path: '/admin/integrations',
      badge: null,
    },
  ];

  // Check if we should show sidebar based on feature flag
  if (!flags.show_sidebar && !isAdmin) {
    return null;
  }

  // Render a slide button
  const renderSlideButton = (slide, displayIndex) => (
    <button
      key={slide.originalIndex}
      onClick={() => onSlideClick?.(slide.originalIndex)}
      className={cn(
        'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        'flex items-center gap-2',
        currentSlideIndex === slide.originalIndex && viewMode === 'slide'
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground'
      )}
    >
      <span className={cn(
        'flex-shrink-0 w-5 h-5 rounded-full text-xs flex items-center justify-center',
        currentSlideIndex === slide.originalIndex && viewMode === 'slide'
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted'
      )}>
        {slide.originalIndex + 1}
      </span>
      <span className="truncate">{slide.title}</span>
    </button>
  );

  return (
    <>
      {/* Mobile Toggle Button - Fixed position */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-50 md:hidden"
        onClick={toggleSidebar}
        aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full bg-background border-r z-50 transition-all duration-300 ease-in-out',
          'flex flex-col',
          isOpen ? 'w-64' : 'w-0 md:w-16',
          'md:relative md:z-auto',
          !isOpen && 'overflow-hidden'
        )}
      >
        {/* Header */}
        <div className={cn(
          'flex items-center justify-between p-4 border-b',
          !isOpen && 'md:justify-center'
        )}>
          {isOpen ? (
            <>
              <span className="font-semibold text-sm">Navigation</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={toggleSidebar}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hidden md:flex"
              onClick={toggleSidebar}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className={cn('p-3 border-b', !isOpen && 'hidden md:block')}>
          {isOpen ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                View Mode
              </p>
              <div className="flex gap-1">
                <Button
                  variant={viewMode === 'dashboard' ? 'default' : 'ghost'}
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => onViewModeChange?.('dashboard')}
                >
                  <LayoutDashboard className="h-3 w-3 mr-1" />
                  Dashboard
                </Button>
                <Button
                  variant={viewMode === 'slide' ? 'default' : 'ghost'}
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => onViewModeChange?.('slide')}
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Slides
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1 items-center">
              <Button
                variant={viewMode === 'dashboard' ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => onViewModeChange?.('dashboard')}
                title="Dashboard View"
              >
                <LayoutDashboard className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'slide' ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => onViewModeChange?.('slide')}
                title="Slide View"
              >
                <FileText className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Slide Navigation - Scrollable with Collapsible Groups */}
        <div className={cn(
          'flex-1 overflow-y-auto',
          !isOpen && 'hidden md:block'
        )}>
          {isOpen ? (
            <div className="p-3 space-y-2">
              {/* Investor Slides Section */}
              <Collapsible 
                open={investorSlidesOpen} 
                onOpenChange={setInvestorSlidesOpen}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-2 rounded-md hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                      Investor Slides
                    </span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {investorSlides.length}
                    </Badge>
                  </div>
                  <ChevronDown 
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform duration-200",
                      investorSlidesOpen && "rotate-180"
                    )} 
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1">
                  <nav className="space-y-0.5 pl-2 border-l-2 border-primary/20 ml-2">
                    {investorSlides.map((slide, idx) => renderSlideButton(slide, idx))}
                  </nav>
                </CollapsibleContent>
              </Collapsible>

              {/* Admin Slides Section - Only show to admins */}
              {isAdmin && adminSlides.length > 0 && (
                <Collapsible 
                  open={adminSlidesOpen} 
                  onOpenChange={setAdminSlidesOpen}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-2 rounded-md hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-orange-500" />
                      <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                        Admin Slides
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-300 text-orange-600">
                        {adminSlides.length}
                      </Badge>
                    </div>
                    <ChevronDown 
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform duration-200",
                        adminSlidesOpen && "rotate-180"
                      )} 
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-1">
                    <nav className="space-y-0.5 pl-2 border-l-2 border-orange-200 ml-2">
                      {adminSlides.map((slide, idx) => renderSlideButton(slide, idx))}
                    </nav>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {slides.map((slide, index) => (
                <Button
                  key={index}
                  variant={currentSlideIndex === index && viewMode === 'slide' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-8 w-8 text-xs"
                  onClick={() => onSlideClick?.(index)}
                  title={slide.title}
                >
                  {index + 1}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <>
            <Separator />
            <div className={cn('p-3', !isOpen && 'hidden md:block')}>
              {isOpen ? (
                <>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Admin Tools
                  </p>
                  <nav className="space-y-1">
                    {adminNavItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <button
                          key={item.path}
                          onClick={() => navigate(item.path)}
                          className={cn(
                            'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                            'hover:bg-accent hover:text-accent-foreground',
                            'flex items-center gap-2',
                            isActive
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-muted-foreground'
                          )}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{item.label}</span>
                          {item.badge && (
                            <Badge variant="secondary" className="ml-auto text-xs">
                              {item.badge}
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                    
                    {/* Quick Actions */}
                    <Separator className="my-2" />
                    <button
                      onClick={refreshFlags}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                        'hover:bg-accent hover:text-accent-foreground',
                        'flex items-center gap-2 text-muted-foreground'
                      )}
                    >
                      <RefreshCw className="h-4 w-4 flex-shrink-0" />
                      <span>Refresh Flags</span>
                    </button>
                    
                    <a
                      href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/docs`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                        'hover:bg-accent hover:text-accent-foreground',
                        'flex items-center gap-2 text-muted-foreground'
                      )}
                    >
                      <Settings className="h-4 w-4 flex-shrink-0" />
                      <span>API Docs</span>
                    </a>
                  </nav>
                </>
              ) : (
                <div className="flex flex-col gap-1 items-center">
                  {adminNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Button
                        key={item.path}
                        variant={isActive ? 'default' : 'ghost'}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => navigate(item.path)}
                        title={item.label}
                      >
                        <Icon className="h-4 w-4" />
                      </Button>
                    );
                  })}
                  <Separator className="my-1 w-8" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={refreshFlags}
                    title="Refresh Flags"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer - Status */}
        <div className={cn(
          'p-3 border-t bg-muted/30',
          !isOpen && 'hidden md:block'
        )}>
          {isOpen ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="h-3 w-3 text-green-500" />
              <span>System Online</span>
              {flags.maintenance_mode && (
                <Badge variant="destructive" className="ml-auto text-xs">
                  Maintenance
                </Badge>
              )}
              {flags.read_only_mode && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  Read Only
                </Badge>
              )}
            </div>
          ) : (
            <div className="flex justify-center">
              <Activity className="h-4 w-4 text-green-500" title="System Online" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
