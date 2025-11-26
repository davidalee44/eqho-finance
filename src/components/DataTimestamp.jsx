/**
 * DataTimestamp - Displays data freshness with visual indicators
 * 
 * Shows when data was last fetched and indicates if showing cached data.
 * Color-coded: green for live data, amber for cached, red for unavailable.
 */

import React from 'react';
import { Clock, RefreshCw, AlertCircle, Database } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDataTimestamp } from '@/lib/api';

/**
 * Calculate data freshness category
 * @param {string | null} timestamp - ISO timestamp
 * @returns {'live' | 'recent' | 'stale' | 'unknown'}
 */
function getDataFreshness(timestamp) {
  if (!timestamp) return 'unknown';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 5) return 'live';
  if (diffMins < 60) return 'recent';
  return 'stale';
}

/**
 * DataTimestamp component
 * 
 * @param {Object} props
 * @param {string | null} props.timestamp - ISO timestamp of when data was fetched
 * @param {string} props.source - Data source (e.g., 'Stripe', 'QuickBooks')
 * @param {boolean} props.isCached - Whether showing cached data
 * @param {boolean} props.isLoading - Whether data is currently loading
 * @param {function} props.onRefresh - Optional callback to refresh data
 * @param {string} props.className - Additional CSS classes
 * @param {'compact' | 'full'} props.variant - Display variant
 */
export function DataTimestamp({
  timestamp,
  source = 'API',
  isCached = false,
  isLoading = false,
  onRefresh,
  className = '',
  variant = 'compact',
}) {
  const freshness = getDataFreshness(timestamp);
  const formattedTime = formatDataTimestamp(timestamp);

  // Determine styling based on freshness and cache status
  const freshnessConfig = {
    live: {
      badge: 'bg-green-100 text-green-800 border-green-200',
      icon: Clock,
      text: 'Live',
    },
    recent: {
      badge: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: Clock,
      text: 'Recent',
    },
    stale: {
      badge: 'bg-amber-100 text-amber-800 border-amber-200',
      icon: Database,
      text: 'Cached',
    },
    unknown: {
      badge: 'bg-red-100 text-red-800 border-red-200',
      icon: AlertCircle,
      text: 'Unavailable',
    },
  };

  const config = isCached && freshness !== 'unknown' 
    ? { ...freshnessConfig.stale, text: 'Cached' }
    : freshnessConfig[freshness];
  
  const Icon = config.icon;

  if (isLoading) {
    return (
      <div className={`flex items-center gap-1 text-xs text-muted-foreground ${className}`}>
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <Badge 
          variant="outline" 
          className={`text-[10px] px-1.5 py-0 h-5 font-normal ${config.badge}`}
        >
          <Icon className="h-2.5 w-2.5 mr-1" />
          {config.text}
        </Badge>
        <span className="text-[10px] text-muted-foreground">
          {formattedTime}
        </span>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-0.5 hover:bg-muted rounded"
            title="Refresh data"
          >
            <RefreshCw className="h-3 w-3 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className={`flex items-center justify-between text-xs ${className}`}>
      <div className="flex items-center gap-2">
        <Badge 
          variant="outline" 
          className={`${config.badge}`}
        >
          <Icon className="h-3 w-3 mr-1" />
          {config.text}
        </Badge>
        <span className="text-muted-foreground">
          {isCached ? 'Cached data from' : 'Last updated'}: {formattedTime}
        </span>
        {source && (
          <span className="text-muted-foreground">
            ({source})
          </span>
        )}
      </div>
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-muted rounded transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      )}
    </div>
  );
}

/**
 * DataUnavailable - Shown when no data is available (neither live nor cached)
 */
export function DataUnavailable({ message = 'Data unavailable', className = '' }) {
  return (
    <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
      <AlertCircle className="h-4 w-4 text-amber-500" />
      <span>{message}</span>
    </div>
  );
}

/**
 * CachedDataBanner - Full-width banner for showing cached data warning
 */
export function CachedDataBanner({ timestamp, source, onRefresh, className = '' }) {
  const formattedTime = formatDataTimestamp(timestamp);
  
  return (
    <div className={`w-full bg-amber-50 border border-amber-200 rounded-md p-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-amber-800">
          <Database className="h-4 w-4" />
          <span>
            Showing cached data from <strong>{formattedTime}</strong>
            {source && <> ({source})</>}
          </span>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-1 px-3 py-1 text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-md transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

export default DataTimestamp;

