/**
 * Layout Service
 * Handles fetching and saving dashboard card layouts
 * 
 * Works with react-grid-layout format:
 * - RGL format: { i: 'card-id', x: 0, y: 0, w: 6, h: 4, minW: 4, minH: 3 }
 * - Storage format: { id: 'card-id', x: 0, y: 0, w: 6, h: 4 }
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const LAYOUT_STORAGE_KEY = 'eqho-dashboard-layout';

// Card size constraints (must match GridDashboard.jsx)
const CARD_CONSTRAINTS = {
  minW: 4,
  minH: 3,
  maxW: 24,
  maxH: 16,
};

/**
 * Default layout matching the BentoGrid visual appearance
 * 24-column grid, 40px row height
 * This ensures consistent initial layout when no saved layout exists
 */
const DEFAULT_LAYOUT = [
  { id: 'slide-0', x: 0, y: 0, w: 24, h: 5 },   // Executive Summary - Full width
  { id: 'slide-1', x: 0, y: 5, w: 8, h: 5 },    // Financial Performance
  { id: 'slide-2', x: 8, y: 5, w: 16, h: 5 },   // Market Position
  { id: 'slide-3', x: 0, y: 10, w: 8, h: 5 },   // Business Model
  { id: 'slide-4', x: 8, y: 10, w: 8, h: 5 },   // Growth Strategy
  { id: 'slide-5', x: 16, y: 10, w: 8, h: 5 },  // Investment Terms
  { id: 'slide-6', x: 0, y: 15, w: 8, h: 5 },   // 36-Month Projection
  { id: 'slide-7', x: 8, y: 15, w: 16, h: 5 },  // SaaS Metrics
  { id: 'slide-8', x: 0, y: 20, w: 8, h: 5 },   // Financial Model
  { id: 'slide-9', x: 8, y: 20, w: 16, h: 5 },  // Team & Compensation
  { id: 'slide-10', x: 0, y: 25, w: 8, h: 5 },  // AI Financial Report
];

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

/**
 * Convert react-grid-layout format to backend storage format
 * @param {Array} rglLayout - Layout in RGL format [{ i, x, y, w, h, ... }]
 * @returns {Array} Layout in storage format [{ id, x, y, w, h }]
 */
export function layoutToStorageFormat(rglLayout) {
  return rglLayout.map(item => ({
    id: item.i,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
  }));
}

/**
 * Convert backend storage format to react-grid-layout format
 * @param {Array} storageLayout - Layout in storage format [{ id, x, y, w, h }]
 * @returns {Array} Layout in RGL format [{ i, x, y, w, h, minW, minH, ... }]
 */
export function storageToLayoutFormat(storageLayout) {
  if (!Array.isArray(storageLayout)) {
    return [];
  }
  
  return storageLayout.map(item => ({
    i: item.id,
    x: item.x || 0,
    y: item.y || 0,
    w: item.w || 8,
    h: item.h || 5,
    ...CARD_CONSTRAINTS,
  }));
}

/**
 * Save layout with automatic format conversion
 * Accepts RGL format and converts to storage format before saving
 * Also saves to localStorage as backup
 * @param {Array} rglLayout - Layout in RGL format
 * @param {string} userId - User ID making the change
 * @param {number} delay - Debounce delay in ms
 * @returns {Promise<Object>} Updated layout data
 */
export function saveRGLLayout(rglLayout, userId, delay = 500) {
  const storageFormat = layoutToStorageFormat(rglLayout);
  
  // Always save to localStorage immediately as backup
  saveLayoutToLocalStorage(storageFormat);
  
  // Attempt backend save (debounced)
  return debouncedSaveLayout(storageFormat, userId, delay);
}

/**
 * Fetch layout and convert to RGL format
 * Falls back to localStorage, then default layout if backend unavailable
 * @returns {Promise<Array>} Layout in RGL format
 */
export async function fetchRGLLayout() {
  try {
    const data = await fetchLayout();
    if (data?.layout_data && data.layout_data.length > 0) {
      // Save to localStorage as backup
      saveLayoutToLocalStorage(data.layout_data);
      return storageToLayoutFormat(data.layout_data);
    }
  } catch (error) {
    console.error('Error fetching RGL layout from backend:', error);
  }
  
  // Try localStorage fallback
  const localLayout = getLayoutFromLocalStorage();
  if (localLayout && localLayout.length > 0) {
    console.log('[Layout] Using localStorage fallback');
    return storageToLayoutFormat(localLayout);
  }
  
  // Use default layout
  console.log('[Layout] Using default layout');
  return storageToLayoutFormat(DEFAULT_LAYOUT);
}

/**
 * Save layout to localStorage as backup
 */
function saveLayoutToLocalStorage(layoutData) {
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layoutData));
  } catch (error) {
    console.error('Error saving layout to localStorage:', error);
  }
}

/**
 * Get layout from localStorage
 */
function getLayoutFromLocalStorage() {
  try {
    const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error reading layout from localStorage:', error);
    return null;
  }
}

/**
 * Get the default layout in RGL format
 * Useful for reset functionality
 */
export function getDefaultLayout() {
  return storageToLayoutFormat(DEFAULT_LAYOUT);
}

