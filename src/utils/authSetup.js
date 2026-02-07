/**
 * Authentication Setup for Students Management
 * Provides mock authentication for development/testing
 */

// Create a valid JWT-like token for API requests
export const createMockAuthToken = () => {
  const header = {
    alg: "HS256",
    typ: "JWT"
  };

  const payload = {
    user_id: "superadmin",
    email: "admin@skillwallah.com", 
    role: "super_admin",
    username: "superadmin",
    sub: "superadmin",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours from now
  };

  // Create properly encoded base64 strings (without padding issues)
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '');
  const signature = "mock_signature_for_testing";

  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

// Setup authentication for the application
export const setupAuth = () => {
  // CHECK: If user is already logged in, DO NOT overwrite their data
  const existingUser = localStorage.getItem('user');
  const existingToken = localStorage.getItem('token') || 
                       localStorage.getItem('authToken') ||
                       localStorage.getItem('studentToken') ||
                       localStorage.getItem('instructorToken') ||
                       localStorage.getItem('adminToken');
  
  if (existingUser && existingToken) {
    try {
      const user = JSON.parse(existingUser);
      console.log('✅ User already authenticated:', user.name, '(', user.role, ')');
      console.log('⚠️ SKIPPING setupAuth() - preserving existing user session');
      return { token: existingToken, user };
    } catch (error) {
      console.warn('⚠️ Error parsing existing user, will setup new auth:', error);
    }
  }

  console.log('🔄 No existing user found - setting up super admin for testing');

  // Clear any existing tokens first
  const keysToRemove = ['token', 'adminToken', 'authToken', 'instructorToken', 'studentToken', 
                       'user', 'adminUser', 'instructorUser', 'studentUser'];
  keysToRemove.forEach(key => localStorage.removeItem(key));

  // Create a proper JWT-like token for API compatibility
  const token = createMockAuthToken();
  const user = {
    user_id: "superadmin",
    email: "admin@skillwallah.com",
    role: "super_admin",
    username: "superadmin",
    name: "Super Admin User"
  };

  // Store in various localStorage keys for compatibility
  localStorage.setItem('token', token);
  localStorage.setItem('adminToken', token);
  localStorage.setItem('authToken', token);
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('adminUser', JSON.stringify(user));

  console.log('✅ Authentication setup completed with JWT token');
  console.log('🔑 Token length:', token.length);
  return { token, user };
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
  return !!token;
};

// Get current user from localStorage
export const getCurrentUser = () => {
  try {
    const user = localStorage.getItem('user') || localStorage.getItem('adminUser');
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};