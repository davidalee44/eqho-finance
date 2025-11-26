/**
 * IntegrationsPage
 * 
 * Admin-only page for managing external service integrations via Pipedream Connect.
 * Displays connection cards for QuickBooks, Stripe, Google Sheets, and Slack.
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
import { 
  RefreshCcw, 
  Plug, 
  Unplug, 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Loader2,
  ArrowLeft,
  Settings2,
  Zap,
  ExternalLink,
} from 'lucide-react';

// App-specific icons (using emoji for now, can replace with proper icons)
const APP_ICONS = {
  quickbooks: '📊',
  stripe: '💳',
  google_sheets: '📑',
  slack: '💬',
};

// Status colors
const STATUS_STYLES = {
  connected: {
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    icon: CheckCircle2,
  },
  active: {
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    icon: CheckCircle2,
  },
  disconnected: {
    bg: 'bg-gray-500/20',
    border: 'border-gray-500/30',
    text: 'text-gray-400',
    icon: Unplug,
  },
  error: {
    bg: 'bg-red-500/20',
    border: 'border-red-500/30',
    text: 'text-red-400',
    icon: XCircle,
  },
};

/**
 * Integration Card Component
 */
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
    icon,
    status,
    connected_at,
    last_sync,
    pending,
  } = connection;
  
  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.disconnected;
  const StatusIcon = statusStyle.icon;
  const isConnected = status === 'connected' || status === 'active';
  const isPending = !!pending;
  
  const handleTest = async () => {
    const result = await onTest(app);
    setTestResult(result);
    // Clear result after 5 seconds
    setTimeout(() => setTestResult(null), 5000);
  };
  
  return (
    <Card className={`bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-all duration-200 ${isPending ? 'opacity-80' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{APP_ICONS[app] || icon || '🔌'}</div>
            <div>
              <CardTitle className="text-lg text-white">{app_name}</CardTitle>
              <CardDescription className="text-gray-400 text-sm mt-0.5">
                {description}
              </CardDescription>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={`${statusStyle.bg} ${statusStyle.border} ${statusStyle.text} capitalize`}
          >
            <StatusIcon className="w-3 h-3 mr-1" />
            {status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Connection Details */}
        {isConnected && (
          <div className="mb-4 space-y-1 text-sm text-gray-400">
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
          <div className={`mb-4 p-2 rounded text-sm ${
            testResult.status === 'connected' 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
              : 'bg-red-500/10 text-red-400 border border-red-500/30'
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              size="sm"
            >
              {pending === 'connecting' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plug className="w-4 h-4 mr-2" />
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
                className="text-gray-300 border-gray-700 hover:bg-gray-800"
              >
                {pending === 'syncing' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCcw className="w-4 h-4 mr-2" />
                )}
                Sync
              </Button>
              
              <Button
                onClick={handleTest}
                disabled={isPending}
                variant="outline"
                size="sm"
                className="text-gray-300 border-gray-700 hover:bg-gray-800"
              >
                {pending === 'testing' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Test
              </Button>
              
              <Button
                onClick={() => onDisconnect(app)}
                disabled={isPending}
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                {pending === 'disconnecting' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Unplug className="w-4 h-4 mr-2" />
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

/**
 * Main Integrations Page
 */
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
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
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
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading integrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-50">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950/30 -z-10" />
      
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link 
              to="/admin/cashflow"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Settings2 className="w-8 h-8 text-indigo-400" />
                Integrations
              </h1>
              <p className="text-gray-400 mt-1">
                Connect external services via Pipedream
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              Updated: {formatDataTimestamp(lastFetched)}
            </span>
            <Button
              onClick={refresh}
              variant="outline"
              size="sm"
              className="text-gray-300 border-gray-700 hover:bg-gray-800"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Pipedream Status Banner */}
        {!pipedreamConfigured && (
          <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium">Pipedream Connect Not Configured</h3>
                <p className="text-sm text-amber-200/80 mt-1">
                  Set PIPEDREAM_PROJECT_ID and PIPEDREAM_CLIENT_SECRET in your environment to enable OAuth connections.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium">Error Loading Integrations</h3>
                <p className="text-sm text-red-200/80 mt-1">{error}</p>
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

        <Separator className="my-8 bg-gray-800" />

        {/* Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* How It Works */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-400">
              <div className="flex items-start gap-3">
                <span className="text-indigo-400 font-mono">1.</span>
                <span>Click <strong className="text-white">Connect</strong> to start OAuth authorization</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-indigo-400 font-mono">2.</span>
                <span>Authorize access in the popup window</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-indigo-400 font-mono">3.</span>
                <span>Pipedream securely stores and refreshes your tokens</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-indigo-400 font-mono">4.</span>
                <span>Data syncs automatically to the CashFlow Dashboard</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-indigo-400" />
                Quick Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <a 
                href="/admin/cashflow"
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <span>→</span>
                CashFlow Dashboard
              </a>
              <a 
                href="https://pipedream.com/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <span>→</span>
                Pipedream App Directory
                <ExternalLink className="w-3 h-3" />
              </a>
              <a 
                href="https://developer.intuit.com/app/developer/qbo/docs/get-started"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <span>→</span>
                QuickBooks API Docs
                <ExternalLink className="w-3 h-3" />
              </a>
              <a 
                href="https://stripe.com/docs/api"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <span>→</span>
                Stripe API Docs
                <ExternalLink className="w-3 h-3" />
              </a>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          Powered by Pipedream Connect • Tokens are stored securely and refreshed automatically
        </div>
      </div>
    </div>
  );
};

export default IntegrationsPage;

