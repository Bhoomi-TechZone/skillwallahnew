// src/pages/Register.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaUser, FaEnvelope, FaLock, FaPhone, FaUserShield, FaChalkboardTeacher, FaUserGraduate, FaUpload, FaSpinner } from 'react-icons/fa';
import AuthService from '../services/authService';

const Register = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'student',
        phone: '',
        // Instructor specific fields
        specialization: '',
        experience: '',
        education: '',
        bio: '',
        skills: '',
        certifications: '',
        languages: '',
        instructor_roles: ''
    });

    const roles = [
        {
            key: 'student',
            name: 'Student',
            icon: FaUserGraduate,
            color: 'blue',
            description: 'Join to access courses and learning materials'
        },
        {
            key: 'instructor',
            name: 'Instructor',
            icon: FaChalkboardTeacher,
            color: 'orange',
            description: 'Create and manage courses, teach students'
        },
        {
            key: 'admin',
            name: 'Admin',
            icon: FaUserShield,
            color: 'purple',
            description: 'Manage the entire platform and users'
        }
    ];

    const currentRole = roles.find(role => role.key === formData.role);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (error) setError('');
        if (success) setSuccess('');
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setError('Avatar file size must be less than 5MB');
                return;
            }
            
            if (!file.type.startsWith('image/')) {
                setError('Please select a valid image file');
                return;
            }

            setAvatarFile(file);
            
            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setAvatarPreview(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation
        if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
            setError('Please fill in all required fields');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            // Prepare form data for multipart upload
            const registrationData = new FormData();
            
            // Add basic fields
            registrationData.append('name', formData.name);
            registrationData.append('email', formData.email);
            registrationData.append('password', formData.password);
            registrationData.append('role', formData.role);
            registrationData.append('phone', formData.phone);

            // Add instructor specific fields if role is instructor
            if (formData.role === 'instructor') {
                if (formData.specialization) registrationData.append('specialization', formData.specialization);
                if (formData.experience) registrationData.append('experience', formData.experience);
                if (formData.education) registrationData.append('education', formData.education);
                if (formData.bio) registrationData.append('bio', formData.bio);
                if (formData.skills) registrationData.append('skills', formData.skills);
                if (formData.certifications) registrationData.append('certifications', formData.certifications);
                if (formData.languages) registrationData.append('languages', formData.languages);
                if (formData.instructor_roles) {
                    registrationData.append('instructor_roles', JSON.stringify(formData.instructor_roles.split(',').map(role => role.trim())));
                }
            }

            // Add avatar if selected
            if (avatarFile) {
                registrationData.append('avatar', avatarFile);
            }

            console.log('Submitting registration for role:', formData.role);

            // Use AuthService for registration
            const data = await AuthService.register(registrationData);

            console.log('Registration successful:', data);

            setSuccess(`🎉 Registration successful! Welcome ${data.user?.name || formData.name}!`);
            
            // Auto-login after successful registration
            if (data.access_token) {
                // Store authentication data
                AuthService.storeAuthData(data);
                
                setTimeout(() => {
                    // Redirect to appropriate dashboard
                    const dashboardRoute = data.user?.dashboard_route || AuthService.getDashboardRoute(data.user?.role);
                    navigate(dashboardRoute);
                }, 2000);
            } else {
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            }

        } catch (err) {
            console.error('Registration error:', err);
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl w-full space-y-8">
                {/* Header */}
                <div className="text-center">
                    <div className={`mx-auto h-20 w-20 rounded-full flex items-center justify-center mb-4 ${
                        currentRole.color === 'blue' ? 'bg-blue-600' : 
                        currentRole.color === 'orange' ? 'bg-orange-600' : 'bg-purple-600'
                    }`}>
                        <currentRole.icon className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900">
                        Join as {currentRole.name}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        {currentRole.description}
                    </p>
                </div>

                {/* Role Selection */}
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Register as:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {roles.map((role) => {
                            const IconComponent = role.icon;
                            return (
                                <button
                                    key={role.key}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, role: role.key }))}
                                    className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                                        formData.role === role.key
                                            ? (role.color === 'blue' ? 'border-blue-500 bg-blue-50' :
                                               role.color === 'orange' ? 'border-orange-500 bg-orange-50' : 
                                               'border-purple-500 bg-purple-50')
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="flex flex-col items-center space-y-1">
                                        <IconComponent className={`h-6 w-6 ${
                                            formData.role === role.key 
                                                ? (role.color === 'blue' ? 'text-blue-600' :
                                                   role.color === 'orange' ? 'text-orange-600' : 'text-purple-600')
                                                : 'text-gray-400'
                                        }`} />
                                        <span className={`text-xs font-medium ${
                                            formData.role === role.key 
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

                        {/* Avatar Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Profile Picture (Optional)
                            </label>
                            <div className="flex items-center space-x-4">
                                {avatarPreview ? (
                                    <img 
                                        src={avatarPreview} 
                                        alt="Avatar preview" 
                                        className="h-16 w-16 rounded-full object-cover border-2 border-gray-300"
                                    />
                                ) : (
                                    <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                                        <FaUser className="h-8 w-8 text-gray-400" />
                                    </div>
                                )}
                                <div>
                                    <input
                                        type="file"
                                        id="avatar"
                                        accept="image/*"
                                        onChange={handleAvatarChange}
                                        className="hidden"
                                        disabled={loading}
                                    />
                                    <label 
                                        htmlFor="avatar"
                                        className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <FaUpload className="h-4 w-4 mr-2" />
                                        Choose Photo
                                    </label>
                                    <p className="text-xs text-gray-500 mt-1">Max 5MB, JPG/PNG</p>
                                </div>
                            </div>
                        </div>

                        {/* Basic Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Name Field */}
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                    Full Name *
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaUser className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="name"
                                        name="name"
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        disabled={loading}
                                        className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-200"
                                        placeholder="Enter your full name"
                                    />
                                </div>
                            </div>

                            {/* Email Field */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                    Email Address *
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
                                        className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-200"
                                        placeholder="Enter your email"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Password Field */}
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                    Password *
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
                                        className="appearance-none relative block w-full pl-10 pr-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-200"
                                        placeholder="Create a password"
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

                            {/* Phone Field */}
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                                    Phone Number
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaPhone className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        disabled={loading}
                                        className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-200"
                                        placeholder="Your phone number"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Instructor Specific Fields */}
                        {formData.role === 'instructor' && (
                            <div className="border-t border-gray-200 pt-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Instructor Profile</h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="specialization" className="block text-sm font-medium text-gray-700 mb-1">
                                            Specialization
                                        </label>
                                        <input
                                            id="specialization"
                                            name="specialization"
                                            type="text"
                                            value={formData.specialization}
                                            onChange={handleInputChange}
                                            disabled={loading}
                                            className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-200"
                                            placeholder="e.g., Computer Science, Mathematics"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-1">
                                            Experience
                                        </label>
                                        <input
                                            id="experience"
                                            name="experience"
                                            type="text"
                                            value={formData.experience}
                                            onChange={handleInputChange}
                                            disabled={loading}
                                            className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-200"
                                            placeholder="e.g., 5 years"
                                        />
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <label htmlFor="education" className="block text-sm font-medium text-gray-700 mb-1">
                                        Education
                                    </label>
                                    <input
                                        id="education"
                                        name="education"
                                        type="text"
                                        value={formData.education}
                                        onChange={handleInputChange}
                                        disabled={loading}
                                        className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-200"
                                        placeholder="e.g., PhD in Computer Science from MIT"
                                    />
                                </div>

                                <div className="mt-4">
                                    <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                                        Bio
                                    </label>
                                    <textarea
                                        id="bio"
                                        name="bio"
                                        rows={3}
                                        value={formData.bio}
                                        onChange={handleInputChange}
                                        disabled={loading}
                                        className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-200"
                                        placeholder="Tell us about yourself and your teaching philosophy"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                    <div>
                                        <label htmlFor="skills" className="block text-sm font-medium text-gray-700 mb-1">
                                            Skills
                                        </label>
                                        <input
                                            id="skills"
                                            name="skills"
                                            type="text"
                                            value={formData.skills}
                                            onChange={handleInputChange}
                                            disabled={loading}
                                            className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-200"
                                            placeholder="e.g., Python, Machine Learning, Data Science"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="languages" className="block text-sm font-medium text-gray-700 mb-1">
                                            Languages
                                        </label>
                                        <input
                                            id="languages"
                                            name="languages"
                                            type="text"
                                            value={formData.languages}
                                            onChange={handleInputChange}
                                            disabled={loading}
                                            className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-200"
                                            placeholder="e.g., English, Spanish, French"
                                        />
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <label htmlFor="certifications" className="block text-sm font-medium text-gray-700 mb-1">
                                        Certifications
                                    </label>
                                    <input
                                        id="certifications"
                                        name="certifications"
                                        type="text"
                                        value={formData.certifications}
                                        onChange={handleInputChange}
                                        disabled={loading}
                                        className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-200"
                                        placeholder="e.g., AWS Certified Solutions Architect"
                                    />
                                </div>

                                <div className="mt-4">
                                    <label htmlFor="instructor_roles" className="block text-sm font-medium text-gray-700 mb-1">
                                        Instructor Roles
                                    </label>
                                    <input
                                        id="instructor_roles"
                                        name="instructor_roles"
                                        type="text"
                                        value={formData.instructor_roles}
                                        onChange={handleInputChange}
                                        disabled={loading}
                                        className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-200"
                                        placeholder="e.g., Lead Instructor, Course Creator, Mentor (comma separated)"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 ${
                                    currentRole.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' :
                                    currentRole.color === 'orange' ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500' :
                                    'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500'
                                }`}
                            >
                                {loading ? (
                                    <div className="flex items-center">
                                        <FaSpinner className="animate-spin h-4 w-4 mr-2" />
                                        Creating Account...
                                    </div>
                                ) : (
                                    <>
                                        <currentRole.icon className="h-5 w-5 mr-2" />
                                        Create {currentRole.name} Account
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Login Link */}
                        <div className="mt-6">
                            <div className="text-center">
                                <p className="text-sm text-gray-600">
                                    Already have an account?{' '}
                                    <button
                                        type="button"
                                        onClick={() => navigate('/login')}
                                        className="font-medium text-blue-600 hover:text-blue-500 transition duration-200"
                                    >
                                        Sign in here
                                    </button>
                                </p>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Register;
