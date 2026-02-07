import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../services/authService';

const StudentLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Get redirect URL from query params or localStorage
  const getRedirectUrl = () => {
    const params = new URLSearchParams(location.search);
    const redirectParam = params.get('redirect');
    const storedRedirect = localStorage.getItem('redirectAfterLogin');
    return redirectParam || storedRedirect || '/students';
  };

  // Check if user is already authenticated on component mount
  useEffect(() => {
    const checkAuthStatus = () => {
      const isAuth = authService.isAuthenticated();
      const currentUser = authService.getCurrentUser();
      
      if (isAuth && currentUser) {
        // If user is already authenticated and is student, redirect
        if (currentUser.role === 'student') {
          const redirectUrl = getRedirectUrl();
          localStorage.removeItem('redirectAfterLogin');
          navigate(redirectUrl, { replace: true });
        }
      }
    };

    checkAuthStatus();
  }, [navigate, location]);

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

      // Call the student login API
      const response = await authService.studentLogin({
        email: formData.email,
        password: formData.password
      });
      
      console.log('Student login response received:', response);
      
      // Check if response contains authentication data
      const hasToken = response.token || response.access_token || response.accessToken || response.authToken;
      if (!response || !hasToken) {
        console.error('Response missing token:', response);
        throw new Error('Invalid response from server - missing authentication token');
      }

      // Store authentication data
      authService.storeAuthData(response);
      
      console.log('Student login successful:', response);
      
      // Verify the user role is student
      const user = response.user || authService.getCurrentUser();
      if (user && user.role !== 'student') {
        authService.logout(); // Clear invalid auth data
        throw new Error('Access denied. Student privileges required.');
      }

      // Redirect to stored URL or student dashboard
      const redirectUrl = getRedirectUrl();
      localStorage.removeItem('redirectAfterLogin');
      navigate(redirectUrl, { replace: true });
      
    } catch (error) {
      const errorMessage = error.message || 'Login failed. Please try again.';
      setError(errorMessage);
      console.error('Student login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-none">
        
      </div>
      <div 
        className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative bg-cover bg-center bg-no-repeat"
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
            {/* amberCircle with Graduation Cap Icon */}
            <div className="mx-auto h-20 w-20 rounded-full" style={{ backgroundColor: '#988913' }} flex items-center justify-center mb-4>
              <svg 
                className="h-12 w-12 text-white" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M22 10L12 5L2 10L12 15L22 10Z" />
                <path d="M6 12.5V16.5L12 19.5L18 16.5V12.5" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold" style={{ color: '#988913' }}>Student Login</h2>
            <p className="mt-2 text-sm" style={{ color: '#988913' }}>Access courses, assignments, and learning materials</p>
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
                  style={{ backgroundColor: '#988913' }}
                  className="h-4 w-4 border-gray-300 rounded focus:ring-2 focus:ring-offset-2"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: loading ? 'rgba(152, 137, 19, 0.7)' : '#988913' }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign in as Student'
                )}
              </button>
            </div>

            <div className="text-center text-sm">
              
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StudentLogin;