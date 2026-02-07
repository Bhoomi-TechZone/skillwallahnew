/**
 * Enhanced Session Management Utility
 * Provides comprehensive session handling with extended timeouts and proper cleanup
 */

// Session configuration
const SESSION_CONFIG = {
  // Check session every 24 hours (effectively disabled auto-logout)
  CHECK_INTERVAL: 24 * 60 * 60 * 1000,

  // Warning before session expires (disabled)
  WARNING_BEFORE_EXPIRY: 0,

  // Token refresh threshold (refresh when less than 1 hour remains)
  REFRESH_THRESHOLD: 60 * 60 * 1000, // 1 hour
};

class SessionManager {
  constructor() {
    this.sessionCheckInterval = null;
    this.warningShown = false;
    this.listeners = [];
  }

  /**
   * Initialize session management
   */
  init(navigate = null) {
    this.navigate = navigate;
    this.startSessionMonitoring(); // Enabled auto-refresh, disabled auto-logout
    this.setupStorageListener();

    console.log('📊 Session Manager initialized (Auto-logout disabled)');
    return this;
  }

  /**
   * Start monitoring session validity
   */
  startSessionMonitoring() {
    // Clear any existing interval
    this.stopSessionMonitoring();

    const checkSession = () => {
      try {
        const token = this.getAuthToken();

        if (!token) return;

        const timeUntilExpiry = this.getTimeUntilExpiry(token);

        // Try to refresh token if it's getting close to expiry
        // This keeps the session valid as long as possible
        if (timeUntilExpiry <= SESSION_CONFIG.REFRESH_THRESHOLD) {
          this.attemptTokenRefresh();
        }

        // We DO NOT auto-logout even if expired, as per user request.
        // We let the API handle 401s if they happen.

      } catch (error) {
        console.error('❌ Session check error:', error);
      }
    };

    // Start interval (check every 5 minutes to ensure timely refreshes)
    this.sessionCheckInterval = setInterval(checkSession, 5 * 60 * 1000);

    // Run initial check
    setTimeout(checkSession, 5000);

    console.log('✅ Session monitoring started (Auto-logout disabled, Auto-refresh enabled)');
  }

  /**
   * Stop session monitoring
   */
  stopSessionMonitoring() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
  }

  /**
   * Get authentication token from localStorage
   */
  getAuthToken() {
    const tokenKeys = ['token', 'authToken', 'adminToken', 'instructorToken', 'studentToken'];

    for (const key of tokenKeys) {
      const token = localStorage.getItem(key);
      if (token && token.trim()) {
        return token.trim();
      }
    }

    return null;
  }

  /**
   * Check if token is expired with buffer
   */
  isTokenExpired(token) {
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;

      // Add a 60 second buffer to account for clock skew
      return payload.exp < (currentTime + 60);
    } catch (error) {
      console.warn('⚠️ Could not decode token:', error);
      return true;
    }
  }

  /**
   * Get time until token expiry in milliseconds
   */
  getTimeUntilExpiry(token) {
    if (!token) return 0;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = payload.exp * 1000; // Convert to milliseconds
      return Math.max(0, expiryTime - Date.now());
    } catch (error) {
      return 0;
    }
  }

  /**
   * Show session expiry warning
   */
  showSessionWarning(timeUntilExpiry) {
    // Disabled warning
    return;
  }

  /**
   * Handle session expiry
   */
  handleSessionExpiry() {
    console.log('🔄 Handling session expiry...');

    // Clear all auth data
    this.clearAuthData();

    // No alert message as per user request

    // Navigate to login if navigate function is available
    if (this.navigate) {
      this.navigate('/login');
    } else {
      // Fallback to page redirect
      window.location.href = '/login';
    }
  }

  /**
   * Attempt to refresh token
   */
  async attemptTokenRefresh() {
    try {
      const refreshToken = localStorage.getItem('refresh_token');

      if (!refreshToken) {
        console.log('ℹ️ No refresh token available');
        return false;
      }

      console.log('🔄 Attempting token refresh...');

      // Import refresh function dynamically to avoid circular dependencies
      const { refreshAuthToken } = await import('./apiRequest.js');
      await refreshAuthToken();

      console.log('✅ Token refreshed successfully');
      this.warningShown = false; // Reset warning flag
      return true;
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      return false;
    }
  }

  /**
   * Clear all authentication data
   */
  clearAuthData() {
    const authKeys = [
      'token', 'authToken', 'access_token', 'refresh_token',
      'adminToken', 'instructorToken', 'studentToken',
      'user', 'adminUser', 'instructorUser', 'studentUser',
      'userRole', 'userInfo', 'currentUser', 'userData'
    ];

    authKeys.forEach(key => localStorage.removeItem(key));

    // Trigger storage event for other tabs
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'token',
      newValue: null,
      oldValue: 'cleared'
    }));

    console.log('🧹 All authentication data cleared');
  }

  /**
   * Setup cross-tab logout listener
   */
  setupStorageListener() {
    const handleStorageChange = (event) => {
      if (event.key === 'token' && event.newValue === null) {
        console.log('📡 Token cleared in another tab, logging out...');
        this.handleSessionExpiry();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Store reference for cleanup
    this.storageListener = handleStorageChange;
  }

  /**
   * Add session event listener
   */
  addEventListener(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Remove session event listener
   */
  removeEventListener(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  /**
   * Emit event to listeners
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Cleanup session manager
   */
  destroy() {
    this.stopSessionMonitoring();

    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
    }

    // Remove session warning if exists
    const warningElement = document.getElementById('session-warning');
    if (warningElement) {
      warningElement.remove();
    }

    this.listeners = [];

    console.log('🗑️ Session Manager destroyed');
  }

  /**
   * Get session info for debugging
   */
  getSessionInfo() {
    const token = this.getAuthToken();
    if (!token) {
      return { hasToken: false };
    }

    const isExpired = this.isTokenExpired(token);
    const timeUntilExpiry = this.getTimeUntilExpiry(token);

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        hasToken: true,
        isExpired,
        timeUntilExpiry,
        expiresAt: new Date(payload.exp * 1000),
        payload
      };
    } catch (error) {
      return {
        hasToken: true,
        isExpired: true,
        error: 'Could not decode token'
      };
    }
  }
}

// Create singleton instance
const sessionManager = new SessionManager();

// Export both the class and the singleton
export { SessionManager, sessionManager };
export default sessionManager;