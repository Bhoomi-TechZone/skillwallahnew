import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaChalkboardTeacher } from 'react-icons/fa';
import { AiOutlineMail, AiOutlineLock, AiOutlineEyeInvisible, AiOutlineEye } from 'react-icons/ai';
import authService from '../services/authService';

const InstructorLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Check if user is already authenticated on component mount
  useEffect(() => {
    const checkAuthStatus = () => {
      const isAuth = authService.isAuthenticated();
      const currentUser = authService.getCurrentUser();
      
      if (isAuth && currentUser) {
        // If user is already authenticated and is instructor, redirect to instructor dashboard
        if (currentUser.role === 'instructor') {
          navigate('/instructor', { replace: true });
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

      console.log('Submitting instructor login for:', formData.email);

      // Call the instructor login API
      const response = await authService.instructorLogin({
        email: formData.email,
        password: formData.password
      });
      
      console.log('Instructor login response received:', response);
      
      // Check if response contains authentication data
      const hasToken = response.token || response.access_token || response.accessToken || response.authToken;
      const hasUser = response.user;
      
      if (!response) {
        throw new Error('No response received from server');
      }

      // Store authentication data - even if no explicit token, store the response
      authService.storeAuthData(response);
      
      console.log('Instructor login successful, stored auth data:', response);
      
      // Get the stored user to verify role
      const storedUser = authService.getCurrentUser();
      console.log('Stored user after instructor login:', storedUser);
      
      // Verify the user role is instructor (if user data is available)
      if (storedUser && storedUser.role && storedUser.role !== 'instructor') {
        authService.logout(); // Clear invalid auth data
        throw new Error('Access denied. Instructor privileges required.');
      }

      // Success! Navigate to instructor dashboard
      console.log('Navigating to instructor dashboard...');
      
      // Use setTimeout to ensure state updates are processed
      setTimeout(() => {
        navigate('/instructor', { replace: true });
      }, 100);
      
    } catch (error) {
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      // Handle specific error types
      if (error.message.includes('Invalid credentials') || error.message.includes('detail')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.message.includes('Network error')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      }
      
      setError(errorMessage);
      console.error('Instructor login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url("/bg for lmsc.png")',
        // backgroundImage: 'url("/backgroundins.png")',
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
          {/* Brand Circle with Instructor Icon */}
          <div className="mx-auto h-20 w-20 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#988913' }}>
            <FaChalkboardTeacher className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold" style={{ color: '#988913' }}>Instructor Login</h2>
          <p className="mt-2 text-sm text-gray-600">Manage courses, students, and create content</p>
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
                  <AiOutlineMail className="h-5 w-5 text-gray-400" />
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
                  type={showPassword ? "text" : "password"}
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
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    className="p-1 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <AiOutlineEyeInvisible className="h-5 w-5 text-gray-400" />
                    ) : (
                      <AiOutlineEye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
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
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  backgroundColor: loading ? 'rgba(152, 137, 19, 0.7)' : '#988913',
                  "&:hover": {
                    backgroundColor: loading ? 'rgba(152, 137, 19, 0.7)' : 'rgba(152, 137, 19, 0.9)'
                  },
                  "&:focus": {
                    "--tw-ring-color": "#988913"
                  }
                }}
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
                  'Sign in as Instructor'
                )}
              </button>
            </div>
            

            <div className="text-center text-sm">
              <p className="text-gray-600">
                New to the platform?{' '}
                <a href="#" className="font-medium hover:opacity-80" style={{ color: '#988913' }}>
                  Create an account
                </a>
              </p>
            
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InstructorLogin;