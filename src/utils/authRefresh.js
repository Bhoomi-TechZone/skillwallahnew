/**
 * Authentication status and refresh utility
 */
import { getValidToken, debugAuthState } from '../utils/authDebug';

export const checkAndRefreshAuth = async () => {
  const token = getValidToken();
  
  if (!token) {
    console.warn('No valid token found. Need to re-authenticate.');
    return false;
  }
  
  // If we have a refresh token, try to refresh
  const refreshToken = localStorage.getItem('refresh_token');
  if (refreshToken && !token) {
    try {
      // Call refresh endpoint (implement as needed)
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        console.log('✅ Token refreshed successfully');
        return true;
      }
    } catch (error) {
      console.error('Failed to refresh token:', error);
    }
  }
  
  return !!token;
};

export const forceAuthRefresh = () => {
  console.log('🔄 Forcing authentication refresh...');
  debugAuthState();
  
  const hasValidAuth = checkAndRefreshAuth();
  
  if (!hasValidAuth) {
    if (confirm('Authentication is invalid. Redirect to login?')) {
      localStorage.clear();
      window.location.href = '/login';
    }
  }
  
  return hasValidAuth;
};
