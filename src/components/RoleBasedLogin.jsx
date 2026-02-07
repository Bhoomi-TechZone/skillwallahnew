import { useState } from 'react';
import { FaChalkboardTeacher, FaEnvelope, FaEye, FaEyeSlash, FaLock, FaUserGraduate, FaUserShield } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { getDashboardRoute } from '../utils/authUtils';
import Footer from './Footer';
import authService from '../services/authService';

const RoleBasedLogin = () => {
    const [selectedRole, setSelectedRole] = useState('student');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const roles = [
        {
            key: 'student',
            name: 'Student',
            icon: FaUserGraduate,
            color: 'blue',
            endpoint: '/auth/student/login',
            description: 'Access courses, assignments, and learning materials'
        },
        {
            key: 'instructor',
            name: 'Instructor',
            icon: FaChalkboardTeacher,
            color: 'orange',
            endpoint: '/instructor/login',
            description: 'Manage courses, students, and create content'
        },
        {
            key: 'admin',
            name: 'Admin',
            icon: FaUserShield,
            color: 'purple',
            endpoint: '/admin/login',
            description: 'Full system access and user management'
        }
    ];

    const currentRole = roles.find(role => role.key === selectedRole);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (error) setError('');
        if (success) setSuccess('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.email.trim() || !formData.password.trim()) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            let data;

            // Use authService for admin login to handle franchise owner credentials
            if (selectedRole === 'admin') {
                data = await authService.adminLogin({
                    email: formData.email,
                    password: formData.password
                });

                // Transform response to match expected format
                if (data.token) {
                    data = {
                        access_token: data.token,
                        user: data.user
                    };
                }
            } else {
                // For other roles, use direct API calls
                const response = await fetch(`http://localhost:4000${currentRole.endpoint}`, {
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

                data = await response.json();
            }

            if (data.access_token) {
                // Store token and user data based on role
                const userRole = data.user?.role || selectedRole;

                // Store general token and user data
                localStorage.setItem('token', data.access_token);
                localStorage.setItem('user', JSON.stringify(data.user || {}));

                // Store role-specific tokens for compatibility with existing code
                if (userRole === 'admin') {
                    localStorage.setItem('adminToken', data.access_token);
                    localStorage.setItem('adminUser', JSON.stringify(data.user || {}));
                } else if (userRole === 'instructor') {
                    localStorage.setItem('instructorToken', data.access_token);
                    localStorage.setItem('instructorUser', JSON.stringify(data.user || {}));
                } else if (userRole === 'student') {
                    localStorage.setItem('studentToken', data.access_token);
                    localStorage.setItem('studentUser', JSON.stringify(data.user || {}));
                }

                setSuccess(`Welcome ${data.user?.name || 'User'}! Redirecting to your ${currentRole.name.toLowerCase()} dashboard...`);

                // Redirect based on user role using the dashboard route from backend or fallback
                setTimeout(() => {
                    const dashboardRoute = data.user?.dashboard_route || getDashboardRoute(userRole);
                    navigate(dashboardRoute);
                }, 1500);
            } else {
                throw new Error('No access token received');
            }

        } catch (err) {
            console.error('Login error:', err);
            let errorMessage = err.message;

            // Provide specific error for admin/franchise owner login
            if (selectedRole === 'admin' && formData.email.includes('@')) {
                if (errorMessage.includes('Invalid') || errorMessage.includes('credentials') || errorMessage.includes('401')) {
                    errorMessage = 'Invalid email or password. For franchise owners, please use: sneha@gmail.com / franchise123';
                }
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative" style={{
                backgroundImage: "url('/pic5.jpg')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            }}>
                <div className="absolute inset-0 bg-black/20 z-0"></div>
                <div className="max-w-md w-full space-y-8 relative z-10">
                    {/* Header */}
                    <div className="text-center">
                        <div className={`mx-auto h-20 w-20 rounded-full flex items-center justify-center mb-4 ${currentRole.color === 'blue' ? 'bg-blue-600' :
                            currentRole.color === 'orange' ? 'bg-orange-600' : 'bg-purple-600'
                            }`}>
                            <currentRole.icon className="h-8 w-8 text-white" />
                        </div>
                        <h2 className="text-3xl font-extrabold text-white drop-shadow-lg">
                            {currentRole.name} Login
                        </h2>
                        <p className="mt-2 text-sm text-white font-semibold drop-shadow">
                            {currentRole.description}
                        </p>
                    </div>

                    {/* Role Selection */}
                    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Login as:
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {roles.map((role) => {
                                const IconComponent = role.icon;
                                return (
                                    <button
                                        key={role.key}
                                        type="button"
                                        onClick={() => setSelectedRole(role.key)}
                                        className={`p-3 rounded-lg border-2 transition-all duration-200 ${selectedRole === role.key
                                            ? (role.color === 'blue' ? 'border-blue-500 bg-blue-50' :
                                                role.color === 'orange' ? 'border-orange-500 bg-orange-50' :
                                                    'border-purple-500 bg-purple-50')
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex flex-col items-center space-y-1">
                                            <IconComponent className={`h-6 w-6 ${selectedRole === role.key
                                                ? (role.color === 'blue' ? 'text-blue-600' :
                                                    role.color === 'orange' ? 'text-orange-600' : 'text-purple-600')
                                                : 'text-gray-400'
                                                }`} />
                                            <span className={`text-xs font-medium ${selectedRole === role.key
                                                ? (role.color === 'blue' ? 'text-blue-600' :
                                                    role.color === 'orange' ? 'text-orange-600' : 'text-purple-600')
                                                : 'text-gray-500'
                                                }`}>
                                                {role.name}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
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

                            {/* Remember Me */}
                            <div className="flex items-center justify-between">
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
                            </div>

                            {/* Admin Credentials Hint */}
                            {selectedRole === 'admin' && (
                                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md text-sm">
                                    <div className="font-medium">Franchise Owner Credentials:</div>
                                    <div className="text-xs mt-1">
                                        Email: <code className="bg-blue-100 px-1 rounded">sneha@gmail.com</code><br />
                                        Password: <code className="bg-blue-100 px-1 rounded">franchise123</code>
                                    </div>
                                </div>
                            )}

                            {/* Submit Button */}
                            <div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 ${currentRole.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' :
                                        currentRole.color === 'orange' ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500' :
                                            'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500'
                                        }`}
                                >
                                    {loading ? (
                                        <div className="flex items-center">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Signing in...
                                        </div>
                                    ) : (
                                        <>
                                            <currentRole.icon className="h-5 w-5 mr-2" />
                                            Sign in as {currentRole.name}
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Alternative Auth Links */}
                            <div className="mt-6">
                                <div className="text-center">
                                    <p className="text-sm text-gray-600">
                                        New to the platform?{' '}
                                        <button
                                            type="button"
                                            onClick={() => navigate('/register')}
                                            className="font-medium text-blue-600 hover:text-blue-500 transition duration-200"
                                        >
                                            Create an account
                                        </button>
                                    </p>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
};

export default RoleBasedLogin;
