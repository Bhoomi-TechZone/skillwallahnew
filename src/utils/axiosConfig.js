/**
 * Enhanced Axios configuration with retry logic and better timeout handling
 */
import axios from 'axios';

// Base API URL
const API_BASE_URL = 'http://localhost:4000';

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // Default 15 second timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle timeout errors
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.warn(`⏳ Request timeout: ${originalRequest.url}`);

      // Retry logic for timeout errors (max 2 retries)
      if (!originalRequest._retryCount) {
        originalRequest._retryCount = 0;
      }

      if (originalRequest._retryCount < 2) {
        originalRequest._retryCount++;
        const delay = Math.pow(2, originalRequest._retryCount) * 1000; // 2s, 4s
        console.log(`🔄 Retrying in ${delay}ms... (attempt ${originalRequest._retryCount + 1})`);

        await new Promise(resolve => setTimeout(resolve, delay));

        // Increase timeout for retry
        originalRequest.timeout = 20000 + (originalRequest._retryCount * 5000);

        return axiosInstance(originalRequest);
      }
    }

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      console.error('🚫 Unauthorized - clearing auth data');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Optionally redirect to login
      // window.location.href = '/login';
    }

    // Handle 404 Not Found
    if (error.response?.status === 404) {
      console.warn(`⚠️ Resource not found: ${originalRequest.url}`);
    }

    // Handle 500 Server errors
    if (error.response?.status >= 500) {
      console.error(`💥 Server error (${error.response.status}): ${originalRequest.url}`);
    }

    // Log all errors
    console.error(`❌ API Error: ${originalRequest.url}`, {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });

    return Promise.reject(error);
  }
);

/**
 * Make an API request with retry logic
 * @param {string} url - API endpoint
 * @param {object} config - Axios config object
 * @returns {Promise} - Axios response
 */
export const apiRequest = async (url, config = {}) => {
  try {
    const response = await axiosInstance(url, config);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * GET request with retry
 */
export const apiGet = async (url, config = {}) => {
  return apiRequest(url, { ...config, method: 'GET' });
};

/**
 * POST request with retry
 */
export const apiPost = async (url, data, config = {}) => {
  return apiRequest(url, { ...config, method: 'POST', data });
};

/**
 * PUT request with retry
 */
export const apiPut = async (url, data, config = {}) => {
  return apiRequest(url, { ...config, method: 'PUT', data });
};

/**
 * DELETE request with retry
 */
export const apiDelete = async (url, config = {}) => {
  return apiRequest(url, { ...config, method: 'DELETE' });
};

/**
 * PATCH request with retry
 */
export const apiPatch = async (url, data, config = {}) => {
  return apiRequest(url, { ...config, method: 'PATCH', data });
};

export default axiosInstance;
