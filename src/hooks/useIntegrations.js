/**
 * useIntegrations Hook
 * 
 * Manages state and actions for external service integrations via Pipedream Connect.
 * Handles connection status, OAuth initiation, and sync operations.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

// Refresh interval: 30 seconds
const REFRESH_INTERVAL = 30 * 1000;

/**
 * Hook for managing integrations
 * 
 * @returns {Object} Integration state and actions
 */
export function useIntegrations() {
  const [apps, setApps] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pipedreamConfigured, setPipedreamConfigured] = useState(false);
  const [lastFetched, setLastFetched] = useState(null);
  
  // Track pending operations per app
  const [pendingOperations, setPendingOperations] = useState({});

  /**
   * Fetch all integration statuses
   */
  const fetchStatus = useCallback(async () => {
    try {
      setError(null);
      
      const data = await apiFetch('/api/v1/integrations/status');
      
      setConnections(data.connections || []);
      setPipedreamConfigured(data.pipedream_configured || false);
      setLastFetched(data.timestamp);
      
      return data;
    } catch (err) {
      console.error('Failed to fetch integration status:', err);
      setError(err.message || 'Failed to load integrations');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch supported apps
   */
  const fetchApps = useCallback(async () => {
    try {
      const data = await apiFetch('/api/v1/integrations/apps');
      setApps(data.apps || []);
      setPipedreamConfigured(data.pipedream_configured || false);
      return data.apps;
    } catch (err) {
      console.error('Failed to fetch supported apps:', err);
      return [];
    }
  }, []);

  /**
   * Initialize data on mount
   */
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchApps(), fetchStatus()]);
    };
    
    init();
    
    // Set up polling for status updates
    const interval = setInterval(() => {
      fetchStatus();
    }, REFRESH_INTERVAL);
    
    return () => clearInterval(interval);
  }, [fetchApps, fetchStatus]);

  /**
   * Initiate OAuth connection for an app
   * 
   * @param {string} appId - App identifier (e.g., 'quickbooks')
   * @param {string} redirectUri - Optional redirect URI after OAuth
   * @returns {Promise<{success: boolean, connect_url?: string, error?: string}>}
   */
  const connect = useCallback(async (appId, redirectUri = null) => {
    setPendingOperations(prev => ({ ...prev, [appId]: 'connecting' }));
    
    try {
      const data = await apiFetch(`/api/v1/integrations/connect/${appId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          redirect_uri: redirectUri || `${window.location.origin}/admin/integrations`
        }),
      });
      
      if (data.connect_url) {
        // Open Pipedream OAuth in a popup
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        const popup = window.open(
          data.connect_url,
          'pipedream_oauth',
          `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
        );
        
        // Poll for popup close and refresh status
        const pollPopup = setInterval(() => {
          if (popup.closed) {
            clearInterval(pollPopup);
            fetchStatus();
            setPendingOperations(prev => ({ ...prev, [appId]: null }));
          }
        }, 500);
        
        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(pollPopup);
          setPendingOperations(prev => ({ ...prev, [appId]: null }));
        }, 5 * 60 * 1000);
        
        return { success: true, connect_url: data.connect_url };
      }
      
      return { success: false, error: 'No connect URL returned' };
    } catch (err) {
      console.error(`Failed to initiate connection for ${appId}:`, err);
      setPendingOperations(prev => ({ ...prev, [appId]: null }));
      return { success: false, error: err.message };
    }
  }, [fetchStatus]);

  /**
   * Disconnect an app
   * 
   * @param {string} appId - App identifier
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const disconnect = useCallback(async (appId) => {
    setPendingOperations(prev => ({ ...prev, [appId]: 'disconnecting' }));
    
    try {
      await apiFetch(`/api/v1/integrations/${appId}`, {
        method: 'DELETE',
      });
      
      // Refresh status
      await fetchStatus();
      
      return { success: true };
    } catch (err) {
      console.error(`Failed to disconnect ${appId}:`, err);
      return { success: false, error: err.message };
    } finally {
      setPendingOperations(prev => ({ ...prev, [appId]: null }));
    }
  }, [fetchStatus]);

  /**
   * Trigger manual sync for an app
   * 
   * @param {string} appId - App identifier
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  const sync = useCallback(async (appId) => {
    setPendingOperations(prev => ({ ...prev, [appId]: 'syncing' }));
    
    try {
      const data = await apiFetch(`/api/v1/integrations/sync/${appId}`, {
        method: 'POST',
      });
      
      // Refresh status to update last_sync
      await fetchStatus();
      
      return { success: data.success, data: data.data_summary };
    } catch (err) {
      console.error(`Failed to sync ${appId}:`, err);
      return { success: false, error: err.message };
    } finally {
      setPendingOperations(prev => ({ ...prev, [appId]: null }));
    }
  }, [fetchStatus]);

  /**
   * Test connection for an app
   * 
   * @param {string} appId - App identifier
   * @returns {Promise<{status: string, message: string}>}
   */
  const testConnection = useCallback(async (appId) => {
    setPendingOperations(prev => ({ ...prev, [appId]: 'testing' }));
    
    try {
      const data = await apiFetch(`/api/v1/integrations/test/${appId}`, {
        method: 'POST',
      });
      
      return data;
    } catch (err) {
      console.error(`Failed to test ${appId}:`, err);
      return { status: 'error', message: err.message };
    } finally {
      setPendingOperations(prev => ({ ...prev, [appId]: null }));
    }
  }, []);

  /**
   * Get merged connection data for display
   * Combines app metadata with connection status
   */
  const getConnectionsWithMetadata = useCallback(() => {
    return connections.map(conn => ({
      ...conn,
      pending: pendingOperations[conn.app] || null,
    }));
  }, [connections, pendingOperations]);

  /**
   * Get connection status for a specific app
   * 
   * @param {string} appId - App identifier
   * @returns {Object|null} Connection status or null if not found
   */
  const getConnectionStatus = useCallback((appId) => {
    const conn = connections.find(c => c.app === appId);
    if (!conn) return null;
    
    return {
      ...conn,
      pending: pendingOperations[appId] || null,
    };
  }, [connections, pendingOperations]);

  /**
   * Check if any app is currently processing
   */
  const isAnyPending = Object.values(pendingOperations).some(Boolean);

  return {
    // State
    apps,
    connections: getConnectionsWithMetadata(),
    loading,
    error,
    pipedreamConfigured,
    lastFetched,
    isAnyPending,
    
    // Actions
    connect,
    disconnect,
    sync,
    testConnection,
    refresh: fetchStatus,
    
    // Utilities
    getConnectionStatus,
  };
}

export default useIntegrations;

