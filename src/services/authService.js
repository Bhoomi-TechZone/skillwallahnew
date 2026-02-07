// Authentication service for handling user registration, login, and auth data

class AuthService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
  }

  // Register a new user
  async register(registrationData) {
    try {
      const response = await fetch(`${this.baseURL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  // Login user
  async login(credentials) {
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Login response:', data); // Debug log to see actual response structure

      // Handle different possible response formats
      if (data.success === false) {
        throw new Error(data.message || 'Login failed');
      }

      // Check for common token field names
      const token = data.token || data.access_token || data.accessToken || data.authToken;
      const user = data.user || data.data?.user || data.userData;

      // Return standardized format
      return {
        token: token,
        user: user,
        refresh_token: data.refresh_token || data.refreshToken,
        ...data // Include all original data
      };

    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  // Super Admin login with real backend endpoint
  async superAdminLogin(credentials) {
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...credentials,
          user_type: 'superadmin'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        token: data.token || data.access_token,
        user: data.user || data.data?.user,
        refresh_token: data.refresh_token,
        ...data
      };
    } catch (error) {
      console.error('Super Admin login failed:', error);
      throw error;
    }
  }

  // Admin login with specific endpoint
  async adminLogin(credentials) {
    try {
      console.log('🔄 Attempting admin login with:', {
        email: credentials.email,
        url: `${this.baseURL}/api/admin/login`,
        baseURL: this.baseURL
      });

      console.log('📝 Request payload:', {
        email: credentials.email,
        passwordLength: credentials.password?.length,
        timestamp: new Date().toISOString()
      });

      // Test backend connectivity first
      try {
        console.log('🔍 Testing backend connectivity...');
        const testResponse = await fetch(`${this.baseURL}/health`, {
          method: 'HEAD',
          timeout: 5000
        });
        console.log('🏥 Backend health check:', testResponse.status);
      } catch (healthError) {
        console.warn('⚠️ Backend health check failed:', healthError.message);
      }

      // Use real backend endpoint for admin login
      const response = await fetch(`${this.baseURL}/api/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      console.log('📡 Admin login response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Admin login failed with status:', response.status, errorData);

        // Log additional debug info for 401 errors
        if (response.status === 401) {
          console.log('🔍 401 Debug Info:', {
            requestUrl: `${this.baseURL}/api/admin/login`,
            requestMethod: 'POST',
            requestHeaders: { 'Content-Type': 'application/json' },
            responseStatus: response.status,
            responseStatusText: response.statusText,
            errorData: errorData,
            suggestion: 'Check if credentials exist in franchises collection and admin login endpoint is implemented correctly'
          });
        }

        // Provide specific error messages based on status
        if (response.status === 401) {
          throw new Error('Invalid email or password. Please check your credentials.');
        } else if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        } else if (response.status === 404) {
          throw new Error('Admin login endpoint not found. Please contact support.');
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again later or contact support.');
        }

        throw new Error(errorData.message || errorData.detail || `Login failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Admin login successful, raw response:', data);

      // Extract and validate response data
      const token = data.token || data.access_token || data.accessToken || data.authToken;
      const user = data.user || data.data?.user || data.userData || data.admin;

      if (!token) {
        console.error('❌ No token received from backend:', data);
        throw new Error('Authentication token not received from server');
      }

      if (!user) {
        console.error('❌ No user data received from backend:', data);
        throw new Error('User data not received from server');
      }

      // Construct proper user object with real data
      const adminUser = {
        id: user.id || user.admin_id || user.user_id,
        email: user.email || credentials.email,
        name: user.name || user.admin_name || user.username,
        role: user.role || user.user_type || 'admin',
        branch_code: user.branch_code || user.franchise_code || '',
        permissions: user.permissions || [],
        created_at: user.created_at || new Date().toISOString(),
        ...user // Include any additional user fields
      };

      console.log('👤 Constructed admin user object:', adminUser);
      console.log('🔑 Token to be stored:', token.substring(0, 20) + '...');

      // Store authentication data in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('authToken', token); // Backup storage
      localStorage.setItem('user', JSON.stringify(adminUser));
      localStorage.setItem('userData', JSON.stringify(adminUser)); // Backup storage
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userRole', adminUser.role);

      // Store refresh token if available
      if (data.refresh_token) {
        localStorage.setItem('refreshToken', data.refresh_token);
      }

      console.log('✅ Authentication data stored successfully');

      // Return standardized format
      return {
        token: token,
        user: adminUser,
        refresh_token: data.refresh_token,
        success: true,
        ...data
      };

    } catch (error) {
      console.error('❌ Admin login failed:', error);

      // Provide user-friendly error messages
      if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
        throw new Error('Unable to connect to server. Please ensure the backend is running on http://localhost:4000');
      } else if (error.message.includes('CORS')) {
        throw new Error('Cross-origin request blocked. Please contact administrator.');
      }

      // Re-throw the original error for all other cases
      throw error;
    }
  }

  // Super Admin login with specific endpoint
  async superAdminLogin(credentials) {
    try {
      console.log('🔄 Attempting super admin login with:', {
        email: credentials.email,
        url: `${this.baseURL}/api/superadmin/login`
      });

      // Use the dedicated super admin endpoint
      const response = await fetch(`${this.baseURL}/api/superadmin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      console.log('📡 Super Admin endpoint response:', {
        status: response.status,
        statusText: response.statusText
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Super admin login failed:', response.status, errorData);

        // Provide specific error messages based on status
        if (response.status === 401) {
          throw new Error('Invalid email or password. Please check your credentials.');
        } else if (response.status === 403) {
          throw new Error('Access denied. Super admin privileges required.');
        } else if (response.status === 404) {
          throw new Error('Super admin login endpoint not found. Please contact support.');
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again later or contact support.');
        }

        throw new Error(errorData.message || errorData.detail || `Login failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Super admin login successful:', data);

      // Handle different possible response formats
      if (data.success === false) {
        throw new Error(data.message || 'Login failed');
      }

      // Extract and validate response data
      const token = data.token || data.access_token || data.accessToken || data.authToken;
      const user = data.user || data.data?.user || data.userData;

      if (!token) {
        console.error('❌ No token received from backend:', data);
        throw new Error('Authentication token not received from server');
      }

      if (!user) {
        console.error('❌ No user data received from backend:', data);
        throw new Error('User data not received from server');
      }

      // Store authentication data
      localStorage.setItem('token', token);
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('userData', JSON.stringify(user));
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userRole', user.role || 'super_admin');

      // Return standardized format
      return {
        token: token,
        user: user,
        refresh_token: data.refresh_token || data.refreshToken,
        success: true,
        ...data
      };

    } catch (error) {
      console.error('❌ Super Admin login failed:', error);

      // Provide user-friendly error messages
      if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
        throw new Error('Unable to connect to server. Please ensure the backend is running.');
      } else if (error.message.includes('CORS')) {
        throw new Error('Cross-origin request blocked. Please contact administrator.');
      }

      // Re-throw the original error for all other cases
      throw error;
    }
  }

  // Instructor login with specific endpoint
  async instructorLogin(credentials) {
    try {
      console.log('🔄 Attempting instructor login with:', {
        email: credentials.email,
        url: `${this.baseURL}/auth/login`
      });

      // Try multiple endpoints in order of preference
      const endpoints = [
        '/auth/login/role-based',  // Role-based login first
        '/auth/login'              // General login fallback
      ];

      let lastError = null;

      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Trying instructor endpoint: ${endpoint}`);

          const requestBody = endpoint.includes('role-based')
            ? { ...credentials, role: 'instructor' }
            : { ...credentials, userType: 'instructor' };

          const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          console.log(`📡 Response from ${endpoint}:`, {
            status: response.status,
            statusText: response.statusText
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`❌ Instructor login failed at ${endpoint}:`, response.status, errorData);

            const errorMessage = errorData.message || errorData.detail || `HTTP error! status: ${response.status}`;
            lastError = new Error(errorMessage);
            continue; // Try next endpoint
          }

          const data = await response.json();
          console.log(`✅ Successful instructor response from ${endpoint}:`, data);

          // Handle different possible response formats
          if (data.success === false) {
            lastError = new Error(data.message || 'Login failed');
            continue;
          }

          // Extract and validate response data
          const token = data.token || data.access_token || data.accessToken || data.authToken;
          const user = data.user || data.data?.user || data.userData;

          if (!token) {
            console.error('❌ No token received from backend:', data);
            throw new Error('Authentication token not received from server');
          }

          if (!user) {
            console.error('❌ No user data received from backend:', data);
            throw new Error('User data not received from server');
          }

          // Store authentication data
          localStorage.setItem('token', token);
          localStorage.setItem('authToken', token);
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('userData', JSON.stringify(user));
          localStorage.setItem('isAuthenticated', 'true');
          localStorage.setItem('userRole', user.role || 'instructor');

          // Return standardized format
          return {
            token: token,
            user: user,
            refresh_token: data.refresh_token || data.refreshToken,
            success: true,
            ...data
          };

        } catch (endpointError) {
          console.error(`❌ Error with instructor ${endpoint}:`, endpointError);
          lastError = endpointError;
          continue;
        }
      }

      // If we get here, all endpoints failed
      throw lastError || new Error('All instructor login endpoints failed');

    } catch (error) {
      console.error('❌ Instructor login failed:', error);

      // Provide user-friendly error messages
      if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
        throw new Error('Unable to connect to server. Please ensure the backend is running.');
      } else if (error.message.includes('CORS')) {
        throw new Error('Cross-origin request blocked. Please contact administrator.');
      }

      // Re-throw the original error for all other cases
      throw error;
    }
  }

  // Student login with specific endpoint
  async studentLogin(credentials) {
    try {
      const studentBaseURL = 'http://localhost:4000';

      console.log('🔐 [AuthService] Attempting student login...');
      console.log('📧 Email:', credentials.email);

      // First try the main student login endpoint
      try {
        console.log('📡 Trying endpoint: /login/student');
        console.log('📧 Login credentials:', { email: credentials.email, passwordLength: credentials.password?.length });

        const response = await fetch(`${studentBaseURL}/login/student`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password
          }),
        });

        console.log('📥 Response status:', response.status, response.statusText);

        // Read response text first to debug
        const responseText = await response.text();
        console.log('📥 Raw response:', responseText);

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('❌ Failed to parse response:', parseError);
          throw new Error('Invalid response from server');
        }

        console.log('📥 Parsed response data:', data);

        if (response.ok) {
          console.log('✅ Login successful!');

          const token = data.token || data.access_token || data.accessToken || data.authToken;
          const user = data.user || data.data?.user || data.userData;

          if (!token) {
            console.error('❌ No token in response');
            throw new Error('Authentication failed - no token received');
          }

          if (!user) {
            console.error('❌ No user data in response');
            throw new Error('Authentication failed - no user data received');
          }

          return {
            token: token,
            access_token: token,
            user: {
              ...user,
              role: 'student' // Ensure role is always set
            },
            refresh_token: data.refresh_token || data.refreshToken,
            token_type: data.token_type || 'bearer',
            message: data.message || 'Login successful'
          };
        } else {
          // Get detailed error from backend
          const errorMessage = data.detail || data.message || `Login failed with status ${response.status}`;
          console.error('❌ Login failed:', errorMessage);
          console.error('❌ Full error data:', data);

          // Provide specific error messages based on status code
          if (response.status === 401) {
            throw new Error('Invalid email or password. Please check your credentials.');
          } else if (response.status === 403) {
            throw new Error(data.detail || 'Access denied. Login may be disabled for your account.');
          } else if (response.status === 404) {
            throw new Error('Student account not found. Please contact administrator.');
          }

          // Throw error with backend message
          throw new Error(errorMessage);
        }
      } catch (error) {
        console.error('❌ Student login error:', error);

        // If it's a fetch error, provide helpful message
        if (error.message.includes('fetch') || error.message.includes('Network')) {
          throw new Error('Unable to connect to server. Please make sure the backend is running on http://localhost:4000');
        }

        throw error;
      }

    } catch (error) {
      console.error('❌ [AuthService] Student login failed:', error);

      // Re-throw with user-friendly message
      if (error.message.includes('Invalid credentials')) {
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      } else if (error.message.includes('Login access is disabled')) {
        throw new Error('Your login access is currently disabled. Please contact your branch administrator.');
      } else if (error.message.includes('connect') || error.message.includes('fetch')) {
        throw new Error('Cannot connect to server. Please ensure the backend is running.');
      }

      throw error;
    }
  }

  // Placeholder to prevent syntax errors
  async _unusedLoginMethod() {
    // This method exists to maintain the structure
    return {
      status: 'ready'
    };
  }

  // Store authentication data in localStorage
  storeAuthData(data) {
    try {
      console.log('📦 [AuthService] Storing auth data:', data);
      console.log('🗃️ [AuthService] Pre-storage localStorage keys:', Object.keys(localStorage));

      // Handle different token field names (token, access_token, accessToken, authToken)
      const token = data.token || data.access_token || data.accessToken || data.authToken;
      if (token) {
        // Clear any existing tokens first
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('authToken');

        // Store the token in multiple formats for compatibility
        localStorage.setItem('token', token);
        localStorage.setItem('access_token', token);
        localStorage.setItem('adminToken', token); // For legacy compatibility
        localStorage.setItem('authToken', token); // For legacy compatibility

        console.log('✅ [AuthService] Token stored in multiple formats:', {
          tokenStored: !!localStorage.getItem('token'),
          accessTokenStored: !!localStorage.getItem('access_token'),
          adminTokenStored: !!localStorage.getItem('adminToken'),
          authTokenStored: !!localStorage.getItem('authToken'),
          tokenPreview: token.substring(0, 20) + '...'
        });
      } else {
        console.error('❌ [AuthService] No token found in auth data:', data);
      }

      if (data.user) {
        localStorage.removeItem('user');
        localStorage.removeItem('userData');
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('userData', JSON.stringify(data.user)); // Backup storage
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userRole', data.user.role || 'user');

        console.log('✅ [AuthService] User data stored:', data.user);
      }

      // Handle different refresh token field names
      const refreshToken = data.refresh_token || data.refreshToken;
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken);
        localStorage.setItem('refreshToken', refreshToken); // Backup
        console.log('✅ [AuthService] Refresh token stored');
      }

      console.log('🗃️ [AuthService] Post-storage localStorage keys:', Object.keys(localStorage));
      console.log('📦 [AuthService] Auth data storage complete');
    } catch (error) {
      console.error('❌ [AuthService] Failed to store auth data:', error);
    }
  }

  // Get stored authentication data
  getAuthData() {
    try {
      const token = localStorage.getItem('token');
      const userString = localStorage.getItem('user');
      const refreshToken = localStorage.getItem('refresh_token');

      return {
        token,
        user: userString ? JSON.parse(userString) : null,
        refreshToken
      };
    } catch (error) {
      console.error('Failed to get auth data:', error);
      return { token: null, user: null, refreshToken: null };
    }
  }

  // Get dashboard route based on user role
  getDashboardRoute(role) {
    const routes = {
      'admin': '/branch/admin-dashboard',
      'instructor': '/instructor/dashboard',
      'student': '/student/dashboard',
      'branch_admin': '/branch/dashboard',
      'branch': '/branch/dashboard'
    };

    return routes[role] || '/student/dashboard';
  }

  // Check if user is authenticated
  isAuthenticated() {
    console.log('🔍 [AuthService] Checking authentication status...');
    console.log('🗃️ [AuthService] Current localStorage keys:', Object.keys(localStorage));

    const token = localStorage.getItem('token');
    const user = this.getCurrentUser();
    const isAuthFlag = localStorage.getItem('isAuthenticated');

    console.log('🔍 [AuthService] Authentication check details:', {
      hasToken: !!token,
      hasUser: !!user,
      isAuthFlag: isAuthFlag,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'none',
      userRole: user?.role || 'none',
      allTokenKeys: {
        token: !!localStorage.getItem('token'),
        access_token: !!localStorage.getItem('access_token'),
        adminToken: !!localStorage.getItem('adminToken'),
        authToken: !!localStorage.getItem('authToken')
      }
    });

    const isAuth = !!token && !!user && isAuthFlag === 'true';
    console.log(`${isAuth ? '✅' : '❌'} [AuthService] Authentication status: ${isAuth}`);

    return isAuth;
  }

  // Get current user
  getCurrentUser() {
    try {
      const userString = localStorage.getItem('user');
      const userData = localStorage.getItem('userData'); // backup
      const userToUse = userString || userData;

      console.log('👤 [AuthService] Getting current user:', {
        hasUser: !!userString,
        hasUserData: !!userData,
        usingBackup: !userString && !!userData
      });

      const user = userToUse ? JSON.parse(userToUse) : null;
      if (user) {
        console.log('👤 [AuthService] Current user loaded:', {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        });
      } else {
        console.log('❌ [AuthService] No current user found');
      }

      return user;
    } catch (error) {
      console.error('❌ [AuthService] Failed to get current user:', error);
      return null;
    }
  }

  // Get authentication token
  getToken() {
    return localStorage.getItem('token') ||
      localStorage.getItem('adminToken') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('studentToken') ||
      localStorage.getItem('instructorToken') ||
      null;
  }




  // Get auth headers for API requests
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  // Refresh authentication token
  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${this.baseURL}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      this.storeAuthData(data);
      return data;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.logout(); // Clear invalid tokens
      throw error;
    }
  }

  // Verify user email
  async verifyEmail(token) {
    try {
      const response = await fetch(`${this.baseURL}/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Email verification failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Email verification failed:', error);
      throw error;
    }
  }

  // Request password reset
  async requestPasswordReset(email) {
    try {
      const response = await fetch(`${this.baseURL}/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Password reset request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Password reset request failed:', error);
      throw error;
    }
  }

  // Logout user and clear all auth data
  logout() {
    try {
      console.log('🔓 Logging out user and clearing auth data...');

      // Clear all possible auth-related localStorage keys
      // Combined list from all previous implementations to ensure thorough cleanup
      const keysToRemove = [
        // Tokens
        'token',
        'authToken',
        'access_token',
        'refresh_token',
        'refreshToken',
        'adminToken',       // Legacy/Role specific
        'instructorToken',  // Legacy/Role specific
        'studentToken',     // Legacy/Role specific

        // User Data
        'user',
        'userData',
        'adminUser',
        'instructorUser',
        'studentUser',
        'adminData',

        // State & Config
        'isAuthenticated',
        'userRole',
        'franchise_code',
        'branch_code'
      ];

      keysToRemove.forEach(key => {
        if (localStorage.getItem(key)) {
          console.log(`  🧹 Removing: ${key}`);
          localStorage.removeItem(key);
        }
      });

      console.log('✅ Auth data cleared successfully');

      // Clear session storage as well
      sessionStorage.clear();

      // Force a page reload to ensure all state is cleared
      window.location.href = '/';

    } catch (error) {
      console.error('❌ Error during logout:', error);
      // Fallback reload
      window.location.href = '/';
    }
  }

  // Reset password
  async resetPassword(token, newPassword) {
    try {
      const response = await fetch(`${this.baseURL}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password: newPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Password reset failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Password reset failed:', error);
      throw error;
    }
  }
}

// Export as default
export default new AuthService();
