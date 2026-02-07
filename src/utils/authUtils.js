/**
 * Utility functions for role-based navigation and authentication
 */

// Get user role from localStorage
export const getUserRole = () => {
  try {
    const userData = localStorage.getItem('user');
    console.log('getUserRole() - Raw userData:', userData);

    if (userData) {
      const user = JSON.parse(userData);
      console.log('getUserRole() - Parsed user:', user);
      console.log('getUserRole() - User role:', user.role);
      return user.role;
    }

    console.log('getUserRole() - No user data found');
  } catch (error) {
    console.error('getUserRole() - Error parsing user data:', error);
    console.error('getUserRole() - Raw userData causing error:', userData);
  }
  return null;
};

// Get complete user data from localStorage
export const getUserData = () => {
  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      return JSON.parse(userData);
    }
  } catch (error) {
    console.error('Error parsing user data:', error);
  }
  return null;
};

// Check if user is authenticated - PERSISTENT (NO EXPIRATION CHECK)
export const isAuthenticated = () => {
  try {
    // Check multiple token sources for maximum reliability
    const token = localStorage.getItem('token') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('adminToken');
    const userData = localStorage.getItem('user');

    console.log('🔍 isAuthenticated() PERSISTENT check:');
    console.log('  Token exists:', !!token);
    console.log('  UserData exists:', !!userData);

    // PERSISTENT AUTH: Only check if token and user data exist (NO EXPIRATION)
    if (!token || !userData) {
      console.log('❌ isAuthenticated() - Missing token or user data:', { token: !!token, userData: !!userData });
      return false;
    }

    // Try to parse user data to ensure it's valid
    try {
      const parsedUser = JSON.parse(userData);
      if (!parsedUser || !parsedUser.role) {
        console.log('❌ isAuthenticated() - Invalid user data structure:', parsedUser);
        return false;
      }

      // VALIDATE TOKEN MATCHES USER EMAIL
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const tokenEmail = payload.email || payload.sub;
          const userEmail = parsedUser.email;

          if (tokenEmail && userEmail && tokenEmail !== userEmail) {
            console.error('❌ TOKEN MISMATCH! Token email:', tokenEmail, 'User email:', userEmail);
            console.error('   Clearing mismatched auth data...');
            // Clear all tokens
            localStorage.removeItem('token');
            localStorage.removeItem('authToken');
            localStorage.removeItem('adminToken');
            localStorage.removeItem('user');
            return false;
          }
          console.log('✅ Token email matches user email:', userEmail);
        }
      } catch (tokenError) {
        console.warn('⚠️ Could not validate token email:', tokenError);
        // Continue anyway - token might be in different format
      }

      console.log('✅ isAuthenticated() PERSISTENT - User role found:', parsedUser.role);
      console.log('✅ isAuthenticated() PERSISTENT - User data:', parsedUser);

      // Special check for super admin roles
      if (parsedUser.role === 'super_admin' || parsedUser.role === 'superadmin') {
        console.log('🌟 SUPER ADMIN DETECTED - PERSISTENT Authentication confirmed!');
      }

      console.log('✅ isAuthenticated() PERSISTENT - Authentication check passed (NO EXPIRY)');
      return true;
    } catch (parseError) {
      console.log('❌ isAuthenticated() - Error parsing user data:', parseError);
      console.log('❌ Raw user data causing error:', userData);
      return false;
    }
  } catch (error) {
    console.error('❌ isAuthenticated() - Unexpected error:', error);
    return false;
  }
};

// Get role-based dashboard route
export const getDashboardRoute = (role = null) => {
  const userRole = role || getUserRole();

  switch (userRole) {
    case 'super_admin':
    case 'superadmin':
      return '/superadmin/dashboard';
    case 'admin':
      return '/branch/admin-dashboard';
    case 'instructor':
      return '/instructor';
    case 'branch_admin':
    case 'branch':
      return '/branch/dashboard';
    case 'student':
    default:
      return '/students';
  }
};

// Navigate to role-based dashboard
export const navigateToRoleDashboard = (navigate, role = null) => {
  const route = getDashboardRoute(role);
  navigate(route);
};

// Check if user has required role
export const hasRole = (requiredRole) => {
  const userRole = getUserRole();
  return userRole === requiredRole;
};

// Check if user has any of the required roles
export const hasAnyRole = (requiredRoles) => {
  const userRole = getUserRole();
  return requiredRoles.includes(userRole);
};

// Get role-specific token
export const getRoleToken = (role = null) => {
  const userRole = role || getUserRole();

  switch (userRole) {
    case 'admin':
      return localStorage.getItem('adminToken') || localStorage.getItem('token') || localStorage.getItem('authToken');
    case 'instructor':
      return localStorage.getItem('instructorToken') || localStorage.getItem('token') || localStorage.getItem('authToken');
    case 'student':
      return localStorage.getItem('studentToken') || localStorage.getItem('token') || localStorage.getItem('authToken');
    default:
      return localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('adminToken') || localStorage.getItem('instructorToken') || localStorage.getItem('studentToken');
  }
};

// Store role-specific authentication data
export const storeAuthData = (token, user) => {
  const userRole = user?.role;
  const userEmail = user?.email;

  console.log('🔐 storeAuthData() - Storing auth data');
  console.log(`   User: ${userEmail}`);
  console.log(`   Role: ${userRole}`);

  // FIRST: Clear ALL old tokens to prevent conflicts
  console.log('🧹 AGGRESSIVE TOKEN CLEARING - Removing ALL old tokens...');

  const allTokenKeys = [
    'token',
    'authToken',
    'adminToken',
    'instructorToken',
    'studentToken',
    'access_token',
    'refresh_token'
  ];

  const allUserKeys = [
    'user',
    'adminUser',
    'instructorUser',
    'studentUser',
    'adminData'
  ];

  const allOtherKeys = [
    'userRole',
    'franchise_code',
    'branch_code'
  ];

  // Clear all tokens
  allTokenKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      console.log(`   🗑️ Removing old token: ${key}`);
      localStorage.removeItem(key);
    }
  });

  // Clear all user data
  allUserKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      console.log(`   🗑️ Removing old user data: ${key}`);
      localStorage.removeItem(key);
    }
  });

  // Clear other data
  allOtherKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      console.log(`   🗑️ Removing: ${key}`);
      localStorage.removeItem(key);
    }
  });

  console.log('✅ All old tokens cleared!');

  // THEN: Store new general token and user data
  console.log('💾 Storing new token and user data...');
  localStorage.setItem('token', token);
  localStorage.setItem('authToken', token);
  localStorage.setItem('access_token', token);
  localStorage.setItem('user', JSON.stringify(user));

  // Store role-specific tokens for compatibility
  if (userRole === 'admin' || userRole === 'branch_admin') {
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminData', JSON.stringify(user));
    localStorage.setItem('adminUser', JSON.stringify(user));
    console.log('✅ Stored admin-specific tokens');
  } else if (userRole === 'instructor') {
    localStorage.setItem('instructorToken', token);
    localStorage.setItem('instructorUser', JSON.stringify(user));
    console.log('✅ Stored instructor-specific tokens');
  } else if (userRole === 'student') {
    localStorage.setItem('studentToken', token);
    localStorage.setItem('studentUser', JSON.stringify(user));
    console.log('✅ Stored student-specific tokens');
  } else if (userRole === 'super_admin' || userRole === 'superadmin') {
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminData', JSON.stringify(user));
    console.log('✅ Stored super admin tokens');
  }

  console.log(`✅ storeAuthData() Complete for ${userEmail}!`);
};

// Check if user is authenticated with specific role
export const isAuthenticatedWithRole = (requiredRole) => {
  const userRole = getUserRole();
  const token = getRoleToken(userRole);
  return !!(token && userRole === requiredRole);
};

// Get user permissions based on role
export const getUserPermissions = () => {
  try {
    const userData = getUserData();
    return userData?.permissions || [];
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
};

// Check if user has specific permission
export const hasPermission = (permission) => {
  const permissions = getUserPermissions();
  return permissions.includes(permission);
};

// Get authentication headers for API requests
export const getAuthHeaders = (role = null) => {
  const token = getRoleToken(role);
  const headers = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Debug logging to help troubleshoot auth issues
  console.log('=== AUTH HEADERS DEBUG ===');
  console.log('Role:', role);
  console.log('Token found:', !!token);
  console.log('Token preview:', token ? token.substring(0, 20) + '...' : 'No token');
  console.log('Headers:', headers);

  return headers;
};

// Get axios config with authentication headers
export const getAxiosConfig = (role = null) => {
  const token = getRoleToken(role);
  return {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  };
};

// Logout function that clears all auth data and redirects to home page
export const logout = (navigate = null, userRole = null) => {
  manualLogout();
};

// Manual logout function - ONLY called when user explicitly clicks signout
// This prevents automatic logouts and maintains persistent sessions
export const manualLogout = () => {
  console.log('🚪 MANUAL LOGOUT INITIATED BY USER');

  // Clear all authentication data from localStorage
  const keysToRemove = [
    // Tokens
    'token',
    'authToken',
    'adminToken',
    'instructorToken',
    'studentToken',
    'access_token',
    'refresh_token',

    // User Objects
    'user',
    'adminUser',
    'instructorUser',
    'studentUser',
    'adminData',

    // Context & State
    'userRole',
    'role',
    'franchise_code',
    'branch_code',
    'adminCurrentTab',
    'superadmin_dashboard_stats',
    'superAdminId',
    'superAdminName',
    'superAdminEmail',
    'isAuthenticated',
    'authMethod',
    'loginTimestamp'
  ];

  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });

  // Clear sessionStorage as well
  keysToRemove.forEach(key => {
    sessionStorage.removeItem(key);
  });

  // Complete sessionStorage clear
  sessionStorage.clear();

  // Trigger storage event for other tabs
  window.dispatchEvent(new Event('storage'));

  // Trigger custom auth state change event for immediate UI updates
  window.dispatchEvent(new CustomEvent('authStateChanged'));

  console.log('✅ MANUAL LOGOUT COMPLETE - All auth data cleared from all storage locations');

  // Redirect to home page
  window.location.href = '/';
};

// Validate that the stored token matches the current user
export const validateTokenMatchesUser = () => {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('adminToken');
    const userString = localStorage.getItem('user');

    if (!token || !userString) {
      console.log('⚠️ No token or user data found');
      return false;
    }

    const user = JSON.parse(userString);

    // Decode JWT token to get the payload
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.error('❌ Invalid token format');
      return false;
    }

    const payload = JSON.parse(atob(tokenParts[1]));

    // Check if token email matches user email
    const tokenEmail = payload.email || payload.sub;
    const userEmail = user.email;

    if (tokenEmail !== userEmail) {
      console.error('❌ TOKEN MISMATCH DETECTED!');
      console.error(`   Token email: ${tokenEmail}`);
      console.error(`   User email: ${userEmail}`);
      console.error('   Clearing mismatched auth data...');

      // Clear all auth data
      manualLogout();
      return false;
    }

    console.log('✅ Token matches user:', userEmail);
    return true;
  } catch (error) {
    console.error('❌ Error validating token:', error);
    return false;
  }
};

