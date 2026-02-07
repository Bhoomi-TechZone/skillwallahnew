// API endpoints for notices management
import AuthService from '../services/authService';

const API_BASE_URL = 'http://localhost:4000';

/**
 * Get authenticated headers for API requests
 * @returns {Object} Headers object with authentication
 */
const getAuthHeaders = () => {
  return AuthService.getAuthHeaders();
};

/**
 * Fetch all notices from the backend
 * @returns {Promise} Promise resolving to notices array
 */
export const fetchNotices = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/notices/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching notices:', error);
    throw new Error('Failed to fetch notices. Please try again later.');
  }
};

/**
 * Create a new notice
 * @param {Object} noticeData - The notice data to be created
 * @returns {Promise} Promise resolving to the created notice
 */
export const createNotice = async (noticeData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/notices/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(noticeData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating notice:', error);
    throw new Error('Failed to create notice. Please try again later.');
  }
};

/**
 * Fetch notice statistics
 * @returns {Promise} Promise resolving to statistics object
 */
export const fetchNoticeStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/notices/stats`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching notice stats:', error);
    throw new Error('Failed to fetch notice statistics. Please try again later.');
  }
};

/**
 * Update notice status (if needed for toggle functionality)
 * @param {string|number} noticeId - The ID of the notice to update
 * @param {Object} updateData - The data to update
 * @returns {Promise} Promise resolving to the updated notice
 */
export const updateNotice = async (noticeId, updateData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/notices/${noticeId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating notice:', error);
    throw new Error('Failed to update notice. Please try again later.');
  }
};

/**
 * Delete a notice
 * @param {string|number} noticeId - The ID of the notice to delete
 * @returns {Promise} Promise resolving to success response
 */
export const deleteNotice = async (noticeId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/notices/${noticeId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting notice:', error);
    throw new Error('Failed to delete notice. Please try again later.');
  }
};