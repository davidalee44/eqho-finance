/**
 * IntegrationsPage
 * 
 * Admin-only page for managing external service integrations via Pipedream Connect.
 * Displays connection cards for QuickBooks, Stripe, Google Sheets, and Slack.
 * 
 * Light theme design matching the dashboard and financial reports.
 */

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { useIntegrations } from '@/hooks/useIntegrations';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { formatDataTimestamp } from '@/lib/api';

// ============================================================================
// Brand Icons - Clean SVG icons for each integration
// ============================================================================

const QuickBooksIcon = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#2CA01C"/>
    <path d="M12 14C12 12.8954 12.8954 12 14 12H16C18.2091 12 20 13.7909 20 16V24C20 25.1046 19.1046 26 18 26H16C13.7909 26 12 24.2091 12 22V14Z" fill="white"/>
    <path d="M20 16C20 13.7909 21.7909 12 24 12H26C27.1046 12 28 12.8954 28 14V22C28 24.2091 26.2091 26 24 26H22C20.8954 26 20 25.1046 20 24V16Z" fill="white"/>
    <circle cx="16" cy="20" r="2" fill="#2CA01C"/>
    <circle cx="24" cy="20" r="2" fill="#2CA01C"/>
  </svg>
);

const StripeIcon = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#635BFF"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M18.64 16.44C18.64 15.44 19.48 15 20.76 15C22.58 15 24.86 15.6 26.68 16.58V11.52C24.68 10.68 22.7 10.32 20.76 10.32C16.26 10.32 13.32 12.68 13.32 16.68C13.32 22.92 21.82 21.88 21.82 24.58C21.82 25.74 20.78 26.16 19.42 26.16C17.44 26.16 14.9 25.36 12.88 24.24V29.38C15.12 30.38 17.38 30.82 19.42 30.82C24.04 30.82 27.16 28.54 27.16 24.48C27.14 17.72 18.64 18.98 18.64 16.44Z" fill="white"/>
  </svg>
);

const GoogleSheetsIcon = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#0F9D58"/>
    <rect x="10" y="8" width="20" height="24" rx="2" fill="white"/>
    <rect x="12" y="12" width="6" height="4" fill="#0F9D58"/>
    <rect x="20" y="12" width="8" height="4" fill="#E8EAED"/>
    <rect x="12" y="18" width="6" height="4" fill="#E8EAED"/>
    <rect x="20" y="18" width="8" height="4" fill="#E8EAED"/>
    <rect x="12" y="24" width="6" height="4" fill="#E8EAED"/>
    <rect x="20" y="24" width="8" height="4" fill="#E8EAED"/>
    <path d="M10 10C10 8.89543 10.8954 8 12 8H22L30 16V30C30 31.1046 29.1046 32 28 32H12C10.8954 32 10 31.1046 10 30V10Z" fill="white" fillOpacity="0"/>
    <path d="M22 8L30 16H24C22.8954 16 22 15.1046 22 14V8Z" fill="#0F9D58" fillOpacity="0.4"/>
  </svg>
);

const SlackIcon = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#4A154B"/>
    <path d="M15.5 22.5C15.5 23.88 14.38 25 13 25C11.62 25 10.5 23.88 10.5 22.5C10.5 21.12 11.62 20 13 20H15.5V22.5Z" fill="#E01E5A"/>
    <path d="M16.75 22.5C16.75 21.12 17.87 20 19.25 20C20.63 20 21.75 21.12 21.75 22.5V27C21.75 28.38 20.63 29.5 19.25 29.5C17.87 29.5 16.75 28.38 16.75 27V22.5Z" fill="#E01E5A"/>
    <path d="M19.25 15.5C17.87 15.5 16.75 14.38 16.75 13C16.75 11.62 17.87 10.5 19.25 10.5C20.63 10.5 21.75 11.62 21.75 13V15.5H19.25Z" fill="#36C5F0"/>
    <path d="M19.25 16.75C20.63 16.75 21.75 17.87 21.75 19.25C21.75 20.63 20.63 21.75 19.25 21.75H14.75C13.37 21.75 12.25 20.63 12.25 19.25C12.25 17.87 13.37 16.75 14.75 16.75H19.25Z" fill="#36C5F0"/>
    <path d="M26.25 19.25C26.25 17.87 27.37 16.75 28.75 16.75C30.13 16.75 31.25 17.87 31.25 19.25C31.25 20.63 30.13 21.75 28.75 21.75H26.25V19.25Z" fill="#2EB67D"/>
    <path d="M25 19.25C25 20.63 23.88 21.75 22.5 21.75C21.12 21.75 20 20.63 20 19.25V14.75C20 13.37 21.12 12.25 22.5 12.25C23.88 12.25 25 13.37 25 14.75V19.25Z" fill="#2EB67D"/>
    <path d="M22.5 26.25C23.88 26.25 25 27.37 25 28.75C25 30.13 23.88 31.25 22.5 31.25C21.12 31.25 20 30.13 20 28.75V26.25H22.5Z" fill="#ECB22E"/>
    <path d="M22.5 25C21.12 25 20 23.88 20 22.5C20 21.12 21.12 20 22.5 20H27C28.38 20 29.5 21.12 29.5 22.5C29.5 23.88 28.38 25 27 25H22.5Z" fill="#ECB22E"/>
  </svg>
);

// Map app IDs to icon components
const APP_ICONS = {
  quickbooks: QuickBooksIcon,
  stripe: StripeIcon,
  google_sheets: GoogleSheetsIcon,
  slack: SlackIcon,
};

// ============================================================================
// UI Icons from Lucide (inline for simplicity)
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

const SettingsIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const ZapIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);

const ExternalLinkIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);

// ============================================================================
// Status Configuration
// ============================================================================

const STATUS_STYLES = {
  connected: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    icon: CheckCircleIcon,
  },
  active: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    icon: CheckCircleIcon,
  },
  disconnected: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-600',
    icon: UnplugIcon,
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    icon: XCircleIcon,
  },
};

// ============================================================================
// Integration Card Component
// ============================================================================

const IntegrationCard = ({ 
  connection, 
  onConnect, 
  onDisconnect, 
  onSync, 
  onTest,
}) => {
  const [testResult, setTestResult] = useState(null);
  
  const {
    app,
    app_name,
    description,
    status,
    connected_at,
    last_sync,
    pending,
  } = connection;
  
  const IconComponent = APP_ICONS[app];
  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.disconnected;
  const StatusIcon = statusStyle.icon;
  const isConnected = status === 'connected' || status === 'active';
  const isPending = !!pending;
  
  const handleTest = async () => {
    const result = await onTest(app);
    setTestResult(result);
    setTimeout(() => setTestResult(null), 5000);
  };
  
  return (
    <Card className={`bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 ${isPending ? 'opacity-80' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {IconComponent && <IconComponent className="w-12 h-12 flex-shrink-0" />}
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">{app_name}</CardTitle>
              <CardDescription className="text-gray-500 text-sm mt-0.5">
                {description}
              </CardDescription>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={`${statusStyle.bg} ${statusStyle.border} ${statusStyle.text} capitalize font-medium`}
          >
            <StatusIcon className="w-3 h-3 mr-1" />
            {status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Connection Details */}
        {isConnected && (
          <div className="mb-4 space-y-1 text-sm text-gray-500">
            {connected_at && (
              <p>Connected: {formatDataTimestamp(connected_at)}</p>
            )}
            {last_sync && (
              <p>Last sync: {formatDataTimestamp(last_sync)}</p>
            )}
          </div>
        )}
        
        {/* Test Result */}
        {testResult && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            testResult.status === 'connected' 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {testResult.status === 'connected' ? '✓' : '✗'} {testResult.message}
          </div>
        )}
        
        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {!isConnected ? (
            <Button
              onClick={() => onConnect(app)}
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              {pending === 'connecting' ? (
                <LoaderIcon className="w-4 h-4 mr-2" />
              ) : (
                <PlugIcon className="w-4 h-4 mr-2" />
              )}
              Connect
            </Button>
          ) : (
            <>
              <Button
                onClick={() => onSync(app)}
                disabled={isPending}
                variant="outline"
                size="sm"
                className="text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                {pending === 'syncing' ? (
                  <LoaderIcon className="w-4 h-4 mr-2" />
                ) : (
                  <RefreshIcon className="w-4 h-4 mr-2" />
                )}
                Sync
              </Button>
              
              <Button
                onClick={handleTest}
                disabled={isPending}
                variant="outline"
                size="sm"
                className="text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                {pending === 'testing' ? (
                  <LoaderIcon className="w-4 h-4 mr-2" />
                ) : (
                  <PlayIcon className="w-4 h-4 mr-2" />
                )}
                Test
              </Button>
              
              <Button
                onClick={() => onDisconnect(app)}
                disabled={isPending}
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {pending === 'disconnecting' ? (
                  <LoaderIcon className="w-4 h-4 mr-2" />
                ) : (
                  <UnplugIcon className="w-4 h-4 mr-2" />
                )}
                Disconnect
              </Button>
            </>
          )}
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

  // Auth loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoaderIcon className="w-8 h-8 text-blue-600" />
      </div>
    );
  }

  // Admin check
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Loading state
  if (loading && connections.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <LoaderIcon className="w-8 h-8 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading integrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link 
              to="/admin/cashflow"
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <SettingsIcon className="w-6 h-6 text-blue-600" />
                </div>
                Integrations
              </h1>
              <p className="text-gray-500 mt-1">
                Connect external services via Pipedream
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              Updated: {formatDataTimestamp(lastFetched)}
            </span>
            <Button
              onClick={refresh}
              variant="outline"
              size="sm"
              className="text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              <RefreshIcon className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Pipedream Status Banner */}
        {!pipedreamConfigured && (
          <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-start gap-3">
              <AlertCircleIcon className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-amber-800">Pipedream Connect Not Configured</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Set PIPEDREAM_PROJECT_ID and PIPEDREAM_CLIENT_SECRET in your environment to enable OAuth connections.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
            <div className="flex items-start gap-3">
              <XCircleIcon className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-red-800">Error Loading Integrations</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Integration Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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

        <Separator className="my-8 bg-gray-200" />

        {/* Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* How It Works */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 rounded">
                  <ZapIcon className="w-4 h-4 text-amber-600" />
                </div>
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-3">
                <span className="text-blue-600 font-mono font-medium">1.</span>
                <span>Click <strong className="text-gray-900">Connect</strong> to start OAuth authorization</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-blue-600 font-mono font-medium">2.</span>
                <span>Authorize access in the popup window</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-blue-600 font-mono font-medium">3.</span>
                <span>Pipedream securely stores and refreshes your tokens</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-blue-600 font-mono font-medium">4.</span>
                <span>Data syncs automatically to the CashFlow Dashboard</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 rounded">
                  <ExternalLinkIcon className="w-4 h-4 text-blue-600" />
                </div>
                Quick Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link 
                to="/admin/cashflow"
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
              >
                <span className="text-gray-400">→</span>
                CashFlow Dashboard
              </Link>
              <a 
                href="https://pipedream.com/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
              >
                <span className="text-gray-400">→</span>
                Pipedream App Directory
                <ExternalLinkIcon className="w-3 h-3" />
              </a>
              <a 
                href="https://developer.intuit.com/app/developer/qbo/docs/get-started"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
              >
                <span className="text-gray-400">→</span>
                QuickBooks API Docs
                <ExternalLinkIcon className="w-3 h-3" />
              </a>
              <a 
                href="https://stripe.com/docs/api"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
              >
                <span className="text-gray-400">→</span>
                Stripe API Docs
                <ExternalLinkIcon className="w-3 h-3" />
              </a>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-400">
          Powered by Pipedream Connect • Tokens are stored securely and refreshed automatically
        </div>
      </div>
    </div>
  );
};

export default IntegrationsPage;
