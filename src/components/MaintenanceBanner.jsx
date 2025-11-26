import { AlertTriangle, RefreshCw, Settings, WifiOff } from 'lucide-react';

/**
 * Maintenance mode banner component
 * 
 * Displays a banner when the application is in maintenance mode.
 * Can also show read-only mode or degraded state warnings.
 */
export function MaintenanceBanner({ 
  mode = 'maintenance', 
  message = null,
  showRefresh = true,
  onRefresh = null,
}) {
  const configs = {
    maintenance: {
      icon: Settings,
      title: 'Scheduled Maintenance',
      defaultMessage: 'We are currently performing scheduled maintenance. Some features may be temporarily unavailable.',
      bgColor: 'bg-amber-50 border-amber-200',
      textColor: 'text-amber-900',
      iconColor: 'text-amber-600',
    },
    readonly: {
      icon: AlertTriangle,
      title: 'Read-Only Mode',
      defaultMessage: 'The application is currently in read-only mode. Data viewing is available but changes cannot be saved.',
      bgColor: 'bg-blue-50 border-blue-200',
      textColor: 'text-blue-900',
      iconColor: 'text-blue-600',
    },
    degraded: {
      icon: WifiOff,
      title: 'Limited Connectivity',
      defaultMessage: 'Some services are temporarily unavailable. Data may be cached or incomplete.',
      bgColor: 'bg-orange-50 border-orange-200',
      textColor: 'text-orange-900',
      iconColor: 'text-orange-600',
    },
  };

  const config = configs[mode] || configs.maintenance;
  const Icon = config.icon;

  return (
    <div className={`${config.bgColor} border-b px-4 py-3`}>
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${config.iconColor}`} />
          <div>
            <p className={`text-sm font-medium ${config.textColor}`}>
              {config.title}
            </p>
            <p className={`text-xs ${config.textColor} opacity-80`}>
              {message || config.defaultMessage}
            </p>
          </div>
        </div>
        {showRefresh && onRefresh && (
          <button
            onClick={onRefresh}
            className={`flex items-center gap-1 text-xs ${config.textColor} hover:opacity-70 transition-opacity`}
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Full-page maintenance overlay
 * 
 * Use when the entire application should be blocked during maintenance.
 */
export function MaintenanceOverlay({ 
  title = 'Under Maintenance',
  message = 'We are currently performing scheduled maintenance. Please check back shortly.',
  estimatedTime = null,
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md mx-auto text-center p-8">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-amber-100 flex items-center justify-center">
          <Settings className="h-8 w-8 text-amber-600 animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600 mb-4">{message}</p>
        {estimatedTime && (
          <p className="text-sm text-gray-500">
            Estimated completion: {estimatedTime}
          </p>
        )}
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2 mx-auto"
        >
          <RefreshCw className="h-4 w-4" />
          Check Status
        </button>
      </div>
    </div>
  );
}

export default MaintenanceBanner;

