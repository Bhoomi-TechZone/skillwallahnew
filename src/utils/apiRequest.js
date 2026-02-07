/**
 * Enhanced API request utility with proper authentication handling
 */

// Get the base API URL
export const getApiBaseUrl = () => {
  return 'http://localhost:4000';
};

// Get authentication token from localStorage
export const getAuthToken = () => {
  // Try multiple possible token keys
  const tokenKeys = ['token', 'authToken', 'instructorToken', 'adminToken', 'studentToken'];

  for (const key of tokenKeys) {
    const token = localStorage.getItem(key);
    if (token && token.trim()) {
      return token.trim();
    }
  }

  return null;
};

// Check if token is expired (basic check)
export const isTokenExpired = (token) => {
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    console.warn('Could not decode token:', error);
    return true; // Treat as expired if we can't decode
  }
};

// Enhanced API request function
export const apiRequest = async (endpoint, options = {}) => {
  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  // Get authentication token
  const token = getAuthToken();

  // Check if token exists and is valid
  if (token && isTokenExpired(token)) {
    console.warn('Token is expired, clearing authentication');
    clearAuth();
    throw new Error('Authentication expired. Please login again.');
  }

  // Default headers
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  // Add authorization header if token exists
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  // Merge headers
  const headers = {
    ...defaultHeaders,
    ...options.headers
  };

  // Default options
  const requestOptions = {
    method: 'GET',
    ...options,
    headers
  };

  console.log(`🔄 API Request: ${requestOptions.method} ${url}`);
  console.log(`🔑 Token present: ${!!token}`);

  try {
    const response = await fetch(url, requestOptions);

    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      console.error('🚫 Authentication failed:', response.status);
      clearAuth();
      throw new Error('Authentication failed. Please login again.');
    }

    // Handle other HTTP errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error ${response.status}:`, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ API Success: ${requestOptions.method} ${url}`);

    return {
      ...response,
      data,
      success: true
    };

  } catch (error) {
    console.error(`❌ API Request failed: ${requestOptions.method} ${url}`, error);

    // Only show network error for true connection failures
    // Don't show for CORS errors, JSON parse errors, 404s, etc. when backend is running
    const isActualNetworkError =
      error.name === 'TypeError' &&
      error.message.includes('Failed to fetch') &&
      !error.message.includes('JSON') &&
      !error.message.includes('CORS');

    if (isActualNetworkError) {
      // Silently fail - log but don't show alert
      // The calling code can decide how to handle it
      console.warn('⚠️ Network request failed, but backend may still be running');
    }

    throw error;
  }
};

// Clear authentication data
export const clearAuth = () => {
  const authKeys = ['token', 'authToken', 'instructorToken', 'adminToken', 'studentToken',
    'user', 'userInfo', 'currentUser', 'authUser', 'userData',
    'instructorUser', 'adminUser', 'studentUser', 'refresh_token'];

  authKeys.forEach(key => {
    localStorage.removeItem(key);
  });

  console.log('🧹 Authentication data cleared');
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = getAuthToken();
  return token && !isTokenExpired(token);
};

// Get current user data
export const getCurrentUser = () => {
  const userKeys = ['user', 'userInfo', 'currentUser', 'authUser', 'userData'];

  for (const key of userKeys) {
    try {
      const userData = localStorage.getItem(key);
      if (userData) {
        const parsed = JSON.parse(userData);
        if (parsed && (parsed.id || parsed.user_id)) {
          return parsed;
        }
      }
    } catch (error) {
      console.warn(`Error parsing ${key}:`, error);
    }
  }

  return null;
};

// Refresh authentication token
export const refreshAuthToken = async () => {
  const refreshToken = localStorage.getItem('refresh_token');

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    const response = await apiRequest('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({
        refresh_token: refreshToken
      })
    });

    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    }

    throw new Error('Failed to refresh token');
  } catch (error) {
    console.error('Token refresh failed:', error);
    clearAuth();
    throw error;
  }
};

// Debug authentication state
export const debugAuth = () => {
  console.log('=== AUTHENTICATION DEBUG ===');

  const token = getAuthToken();
  console.log('🔑 Token found:', !!token);

  if (token) {
    console.log('🔑 Token preview:', token.substring(0, 20) + '...');
    console.log('🔑 Token expired:', isTokenExpired(token));

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('🔑 Token payload:', payload);
      console.log('🔑 Token expires:', new Date(payload.exp * 1000));
    } catch (error) {
      console.log('🔑 Could not decode token');
    }
  }

  const user = getCurrentUser();
  console.log('👤 User data:', user);
  console.log('👤 User authenticated:', isAuthenticated());

  console.log('💾 localStorage keys:', Object.keys(localStorage));
  console.log('============================');
};

export default apiRequest;
