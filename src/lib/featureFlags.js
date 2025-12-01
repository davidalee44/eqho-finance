/**
 * Feature Flags Configuration
 * 
 * Defines available feature flags and their defaults.
 * Flags can be overridden via Vercel Edge Config or environment variables.
 * 
 * Usage:
 *   import { useFeatureFlags } from '@/hooks/useFeatureFlags';
 *   const { flags, loading } = useFeatureFlags();
 *   if (flags.show_admin_controls) { ... }
 */

/**
 * Default flag values - used when Edge Config is unavailable
 * These are the safe defaults for production (investor-facing)
 */
export const DEFAULT_FLAGS = {
  // Admin/Debug visibility
  show_admin_controls: false,    // Show admin edit controls
  show_drill_downs: true,        // Show metric drill-down buttons
  show_api_errors: false,        // Show API error details to users
  show_debug_info: false,        // Show debug panels and console info
  
  // Navigation controls
  show_sidebar: false,           // Show sidebar navigation panel
  sidebar_default_open: false,   // Sidebar open by default (admin override)
  
  // Investor view controls
  quick_investor_view: false,    // Show curated 5-slide subset for quick consumption
  
  // Feature toggles
  enable_audit_log: true,        // Log user actions to audit table
  enable_data_export: true,      // Allow data export functionality
  enable_snapshot_restore: false, // Allow restoring from snapshots (admin)
  
  // Operational controls
  maintenance_mode: false,       // Show maintenance banner, disable writes
  read_only_mode: false,         // Disable all write operations
  
  // Data display controls
  use_cached_data_only: false,   // Force cached data (when API is degraded)
  show_data_timestamps: true,    // Show "last updated" timestamps
};

/**
 * Flag descriptions for documentation and admin UI
 */
export const FLAG_DESCRIPTIONS = {
  show_admin_controls: 'Display admin edit controls (layout editing, etc.)',
  show_drill_downs: 'Show drill-down buttons on metric cards',
  show_api_errors: 'Display detailed API error messages to users',
  show_debug_info: 'Show debug panels and verbose console logging',
  show_sidebar: 'Show collapsible sidebar navigation panel',
  sidebar_default_open: 'Sidebar expanded by default (admin override applies)',
  quick_investor_view: 'Show curated 5-slide subset for quick investor consumption',
  enable_audit_log: 'Log user actions to the audit_log table',
  enable_data_export: 'Allow users to export data (Excel, PDF)',
  enable_snapshot_restore: 'Allow restoring dashboard from snapshots',
  maintenance_mode: 'Display maintenance banner and disable write operations',
  read_only_mode: 'Disable all write operations (read-only mode)',
  use_cached_data_only: 'Force use of cached data instead of live API',
  show_data_timestamps: 'Display data freshness timestamps on metrics',
};

/**
 * Flags that can be overridden by user role
 * Admin users get these flags enabled regardless of Edge Config
 */
export const ADMIN_OVERRIDE_FLAGS = [
  'show_admin_controls',
  'show_api_errors',
  'show_debug_info',
  'enable_snapshot_restore',
  'show_sidebar',
  'sidebar_default_open',
];

/**
 * Validate and merge flags with defaults
 * @param {object} remoteFlags - Flags from Edge Config or API
 * @returns {object} Merged flags with defaults
 */
export function mergeFlags(remoteFlags = {}) {
  return {
    ...DEFAULT_FLAGS,
    ...remoteFlags,
  };
}

/**
 * Apply admin overrides to flags
 * @param {object} flags - Current flags
 * @param {boolean} isAdmin - Whether user is admin
 * @returns {object} Flags with admin overrides applied
 */
export function applyAdminOverrides(flags, isAdmin) {
  if (!isAdmin) return flags;
  
  const overrides = {};
  for (const flag of ADMIN_OVERRIDE_FLAGS) {
    overrides[flag] = true;
  }
  
  return {
    ...flags,
    ...overrides,
  };
}

/**
 * Cache key for localStorage
 */
export const FLAGS_CACHE_KEY = 'eqho_feature_flags';

/**
 * Cache TTL in milliseconds (5 minutes)
 */
export const FLAGS_CACHE_TTL = 5 * 60 * 1000;

