/**
 * IntegrationsPage
 * 
 * Admin-only page for managing external service integrations via Pipedream Connect.
 * Features official brand logos, connected app management, and exploration of available integrations.
 */

import { useAuth } from '@/contexts/AuthContext';
import { useIntegrations } from '@/hooks/useIntegrations';
import { formatDataTimestamp } from '@/lib/api';
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from './ui/alert-dialog';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';

// Official brand icons from Simple Icons
import {
    SiAirtable,
    SiGooglesheets,
    SiHubspot,
    SiMailchimp,
    SiNotion,
    SiQuickbooks,
    SiSalesforce,
    SiSlack,
    SiStripe,
    SiZapier,
} from '@icons-pack/react-simple-icons';

// ============================================================================
// Brand Logo Wrapper Components
// Wraps Simple Icons with consistent styling and brand colors
// ============================================================================

const QuickBooksLogo = ({ className = "w-10 h-10" }) => (
  <div className={`${className} rounded-lg bg-[#2CA01C] flex items-center justify-center p-2`}>
    <SiQuickbooks color="white" size="100%" />
  </div>
);

const StripeLogo = ({ className = "w-10 h-10" }) => (
  <div className={`${className} rounded-lg bg-[#635BFF] flex items-center justify-center p-2`}>
    <SiStripe color="white" size="100%" />
  </div>
);

const GoogleSheetsLogo = ({ className = "w-10 h-10" }) => (
  <div className={`${className} rounded-lg bg-[#0F9D58] flex items-center justify-center p-2`}>
    <SiGooglesheets color="white" size="100%" />
  </div>
);

const SlackLogo = ({ className = "w-10 h-10" }) => (
  <div className={`${className} rounded-lg bg-white border border-slate-200 flex items-center justify-center p-2`}>
    <SiSlack size="100%" />
  </div>
);

const HubSpotLogo = ({ className = "w-10 h-10" }) => (
  <div className={`${className} rounded-lg bg-[#FF7A59] flex items-center justify-center p-2`}>
    <SiHubspot color="white" size="100%" />
  </div>
);

const SalesforceLogo = ({ className = "w-10 h-10" }) => (
  <div className={`${className} rounded-lg bg-[#00A1E0] flex items-center justify-center p-2`}>
    <SiSalesforce color="white" size="100%" />
  </div>
);

const NotionLogo = ({ className = "w-10 h-10" }) => (
  <div className={`${className} rounded-lg bg-white border border-slate-200 flex items-center justify-center p-2`}>
    <SiNotion color="black" size="100%" />
  </div>
);

const AirtableLogo = ({ className = "w-10 h-10" }) => (
  <div className={`${className} rounded-lg bg-[#18BFFF] flex items-center justify-center p-2`}>
    <SiAirtable color="white" size="100%" />
  </div>
);

const ZapierLogo = ({ className = "w-10 h-10" }) => (
  <div className={`${className} rounded-lg bg-[#FF4A00] flex items-center justify-center p-2`}>
    <SiZapier color="white" size="100%" />
  </div>
);

const MailchimpLogo = ({ className = "w-10 h-10" }) => (
  <div className={`${className} rounded-lg bg-[#FFE01B] flex items-center justify-center p-2`}>
    <SiMailchimp color="black" size="100%" />
  </div>
);

const PipedreamLogo = ({ className = "w-10 h-10" }) => (
  <div className={`${className} rounded-lg bg-[#1B1B1B] flex items-center justify-center p-2`}>
    <svg viewBox="0 0 24 24" fill="#00D084" className="w-full h-full">
      <path d="M4 8h2v8H4V8zm4-2h2v12H8V6zm4 4h2v4h-2v-4zm4-2h2v8h-2V8z"/>
    </svg>
  </div>
);

const GenericAppLogo = ({ className = "w-10 h-10", name = "App" }) => (
  <div className={`${className} rounded-lg bg-indigo-500 flex items-center justify-center`}>
    <span className="text-white font-bold text-lg">{name.charAt(0).toUpperCase()}</span>
  </div>
);

// Logo mapping
const APP_LOGOS = {
  quickbooks: QuickBooksLogo,
  stripe: StripeLogo,
  google_sheets: GoogleSheetsLogo,
  slack: SlackLogo,
  hubspot: HubSpotLogo,
  salesforce: SalesforceLogo,
  notion: NotionLogo,
  airtable: AirtableLogo,
  zapier: ZapierLogo,
  mailchimp: MailchimpLogo,
  pipedream: PipedreamLogo,
};

// ============================================================================
// Available Integrations for "Explore" Section
// ============================================================================

const EXPLORE_INTEGRATIONS = [
  {
    id: 'hubspot',
    name: 'HubSpot',
    category: 'CRM',
    description: 'Sync contacts, deals, and marketing data',
    comingSoon: true,
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    category: 'CRM',
    description: 'Enterprise CRM integration',
    comingSoon: true,
  },
  {
    id: 'notion',
    name: 'Notion',
    category: 'Productivity',
    description: 'Database and documentation sync',
    comingSoon: true,
  },
  {
    id: 'airtable',
    name: 'Airtable',
    category: 'Database',
    description: 'Flexible database integration',
    comingSoon: true,
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    category: 'Marketing',
    description: 'Email marketing automation',
    comingSoon: true,
  },
];

// ============================================================================
// Icons
// ============================================================================

const RefreshIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
);

const PlugIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22v-5"/>
    <path d="M9 8V2"/>
    <path d="M15 8V2"/>
    <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>
  </svg>
);

const UnplugIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m19 5 3-3"/>
    <path d="m2 22 3-3"/>
    <path d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z"/>
    <path d="M7.5 13.5 10 11"/>
    <path d="M10.5 16.5 13 14"/>
    <path d="m12 6 6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0Z"/>
  </svg>
);

const PlayIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="6 3 20 12 6 21 6 3"/>
  </svg>
);

const CheckCircleIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const XCircleIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
);

const AlertCircleIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const LoaderIcon = ({ className = "w-4 h-4" }) => (
  <svg className={`${className} animate-spin`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);

const ArrowLeftIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>
);

const ChevronRightIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const HomeIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const ExternalLinkIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);

const GridIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
  </svg>
);

const SearchIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const SparklesIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    <path d="M5 3v4"/>
    <path d="M19 17v4"/>
    <path d="M3 5h4"/>
    <path d="M17 19h4"/>
  </svg>
);

// ============================================================================
// Skeleton Loading Component
// ============================================================================

const IntegrationCardSkeleton = () => (
  <Card className="relative overflow-hidden bg-white border border-slate-200 shadow-sm">
    {/* Status indicator line skeleton */}
    <div className="absolute top-0 left-0 right-0 h-1 bg-slate-200" />
    
    <CardHeader className="pb-4 pt-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {/* Logo skeleton */}
          <div className="w-14 h-14 rounded-lg bg-slate-200 animate-pulse" />
          <div className="space-y-2">
            {/* Title skeleton */}
            <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
            {/* Description skeleton */}
            <div className="h-4 w-48 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </CardHeader>
    
    <CardContent className="pt-0">
      {/* Status badge skeleton */}
      <div className="mb-4">
        <div className="h-6 w-24 bg-slate-100 rounded-full animate-pulse" />
      </div>
      
      {/* Button skeleton */}
      <div className="h-10 w-full bg-slate-200 rounded-md animate-pulse" />
    </CardContent>
  </Card>
);

// ============================================================================
// Status Configuration
// ============================================================================

const STATUS_CONFIG = {
  connected: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    icon: CheckCircleIcon,
    label: 'Connected',
  },
  active: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    icon: CheckCircleIcon,
    label: 'Active',
  },
  disconnected: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-500',
    dot: 'bg-slate-400',
    icon: UnplugIcon,
    label: 'Not Connected',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    dot: 'bg-red-500',
    icon: XCircleIcon,
    label: 'Connection Error',
  },
};

// ============================================================================
// Integration Card Component
// ============================================================================

const IntegrationCard = ({ connection, onConnect, onDisconnect, onSync, onTest }) => {
  const [testResult, setTestResult] = useState(null);
  const [testFailed, setTestFailed] = useState(false);
  const testTimeoutRef = useRef(null);
  const { app, app_name, description, status, connection_type, connected_at, last_sync, pending } = connection;
  
  // Reset testFailed when connection status changes (e.g., on refresh)
  useEffect(() => {
    setTestFailed(false);
    setTestResult(null);
  }, [status]);
  
  const LogoComponent = APP_LOGOS[app] || ((props) => <GenericAppLogo {...props} name={app_name} />);
  
  // Override status if test failed - show actual connection state
  const effectiveStatus = testFailed ? 'error' : status;
  const statusConfig = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.disconnected;
  const StatusIcon = statusConfig.icon;
  const isConnected = (status === 'connected' || status === 'active') && !testFailed;
  const isPending = !!pending;
  const isDirectApi = connection_type === 'direct_api';
  
  const dismissTestResult = () => {
    if (testTimeoutRef.current) {
      clearTimeout(testTimeoutRef.current);
      testTimeoutRef.current = null;
    }
    setTestResult(null);
  };
  
  const handleTest = async () => {
    // Clear any existing timeout
    if (testTimeoutRef.current) {
      clearTimeout(testTimeoutRef.current);
    }
    const result = await onTest(app);
    setTestResult(result);
    
    // Track if test failed to update status display
    setTestFailed(result?.status !== 'connected');
    
    // Auto-dismiss after 10 seconds
    testTimeoutRef.current = setTimeout(() => setTestResult(null), 10000);
  };
  
  return (
    <Card className={`relative overflow-hidden bg-white border border-slate-200 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-300 ${isPending ? 'opacity-75' : ''}`}>
      {/* Status indicator line - reflects actual test status */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${
        testFailed ? 'bg-red-500' : isConnected ? 'bg-emerald-500' : 'bg-slate-200'
      }`} />
      
      <CardHeader className="pb-4 pt-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <LogoComponent className="w-14 h-14 rounded-lg shadow-sm" />
              {isConnected && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                  <CheckCircleIcon className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-slate-900">{app_name}</CardTitle>
              <CardDescription className="text-slate-500 text-sm mt-1 leading-relaxed">
                {description}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Status Badge */}
        <div className="mb-4 flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={`${statusConfig.bg} ${statusConfig.border} ${statusConfig.text} font-medium px-3 py-1`}
          >
            <span className={`w-2 h-2 rounded-full ${statusConfig.dot} mr-2`} />
            {statusConfig.label}
          </Badge>
          {isConnected && isDirectApi && (
            <Badge 
              variant="outline" 
              className="bg-blue-50 border-blue-200 text-blue-700 font-medium px-2 py-0.5 text-xs"
            >
              Direct API
            </Badge>
          )}
        </div>
        
        {/* Connection Details */}
        {isConnected && (
          <div className="mb-4 p-3 bg-slate-50 rounded-lg space-y-1.5 text-sm">
            {isDirectApi ? (
              <>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Connection</span>
                  <span className="text-slate-900 font-medium">API Key (env)</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Status</span>
                  <span className="text-emerald-600 font-medium">Configured</span>
                </div>
              </>
            ) : (
              <>
                {connected_at && (
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Connected</span>
                    <span className="text-slate-900 font-medium">{formatDataTimestamp(connected_at)}</span>
                  </div>
                )}
                {last_sync && (
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Last sync</span>
                    <span className="text-slate-900 font-medium">{formatDataTimestamp(last_sync)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        
        {/* Test Result */}
        {testResult && (
          <div className={`mb-4 p-3 rounded-lg text-sm font-medium flex items-center justify-between ${
            testResult.status === 'connected' 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <span>{testResult.status === 'connected' ? '✓' : '✗'} {testResult.message}</span>
            <button 
              onClick={dismissTestResult}
              className="ml-2 p-1 hover:bg-black/5 rounded transition-colors"
              aria-label="Dismiss"
            >
              <XCircleIcon className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {!isConnected ? (
            <Button
              onClick={() => onConnect(app)}
              disabled={isPending || isDirectApi}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
            >
              {pending === 'connecting' ? (
                <LoaderIcon className="w-4 h-4 mr-2" />
              ) : (
                <PlugIcon className="w-4 h-4 mr-2" />
              )}
              Connect {app_name}
            </Button>
          ) : (
            <>
              {!isDirectApi && (
                <Button
                  onClick={() => onSync(app)}
                  disabled={isPending}
                  variant="outline"
                  className="flex-1 text-slate-700 border-slate-300 hover:bg-slate-50"
                >
                  {pending === 'syncing' ? (
                    <LoaderIcon className="w-4 h-4 mr-2" />
                  ) : (
                    <RefreshIcon className="w-4 h-4 mr-2" />
                  )}
                  Sync Data
                </Button>
              )}
              
              <Button
                onClick={handleTest}
                disabled={isPending}
                variant="outline"
                className={`text-slate-700 border-slate-300 hover:bg-slate-50 ${isDirectApi ? 'flex-1' : ''}`}
              >
                {pending === 'testing' ? (
                  <LoaderIcon className="w-4 h-4 mr-2" />
                ) : (
                  <PlayIcon className="w-4 h-4 mr-2" />
                )}
                Test
              </Button>
              
              {/* Only show disconnect for OAuth connections, not direct API */}
              {!isDirectApi && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      disabled={isPending}
                      variant="ghost"
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                      title={`Disconnect ${app_name}`}
                    >
                      <UnplugIcon className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertCircleIcon className="w-5 h-5" />
                        Disconnect {app_name}?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-slate-600">
                        <strong className="text-slate-900">Warning:</strong> This will disconnect your {app_name} integration. 
                        You will need to reconnect and re-authorize to restore the connection.
                        <br /><br />
                        Any scheduled syncs or automations using this connection will stop working.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDisconnect(app)}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Yes, Disconnect
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Explore Integration Card
// ============================================================================

const ExploreCard = ({ integration, onConnect }) => {
  const LogoComponent = APP_LOGOS[integration.id] || ((props) => <GenericAppLogo {...props} name={integration.name} />);
  
  return (
    <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <LogoComponent className="w-12 h-12 rounded-lg shadow-sm flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 truncate">{integration.name}</h3>
              {integration.comingSoon && (
                <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-600 text-xs">
                  Coming Soon
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-500 truncate">{integration.description}</p>
          </div>
          <Button
            onClick={() => onConnect(integration.id)}
            disabled={integration.comingSoon}
            variant="outline"
            size="sm"
            className={integration.comingSoon 
              ? "opacity-50 cursor-not-allowed" 
              : "text-slate-700 border-slate-300 hover:bg-slate-50"
            }
          >
            {integration.comingSoon ? 'Soon' : 'Connect'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Main Integrations Page
// ============================================================================

const IntegrationsPage = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const {
    connections,
    loading,
    error,
    pipedreamConfigured,
    lastFetched,
    connect,
    disconnect,
    sync,
    testConnection,
    refresh,
  } = useIntegrations();
  
  const [showExplore, setShowExplore] = useState(false);

  // Auth loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <LoaderIcon className="w-8 h-8 text-slate-600" />
      </div>
    );
  }

  // Admin check
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Loading state with skeleton cards
  if (loading && connections.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-200 rounded-lg animate-pulse" />
              <div>
                <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-64 bg-slate-100 rounded animate-pulse" />
              </div>
            </div>
            <div className="h-9 w-24 bg-slate-200 rounded-md animate-pulse" />
          </div>
          
          {/* Section header skeleton */}
          <div className="flex items-center justify-between mb-5">
            <div className="h-6 w-40 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
          </div>
          
          {/* Skeleton cards grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <IntegrationCardSkeleton />
            <IntegrationCardSkeleton />
            <IntegrationCardSkeleton />
            <IntegrationCardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  const connectedCount = connections.filter(c => c.status === 'connected' || c.status === 'active').length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link 
                to="/" 
                className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors"
              >
                <HomeIcon className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
            </li>
            <li>
              <ChevronRightIcon className="w-4 h-4 text-slate-300" />
            </li>
            <li>
              <Link 
                to="/admin/cashflow" 
                className="text-slate-500 hover:text-slate-700 transition-colors"
              >
                Admin
              </Link>
            </li>
            <li>
              <ChevronRightIcon className="w-4 h-4 text-slate-300" />
            </li>
            <li>
              <span className="text-slate-900 font-medium">Integrations</span>
            </li>
          </ol>
        </nav>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Integrations
            </h1>
            <p className="text-slate-500 mt-1">
              Connect your business tools and automate data sync
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">
              {connectedCount} of {connections.length} connected
            </span>
            <Button
              onClick={refresh}
              variant="outline"
              size="sm"
              className="text-slate-700 border-slate-300 hover:bg-slate-50"
            >
              <RefreshIcon className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Pipedream Status Banner */}
        {!pipedreamConfigured && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex items-start gap-3">
              <AlertCircleIcon className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-800">Pipedream Connect Not Configured</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Set PIPEDREAM_PROJECT_ID and PIPEDREAM_CLIENT_SECRET in your environment to enable OAuth connections.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200">
            <div className="flex items-start gap-3">
              <XCircleIcon className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-800">Error Loading Integrations</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Connected Integrations Section */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <div className="p-1.5 bg-slate-100 rounded-lg">
                <PlugIcon className="w-5 h-5 text-slate-700" />
              </div>
              Your Integrations
            </h2>
            <span className="text-sm text-slate-500">
              Last updated: {formatDataTimestamp(lastFetched)}
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {connections.map((conn) => (
              <IntegrationCard
                key={conn.app}
                connection={conn}
                onConnect={connect}
                onDisconnect={disconnect}
                onSync={sync}
                onTest={testConnection}
              />
            ))}
          </div>
        </div>

        <Separator className="my-10 bg-slate-200" />

        {/* Explore Integrations Section */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <div className="p-1.5 bg-indigo-100 rounded-lg">
                <SparklesIcon className="w-5 h-5 text-indigo-600" />
              </div>
              Explore More Integrations
            </h2>
            <Button
              onClick={() => setShowExplore(!showExplore)}
              variant="ghost"
              size="sm"
              className="text-slate-600"
            >
              {showExplore ? 'Show Less' : 'Show All'}
            </Button>
          </div>
          
          <p className="text-slate-500 mb-5">
            Connect to 2,400+ apps through Pipedream&apos;s universal integration platform
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {EXPLORE_INTEGRATIONS.slice(0, showExplore ? undefined : 3).map((integration) => (
              <ExploreCard
                key={integration.id}
                integration={integration}
                onConnect={connect}
              />
            ))}
          </div>
          
          {/* Browse All Link */}
          <div className="mt-6 text-center">
            <a 
              href="https://pipedream.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors shadow-sm"
            >
              <GridIcon className="w-5 h-5" />
              Browse All 2,400+ Apps
              <ExternalLinkIcon className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Powered by Pipedream */}
        <div className="mt-12 pt-8 border-t border-slate-200">
          <div className="flex items-center justify-center gap-6">
            <span className="text-sm text-slate-400">Powered by</span>
            <a 
              href="https://pipedream.com/connect"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <PipedreamLogo className="w-8 h-8" />
              <span className="font-semibold">Pipedream Connect</span>
            </a>
          </div>
          <p className="text-center text-sm text-slate-400 mt-3">
            OAuth tokens are stored securely and refreshed automatically
          </p>
        </div>
      </div>
    </div>
  );
};

export default IntegrationsPage;
