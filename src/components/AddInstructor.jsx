// src/components/AddInstructor.jsx
import { useState } from 'react';
import { FaChalkboardTeacher } from 'react-icons/fa';

const AddInstructor = ({ onSuccess, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        mobile: '',
        designation: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long');
            setLoading(false);
            return;
        }

        try {
            // Get authentication token (only admin should be able to add instructors)
            const token = localStorage.getItem('adminToken');

            if (!token) {
                setError('Admin access required to add instructors');
                setLoading(false);
                return;
            }

            // Prepare the instructor data
            const instructorData = {
                name: formData.name,
                email: formData.email,
                mobile: formData.mobile,
                designation: formData.designation,
                password: formData.password,
                role: 'instructor'
            };

            console.log('Adding instructor:', instructorData);

            // Submit to backend API (assuming you have an endpoint for adding instructors)
            const response = await fetch('http://localhost:4000/admin/instructors', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(instructorData)
            });

            // Add better error handling
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Failed to add instructor');
            }

            const result = await response.json();

            if (response.ok) {
                console.log('Instructor added successfully:', result);
                alert('✅ Instructor added successfully!');

                // Reset form
                setFormData({
                    name: '',
                    email: '',
                    mobile: '',
                    designation: '',
                    password: '',
                    confirmPassword: ''
                });

                // Call success callback if provided
                if (onSuccess) {
                    onSuccess(result);
                }
            } else {
                console.error('Failed to add instructor:', result);
                setError(result.detail || 'Failed to add instructor');
            }
        } catch (error) {
            console.error('Error adding instructor:', error);
            setError('Failed to connect to server. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-100 py-8 px-2 sm:px-6 lg:px-12 flex items-center justify-center">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-8 border border-orange-100">
                <h2 className="text-3xl sm:text-4xl font-bold text-center text-orange-800 mb-8 drop-shadow-lg flex items-center justify-center gap-2">
                    <FaChalkboardTeacher className="text-orange-600" /> Add New Instructor
                </h2>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                        <div className="text-red-700 text-sm">{error}</div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-orange-50 rounded-xl p-5 shadow border border-orange-100">
                        <label className="block text-base font-semibold text-orange-900 mb-2">
                            Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            required
                            value={formData.name}
                            onChange={handleChange}
                            disabled={loading}
                            className="block w-full text-base text-orange-900 border border-orange-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition disabled:opacity-50"
                            placeholder="e.g. Dr. John Smith"
                        />
                    </div>

                    <div className="bg-orange-50 rounded-xl p-5 shadow border border-orange-100">
                        <label className="block text-base font-semibold text-orange-900 mb-2">
                            Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            name="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            disabled={loading}
                            className="block w-full text-base text-orange-900 border border-orange-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition disabled:opacity-50"
                            placeholder="e.g. john.smith@example.com"
                        />
                    </div>

                    <div className="bg-orange-50 rounded-xl p-5 shadow border border-orange-100">
                        <label className="block text-base font-semibold text-orange-900 mb-2">
                            Mobile Number <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="tel"
                            name="mobile"
                            required
                            value={formData.mobile}
                            onChange={handleChange}
                            disabled={loading}
                            className="block w-full text-base text-orange-900 border border-orange-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition disabled:opacity-50"
                            placeholder="e.g. +91 9876543210"
                        />
                    </div>

                    <div className="bg-orange-50 rounded-xl p-5 shadow border border-orange-100">
                        <label className="block text-base font-semibold text-orange-900 mb-2">
                            Designation <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="designation"
                            required
                            value={formData.designation}
                            onChange={handleChange}
                            disabled={loading}
                            className="block w-full text-base text-orange-900 border border-orange-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition disabled:opacity-50"
                        >
                            <option value="">-- Select Designation --</option>
                            <option value="Professor">Professor</option>
                            <option value="Associate Professor">Associate Professor</option>
                            <option value="Assistant Professor">Assistant Professor</option>
                            <option value="Senior Lecturer">Senior Lecturer</option>
                            <option value="Lecturer">Lecturer</option>
                            <option value="Industry Expert">Industry Expert</option>
                            <option value="Subject Matter Expert">Subject Matter Expert</option>
                            <option value="Course Developer">Course Developer</option>
                            <option value="Training Specialist">Training Specialist</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div className="bg-orange-50 rounded-xl p-5 shadow border border-orange-100">
                        <label className="block text-base font-semibold text-orange-900 mb-2">
                            Password <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="password"
                            name="password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            disabled={loading}
                            className="block w-full text-base text-orange-900 border border-orange-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition disabled:opacity-50"
                            placeholder="Minimum 6 characters"
                            minLength="6"
                        />
                    </div>

                    <div className="bg-orange-50 rounded-xl p-5 shadow border border-orange-100">
                        <label className="block text-base font-semibold text-orange-900 mb-2">
                            Confirm Password <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="password"
                            name="confirmPassword"
                            required
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            disabled={loading}
                            className="block w-full text-base text-orange-900 border border-orange-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition disabled:opacity-50"
                            placeholder="Re-enter password"
                            minLength="6"
                        />
                    </div>

                    <div className="flex gap-4 mt-8">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow transition-colors duration-200 text-lg flex items-center gap-2 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    Adding Instructor...
                                </>
                            ) : (
                                <>
                                    <FaChalkboardTeacher /> Add Instructor
                                </>
                            )}
                        </button>

                        {onCancel && (
                            <button
                                type="button"
                                onClick={onCancel}
                                disabled={loading}
                                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg shadow transition-colors duration-200 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddInstructor;
