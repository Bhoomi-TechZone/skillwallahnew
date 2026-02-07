/**
 * Enhanced Authentication Utilities
 * 
 * Provides fast, role-based authentication with instant dashboard routing
 * and optimized user data management.
 */

/**
 * Fast authentication check without expensive operations
 */
export const isAuthenticated = () => {
  const token = localStorage.getItem('token') ||
                localStorage.getItem('authToken') ||
                localStorage.getItem('studentToken') ||
                localStorage.getItem('instructorToken') ||
                localStorage.getItem('adminToken');
  
  const userData = localStorage.getItem('user');
  return !!(token && userData);
};

/**
 * Get user role with caching
 */
let _cachedUserRole = null;
let _lastRoleCheck = 0;
const ROLE_CACHE_DURATION = 30000; // 30 seconds

export const getUserRole = () => {
  const now = Date.now();
  
  // Use cached role if available and fresh
  if (_cachedUserRole && (now - _lastRoleCheck) < ROLE_CACHE_DURATION) {
    return _cachedUserRole;
  }

  try {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const userRole = (userData.role || '').toLowerCase();
    
    // Cache the role
    _cachedUserRole = userRole;
    _lastRoleCheck = now;
    
    return userRole;
  } catch (error) {
    console.error('Error parsing user data:', error);
    
    // Fallback: try to determine role from URL or token
    const path = window.location.pathname;
    if (path.includes('/admin')) return 'admin';
    if (path.includes('/instructor')) return 'instructor';
    if (path.includes('/student')) return 'student';
    
    return '';
  }
};

/**
 * Get user data with caching
 */
let _cachedUserData = null;
let _lastDataCheck = 0;
const DATA_CACHE_DURATION = 60000; // 1 minute

export const getUserData = () => {
  const now = Date.now();
  
  // Use cached data if available and fresh
  if (_cachedUserData && (now - _lastDataCheck) < DATA_CACHE_DURATION) {
    return _cachedUserData;
  }

  try {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Cache the data
    _cachedUserData = userData;
    _lastDataCheck = now;
    
    return userData;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return {};
  }
};

/**
 * Clear cached authentication data
 */
export const clearAuthCache = () => {
  _cachedUserRole = null;
  _cachedUserData = null;
  _lastRoleCheck = 0;
  _lastDataCheck = 0;
  console.log('🧹 Authentication cache cleared');
};

/**
 * Get role-based dashboard routes
 */
export const getDashboardRoute = (role = null) => {
  const userRole = role || getUserRole();
  
  const routes = {
    'admin': '/branch/admin-dashboard',
    'instructor': '/instructor/dashboard', 
    'student': '/student/dashboard',
    'branch_admin': '/branch/dashboard',
    'branch': '/branch/dashboard'
  };
  
  return routes[userRole] || '/student/dashboard';
};

/**
 * Navigate to appropriate dashboard based on user role
 */
export const navigateToRoleDashboard = (navigate, role = null) => {
  const route = getDashboardRoute(role);
  console.log(`🚀 Navigating to ${role || getUserRole()} dashboard: ${route}`);
  navigate(route, { replace: true });
};

/**
 * Check if user has required role
 */
export const hasRole = (requiredRole) => {
  const userRole = getUserRole();
  return userRole === requiredRole.toLowerCase();
};

/**
 * Check if user has any of the required roles
 */
export const hasAnyRole = (requiredRoles) => {
  const userRole = getUserRole();
  return requiredRoles.map(r => r.toLowerCase()).includes(userRole);
};

/**
 * Get authentication token based on role or fallback
 */
export const getAuthToken = (role = null) => {
  const userRole = role || getUserRole();
  
  // Try role-specific token first
  const roleTokens = {
    'admin': 'adminToken',
    'instructor': 'instructorToken',
    'student': 'studentToken'
  };
  
  if (userRole && roleTokens[userRole]) {
    const roleToken = localStorage.getItem(roleTokens[userRole]);
    if (roleToken) return roleToken;
  }
  
  // Fallback to generic tokens
  const fallbackTokens = ['token', 'authToken'];
  for (const tokenKey of fallbackTokens) {
    const token = localStorage.getItem(tokenKey);
    if (token && token.trim()) return token.trim();
  }
  
  return null;
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch (error) {
    console.error('Error decoding token:', error);
    return true;
  }
};

/**
 * Check if current session is valid
 */
export const isValidSession = () => {
  const token = getAuthToken();
  return token && !isTokenExpired(token) && isAuthenticated();
};

/**
 * Store authentication data with role-specific tokens
 */
export const storeAuthData = (data) => {
  try {
    // Store main data
    if (data.access_token || data.token) {
      localStorage.setItem('token', data.access_token || data.token);
    }
    
    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    
    // Store role-specific tokens for compatibility
    const userRole = data.user?.role?.toLowerCase() || getUserRole();
    if (userRole && (data.access_token || data.token)) {
      const token = data.access_token || data.token;
      
      switch (userRole) {
        case 'admin':
          localStorage.setItem('adminToken', token);
          localStorage.setItem('adminUser', JSON.stringify(data.user || {}));
          break;
        case 'instructor':
          localStorage.setItem('instructorToken', token);
          localStorage.setItem('instructorUser', JSON.stringify(data.user || {}));
          break;
        case 'student':
          localStorage.setItem('studentToken', token);
          localStorage.setItem('studentUser', JSON.stringify(data.user || {}));
          break;
      }
    }
    
    // Clear cache to force refresh
    clearAuthCache();
    
    console.log(`✅ Authentication data stored for role: ${userRole}`);
    return true;
  } catch (error) {
    console.error('Error storing authentication data:', error);
    return false;
  }
};

/**
 * Clear all authentication data
 */
export const clearAuthData = () => {
  const authKeys = [
    'token', 'authToken', 'access_token', 'refresh_token',
    'adminToken', 'instructorToken', 'studentToken',
    'user', 'adminUser', 'instructorUser', 'studentUser',
    'userRole', 'userInfo', 'currentUser', 'userData'
  ];
  
  authKeys.forEach(key => localStorage.removeItem(key));
  clearAuthCache();
  
  console.log('🧹 All authentication data cleared');
};

/**
 * Logout user and redirect
 */
export const logout = (navigate = null) => {
  clearAuthData();
  
  // Trigger storage event for other tabs
  window.dispatchEvent(new Event('storage'));
  
  // Trigger custom auth state change event for immediate UI updates
  window.dispatchEvent(new CustomEvent('authStateChanged'));
  
  // Always redirect to home page after logout with full page reload
  // This ensures clean state and proper rendering of the home page
  console.log('🚪 Logging out and redirecting to home page');
  window.location.href = '/';
};

/**
 * Get axios config with authentication headers
 */
export const getAxiosConfig = () => {
  const token = getAuthToken();
  
  return {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  };
};

/**
 * Handle authentication errors consistently
 */
export const handleAuthError = (error, navigate = null) => {
  console.error('🚫 Authentication error:', error);
  
  // Check if it's actually an auth error
  const isAuthError = 
    error?.response?.status === 401 ||
    error?.response?.status === 403 ||
    error?.status === 401 ||
    error?.status === 403 ||
    error?.message?.includes('authentication') ||
    error?.message?.includes('unauthorized') ||
    error?.message?.includes('forbidden');
  
  if (isAuthError) {
    clearAuthData();
    
    if (navigate) {
      const userRole = getUserRole();
      const loginRoutes = {
        'admin': '/admin-login',
        'instructor': '/instructor-login',
        'student': '/student-login'
      };
      
      const loginRoute = loginRoutes[userRole] || '/login';
      console.log(`🚪 Authentication failed, redirecting to: ${loginRoute}`);
      navigate(loginRoute, { replace: true });
    }
    
    return true; // Indicates auth error was handled
  }
  
  return false; // Not an auth error
};

/**
 * Preload role-specific dashboard component
 */
export const preloadDashboard = (role = null) => {
  const userRole = role || getUserRole();
  
  const dashboardImports = {
    'admin': () => import('../pages/superadmin/SuperAdminDashboard'),
    'instructor': () => import('../pages/instructor/InstructorDashboard'),
    'student': () => import('../pages/student/NewStudentDashboard')
  };
  
  if (dashboardImports[userRole]) {
    console.log(`🚀 Preloading ${userRole} dashboard component`);
    dashboardImports[userRole]().catch((error) => {
      console.warn(`Failed to preload ${userRole} dashboard:`, error);
    });
  }
};

/**
 * Quick authentication guard for protected routes
 */
export const useAuthGuard = (navigate, requiredRole = null) => {
  if (!isValidSession()) {
    console.warn('🚫 Invalid session detected in auth guard');
    logout(navigate);
    return false;
  }
  
  if (requiredRole && !hasRole(requiredRole)) {
    console.warn(`🚫 Insufficient permissions. Required: ${requiredRole}, Current: ${getUserRole()}`);
    navigateToRoleDashboard(navigate);
    return false;
  }
  
  return true;
};

/**
 * Auto-login check for login pages
 */
export const checkAutoLogin = (navigate, expectedRole = null) => {
  if (!isValidSession()) {
    return false; // Not logged in, stay on login page
  }
  
  const userRole = getUserRole();
  
  // If user is already logged in with correct role, redirect to dashboard
  if (!expectedRole || userRole === expectedRole) {
    console.log(`✅ Auto-login detected for ${userRole}`);
    navigateToRoleDashboard(navigate, userRole);
    return true;
  }
  
  // User logged in but wrong role - redirect to correct dashboard
  if (expectedRole && userRole !== expectedRole) {
    console.log(`⚠️ Wrong role detected. Expected: ${expectedRole}, Current: ${userRole}`);
    navigateToRoleDashboard(navigate, userRole);
    return true;
  }
  
  return false;
};

// Export default object for convenient importing
const authUtils = {
  isAuthenticated,
  getUserRole,
  getUserData,
  clearAuthCache,
  getDashboardRoute,
  navigateToRoleDashboard,
  hasRole,
  hasAnyRole,
  getAuthToken,
  isTokenExpired,
  isValidSession,
  storeAuthData,
  clearAuthData,
  logout,
  getAxiosConfig,
  handleAuthError,
  preloadDashboard,
  useAuthGuard,
  checkAutoLogin
};

export default authUtils;