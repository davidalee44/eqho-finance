/**
 * Audit Service
 * Handles logging of user actions for security and compliance
 */

import { supabase } from '@/lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Action types enum
export const ACTION_TYPES = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  LAYOUT_CHANGE: 'layout_change',
  REPORT_EXPORT: 'report_export',
  REPORT_VIEW: 'report_view',
  SNAPSHOT_CREATE: 'snapshot_create',
  SNAPSHOT_RESTORE: 'snapshot_restore',
};

// Queue for batching audit logs
let logQueue = [];
let flushTimeout = null;
const BATCH_INTERVAL = 5000; // 5 seconds

// Cached auth header for synchronous flushes
let cachedAuthHeader = null;
let authListenerInitialized = false;

function updateCachedAuthHeader(session) {
  if (session?.access_token) {
    cachedAuthHeader = {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };
  } else {
    cachedAuthHeader = null;
  }
}

async function ensureAuthCache() {
  if (authListenerInitialized) {
    return;
  }

  authListenerInitialized = true;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    updateCachedAuthHeader(session);

    supabase.auth.onAuthStateChange((_event, sessionData) => {
      updateCachedAuthHeader(sessionData);
    });
  } catch (error) {
    console.warn('Failed to initialize auth cache for audit logging:', error);
  }
}

ensureAuthCache();

function getCachedAuthHeader() {
  return cachedAuthHeader;
}

/**
 * Get the authorization header with Supabase JWT token
 */
async function getAuthHeader() {
  await ensureAuthCache();

  if (cachedAuthHeader) {
    return cachedAuthHeader;
  }

  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('No active session');
  }

  updateCachedAuthHeader(session);
  return cachedAuthHeader;
}

/**
 * Get client information for audit logging
 */
function getClientInfo() {
  return {
    user_agent: navigator.userAgent,
    // Note: IP address is captured on backend
  };
}

/**
 * Log an action to the audit trail
 * @param {string} actionType - Type of action (from ACTION_TYPES)
 * @param {Object} actionData - Additional data about the action
 * @returns {Promise<void>}
 */
export async function logAction(actionType, actionData = {}) {
  if (!Object.values(ACTION_TYPES).includes(actionType)) {
    console.warn(`[Audit] ✗ Invalid action type: ${actionType}`);
    return;
  }
  
  const logEntry = {
    action_type: actionType,
    action_data: {
      ...actionData,
      timestamp: new Date().toISOString(),
    },
    ...getClientInfo(),
  };
  
  // Add to queue
  logQueue.push(logEntry);
  console.log(`[Audit] Queued action: ${actionType} (queue size: ${logQueue.length})`);
  
  // Schedule batch flush if not already scheduled
  if (!flushTimeout) {
    console.log(`[Audit] Scheduling batch flush in ${BATCH_INTERVAL}ms`);
    flushTimeout = setTimeout(() => flushLogsAsync(), BATCH_INTERVAL);
  }
}

function hasPendingLogs() {
  return logQueue.length > 0;
}

async function sendLogsAsync(logs, headers, keepalive) {
  await Promise.all(
    logs.map(log =>
      fetch(`${API_BASE_URL}/api/v1/audit/log`, {
        method: 'POST',
        headers,
        body: JSON.stringify(log),
        keepalive,
      })
    )
  );
}

function sendLogsSync(logs, headers) {
  try {
    for (const log of logs) {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/api/v1/audit/log`, false);
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
      xhr.send(JSON.stringify(log));

      if (xhr.status < 200 || xhr.status >= 300) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Synchronous audit log send failed:', error);
    return false;
  }
}

async function flushLogsAsync({ keepalive = false } = {}) {
  if (logQueue.length === 0) {
    flushTimeout = null;
    return true;
  }
  
  const logsToSend = [...logQueue];
  logQueue = [];
  flushTimeout = null;
  
  console.log(`[Audit] Flushing ${logsToSend.length} audit log(s) to backend${keepalive ? ' (keepalive)' : ''}...`);
  
  try {
    const headers = await getAuthHeader();
    await sendLogsAsync(logsToSend, headers, keepalive);
    console.log(`[Audit] ✓ Successfully flushed ${logsToSend.length} audit log(s)`);
    return true;
  } catch (error) {
    console.error(`[Audit] ✗ Error flushing audit logs:`, error);
    logQueue = [...logsToSend, ...logQueue];
    console.warn(`[Audit] Re-queued ${logsToSend.length} failed audit log(s) (queue size: ${logQueue.length})`);
    return false;
  }
}

function flushLogsSync() {
  if (logQueue.length === 0) {
    flushTimeout = null;
    return true;
  }

  const headers = getCachedAuthHeader();
  const logsToSend = [...logQueue];
  logQueue = [];
  flushTimeout = null;

  if (!headers) {
    console.warn('[Audit] ✗ Cannot flush audit logs synchronously without cached auth header');
    logQueue = [...logsToSend, ...logQueue];
    return false;
  }

  console.log(`[Audit] Flushing ${logsToSend.length} audit log(s) synchronously...`);
  const success = sendLogsSync(logsToSend, headers);

  if (!success) {
    console.error(`[Audit] ✗ Synchronous flush failed, re-queuing ${logsToSend.length} log(s)`);
    logQueue = [...logsToSend, ...logQueue];
  } else {
    console.log(`[Audit] ✓ Successfully flushed ${logsToSend.length} audit log(s) synchronously`);
  }

  return success;
}

/**
 * Immediately flush any pending logs
 * Useful before page unload
 */
export async function flushPendingLogs({ useKeepalive = false } = {}) {
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }
  await flushLogsAsync({ keepalive: useKeepalive });
}

export function flushPendingLogsSync() {
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }
  return flushLogsSync();
}

/**
 * Fetch audit logs (admin only)
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Audit logs data
 */
export async function fetchAuditLogs(filters = {}) {
  try {
    const headers = await getAuthHeader();
    
    // Build query string
    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page);
    if (filters.pageSize) params.append('page_size', filters.pageSize);
    if (filters.actionType) params.append('action_type', filters.actionType);
    if (filters.userId) params.append('user_id_filter', filters.userId);
    if (filters.startDate) params.append('start_date', filters.startDate);
    if (filters.endDate) params.append('end_date', filters.endDate);
    
    const response = await fetch(
      `${API_BASE_URL}/api/v1/audit/logs?${params.toString()}`,
      {
        method: 'GET',
        headers,
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch audit logs: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw error;
  }
}

/**
 * Export audit logs as CSV (admin only)
 * @param {Object} filters - Filter options
 * @returns {Promise<Blob>} CSV file blob
 */
export async function exportAuditLogs(filters = {}) {
  try {
    const headers = await getAuthHeader();
    
    // Build query string
    const params = new URLSearchParams();
    if (filters.actionType) params.append('action_type', filters.actionType);
    if (filters.userId) params.append('user_id_filter', filters.userId);
    if (filters.startDate) params.append('start_date', filters.startDate);
    if (filters.endDate) params.append('end_date', filters.endDate);
    
    const response = await fetch(
      `${API_BASE_URL}/api/v1/audit/logs/export?${params.toString()}`,
      {
        method: 'GET',
        headers,
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to export audit logs: ${response.statusText}`);
    }
    
    return await response.blob();
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    throw error;
  }
}

// Flush logs when the page is about to become hidden or unload
if (typeof window !== 'undefined') {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden' && hasPendingLogs()) {
      void flushPendingLogs({ useKeepalive: true });
    }
  };

  const handleBeforeUnload = (event) => {
    if (!hasPendingLogs()) {
      return;
    }

    const success = flushPendingLogsSync();

    if (!success) {
      event.preventDefault();
      event.returnValue = '';
    }
  };

  const handlePageHide = (event) => {
    if (event.persisted) {
      return;
    }

    if (hasPendingLogs()) {
      const success = flushPendingLogsSync();
      if (!success) {
        void flushPendingLogs({ useKeepalive: true });
      }
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pagehide', handlePageHide);
}

