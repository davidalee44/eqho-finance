/**
 * Layout Service
 * Handles fetching and saving dashboard card layouts
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
 * Fetch the current card layout from backend
 * @returns {Promise<Object>} Layout data
 */
export async function fetchLayout() {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_BASE_URL}/api/v1/layouts`, {
      method: 'GET',
      headers,
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch layout: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching layout:', error);
    throw error;
  }
}

/**
 * Save card layout to backend (admin only)
 * @param {Array} layoutData - Array of card position/size objects
 * @param {string} userId - User ID making the change
 * @returns {Promise<Object>} Updated layout data
 */
export async function saveLayout(layoutData, userId) {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_BASE_URL}/api/v1/layouts`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ layout_data: layoutData }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to save layout: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Log the layout change for audit
    await logLayoutChange(layoutData, userId);
    
    return data;
  } catch (error) {
    console.error('Error saving layout:', error);
    throw error;
  }
}

/**
 * Log a layout change to audit service
 * @param {Array} newLayout - New layout configuration
 * @param {string} userId - User ID making the change
 */
async function logLayoutChange(newLayout, userId) {
  try {
    const { logAction } = await import('./auditService');
    await logAction('layout_change', {
      layout_cards: newLayout.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Don't fail the layout save if audit logging fails
    console.error('Error logging layout change:', error);
  }
}

/**
 * Debounced save - useful for drag operations
 */
let saveTimeout = null;

export function debouncedSaveLayout(layoutData, userId, delay = 500) {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  return new Promise((resolve, reject) => {
    saveTimeout = setTimeout(async () => {
      try {
        const result = await saveLayout(layoutData, userId);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }, delay);
  });
}

