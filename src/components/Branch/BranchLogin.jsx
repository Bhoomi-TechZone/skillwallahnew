import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';

// Preload BranchDashboard component for instant navigation
const preloadDashboard = () => {
  // This triggers the lazy loading in advance
  import('./BranchDashboard').catch(() => {
    console.warn('Failed to preload branch dashboard (non-critical)');
  });
};

const BranchLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [redirecting, setRedirecting] = useState(false);
  const navigate = useNavigate();

  // Check if user is already authenticated on component mount
  useEffect(() => {
    // Preload dashboard component immediately
    preloadDashboard();

    const checkAuthStatus = () => {
      const isAuth = authService.isAuthenticated();
      const currentUser = authService.getCurrentUser();

      console.log('Checking auth status - isAuth:', isAuth, 'currentUser:', currentUser);

      if (isAuth && currentUser && currentUser.role) {
        // Check for various branch-related roles
        const branchRoles = ['branch_admin', 'branch', 'franchise_admin', 'admin'];
        const userRole = currentUser.role.toLowerCase();

        if (branchRoles.includes(userRole)) {
          console.log('✅ Already authenticated with role:', userRole, '- redirecting to dashboard...');

          // Determine which dashboard based on role
          if (userRole === 'franchise_admin' || userRole === 'admin') {
            navigate('/branch/admin-dashboard', { replace: true });
          } else {
            navigate('/branch/dashboard', { replace: true });
          }
        }
      }
    };

    checkAuthStatus();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate form data
      if (!formData.email || !formData.password) {
        throw new Error('Please fill in all required fields');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Please enter a valid email address');
      }

      console.log('Submitting branch login for:', formData.email);
      console.log('Request details:', {
        url: 'http://localhost:4000/api/branch/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          email: formData.email,
          password: '***HIDDEN***'
        }
      });

      // Call the branch login API - try branch endpoint first, fallback to admin if needed
      let response;
      let usedEndpoint = 'branch';

      try {
        response = await fetch('http://localhost:4000/api/branch/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password
          })
        });
      } catch (primaryError) {
        console.warn('Primary branch login endpoint failed, trying admin endpoint:', primaryError);
        usedEndpoint = 'admin';
        response = await fetch('http://localhost:4000/api/admin/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password
          })
        });
      }

      console.log(`📡 Branch login response from ${usedEndpoint} endpoint:`, response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          errorData: errorData,
          url: response.url,
          endpoint: usedEndpoint
        });
        const errorObj = new Error(errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        errorObj.response = { status: response.status, data: errorData };
        throw errorObj;
      }

      const loginResponse = await response.json();

      console.log('Branch login response received:', loginResponse);

      // Check if login was successful - handle both token and access_token field names
      const token = loginResponse.token || loginResponse.access_token;
      if (!loginResponse.success || !token || !loginResponse.user) {
        console.error('Login response validation failed:', {
          success: loginResponse.success,
          hasToken: !!loginResponse.token,
          hasAccessToken: !!loginResponse.access_token,
          hasUser: !!loginResponse.user,
          fullResponse: loginResponse
        });
        throw new Error(loginResponse.message || 'Invalid response from server');
      }

      // Clear any previous errors since we got a successful response
      setError('');

      // Store authentication data in the format expected by authService
      const authData = {
        success: true,
        token: token,
        user: {
          ...loginResponse.user,
          // Keep the original role from backend, don't override it
          role: loginResponse.user.role || 'branch_admin'
        }
      };

      console.log('🔑 About to store branch auth data:', {
        hasToken: !!authData.token,
        tokenPreview: authData.token ? authData.token.substring(0, 20) + '...' : 'none',
        user: authData.user
      });

      authService.storeAuthData(authData);

      console.log('✅ Branch auth data stored, verifying storage...');

      // Verify the token was actually stored
      const storedToken = localStorage.getItem('token');
      const storedAccessToken = localStorage.getItem('access_token');
      const storedUserData = localStorage.getItem('user');

      console.log('🔍 Storage verification:', {
        tokenStored: !!storedToken,
        accessTokenStored: !!storedAccessToken,
        userStored: !!storedUserData,
        tokenMatch: storedToken === token,
        localStorageKeys: Object.keys(localStorage)
      });

      console.log('Branch login successful, stored auth data:', authData);

      // Get the stored user to verify authentication worked
      const storedUser = authService.getCurrentUser();
      console.log('Stored user after login:', storedUser);

      // Verify the user has valid branch access
      const validBranchRoles = ['branch_admin', 'branch', 'franchise_admin', 'admin'];
      const userRole = storedUser?.role?.toLowerCase();

      if (!storedUser || !userRole || !validBranchRoles.includes(userRole)) {
        console.error('Invalid role for branch access:', userRole);
        authService.logout(); // Clear invalid auth data
        setError('Access denied. Valid branch privileges required.');
        setLoading(false);
        setRedirecting(false);
        return; // Exit early instead of throwing to avoid triggering catch block
      }

      // Success! Determine which dashboard to redirect to
      console.log('✅ Branch login successful - preparing dashboard for role:', userRole);

      setRedirecting(true);
      setLoading(false); // Stop loading spinner since we're about to redirect

      // Immediate redirect based on role
      const dashboardPath = (userRole === 'franchise_admin' || userRole === 'admin')
        ? '/branch/admin-dashboard'
        : '/branch/dashboard';

      console.log('🚀 Navigating to:', dashboardPath, 'for role:', userRole);

      // Use immediate navigation for better UX
      navigate(dashboardPath, { replace: true });

    } catch (error) {
      let errorMessage = 'Login failed. Please try again.';

      // Reset states
      setRedirecting(false);
      setLoading(false);

      console.error('❌ Branch login error details:', {
        error: error,
        message: error.message,
        response: error.response,
        stack: error.stack
      });

      if (error.response) {
        // Server responded with error status
        if (error.response.status === 401) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (error.response.status === 403) {
          errorMessage = 'Access denied. Branch administrator privileges required.';
        } else if (error.response.status === 404) {
          errorMessage = 'Branch login endpoint not found. Please contact support.';
        } else if (error.response.status >= 500) {
          errorMessage = 'Server error. The backend service may be temporarily unavailable. Please try again later.';
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        // Check if this is a network error
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          errorMessage = 'Unable to connect to server. Please ensure the backend is running and try again.';
        } else if (error.message.includes('NetworkError') || error.message.includes('ERR_NAME_NOT_RESOLVED')) {
          errorMessage = 'Network connectivity issue. Please check your internet connection.';
        } else {
          errorMessage = error.message;
        }
      } else if (!navigator.onLine) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      }

      setError(errorMessage);
      console.error('Branch login error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        stack: error.stack
      });
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url("/bg for lmsc.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative'
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black opacity-40 backdrop-blur-sm"></div>

      <div className="max-w-md w-full space-y-8 bg-white/95 p-8 rounded-lg shadow-xl backdrop-blur-sm relative z-10">
        <div className="text-center">
          {/* Brand Circle with Branch Icon */}
          <div className="mx-auto h-20 w-20 rounded-full flex items-center justify-center mb-4 bg-amber-600">
            <svg className="h-12 w-12 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m11 0a2 2 0 01-2 2H7a2 2 0 01-2-2m14 0V9a2 2 0 00-2-2M9 3v2m0 0V9m0-4h6m-6 0a2 2 0 012-2h2a2 2 0 012 2v4M9 9H7a2 2 0 00-2 2v9a2 2 0 002 2h2a2 2 0 002-2V9z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-amber-700">Branch Login</h2>
          <p className="mt-2 text-sm text-gray-600">Branch management and operations</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4 border border-red-200">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="mt-1 relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your email"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your password"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="rememberMe"
                type="checkbox"
                checked={formData.rememberMe}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || redirecting}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {redirecting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="flex items-center">
                    Loading Dashboard
                    <span className="ml-2 animate-pulse">🏢</span>
                  </span>
                </>
              ) : loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign in as Branch'
              )}
            </button>
          </div>


        </form>
      </div>
    </div>
  );
};

export default BranchLogin;