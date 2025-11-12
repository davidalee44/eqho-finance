/**
 * Screenshot Utilities for capturing and saving financial reports
 * Uses html2canvas for capturing and Supabase Storage for persistence
 */

import html2canvas from 'html2canvas';
import { supabase } from './supabase';

/**
 * Capture screenshot of a DOM element
 * @param {HTMLElement} element - Element to capture
 * @param {Object} options - html2canvas options
 * @returns {Promise<Blob>} Screenshot as blob
 */
export async function captureScreenshot(element, options = {}) {
  if (!element) {
    throw new Error('No element provided for screenshot');
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // Higher quality
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      ...options,
    });

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        'image/png',
        0.95
      );
    });
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    throw new Error('Failed to capture screenshot');
  }
}

/**
 * Upload screenshot to Supabase Storage
 * @param {Blob} blob - Screenshot blob
 * @param {string} userId - User ID for folder organization
 * @param {string} filename - Optional custom filename
 * @returns {Promise<string>} Public URL of uploaded screenshot
 */
export async function uploadScreenshot(blob, userId, filename = null) {
  if (!blob) {
    throw new Error('No blob provided for upload');
  }

  if (!userId) {
    throw new Error('User ID is required for upload');
  }

  try {
    // Generate unique filename if not provided
    const timestamp = new Date().getTime();
    const randomStr = Math.random().toString(36).substring(7);
    const finalFilename = filename || `screenshot_${timestamp}_${randomStr}.png`;

    // Upload to Supabase Storage
    const filePath = `${userId}/${finalFilename}`;

    const { data, error } = await supabase.storage
      .from('report-screenshots')
      .upload(filePath, blob, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('report-screenshots')
      .getPublicUrl(filePath);

    if (!urlData || !urlData.publicUrl) {
      throw new Error('Failed to get public URL');
    }

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading screenshot:', error);
    throw error;
  }
}

/**
 * Download screenshot to local file
 * @param {Blob} blob - Screenshot blob
 * @param {string} filename - Filename for download
 */
export function downloadScreenshot(blob, filename = 'screenshot.png') {
  if (!blob) {
    console.warn('No blob provided for download');
    return;
  }

  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading screenshot:', error);
    throw new Error('Failed to download screenshot');
  }
}

/**
 * Capture element and save to Supabase
 * @param {HTMLElement} element - Element to capture
 * @param {string} userId - User ID
 * @param {string} snapshotName - Name for the snapshot
 * @returns {Promise<string>} Screenshot URL
 */
export async function captureAndSaveScreenshot(element, userId, snapshotName = 'report') {
  try {
    // Capture screenshot
    const blob = await captureScreenshot(element);

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${snapshotName}_${timestamp}.png`;

    // Upload to Supabase
    const url = await uploadScreenshot(blob, userId, filename);

    return url;
  } catch (error) {
    console.error('Error in captureAndSaveScreenshot:', error);
    throw error;
  }
}

/**
 * Delete screenshot from Supabase Storage
 * @param {string} screenshotUrl - Full URL of the screenshot
 * @param {string} userId - User ID (for security check)
 * @returns {Promise<boolean>} Success status
 */
export async function deleteScreenshot(screenshotUrl, userId) {
  if (!screenshotUrl || !userId) {
    throw new Error('Screenshot URL and User ID are required');
  }

  try {
    // Extract file path from URL
    const urlParts = screenshotUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    const filePath = `${userId}/${filename}`;

    const { error } = await supabase.storage
      .from('report-screenshots')
      .remove([filePath]);

    if (error) {
      console.error('Error deleting screenshot:', error);
      throw new Error(`Delete failed: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error('Error in deleteScreenshot:', error);
    throw error;
  }
}

/**
 * Get list of screenshots for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} List of screenshots
 */
export async function listUserScreenshots(userId) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const { data, error } = await supabase.storage
      .from('report-screenshots')
      .list(userId, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      console.error('Error listing screenshots:', error);
      throw new Error(`List failed: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in listUserScreenshots:', error);
    throw error;
  }
}

/**
 * Prepare element for screenshot (hide unnecessary UI elements)
 * @param {HTMLElement} element - Element to prepare
 * @returns {Function} Cleanup function to restore hidden elements
 */
export function prepareElementForScreenshot(element) {
  if (!element) {
    return () => {};
  }

  // Find and hide elements that shouldn't be in screenshot
  const elementsToHide = element.querySelectorAll(
    '[data-no-screenshot], .no-screenshot, button, .cursor-pointer'
  );

  const originalDisplay = [];
  elementsToHide.forEach((el, index) => {
    originalDisplay[index] = el.style.display;
    el.style.display = 'none';
  });

  // Return cleanup function
  return () => {
    elementsToHide.forEach((el, index) => {
      el.style.display = originalDisplay[index];
    });
  };
}

/**
 * Capture with loading state and error handling
 * @param {HTMLElement} element - Element to capture
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Blob>} Screenshot blob
 */
export async function captureWithProgress(element, onProgress = null) {
  try {
    if (onProgress) onProgress('Preparing...');

    const cleanup = prepareElementForScreenshot(element);

    if (onProgress) onProgress('Capturing...');

    const blob = await captureScreenshot(element);

    cleanup();

    if (onProgress) onProgress('Complete!');

    return blob;
  } catch (error) {
    console.error('Error in captureWithProgress:', error);
    throw error;
  }
}

