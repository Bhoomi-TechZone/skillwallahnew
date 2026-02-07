import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

const AdminLogin = () => {
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
    const checkAuthStatus = () => {
      const isAuth = authService.isAuthenticated();
      const currentUser = authService.getCurrentUser();

      if (isAuth && currentUser) {
        // Route based on user role
        const userRole = currentUser.role;
        console.log('✅ Already authenticated with role:', userRole);

        if (userRole === 'admin' || userRole === 'franchise_admin') {
          console.log('✅ Redirecting to admin dashboard for role:', userRole);
          requestAnimationFrame(() => {
            navigate('/branch/admin-dashboard', { replace: true });
          });
        } else if (userRole === 'branch_admin') {
          console.log('✅ Redirecting to branch dashboard for role:', userRole);
          requestAnimationFrame(() => {
            navigate('/branch/dashboard', { replace: true });
          });
        } else if (userRole === 'admin' || userRole) { // fallback for any admin role
          console.log('✅ Fallback redirect for admin role:', userRole);
          requestAnimationFrame(() => {
            navigate('/branch/admin-dashboard', { replace: true });
          });
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

      console.log('Submitting admin login for:', formData.email);
      console.log('Request details:', {
        url: 'http://localhost:4000/api/admin/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          email: formData.email,
          password: '***HIDDEN***'
        }
      });

      // Call the admin login API using direct fetch like BranchLogin
      const response = await fetch('http://localhost:4000/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          errorData: errorData,
          url: response.url
        });
        const errorObj = new Error(errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        errorObj.response = { status: response.status, data: errorData };
        throw errorObj;
      }

      const loginResponse = await response.json();

      console.log('Admin login response received:', loginResponse);

      // Check if login was successful - handle both token and access_token field names
      const token = loginResponse.token || loginResponse.access_token;
      if (!token || !loginResponse.user) {
        console.error('Login response validation failed:', {
          hasToken: !!loginResponse.token,
          hasAccessToken: !!loginResponse.access_token,
          hasUser: !!loginResponse.user,
          fullResponse: loginResponse
        });
        throw new Error(loginResponse.message || 'Invalid response from server - missing token or user data');
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
          role: loginResponse.user.role || 'admin'
        }
      };

      console.log('🔑 About to store auth data:', {
        hasToken: !!authData.token,
        tokenPreview: authData.token ? authData.token.substring(0, 20) + '...' : 'none',
        user: authData.user
      });

      authService.storeAuthData(authData);

      console.log('✅ Auth data stored, verifying storage...');

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

      console.log('Admin login successful, stored auth data:', authData);

      // Get the stored user to verify authentication worked
      const currentUser = authService.getCurrentUser();
      console.log('Stored user after login:', currentUser);

      // Verify the user has valid admin access
      const validAdminRoles = ['admin', 'franchise_admin', 'super_admin'];
      const userRole = currentUser?.role?.toLowerCase();

      if (!currentUser || !userRole || !validAdminRoles.includes(userRole)) {
        console.error('Invalid role for admin access:', userRole);
        authService.logout(); // Clear invalid auth data
        setError('Access denied. Valid admin privileges required.');
        setLoading(false);
        setRedirecting(false);
        return; // Exit early instead of throwing to avoid triggering catch block
      }

      // Success! Determine which dashboard to redirect to
      console.log('✅ Admin login successful - preparing dashboard for role:', userRole);

      setRedirecting(true);
      setLoading(false); // Stop loading spinner since we're about to redirect

      // Route based on user role
      let dashboardRoute = '/branch/admin-dashboard'; // default for admin/franchise_admin

      if (userRole === 'admin' || userRole === 'franchise_admin') {
        dashboardRoute = '/branch/admin-dashboard';
        console.log('📊 Routing to AdminDashboard for role:', userRole);
      } else if (userRole === 'branch_admin') {
        dashboardRoute = '/branch/dashboard';
        console.log('📊 Routing to BranchDashboard for role:', userRole);
      } else {
        // Fallback for any admin-type role
        dashboardRoute = '/branch/admin-dashboard';
        console.log('📊 Fallback routing to AdminDashboard for role:', userRole);
      }

      console.log('🚀 Navigating to:', dashboardRoute, 'for role:', userRole);

      // Use immediate navigation for better UX
      navigate(dashboardRoute, { replace: true });

    } catch (error) {
      let errorMessage = 'Login failed. Please try again.';

      // Reset states
      setRedirecting(false);
      setLoading(false);

      if (error.response) {
        // Server responded with error status
        if (error.response.status === 401) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (error.response.status === 403) {
          errorMessage = 'Access denied. Administrator privileges required.';
        } else if (error.response.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        // Check if this is a network error
        if (error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = error.message;
        }
      } else if (!navigator.onLine) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      }

      setError(errorMessage);
      console.error('Admin login error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        stack: error.stack
      });
    } finally {
      if (!redirecting) {
        setLoading(false);
      }
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
          {/* Brand Circle with Admin Icon */}
          <div className="mx-auto h-20 w-20 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#988913' }}>
            <svg className="h-12 w-12 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold" style={{ color: '#988913' }}>Admin Login</h2>
          <p className="mt-2 text-sm text-gray-600">Full system access and user management</p>
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
                  className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none"
                  style={{
                    "--tw-ring-color": "#988913",
                    "--tw-border-color": "#988913",
                    "&:focus": {
                      borderColor: "#988913",
                      boxShadow: "0 0 0 2px rgba(152, 137, 19, 0.2)"
                    }
                  }}
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
                  className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none"
                  style={{
                    "--tw-ring-color": "#988913",
                    "--tw-border-color": "#988913",
                    "&:focus": {
                      borderColor: "#988913",
                      boxShadow: "0 0 0 2px rgba(152, 137, 19, 0.2)"
                    }
                  }}
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
                className="h-4 w-4 border-gray-300 rounded"
                style={{
                  color: '#988913',
                  "&:focus": {
                    "--tw-ring-color": "#988913"
                  }
                }}
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
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: (loading || redirecting) ? 'rgba(152, 137, 19, 0.7)' : '#988913',
                "&:hover": {
                  backgroundColor: (loading || redirecting) ? 'rgba(152, 137, 19, 0.7)' : 'rgba(152, 137, 19, 0.9)'
                },
                "&:focus": {
                  "--tw-ring-color": "#988913"
                }
              }}
            >
              {redirecting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="flex items-center">
                    Loading Dashboard
                    <span className="ml-2 animate-pulse">🚀</span>
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
                'Sign in as Admin'
              )}
            </button>
          </div>


        </form>
      </div>
    </div>
  );
};

export default AdminLogin;