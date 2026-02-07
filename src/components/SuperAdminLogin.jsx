import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Preload Dashboard component for instant navigation
const preloadDashboard = () => {
  import('../pages/superadmin/SuperAdminDashboard').catch(() => {
    console.warn('Failed to preload dashboard (non-critical)');
  });
};

const SuperAdminLogin = () => {
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
    preloadDashboard();

    const checkAuthStatus = () => {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      if (token && userStr) {
        try {
          const currentUser = JSON.parse(userStr);
          // If user is already authenticated and is super admin, redirect to dashboard
          if (currentUser.role === 'super_admin' || currentUser.role === 'superladmin') {
            console.log('✅ Already authenticated as Super Admin, redirecting instantly...');
            navigate('/superadmin/dashboard', { replace: true });
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
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

      console.log('Attempting Super Admin login for:', formData.email);

      // Call the real super admin API
      const response = await fetch('http://localhost:4000/api/admin/superadmin/login', {
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
        let errorMessage = 'Login failed. Please check your credentials and try again.';

        if (response.status === 401) {
          errorMessage = 'Invalid email or password';
        } else if (response.status === 423) {
          errorMessage = 'Account is temporarily locked due to multiple failed login attempts';
        } else {
          const errorData = await response.json().catch(() => ({}));
          errorMessage = errorData.detail || errorMessage;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('🔍 SUPER ADMIN API RESPONSE:', data);
      console.log('🔍 Response access_token:', data.access_token ? 'Present' : 'Missing');
      console.log('🔍 Response user:', data.user);
      console.log('🔍 User role:', data.user?.role);

      if (data.access_token && data.user && data.user.role === 'super_admin') {
        console.log('✅ Valid super admin response received - proceeding with storage');

        // CRITICAL: DO NOT CLEAR localStorage - this causes token loss on refresh
        console.log('💾 STORING TOKENS WITHOUT CLEARING EXISTING DATA...');

        // Store in multiple locations for maximum reliability - NO CLEARING
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('userRole', 'super_admin');
        localStorage.setItem('authToken', data.access_token);
        localStorage.setItem('adminToken', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token || '');

        // Store additional super admin specific data
        localStorage.setItem('superAdminId', data.user.id);
        localStorage.setItem('superAdminName', data.user.name);
        localStorage.setItem('superAdminEmail', data.user.email);
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('authMethod', 'super_admin_login');
        localStorage.setItem('loginTimestamp', Date.now().toString());
        localStorage.setItem('sessionPersistent', 'true'); // Flag for persistent session

        // Also backup in sessionStorage
        sessionStorage.setItem('token', data.access_token);
        sessionStorage.setItem('user', JSON.stringify(data.user));
        sessionStorage.setItem('userRole', 'super_admin');
        sessionStorage.setItem('isAuthenticated', 'true');

        console.log('💾 STORAGE COMPLETE - COMPREHENSIVE VERIFICATION:');
        const verification = {
          token: localStorage.getItem('token'),
          user: localStorage.getItem('user'),
          userRole: localStorage.getItem('userRole'),
          authToken: localStorage.getItem('authToken'),
          adminToken: localStorage.getItem('adminToken'),
          isAuthenticated: localStorage.getItem('isAuthenticated'),
          sessionPersistent: localStorage.getItem('sessionPersistent'),
          sessionToken: sessionStorage.getItem('token')
        };

        console.log('📊 COMPLETE VERIFICATION:', verification);

        // CRITICAL CHECKS
        if (!verification.token) {
          throw new Error('CRITICAL: Token storage failed');
        }

        if (!verification.user) {
          throw new Error('CRITICAL: User data storage failed');
        }

        if (!verification.userRole) {
          throw new Error('CRITICAL: User role storage failed');
        }

        console.log('✅ ALL STORAGE VERIFICATIONS PASSED - TOKEN WILL PERSIST');

        // Set redirecting state
        setRedirecting(true);

        // Force immediate navigation to dashboard
        console.log('🚀 NAVIGATING TO DASHBOARD IMMEDIATELY...');
        navigate('/superadmin/dashboard', { replace: true });

      } else {
        console.error('❌ Invalid API response structure:', data);
        console.error('❌ Missing access_token:', !data.access_token);
        console.error('❌ Missing user:', !data.user);
        throw new Error('Invalid response from server - missing token or user data');
      }

    } catch (err) {
      console.error('Super Admin login error:', err);
      setError(err.message || 'Login failed. Please check your credentials and try again.');
      setLoading(false);
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  // Show loading screen during redirect
  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Background Image with Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029')"
          }}
        >
          <div className="absolute inset-0 bg-black/70"></div>
        </div>

        <div className="text-center relative z-10">
          <div className="relative mb-8">
            <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-t-4 border-white mx-auto"></div>
            <div className="absolute inset-0 animate-ping rounded-full h-20 w-20 border-4 border-purple-400 opacity-20"></div>
          </div>
          <h3 className="text-white text-2xl font-bold mb-2 drop-shadow-lg">Welcome Back, Super Admin!</h3>
          <p className="text-white/80 text-lg font-medium">Accessing Master Control Panel...</p>
          <div className="mt-4 flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029')"
        }}
      >
        {/* Dark overlay for better readability - only semi-transparent overlay, no solid colors */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      </div>

      {/* Login Card */}
      <div className="max-w-md w-full relative z-10">
        {/* Header Section - No Logo */}
        <div className="text-center mb-8">
          <h2 className="text-5xl font-extrabold text-white mb-3 drop-shadow-2xl">
            Super Admin
          </h2>
          <div className="h-1 w-32 bg-gradient-to-r from-transparent via-white to-transparent mx-auto mb-4"></div>
          <p className="text-white/90 text-lg font-medium">
            Master Control Center
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl shadow-md animate-shake">
              <div className="flex items-center">
                <span className="text-red-500 text-2xl mr-3">⚠️</span>
                <p className="text-red-700 text-sm font-semibold">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-gray-800 mb-2">
                Email Address
              </label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-500 text-xl transition-all group-focus-within:scale-110">
                  📧
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-300 bg-gray-50 hover:bg-white hover:border-purple-400 text-gray-800 font-medium"
                  placeholder="superadmin@skillwallah.com"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-bold text-gray-800 mb-2">
                Password
              </label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-500 text-xl transition-all group-focus-within:scale-110">
                  🔒
                </span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-300 bg-gray-50 hover:bg-white hover:border-purple-400 text-gray-800 font-medium"
                  placeholder="Enter your secure password"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded cursor-pointer transition-all"
                  disabled={loading}
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm font-semibold text-gray-700 cursor-pointer">
                  Remember me for 30 days
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center items-center py-4 px-6 border-none rounded-xl shadow-2xl text-white text-base font-bold transition-all duration-300 ${loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 hover:shadow-purple-500/50 transform hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98]'
                }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Authenticating...
                </>
              ) : (
                <>
                  <span className="mr-2">🔐</span>
                  Access Super Admin Panel
                </>
              )}
            </button>
          </form>

          {/* Back to Home Link */}
          <div className="mt-8 text-center">
            <button
              onClick={handleBackToHome}
              className="inline-flex items-center text-sm text-gray-600 hover:text-purple-600 font-semibold transition-colors duration-200 group"
            >
              <span className="transform group-hover:-translate-x-1 transition-transform duration-200">←</span>
              <span className="ml-2">Back to Home</span>
            </button>
          </div>
        </div>

        {/* Security Badge */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/30 shadow-lg">
            <span className="text-2xl mr-2">🛡️</span>
            <p className="text-sm text-white font-semibold">
              Secured with 256-bit Encryption
            </p>
          </div>
        </div>
      </div>

      {/* Animated Circles Background */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default SuperAdminLogin;
