// src/pages/CreateCourse.jsx
import { useEffect, useState } from 'react';
import { createCourse } from '../api/coursesApi';
import { fetchInstructors } from '../api/studentsApi';

const CreateCourse = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        price: '',
        instructor: '', // Add instructor field
        thumbnail: null,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [instructors, setInstructors] = useState([]);
    const [currentUserRole, setCurrentUserRole] = useState(null);

    // Helper function to get current user role
    const getCurrentUserRole = () => {
        try {
            const token = localStorage.getItem('adminToken') || localStorage.getItem('instructorToken') || localStorage.getItem('authToken');
            if (token) {
                const tokenPayload = JSON.parse(atob(token.split('.')[1]));
                return tokenPayload.role;
            }
        } catch (e) {
            console.log('Could not decode token for role');
        }
        return null;
    };

    // Helper function to get current user info
    const getCurrentUserInfo = () => {
        try {
            const token = localStorage.getItem('adminToken') || localStorage.getItem('instructorToken') || localStorage.getItem('authToken');
            if (token) {
                const tokenPayload = JSON.parse(atob(token.split('.')[1]));
                return {
                    user_id: tokenPayload.user_id,
                    name: tokenPayload.name,
                    email: tokenPayload.email,
                    role: tokenPayload.role
                };
            }
        } catch (e) {
            console.log('Could not decode token for user info');
        }
        return null;
    };

    // Fetch instructors list when component mounts
    useEffect(() => {
        const fetchInstructorsData = async () => {
            try {
                const token = localStorage.getItem('token') || 
                              localStorage.getItem('adminToken') || 
                              localStorage.getItem('instructorToken') || 
                              localStorage.getItem('authToken');
                
                console.log('Token check:', token ? 'Token found' : 'No token found');
                
                if (token) {
                    const currentUser = getCurrentUserInfo();
                    if (currentUser) {
                        setCurrentUserRole(currentUser.role);

                        // If current user is an instructor, auto-select them and don't fetch list
                        if (currentUser.role === 'instructor') {
                            const instructorData = {
                                _id: currentUser.user_id,
                                name: currentUser.name || 'Current Instructor',
                                email: currentUser.email || 'instructor@example.com'
                            };
                            
                            setInstructors([instructorData]);
                            setFormData(prev => ({
                                ...prev,
                                instructor: currentUser.user_id
                            }));
                            console.log('Instructor auto-selected:', instructorData);
                            return;
                        }

                        // If current user is admin or super_admin, fetch all instructors
                        if (currentUser.role === 'admin' || currentUser.role === 'super_admin' || currentUser.role === 'superadmin') {
                            console.log('Fetching instructors from API...');
                            const response = await fetchInstructors();
                            console.log('Raw instructors API response:', response);
                            
                            if (response.success && response.users) {
                                setInstructors(response.users);
                                console.log('✅ Instructors loaded for admin:', response.users.length, 'instructors');
                            } else if (Array.isArray(response)) {
                                setInstructors(response);
                                console.log('✅ Instructors loaded (array):', response.length, 'instructors');
                            } else {
                                console.error('Failed to fetch instructors list');
                                setInstructors([]);
                            }
                        }
                    }
                } else {
                    console.warn('No token found - please log in');
                    setError('Please log in to create a course');
                }
            } catch (error) {
                console.error('Error in fetchInstructorsData:', error);
                console.error('Error details:', error.message);
                // Don't show error immediately, user might still be able to create course
                console.warn('Failed to load instructors, but continuing...');
            }
        };
        fetchInstructorsData();
    }, []);

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        
        // Special handling for price field to ensure valid decimal input
        if (name === 'price') {
            // Allow empty string, or valid number format
            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                setFormData({
                    ...formData,
                    [name]: value,
                });
            }
            // If invalid format, don't update the field
            return;
        }
        
        setFormData({
            ...formData,
            [name]: files ? files[0] : value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Get authentication token - try multiple keys
            const token = localStorage.getItem('token') || 
                          localStorage.getItem('adminToken') || 
                          localStorage.getItem('instructorToken') || 
                          localStorage.getItem('authToken');
            
            console.log('Submit - Token check:', token ? 'Token found' : 'No token');
            
            if (!token) {
                setError('Please log in to create a course');
                setLoading(false);
                return;
            }

            const currentUser = getCurrentUserInfo();
            console.log('Submit - Current user:', currentUser);
            if (!currentUser) {
                setError('Unable to get user information. Please log in again.');
                setLoading(false);
                return;
            }

            // Prepare the course data
            let instructor = formData.instructor;
            let instructorName = '';
            
            // For instructors, use their own ID and info
            if (currentUser.role === 'instructor') {
                instructor = currentUser.user_id;
                instructorName = currentUser.name || currentUser.email.split('@')[0];
            } else if (formData.instructor) {
                // For admins with selected instructor
                const selectedInstructor = instructors.find(inst => inst._id === formData.instructor);
                if (selectedInstructor) {
                    // Try different possible name fields
                    instructorName = selectedInstructor.name || 
                                   selectedInstructor.full_name || 
                                   selectedInstructor.username || 
                                   selectedInstructor.email?.split('@')[0] || 
                                   'Unknown Instructor';
                } else {
                    instructorName = 'Unknown Instructor';
                }
                console.log('Selected instructor:', selectedInstructor);
                console.log('Instructor name will be:', instructorName);
            } else {
                setError('Please select an instructor for this course');
                setLoading(false);
                return;
            }

            // Validate and parse price
            const priceValue = parseFloat(formData.price);
            if (isNaN(priceValue) || priceValue < 0) {
                setError('Please enter a valid price (0 or greater)');
                setLoading(false);
                return;
            }

            const courseData = {
                title: formData.title,
                description: formData.description,
                category: formData.category,
                price: priceValue,
                instructor: instructor,
                instructor_name: instructorName,
                published: false,
                status: "Pending", // New courses need admin approval
                created_by: currentUser.user_id,
                created_by_role: currentUser.role
            };

            console.log('Sending course data:', courseData);
            console.log('Instructor ID:', instructor);
            console.log('Instructor Name:', instructorName);
            console.log('Available instructors:', instructors);

            // Ensure we at least have a fallback name if needed
            if (!instructorName) {
                if (currentUser.role === 'instructor') {
                    instructorName = currentUser.name || currentUser.email?.split('@')[0] || 'Current Instructor';
                } else {
                    instructorName = 'Instructor';
                }
                console.log('Using fallback instructor name:', instructorName);
            }

            // Submit to backend API using coursesApi
            console.log('Creating course with data:', courseData);
            const result = await createCourse(courseData);

            if (result.success) {
                console.log('Course created successfully:', result);
                
                // Show success message based on user role
                const successMessage = currentUser.role === 'instructor' 
                    ? '✅ Your course has been created successfully!' 
                    : '✅ Course created successfully!';
                    
                alert(successMessage);
                
                // Reset form
                setFormData({
                    title: '',
                    description: '',
                    category: '',
                    price: '',
                    instructor: currentUser.role === 'instructor' ? currentUser.user_id : '',
                    thumbnail: null,
                });
                
                // Close the modal
                if (onClose) {
                    onClose();
                }
                
                // Navigate back to courses list for super admin
                if (currentUser.role === 'super_admin' || currentUser.role === 'superadmin') {
                    setTimeout(() => {
                        window.location.href = '/superadmin/courses/all';
                    }, 1500);
                }
                // For instructors, suggest navigation to their dashboard
                else if (currentUser.role === 'instructor') {
                    const goToDashboard = confirm('Would you like to go to your instructor dashboard?');
                    if (goToDashboard) {
                        window.location.href = '/instructor-dashboard';
                    }
                }
            } else {
                console.error('Failed to create course:', result);
                setError(result.error || result.detail || 'Failed to create course');
            }
        } catch (error) {
            console.error('Error creating course:', error);
            setError(error.message || 'Failed to connect to server. Please try again.');
        } finally {
            setLoading(false);
        }
    };





    return (
        <>
            {/* Modal Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    {/* Background Overlay */}
                    <div 
                        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                        onClick={onClose}
                    ></div>
                    
                    {/* Modal Container */}
                    <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                        <div 
                            className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header with Close Button */}
                            <div className="absolute right-4 top-4 z-10">
                                <button
                                    onClick={onClose}
                                    className="rounded-full bg-gray-100 p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="bg-gradient-to-br from-orange-50 to-blue-100 px-6 py-8 sm:px-8">
                                <div className="max-h-[80vh] overflow-y-auto">
                                    <h2 className="text-3xl sm:text-4xl font-bold text-center text-orange-800 mb-8 drop-shadow-lg flex items-center justify-center gap-2 pr-12">
                                        🎓 {currentUserRole === 'instructor' ? 'Create Your Course' : 'Create New Course'}
                                    </h2>
                                    
                                    {error && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                                            <div className="text-red-700 text-sm">{error}</div>
                                        </div>
                                    )}

                                    {currentUserRole === 'instructor' && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                            <div className="text-blue-700 text-sm">
                                                <strong>Welcome Instructor!</strong> You're creating a course that will be assigned to you automatically.
                                            </div>
                                        </div>
                                    )}
                                    
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="bg-orange-50 rounded-xl p-4 shadow border border-orange-100">
                                            <label className="block text-base font-semibold text-orange-900 mb-2">Course Title <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                name="title"
                                                required
                                                value={formData.title}
                                                onChange={handleChange}
                                                disabled={loading}
                                                className="block w-full text-base text-orange-900 border border-orange-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition disabled:opacity-50"
                                                placeholder="e.g. Mastering React.js"
                                            />
                                        </div>
                                        
                                        <div className="bg-orange-50 rounded-xl p-4 shadow border border-orange-100">
                                            <label className="block text-base font-semibold text-orange-900 mb-2">Description <span className="text-red-500">*</span></label>
                                            <textarea
                                                name="description"
                                                rows="3"
                                                required
                                                value={formData.description}
                                                onChange={handleChange}
                                                disabled={loading}
                                                className="block w-full border border-orange-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 transition min-h-[80px] bg-white disabled:opacity-50"
                                                placeholder="Brief course overview..."
                                            ></textarea>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="bg-orange-50 rounded-xl p-4 shadow border border-orange-100">
                                                <label className="block text-base font-semibold text-orange-900 mb-2">Category <span className="text-red-500">*</span></label>
                                                <select
                                                    name="category"
                                                    required
                                                    value={formData.category}
                                                    onChange={handleChange}
                                                    disabled={loading}
                                                    className="block w-full text-base text-orange-900 border border-orange-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition disabled:opacity-50"
                                                >
                                                    <option value="">-- Select Category --</option>
                                                    <option value="web">Web Development</option>
                                                    <option value="design">UI/UX Design</option>
                                                    <option value="marketing">Digital Marketing</option>
                                                    <option value="ai">AI & Machine Learning</option>
                                                    <option value="programming">Programming</option>
                                                    <option value="business">Business</option>
                                                    <option value="language">Language Learning</option>
                                                    <option value="other">Other</option>
                                                </select>
                                            </div>
                                            
                                            <div className="bg-orange-50 rounded-xl p-4 shadow border border-orange-100">
                                                <label className="block text-base font-semibold text-orange-900 mb-2">Price (INR) <span className="text-red-500">*</span></label>
                                                <input
                                                    type="number"
                                                    name="price"
                                                    required
                                                    min="0"
                                                    step="any"
                                                    value={formData.price}
                                                    onChange={handleChange}
                                                    disabled={loading}
                                                    className="block w-full text-base text-orange-900 border border-orange-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition disabled:opacity-50"
                                                    placeholder="e.g. 999.99"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="bg-orange-50 rounded-xl p-4 shadow border border-orange-100">
                                            <label className="block text-base font-semibold text-orange-900 mb-2">
                                                Instructor <span className="text-red-500">*</span>
                                            </label>
                                            {currentUserRole === 'instructor' ? (
                                                // For instructors: Show read-only field with their user_id
                                                <div>
                                                    <div className="block w-full text-base text-orange-900 border border-orange-200 rounded-lg px-4 py-2 bg-gray-100">
                                                        {instructors.length > 0 ? `User ID: ${instructors[0].user_id}` : 'Loading your information...'}
                                                    </div>
                                                    <div className="text-orange-600 text-sm mt-2">✅ Your user_id will be used as Instructor ID (e.g., ins005).</div>
                                                </div>
                                            ) : (
                                                // For admins: Show dropdown to select instructor
                                                <select
                                                    name="instructor"
                                                    required
                                                    value={formData.instructor}
                                                    onChange={handleChange}
                                                    disabled={loading}
                                                    className="block w-full text-base text-orange-900 border border-orange-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition disabled:opacity-50"
                                                >
                                                    <option value="">-- Select Instructor --</option>
                                                    {instructors.map(instructor => {
                                                        const id = instructor.id || instructor._id || instructor.user_id;
                                                        const name = instructor.name || instructor.full_name || instructor.username || 'Unknown';
                                                        const email = instructor.email || 'no-email';
                                                        return (
                                                            <option key={id} value={id}>
                                                                {name} ({email})
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            )}
                                            {currentUserRole === 'admin' && instructors.length === 0 && (
                                                <p className="text-sm text-gray-600 mt-2">Loading instructors...</p>
                                            )}
                                            {currentUserRole === 'instructor' && (
                                                <p className="text-sm text-orange-600 mt-2">✅ You will be assigned as the instructor for this course.</p>
                                            )}
                                        </div>
                                        
                                        <div className="bg-orange-50 rounded-xl p-4 shadow border border-orange-100">
                                            <label className="block text-base font-semibold text-orange-900 mb-2">Thumbnail</label>
                                            <input
                                                type="file"
                                                name="thumbnail"
                                                accept="image/*"
                                                onChange={handleChange}
                                                disabled={loading}
                                                className="block w-full text-base text-orange-900 border border-orange-200 rounded-lg cursor-pointer bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition disabled:opacity-50 file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200"
                                            />
                                            <p className="text-sm text-gray-600 mt-2">Note: File upload functionality requires additional backend setup</p>
                                        </div>
                                        
                                        <div className="flex gap-4 pt-4">
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                disabled={loading}
                                                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg shadow transition-colors duration-200 text-lg flex items-center gap-2 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="flex-1 bg-gradient-to-r from-[#988913] to-[#7d7310] hover:from-[#7d7310] hover:to-[#988913] text-white font-semibold py-3 px-6 rounded-lg shadow hover:shadow-lg hover:shadow-[#988913]/25 transition-all duration-200 text-lg flex items-center gap-2 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {loading ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                        Creating...
                                                    </>
                                                ) : (
                                                    <>
                                                        🚀 {currentUserRole === 'instructor' ? 'Create My Course' : 'Create Course'}
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CreateCourse;
