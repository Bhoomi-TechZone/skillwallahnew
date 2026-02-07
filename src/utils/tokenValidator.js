/**
 * Token Validator Utility
 * Helps validate JWT tokens and handle authentication errors
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

/**
 * Validate if the current token is still valid
 * @returns {Promise<{valid: boolean, user?: object, error?: string}>}
 */
export async function validateToken() {
  try {
    const token = getStoredToken();

    if (!token) {
      return { valid: false, error: 'No token found' };
    }

    const response = await axios.post(
      `${API_BASE_URL}/auth/validate-token`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('[Token Validator] Error validating token:', error);

    if (error.response?.data) {
      return error.response.data;
    }

    return {
      valid: false,
      error: error.message || 'Unknown error during token validation'
    };
  }
}

/**
 * Get the stored authentication token from localStorage
 * Checks multiple possible storage keys for backward compatibility
 */
export function getStoredToken() {
  return localStorage.getItem('token') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('studentToken') ||
    localStorage.getItem('instructorToken') ||
    localStorage.getItem('adminToken');
}

/**
 * Clear all authentication tokens from localStorage
 */
export function clearAllTokens() {
  localStorage.removeItem('token');
  localStorage.removeItem('authToken');
  localStorage.removeItem('studentToken');
  localStorage.removeItem('instructorToken');
  localStorage.removeItem('adminToken');
  localStorage.removeItem('user');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userName');
  localStorage.removeItem('userEmail');

  console.log('[Token Validator] All tokens cleared from localStorage');
}

/**
 * Handle JWT errors by clearing invalid tokens and redirecting to login
 * @param {Error} error - The error object from API call
 * @param {string} redirectPath - Optional custom redirect path (defaults to /login)
 */
export function handleJWTError(error, redirectPath = '/login') {
  const errorMessage = error.response?.data?.detail || error.message || '';

  // Check if error is JWT-related
  const isJWTError =
    errorMessage.includes('Invalid token') ||
    errorMessage.includes('signature verification failed') ||
    errorMessage.includes('Token has expired') ||
    errorMessage.includes('Unauthorized') ||
    error.response?.status === 401;

  if (isJWTError) {
    console.warn('[Token Validator] JWT error detected:', errorMessage);
    console.warn('[Token Validator] Clearing tokens and redirecting to login');

    clearAllTokens();

    // Show user-friendly message
    const friendlyMessage = errorMessage.includes('expired')
      ? 'Your session has expired. Please log in again.'
      : 'Your authentication token is invalid. Please log in again.';

    // You can customize this to use your app's notification system
    alert(friendlyMessage);

    // Redirect to login
    window.location.href = redirectPath;

    return true;
  }

  return false;
}

/**
 * Axios interceptor to automatically handle JWT errors
 * Call this once during app initialization
 */
export function setupAxiosInterceptor() {
  axios.interceptors.response.use(
    response => response,
    error => {
      handleJWTError(error);
      return Promise.reject(error);
    }
  );

  console.log('[Token Validator] Axios interceptor configured for JWT error handling');
}

/**
 * Check token validity on app load and clear if invalid
 * @returns {Promise<boolean>} - Returns true if token is valid, false otherwise
 */
export async function checkTokenOnLoad() {
  const token = getStoredToken();

  if (!token) {
    console.log('[Token Validator] No token found on load');
    return false;
  }

  console.log('[Token Validator] Validating stored token...');
  const result = await validateToken();

  if (!result.valid) {
    console.warn('[Token Validator] Stored token is invalid:', result.error);
    console.warn('[Token Validator] Clearing invalid token');
    clearAllTokens();
    return false;
  }

  console.log('[Token Validator] Token is valid for user:', result.user?.name);
  return true;
}

export default {
  validateToken,
  getStoredToken,
  clearAllTokens,
  handleJWTError,
  setupAxiosInterceptor,
  checkTokenOnLoad
};
