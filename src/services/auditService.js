/**
 * Audit Service
 * Handles logging of user actions for security and compliance
 */

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

/**
 * Get the authorization header with Supabase JWT token
 */
async function getAuthHeader() {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('No active session');
    }
    
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };
  } catch (error) {
    console.error('Error getting auth header:', error);
    throw error;
  }
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
    console.warn(`Invalid action type: ${actionType}`);
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
  
  // Schedule batch flush if not already scheduled
  if (!flushTimeout) {
    flushTimeout = setTimeout(flushLogs, BATCH_INTERVAL);
  }
}

/**
 * Flush queued logs to backend
 */
async function flushLogs() {
  if (logQueue.length === 0) {
    flushTimeout = null;
    return;
  }
  
  const logsToSend = [...logQueue];
  logQueue = [];
  flushTimeout = null;
  
  try {
    const headers = await getAuthHeader();
    
    // Send each log entry (could be optimized with batch endpoint)
    await Promise.all(
      logsToSend.map(log =>
        fetch(`${API_BASE_URL}/api/v1/audit/log`, {
          method: 'POST',
          headers,
          body: JSON.stringify(log),
        })
      )
    );
  } catch (error) {
    console.error('Error flushing audit logs:', error);
    // Re-queue failed logs
    logQueue = [...logsToSend, ...logQueue];
  }
}

/**
 * Immediately flush any pending logs
 * Useful before page unload
 */
export async function flushPendingLogs() {
  if (flushTimeout) {
    clearTimeout(flushTimeout);
  }
  await flushLogs();
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

// Flush logs before page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    flushPendingLogs();
  });
}

