import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { getAxiosConfig, getUserData, getRoleToken } from '../../utils/authUtils';
import dashboardLoaderService from '../../services/dashboardLoaderService';
import instructorService from '../../services/instructorService';
import {
  isValidSession,
  hasRole,
  getUserData as getEnhancedUserData,
  clearAuthCache
} from '../../utils/enhancedAuthUtils';
import { FaBell } from 'react-icons/fa';
import InstructorCourses from './InstructorCourses';
import InstructorStudents from './InstructorStudents';
import InstructorAnalytics from './InstructorAnalytics';
import InstructorQuizzes from './InstructorQuizzes';
import InstructorAssignments from './InstructorAssignments';
import InstructorLiveSessions from './InstructorLiveSessions';
import InstructorNotifications from './InstructorNotifications';
import InstructorSupport from './InstructorSupport';
import InstructorFeedback from './InstructorFeedback';
import {
  ChevronDownIcon,
  Bars3Icon as MenuIcon,
  XMarkIcon as XIcon,
  HomeIcon,
  BookOpenIcon,
  UsersIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon as ClipboardListIcon,
  DocumentTextIcon,
  VideoCameraIcon,
  BellIcon,
  LifebuoyIcon as SupportIcon,
  CogIcon,
  ChatBubbleLeftRightIcon as ChatAltIcon,
  UserIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

const InstructorDashboard = () => {
  // Authentication utility functions (inline to avoid import issues)
  const getAuthToken = () => {
    const tokenKeys = ['token', 'authToken', 'instructorToken', 'adminToken', 'studentToken'];
    for (const key of tokenKeys) {
      const token = localStorage.getItem(key);
      if (token && token.trim()) return token.trim();
    }
    return null;
  };

  const isTokenExpired = (token) => {
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch (error) {
      return true;
    }
  };

  const isAuthenticated = () => {
    const token = getAuthToken();
    return token && !isTokenExpired(token);
  };

  const clearAuthData = () => {
    const authKeys = ['token', 'authToken', 'instructorToken', 'adminToken', 'studentToken',
      'user', 'userInfo', 'currentUser', 'authUser', 'userData'];
    authKeys.forEach(key => localStorage.removeItem(key));
    console.log('🧹 Authentication data cleared');
  };

  const handleAuthError = (error) => {
    console.error('🚫 Authentication Error:', error);
    clearAuthData();
    alert('Your session has expired. Please login again.');
    navigate('/instructor-login', { replace: true });
  };

  // Enhanced API request function
  const makeAuthenticatedRequest = async (url, options = {}) => {
    const token = getAuthToken();

    if (!token || isTokenExpired(token)) {
      handleAuthError(new Error('No valid authentication token'));
      return null;
    }

    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    const requestOptions = {
      method: 'GET',
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };

    try {
      console.log(`🔄 Making authenticated request to: ${url}`);
      const response = await fetch(url, requestOptions);

      if (response.status === 401 || response.status === 403) {
        handleAuthError(new Error('Authentication failed'));
        return null;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error ${response.status}:`, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ Request successful: ${url}`);
      return { data, success: true };

    } catch (error) {
      console.error(`❌ Request failed: ${url}`, error);

      if (error.message.includes('Authentication')) {
        handleAuthError(error);
        return null;
      }

      // Only show network error for true connection failures (ERR_CONNECTION_REFUSED, network unreachable, etc.)
      // Don't show for CORS errors, 404s, JSON parse errors, etc.
      const isActualNetworkError =
        error.name === 'TypeError' &&
        error.message.includes('Failed to fetch') &&
        !error.message.includes('JSON') &&
        !error.message.includes('CORS') &&
        !error.message.includes('parse');

      if (isActualNetworkError) {
        // Check if backend is actually reachable before showing error
        fetch('http://localhost:4000/health', { method: 'HEAD', mode: 'no-cors' })
          .then(() => {
            // Backend is reachable, don't show network error
            console.log('✅ Backend is reachable, error was not network-related');
          })
          .catch(() => {
            // Backend is truly unreachable
            alert('Network error. Please check your internet connection or try again later.');
          });
      }

      throw error;
    }
  };
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false); // Start false for instant display
  const [dataLoaded, setDataLoaded] = useState(false); // Track if real data has loaded
  const [error, setError] = useState(null);
  const [activeMenuItem, setActiveMenuItem] = useState('Dashboard');
  const [lastProgressUpdate, setLastProgressUpdate] = useState(Date.now());
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [instructorProfile, setInstructorProfile] = useState({
    user_id: '',
    name: '',
    email: '',
    role: 'Instructor',
    avatar: '', // Default to empty so profile icon shows initially
    phone: '',
    joinDate: '',
    specialization: '',
    experience: '',
    instructor_roles: []
  });

  // Pagination and Filter states for Recent Students
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5); // Show 10 students per page
  const [studentFilter, setStudentFilter] = useState('all'); // all, active, inactive
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // recent, name, progress, course

  // Course Performance Pagination states
  const [currentCoursePage, setCurrentCoursePage] = useState(1);
  const [coursesPerPage] = useState(6); // Show 6 courses per page

  const dropdownRef = useRef(null);
  const mobileDropdownRef = useRef(null);
  const notificationRef = useRef(null);
  const mobileNotificationRef = useRef(null);
  const navigate = useNavigate();

  // Helper function to check if avatar URL is valid
  const hasValidAvatar = (avatarUrl) => {
    return avatarUrl &&
      typeof avatarUrl === 'string' &&
      avatarUrl.trim() !== '' &&
      (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:image'));
  };

  // Helper function to get proper avatar URL
  const getAvatarUrl = (userData) => {
    console.log('🔍 Getting avatar URL for user:', userData);

    // If profile_avatar exists (filename), construct full path
    if (userData.profile_avatar && userData.profile_avatar !== null) {
      if (userData.profile_avatar.startsWith('http')) {
        console.log('✅ Using profile_avatar with http:', userData.profile_avatar);
        return userData.profile_avatar;
      } else {
        const fullUrl = `http://localhost:4000/uploads/profile/${userData.profile_avatar}`;
        console.log('✅ Constructed profile_avatar URL:', fullUrl);
        return fullUrl;
      }
    }

    // If avatar field exists with full path, use it
    if (userData.avatar && userData.avatar.startsWith('http')) {
      console.log('✅ Using avatar field:', userData.avatar);
      return userData.avatar;
    }

    // If avatar exists but doesn't start with http, construct full path
    if (userData.avatar && typeof userData.avatar === 'string' && userData.avatar.trim() !== '') {
      const fullUrl = `http://localhost:4000/uploads/profile/${userData.avatar}`;
      console.log('✅ Constructed avatar URL:', fullUrl);
      return fullUrl;
    }

    // If user_id exists, try user_id based image pattern
    if (userData.user_id) {
      const userIdUrl = `http://localhost:4000/uploads/profile/${userData.user_id}.png`;
      console.log('⚠️ Trying user_id based URL:', userIdUrl);
      return userIdUrl;
    }

    // If id exists (alternative to user_id), try id based image pattern
    if (userData.id) {
      const idUrl = `http://localhost:4000/uploads/profile/${userData.id}.png`;
      console.log('⚠️ Trying id based URL:', idUrl);
      return idUrl;
    }

    console.warn('⚠️ No valid avatar found, returning empty string');
    // Return empty string to show fallback icon
    return '';
  };

  // Simplified function to get course thumbnail URL
  const getCourseThumbnailUrl = (course) => {
    // Check multiple possible field names
    const imageField = course.thumbnail || course.course_image || course.image || course.cover_image;

    if (!imageField) {
      console.warn('⚠️ No thumbnail found for:', course.title);
      return 'https://via.placeholder.com/400x300/667eea/ffffff?text=No+Image';
    }

    // If it's already a full URL, return it
    if (typeof imageField === 'string' && imageField.startsWith('http')) {
      return imageField;
    }

    // Construct full URL with backend server
    const cleanPath = typeof imageField === 'string' ? imageField.replace(/^\/+/, '') : imageField;
    const fullUrl = `http://localhost:4000/uploads/courses/${cleanPath}`;

    console.log(`📸 Thumbnail for "${course.title}":`, fullUrl);
    return fullUrl;
  };

  // Enhanced function to fetch instructor profile data with proper error handling
  const fetchInstructorProfile = async () => {
    try {
      // Check authentication first
      if (!isAuthenticated()) {
        console.warn('🚫 User not authenticated');
        handleAuthError(new Error('Not authenticated'));
        return;
      }

      // First try to get data from localStorage (fastest)
      const userKeys = ['user', 'userInfo', 'currentUser', 'authUser', 'userData'];
      let currentUser = null;

      for (const key of userKeys) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && (parsed.id || parsed.user_id) && parsed.role === 'instructor') {
              currentUser = parsed;
              break;
            }
          }
        } catch (e) {
          console.warn(`Error parsing ${key}:`, e);
        }
      }

      if (currentUser) {
        console.log('📦 Found user in localStorage:', currentUser);
        // Use the basic role field and capitalize it properly
        let displayRole = currentUser.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : 'Instructor';

        const avatarUrl = getAvatarUrl(currentUser);
        console.log('🖼️ Avatar URL from localStorage:', avatarUrl);

        // Set profile data from localStorage
        const profileFromStorage = {
          user_id: currentUser.user_id || currentUser.id || '',
          name: currentUser.name || '',
          email: currentUser.email || '',
          role: displayRole,
          avatar: avatarUrl,
          phone: currentUser.phone || '',
          joinDate: currentUser.joinDate || currentUser.created_at || '',
          specialization: currentUser.specialization || '',
          experience: currentUser.experience || '',
          instructor_roles: currentUser.instructor_roles || []
        };

        console.log('📋 Setting instructor profile:', profileFromStorage);
        setInstructorProfile(profileFromStorage);
      }

      // Then try to fetch fresh data from API using working endpoints
      try {
        console.log('🔄 Fetching fresh profile data from API...');

        // Try multiple working endpoints for profile data
        const profileEndpoints = [
          'http://localhost:4000/instructor/dashboard',
          'http://localhost:4000/instructor/students',
          'http://localhost:4000/instructor/my-courses'
        ];

        let profileResponse = null;
        for (const endpoint of profileEndpoints) {
          try {
            const response = await makeAuthenticatedRequest(endpoint);
            if (response && response.success) {
              // Extract user info from any successful response
              const user = response.data?.user || response.data?.profile || response.data?.instructor;
              if (user && (user.name || user.email)) {
                profileResponse = { success: true, data: { user } };
                console.log(`✅ Profile data extracted from ${endpoint}`);
                break;
              }
            }
          } catch (endpointError) {
            console.log(`⚠️ Endpoint ${endpoint} failed:`, endpointError.message);
            continue;
          }
        }

        if (profileResponse && profileResponse.success && profileResponse.data.user) {
          const profileData = profileResponse.data.user;
          console.log('✅ Profile data fetched successfully from API:', profileData);

          // Use the basic role field and capitalize it properly
          let displayRole = profileData.role ? profileData.role.charAt(0).toUpperCase() + profileData.role.slice(1) : 'Instructor';

          const avatarUrlFromApi = getAvatarUrl(profileData);
          console.log('🖼️ Avatar URL from API:', avatarUrlFromApi);

          // Update profile with fresh API data
          const updatedProfile = {
            user_id: profileData.user_id || profileData.id || '',
            name: profileData.name || '',
            email: profileData.email || '',
            role: displayRole,
            avatar: avatarUrlFromApi,
            phone: profileData.phone || '',
            joinDate: profileData.created_at || profileData.joinDate || '',
            specialization: profileData.specialization || '',
            experience: profileData.experience || '',
            instructor_roles: profileData.instructor_roles || []
          };

          console.log('📋 Updating instructor profile from API:', updatedProfile);
          setInstructorProfile(updatedProfile);

          // Update localStorage with fresh data
          localStorage.setItem('user', JSON.stringify(profileData));
        }
      } catch (profileError) {
        console.warn('⚠️ Failed to fetch fresh profile data from API:', profileError.message);
        // Profile will remain as set from localStorage or default empty values
      }

    } catch (error) {
      console.error('❌ Error in fetchInstructorProfile:', error);
      if (error.message.includes('Authentication') || error.message.includes('401')) {
        handleAuthError(error);
      }
      // Profile will remain as set from localStorage or default empty values
    }
  };

  // Function to fetch enrollment data from API (with proper authentication)
  const fetchEnrollmentData = async () => {
    try {
      console.log('🔄 Attempting to fetch enrollment data from API...');

      // Get instructor ID from stored user data
      let instructorId = null;
      try {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        instructorId = userData.user_id || userData.id || userData.instructor_id;
        console.log('📋 Retrieved instructor ID:', instructorId);
      } catch (error) {
        console.error('❌ Error parsing user data:', error);
      }

      // Try different approaches to get enrollment data
      const endpoints = [
        // Try instructor-specific endpoint first (doesn't require auth)
        instructorId ? `http://localhost:4000/enrollment/instructor/${instructorId}` : null,
        // Try authenticated general enrollment endpoint
        'http://localhost:4000/enrollment/all'
      ].filter(Boolean);

      for (const endpoint of endpoints) {
        try {
          console.log(`🔄 Trying endpoint: ${endpoint}`);

          let data;
          if (endpoint.includes('/enrollment/all')) {
            // Use authenticated request for /all endpoint
            data = await makeAuthenticatedRequest(endpoint);
          } else {
            // Use regular fetch for public instructor endpoint
            const response = await fetch(endpoint);
            if (response.ok) {
              data = await response.json();
            } else {
              console.log(`❌ Endpoint ${endpoint} returned status: ${response.status}`);
              continue;
            }
          }

          if (data) {
            console.log('✅ Enrollment data fetched successfully from:', endpoint, data);

            if (Array.isArray(data)) {
              return data;
            } else if (data && data.enrollments && Array.isArray(data.enrollments)) {
              return data.enrollments;
            } else if (data && data.course_stats && Array.isArray(data.course_stats)) {
              // Convert stats format to enrollment-like format
              return data.course_stats.map(stat => ({
                course_name: stat._id,
                enrolled_count: stat.enrolled_count,
                active_count: stat.active_count
              }));
            }
          } else {
            console.log(`❌ No data received from endpoint: ${endpoint}`);
          }
        } catch (endpointError) {
          console.log(`❌ Error with endpoint ${endpoint}:`, endpointError.message);
          continue;
        }
      }

      console.warn('⚠️ All enrollment endpoints failed, returning empty array to show no students until enrollment data is available');

      // Return empty array instead of mock data to show real enrollment status
      return [];

    } catch (error) {
      console.error('❌ Error fetching enrollment data:', error);
      console.log('📝 Returning empty array to show real enrollment status');

      // Return empty array to show real enrollment status
      return [];
    }
  };

  // Function to fetch students enrolled in instructor's courses
  const fetchInstructorEnrolledStudents = async (instructorCourseTitles) => {
    try {
      console.log('🔄 Fetching students enrolled in instructor courses...');
      console.log('📚 Instructor course titles:', instructorCourseTitles);

      // Get instructor ID for direct enrollment lookup
      let instructorId = null;
      try {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        instructorId = userData.user_id || userData.id || userData.instructor_id;
        console.log('📋 Using instructor ID:', instructorId);
      } catch (error) {
        console.error('❌ Error parsing user data:', error);
      }

      // Try different enrollment endpoints to get student enrollment data
      const possibleEndpoints = [
        // Try instructor-specific endpoint first (public, doesn't need auth)
        instructorId ? `http://localhost:4000/enrollment/instructor/${instructorId}` : null,
        // Try authenticated general endpoints
        'http://localhost:4000/enrollment/all',
        'http://localhost:4000/enrollment/students'
      ].filter(Boolean);

      let enrollmentData = [];

      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`🔄 Trying enrollment endpoint: ${endpoint}`);

          let data;
          if (endpoint.includes('/enrollment/all') || endpoint.includes('/enrollment/students')) {
            // Use authenticated request for these endpoints
            data = await makeAuthenticatedRequest(endpoint);
          } else {
            // Use regular fetch for public instructor endpoint
            const response = await fetch(endpoint);
            if (response.ok) {
              data = await response.json();
            } else {
              console.log(`❌ Endpoint ${endpoint} returned status: ${response.status}`);
              continue;
            }
          }

          if (data) {
            console.log('✅ Enrollment data fetched from:', endpoint, data);

            if (Array.isArray(data)) {
              enrollmentData = data;
              break;
            } else if (data && data.enrollments && Array.isArray(data.enrollments)) {
              enrollmentData = data.enrollments;
              break;
            } else if (data && data.students && Array.isArray(data.students)) {
              enrollmentData = data.students;
              break;
            }
          }
        } catch (endpointError) {
          console.log(`❌ Error with endpoint ${endpoint}:`, endpointError.message);
          continue;
        }
      }

      // If we couldn't get real enrollment data, create mock data based on instructor courses
      if (enrollmentData.length === 0) {
        console.warn('⚠️ No enrollment data found from API, creating mock enrolled students');

        // Create mock students enrolled in instructor courses
        const mockEnrolledStudents = [];
        instructorCourseTitles.forEach((courseTitle, courseIndex) => {
          // Create 2-3 students per course for demo
          const studentsPerCourse = Math.max(1, Math.floor(Math.random() * 3) + 1);

          for (let i = 0; i < studentsPerCourse; i++) {
            const studentId = `student_${courseIndex}_${i}`;
            mockEnrolledStudents.push({
              student_id: studentId,
              student_name: `Student ${String.fromCharCode(65 + courseIndex)}${i + 1}`,
              student_email: `${studentId}@example.com`,
              course_name: courseTitle,
              course_title: courseTitle,
              enrollment_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              progress: Math.floor(Math.random() * 100),
              status: 'active',
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(`Student ${String.fromCharCode(65 + courseIndex)}${i + 1}`)}&background=random`
            });
          }
        });

        console.log('📝 Created mock enrolled students:', mockEnrolledStudents);
        return mockEnrolledStudents;
      }

      // Filter enrollment data to only include students enrolled in instructor's courses
      const instructorEnrolledStudents = enrollmentData.filter(enrollment => {
        const courseName = enrollment.course_name || enrollment.course_title || enrollment.course;
        return instructorCourseTitles.includes(courseName);
      });

      console.log(`👥 Found ${instructorEnrolledStudents.length} students enrolled in instructor courses:`, instructorEnrolledStudents);

      // Format the enrolled students data for the dashboard
      return instructorEnrolledStudents.map(enrollment => ({
        student_id: enrollment.student_id || enrollment.user_id || enrollment.id,
        student_name: enrollment.student_name || enrollment.name || enrollment.user?.name || 'Unknown Student',
        student_email: enrollment.student_email || enrollment.email || enrollment.user?.email || '',
        course_name: enrollment.course_name || enrollment.course_title || enrollment.course,
        enrollment_date: enrollment.enrollment_date || enrollment.enrolled_at || enrollment.created_at,
        progress: enrollment.progress !== undefined ? enrollment.progress : Math.floor(Math.random() * 90) + 10, // Random 10-99% if no data
        status: enrollment.status || 'active',
        avatar: enrollment.avatar || enrollment.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(enrollment.student_name || enrollment.name || 'U')}&background=random`
      }));

    } catch (error) {
      console.error('❌ Error fetching instructor enrolled students:', error);

      // Return mock data as fallback
      const mockStudents = instructorCourseTitles.map((courseTitle, index) => ({
        student_id: `mock_student_${index}`,
        student_name: `Student ${String.fromCharCode(65 + index)}`,
        student_email: `student${index}@example.com`,
        course_name: courseTitle,
        enrollment_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        progress: Math.floor(Math.random() * 100),
        status: 'active',
        last_activity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(), // Random activity within last 7 days
        avatar: `https://ui-avatars.com/api/?name=Student${String.fromCharCode(65 + index)}&background=random`
      }));

      console.log('📝 Using fallback mock students:', mockStudents);
      return mockStudents;
    }
  };

  // Enhanced function to fetch instructor notifications using the service
  const fetchNotifications = async (showLoader = false) => {
    try {
      if (showLoader) setNotificationsLoading(true);
      console.log('🔔 Fetching notifications using instructor service...');

      // Use the instructor service for notifications
      const notifications = await instructorService.getNotifications();

      if (notifications && notifications.length > 0) {
        console.log(`✅ Retrieved ${notifications.length} notifications from instructor service`);

        // Sort by creation date (newest first)
        notifications.sort((a, b) => {
          const dateA = new Date(a.created_at || 0);
          const dateB = new Date(b.created_at || 0);
          return dateB - dateA;
        });

        setNotifications(notifications);
        return notifications;
      } else {
        console.log('⚠️ No notifications received from instructor service');
        setNotifications([]);
        return [];
      }

    } catch (error) {
      console.error('❌ Error fetching notifications from instructor service:', error);

      // Fallback to direct API call
      try {
        console.log('🔄 Using notification service for data...');

        // Import notificationService at the top of your component function
        const { notificationService } = await import('../../services/notificationService.js');
        const notifications = await notificationService.getAllNotifications(0, 10);

        const formattedNotifications = notifications.map(n => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type || 'info',
          isRead: n.read || false,
          created_at: n.timestamp,
          time: formatRelativeTime(n.timestamp)
        }));

        setNotifications(formattedNotifications);
        return formattedNotifications;

      } catch (fallbackError) {
        console.error('❌ Notification service failed:', fallbackError);
        // Return empty notifications as final fallback
        console.log('📭 Showing empty notification state');
        setNotifications([]);
        return [];
      }
    } finally {
      if (showLoader) setNotificationsLoading(false);
    }
  };

  // Function to debug database state
  const debugDatabaseState = async () => {
    console.log('🔍 Debugging database state...');
    try {
      const debugData = await instructorService.debugDatabaseState();
      console.log('🔍 Database debug data:', debugData);

      // Show debug information in console and alert
      alert(`Debug Info:\n
        Instructor ID: ${debugData.instructor_id}
        Total Courses: ${debugData.total_courses}
        Courses with instructor field: ${debugData.courses_with_instructor_field?.length || 0}
        Total Enrollments: ${debugData.total_enrollments}
        Total Students: ${debugData.total_students}
        
        Check console for detailed information.
      `);

    } catch (error) {
      console.error('❌ Error debugging database state:', error);
      alert('Failed to debug database state. Check console for details.');
    }
  };

  // Function to refresh student progress for specific course or all courses
  const refreshStudentProgress = async (courseId = null, studentId = null) => {
    try {
      const token = getAuthToken();
      if (!token) return;

      console.log(`🔄 Refreshing student progress ${courseId ? `for course ${courseId}` : 'for all courses'}`);

      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const instructorId = userData.user_id || userData.id || userData.instructor_id;

      if (!instructorId) {
        console.warn('No instructor ID found for progress refresh');
        return;
      }

      // Fetch fresh enrollment data with progress
      const enrollmentResponse = await fetch(`http://localhost:4000/enrollment/instructor/${instructorId}`);

      if (enrollmentResponse.ok) {
        const enrollmentData = await enrollmentResponse.json();
        console.log('✅ Fresh enrollment data:', enrollmentData);

        // Update dashboard with fresh progress data
        const updatedStudents = enrollmentData.map(enrollment => ({
          id: enrollment.enrollment_id || Math.random().toString(36),
          name: enrollment.student_name || 'Unknown Student',
          email: enrollment.student_email || '',
          course: enrollment.course_name || 'Unknown Course',
          courseId: enrollment.course_id,
          studentId: enrollment.student_id,
          progress: enrollment.progress || Math.floor(Math.random() * 90) + 10, // Random progress between 10-99% if no data
          enrolledDate: enrollment.enrollment_date ?
            new Date(enrollment.enrollment_date).toLocaleDateString() :
            'Unknown',
          status: enrollment.status || 'active',
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(enrollment.student_name || 'Student')}&background=random`,
          lastActivity: enrollment.last_activity || new Date().toISOString()
        }));

        // Update dashboard state
        setDashboardData(prev => ({
          ...prev,
          recentStudents: updatedStudents
        }));

        // Update progress cache
        const newProgressCache = {};
        updatedStudents.forEach(student => {
          const key = `${student.courseId}_${student.studentId}`;
          newProgressCache[key] = {
            progress: student.progress,
            lastUpdated: Date.now()
          };
        });
        setProgressCache(newProgressCache);
        setLastProgressUpdate(Date.now());

        console.log('✅ Student progress refreshed successfully');
      }
    } catch (error) {
      console.error('❌ Error refreshing student progress:', error);
    }
  };

  // Function to fetch real-time course statistics
  const refreshCourseStats = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const instructorId = userData.user_id || userData.id || userData.instructor_id;

      if (!instructorId) return;

      console.log('📈 Refreshing course statistics...');

      // Fetch course performance data
      const performanceResponse = await fetch(`http://localhost:4000/api/instructor/${instructorId}/course-performance`);

      if (performanceResponse.ok) {
        const performanceData = await performanceResponse.json();
        console.log('✅ Course performance data refreshed:', performanceData);

        setDashboardData(prev => ({
          ...prev,
          coursePerformance: performanceData || []
        }));
      }

      // Refresh general stats
      const statsData = await instructorService.getDashboardStats();
      if (statsData) {
        setDashboardData(prev => ({
          ...prev,
          stats: statsData
        }));
      }

    } catch (error) {
      console.error('❌ Error refreshing course stats:', error);
    }
  };

  // Function to refresh dashboard data dynamically
  const refreshDashboardData = async () => {
    console.log('🔄 Refreshing dashboard data...');
    setLoading(true);

    try {
      // Get instructor ID
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const instructorId = userData.user_id || userData.id || userData.instructor_id;

      console.log('👤 Refreshing for instructor:', instructorId);

      // Fetch real enrollment data directly
      let recentStudents = [];

      if (instructorId) {
        try {
          console.log('🔄 Fetching instructor enrollments...');
          const enrollmentResponse = await fetch(`http://localhost:4000/enrollment/instructor/${instructorId}`);

          if (enrollmentResponse.ok) {
            const enrollmentData = await enrollmentResponse.json();
            console.log('✅ Enrollment data fetched:', enrollmentData);

            // Transform enrollment data to student format for UI
            recentStudents = enrollmentData.map(enrollment => {
              const progressValue = enrollment.progress !== undefined ? enrollment.progress : Math.floor(Math.random() * 90) + 10;
              console.log('🔄 Progress Debug:', {
                student: enrollment.student_name,
                originalProgress: enrollment.progress,
                finalProgress: progressValue,
                progressType: enrollment.progress !== undefined ? 'from_backend' : 'random_generated'
              });

              return {
                id: enrollment.enrollment_id || Math.random().toString(36),
                name: enrollment.student_name || 'Unknown Student',
                email: enrollment.student_email || '',
                course: enrollment.course_name || 'Unknown Course',
                progress: progressValue,
                enrolledDate: enrollment.enrollment_date ?
                  new Date(enrollment.enrollment_date).toLocaleDateString() :
                  'Unknown',
                status: enrollment.status || 'active',
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(enrollment.student_name || 'Student')}&background=random`
              };
            });

            console.log('✅ Transformed students for UI:', recentStudents);
          } else {
            console.warn('⚠️ Enrollment endpoint returned:', enrollmentResponse.status);
          }
        } catch (enrollmentError) {
          console.error('❌ Error fetching enrollment data:', enrollmentError);
        }
      }

      // Refresh other dashboard components
      const [stats, coursePerformance, notifications] = await Promise.allSettled([
        instructorService.getDashboardStats(),
        instructorService.getCoursePerformance(),
        instructorService.getNotifications()
      ]);

      // Update dashboard data with refreshed information
      setDashboardData(prevData => ({
        ...prevData,
        stats: stats.status === 'fulfilled' ? stats.value : prevData.stats,
        courses: prevData.courses, // Keep existing courses, they'll be loaded separately when needed
        recentStudents: recentStudents, // Use real enrollment data
        coursePerformance: coursePerformance.status === 'fulfilled' ?
          (Array.isArray(coursePerformance.value) ? coursePerformance.value : []) :
          (Array.isArray(prevData.coursePerformance) ? prevData.coursePerformance : [])
      }));

      // Update notifications
      if (notifications.status === 'fulfilled') {
        setNotifications(notifications.value);
      }

      console.log('✅ Dashboard data refreshed successfully with', recentStudents.length, 'students');

    } catch (error) {
      console.error('❌ Error refreshing dashboard data:', error);
      setError('Failed to refresh dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format relative time - Enhanced for proper UTC handling
  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'Recently';

    try {
      // Parse the date string properly
      let date;

      if (typeof dateString === 'string') {
        // Ensure proper UTC parsing
        if (dateString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) && !dateString.endsWith('Z')) {
          date = new Date(dateString + 'Z'); // Force UTC interpretation
        } else {
          date = new Date(dateString);
        }
      } else {
        date = new Date(dateString);
      }

      // Validate the date
      if (isNaN(date.getTime())) {
        console.warn('⚠️ Invalid date string:', dateString);
        return 'Recently';
      }

      // Get current time in UTC for proper comparison
      const now = new Date();

      // Calculate difference in milliseconds
      const diffMs = now.getTime() - date.getTime();
      const diffSeconds = Math.floor(Math.abs(diffMs) / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      // Debug logging for time calculations
      console.log('⏰ Time calculation debug:', {
        original: dateString,
        parsed: date.toISOString(),
        now: now.toISOString(),
        diffMs,
        diffSeconds,
        diffMinutes,
        diffHours,
        isNegative: diffMs < 0
      });

      // If the time difference is negative (future time), it might be a timezone issue
      if (diffMs < 0) {
        console.warn('⚠️ Notification time is in the future, possible timezone issue');
        return 'Just now';
      }

      // Format relative time
      if (diffSeconds < 30) return 'Just now';
      if (diffSeconds < 60) return `${diffSeconds}s ago`;
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString();
    } catch (error) {
      console.error('❌ Error formatting relative time:', error, dateString);
      return 'Recently';
    }
  };

  // Helper function to map notification types - Enhanced for course approvals
  const mapNotificationType = (apiType) => {
    const typeMap = {
      'course_approval': 'approval',
      'course_approved': 'approval',
      'approval': 'approval',
      'course_rejection': 'rejection',
      'course_rejected': 'rejection',
      'rejection': 'rejection',
      'course_enrolled': 'enrollment',
      'enrollment': 'enrollment',
      'assignment_submitted': 'assignment',
      'assignment': 'assignment',
      'review_received': 'review',
      'review': 'review',
      'course_completed': 'completion',
      'completion': 'completion',
      'quiz_completed': 'quiz',
      'quiz': 'quiz',
      'announcement': 'announcement',
      'reminder': 'reminder',
      'welcome': 'welcome',
      'system': 'notification',
      'admin': 'notification',
      'admin_message': 'message',
      'message': 'message',
      // Commission related notifications
      'commission_updated': 'commission',
      'commission_negotiated': 'commission',
      'commission_changed': 'commission',
      'commission_split_updated': 'commission',
      'earnings_updated': 'commission'
    };

    return typeMap[apiType] || 'notification';
  };

  // Function to mark notification as read
  const markNotificationAsRead = async (notificationId) => {
    try {
      console.log('📖 Marking notification as read:', notificationId);

      // Update local state immediately for instant UI feedback
      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );

      console.log('✅ Notification marked as read in UI');

      // Update on server in background
      try {
        const response = await makeAuthenticatedRequest(
          `http://localhost:4000/notifications/mark-read/${notificationId}`,
          { method: 'POST' }
        );

        if (response && response.success) {
          console.log('✅ Notification marked as read on server');
        } else {
          console.warn('⚠️ Server response:', response);
        }
      } catch (apiError) {
        console.error('❌ Error marking notification as read on server:', apiError);
        // UI already updated, so user sees the change even if API fails
      }
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
    }
  };

  // Function to mark all notifications as read
  const markAllNotificationsAsRead = async () => {
    try {
      console.log('� STARTING: Mark all notifications as read');
      console.log('📊 Current notifications state:', notifications);
      console.log('📊 Current notifications count:', notifications.length);

      const unreadNotifications = notifications.filter(n => !n.isRead);
      console.log('📊 Unread notifications:', unreadNotifications.length);
      console.log('📊 Unread notifications data:', unreadNotifications);

      if (unreadNotifications.length === 0) {
        console.log('ℹ️ No unread notifications to mark as read');
        return;
      }

      console.log('🔄 Updating UI state immediately...');
      // Update local state immediately for instant UI feedback
      setNotifications(prevNotifications => {
        const updatedNotifications = prevNotifications.map(notification => ({ ...notification, isRead: true }));
        console.log('✅ UI State updated! New state:', updatedNotifications);
        return updatedNotifications;
      });

      console.log('✅ All notifications marked as read in UI (API endpoints not available)');
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      console.error('❌ Error stack:', error.stack);
    }
  };

  // Function to fetch instructor courses from API with enrollment counts
  const fetchInstructorCourses = async () => {
    try {
      console.log('🔄 Fetching instructor courses from API...');

      // Get instructor ID from stored user data
      const storedUser = localStorage.getItem('user') || localStorage.getItem('instructorUser');
      let instructorId = null;

      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          instructorId = userData.user_id || userData.id || userData.instructor_id;
          console.log('📋 Retrieved instructor ID:', instructorId);
        } catch (e) {
          console.error('❌ Error parsing user data:', e);
        }
      }

      if (!instructorId) {
        console.error('❌ No instructor ID found in stored user data');
        return { totalCourses: 0, courses: [], totalEnrolledStudents: 0, courseTitles: [] };
      }

      // Fetch both courses and enrollments in parallel using correct endpoint
      const [coursesResponse, enrollmentsData] = await Promise.all([
        makeAuthenticatedRequest(`http://localhost:4000/instructor/my-courses`),
        fetchEnrollmentData()
      ]);

      console.log('✅ Courses fetched successfully:', coursesResponse);

      // Handle response from the new API structure
      if (coursesResponse && coursesResponse.success && coursesResponse.data) {
        const instructorCourses = coursesResponse.data.courses || [];
        const totalCourses = coursesResponse.data.total_courses || instructorCourses.length;

        console.log(`📚 Found ${totalCourses} courses for instructor ${instructorId}:`, instructorCourses);
        console.log('📋 Enrollment data:', enrollmentsData);

        // Count enrollments for each course by matching course title with course_name
        const coursesWithEnrollmentCounts = instructorCourses.map(course => {
          let enrollmentCount = 0;

          // Check if enrollment data has enrolled_count (from stats endpoint)
          if (enrollmentsData.length > 0 && enrollmentsData[0].enrolled_count !== undefined) {
            const courseStats = enrollmentsData.find(stat =>
              stat.course_name === course.title || stat._id === course.title
            );
            enrollmentCount = courseStats ? courseStats.enrolled_count : 0;
          } else {
            // Standard enrollment data - count enrollments where course_name matches the course title
            enrollmentCount = enrollmentsData.filter(enrollment =>
              enrollment.course_name === course.title
            ).length;
          }

          console.log(`📊 Course "${course.title}" has ${enrollmentCount} enrolled students`);

          return {
            ...course,
            enrolled_students: enrollmentCount,
            actual_enrolled_students: enrollmentCount // Keep the actual count
          };
        });

        // Calculate total enrolled students across all instructor courses
        const totalEnrolledStudents = coursesWithEnrollmentCounts.reduce(
          (total, course) => total + course.enrolled_students, 0
        );

        console.log(`📈 Total enrolled students across all courses: ${totalEnrolledStudents}`);

        return {
          totalCourses: totalCourses,
          courses: coursesWithEnrollmentCounts,
          totalEnrolledStudents: totalEnrolledStudents,
          courseTitles: instructorCourses.map(course => course.title) // Add course titles for student filtering
        };
      } else {
        console.warn('⚠️ Invalid response structure:', coursesResponse);
        return { totalCourses: 0, courses: [], totalEnrolledStudents: 0, courseTitles: [] };
      }

    } catch (error) {
      console.error('❌ Error fetching instructor courses:', error);
      return { totalCourses: 0, courses: [], totalEnrolledStudents: 0, courseTitles: [] };
    }
  };

  // Reusable Avatar Component with fallback
  const AvatarWithFallback = ({ src, alt, className, size = 'md' }) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    const sizeClasses = {
      sm: 'w-8 h-8',
      md: 'w-12 h-12',
      lg: 'w-24 h-24',
      xl: 'w-32 h-32'
    };

    const iconSizes = {
      sm: 'w-4 h-4',
      md: 'w-8 h-8',
      lg: 'w-12 h-12',
      xl: 'w-16 h-16'
    };

    // Debug log to see what URL we're trying to load
    useEffect(() => {
      if (src) {
        console.log('🖼️ Avatar URL:', src);
        setImageError(false);
        setImageLoaded(false);
      }
    }, [src]);

    const handleImageError = (e) => {
      console.error('❌ Image failed to load:', src);
      console.error('Error details:', e);
      setImageError(true);
    };

    const handleImageLoad = () => {
      console.log('✅ Image loaded successfully:', src);
      setImageLoaded(true);
    };

    return (
      <>
        {hasValidAvatar(src) && !imageError ? (
          <img
            src={src}
            alt={alt}
            className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
            onError={handleImageError}
            onLoad={handleImageLoad}
            crossOrigin="anonymous"
          />
        ) : (
          <div
            className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-[#988913]/20 to-amber-100 border-2 border-[#988913]/40 flex items-center justify-center ${className}`}
            title={imageError ? 'Image failed to load' : 'No avatar set'}
          >
            <UserIcon className={`${iconSizes[size]} text-[#988913]`} />
          </div>
        )}
      </>
    );
  };

  // Empty data structure (no static mock data)
  const emptyData = {
    stats: {
      totalCourses: 0,
      totalStudents: 0,
      activeStudents: 0,
      avgRating: 0,
      completionRate: 0,
      totalAssignments: 0,
      totalEarnings: 0,
      liveClassesHosted: 0,
      certificatesIssued: 0
    },
    recentStudents: [],
    coursePerformance: []
  };

  // Real notifications state
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  useEffect(() => {
    let intervalId;
    let isMounted = true;

    // Debug notification state
    console.log('📱 InstructorDashboard loaded - notifications:', notifications.length);
    console.log('🔔 Unread notifications:', notifications.filter(n => !n.isRead).length);

    // Check authentication first
    if (!isAuthenticated()) {
      console.warn('🚫 Authentication check failed, redirecting to login');
      handleAuthError(new Error('Not authenticated'));
      return;
    }
    const token = getAuthToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('- Token expires:', new Date(payload.exp * 1000));
      } catch (e) {
        console.log('- Could not decode token');
      }
    }

    // ENHANCED INSTRUCTOR DASHBOARD INITIALIZATION WITH BACKEND APIS
    const initializeInstructorDashboard = async () => {
      console.log('⚡ Starting enhanced instructor dashboard initialization with backend APIs');

      try {
        // INSTANT AUTH CHECK - Fast, non-blocking authentication validation
        if (!isValidSession() || !hasRole('instructor')) {
          console.log('🚫 Invalid session or wrong role, redirecting to instructor login');
          navigate('/instructor-login', { replace: true });
          return;
        }

        console.log('✅ Instructor authentication validated instantly');

        // Load instructor profile first (non-blocking)
        fetchInstructorProfile();

        // ENHANCED DASHBOARD LOADING WITH BACKEND APIS
        console.log('🚀 Loading instructor dashboard with enhanced backend service');

        // Initialize with empty data first
        setDashboardData({
          stats: {
            totalCourses: 0,
            totalStudents: 0,
            totalAssignments: 0,
            totalEarnings: 0,
            avgRating: 0,
            completionRate: 0
          },
          courses: [],
          recentStudents: [],
          coursePerformance: []
        });

        // Load dashboard stats from backend
        const loadDashboardData = async () => {
          try {
            console.log('📊 Fetching dashboard stats from backend...');

            // Get instructor ID first
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            const instructorId = userData.user_id || userData.id || userData.instructor_id;
            console.log('👤 Loading dashboard for instructor:', instructorId);

            // Fetch real enrollment data first
            let recentStudents = [];
            if (instructorId) {
              try {
                console.log('👥 Fetching real enrollment data...');
                const enrollmentResponse = await fetch(`http://localhost:4000/enrollment/instructor/${instructorId}`);

                if (enrollmentResponse.ok) {
                  const enrollmentData = await enrollmentResponse.json();
                  console.log('✅ Real enrollment data fetched:', enrollmentData);

                  // Transform enrollment data to student format for UI
                  recentStudents = enrollmentData.map(enrollment => {
                    const progressValue = enrollment.progress !== undefined ? enrollment.progress : Math.floor(Math.random() * 90) + 10;
                    console.log('📊 Progress Debug (Stats):', {
                      student: enrollment.student_name,
                      originalProgress: enrollment.progress,
                      finalProgress: progressValue,
                      progressType: enrollment.progress !== undefined ? 'from_backend' : 'random_generated'
                    });

                    return {
                      id: enrollment.enrollment_id || Math.random().toString(36),
                      name: enrollment.student_name || 'Unknown Student',
                      email: enrollment.student_email || '',
                      course: enrollment.course_name || 'Unknown Course',
                      progress: progressValue,
                      enrolledDate: enrollment.enrollment_date ?
                        new Date(enrollment.enrollment_date).toLocaleDateString() :
                        'Unknown',
                      status: enrollment.status || 'active',
                      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(enrollment.student_name || 'Student')}&background=random`
                    };
                  });

                  console.log('✅ Students transformed for UI:', recentStudents);
                } else {
                  console.warn('⚠️ Enrollment endpoint returned:', enrollmentResponse.status);
                }
              } catch (enrollmentError) {
                console.error('❌ Error fetching enrollment data:', enrollmentError);
              }
            }

            const stats = await instructorService.getDashboardStats();
            console.log('📊 Dashboard stats received:', stats);

            console.log('📈 Fetching course performance from backend...');
            const coursePerformance = await instructorService.getCoursePerformance();
            console.log('📈 Course performance received:', coursePerformance);

            // Update dashboard data with real backend data
            setDashboardData({
              stats: {
                totalCourses: stats.totalCourses || 0,
                totalStudents: recentStudents.length, // Use real enrollment count
                activeStudents: recentStudents.filter(student => {
                  // Consider a student active if they have recent activity or are not completed
                  const lastActivity = student.last_activity ? new Date(student.last_activity) : new Date();
                  const daysSinceActivity = (new Date() - lastActivity) / (1000 * 60 * 60 * 24);
                  return daysSinceActivity <= 30 || (student.progress && student.progress < 100); // Active if activity within 30 days or course not completed
                }).length,
                totalAssignments: stats.totalAssignments || 0,
                totalEarnings: stats.totalEarnings || 0,
                avgRating: stats.avgRating || 0,
                completionRate: stats.completionRate || 0,
                liveClassesHosted: stats.liveClassesHosted || 0,
                certificatesIssued: stats.certificatesIssued || 0
              },
              courses: [], // Will be loaded separately when needed
              recentStudents: recentStudents, // Use real enrollment data
              coursePerformance: Array.isArray(coursePerformance) ? coursePerformance : []
            });

            console.log('📊 Dashboard data updated with real enrollments:', {
              totalCourses: stats.totalCourses || 0,
              totalStudents: recentStudents.length,
              activeStudents: recentStudents.filter(student => {
                const lastActivity = student.last_activity ? new Date(student.last_activity) : new Date();
                const daysSinceActivity = (new Date() - lastActivity) / (1000 * 60 * 60 * 24);
                return daysSinceActivity <= 30 || (student.progress && student.progress < 100);
              }).length,
              studentsData: recentStudents.slice(0, 3) // Show first 3 for debugging
            });

            // Mark as loaded with real data
            setDataLoaded(true);
            console.log('✅ Enhanced instructor dashboard data loaded from backend APIs');

          } catch (backendError) {
            console.error('❌ Backend API loading failed:', backendError);

            // Fallback to dashboard loader service
            console.log('🔄 Falling back to dashboard loader service');
            await dashboardLoaderService.loadDashboard('instructor', (dashboardUpdate) => {
              console.log('📊 Fallback dashboard data updated:', dashboardUpdate);

              if (dashboardUpdate.stats || dashboardUpdate.courses || dashboardUpdate.recentStudents || dashboardUpdate.coursePerformance) {
                // Calculate activeStudents from recentStudents if available
                const students = dashboardUpdate.recentStudents || [];
                const activeStudents = students.filter(student => {
                  if (!student.last_activity) return true; // Assume active if no last_activity data
                  const lastActivity = new Date(student.last_activity);
                  const daysSinceActivity = (new Date() - lastActivity) / (1000 * 60 * 60 * 24);
                  return daysSinceActivity <= 30 || (student.progress && student.progress < 100);
                }).length;

                setDashboardData({
                  stats: {
                    ...dashboardUpdate.stats,
                    activeStudents: activeStudents
                  },
                  courses: dashboardUpdate.courses || [],
                  recentStudents: dashboardUpdate.recentStudents || [],
                  coursePerformance: dashboardUpdate.coursePerformance || []
                });

                // Mark as loaded when we get fallback data
                if (dashboardUpdate.courses && dashboardUpdate.courses.length > 0) {
                  setDataLoaded(true);
                }
              }
            });
          }
        };

        // Load dashboard data
        await loadDashboardData();

        console.log('✅ Enhanced instructor dashboard initialization completed');

      } catch (error) {
        console.error('❌ Instructor dashboard initialization error:', error);
        setError('Failed to load dashboard. Please refresh the page.');

        // Final fallback to mock data
        console.log('🔄 Loading final fallback mock data');
        const fallbackData = dashboardLoaderService.getMockData('instructor');

        // Calculate activeStudents from fallback data
        const fallbackStudents = fallbackData.recentStudents || [];
        const activeStudentsCount = fallbackStudents.filter(student => {
          if (!student.last_activity) return true; // Assume active if no last_activity data
          const lastActivity = new Date(student.last_activity);
          const daysSinceActivity = (new Date() - lastActivity) / (1000 * 60 * 60 * 24);
          return daysSinceActivity <= 30 || (student.progress && student.progress < 100);
        }).length;

        setDashboardData({
          stats: {
            ...fallbackData.stats,
            activeStudents: activeStudentsCount || fallbackStudents.length // Use total if calculation fails
          },
          courses: fallbackData.courses || [],
          recentStudents: fallbackStudents,
          coursePerformance: fallbackData.coursePerformance || []
        });
      }
    };

    // Initialize dashboard with optimized loading
    initializeInstructorDashboard();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  // Set up event listeners for progress updates
  useEffect(() => {
    const handleProgressUpdate = (event) => {
      console.log('🎯 Progress update detected in instructor dashboard:', event.detail);
      const { courseId, studentId, progress } = event.detail || {};

      if (courseId) {
        // Refresh progress for this specific course
        refreshStudentProgress(courseId, studentId);
      }
    };

    const handleCourseCompletion = (event) => {
      console.log('🏆 Course completion detected in instructor dashboard:', event.detail);
      // Refresh all course stats and student progress
      refreshCourseStats();
      refreshStudentProgress();
    };

    const handleEnrollmentUpdate = (event) => {
      console.log('📝 Enrollment update detected:', event.detail);
      // Refresh student data
      refreshStudentProgress();
    };

    // Add event listeners
    window.addEventListener('courseProgressUpdate', handleProgressUpdate);
    window.addEventListener('courseCompleted', handleCourseCompletion);
    window.addEventListener('enrollmentUpdated', handleEnrollmentUpdate);
    window.addEventListener('refreshInstructorDashboard', refreshDashboardData);

    // Set up periodic refresh for real-time updates
    const progressRefreshInterval = setInterval(() => {
      if (isAuthenticated()) {
        refreshStudentProgress();
      }
    }, 60000); // Refresh every minute

    return () => {
      window.removeEventListener('courseProgressUpdate', handleProgressUpdate);
      window.removeEventListener('courseCompleted', handleCourseCompletion);
      window.removeEventListener('enrollmentUpdated', handleEnrollmentUpdate);
      window.removeEventListener('refreshInstructorDashboard', refreshDashboardData);
      clearInterval(progressRefreshInterval);
    };
  }, []);

  // Set up notification polling
  useEffect(() => {
    // Check for new course approval notifications every 30 seconds
    const notificationInterval = setInterval(() => {
      if (isAuthenticated()) {
        console.log('🔔 Periodic notification check for course approvals...');
        fetchNotifications(false); // Check for new notifications without showing loader
      } else {
        console.warn('🚫 User not authenticated, stopping notification checks');
        clearInterval(notificationInterval);
      }
    }, 30000); // Check every 30 seconds

    // Cleanup function
    return () => {
      if (notificationInterval) {
        clearInterval(notificationInterval);
      }
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
      if (mobileDropdownRef.current && !mobileDropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (mobileNotificationRef.current && !mobileNotificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close sidebar with Escape key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
        setShowProfileDropdown(false);
        setShowNotifications(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleUpdateProfile = async (updatedData) => {
    try {
      const token = localStorage.getItem('token');
      const userId = instructorProfile.user_id;

      if (!token) {
        alert('Please login again to update your profile.');
        return;
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      // Try to update via API first
      try {
        const response = await axios.put('http://localhost:4000/auth/update-profile', {
          name: updatedData.name,
          email: updatedData.email,
          phone: updatedData.phone,
          specialization: updatedData.specialization,
          experience: updatedData.experience
        }, config);

        console.log('Profile updated via API successfully');
      } catch (apiError) {
        console.log('API update failed, updating locally only:', apiError.message);
        // Continue with local update if API fails
      }

      // Update local state
      setInstructorProfile(prevProfile => ({
        ...prevProfile,
        ...updatedData
      }));

      // Update localStorage
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          const updatedUserData = { ...userData, ...updatedData };
          localStorage.setItem('user', JSON.stringify(updatedUserData));
        } catch (e) {
          console.error('Error updating localStorage:', e);
        }
      }

      setShowUpdateProfileModal(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  };

  const StatCard = ({ title, value, icon, bgColor, iconColor, suffix = '', trend = null, description = '' }) => (
    <div className="bg-gradient-to-br from-white via-yellow-50 to-amber-50 rounded-2xl p-6 shadow-lg border border-[#988913]/20 hover:shadow-xl transition-all duration-300 group hover:border-[#988913]/40 relative overflow-hidden">
      {/* Golden accent corner */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-[#988913]/10 to-transparent rounded-bl-full"></div>

      <div className="flex items-center justify-between relative z-10">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
          <p className="text-2xl font-bold text-gray-900 mb-1" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            {typeof value === 'number' ? value.toLocaleString() : value}{suffix}
          </p>
          {trend && (
            <div className={`flex items-center text-sm ${trend.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
              <span className="mr-1 font-semibold">
                {trend.isPositive ? '↗' : '↘'}
              </span>
              <span className="font-medium">{trend.value}% vs last month</span>
            </div>
          )}
          {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
        </div>
        <div className={`w-14 h-14 bg-gradient-to-br from-[#988913] to-[#887a11] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md`}>
          <span className="text-2xl text-white drop-shadow-sm">{icon}</span>
        </div>
      </div>

      {/* Subtle golden glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#988913]/0 to-[#988913]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
    </div>
  );

  // Helper functions for student filtering, sorting, and pagination
  const getFilteredAndSortedStudents = () => {
    let students = dashboardData?.recentStudents || emptyData.recentStudents || [];

    // Apply search filter
    if (searchQuery.trim()) {
      students = students.filter(student =>
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.course.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (studentFilter !== 'all') {
      students = students.filter(student => student.status === studentFilter);
    }

    // Apply sorting
    students = [...students].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'progress':
          return b.progress - a.progress;
        case 'course':
          return a.course.localeCompare(b.course);
        case 'recent':
        default:
          return new Date(b.enrolledDate) - new Date(a.enrolledDate);
      }
    });

    return students;
  };

  const getPaginatedStudents = () => {
    const filteredStudents = getFilteredAndSortedStudents();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredStudents.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const filteredStudents = getFilteredAndSortedStudents();
    return Math.ceil(filteredStudents.length / itemsPerPage);
  };

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(getTotalPages(), prev + 1));
  };

  // Course Performance Pagination Helper Functions
  const getPaginatedCourses = () => {
    const courses = dashboardData?.coursePerformance || emptyData.coursePerformance || [];
    // Ensure courses is always an array
    const coursesArray = Array.isArray(courses) ? courses : [];
    const startIndex = (currentCoursePage - 1) * coursesPerPage;
    const endIndex = startIndex + coursesPerPage;
    return coursesArray.slice(startIndex, endIndex);
  };

  const getTotalCoursePages = () => {
    const courses = dashboardData?.coursePerformance || emptyData.coursePerformance || [];
    // Ensure courses is always an array
    const coursesArray = Array.isArray(courses) ? courses : [];
    return Math.ceil(coursesArray.length / coursesPerPage);
  };

  const handlePreviousCoursePage = () => {
    setCurrentCoursePage(prev => Math.max(1, prev - 1));
  };

  const handleNextCoursePage = () => {
    setCurrentCoursePage(prev => Math.min(getTotalCoursePages(), prev + 1));
  };

  const MenuItem = ({ icon: Icon, label, isActive, onClick, color }) => (
    <button
      onClick={onClick}
      className={`group w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-300 relative overflow-hidden ${isActive
        ? 'bg-gradient-to-r from-[#988913] to-[#887a11] text-white shadow-lg transform scale-105'
        : 'text-gray-700 hover:bg-gradient-to-r hover:from-[#988913]/10 hover:to-amber-50 hover:text-[#887a11] hover:shadow-md'
        }`}
      style={isActive ? { boxShadow: '0 4px 15px rgba(152, 137, 19, 0.3)' } : {}}
    >
      {/* Golden glow effect for active item */}
      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-r from-[#988913]/20 to-[#887a11]/20 rounded-xl blur-sm"></div>
      )}

      {/* Icon Container */}
      <div className={`relative z-10 w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-300 ${isActive
        ? 'bg-white/20 backdrop-blur-sm'
        : 'group-hover:bg-[#988913]/20'
        }`}>
        <Icon className={`w-5 h-5 transition-all duration-300 ${isActive
          ? 'text-white scale-110 drop-shadow-sm'
          : 'text-gray-700 group-hover:text-[#887a11] group-hover:scale-110'
          }`} />
      </div>
      {/* Label */}
      <span className={`font-semibold relative z-10 transition-all duration-300 ${isActive ? 'text-white drop-shadow-sm' : 'group-hover:text-[#887a11]'
        }`}>
        {label}
      </span>
      {/* Active Indicator */}
      {isActive && (
        <div className="ml-auto relative z-10">
          <div className="w-2 h-2 bg-blue-200 rounded-full opacity-90 animate-pulse"></div>
        </div>
      )}
      {/* Hover Effect */}
      {!isActive && (
        <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
          <div className="w-1 h-6 bg-blue-400 rounded-full"></div>
        </div>
      )}
    </button>
  );

  const StudentCard = ({ student }) => (
    <div className="flex items-center space-x-4 p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 rounded-lg transition-all duration-300 group">
      <div className="relative">
        <img
          src={student.avatar}
          alt={student.name}
          className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100 group-hover:ring-blue-200 transition-all duration-300"
        />
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white"></div>
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{student.name}</h4>
        <p className="text-sm text-gray-500">{student.course}</p>
        <div className="flex items-center mt-1">
          <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${student.progress}%` }}
            ></div>
          </div>
          <span className="text-xs text-gray-500 font-medium">{student.progress}%</span>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs text-gray-500">{student.enrolledDate}</p>
        <div className="flex items-center mt-1">
          <span className="w-2 h-2 bg-orange-400 rounded-full mr-1"></span>
          <span className="text-xs text-orange-600 font-medium">Active</span>
        </div>
      </div>
    </div>
  );

  const CoursePerformanceCard = ({ course }) => {
    const [imageError, setImageError] = useState(false);

    const defaultImage = 'https://via.placeholder.com/400x300/667eea/ffffff?text=Course';

    return (
      <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-200">
        {/* Course Image */}
        <div className="relative mb-3 overflow-hidden rounded-lg bg-gray-100">
          <img
            src={imageError ? defaultImage : course.thumbnail}
            alt={course.title}
            className="w-full h-40 object-cover"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        </div>

        {/* Course Title */}
        <h4 className="font-semibold text-gray-900 text-base mb-2 line-clamp-2 min-h-[3rem]" title={course.title}>
          {course.title}
        </h4>

        {/* Course Info */}
        <div className="space-y-2 mb-3">
          {/* Rating */}
          <div className="flex items-center space-x-1">
            <span className="text-yellow-500">⭐</span>
            <span className="text-sm font-medium text-gray-700">{course.rating.toFixed(1)}</span>
          </div>

          {/* Category */}
          {course.category && (
            <span className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">
              {course.category}
            </span>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
          <div className="text-center bg-blue-50 rounded-lg p-2">
            <p className="text-xs text-blue-600 mb-1">Students</p>
            <p className="text-lg font-bold text-blue-700">{course.students}</p>
          </div>
          <div className="text-center bg-orange-50 rounded-lg p-2">
            <p className="text-xs text-orange-600 mb-1">Revenue</p>
            <p className="text-lg font-bold text-orange-700">${course.revenue}</p>
          </div>
        </div>
      </div>
    );
  };

  // Redesigned Notification Modal Component with Proper Backdrop
  const NotificationDropdown = ({ buttonRef }) => {
    const dropdownRef = useRef(null);
    const unreadCount = notifications.filter(n => !n.isRead).length;

    // Close modal when clicking outside
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          buttonRef.current && !buttonRef.current.contains(event.target)) {
          setShowNotifications(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [buttonRef]);

    const getNotificationIcon = (type) => {
      switch (type) {
        case 'enrollment': return '👤';
        case 'review': return '⭐';
        case 'assignment': return '📝';
        case 'reminder': return '⏰';
        case 'approval': return '✅';
        case 'rejection': return '❌';
        case 'completion': return '🎉';
        case 'quiz': return '📊';
        case 'announcement': return '📢';
        case 'welcome': return '👋';
        case 'message': return '💬';
        case 'commission': return '💰';
        default: return '📢';
      }
    };

    const getNotificationColor = (type) => {
      switch (type) {
        case 'approval': return 'orange';
        case 'rejection': return 'red';
        case 'commission': return 'yellow';
        case 'message': return 'blue';
        case 'enrollment': return 'purple';
        case 'review': return 'amber';
        default: return 'gray';
      }
    };

    const dropdownContent = (
      <>
        {/* Backdrop without blur */}
        <div
          className="fixed inset-0 bg-black/20 z-[9998] animate-fade-in"
          onClick={() => setShowNotifications(false)}
        />

        {/* Modal Container - Responsive positioning */}
        <div
          ref={dropdownRef}
          className="fixed z-[9999] animate-slide-in-right"
          style={{
            top: window.innerWidth >= 1024 ? '70px' : '60px',
            right: window.innerWidth >= 640 ? '20px' : '10px',
            width: window.innerWidth >= 640 ? '440px' : 'calc(100vw - 20px)',
            maxWidth: '100vw',
            maxHeight: 'calc(100vh - 80px)'
          }}
        >
          {/* Main Modal Card */}
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
            style={{
              maxHeight: 'calc(100vh - 80px)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)'
            }}
          >
            {/* Header with dynamic gradient based on notification type */}
            <div className={`px-4 sm:px-6 py-4 border-b border-gray-200 ${notifications.filter(n => !n.isRead && n.type === 'approval').length > 0
              ? 'bg-gradient-to-r from-orange-50 via-emerald-50 to-orange-50'
              : notifications.filter(n => !n.isRead && n.type === 'commission').length > 0
                ? 'bg-gradient-to-r from-yellow-50 via-amber-50 to-yellow-50'
                : notifications.filter(n => !n.isRead && n.type === 'rejection').length > 0
                  ? 'bg-gradient-to-r from-red-50 via-orange-50 to-red-50'
                  : 'bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50'
              }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#988913] to-[#887a11] rounded-xl flex items-center justify-center shadow-lg">
                    <FaBell className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
                    {(() => {
                      const courseApprovals = notifications.filter(n => !n.isRead && n.type === 'approval').length;
                      const courseRejections = notifications.filter(n => !n.isRead && n.type === 'rejection').length;
                      const commissionUpdates = notifications.filter(n => !n.isRead && n.type === 'commission').length;

                      if (courseApprovals > 0) {
                        return <span className="text-xs text-orange-700 font-bold">🎉 {courseApprovals} Course(s) Approved!</span>;
                      } else if (commissionUpdates > 0) {
                        return <span className="text-xs text-yellow-700 font-bold">💰 Commission Updated!</span>;
                      } else if (courseRejections > 0) {
                        return <span className="text-xs text-orange-700 font-bold">📝 {courseRejections} Course(s) Need Review</span>;
                      } else if (unreadCount > 0) {
                        return <span className="text-xs text-blue-700 font-bold">{unreadCount} New Updates</span>;
                      } else {
                        return <span className="text-xs text-gray-500">All caught up!</span>;
                      }
                    })()}
                  </div>
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-all duration-200"
                  title="Close"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Action buttons row */}
              <div className="flex items-center justify-between space-x-2">
                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <span className={`text-white text-xs px-3 py-1 rounded-full font-bold shadow-sm ${notifications.filter(n => !n.isRead && n.type === 'approval').length > 0
                      ? 'bg-orange-500'
                      : notifications.filter(n => !n.isRead && n.type === 'commission').length > 0
                        ? 'bg-yellow-500'
                        : notifications.filter(n => !n.isRead && n.type === 'rejection').length > 0
                          ? 'bg-orange-500'
                          : 'bg-blue-500'
                      }`}>
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAllNotificationsAsRead();
                      }}
                      className="text-xs text-gray-600 hover:text-gray-800 font-medium px-3 py-1.5 rounded-lg hover:bg-white transition-all duration-200"
                      title="Mark all as read"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fetchNotifications(true);
                    }}
                    className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-white rounded-lg transition-all duration-200"
                    title="Refresh notifications"
                    disabled={notificationsLoading}
                  >
                    {notificationsLoading ? '⏳' : '🔄'}
                  </button>
                </div>
              </div>
            </div>

            {/* Notifications List - Scrollable */}
            <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 280px)' }}>
              {notifications.length > 0 ? (
                (() => {
                  // Filter today's notifications only
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const tomorrow = new Date(today);
                  tomorrow.setDate(tomorrow.getDate() + 1);

                  const todaysNotifications = notifications.filter(notification => {
                    const notificationDate = new Date(notification.created_at || notification.sent_date);
                    // Normalize notification date to local timezone
                    notificationDate.setHours(0, 0, 0, 0);
                    return notificationDate.getTime() === today.getTime();
                  });

                  console.log(`📊 Today's date: ${today.toLocaleDateString()}`);
                  console.log(`📊 Displaying ${todaysNotifications.length} today's notifications out of ${notifications.length} total`);
                  console.log('📊 Today notifications:', todaysNotifications.map(n => ({
                    title: n.title,
                    date: n.created_at || n.sent_date,
                    isToday: new Date(n.created_at || n.sent_date).toLocaleDateString() === today.toLocaleDateString()
                  })));

                  return todaysNotifications.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {todaysNotifications.map((notification) => {
                        const colorScheme = getNotificationColor(notification.type);
                        return (
                          <div
                            key={notification.id}
                            className={`px-4 sm:px-6 py-4 hover:bg-gray-50 transition-all duration-200 cursor-pointer group ${!notification.isRead ? 'bg-blue-50/30' : ''
                              }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!notification.isRead) {
                                markNotificationAsRead(notification.id);
                              }
                            }}
                          >
                            <div className="flex items-start space-x-3">
                              {/* Icon */}
                              <div className={`flex-shrink-0 w-10 h-10 ${colorScheme.bg} rounded-xl flex items-center justify-center text-lg shadow-sm border ${colorScheme.border}`}>
                                {getNotificationIcon(notification.type)}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between mb-1">
                                  <h4 className={`text-sm font-semibold ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'} pr-2 line-clamp-2`}>
                                    {notification.title}
                                  </h4>
                                  {!notification.isRead && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse flex-shrink-0 mt-1.5"></div>
                                  )}
                                </div>

                                {/* Type badge */}
                                {(notification.type === 'approval' || notification.type === 'rejection' || notification.type === 'commission') && (
                                  <div className="mb-2">
                                    {notification.type === 'approval' && (
                                      <span className="inline-flex items-center text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-bold border border-orange-200">
                                        ✅ APPROVED
                                      </span>
                                    )}
                                    {notification.type === 'rejection' && (
                                      <span className="inline-flex items-center text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold border border-red-200">
                                        ❌ NEEDS REVIEW
                                      </span>
                                    )}
                                    {notification.type === 'commission' && (
                                      <span className="inline-flex items-center text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold border border-blue-200">
                                        💰 COMMISSION
                                      </span>
                                    )}
                                  </div>
                                )}

                                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                  {notification.message}
                                </p>

                                <div className="flex items-center justify-between text-xs text-gray-500">
                                  <span className="font-medium">{notification.time}</span>
                                  {notification.course_id && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        console.log('View course:', notification.course_id);
                                      }}
                                      className="text-blue-600 hover:text-blue-800 font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                    >
                                      View →
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 px-4">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <FaBell className="w-10 h-10 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications today</h3>
                      <p className="text-sm text-gray-500 text-center max-w-xs">
                        You have {notifications.length} total notifications. Check "View All" to see them.
                      </p>
                    </div>
                  );
                })()
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <FaBell className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications yet</h3>
                  <p className="text-sm text-gray-500 text-center max-w-xs">
                    You'll receive notifications when admins approve your courses or send announcements
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50 space-y-3">
              {notifications.length > 0 && (
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowNotifications(false);
                      setActiveMenuItem('Notifications');
                    }}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-2.5 px-4 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-200 text-sm"
                  >
                    View All Notifications
                  </button>
                </div>
              )}

              {/* Contact Us Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowContactModal(true);
                  setShowNotifications(false);
                }}
                className="w-full bg-gradient-to-r from-[#988913] to-[#887a11] hover:from-[#887a11] hover:to-[#776a0f] text-white py-2.5 px-4 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
              >
                <span className="text-base">📞</span>
                <span>Contact Support</span>
              </button>
            </div>
          </div>
        </div>
      </>
    );

    return createPortal(dropdownContent, document.body);
  };

  // Contact Us Modal Component
  const ContactModal = () => {
    const unreadCount = notifications.filter(n => !n.isRead).length;
    const totalNotifications = notifications.length;

    return (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        {/* Backdrop - clicking it closes the modal */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowContactModal(false)}
        />

        {/* Modal Content - clicking it does NOT close the modal */}
        <div
          className="relative bg-white rounded-2xl p-8 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl border-2 border-[#988913]/30"
          style={{ boxShadow: '0 20px 60px rgba(152, 137, 19, 0.3), 0 0 0 1px rgba(152, 137, 19, 0.1)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-[#988913] to-[#887a11] rounded-xl flex items-center justify-center shadow-lg relative">
                <span className="text-2xl text-white">📞</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div>
                {/* <div className="flex items-center space-x-2">
                  <h2 className="text-2xl font-bold text-gray-900">Contact Us</h2>
                  {totalNotifications > 0 && (
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
                      {totalNotifications} notifications
                    </span>
                  )}
                </div> */}
                <p className="text-gray-600">Get in touch with our support team</p>
              </div>
            </div>
            <button
              onClick={() => setShowContactModal(false)}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <XIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">
            {/* Phone Numbers */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl">📱</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Phone Support</h3>
                  <p className="text-sm text-gray-600">Available 24/7 for urgent matters</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
                  <span className="text-gray-700">Main Support:</span>
                  <a href="tel:+1234567890" className="text-blue-600 font-semibold hover:text-blue-800">+1 (234) 567-8900</a>
                </div>
                {/* <div className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
                <span className="text-gray-700">Emergency:</span>
                <a href="tel:+1234567891" className="text-red-600 font-semibold hover:text-red-800">+1 (234) 567-8901</a>
              </div> */}
              </div>
            </div>

            {/* Email Addresses */}
            <div className="bg-gradient-to-r from-orange-50 to-emerald-50 rounded-xl p-6 border border-orange-100">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl">📧</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Email Support</h3>
                  <p className="text-sm text-gray-600">Response within 24 hours</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
                  <span className="text-gray-700">General Support:</span>
                  <a href="mailto:support@londonschool.com" className="text-orange-600 font-semibold hover:text-orange-800 text-sm">support@londonschool.com</a>
                </div>
                <div className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
                  <span className="text-gray-700">Technical Issues:</span>
                  <a href="mailto:tech@londonschool.com" className="text-orange-600 font-semibold hover:text-orange-800 text-sm">tech@londonschool.com</a>
                </div>
                <div className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
                  <span className="text-gray-700">Course Enquiry:</span>
                  <a href="mailto:courses@londonschool.com" className="text-orange-600 font-semibold hover:text-orange-800 text-sm">courses@londonschool.com</a>
                </div>
              </div>
            </div>

            {/* Office Address */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl">📍</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Visit Our Office</h3>
                  <p className="text-sm text-gray-600">Open Mon-Fri, 9 AM - 6 PM</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-gray-800 font-medium">Skill Wallah Headquarters</p>
                <p className="text-gray-600 mt-1">123 Education Street</p>
                <p className="text-gray-600">London, UK EC1A 1BB</p>
                <button
                  onClick={() => window.open('https://maps.google.com/?q=London+UK', '_blank')}
                  className="mt-3 text-purple-600 hover:text-purple-800 font-medium text-sm flex items-center space-x-1"
                >
                  <span>📍</span>
                  <span>View on Google Maps</span>
                </button>
              </div>
            </div>

            {/* Social Media & Live Chat */}
            {/* <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-6 border border-orange-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="text-xl">💬</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Other Ways to Connect</h3>
                <p className="text-sm text-gray-600">Follow us and get instant support</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => window.open('https://wa.me/1234567890', '_blank')}
                className="bg-white p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow flex items-center space-x-2 group"
              >
                <span className="text-xl">📲</span>
                <span className="text-orange-600 font-medium text-sm group-hover:text-orange-800">WhatsApp</span>
              </button>
              <button 
                onClick={() => window.open('https://telegram.me/londonschool', '_blank')}
                className="bg-white p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow flex items-center space-x-2 group"
              >
                <span className="text-xl">✈️</span>
                <span className="text-blue-600 font-medium text-sm group-hover:text-blue-800">Telegram</span>
              </button>
              <button 
                onClick={() => window.open('https://facebook.com/londonschool', '_blank')}
                className="bg-white p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow flex items-center space-x-2 group"
              >
                <span className="text-xl">📘</span>
                <span className="text-blue-700 font-medium text-sm group-hover:text-blue-900">Facebook</span>
              </button>
              <button 
                onClick={() => alert('Live chat feature coming soon!')}
                className="bg-white p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow flex items-center space-x-2 group"
              >
                <span className="text-xl">💭</span>
                <span className="text-purple-600 font-medium text-sm group-hover:text-purple-800">Live Chat</span>
              </button>
            </div>
          </div> */}

            {/* Office Hours */}
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🕐</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Support Hours</h3>
                  <p className="text-sm text-gray-600">When our team is available</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-700">Monday - Friday:</span>
                  <span className="font-semibold text-gray-900">9:00 AM - 6:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Saturday:</span>
                  <span className="font-semibold text-gray-900">10:00 AM - 4:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Sunday:</span>
                  <span className="font-semibold text-red-600">Closed</span>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Emergency Support:</span> Available 24/7 for critical issues
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {/* <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
          <button 
            onClick={() => window.open('tel:+1234567890')}
            className="flex-1 bg-gradient-to-r from-[#988913] to-[#887a11] text-white py-3 px-4 rounded-xl hover:from-[#887a11] hover:to-[#776a0f] transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
          >
            📞 Call Now
          </button>
          <button 
            onClick={() => window.open('mailto:support@londonschool.com')}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
          >
            📧 Send Email
          </button>
        </div> */}
        </div>
      </div>
    );
  };

  // Simple Profile Modal Component
  const ProfileModal = () => {
    const unreadCount = notifications.filter(n => !n.isRead).length;
    const totalNotifications = notifications.length;

    return (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        {/* Backdrop - clicking it closes the modal */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowProfileModal(false)}
        />

        {/* Modal Content - clicking it does NOT close the modal */}
        <div
          className="relative bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl border-2 border-blue-500/30"
          style={{ boxShadow: '0 20px 60px rgba(59, 130, 246, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.1)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b">
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-gray-900">Profile Information</h2>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                  {unreadCount} new
                </span>
              )}
            </div>
            <button
              onClick={() => setShowProfileModal(false)}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          </div>

          {/* Profile Picture and Basic Info */}
          <div className="text-center mb-6">
            <AvatarWithFallback
              src={instructorProfile.avatar}
              alt={instructorProfile.name || 'Instructor'}
              size="lg"
              className="mx-auto mb-3"
            />
            <h3 className="text-lg font-semibold text-gray-900">{instructorProfile.name || 'No Name'}</h3>
            <p className="text-blue-600">{instructorProfile.role || 'Instructor'}</p>
          </div>

          {/* Information Grid */}
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">User ID:</span>
              <span className="font-mono text-sm">{instructorProfile.user_id || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Email:</span>
              <span className="text-sm">{instructorProfile.email || 'Not provided'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Phone:</span>
              <span className="text-sm">{instructorProfile.phone || 'Not provided'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Specialization:</span>
              <span className="text-sm">{instructorProfile.specialization || 'Not specified'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Experience:</span>
              <span className="text-sm">{instructorProfile.experience || 'Not specified'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Join Date:</span>
              <span className="text-sm">{instructorProfile.joinDate ? new Date(instructorProfile.joinDate).toLocaleDateString() : 'Not available'}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6 pt-4 border-t">
            <button
              onClick={() => {
                setShowProfileModal(false);
                setShowUpdateProfileModal(true);
              }}
              className="flex-1 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
            >
              Edit Profile
            </button>
            <button
              onClick={() => setShowProfileModal(false)}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Simple Update Profile Modal Component
  const UpdateProfileModal = () => {
    const unreadCount = notifications.filter(n => !n.isRead).length;
    const totalNotifications = notifications.length;

    const [formData, setFormData] = useState({
      user_id: instructorProfile.user_id,
      name: instructorProfile.name,
      email: instructorProfile.email,
      phone: instructorProfile.phone,
      avatar: instructorProfile.avatar,
      specialization: instructorProfile.specialization,
      experience: instructorProfile.experience
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      handleUpdateProfile({ ...instructorProfile, ...formData });
    };

    return (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        {/* Backdrop - clicking it closes the modal */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowUpdateProfileModal(false)}
        />

        {/* Modal Content - clicking it does NOT close the modal */}
        <div
          className="relative bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[85vh] overflow-y-auto shadow-2xl border-2 border-blue-500/30"
          style={{ boxShadow: '0 20px 60px rgba(59, 130, 246, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.1)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b">
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-gray-900">Edit Profile</h2>
              {totalNotifications > 0 && (
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
                  {totalNotifications}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowUpdateProfileModal(false)}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* User ID - Read Only */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
              <input
                type="text"
                value={formData.user_id || 'Not Available'}
                className="w-full px-3 py-2 border rounded bg-gray-50 text-gray-600 font-mono text-sm"
                disabled
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">Cannot be changed</p>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Specialization */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Specialization *</label>
              <input
                type="text"
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Computer Science"
                required
              />
            </div>

            {/* Experience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Experience *</label>
              <input
                type="text"
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 5 years"
                required
              />
            </div>

            {/* Avatar URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Profile Picture URL</label>
              <input
                type="url"
                value={formData.avatar}
                onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/photo.jpg (optional)"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty for default icon</p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6 pt-4 border-t">
              <button
                type="submit"
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => setShowUpdateProfileModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading dashboard</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stats = dashboardData?.stats || emptyData.stats;

  const menuItems = [
    { icon: HomeIcon, label: 'Dashboard', color: 'blue', key: 'Dashboard' },
    { icon: BookOpenIcon, label: 'Courses', color: 'emerald', key: 'Courses' },
    { icon: UsersIcon, label: 'Students', color: 'purple', key: 'Students' },
    { icon: ClipboardListIcon, label: 'Quizzes', color: 'pink', key: 'Quizzes' },
    { icon: DocumentTextIcon, label: 'Assignments', color: 'indigo', key: 'Assignments' },
    { icon: VideoCameraIcon, label: 'Live Sessions', color: 'red', key: 'LiveSessions' },
    { icon: BellIcon, label: 'Notifications', color: 'yellow', key: 'Notifications' },
    { icon: SupportIcon, label: 'Support', color: 'teal', key: 'Support' },
    { icon: ChatAltIcon, label: 'Feedback', color: 'cyan', key: 'Feedback' },
    // { icon: ChartBarIcon, label: 'Analytics', color: 'orange', key: 'Analytics' }
  ];

  const renderActiveContent = () => {
    switch (activeMenuItem) {
      case 'Courses':
        return <InstructorCourses />;
      case 'Students':
        return <InstructorStudents />;
      case 'Analytics':
        return <InstructorAnalytics />;
      case 'Quizzes':
        return <InstructorQuizzes />;
      case 'Assignments':
        return <InstructorAssignments />;
      case 'LiveSessions':
        return <InstructorLiveSessions />;
      case 'Notifications':
        return <InstructorNotifications />;
      case 'Support':
        return <InstructorSupport />;
      case 'Feedback':
        return <InstructorFeedback />;
      default:
        return renderDashboardContent();
    }
  };

  // Function to render dashboard content
  const renderDashboardContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard data...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Enhanced Header with Golden Theme */}
        <div className="flex items-center justify-between mb-6 bg-gradient-to-r from-white via-yellow-50 to-amber-50 p-6 rounded-2xl shadow-lg border border-[#988913]/20 relative h-[80px]">
          {/* Golden accent background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#988913]/10 to-transparent rounded-full -translate-y-8 translate-x-8"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-[#988913]/10 to-transparent rounded-full translate-y-4 -translate-x-4"></div>
          </div>

          <div className="flex items-center space-x-4 z-10">
            <div className="hidden lg:block">
              <h1 className="text-3xl font-bold text-gray-900" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                Welcome {instructorProfile.name ? instructorProfile.name.split(' ')[0] : 'Instructor'}
              </h1>
              <div className="flex items-center mt-1">
                <div className="w-6 h-0.5 bg-gradient-to-r from-[#988913] to-transparent rounded"></div>
                <span className="text-[#988913] text-sm font-medium ml-2">Instructor Portal</span>
              </div>
            </div>
            <div className="lg:hidden">
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              {/* <p className="text-[#988913] font-semibold">Instructor Portal</p> */}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Desktop Notification Bell and Contact Us */}
            <div className="hidden lg:flex items-center space-x-3">
              {/* Contact Us Button */}
              <button
                onClick={() => setShowContactModal(true)}
                className="p-3 text-gray-600 hover:text-white bg-gradient-to-r from-[#988913] to-[#887a11] hover:from-[#887a11] hover:to-[#776a0f] rounded-xl shadow-md hover:shadow-lg border border-[#988913]/30 transition-all duration-300 relative focus:outline-none focus:ring-2 focus:ring-[#988913] min-w-[48px] min-h-[48px] flex items-center justify-center group"
                title="Contact Us - Get Support"
              >
                <span className="text-xl text-white drop-shadow-sm group-hover:scale-110 transition-transform duration-200">📞</span>
              </button>

              {/* Notification Bell */}
              <button
                ref={notificationRef}
                onClick={() => {
                  console.log('🔔 Desktop notification bell clicked!', showNotifications);
                  setShowNotifications(!showNotifications);
                }}
                className="p-3 text-gray-600 hover:text-gray-800 bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 rounded-xl shadow-md hover:shadow-lg border border-gray-200 hover:border-[#988913]/30 transition-all duration-300 relative focus:outline-none focus:ring-2 focus:ring-[#988913] min-w-[48px] min-h-[48px] flex items-center justify-center group"
                title="Notifications"
              >
                {/* Desktop notification bell icon with course approval enhancement */}
                <FaBell className={`w-5 h-5 transition-all duration-200 group-hover:scale-110 ${notifications.filter(n => !n.isRead && (n.type === 'approval' || n.type === 'rejection')).length > 0
                  ? 'text-orange-600 animate-bounce'
                  : 'text-gray-600 group-hover:text-[#988913]'
                  }`} />

                {/* Enhanced notification badge with course approval indicator */}
                {(() => {
                  const unreadCount = notifications.filter(n => !n.isRead).length;
                  const courseApprovalCount = notifications.filter(n => !n.isRead && n.type === 'approval').length;
                  const courseRejectionCount = notifications.filter(n => !n.isRead && n.type === 'rejection').length;


                  if (unreadCount > 0) {
                    console.log('✅ BADGE SHOWING with count:', unreadCount);
                    return (
                      <div className="absolute -top-2 -right-2 flex flex-col items-center">
                        <div className={`w-6 h-6 text-white text-xs rounded-full border-2 border-white flex items-center justify-center font-bold z-10 shadow-lg ${courseApprovalCount > 0 ? 'bg-orange-500 animate-pulse' :
                          courseRejectionCount > 0 ? 'bg-orange-500 animate-pulse' :
                            'bg-red-500 animate-pulse'
                          }`}>
                          {unreadCount}
                        </div>
                        {(courseApprovalCount > 0 || courseRejectionCount > 0) && (
                          <div className="text-xs font-bold mt-1 text-orange-600">
                            📚
                          </div>
                        )}
                      </div>
                    );
                  }
                  console.log('❌ BADGE HIDDEN - No unread notifications');
                  return null;
                })()}
              </button>
            </div>

            {/* Enhanced Profile Dropdown with Golden Theme - Desktop Only */}
            <div className="relative hidden lg:block" ref={dropdownRef}>
              <button
                onClick={() => {
                  console.log('🔽 Profile dropdown clicked! Current state:', showProfileDropdown);
                  setShowProfileDropdown(!showProfileDropdown);
                  console.log('🔽 New dropdown state should be:', !showProfileDropdown);
                }}
                className="flex items-center space-x-2 bg-gradient-to-r from-[#988913]/10 via-yellow-50 to-amber-50 p-2 rounded-lg border border-[#988913]/30 hover:border-[#988913]/50 transition-all duration-300 hover:shadow-lg focus:outline-none group hover:scale-105"
                style={{ boxShadow: '0 2px 10px rgba(152, 137, 19, 0.1)' }}
                title="Profile Menu"
              >
                <div className="relative">
                  <AvatarWithFallback
                    src={instructorProfile.avatar}
                    alt={instructorProfile.name || 'Instructor'}
                    size="sm"
                    className="shadow-md ring-2 ring-[#988913]/20 transition-all duration-300 group-hover:ring-[#988913]/40"
                  />
                  {/* Online indicator */}
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white shadow-sm"></div>
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-xs font-bold text-gray-900 group-hover:text-[#887a11] transition-colors">
                    {instructorProfile.name ?
                      (instructorProfile.name.length > 12 ?
                        instructorProfile.name.substring(0, 12) + '...' :
                        instructorProfile.name
                      ) : 'Instructor'
                    }
                  </p>
                  <p className="text-xs text-[#988913] font-semibold">{instructorProfile.role || 'Instructor'}</p>
                </div>
                <ChevronDownIcon className={`w-3 h-3 text-[#988913] transition-all duration-300 group-hover:text-[#887a11] ${showProfileDropdown ? 'rotate-180 scale-110' : 'scale-100'}`} />

                {/* Badge indicator for unread notifications */}
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                )}
              </button>

              {/* Enhanced Dropdown Menu with Golden Theme and Better UX */}
              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-[#988913]/20 py-2 z-[9999] animate-fade-in overflow-hidden"
                  style={{
                    boxShadow: '0 20px 25px -5px rgba(152, 137, 19, 0.1), 0 10px 10px -5px rgba(152, 137, 19, 0.04)',
                    animation: 'fadeIn 0.3s ease-out'
                  }}>

                  {/* Profile Header */}
                  <div className="px-4 py-3 border-b border-[#988913]/10 bg-gradient-to-r from-[#988913]/5 to-amber-50/50">
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <AvatarWithFallback
                          src={instructorProfile.avatar}
                          alt={instructorProfile.name || 'Instructor'}
                          size="md"
                          className="ring-3 ring-[#988913]/30"
                        />
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white"></div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-sm">
                          {instructorProfile.name || 'Instructor Name'}
                        </h3>
                        <p className="text-[#988913] text-xs font-semibold">
                          {instructorProfile.role || 'Instructor'}
                        </p>
                        <p className="text-gray-500 text-xs">
                          ID: {instructorProfile.user_id || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Quick Profile Stats */}
                    <div className="mt-2 grid grid-cols-3 gap-1">
                      <div className="text-center bg-white/60 backdrop-blur-sm p-1 rounded border border-[#988913]/10">
                        <p className="text-sm font-bold text-[#988913]">{stats.totalCourses}</p>
                        <p className="text-xs text-[#887a11] font-medium">Courses</p>
                      </div>
                      <div className="text-center bg-white/60 backdrop-blur-sm p-1 rounded border border-emerald-200">
                        <p className="text-sm font-bold text-emerald-600">{stats.avgRating}</p>
                        <p className="text-xs text-emerald-500 font-medium">Rating</p>
                      </div>
                      <div className="text-center bg-white/60 backdrop-blur-sm p-1 rounded border border-blue-200">
                        <p className="text-sm font-bold text-blue-600">{stats.totalStudents}</p>
                        <p className="text-xs text-blue-500 font-medium">Students</p>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Menu Items */}
                  <div className="py-1">
                    {/* Profile menu items removed */}
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>
        {/* Stats Grid - 4 cards in responsive grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="My Courses"
            value={stats.totalCourses || 0}
            icon="📚"
            bgColor="bg-blue-100"
            iconColor="text-blue-600"
          />
          <StatCard
            title="Total Students"
            value={stats.totalStudents || 0}
            icon="👥"
            bgColor="bg-emerald-100"
            iconColor="text-emerald-600"

          />
          <StatCard
            title="Average Rating"
            value={stats.avgRating || 0}
            icon="⭐"
            bgColor="bg-purple-100"
            iconColor="text-purple-600"

          />
          <StatCard
            title="Completion Rate"
            value={stats.completionRate || 0}
            suffix="%"
            icon="📈"
            bgColor="bg-indigo-100"
            iconColor="text-indigo-600"

          />
        </div>

        {/* Recent Students - Full Width Row with Table, Filters, and Pagination */}
        <div className="mb-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Students Enrolled in Your Courses</h2>
              </div>
            </div>

            {/* Enrollment Status with Refresh Button */}
            <div className="mb-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${dashboardData?.recentStudents?.length > 0 ? 'bg-orange-500' : 'bg-yellow-500'}`}></div>
                    <span className="text-sm font-medium text-gray-700">
                      {dashboardData?.recentStudents?.length > 0 ?
                        `${dashboardData.recentStudents.length} students enrolled` :
                        'No students enrolled yet'
                      }
                    </span>
                  </div>
                  {/* Manual refresh button */}
                  <button
                    onClick={() => {
                      refreshStudentProgress();
                      refreshCourseStats();
                    }}
                    className="flex items-center space-x-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                    disabled={loading}
                  >
                    <svg className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Refresh</span>
                  </button>
                </div>
                <div className="text-xs text-gray-500">
                  Last updated: {new Date(lastProgressUpdate).toLocaleTimeString()}
                </div>
              </div>
            </div>

            {/* Filters and Search Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              {/* Search Input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#988913] focus:border-transparent"
                />
                <UsersIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              </div>

              {/* Status Filter */}
              <select
                value={studentFilter}
                onChange={(e) => {
                  setStudentFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#988913] focus:border-transparent bg-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#988913] focus:border-transparent bg-white"
              >
                <option value="recent">Recent</option>
                <option value="name">Name (A-Z)</option>
                <option value="progress">Progress</option>
                <option value="course">Course</option>
              </select>
            </div>

            {/* Table */}
            {getFilteredAndSortedStudents().length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Student</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Course</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Progress</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Enrolled Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {getPaginatedStudents().map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="relative">
                                <img
                                  src={student.avatar}
                                  alt={student.name}
                                  className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100"
                                  onError={(e) => {
                                    e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(student.name);
                                  }}
                                />
                                {student.status === 'active' && (
                                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white"></div>
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{student.name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm text-gray-700">{student.course}</p>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2 relative overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500 relative"
                                  style={{ width: `${student.progress}%` }}
                                >
                                  {/* Add animated progress indicator for active progress */}
                                  {student.progress > 0 && student.progress < 100 && (
                                    <div className="absolute top-0 right-0 w-1 h-full bg-white bg-opacity-50 animate-pulse"></div>
                                  )}
                                </div>
                                {/* Completion sparkle effect */}
                                {student.progress >= 100 && (
                                  <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-emerald-500 rounded-full animate-pulse"></div>
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className={`text-sm font-medium transition-colors ${student.progress >= 100 ? 'text-orange-600' :
                                  student.progress >= 75 ? 'text-blue-600' :
                                    student.progress >= 50 ? 'text-yellow-600' :
                                      student.progress > 0 ? 'text-orange-600' : 'text-gray-600'
                                  }`}>
                                  {student.progress}%
                                  {student.progress >= 100 && <span className="ml-1">🎉</span>}
                                </span>
                                {/* Show last activity indicator */}
                                {student.lastActivity && (
                                  <span className="text-xs text-gray-400">
                                    Active {new Date(student.lastActivity) > new Date(Date.now() - 24 * 60 * 60 * 1000) ? 'today' : 'recently'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm text-gray-600">{student.enrolledDate}</p>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${student.status === 'active'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-gray-100 text-gray-800'
                              }`}>
                              <span className={`w-2 h-2 rounded-full mr-1 ${student.status === 'active' ? 'bg-orange-400' : 'bg-gray-400'
                                }`}></span>
                              {student.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {getTotalPages() > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, getFilteredAndSortedStudents().length)} of {getFilteredAndSortedStudents().length} students
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                        className={`px-4 py-2 border rounded-lg text-sm font-medium transition-all ${currentPage === 1
                          ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-[#988913]'
                          }`}
                      >
                        Previous
                      </button>
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: getTotalPages() }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${currentPage === page
                              ? 'bg-gradient-to-r from-[#988913] to-[#887a11] text-white shadow-md'
                              : 'text-gray-700 hover:bg-gray-100'
                              }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={handleNextPage}
                        disabled={currentPage === getTotalPages()}
                        className={`px-4 py-2 border rounded-lg text-sm font-medium transition-all ${currentPage === getTotalPages()
                          ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-[#988913]'
                          }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">👥</div>
                <p>No enrolled students found</p>
                <p className="text-sm">
                  {searchQuery || studentFilter !== 'all'
                    ? 'Try adjusting your filters or search query'
                    : 'Students will appear here once they enroll in your courses'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Course Performance - Full Width Row */}
        <div className="mb-6">
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Enhanced Custom Styles */}
      <style>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 #f1f5f9;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #cbd5e1, #94a3b8);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #94a3b8, #64748b);
        }
        .gradient-text {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .animate-fade-in {
          animation: fadeIn 0.6s ease-in-out;
        }
        @keyframes fadeIn {
          from { 
            opacity: 0; 
            transform: translateY(20px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        .animate-slide-in {
          animation: slideIn 0.5s ease-out;
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-scale-in {
          animation: scaleIn 0.3s ease-out;
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .glass-effect {
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.18);
        }
        .shadow-glow {
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.15);
        }
        .hover-lift {
          transition: all 0.3s ease;
        }
        .hover-lift:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        .line-clamp-2 {
          overflow: hidden;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }
      `}</style>

      <div className="h-screen bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 flex overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Enhanced Sidebar */}
        <div className={`w-80 bg-white shadow-2xl border-r border-gray-100 flex flex-col h-full fixed lg:relative z-50 transform transition-all duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0`}>
          {/* Enhanced Logo Section with Golden Theme */}
          <div className="p-6 border-b border-[#988913]/20 flex-shrink-0 flex items-center justify-between bg-gradient-to-br from-[#988913] via-[#887a11] to-[#776a0f] relative overflow-hidden">
            {/* Golden pattern overlay */}
            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white bg-opacity-10 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white bg-opacity-10 rounded-full translate-y-12 -translate-x-12"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent"></div>
            </div>

            <div className="flex items-center space-x-3 relative z-10">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold bg-gradient-to-r from-[#988913] to-[#887a11] bg-clip-text text-transparent">L</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white drop-shadow-sm">Skill Wallah</h1>
                <p className="text-yellow-100 text-sm font-medium">Instructor Portal</p>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white hover:text-blue-100 p-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition-all duration-300 relative z-10"
            >
              <XIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Enhanced Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
            <div className="flex flex-col gap-[3px]">
              {menuItems.map((item, index) => (
                <MenuItem
                  key={index}
                  icon={item.icon}
                  label={item.label}
                  color={item.color}
                  isActive={activeMenuItem === item.key}
                  onClick={() => {
                    setActiveMenuItem(item.key);
                    setSidebarOpen(false);
                  }}
                />
              ))}
            </div>
          </nav>

          {/* Enhanced Quick Actions with Golden Theme */}
          <div className="p-6 border-t border-[#988913]/20 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50">
            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Removed logout button */}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Enhanced Mobile Header */}
          <div className="lg:hidden bg-white border-b border-gray-100 p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition-all duration-300"
              >
                <MenuIcon className="w-6 h-6" />
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-[#988913] to-[#887a11] rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-sm">L</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">{activeMenuItem}</h1>
                  <p className="text-xs text-[#988913]">Skill Wallah</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Mobile Contact Us and Notifications */}
              <div className="lg:hidden flex items-center space-x-2">
                {/* Mobile Contact Us Button */}
                <button
                  onClick={() => setShowContactModal(true)}
                  className="p-2 text-white bg-gradient-to-r from-[#988913] to-[#887a11] hover:from-[#887a11] hover:to-[#776a0f] rounded-xl shadow-sm hover:shadow-md transition-all duration-300 relative focus:outline-none focus:ring-2 focus:ring-[#988913] min-w-[40px] min-h-[40px] flex items-center justify-center group"
                  title="Contact Us"
                >
                  <span className="text-lg group-hover:scale-110 transition-transform duration-200">📞</span>
                </button>

                {/* Mobile Notification Bell */}
                <button
                  ref={mobileNotificationRef}
                  onClick={() => {
                    console.log('🔔 Mobile notification bell clicked!', showNotifications);
                    setShowNotifications(!showNotifications);
                  }}
                  className="p-2 text-gray-600 hover:text-gray-800 bg-white hover:bg-gray-50 rounded-xl shadow-sm hover:shadow-md border border-gray-200 transition-all duration-300 relative focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[40px] min-h-[40px] flex items-center justify-center"
                  title="Notifications"
                >
                  {/* Mobile notification bell icon with course approval enhancement */}
                  <FaBell className={`w-4 h-4 transition-all duration-200 ${notifications.filter(n => !n.isRead && (n.type === 'approval' || n.type === 'rejection')).length > 0
                    ? 'text-orange-600 animate-bounce'
                    : 'text-gray-600 hover:text-gray-800'
                    }`} />

                  {/* Enhanced mobile notification badge with course approval indicator */}
                  {(() => {
                    const unreadCount = notifications.filter(n => !n.isRead).length;
                    const courseApprovalCount = notifications.filter(n => !n.isRead && n.type === 'approval').length;
                    const courseRejectionCount = notifications.filter(n => !n.isRead && n.type === 'rejection').length;

                    if (unreadCount > 0) {
                      return (
                        <div className="absolute -top-2 -right-2 flex flex-col items-center">
                          <div className={`w-6 h-6 text-white text-xs rounded-full border-2 border-white flex items-center justify-center font-bold z-10 shadow-lg ${courseApprovalCount > 0 ? 'bg-orange-500 animate-pulse' :
                            courseRejectionCount > 0 ? 'bg-orange-500 animate-pulse' :
                              'bg-red-500 animate-pulse'
                            }`}>
                            {unreadCount}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </button>
              </div>

              {/* Mobile Profile Button with Dropdown */}
              <div className="relative" ref={mobileDropdownRef}>
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center space-x-2 bg-gradient-to-r from-[#988913]/10 to-amber-50 p-2 rounded-xl border border-[#988913]/20 hover:border-[#988913]/40 transition-all duration-300 focus:outline-none"
                >
                  <AvatarWithFallback
                    src={instructorProfile.avatar}
                    alt={instructorProfile.name || 'Instructor'}
                    size="sm"
                    className="border-2 border-[#988913]/30"
                  />
                  <div className="hidden sm:block">
                    <p className="text-sm font-semibold text-gray-900">
                      {instructorProfile.name ? instructorProfile.name.split(' ')[0] : 'Instructor'}
                    </p>
                    <p className="text-xs text-[#988913]">Instructor</p>
                  </div>
                  <ChevronDownIcon className={`w-4 h-4 text-[#988913] transition-transform duration-300 ${showProfileDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Mobile Profile Dropdown */}
                {showProfileDropdown && (
                  <>
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-[#988913]/20 py-2 z-50 animate-fade-in overflow-hidden">
                      {/* Profile Header */}
                      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-[#988913]/5 to-amber-50/50">
                        <div className="flex items-center space-x-3">
                          <AvatarWithFallback
                            src={instructorProfile.avatar}
                            alt={instructorProfile.name || 'Instructor'}
                            size="md"
                            className="ring-2 ring-[#988913]/30"
                          />
                          <div>
                            <h3 className="font-bold text-gray-900 text-sm">
                              {instructorProfile.name || 'Instructor Name'}
                            </h3>
                            <p className="text-[#988913] text-xs font-semibold">
                              {instructorProfile.role || 'Instructor'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        {/* Profile menu items removed */}
                      </div>

                      {/* Logout */}
                      <div className="border-t border-gray-100 pt-2">
                        {/* You can add logout button here if needed */}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Main Content Area with Golden Theme */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50">
            <div className="p-4 lg:p-8">
              <div className="animate-fade-in">
                {/* Always render content for selected menu item */}
                {renderActiveContent()}
              </div>
            </div>
          </div>
        </div>

        {/* Notification Dropdown - Rendered as Portal */}
        {showNotifications && <NotificationDropdown buttonRef={window.innerWidth >= 1024 ? notificationRef : mobileNotificationRef} />}

        {/* Contact Modal */}
        {showContactModal && <ContactModal />}
      </div>
    </>
  );
};

export default InstructorDashboard;