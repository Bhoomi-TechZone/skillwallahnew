import { useEffect, useState } from 'react';

// API Base URL - Update this to match your backend
const API_BASE_URL = 'http://localhost:4000';

const SubmitAssignment = () => {
    const [file, setFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(true);
    const [assignments, setAssignments] = useState([]);
    const [selectedAssignment, setSelectedAssignment] = useState('');
    const [comments, setComments] = useState('');
    const [error, setError] = useState('');
    const [userCourses, setUserCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [usingMockData, setUsingMockData] = useState(false);

    // Check authentication
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');

    // Helper function to validate ObjectId format
    const isValidObjectId = (id) => {
        return /^[0-9a-fA-F]{24}$/.test(id);
    };

    // Fetch user's enrolled courses
    useEffect(() => {
        if (!token) {
            setError('Please login to access assignments');
            setLoading(false);
            return;
        }
        fetchUserCourses();
    }, [token]);

    // Fetch assignments when course is selected
    useEffect(() => {
        if (selectedCourse) {
            fetchAssignments(selectedCourse);
        }
    }, [selectedCourse]);

    const fetchUserCourses = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/dashboard/my-courses`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                setUserCourses(data.courses || []);
            } else {
                setError('Failed to fetch your courses');
            }
        } catch (error) {
            console.error('Error fetching courses:', error);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const fetchAssignments = async (courseId) => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/assignments/course/${courseId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                // Handle both array and object response formats
                const assignmentsList = Array.isArray(data) ? data : (data.assignments || []);
                setAssignments(assignmentsList);
                setUsingMockData(false);
            } else {
                console.error('Failed to fetch assignments:', response.status, response.statusText);
                setUsingMockData(true);
                // Fallback to mock data with proper ObjectId format
                setAssignments([
                    {
                        id: '66b123456789abcdef123456',
                        title: 'Grammar Exercise 1',
                        description: 'Complete the grammar worksheet on present tenses',
                        due_date: '2025-08-10T23:59:59Z',
                        max_score: 100,
                        course_id: courseId
                    },
                    {
                        id: '66b123456789abcdef123457',
                        title: 'Speaking Assignment',
                        description: 'Record a 5-minute presentation on your favorite topic',
                        due_date: '2025-08-15T23:59:59Z',
                        max_score: 100,
                        course_id: courseId
                    }
                ]);
            }
        } catch (error) {
            console.error('Error fetching assignments:', error);
            setUsingMockData(true);
            // Fallback to mock data with proper ObjectId format
            setAssignments([
                {
                    id: '66b123456789abcdef123456',
                    title: 'Grammar Exercise 1',
                    description: 'Complete the grammar worksheet on present tenses',
                    due_date: '2025-08-10T23:59:59Z',
                    max_score: 100,
                    course_id: courseId
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const formatDueDate = (dateString) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        } catch {
            return dateString;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedCourse) {
            setError('Please select a course');
            return;
        }

        if (!selectedAssignment) {
            setError('Please select an assignment');
            return;
        }

        // Validate assignment ID format (should be a valid ObjectId)
        if (!isValidObjectId(selectedAssignment)) {
            setError('Invalid assignment selected. Please refresh the page and try again.');
            return;
        }

        if (!file) {
            setError('Please upload your assignment file');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('assignment_id', selectedAssignment);
            formData.append('comments', comments);

            const response = await fetch(`${API_BASE_URL}/submissions/submit`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (response.ok) {
                setSuccess(true);
                setFile(null);
                setComments('');
                setSelectedAssignment('');
                // Reset form
                document.querySelector('input[type="file"]').value = '';
            } else {
                const errorData = await response.json().catch(() => ({}));
                let errorMessage = 'Failed to submit assignment';

                if (response.status === 400) {
                    errorMessage = errorData.detail || 'Invalid request. Please check your input.';
                } else if (response.status === 401) {
                    errorMessage = 'Session expired. Please login again.';
                } else if (response.status === 403) {
                    errorMessage = 'You are not authorized to submit this assignment.';
                } else if (response.status === 404) {
                    errorMessage = 'Assignment not found.';
                } else if (response.status >= 500) {
                    errorMessage = 'Server error. Please try again later.';
                } else {
                    errorMessage = errorData.detail || `Request failed with status ${response.status}`;
                }

                setError(errorMessage);
            }
        } catch (error) {
            console.error('Error submitting assignment:', error);
            setError('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-100 py-8 px-2 sm:px-6 lg:px-12 flex items-center justify-center">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 border border-red-100">
                    <h2 className="text-2xl font-bold text-center text-red-800 mb-6">
                        🔒 Authentication Required
                    </h2>
                    <p className="text-center text-gray-600 mb-4">
                        Please login to submit assignments
                    </p>
                    <a href="/student-dashboard" className="block w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded text-center">
                        Go to Login
                    </a>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-100 py-8 px-2 sm:px-6 lg:px-12 flex items-center justify-center">
                <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-8 border border-orange-100">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading assignments...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-100 py-8 px-2 sm:px-6 lg:px-12 flex items-center justify-center">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-8 border border-orange-100">
                <h2 className="text-3xl sm:text-4xl font-bold text-center text-orange-800 mb-8 drop-shadow-lg flex items-center justify-center gap-2">
                    <span role="img" aria-label="Submit">📤</span> Submit Assignment
                </h2>

                {error && (
                    <div className="mb-6 p-4 rounded-lg bg-red-100 border border-red-300 text-red-800 text-center font-semibold flex items-center justify-center gap-2">
                        <span role="img" aria-label="Error">❌</span> {error}
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 rounded-lg bg-orange-100 border border-orange-300 text-orange-800 text-center font-semibold flex items-center justify-center gap-2">
                        <span role="img" aria-label="Success">🎉</span> Assignment submitted successfully!
                    </div>
                )}

                {usingMockData && (
                    <div className="mb-6 p-4 rounded-lg bg-yellow-100 border border-yellow-300 text-yellow-800 text-center font-semibold flex items-center justify-center gap-2">
                        <span role="img" aria-label="Warning">⚠️</span>
                        Using sample assignments. Check your internet connection or contact administrator.
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Course Selection */}
                    <div className="bg-orange-50 rounded-xl p-5 shadow border border-orange-100">
                        <label className="block text-base font-semibold text-orange-900 mb-2">
                            Select Course <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={selectedCourse}
                            onChange={(e) => {
                                setSelectedCourse(e.target.value);
                                setSelectedAssignment('');
                                setAssignments([]);
                            }}
                            required
                            className="block w-full border border-orange-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 transition bg-white"
                            disabled={submitting}
                        >
                            <option value="">Choose a course...</option>
                            {userCourses.map((course) => (
                                <option key={course.id} value={course.id}>
                                    {course.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Assignment Selection */}
                    {selectedCourse && (
                        <div className="bg-blue-50 rounded-xl p-5 shadow border border-blue-100">
                            <label className="block text-base font-semibold text-blue-900 mb-2">
                                Select Assignment <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={selectedAssignment}
                                onChange={(e) => setSelectedAssignment(e.target.value)}
                                required
                                className="block w-full border border-blue-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition bg-white"
                                disabled={submitting}
                            >
                                <option value="">Choose an assignment...</option>
                                {assignments.map((assignment) => (
                                    <option key={assignment.id} value={assignment.id}>
                                        {assignment.title} - Due: {formatDueDate(assignment.due_date)}
                                    </option>
                                ))}
                            </select>

                            {/* Assignment Details */}
                            {selectedAssignment && (
                                <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                                    {(() => {
                                        const assignment = assignments.find(a => a.id === selectedAssignment);
                                        return assignment ? (
                                            <div>
                                                <p className="font-medium text-blue-800">{assignment.title}</p>
                                                <p className="text-sm text-blue-700 mt-1">{assignment.description}</p>
                                                <p className="text-xs text-blue-600 mt-2">
                                                    📅 Due: {formatDueDate(assignment.due_date)} | 📊 Max Score: {assignment.max_score}
                                                </p>
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                            )}
                        </div>
                    )}

                    {/* File Upload */}
                    {selectedAssignment && (
                        <div className="bg-orange-50 rounded-xl p-5 shadow border border-orange-100">
                            <label className="block text-base font-semibold text-orange-900 mb-2">
                                Upload Assignment File <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="file"
                                onChange={(e) => setFile(e.target.files[0])}
                                required
                                accept=".pdf,.doc,.docx,.txt,.zip,.rar"
                                className="block w-full text-base text-orange-900 border border-orange-200 rounded-lg cursor-pointer bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                                disabled={submitting}
                            />
                            <p className="text-xs text-orange-600 mt-1">
                                Accepted formats: PDF, DOC, DOCX, TXT, ZIP, RAR (Max 10MB)
                            </p>
                            {file && (
                                <div className="mt-2 text-orange-700 text-sm font-medium flex items-center gap-2">
                                    <span role="img" aria-label="File">📎</span> {file.name} ({Math.round(file.size / 1024)} KB)
                                </div>
                            )}
                        </div>
                    )}

                    {/* Comments */}
                    {selectedAssignment && (
                        <div className="bg-yellow-50 rounded-xl p-5 shadow border border-yellow-100">
                            <label className="block text-base font-semibold text-yellow-900 mb-2">
                                Comments or Notes (Optional)
                            </label>
                            <textarea
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                placeholder="Add any comments about your submission..."
                                rows="3"
                                className="block w-full border border-yellow-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition bg-white"
                                disabled={submitting}
                            />
                        </div>
                    )}

                    {/* Submit Button */}
                    {selectedAssignment && (
                        <button
                            type="submit"
                            className={`w-full bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow transition-colors duration-200 text-lg flex items-center gap-2 justify-center ${submitting ? 'opacity-60 cursor-not-allowed' : ''}`}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <span role="img" aria-label="Submit">✅</span> Submit Assignment
                                </>
                            )}
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
};

export default SubmitAssignment;
