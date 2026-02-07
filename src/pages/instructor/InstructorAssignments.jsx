import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { API_BASE_URL } from '../../config/api.js';

const InstructorAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);

  const mockAssignments = [
    {
      id: 1,
      title: "Build a React Todo App",
      courseId: 1,
      courseName: "React.js Complete Course",
      description: "Create a fully functional todo application using React hooks",
      type: "project",
      dueDate: "2024-01-25",
      maxPoints: 100,
      submissions: 45,
      graded: 38,
      avgScore: 87,
      status: "published",
      createdDate: "2024-01-10"
    },
    {
      id: 2,
      title: "JavaScript Array Methods Exercise",
      courseId: 2,
      courseName: "JavaScript ES6+ Masterclass",
      description: "Complete exercises using map, filter, reduce, and other array methods",
      type: "exercise",
      dueDate: "2024-01-20",
      maxPoints: 50,
      submissions: 78,
      graded: 78,
      avgScore: 92,
      status: "published",
      createdDate: "2024-01-05"
    },
    {
      id: 3,
      title: "REST API Development",
      courseId: 3,
      courseName: "Node.js Backend Development",
      description: "Build a complete REST API with authentication and CRUD operations",
      type: "project",
      dueDate: "2024-01-30",
      maxPoints: 150,
      submissions: 23,
      graded: 15,
      avgScore: 78,
      status: "published",
      createdDate: "2024-01-12"
    },
    {
      id: 4,
      title: "HTML/CSS Portfolio",
      courseId: 4,
      courseName: "Web Development Fundamentals",
      description: "Create a personal portfolio website using HTML and CSS",
      type: "project",
      dueDate: "2024-01-28",
      maxPoints: 80,
      submissions: 12,
      graded: 8,
      avgScore: 85,
      status: "draft",
      createdDate: "2024-01-15"
    }
  ];

  // Get current user info from token
  const getCurrentUserInfo = () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('instructorToken') || localStorage.getItem('authToken');
      if (token) {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        console.log('🔍 Decoded token payload:', tokenPayload);
        
        return {
          user_id: tokenPayload.user_id || tokenPayload.sub || tokenPayload.id,
          name: tokenPayload.name || tokenPayload.username,
          email: tokenPayload.email,
          role: tokenPayload.role || tokenPayload.user_type
        };
      }
    } catch (e) {
      console.log('Could not decode token for user info:', e.message);
    }
    return null;
  };

  // Get auth token
  const getAuthToken = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('instructorToken') || localStorage.getItem('authToken');
    
    if (token) {
      // Basic token validation - check if it looks like a JWT
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.warn('⚠️ Token format appears invalid');
        return null;
      }
      
      try {
        // Decode payload to check expiration
        const payload = JSON.parse(atob(parts[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        
        if (payload.exp && payload.exp < currentTime) {
          console.warn('⚠️ Token has expired');
          // Clear expired token
          localStorage.removeItem('token');
          localStorage.removeItem('instructorToken'); 
          localStorage.removeItem('authToken');
          return null;
        }
        
        console.log('✅ Token appears valid, expires:', new Date(payload.exp * 1000));
        return token;
      } catch (e) {
        console.warn('⚠️ Could not decode token payload:', e.message);
        return token; // Return anyway, let server validate
      }
    }
    
    return null;
  };

  const checkAuthAndRedirect = () => {
    const token = getAuthToken();
    if (!token) {
      console.warn('🔑 No valid authentication token found, user needs to log in');
      // You can add redirect logic here if needed
      // window.location.href = '/login';
      return false;
    }
    return true;
  };

  // Fetch instructor-specific courses using the dedicated endpoint
  const fetchInstructorCourses = async () => {
    setCoursesLoading(true);
    try {
      const token = getAuthToken();
      const currentUser = getCurrentUserInfo();
      
      if (!token || !currentUser) {
        console.error('❌ No authentication token or user info found');
        console.log('🔍 Token check:', !!token);
        console.log('🔍 User check:', !!currentUser);
        setCourses([]);
        return;
      }

      console.log('🔄 Fetching courses from instructor endpoint...');
      console.log('👤 Current user details:');
      console.log('  - user_id:', currentUser.user_id);
      console.log('  - name:', currentUser.name);
      console.log('  - email:', currentUser.email);
      console.log('  - role:', currentUser.role);
      console.log('🔗 API URL:', `${API_BASE_URL}/instructor/my-courses`);
      
      // Use the instructor-specific courses endpoint
      const response = await fetch(`${API_BASE_URL}/instructor/my-courses`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'omit'
      });

      console.log('� API Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📋 Instructor courses API response:', data);
        
        let instructorCourses = [];
        
        // Handle instructor endpoint response structure
        if (data.success && data.data && Array.isArray(data.data.courses)) {
          instructorCourses = data.data.courses;
          console.log('✅ Found courses from instructor endpoint:', instructorCourses.length);
        } else if (Array.isArray(data)) {
          instructorCourses = data;
          console.log('✅ Found courses as direct array:', instructorCourses.length);
        } else if (data.courses && Array.isArray(data.courses)) {
          instructorCourses = data.courses;
          console.log('✅ Found courses in data.courses:', instructorCourses.length);
        } else {
          console.warn('⚠️ Unexpected instructor endpoint response structure:', typeof data);
          setCourses([]);
          return;
        }
        
        console.log('🎓 Instructor courses received:', instructorCourses.length);
        
        if (instructorCourses.length > 0) {
          // Transform to consistent format for dropdowns (no filtering needed - endpoint already returns instructor's courses)
          const transformedCourses = instructorCourses.map(course => ({
            id: course.course_id || course._id || course.id,
            name: course.title || course.name || 'Untitled Course',
            // Keep original course data for reference
            originalData: course
          }));
          
          setCourses(transformedCourses);
          console.log('✅ Courses loaded successfully:', transformedCourses);
        } else {
          console.warn('⚠️ No courses found for this instructor using exact matching');
          console.log('🔍 Debug info:');
          console.log('  - Current user ID:', currentUserId, typeof currentUserId);
          console.log('  - Current user name:', currentUser.name);
          console.log('  - Available instructor values:');
          allCourses.forEach(course => {
            console.log(`    "${course.title || course.name}": instructor="${course.instructor}", instructor_id="${course.instructor_id}", created_by="${course.created_by}", created_by_role="${course.created_by_role}"`);
          });
          
          // TEMPORARY: For debugging, let's show all courses that have instructor role
          console.log('🚧 TEMPORARY: Showing all instructor courses for debugging...');
          const fallbackCourses = allCourses.filter(course => 
            course.instructor || 
            course.instructor_id || 
            course.created_by_role === 'instructor' ||
            (course.created_by && course.created_by.startsWith('ins'))
          );
          
          if (fallbackCourses.length > 0) {
            console.log('🔄 Found fallback courses:', fallbackCourses.length);
            const transformedFallbackCourses = fallbackCourses.map(course => ({
              id: course.course_id || course._id || course.id,
              name: course.title || course.name || 'Untitled Course',
              originalData: course
            }));
            setCourses(transformedFallbackCourses);
            console.log('🆘 Using fallback courses:', transformedFallbackCourses);
          } else {
            setCourses([]);
          }
        }
        
      } else if (response.status === 404) {
        console.info('ℹ️ No courses found (404)');
        setCourses([]);
      } else {
        console.error('❌ Failed to fetch courses:', response.status);
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('📄 Error details:', errorText);
        setCourses([]);
      }
    } catch (error) {
      console.error('❌ Error fetching courses:', error);
      
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        console.error('🌐 Network error - check if server is running and CORS is configured');
      }
      
      setCourses([]);
    } finally {
      setCoursesLoading(false);
    }
  };

  useEffect(() => {
    // Debug API configuration
    console.log('🔧 API Configuration Debug:');
    console.log('  - API_BASE_URL:', API_BASE_URL);
    console.log('  - Environment:', import.meta.env.MODE);
    console.log('  - VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
    
    // Check authentication before making any API calls
    if (checkAuthAndRedirect()) {
      fetchAssignments();
      fetchInstructorCourses();
    } else {
      setLoading(false);
      setCoursesLoading(false);
    }
  }, []);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        console.error('❌ No authentication token found');
        console.error('🔍 Please check if you are logged in properly');
        setAssignments([]);
        return;
      }

      console.log('🔄 Fetching instructor assignments from API...');
      console.log('� API URL:', `${API_BASE_URL}/assignments/instructor`);
      console.log('�🔑 Token found:', token.substring(0, 20) + '...');
      
      const response = await fetch(`${API_BASE_URL}/assignments/instructor`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'omit' // Explicitly omit credentials to avoid CORS issues
      });

      console.log('📊 Response status:', response.status);
      console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));
      
      // Log response details for debugging
      if (!response.ok) {
        const responseText = await response.text().catch(() => 'Unable to read response');
        console.error('❌ Response not OK:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseText
        });
      }

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Assignments response:', data);
        
        let assignmentList = [];
        
        // Handle different response formats
        if (Array.isArray(data)) {
          assignmentList = data;
        } else if (data.assignments && Array.isArray(data.assignments)) {
          assignmentList = data.assignments;
        } else if (data.data && Array.isArray(data.data)) {
          assignmentList = data.data;
        }
        
        // Transform assignments to match the card display format
        const transformedAssignments = assignmentList.map(assignment => ({
          id: assignment._id || assignment.id,
          title: assignment.title,
          courseId: assignment.course_id || assignment.courseId,
          courseName: assignment.course_name || assignment.courseName || 'Unknown Course',
          description: assignment.description,
          type: assignment.type || 'exercise',
          dueDate: assignment.due_date || assignment.dueDate,
          maxPoints: assignment.max_points || assignment.maxPoints || 0,
          submissions: assignment.submissions || 0,
          graded: assignment.graded || 0,
          avgScore: assignment.avg_score || assignment.avgScore || 0,
          status: assignment.status || assignment.visibility || 'draft',
          createdDate: assignment.created_at || assignment.createdDate || assignment.created_date,
          // Additional fields from API
          instructions: assignment.instructions,
          estimatedTime: assignment.estimated_time || assignment.estimatedTime,
          attachmentUrl: assignment.attachment_url || assignment.attachmentUrl
        }));
        
        setAssignments(transformedAssignments);
        console.log('✅ Successfully loaded assignments:', transformedAssignments.length);
        
        if (transformedAssignments.length === 0) {
          console.log('ℹ️ No assignments found for this instructor');
        }
        
      } else if (response.status === 404) {
        console.log('ℹ️ No assignments found - endpoint returned 404');
        setAssignments([]);
      } else {
        console.error('❌ Failed to fetch assignments:', response.status);
        console.error('📄 Response text:', await response.text().catch(() => 'Unable to read response'));
        
        // Provide more specific error messages
        if (response.status === 401) {
          console.error('🔑 Authentication failed - token may be invalid or expired');
        } else if (response.status === 403) {
          console.error('🚫 Access denied - insufficient permissions');
        } else if (response.status === 500) {
          console.error('🔥 Server error - there may be an issue with the API');
        }
        
        setAssignments([]);
      }
    } catch (error) {
      console.error('❌ Error fetching assignments:', error);
      
      // Provide more specific error messages
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        console.error('🌐 Network error - this could be a CORS issue, network problem, or server unavailability');
        console.error('🔍 Troubleshooting tips:');
        console.error('  - Check if the server is running');
        console.error('  - Verify CORS is configured for your domain');
        console.error('  - Check network connectivity');
      } else if (error.name === 'AbortError') {
        console.error('⏱️ Request timeout - server took too long to respond');
      } else {
        console.error('🚨 Unexpected error:', error.name, error.message);
      }
      
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  // Edit assignment function
  const handleEditAssignment = (assignment) => {
    setEditingAssignment(assignment);
    setShowEditModal(true);
  };

  // Handle status toggle
  const handleStatusToggle = async (assignment) => {
    const newStatus = assignment.status === 'published' ? 'draft' : 'published';
    
    try {
      const token = getAuthToken();
      if (!token) {
        console.error('❌ No authentication token found');
        return;
      }

      console.log(`🔄 Toggling assignment ${assignment.id} status from ${assignment.status} to ${newStatus}`);
      
      const response = await fetch(`${API_BASE_URL}/assignments/${assignment.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          visibility: newStatus
        }),
        credentials: 'omit'
      });

      if (response.ok) {
        console.log('✅ Assignment status updated successfully');
        // Refresh the assignments list
        fetchAssignments();
      } else {
        const errorData = await response.text();
        console.error('❌ Failed to update assignment status:', errorData);
        alert('Failed to update assignment status');
      }
    } catch (error) {
      console.error('❌ Error toggling status:', error);
      alert('Error updating assignment status');
    }
  };

  // Handle view submissions
  const handleViewSubmissions = (assignment) => {
    console.log('🔥 DEBUG: handleViewSubmissions called with:', assignment);
    try {
      console.log('📋 Viewing submissions for assignment:', assignment.title);
      // TODO: Implement submissions view - could navigate to a submissions page or open a modal
      alert(`Viewing submissions for "${assignment.title}"\n\nThis feature will be implemented to show student submissions for grading.`);
    } catch (error) {
      console.error('Error in handleViewSubmissions:', error);
      alert('Error: Could not open submissions view');
    }
  };

  // Handle grade now
  const handleGradeNow = (assignment) => {
    console.log('🔥 DEBUG: handleGradeNow called with:', assignment);
    try {
      console.log('📝 Starting grading for assignment:', assignment.title);
      // TODO: Implement grading interface - could navigate to grading page or open grading modal
      alert(`Starting grading for "${assignment.title}"\n\nThis feature will be implemented to allow quick grading of student submissions.`);
    } catch (error) {
      console.error('Error in handleGradeNow:', error);
      alert('Error: Could not open grading interface');
    }
  };

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.courseName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = filterCourse === 'all' || assignment.courseId.toString() === filterCourse;
    const matchesStatus = filterStatus === 'all' || assignment.status === filterStatus;
    
    return matchesSearch && matchesCourse && matchesStatus;
  });

  const AssignmentCard = ({ assignment }) => {
    const isOverdue = new Date(assignment.dueDate) < new Date();
    const gradingProgress = assignment.submissions > 0 ? (assignment.graded / assignment.submissions) * 100 : 0;

    // Format dates properly
    const formatDate = (dateString) => {
      if (!dateString) return 'Not set';
      try {
        return new Date(dateString).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      } catch (error) {
        return 'Invalid date';
      }
    };

    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{assignment.title}</h3>
            <p className="text-gray-600 text-sm mb-2">{assignment.courseName}</p>
            <p className="text-gray-500 text-sm line-clamp-2">{assignment.description}</p>
            {assignment.instructions && (
              <p className="text-gray-400 text-xs mt-1 line-clamp-1">
                📝 Instructions available
              </p>
            )}
            {assignment.attachmentUrl && (
              <p className="text-blue-600 text-xs mt-1">
                📎 Attachment included
              </p>
            )}
          </div>
          <div className="flex flex-col items-end space-y-2">
            {/* Toggle Button for Draft/Publish */}
            <div className="flex items-center space-x-1 bg-gray-100 rounded-full p-1">
              <button
                type="button"
                onClick={() => handleStatusToggle(assignment)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                  assignment.status === 'draft'
                    ? 'bg-yellow-500 text-white shadow-sm'
                    : 'bg-transparent text-gray-600 hover:bg-gray-200'
                }`}
                title="Set as Draft"
              >
                Draft
              </button>
              <button
                type="button"
                onClick={() => handleStatusToggle(assignment)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                  assignment.status === 'published'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-transparent text-gray-600 hover:bg-gray-200'
                }`}
                title="Publish Assignment"
              >
                Published
              </button>
            </div>
            <span className={`px-2 py-1 text-xs rounded-full ${
              assignment.type === 'project' 
                ? 'bg-blue-100 text-blue-700' 
                : assignment.type === 'quiz'
                ? 'bg-purple-100 text-purple-700'
                : assignment.type === 'essay'
                ? 'bg-pink-100 text-pink-700'
                : 'bg-indigo-100 text-indigo-700'
            }`}>
              {assignment.type}
            </span>
            {assignment.estimatedTime && (
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                ⏱️ {assignment.estimatedTime}h
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{assignment.maxPoints}</div>
            <div className="text-xs text-gray-500">Max Points</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-orange-600">{assignment.submissions}</div>
            <div className="text-xs text-gray-500">Submissions</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-purple-600">{assignment.graded}</div>
            <div className="text-xs text-gray-500">Graded</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-orange-600">{assignment.avgScore}%</div>
            <div className="text-xs text-gray-500">Avg Score</div>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Grading Progress</span>
            <span>{gradingProgress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full"
              style={{ width: `${gradingProgress}%` }}
            ></div>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <span className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
            Due: {formatDate(assignment.dueDate)}
            {isOverdue && ' (Overdue)'}
          </span>
          <span>Created: {formatDate(assignment.createdDate)}</span>
        </div>

        <div className="flex items-center space-x-2">
          <button 
            type="button"
            onClick={() => handleEditAssignment(assignment)}
            className="px-4 py-2 bg-gradient-to-r from-[#988913] to-[#7d7310] hover:from-[#7d7310] hover:to-[#988913] text-white text-sm rounded-lg shadow hover:shadow-lg hover:shadow-[#988913]/25 transition-all duration-200"
          >
            Edit Assignment
          </button>
          <button 
            type="button" 
            onClick={(e) => {
              console.log('🔥 DEBUG: View Submissions button clicked!');
              e.preventDefault();
              e.stopPropagation();
              handleViewSubmissions(assignment);
            }}
            onMouseEnter={() => console.log('🖱️ Mouse entered View Submissions button')}
            className="px-4 py-2 bg-orange-100 text-orange-700 text-sm rounded-lg hover:bg-orange-200 transition-colors cursor-pointer border border-orange-300 hover:border-orange-400 active:bg-orange-300"
            style={{ pointerEvents: 'auto', zIndex: 1 }}
          >
            View Submissions
          </button>
          <button 
            type="button" 
            onClick={(e) => {
              console.log('🔥 DEBUG: Grade Now button clicked!');
              e.preventDefault();
              e.stopPropagation();
              handleGradeNow(assignment);
            }}
            onMouseEnter={() => console.log('🖱️ Mouse entered Grade Now button')}
            className="px-4 py-2 bg-purple-100 text-purple-700 text-sm rounded-lg hover:bg-purple-200 transition-colors cursor-pointer border border-purple-300 hover:border-purple-400 active:bg-purple-300"
            style={{ pointerEvents: 'auto', zIndex: 1 }}
          >
            Grade Now
          </button>
          {assignment.attachmentUrl && (
            <a
              href={assignment.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors"
              title="Download attachment"
            >
              📎
            </a>
          )}
          <button type="button" className="px-3 py-2 text-gray-500 hover:text-gray-700 transition-colors">
            <span className="text-lg">⋯</span>
          </button>
        </div>
      </div>
    );
  };

  const CreateAssignmentModal = () => {
    // Get tomorrow's date in YYYY-MM-DD format for the date input (to avoid past date issues)
    const getTomorrowsDate = () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    };

    // Get today's date for minimum date validation
    const getTodaysDate = () => {
      return new Date().toISOString().split('T')[0];
    };

    const [formData, setFormData] = useState({
      title: '',
      courseId: '',
      description: '',
      type: 'exercise',
      maxPoints: '',
      dueDate: getTodaysDate(), // Set today's date as default
      instructions: '',
      // New fields
      attachmentFile: null,
      assignedStudents: [],
      visibility: 'draft',
      estimatedTime: ''
    });

    // Add state to track form submission status
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastSubmissionSuccess, setLastSubmissionSuccess] = useState(false);

    // Debug form data changes - commented out to prevent excessive re-renders
    // useEffect(() => {
    //   console.log('🔍 [FORMDATA DEBUG] Form data changed:', formData);
    // }, [formData]);

    // Create stable ref for file input to prevent re-renders
    const fileInputRef = useRef(null);

    const [students, setStudents] = useState([]);
    const [studentsLoading, setStudentsLoading] = useState(false);

    // Fetch students when course is selected
    const fetchStudents = async (courseId) => {
      if (!courseId) {
        setStudents([]);
        return;
      }
      
      setStudentsLoading(true);
      try {
        const token = getAuthToken();
        console.log(`🔍 Fetching enrolled students for course: ${courseId}`);
        
        // Use the existing instructor/students endpoint which returns only enrolled students
        const response = await fetch(`${API_BASE_URL}/instructor/students`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'omit'
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ All enrolled students data:', data);
          console.log('🔍 Selected courseId for filtering:', courseId, 'Type:', typeof courseId);
          
          // Filter students by the selected course
          const enrolledStudents = Array.isArray(data) ? data : [];
          console.log('🔍 Total students received:', enrolledStudents.length);
          
          // More flexible filtering to handle different backend response formats
          const courseStudents = enrolledStudents.filter(student => {
            console.log('🔍 Checking student:', {
              name: student.name,
              student_course_id: student.course_id,
              courseId_param: courseId,
              enrolledCourses: student.enrolledCourses
            });
            
            // Check direct course_id match (handle both string and number)
            const directMatch = student.course_id === courseId || 
                              student.course_id === parseInt(courseId) ||
                              student.course_id?.toString() === courseId?.toString();
            
            // Check enrolledCourses array if it exists
            const enrolledMatch = student.enrolledCourses && 
                                student.enrolledCourses.some(course => 
                                  course.courseId === courseId || 
                                  course.courseId === parseInt(courseId) ||
                                  course.courseId?.toString() === courseId?.toString() ||
                                  course.id === courseId ||
                                  course.id === parseInt(courseId)
                                );
            
            console.log('🔍 Match results for', student.name, '- Direct:', directMatch, 'Enrolled:', enrolledMatch);
            return directMatch || enrolledMatch;
          });
          
          console.log(`📚 Students enrolled in course ${courseId}:`, courseStudents);
          
          if (courseStudents.length > 0) {
            const transformedStudents = courseStudents.map(student => ({
              id: student.student_id || student.id || student._id,
              name: student.name,
              email: student.email
            }));
            setStudents(transformedStudents);
            console.log(`✅ Found ${transformedStudents.length} enrolled students for assignment:`, transformedStudents);
          } else {
            // As a fallback, if we have students but filtering failed, show all students
            if (enrolledStudents.length > 0) {
              console.log('🔄 Fallback: Showing all available students for debugging');
              const transformedStudents = enrolledStudents.map(student => ({
                id: student.student_id || student.id || student._id,
                name: `${student.name} (Course: ${student.course_id || 'Unknown'})`,
                email: student.email
              }));
              setStudents(transformedStudents);
              console.log('🔄 Fallback students:', transformedStudents);
            } else {
              setStudents([]);
            }
          }
        } else {
          console.error('❌ Failed to fetch students:', response.status, response.statusText);
          setStudents([]);
        }
      } catch (error) {
        console.error('❌ Error fetching students:', error);
        setStudents([]);
      } finally {
        setStudentsLoading(false);
      }
    };

    // Handle course selection change
    const handleCourseChange = (courseId) => {
      setFormData(prev => ({ ...prev, courseId, assignedStudents: [] }));
      fetchStudents(courseId);
    };

    // Handle file upload
    const handleFileUpload = (e) => {
      console.log('🔍 File upload triggered');
      e.stopPropagation();
      
      const file = e.target.files[0];
      console.log('🔍 Selected file:', file);
      
      if (file) {
        const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'];
        const allowedExtensions = ['.pdf', '.docx', '.zip'];
        
        const isValidType = allowedTypes.includes(file.type) || 
                           allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
        
        console.log('🔍 File type valid:', isValidType, 'File type:', file.type, 'File name:', file.name);
        
        if (isValidType) {
          console.log('✅ Setting file in form data');
          setFormData(prev => ({ ...prev, attachmentFile: file }));
        } else {
          alert('Please select a PDF, DOCX, or ZIP file.');
          e.target.value = '';
        }
      } else {
        console.log('❌ No file selected');
      }
    };

    // Handle student selection
    const handleStudentToggle = (studentId) => {
      setFormData(prev => ({
        ...prev,
        assignedStudents: prev.assignedStudents.includes(studentId)
          ? prev.assignedStudents.filter(id => id !== studentId)
          : [...prev.assignedStudents, studentId]
      }));
    };

    // Handle select all students
    const handleSelectAllStudents = () => {
      if (formData.assignedStudents.length === students.length) {
        setFormData(prev => ({ ...prev, assignedStudents: [] }));
      } else {
        setFormData(prev => ({ ...prev, assignedStudents: students.map(s => s.id) }));
      }
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      console.log('Creating assignment:', formData);
      
      setIsSubmitting(true);
      setLastSubmissionSuccess(false);
      
      try {
        const token = getAuthToken();
        if (!token) {
          alert('Please log in to create assignments');
          return;
        }

        // Validate required fields
        if (!formData.title || !formData.maxPoints || !formData.dueDate || !formData.courseId) {
          alert('Please fill in all required fields (Title, Max Points, Due Date, Course)');
          return;
        }

        // Validate max points is a positive number
        if (isNaN(formData.maxPoints) || formData.maxPoints <= 0) {
          alert('Max Points must be a positive number');
          return;
        }

        // Validate due date is not in the past
        const dueDate = new Date(formData.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
        dueDate.setHours(0, 0, 0, 0);
        
        if (dueDate < today) {
          alert('⚠️ Due date cannot be in the past. Please select today or a future date.');
          return;
        }

        console.log('✅ Form validation passed, creating assignment...');

        // Create FormData object for file upload
        const submitData = new FormData();
        
        // Add all form fields
        submitData.append('title', formData.title);
        submitData.append('description', formData.description || '');
        submitData.append('instructions', formData.instructions || '');
        submitData.append('type', formData.type);
        submitData.append('max_points', formData.maxPoints.toString());
        submitData.append('due_date', formData.dueDate);
        submitData.append('course_id', formData.courseId);
        submitData.append('status', formData.visibility); // Use 'status' instead of 'visibility'
        submitData.append('assigned_students', JSON.stringify(formData.assignedStudents || []));
        
        if (formData.estimatedTime && !isNaN(formData.estimatedTime)) {
          submitData.append('estimated_time', formData.estimatedTime.toString());
        }
        
        // Add file if present
        if (formData.attachmentFile) {
          // Validate file size (e.g., max 10MB)
          if (formData.attachmentFile.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB');
            return;
          }
          submitData.append('attachment', formData.attachmentFile);
        }

        // Debug: Log what we're sending
        console.log('📤 Form data being sent:');
        for (let [key, value] of submitData.entries()) {
          console.log(`${key}:`, value);
        }

        console.log('🚀 Submitting assignment to API...');
        
        const response = await fetch(`${API_BASE_URL}/assignments/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: submitData
        });

        console.log('📥 API Response status:', response.status);
        console.log('📥 API Response headers:', Object.fromEntries(response.headers.entries()));

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Assignment created successfully:', result);
          
          setLastSubmissionSuccess(true);
          
          // Show success message
          const successMessage = formData.visibility === 'published' 
            ? 'Assignment created and published successfully!' 
            : 'Assignment saved as draft successfully!';
          
          alert(successMessage);
          
          // Refresh assignments list first
          await fetchAssignments();
          
          // Automatically close form and reset
          setShowCreateModal(false);
          resetForm();
        } else {
          // Improved error handling
          let errorData = {};
          let errorText = '';
          
          try {
            const responseText = await response.text();
            errorText = responseText;
            console.log('📥 Raw error response:', responseText);
            
            try {
              errorData = JSON.parse(responseText);
              console.log('📥 Parsed error data:', errorData);
            } catch (parseError) {
              console.log('Could not parse error response as JSON:', parseError);
            }
          } catch (textError) {
            console.error('Could not read response text:', textError);
            errorText = 'Unknown error occurred';
          }
          // More specific error messages
          let errorMessage = 'Failed to create assignment';
          if (response.status === 401) {
            errorMessage = 'Authentication failed. Please log in again.';
            // Clear potentially invalid token
            localStorage.removeItem('token');
            localStorage.removeItem('instructorToken');
            localStorage.removeItem('authToken');
          } else if (response.status === 403) {
            errorMessage = 'You do not have permission to create assignments.';
          } else if (response.status === 422) {
            errorMessage = `Validation error: ${errorData.detail || 'Please check your input data.'}`;
          } else if (response.status === 500) {
            // Internal server error - provide helpful message
            if (errorData.detail) {
              errorMessage = `Server error: ${errorData.detail}`;
            } else {
              errorMessage = 'Internal server error. Please try again or contact support if the problem persists.';
            }
          } else if (errorData.detail) {
            errorMessage = `Error: ${errorData.detail}`;
          } else if (errorText) {
            errorMessage = `Server error: ${errorText.substring(0, 200)}`;
          }
          
          alert(errorMessage);
        }
      } catch (error) {
        console.error('❌ Error creating assignment:', error);
        
        // Network error handling
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
          alert('Network error: Unable to connect to the server. Please check your internet connection and try again.');
        } else {
          alert(`Unexpected error: ${error.message}. Please try again or contact support if the problem persists.`);
        }
      } finally {
        setIsSubmitting(false);
      }
    };

    const resetForm = () => {
      setFormData({
        title: '',
        courseId: '',
        description: '',
        type: 'exercise',
        maxPoints: '',
        dueDate: getTodaysDate(), // Use today's date as default
        instructions: '',
        attachmentFile: null,
        assignedStudents: [],
        visibility: 'draft',
        estimatedTime: ''
      });
      setStudents([]);
    };

    // Optimize form handlers with useCallback to prevent recreation
    const handleTitleChange = useCallback((e) => {
      setFormData(prev => ({ ...prev, title: e.target.value }));
    }, []);

    const handleDescriptionChange = useCallback((e) => {
      setFormData(prev => ({ ...prev, description: e.target.value }));
    }, []);

    const handleInstructionsChange = useCallback((e) => {
      setFormData(prev => ({ ...prev, instructions: e.target.value }));
    }, []);

    return (
      <div className="fixed inset-0 flex justify-start items-start z-50 p-4 pt-8">
        <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-gray-200 mx-auto mt-8 transform transition-all duration-300 ease-out translate-y-0">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Create New Assignment</h2>
              <button 
                type="button"
                onClick={() => {
                  // Ask user if they want to discard changes
                  const hasFormData = formData.title || formData.description || formData.instructions || formData.attachmentFile;
                  if (hasFormData) {
                    const confirmClose = confirm('You have unsaved changes. Are you sure you want to close and lose your progress?');
                    if (!confirmClose) {
                      return;
                    }
                  }
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>
            
            {/* Success indicator */}
            {lastSubmissionSuccess && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center">
                  <div className="text-orange-500 mr-2">✅</div>
                  <p className="text-sm text-orange-700 font-medium">
                    Previous assignment created successfully! You can create another one below.
                  </p>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
                  <select
                    value={formData.courseId}
                    onChange={(e) => handleCourseChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={coursesLoading}
                  >
                    <option value="">
                      {coursesLoading ? 'Loading your courses...' : courses.length === 0 ? 'No courses available' : 'Select Course'}
                    </option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </select>
                  {coursesLoading && (
                    <p className="text-sm text-blue-600 mt-1 flex items-center">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                      Fetching your courses...
                    </p>
                  )}
                  {!coursesLoading && courses.length === 0 && (
                    <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm text-orange-700 font-medium">No courses found</p>
                      <p className="text-sm text-orange-600 mt-1">
                        You need to create a course first. 
                        <a href="/instructor/courses" className="underline hover:text-orange-800 ml-1" target="_blank" rel="noopener noreferrer">
                          Create one here
                        </a>
                      </p>
                    </div>
                  )}
                  {!coursesLoading && courses.length > 0 && (
                    <p className="text-sm text-orange-600 mt-1">
                      ✅ {courses.length} course{courses.length > 1 ? 's' : ''} available
                    </p>
                  )}
                </div>              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="exercise">Exercise</option>
                  <option value="project">Project</option>
                  <option value="quiz">Quiz</option>
                  <option value="essay">Essay</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Points</label>
                <input
                  type="number"
                  value={formData.maxPoints}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxPoints: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Time (hours)
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={formData.estimatedTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimatedTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 2.5"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
                <span className="text-xs text-gray-500 ml-1">(Default: Today)</span>
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                min={getTodaysDate()} // Prevent selecting past dates
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Due date cannot be in the past
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of the assignment..."
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
              <textarea
                value={formData.instructions}
                onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Detailed instructions for students..."
              />
            </div>

            {/* File Upload Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assignment File <span className="text-gray-500">(Optional)</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  id="assignment-file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,.docx,.zip"
                  className="hidden"
                />
                
                {/* Primary upload method using label */}
                <label 
                  htmlFor="assignment-file" 
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 text-xl">📎</span>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">
                      {formData.attachmentFile ? formData.attachmentFile.name : 'Click to upload file'}
                    </p>
                    <p className="text-xs text-gray-500">PDF, DOCX, or ZIP (Max 10MB)</p>
                  </div>
                </label>
                
                {/* Fallback button method */}
                <div className="mt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.click();
                      }
                    }}
                    className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    Browse Files
                  </button>
                </div>
                {formData.attachmentFile && (
                  <div className="mt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setFormData(prev => ({ ...prev, attachmentFile: null }));
                        // Reset file input
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="text-red-500 text-sm hover:text-red-700"
                    >
                      Remove file
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Assignment Visibility */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Assignment Visibility</label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="draft"
                    name="visibility"
                    value="draft"
                    checked={formData.visibility === 'draft'}
                    onChange={(e) => setFormData(prev => ({ ...prev, visibility: e.target.value }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="draft" className="ml-2 block text-sm text-gray-700">
                    <span className="font-medium">Draft</span> - Save as draft, not visible to students
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="published"
                    name="visibility"
                    value="published"
                    checked={formData.visibility === 'published'}
                    onChange={(e) => setFormData(prev => ({ ...prev, visibility: e.target.value }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="published" className="ml-2 block text-sm text-gray-700">
                    <span className="font-medium">Published</span> - Visible to assigned students immediately
                  </label>
                </div>
              </div>
            </div>

            {/* Assigned Students */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign to Students
                {studentsLoading && <span className="text-blue-600 text-sm ml-2">Loading...</span>}
              </label>
              
              {formData.courseId && !studentsLoading ? (
                <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto">
                  {students.length > 0 ? (
                    <>
                      {/* Select All Option */}
                      <div className="flex items-center pb-2 mb-2 border-b border-gray-200">
                        <input
                          type="checkbox"
                          id="select-all"
                          checked={formData.assignedStudents.length === students.length && students.length > 0}
                          onChange={handleSelectAllStudents}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="select-all" className="ml-2 block text-sm font-medium text-gray-700">
                          Select All ({students.length} students)
                        </label>
                      </div>
                      
                      {/* Individual Student Options */}
                      <div className="space-y-2">
                        {students.map((student) => (
                          <div key={student.id} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`student-${student.id}`}
                              checked={formData.assignedStudents.includes(student.id)}
                              onChange={() => handleStudentToggle(student.id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor={`student-${student.id}`} className="ml-2 block text-sm text-gray-700">
                              <div>
                                <div className="font-medium">{student.name}</div>
                                <div className="text-xs text-gray-500">{student.email}</div>
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                      
                      {formData.assignedStudents.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-gray-200">
                          <p className="text-sm text-blue-600">
                            Selected: {formData.assignedStudents.length} of {students.length} students
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-gray-500 text-sm">No students enrolled in this course yet</p>
                      <p className="text-gray-400 text-xs mt-1">Students must enroll in the course before they can be assigned assignments</p>
                    </div>
                  )}
                </div>
              ) : formData.courseId && studentsLoading ? (
                <div className="border border-gray-300 rounded-lg p-4 text-center">
                  <div className="animate-pulse text-gray-500">Loading students...</div>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <p className="text-gray-500 text-sm">Please select a course first to see available students</p>
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <button 
                type="submit"
                className="flex-1 bg-gradient-to-r from-[#988913] to-[#7d7310] hover:from-[#7d7310] hover:to-[#988913] text-white py-2 px-4 rounded-lg shadow hover:shadow-lg hover:shadow-[#988913]/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting || coursesLoading || courses.length === 0}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {formData.visibility === 'published' ? 'Publishing...' : 'Saving...'}
                  </div>
                ) : (
                  formData.visibility === 'published' ? 'Create & Publish Assignment' : 'Save as Draft'
                )}
              </button>
              <button 
                type="button"
                onClick={() => {
                  // Ask user if they want to discard changes
                  const hasFormData = formData.title || formData.description || formData.instructions || formData.attachmentFile;
                  if (hasFormData) {
                    const confirmClose = confirm('You have unsaved changes. Are you sure you want to cancel and lose your progress?');
                    if (!confirmClose) {
                      return;
                    }
                  }
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>

            </div>
          </form>
        </div>
      </div>
    );
  };

  const EditAssignmentModal = () => {
    if (!editingAssignment) return null;

    // Get today's date in YYYY-MM-DD format for the date input
    const getTodaysDate = () => {
      return new Date().toISOString().split('T')[0];
    };

    const [formData, setFormData] = useState({
      title: editingAssignment.title || '',
      courseId: editingAssignment.courseId || '',
      description: editingAssignment.description || '',
      type: editingAssignment.type || 'exercise',
      maxPoints: editingAssignment.maxPoints || '',
      dueDate: editingAssignment.dueDate || getTodaysDate(),
      instructions: editingAssignment.instructions || '',
      // New fields
      attachmentFile: null,
      assignedStudents: [],
      visibility: editingAssignment.status || 'draft',
      estimatedTime: editingAssignment.estimatedTime || ''
    });

    const [students, setStudents] = useState([]);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [updating, setUpdating] = useState(false);

    // Fetch students when course is selected
    const fetchStudents = async (courseId) => {
      if (!courseId) {
        setStudents([]);
        return;
      }
      
      setStudentsLoading(true);
      try {
        const token = getAuthToken();
        console.log(`🔍 Fetching enrolled students for course: ${courseId}`);
        
        // Use the existing instructor/students endpoint which returns only enrolled students
        const response = await fetch(`${API_BASE_URL}/instructor/students`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'omit'
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ All enrolled students data (Edit Modal):', data);
          console.log('🔍 Selected courseId for filtering (Edit):', courseId, 'Type:', typeof courseId);
          
          // Filter students by the selected course
          const enrolledStudents = Array.isArray(data) ? data : [];
          console.log('🔍 Total students received (Edit):', enrolledStudents.length);
          
          // More flexible filtering to handle different backend response formats
          const courseStudents = enrolledStudents.filter(student => {
            console.log('🔍 Checking student (Edit):', {
              name: student.name,
              student_course_id: student.course_id,
              courseId_param: courseId,
              enrolledCourses: student.enrolledCourses
            });
            
            // Check direct course_id match (handle both string and number)
            const directMatch = student.course_id === courseId || 
                              student.course_id === parseInt(courseId) ||
                              student.course_id?.toString() === courseId?.toString();
            
            // Check enrolledCourses array if it exists
            const enrolledMatch = student.enrolledCourses && 
                                student.enrolledCourses.some(course => 
                                  course.courseId === courseId || 
                                  course.courseId === parseInt(courseId) ||
                                  course.courseId?.toString() === courseId?.toString() ||
                                  course.id === courseId ||
                                  course.id === parseInt(courseId)
                                );
            
            console.log('🔍 Match results for', student.name, '(Edit) - Direct:', directMatch, 'Enrolled:', enrolledMatch);
            return directMatch || enrolledMatch;
          });
          
          console.log(`📚 Students enrolled in course ${courseId} (Edit):`, courseStudents);
          
          if (courseStudents.length > 0) {
            const transformedStudents = courseStudents.map(student => ({
              id: student.student_id || student.id || student._id,
              name: student.name,
              email: student.email
            }));
            setStudents(transformedStudents);
            console.log(`✅ Found ${transformedStudents.length} enrolled students for assignment (Edit):`, transformedStudents);
          } else {
            console.log('⚠️ No students found matching the selected course (Edit)');
            console.log('⚠️ Possible reasons:');
            console.log('1. No students enrolled in this course');
            console.log('2. Backend response format changed');
            console.log('3. Course ID mismatch');
            
            // As a fallback, if we have students but filtering failed, show all students
            if (enrolledStudents.length > 0) {
              console.log('🔄 Fallback (Edit): Showing all available students');
              const transformedStudents = enrolledStudents.map(student => ({
                id: student.student_id || student.id || student._id,
                name: `${student.name} (Course: ${student.course_id || 'Unknown'})`,
                email: student.email
              }));
              setStudents(transformedStudents);
              console.log('🔄 Fallback students (Edit):', transformedStudents);
            } else {
              setStudents([]);
            }
          }
        } else {
          console.error('❌ Failed to fetch students:', response.status, response.statusText);
          setStudents([]);
        }
      } catch (error) {
        console.error('❌ Error fetching students:', error);
        setStudents([]);
      } finally {
        setStudentsLoading(false);
      }
    };

    // Load students for the current course when modal opens
    useEffect(() => {
      if (editingAssignment && editingAssignment.courseId) {
        fetchStudents(editingAssignment.courseId);
      }
    }, [editingAssignment]);

    // Handle course selection change
    const handleCourseChange = (courseId) => {
      setFormData(prev => ({ ...prev, courseId, assignedStudents: [] }));
      fetchStudents(courseId);
    };

    // Handle file upload
    const handleFileUpload = (e) => {
      e.preventDefault(); // Prevent any default form behavior
      e.stopPropagation(); // Prevent event bubbling
      
      const file = e.target.files[0];
      if (file) {
        const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'];
        const allowedExtensions = ['.pdf', '.docx', '.zip'];
        
        const isValidType = allowedTypes.includes(file.type) || 
                           allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
        
        if (isValidType) {
          console.log('✅ Valid file selected:', file.name);
          setFormData(prev => {
            const newData = { ...prev, attachmentFile: file };
            console.log('📁 Updated form data with file:', newData);
            return newData;
          });
        } else {
          alert('Please select a PDF, DOCX, or ZIP file.');
          // Reset only the file input, not the entire form
          e.target.value = '';
        }
      }
    };

    // Handle student selection
    const handleStudentToggle = (studentId) => {
      setFormData(prev => ({
        ...prev,
        assignedStudents: prev.assignedStudents.includes(studentId)
          ? prev.assignedStudents.filter(id => id !== studentId)
          : [...prev.assignedStudents, studentId]
      }));
    };

    // Handle select all students
    const handleSelectAllStudents = () => {
      if (formData.assignedStudents.length === students.length) {
        setFormData(prev => ({ ...prev, assignedStudents: [] }));
      } else {
        setFormData(prev => ({ ...prev, assignedStudents: students.map(s => s.id) }));
      }
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      setUpdating(true);
      
      console.log('Updating assignment:', formData);
      
      try {
        const token = getAuthToken();
        if (!token) {
          alert('Please log in to update assignments');
          return;
        }

        // Validate required fields
        if (!formData.title || !formData.maxPoints || !formData.dueDate || !formData.courseId) {
          alert('Please fill in all required fields (Title, Max Points, Due Date, Course)');
          return;
        }

        // Validate max points is a positive number
        if (isNaN(formData.maxPoints) || formData.maxPoints <= 0) {
          alert('Max Points must be a positive number');
          return;
        }

        // Validate due date is not in the past
        const dueDate = new Date(formData.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
        dueDate.setHours(0, 0, 0, 0);
        
        if (dueDate < today) {
          alert('⚠️ Due date cannot be in the past. Please select today or a future date.');
          return;
        }

        // Prepare data for update
        let submitData, headers;
        
        if (formData.attachmentFile) {
          // Validate file before upload
          const maxSize = 10 * 1024 * 1024; // 10MB limit
          const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
          
          if (formData.attachmentFile.size > maxSize) {
            alert('File size must be less than 10MB');
            return;
          }
          
          if (!allowedTypes.includes(formData.attachmentFile.type)) {
            alert('Only PDF and Word documents are allowed');
            return;
          }
          
          console.log('📎 File validation passed:', {
            name: formData.attachmentFile.name,
            size: formData.attachmentFile.size,
            type: formData.attachmentFile.type
          });
          
          // Use FormData for file upload
          submitData = new FormData();
          
          submitData.append('title', formData.title);
          submitData.append('description', formData.description);
          submitData.append('instructions', formData.instructions);
          submitData.append('type', formData.type);
          submitData.append('max_points', formData.maxPoints.toString());
          submitData.append('due_date', formData.dueDate);
          submitData.append('course_id', formData.courseId);
          submitData.append('status', formData.visibility);
          submitData.append('assigned_students', JSON.stringify(formData.assignedStudents));
          
          if (formData.estimatedTime) {
            submitData.append('estimated_time', formData.estimatedTime.toString());
          }
          
          submitData.append('attachment', formData.attachmentFile);
          
          headers = {
            'Authorization': `Bearer ${token}`
            // Don't set Content-Type for FormData, let browser set it with boundary
          };

          // Debug: Log what we're sending
          console.log('📤 Form data being sent for update (with file):');
          for (let [key, value] of submitData.entries()) {
            console.log(`${key}:`, value);
          }
        } else {
          // Use JSON for updates without file
          const jsonData = {
            title: formData.title,
            description: formData.description,
            instructions: formData.instructions,
            type: formData.type,
            max_points: parseInt(formData.maxPoints),
            due_date: formData.dueDate,
            course_id: formData.courseId,
            status: formData.visibility,
            assigned_students: formData.assignedStudents
          };
          
          if (formData.estimatedTime) {
            jsonData.estimated_time = parseFloat(formData.estimatedTime);
          }
          
          submitData = JSON.stringify(jsonData);
          headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          };

          console.log('📤 JSON data being sent for update (no file):', jsonData);
        }

        console.log('🚀 Updating assignment via API...');
        console.log('🔗 API URL:', `${API_BASE_URL}/assignments/${editingAssignment.id}`);
        console.log('🔑 Headers:', headers);
        console.log('📦 Submit data type:', typeof submitData);
        
        // Enhanced fetch configuration for better CORS handling
        const fetchConfig = {
          method: 'PUT',
          headers: {
            ...headers,
            'Accept': 'application/json',
          },
          body: submitData,
          mode: 'cors',
          credentials: 'omit' // Avoid credential-related CORS issues
        };

        console.log('🛠️ Fetch config:', {
          ...fetchConfig,
          body: typeof submitData === 'string' ? 'JSON Data' : 'FormData'
        });
        
        const response = await fetch(`${API_BASE_URL}/assignments/${editingAssignment.id}`, fetchConfig);

        console.log('📥 API Response status:', response.status);

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Assignment updated successfully:', result);
          
          // Show success message
          const successMessage = formData.visibility === 'published' 
            ? 'Assignment updated and published successfully!' 
            : 'Assignment updated successfully!';
          alert(successMessage);
          
          // Close modal and refresh assignments
          setShowEditModal(false);
          setEditingAssignment(null);
          await fetchAssignments(); // Wait for refresh to complete
          
        } else {
          const errorText = await response.text();
          console.error('❌ Failed to update assignment:', response.status, errorText);
          
          let errorData = {};
          try {
            errorData = JSON.parse(errorText);
          } catch (e) {
            console.log('Could not parse error response as JSON');
          }
          
          // More specific error messages
          let errorMessage = 'Failed to update assignment';
          if (response.status === 0) {
            errorMessage = 'Network error - unable to connect to server. Please check your internet connection.';
          } else if (response.status === 401) {
            errorMessage = 'Authentication failed. Please log in again.';
          } else if (response.status === 403) {
            errorMessage = 'You do not have permission to update this assignment.';
          } else if (response.status === 404) {
            errorMessage = 'Assignment not found. It may have been deleted.';
          } else if (response.status === 422) {
            errorMessage = `Validation error: ${errorData.detail || 'Please check your input data.'}`;
          } else if (response.status === 500) {
            errorMessage = 'Server error occurred. Please try again later or contact support.';
            if (formData.attachmentFile) {
              errorMessage += ' This might be due to the file upload - try without the file first.';
            }
          } else if (errorData.detail) {
            errorMessage = `Error: ${errorData.detail}`;
          } else if (errorText) {
            errorMessage = `Server error: ${errorText.substring(0, 100)}`;
          }
          
          alert(errorMessage);
        }
      } catch (error) {
        console.error('❌ Error updating assignment:', error);
        
        let errorMessage = 'Network error. Please check your connection and try again.';
        
        // Check if it's a CORS error
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          errorMessage = 'CORS or network error occurred. This might be due to:\n' +
                        '1. Server not responding\n' +
                        '2. CORS policy blocking the request\n' +
                        '3. File upload issues\n\n' +
                        'Please try again or contact support if the problem persists.';
        }
        
        alert(errorMessage);
      } finally {
        setUpdating(false);
      }
    };

    const closeModal = () => {
      setShowEditModal(false);
      setEditingAssignment(null);
    };

    return (
      <div className="fixed inset-0 flex justify-start items-start z-50 p-4 pt-8">
        <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-gray-200 mx-auto mt-8 transform transition-all duration-300 ease-out translate-y-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Edit Assignment</h2>
            <button 
              onClick={closeModal}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
                <select
                  value={formData.courseId}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={coursesLoading}
                >
                  <option value="">
                    {coursesLoading ? 'Loading your courses...' : courses.length === 0 ? 'No courses available' : 'Select Course'}
                  </option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
                {coursesLoading && (
                  <p className="text-sm text-blue-600 mt-1 flex items-center">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                    Loading courses...
                  </p>
                )}
                {!coursesLoading && courses.length === 0 && (
                  <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-700 font-medium">No courses found</p>
                    <p className="text-sm text-orange-600 mt-1">
                      You need to create a course first. 
                      <a href="/instructor/courses" className="underline hover:text-orange-800 ml-1" target="_blank" rel="noopener noreferrer">
                        Create one here
                      </a>
                    </p>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="exercise">Exercise</option>
                  <option value="project">Project</option>
                  <option value="quiz">Quiz</option>
                  <option value="essay">Essay</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Points</label>
                <input
                  type="number"
                  value={formData.maxPoints}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxPoints: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Time (hours)
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={formData.estimatedTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimatedTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 2.5"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                min={getTodaysDate()} // Prevent selecting past dates
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Due date cannot be in the past
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of the assignment..."
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
              <textarea
                value={formData.instructions}
                onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Detailed instructions for students..."
              />
            </div>

            {/* File Upload Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assignment File <span className="text-gray-500">(Optional - Upload new to replace existing)</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  id="edit-assignment-file"
                  key={formData.attachmentFile?.name || editingAssignment?.attachmentUrl || 'edit-file-input'}
                  onChange={handleFileUpload}
                  onClick={(e) => e.stopPropagation()}
                  accept=".pdf,.docx,.zip"
                  className="hidden"
                />
                <label 
                  htmlFor="edit-assignment-file" 
                  className="cursor-pointer flex flex-col items-center space-y-2"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    document.getElementById('edit-assignment-file').click();
                  }}
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 text-xl">📎</span>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">
                      {formData.attachmentFile ? formData.attachmentFile.name : 
                       editingAssignment.attachmentUrl ? 'Click to replace existing file' : 'Click to upload file'}
                    </p>
                    <p className="text-xs text-gray-500">PDF, DOCX, or ZIP (Max 10MB)</p>
                    {editingAssignment.attachmentUrl && !formData.attachmentFile && (
                      <p className="text-xs text-orange-600 mt-1">Current: Existing attachment available</p>
                    )}
                  </div>
                </label>
                {formData.attachmentFile && (
                  <div className="mt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, attachmentFile: null }))}
                      className="text-red-500 text-sm hover:text-red-700"
                    >
                      Remove new file
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Assignment Visibility */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Assignment Visibility</label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="edit-draft"
                    name="edit-visibility"
                    value="draft"
                    checked={formData.visibility === 'draft'}
                    onChange={(e) => setFormData(prev => ({ ...prev, visibility: e.target.value }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="edit-draft" className="ml-2 block text-sm text-gray-700">
                    <span className="font-medium">Draft</span> - Save as draft, not visible to students
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="edit-published"
                    name="edit-visibility"
                    value="published"
                    checked={formData.visibility === 'published'}
                    onChange={(e) => setFormData(prev => ({ ...prev, visibility: e.target.value }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="edit-published" className="ml-2 block text-sm text-gray-700">
                    <span className="font-medium">Published</span> - Visible to assigned students
                  </label>
                </div>
              </div>
            </div>

            {/* Assigned Students */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign to Students
                {studentsLoading && <span className="text-blue-600 text-sm ml-2">Loading...</span>}
              </label>
              
              {formData.courseId && !studentsLoading ? (
                <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto">
                  {students.length > 0 ? (
                    <>
                      {/* Select All Option */}
                      <div className="flex items-center pb-2 mb-2 border-b border-gray-200">
                        <input
                          type="checkbox"
                          id="edit-select-all"
                          checked={formData.assignedStudents.length === students.length && students.length > 0}
                          onChange={handleSelectAllStudents}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="edit-select-all" className="ml-2 block text-sm font-medium text-gray-700">
                          Select All ({students.length} students)
                        </label>
                      </div>
                      
                      {/* Individual Student Options */}
                      <div className="space-y-2">
                        {students.map((student) => (
                          <div key={student.id} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`edit-student-${student.id}`}
                              checked={formData.assignedStudents.includes(student.id)}
                              onChange={() => handleStudentToggle(student.id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor={`edit-student-${student.id}`} className="ml-2 block text-sm text-gray-700">
                              <div>
                                <div className="font-medium">{student.name}</div>
                                <div className="text-xs text-gray-500">{student.email}</div>
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                      
                      {formData.assignedStudents.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-gray-200">
                          <p className="text-sm text-blue-600">
                            Selected: {formData.assignedStudents.length} of {students.length} students
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-gray-500 text-sm">No students enrolled in this course yet</p>
                      <p className="text-gray-400 text-xs mt-1">Students must enroll in the course before they can be assigned assignments</p>
                    </div>
                  )}
                </div>
              ) : formData.courseId && studentsLoading ? (
                <div className="border border-gray-300 rounded-lg p-4 text-center">
                  <div className="animate-pulse text-gray-500">Loading students...</div>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <p className="text-gray-500 text-sm">Please select a course first to see available students</p>
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <button 
                type="submit"
                className="flex-1 bg-gradient-to-r from-[#988913] to-[#7d7310] hover:from-[#7d7310] hover:to-[#988913] text-white py-2 px-4 rounded-lg shadow hover:shadow-lg hover:shadow-[#988913]/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={updating || coursesLoading || courses.length === 0}
              >
                {updating ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </div>
                ) : formData.visibility === 'published' ? 'Update & Publish Assignment' : 'Update Assignment'}
              </button>
              <button 
                type="button"
                onClick={closeModal}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                disabled={updating}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assignment Management</h1>
          <p className="text-gray-600">Create and manage assignments for your courses</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400"
              disabled={coursesLoading || courses.length === 0}
              title={
                coursesLoading 
                  ? "Loading courses..." 
                  : courses.length === 0 
                    ? "Create courses first to add assignments" 
                    : "Create new assignment"
              }
            >
              <span>+</span>
              <span>Create Assignment</span>
            </button>
            
            {/* Helper tooltip for disabled state */}
            {!coursesLoading && courses.length === 0 && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                !
              </div>
            )}
          </div>
          
          {coursesLoading && (
            <div className="flex items-center text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
              Loading courses...
            </div>
          )}
          
          {!coursesLoading && courses.length === 0 && (
            <div className="flex items-center text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-lg border border-orange-200">
              <span className="mr-2">⚠️</span>
              <span>Create courses first</span>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search assignments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex gap-4">
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={coursesLoading}
            >
              <option value="all">
                {coursesLoading ? 'Loading courses...' : courses.length === 0 ? 'No courses available' : 'All Courses'}
              </option>
              {courses.map(course => (
                <option key={course.id} value={course.id.toString()}>
                  {course.name}
                </option>
              ))}
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
        
        {/* Course loading indicator */}
        {coursesLoading && (
          <div className="mt-3 flex items-center text-sm text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Fetching your courses...
          </div>
        )}
        
        {/* No courses warning */}
        {!coursesLoading && courses.length === 0 && (
          <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <span className="text-blue-600 text-lg">🎓</span>
              <div>
                <p className="text-sm font-medium text-blue-800">No courses found</p>
                <p className="text-sm text-blue-700 mt-1">
                  You need to create courses first before creating assignments. 
                  <a href="/instructor/courses" className="underline hover:text-blue-900 ml-1">
                    Create a course here
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Course info */}
        {!coursesLoading && courses.length > 0 && (
          <div className="mt-3 flex items-center space-x-2 text-sm text-gray-600">
            <span className="text-orange-600">✅</span>
            <span>Showing {courses.length} course{courses.length > 1 ? 's' : ''} you created</span>
          </div>
        )}
      </div>

      {/* Assignment Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Assignments</p>
              <p className="text-2xl font-bold text-gray-900">{assignments.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <span className="text-xl text-blue-600">📋</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Submissions</p>
              <p className="text-2xl font-bold text-gray-900">
                {assignments.reduce((sum, assignment) => sum + assignment.submissions, 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <span className="text-xl text-orange-600">📤</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Grading</p>
              <p className="text-2xl font-bold text-gray-900">
                {assignments.reduce((sum, assignment) => sum + (assignment.submissions - assignment.graded), 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <span className="text-xl text-yellow-600">⏳</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Avg Score</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(assignments.reduce((sum, assignment) => sum + assignment.avgScore, 0) / assignments.length || 0)}%
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <span className="text-xl text-purple-600">📊</span>
            </div>
          </div>
        </div>
      </div>

      {/* Assignments List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading assignments...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredAssignments.length > 0 ? (
            filteredAssignments.map(assignment => (
              <AssignmentCard key={assignment.id} assignment={assignment} />
            ))
          ) : (
            <div className="col-span-full text-center py-12 bg-white rounded-xl border border-gray-200">
              <div className="max-w-md mx-auto">
                <span className="text-6xl mb-4 block">📝</span>
                <p className="text-gray-500 text-lg font-medium mb-2">No assignments found</p>
                {courses.length === 0 ? (
                  <div className="space-y-4">
                    <p className="text-gray-400">You need to create courses first before creating assignments</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <a
                        href="/instructor/courses"
                        className="inline-block px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
                      >
                        📚 Create Your First Course
                      </a>
                    </div>
                  </div>
                ) : searchTerm || filterCourse !== 'all' || filterStatus !== 'all' ? (
                  <div className="space-y-4">
                    <p className="text-gray-400">No assignments match your current filters</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setFilterCourse('all');
                          setFilterStatus('all');
                        }}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        Clear Filters
                      </button>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        ➕ Create Assignment
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-gray-400">Create your first assignment to get started</p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-lg"
                    >
                      ➕ Create Your First Assignment
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Assignment Modal */}
      {showCreateModal && <CreateAssignmentModal key="create-modal" />}

      {/* Edit Assignment Modal */}
      {showEditModal && <EditAssignmentModal key="edit-modal" />}
    </div>
  );
};

const InstructorAssignmentsComponent = React.memo(InstructorAssignments);
export default InstructorAssignmentsComponent;
