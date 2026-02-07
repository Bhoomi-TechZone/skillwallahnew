import { useEffect, useState } from 'react';
import { FaEnvelope, FaEye, FaEyeSlash, FaFacebook, FaGoogle, FaLock, FaUser } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { getDashboardRoute, navigateToRoleDashboard, storeAuthData } from '../utils/authUtils';

const AuthPage = () => {
    const location = useLocation();
    const [isSignUp, setIsSignUp] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const navigate = useNavigate();

    // Set initial form state based on the route
    useEffect(() => {
        setIsSignUp(location.pathname === '/register');
    }, [location.pathname]);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'student' // Default role
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear errors when user types
        if (error) setError('');
        if (success) setSuccess('');
    };

    const validateForm = () => {
        if (isSignUp) {
            if (!formData.name.trim()) {
                setError('Full name is required');
                return false;
            }
            if (formData.password !== formData.confirmPassword) {
                setError('Passwords do not match');
                return false;
            }
            if (formData.password.length < 6) {
                setError('Password must be at least 6 characters long');
                return false;
            }
        }

        if (!formData.email.trim()) {
            setError('Email is required');
            return false;
        }

        if (!formData.password.trim()) {
            setError('Password is required');
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('Please enter a valid email address');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            if (isSignUp) {
                // Handle Sign Up
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'}/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: formData.name,
                        email: formData.email,
                        password: formData.password,
                        role: formData.role
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Registration failed');
                }

                const data = await response.json();

                if (data.access_token && data.user) {
                    // Store token and user data using utility function
                    storeAuthData(data.access_token, data.user);

                    setSuccess('Registration successful! Redirecting...');

                    // Redirect based on user role after registration
                    setTimeout(() => {
                        navigateToRoleDashboard(navigate, data.user?.role);
                    }, 1500);
                } else {
                    // Fallback: show success and switch to sign in
                    setSuccess('Registration successful! Please sign in.');

                    // Clear form and switch to sign in
                    setFormData({
                        name: '',
                        email: formData.email, // Keep email for convenience
                        password: '',
                        confirmPassword: '',
                        role: 'student'
                    });
                    setIsSignUp(false);
                }

            } else {
                // Handle Sign In
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'}/auth/login/role-based`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: formData.email,
                        password: formData.password
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Login failed. Please check your credentials.');
                }

                const data = await response.json();

                if (data.access_token) {
                    // Store token and user data using utility function  
                    storeAuthData(data.access_token, data.user);

                    setSuccess(`Welcome ${data.user?.name || 'User'}! Redirecting to your dashboard...`);

                    // Redirect based on user role using the dashboard route from backend
                    setTimeout(() => {
                        const dashboardRoute = data.user?.dashboard_route || getDashboardRoute(data.user?.role);
                        navigate(dashboardRoute);
                    }, 1500);
                } else {
                    throw new Error('No access token received');
                }
            }

        } catch (err) {
            console.error('Auth error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = (provider) => {
        setError(`${provider} login will be implemented soon!`);
    };

    const toggleAuthMode = () => {
        setIsSignUp(!isSignUp);
        setError('');
        setSuccess('');
        setFormData({
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
            role: 'student'
        });
    };

    return (
        <>
            <Navbar />
            <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
                {/* Background image with lower opacity overlay */}
                <div className="absolute inset-0 w-full h-full z-0">
                    <img
                        src="https://i.pinimg.com/originals/15/c6/68/15c668707f4060912522d323741d47d2.jpg"
                        alt="bg"
                        className="w-full h-full object-cover opacity-40"
                    />
                </div>
                <div className="max-w-md w-full space-y-8 relative z-10">
                    {/* Header */}
                    <div className="text-center flex flex-col items-center">
                        <div className="h-20 w-20 bg-blue-600 rounded-full flex items-center justify-center mb-4 ml-8 sm:ml-12">
                            <FaUser className="h-8 w-8 text-white" />
                        </div>
                        <h2 className="text-3xl font-extrabold text-gray-900">
                            {isSignUp ? 'Create your account' : 'Sign in to your account'}
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            {isSignUp ? 'Join our learning platform today' : 'Welcome back! Please sign in to continue'}
                        </p>
                    </div>

                    {/* Form */}
                    <div className="bg-white py-8 px-6 shadow-xl rounded-lg border border-gray-100">
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            {/* Success Message */}
                            {success && (
                                <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-md text-sm">
                                    {success}
                                </div>
                            )}

                            {/* Error Message */}
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Name Field (Sign Up only) */}
                            {isSignUp && (
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                        Full Name
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FaUser className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            id="name"
                                            name="name"
                                            type="text"
                                            required={isSignUp}
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            disabled={loading}
                                            className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition duration-200"
                                            placeholder="Enter your full name"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Email Field */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaEnvelope className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        disabled={loading}
                                        className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition duration-200"
                                        placeholder="Enter your email"
                                    />
                                </div>
                            </div>

                            {/* Role Field (Sign Up only) */}
                            {isSignUp && (
                                <div>
                                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                                        I am a
                                    </label>
                                    <select
                                        id="role"
                                        name="role"
                                        value={formData.role}
                                        onChange={handleInputChange}
                                        disabled={loading}
                                        className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition duration-200"
                                    >
                                        <option value="student">Student</option>
                                        <option value="instructor">Instructor</option>
                                    </select>
                                </div>
                            )}

                            {/* Password Field */}
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaLock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        disabled={loading}
                                        className="appearance-none relative block w-full pl-10 pr-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition duration-200"
                                        placeholder="Enter your password"
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <FaEyeSlash className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                        ) : (
                                            <FaEye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password Field (Sign Up only) */}
                            {isSignUp && (
                                <div>
                                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                        Confirm Password
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FaLock className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type={showConfirmPassword ? "text" : "password"}
                                            required={isSignUp}
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            disabled={loading}
                                            className="appearance-none relative block w-full pl-10 pr-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition duration-200"
                                            placeholder="Confirm your password"
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        >
                                            {showConfirmPassword ? (
                                                <FaEyeSlash className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                            ) : (
                                                <FaEye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Remember Me (Sign In only) */}
                            {!isSignUp && (
                                <div className="flex items-center">
                                    <input
                                        id="remember-me"
                                        name="remember-me"
                                        type="checkbox"
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                                        Remember me
                                    </label>
                                </div>
                            )}

                            {/* Submit Button */}
                            <div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                                >
                                    {loading ? (
                                        <div className="flex items-center">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            {isSignUp ? 'Creating Account...' : 'Signing In...'}
                                        </div>
                                    ) : (
                                        isSignUp ? 'Create Account' : 'Sign In'
                                    )}
                                </button>
                            </div>

                            {/* Social Login */}
                            <div className="mt-6">
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-300" />
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-2 bg-white text-gray-500">Or continue with</span>
                                    </div>
                                </div>

                                <div className="mt-6 grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleSocialLogin('Google')}
                                        className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition duration-200"
                                    >
                                        <FaGoogle className="h-5 w-5 text-red-500" />
                                        <span className="ml-2">Google</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleSocialLogin('Facebook')}
                                        className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition duration-200"
                                    >
                                        <FaFacebook className="h-5 w-5 text-blue-600" />
                                        <span className="ml-2">Facebook</span>
                                    </button>
                                </div>
                            </div>
                        </form>

                        {/* Toggle between Sign In / Sign Up */}
                        <div className="mt-6 text-center">
                            <p className="text-sm text-gray-600">
                                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                                <button
                                    type="button"
                                    onClick={toggleAuthMode}
                                    className="font-medium text-blue-600 hover:text-blue-500 transition duration-200"
                                >
                                    {isSignUp ? 'Sign in here' : 'Sign up here'}
                                </button>
                            </p>
                        </div>

                        {/* Test Credentials (for development) */}
                        {!isSignUp && (
                            <div className="mt-6 p-3 bg-gray-50 rounded-md">
                                <p className="text-xs text-gray-600 font-semibold mb-1">Test Credentials:</p>
                                <p className="text-xs text-gray-600">Email: student@test.com</p>
                                <p className="text-xs text-gray-600">Password: password123</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
};

export default AuthPage;
