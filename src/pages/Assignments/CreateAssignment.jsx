import { useEffect, useState } from 'react';

// API Base URL - Update this to match your backend
const API_BASE_URL = 'http://localhost:4000';

const CreateAssignment = () => {
    // Helper function to get today's date in YYYY-MM-DD format
    const getTodayDate = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };

    const [assignment, setAssignment] = useState({
        title: '',
        description: '',
        deadline: getTodayDate(), // Default to today's date
        courseId: '',
        questionsPdf: null
    });
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [successMsg, setSuccessMsg] = useState('');
    const [isInstructorLoggedIn, setIsInstructorLoggedIn] = useState(false);

    // Helper function to get current user info from token
    const getCurrentUserInfo = () => {
        try {
            const token = localStorage.getItem('instructorToken') || localStorage.getItem('token') || localStorage.getItem('authToken');
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
            console.log('Could not decode token for user info:', e);
        }
        return null;
    };

    // Check if instructor is logged in when component mounts
    useEffect(() => {
        const token = localStorage.getItem('instructorToken');
        if (!token) {
            setIsInstructorLoggedIn(false);
            setLoading(false);
            return;
        }
        setIsInstructorLoggedIn(true);
        console.log('CreateAssignment component mounted, fetching courses...');
        fetchInstructorCourses();
    }, []);

    const fetchInstructorCourses = async () => {
        try {
            setLoading(true);

            // Get instructor token
            const token = localStorage.getItem('instructorToken');
            if (!token) {
                console.error('No instructor token found');
                setLoading(false);
                return;
            }

            // Use the instructor-specific endpoint that only returns courses created by this instructor
            const response = await fetch(`${API_BASE_URL}/instructor/courses`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Fetched instructor courses:', data);

            setCourses(data); // These are only courses created by the current instructor
        } catch (error) {
            console.error('Error fetching instructor courses:', error);
            setCourses([]); // Set empty array on error
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setAssignment({ ...assignment, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            setAssignment({ ...assignment, questionsPdf: file });
        } else if (file) {
            alert('Please select a PDF file only');
            e.target.value = ''; // Clear the input
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            // Get instructor token
            const token = localStorage.getItem('instructorToken');
            if (!token) {
                alert('Please login as instructor first');
                return;
            }

            // Get current user info to extract instructor_id
            const currentUser = getCurrentUserInfo();
            if (!currentUser || !currentUser.user_id) {
                alert('Unable to get instructor information. Please login again.');
                return;
            }

            // Create FormData for file upload
            const formData = new FormData();
            formData.append('title', assignment.title);
            formData.append('description', assignment.description);
            formData.append('due_date', assignment.deadline);
            formData.append('course_id', assignment.courseId);
            formData.append('instructor_id', currentUser.user_id); // Primary field for backend
            formData.append('instructor', currentUser.user_id); // Fallback field (like courses API)

            // Add PDF file if selected
            if (assignment.questionsPdf) {
                formData.append('questions_pdf', assignment.questionsPdf);
            }

            console.log('Submitting assignment data with file:', {
                title: assignment.title,
                description: assignment.description,
                due_date: assignment.deadline,
                course_id: assignment.courseId,
                instructor_id: currentUser.user_id, // Log the instructor_id being sent
                instructor: currentUser.user_id, // Log the instructor field being sent
                has_pdf: !!assignment.questionsPdf
            });

            const response = await fetch(`${API_BASE_URL}/assignments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // Don't set Content-Type header when sending FormData
                },
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Assignment created successfully:', result);
                setSuccessMsg(`Assignment "${assignment.title}" created successfully!`);
                setAssignment({
                    title: '',
                    description: '',
                    deadline: getTodayDate(), // Reset to today's date
                    courseId: '',
                    questionsPdf: null
                });
                // Clear file input
                const fileInput = document.querySelector('input[type="file"]');
                if (fileInput) fileInput.value = '';
                setTimeout(() => setSuccessMsg(''), 2500);
            } else {
                const errorData = await response.json();
                console.error('Error creating assignment:', response.status, errorData);
                alert(`Error: ${errorData.detail || 'Failed to create assignment'}`);
            }
        } catch (error) {
            console.error('Error creating assignment:', error);
            alert('Error creating assignment. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-100 py-8 px-2 sm:px-6 lg:px-12 flex items-center justify-center">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-8 border border-orange-100">
                <h2 className="text-3xl sm:text-4xl font-bold text-center text-orange-800 mb-8 drop-shadow-lg flex items-center justify-center gap-2">
                    <span role="img" aria-label="Create Assignment">📝</span> Create Assignment
                </h2>

                {!isInstructorLoggedIn ? (
                    <div className="text-center">
                        <div className="mb-6 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-lg px-4 py-3 text-center font-semibold shadow">
                            Please login as an instructor to create assignments.
                        </div>
                        <button
                            onClick={() => window.location.href = '/instructor'}
                            className="bg-gradient-to-r from-[#988913] to-[#7d7310] hover:from-[#7d7310] hover:to-[#988913] text-white font-semibold py-2 px-4 rounded-lg shadow hover:shadow-lg hover:shadow-[#988913]/25 transition-all duration-200"
                        >
                            Go to Instructor Login
                        </button>
                    </div>
                ) : (
                    <>
                        {successMsg && (
                            <div className="mb-6 bg-orange-100 border border-orange-300 text-orange-800 rounded-lg px-4 py-3 text-center font-semibold shadow">
                                {successMsg}
                            </div>
                        )}

                        {/* Display current instructor info */}
                        {(() => {
                            const currentUser = getCurrentUserInfo();
                            return currentUser ? (
                                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 shadow">
                                    <div className="flex items-center gap-3">
                                        <span className="text-blue-600 text-xl">👨‍🏫</span>
                                        <div>
                                            <div className="text-sm text-blue-700 font-medium">Creating assignment as:</div>
                                            <div className="text-blue-900 font-semibold">{currentUser.name} ({currentUser.user_id})</div>
                                        </div>
                                    </div>
                                </div>
                            ) : null;
                        })()}

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="bg-orange-50 rounded-xl p-5 shadow border border-orange-100">
                                <label className="block text-base font-semibold text-orange-900 mb-2">Select Course <span className="text-red-500">*</span></label>
                                {loading ? (
                                    <div className="text-orange-700">Loading courses...</div>
                                ) : courses.length === 0 ? (
                                    <div className="text-red-700">
                                        No courses found. You need to create a course first before creating assignments.
                                        <br />
                                        <a href="/create-course" className="text-blue-600 hover:underline mt-2 inline-block">
                                            → Create a new course
                                        </a>
                                    </div>
                                ) : (
                                    <select
                                        name="courseId"
                                        value={assignment.courseId}
                                        onChange={handleChange}
                                        required
                                        className="block w-full text-base text-orange-900 border border-orange-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                                    >
                                        <option value="">Select a course...</option>
                                        {courses.map((course) => (
                                            <option key={course.id || course._id} value={course.id || course._id}>
                                                {course.title}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <div className="bg-orange-50 rounded-xl p-5 shadow border border-orange-100">
                                <label className="block text-base font-semibold text-orange-900 mb-2">Assignment Title <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="title"
                                    placeholder="Assignment Title"
                                    value={assignment.title}
                                    onChange={handleChange}
                                    required
                                    className="block w-full text-base text-orange-900 border border-orange-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                                />
                            </div>
                            <div className="bg-orange-50 rounded-xl p-5 shadow border border-orange-100">
                                <label className="block text-base font-semibold text-orange-900 mb-2">Description <span className="text-red-500">*</span></label>
                                <textarea
                                    name="description"
                                    placeholder="Assignment Description"
                                    value={assignment.description}
                                    onChange={handleChange}
                                    required
                                    rows="4"
                                    className="block w-full border border-orange-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 transition min-h-[40px] bg-white"
                                ></textarea>
                            </div>
                            <div className="bg-orange-50 rounded-xl p-5 shadow border border-orange-100">
                                <label className="block text-base font-semibold text-orange-900 mb-2">
                                    Deadline <span className="text-red-500">*</span>
                                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Default: Today</span>
                                </label>
                                <input
                                    type="date"
                                    name="deadline"
                                    value={assignment.deadline}
                                    onChange={handleChange}
                                    required
                                    className="block w-full text-base text-orange-900 border border-orange-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                                />
                                {assignment.deadline === getTodayDate() && (
                                    <p className="text-blue-600 text-xs mt-1">📅 Due date is set to today by default</p>
                                )}
                            </div>
                            <div className="bg-orange-50 rounded-xl p-5 shadow border border-orange-100">
                                <label className="block text-base font-semibold text-orange-900 mb-2">
                                    Assignment Questions PDF <span className="text-gray-500">(Optional)</span>
                                </label>
                                <input
                                    type="file"
                                    name="questionsPdf"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    className="block w-full text-base text-orange-900 border border-orange-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200 file:cursor-pointer"
                                />
                                <p className="text-sm text-gray-600 mt-2">
                                    Upload a PDF file containing assignment questions (optional)
                                </p>
                                {assignment.questionsPdf && (
                                    <div className="mt-2 text-sm text-orange-700 bg-orange-100 px-3 py-2 rounded-lg">
                                        📄 Selected: {assignment.questionsPdf.name}
                                    </div>
                                )}
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-gradient-to-r from-[#988913] to-[#7d7310] hover:from-[#7d7310] hover:to-[#988913] text-white font-semibold py-3 px-6 rounded-lg shadow hover:shadow-lg hover:shadow-[#988913]/25 transition-all duration-200 text-lg flex items-center gap-2 justify-center"
                            >
                                <span role="img" aria-label="Save Assignment">💾</span> Create Assignment
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default CreateAssignment;
