/**
 * Authentication Middleware and Utilities
 * Handles authentication errors, token validation, and user session management
 */

import React from 'react';

// Inline utility functions to avoid import issues
const getAuthToken = () => {
  const tokenKeys = ['token', 'authToken', 'instructorToken', 'adminToken', 'studentToken'];
  
  for (const key of tokenKeys) {
    const token = localStorage.getItem(key);
    if (token && token.trim()) {
      return token.trim();
    }
  }
  
  return null;
};

const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    console.warn('Could not decode token:', error);
    return true;
  }
};

const isAuthenticated = () => {
  const token = getAuthToken();
  return token && !isTokenExpired(token);
};

const clearAuth = () => {
  const authKeys = ['token', 'authToken', 'instructorToken', 'adminToken', 'studentToken', 
                   'user', 'userInfo', 'currentUser', 'authUser', 'userData', 
                   'instructorUser', 'adminUser', 'studentUser', 'refresh_token'];
  
  authKeys.forEach(key => {
    localStorage.removeItem(key);
  });
  
  console.log('🧹 Authentication data cleared');
};

const debugAuth = () => {
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
  
  // Get current user data
  const userKeys = ['user', 'userInfo', 'currentUser', 'authUser', 'userData'];
  for (const key of userKeys) {
    try {
      const userData = localStorage.getItem(key);
      if (userData) {
        const parsed = JSON.parse(userData);
        console.log(`👤 User data (${key}):`, parsed);
        break;
      }
    } catch (error) {
      console.warn(`Error parsing ${key}:`, error);
    }
  }
  
  console.log('👤 User authenticated:', isAuthenticated());
  console.log('💾 localStorage keys:', Object.keys(localStorage));
  console.log('============================');
};

// Authentication error handler
export const handleAuthError = (error, navigate = null) => {
  console.error('🚫 Authentication Error:', error);
  
  // Clear invalid authentication data
  clearAuth();
  
  // If navigation is available, redirect to login
  if (navigate) {
    console.log('🔄 Redirecting to login...');
    navigate('/auth', { replace: true });
  } else {
    // Fallback: reload page to trigger auth check
    console.log('🔄 Reloading page to trigger authentication...');
    window.location.href = '/auth';
  }
};

// Check authentication status and redirect if needed
export const checkAuthAndRedirect = (navigate) => {
  if (!isAuthenticated()) {
    console.warn('🚫 User not authenticated, redirecting to login');
    handleAuthError(new Error('Not authenticated'), navigate);
    return false;
  }
  return true;
};

// Enhanced error handling for API responses
export const handleApiError = (error, navigate = null) => {
  // Check if it's an authentication error
  if (error.message.includes('Authentication') || 
      error.message.includes('401') || 
      error.message.includes('403') ||
      error.message.includes('Unauthorized')) {
    handleAuthError(error, navigate);
    return;
  }
  
  // Log other errors
  console.error('❌ API Error:', error);
  
  // Show user-friendly error message
  if (error.message.includes('Network')) {
    alert('Network connection error. Please check your internet connection and try again.');
  } else {
    alert(error.message || 'An unexpected error occurred. Please try again.');
  }
};

// Wrapper for components that require authentication
export const withAuth = (WrappedComponent) => {
  return function AuthenticatedComponent(props) {
    const navigate = props.navigate;
    
    // Check authentication on component mount
    React.useEffect(() => {
      if (!checkAuthAndRedirect(navigate)) {
        return; // Component will unmount due to redirect
      }
    }, [navigate]);
    
    // Don't render component if not authenticated
    if (!isAuthenticated()) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Checking authentication...</p>
          </div>
        </div>
      );
    }
    
    return <WrappedComponent {...props} />;
  };
};

// Session management utilities
export const SessionManager = {
  // Check session validity
  isSessionValid() {
    return isAuthenticated();
  },
  
  // Refresh session
  async refreshSession() {
    try {
      const { refreshAuthToken } = await import('./apiRequest.js');
      await refreshAuthToken();
      return true;
    } catch (error) {
      console.error('Session refresh failed:', error);
      return false;
    }
  },
  
  // Monitor session and auto-logout on expiry
  startSessionMonitoring(navigate) {
    const checkSession = () => {
      if (!this.isSessionValid()) {
        console.warn('Session expired, logging out...');
        handleAuthError(new Error('Session expired'), navigate);
      }
    };
    
    // Check session every 30 minutes for better UX
    const intervalId = setInterval(checkSession, 30 * 60 * 1000);
    
    // Check immediately
    checkSession();
    
    return intervalId;
  },
  
  // Stop session monitoring
  stopSessionMonitoring(intervalId) {
    if (intervalId) {
      clearInterval(intervalId);
    }
  },
  
  // Handle storage events (for multi-tab logout)
  handleStorageEvent(event, navigate) {
    if (event.key === 'token' && event.newValue === null) {
      console.log('Token removed in another tab, logging out...');
      handleAuthError(new Error('Logged out in another tab'), navigate);
    }
  }
};

// Debug authentication helper
export const debugAuthentication = () => {
  debugAuth();
  
  // Additional debugging
  console.log('=== ADDITIONAL AUTH INFO ===');
  console.log('Session valid:', SessionManager.isSessionValid());
  console.log('Window location:', window.location.href);
  console.log('============================');
};

// Initialize authentication for an app
export const initializeAuth = (navigate) => {
  // Start session monitoring
  const sessionIntervalId = SessionManager.startSessionMonitoring(navigate);
  
  // Listen for storage events (multi-tab logout)
  const handleStorageChange = (event) => {
    SessionManager.handleStorageEvent(event, navigate);
  };
  
  window.addEventListener('storage', handleStorageChange);
  
  // Return cleanup function
  return () => {
    SessionManager.stopSessionMonitoring(sessionIntervalId);
    window.removeEventListener('storage', handleStorageChange);
  };
};

export default {
  handleAuthError,
  checkAuthAndRedirect,
  handleApiError,
  withAuth,
  SessionManager,
  debugAuthentication,
  initializeAuth
};
