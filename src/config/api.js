// Unified API config with stable named export
export function getApiBaseUrl() {
  // Use environment variable for API base URL, fallback to secure HTTPS URL
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
}

export async function apiRequest(endpoint, options = {}) {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  // Enhanced headers for CORS handling
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Add authorization header if available
  let token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('adminToken');

  if (token) {
    // VALIDATE TOKEN MATCHES USER
    try {
      const userString = localStorage.getItem('user');
      if (userString) {
        const user = JSON.parse(userString);
        const tokenParts = token.split('.');

        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const tokenEmail = payload.email || payload.sub;
          const userEmail = user.email;

          if (tokenEmail && userEmail && tokenEmail !== userEmail) {
            console.error('❌ TOKEN MISMATCH IN API REQUEST!');
            console.error(`   Token email: ${tokenEmail}`);
            console.error(`   User email: ${userEmail}`);
            console.error('   Clearing mismatched tokens and forcing re-login...');

            // Clear all tokens
            localStorage.removeItem('token');
            localStorage.removeItem('authToken');
            localStorage.removeItem('adminToken');
            localStorage.removeItem('user');

            // Redirect to home/login
            window.location.href = '/';
            return null;
          }

          console.log(`✅ Token validated for API request: ${userEmail}`);
        }
      }
    } catch (validationError) {
      console.warn('⚠️ Could not validate token:', validationError);
      // Continue anyway
    }

    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  // Remove empty Authorization header to avoid issues
  const finalHeaders = { ...defaultHeaders, ...(options.headers || {}) };
  if (!finalHeaders.Authorization || finalHeaders.Authorization === 'Bearer ') {
    delete finalHeaders.Authorization;
  }

  const defaultOptions = {
    headers: finalHeaders,
    credentials: 'include', // Include cookies for CORS - requires specific origins in backend
    mode: 'cors', // Explicitly set CORS mode
  };

  const finalOptions = { ...defaultOptions, ...options };

  // Retry logic for failed requests
  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🌐 API Request (attempt ${attempt}): ${options.method || 'GET'} ${url}`);
      const res = await fetch(url, finalOptions);

      if (!res.ok) {
        console.error(`❌ API Error ${res.status}: ${res.statusText} for ${endpoint}`);

        // Don't retry 4xx errors (client errors)
        if (res.status >= 400 && res.status < 500) {
          return res;
        }

        // Retry 5xx errors (server errors)
        if (attempt === maxRetries) {
          return res;
        }

        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }

      return res;
    } catch (error) {
      lastError = error;
      console.error(`💥 Network error for ${endpoint} (attempt ${attempt}):`, error);

      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  // Provide more specific error messages
  if (lastError.name === 'TypeError' && lastError.message.includes('Failed to fetch')) {
    throw new Error(`Network error: Unable to connect to API server at ${baseUrl}. Please check if the server is running and CORS is properly configured.`);
  }

  throw lastError;
}

// Enhanced API request with better error handling
export async function safeApiRequest(endpoint, options = {}) {
  try {
    const response = await apiRequest(endpoint, options);

    // Handle different HTTP status codes
    if (response.status === 404) {
      console.warn(`Endpoint not found: ${endpoint}`);
      return { success: false, error: 'NOT_FOUND', status: 404 };
    }

    if (response.status === 500) {
      console.error(`Server error for ${endpoint}`);
      return { success: false, error: 'SERVER_ERROR', status: 500 };
    }

    if (!response.ok) {
      console.error(`API error ${response.status} for ${endpoint}`);
      return { success: false, error: 'API_ERROR', status: response.status };
    }

    const data = await response.json();
    return { success: true, data, status: response.status };

  } catch (error) {
    console.error(`Network error for ${endpoint}:`, error);
    return { success: false, error: 'NETWORK_ERROR', status: 0 };
  }
}

export const API_BASE_URL = getApiBaseUrl();
export default { getApiBaseUrl, apiRequest, API_BASE_URL };

// ============= CONTINUOUS TOKEN VALIDATION =============
// This runs every 3 seconds to ensure token doesn't switch
let tokenValidationInterval = null;

function startTokenValidation() {
  // Clear any existing interval
  if (tokenValidationInterval) {
    clearInterval(tokenValidationInterval);
  }

  tokenValidationInterval = setInterval(() => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('adminToken');
      const userString = localStorage.getItem('user');

      if (!token || !userString) {
        return; // No token or user, skip validation
      }

      const user = JSON.parse(userString);
      const tokenParts = token.split('.');

      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        const tokenEmail = payload.email || payload.sub;
        const userEmail = user.email;

        if (tokenEmail && userEmail && tokenEmail !== userEmail) {
          console.error('🚨 BACKGROUND TOKEN MISMATCH DETECTED!');
          console.error(`   Token email: ${tokenEmail}`);
          console.error(`   User email: ${userEmail}`);
          console.error('   Forcing logout...');

          // Clear everything
          localStorage.clear();
          sessionStorage.clear();

          // Stop the interval
          clearInterval(tokenValidationInterval);

          // Force logout
          alert(`Security Error: Token switched from ${userEmail} to ${tokenEmail}. Please login again.`);
          window.location.href = '/';
        }
      }
    } catch (error) {
      // Silently fail - don't disrupt user experience
      console.warn('Token validation check failed:', error);
    }
  }, 3000); // Check every 3 seconds

  console.log('✅ Continuous token validation started (every 3 seconds)');
}

// Start validation when this module loads
if (typeof window !== 'undefined') {
  startTokenValidation();

  // Restart validation after login
  window.addEventListener('authStateChanged', () => {
    console.log('🔄 Auth state changed, restarting token validation');
    startTokenValidation();
  });
}
