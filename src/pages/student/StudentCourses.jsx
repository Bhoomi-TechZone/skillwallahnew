import React, { useState, useEffect, useRef } from 'react';
import { courseService } from '../../services/courseService';
import branchStudentDashboardService from '../../services/branchStudentDashboardService';
import { getInstructorName, getCourseThumbnail, formatEnrollmentDate, getCourseId, getProgressPercentage } from '../../utils/courseUtils';

// Simple inline Badge component
const Badge = ({ children, className = '' }) => (
  <span className={className}>{children}</span>
);
const styles = `
  .course-card {
    transition: all 0.3s ease;
    border: 1px solid #e5e7eb;
    background-color: white;
  }
  .course-card:hover {
    transform: translateY(-2px);
    border-color: #7a6f10;
    box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.08);
    background-color: #f9fafb;
  }
  .btn-primary {
    background-color: #988913;
    color: white;
    transition: all 0.2s ease;
  }
  .btn-primary:hover {
    background-color: #7a6f10;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
  }
  .btn-secondary {
    background-color: #ffffff;
    color: #1f2937;
    border: 1px solid #e5e7eb;
    transition: all 0.2s ease;
  }
  .btn-secondary:hover {
    background-color: #e5e7eb;
    border-color: #7a6f10;
    transform: translateY(-1px);
  }
  .btn-continue {
    background: linear-gradient(to right, #988913, #7a6f10);
    color: white;
    transition: all 0.2s ease;
  }
  .btn-continue:hover {
    background: linear-gradient(to right, #7a6f10, #6b6f10);
    transform: scale(1.05);
    box-shadow: 0 4px 8px -2px rgba(0, 0, 0, 0.15);
  }
  .progress-bar {
    background: linear-gradient(to right, #988913, #7a6f10);
  }
  .badge-enrolled {
    background-color: #988913;
    color: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  .badge-completed {
    background-color: #10b981;
    color: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }
  .badge-level {
    background-color: rgba(229, 231, 235, 0.95);
    color: #1f2937;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  .badge-category {
    background-color: #f3f4f6;
    color: #6b7280;
  }
  .course-image-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, transparent 30%);
    height: 50%;
    pointer-events: none;
  }
  .badge-container {
    position: absolute;
    top: 8px;
    left: 50px;
    right: 8px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    z-index: 10;
  }
  @media (max-width: 640px) {
    .badge-container {
      top: 6px;
      left: 50px;
      right: 6px;
    }
  }
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #7a6f10 #f3f4f6;
  }
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f3f4f6;
    border-radius: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #7a6f10;
    border-radius: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #6b7280;
  }
  .animate-fade-in {
    animation: fadeIn 0.5s ease-in-out;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .social-share-button {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .social-share-button:hover {
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  }
  .social-share-button:active {
    transform: translateY(0) scale(0.95);
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}

const StudentCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true); // Changed to true for initial loading
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [viewMode, setViewMode] = useState('grid');
  const [totalCourses, setTotalCourses] = useState(0);
  const [categories, setCategories] = useState([]);
  const [levels, setLevels] = useState([]);
  const [error, setError] = useState(null);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Track initial load
  const [isFetchingProgress, setIsFetchingProgress] = useState(false); // Prevent duplicate progress fetches
  const [isFetchingCourses, setIsFetchingCourses] = useState(false); // Prevent duplicate course fetches
  const [sharedCourseLinkChecked, setSharedCourseLinkChecked] = useState(false); // Track if we've checked for shared link
  const [hasNewUpdates, setHasNewUpdates] = useState(false); // Show update notification
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false); // Control auto-refresh (disabled by default)

  // Use ref to prevent unnecessary re-renders
  const progressUpdateCountRef = useRef(0);
  const maxProgressUpdates = 1; // Only allow progress update once per page load
  const lastFetchedDataRef = useRef(null); // Store last fetched data to compare

  // DISABLED: User activity tracking - not needed without auto-refresh
  /*
  const lastUserActivityRef = useRef(Date.now());
  useEffect(() => {
    const updateActivity = () => {
      lastUserActivityRef.current = Date.now();
    };
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('keydown', updateActivity);
    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('keydown', updateActivity);
    };
  }, []);
  */

  // Load initial data - ONLY on component mount
  useEffect(() => {
    console.log('🚀 StudentCourses component mounted');

    fetchCourses();
    fetchCategories();
    fetchLevels();
    fetchEnrolledCourses();
  }, []); // Empty dependency array = run only once on mount

  // Listen for enrollment events to update the courses list
  useEffect(() => {
    const handleCourseEnrolled = () => {
      console.log('Course enrolled event received - refreshing enrolled courses');
      fetchEnrolledCourses();
    };

    const handleRefreshEnrolledCourses = () => {
      console.log('Refresh enrolled courses event received');
      fetchEnrolledCourses();
    };

    const handleStorageChange = (event) => {
      if (event.key === 'enrolledCourses') {
        console.log('localStorage enrolledCourses changed - refreshing');
        fetchEnrolledCourses();
      }
    };

    // Listen for multiple types of enrollment events
    window.addEventListener('courseEnrolled', handleCourseEnrolled);
    window.addEventListener('refreshEnrolledCourses', handleRefreshEnrolledCourses);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('courseEnrolled', handleCourseEnrolled);
      window.removeEventListener('refreshEnrolledCourses', handleRefreshEnrolledCourses);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Handle shared course links - check URL parameters for specific course to open
  // This effect should run ONLY ONCE after courses are initially loaded
  useEffect(() => {
    // Only run if we have courses loaded and haven't checked yet
    if (sharedCourseLinkChecked || isInitialLoad) {
      return;
    }

    const handleSharedCourseLink = async () => {
      // Check if there's a course parameter in the URL path
      const currentPath = window.location.pathname;
      const courseMatch = currentPath.match(/\/course\/([a-f0-9]+)/);

      if (courseMatch) {
        const sharedCourseId = courseMatch[1];
        console.log('🔗 Shared course link detected:', sharedCourseId);

        // First, check if the course is in enrolled courses
        const enrolledCourse = enrolledCourses.find(course =>
          getCourseId(course) === sharedCourseId ||
          course._id === sharedCourseId ||
          course.id === sharedCourseId
        );

        if (enrolledCourse) {
          console.log('✅ Found enrolled course, opening details:', enrolledCourse.title);
          await showCourseDetails(enrolledCourse);
        } else {
          // If not in enrolled courses, try to fetch the course details from API
          try {
            console.log('🔍 Course not enrolled, fetching from API...');
            const courseDetails = await courseService.getCourseById(sharedCourseId);
            if (courseDetails) {
              console.log('✅ Found course details, opening modal:', courseDetails.title);
              await showCourseDetails(courseDetails);
            }
          } catch (error) {
            console.error('❌ Could not find course:', error);
            setError(`Course not found or not accessible. Please check if you're enrolled in this course.`);
          }
        }
      }

      // Mark as checked so we don't run again
      setSharedCourseLinkChecked(true);
    };

    // Only run if we have enrolled courses data
    if (enrolledCourses.length >= 0) {
      handleSharedCourseLink();
    }
  }, [isInitialLoad]); // Only depend on isInitialLoad, not enrolledCourses

  // Helper function to check if course data has actually changed
  const hasDataChanged = (newData, oldData) => {
    if (!oldData || !newData) return true;
    if (newData.length !== oldData.length) return true;

    // Compare each course's key properties
    for (let i = 0; i < newData.length; i++) {
      const newCourse = newData[i];
      const oldCourse = oldData[i];

      // Check if any important fields changed
      if (
        newCourse._id !== oldCourse._id ||
        newCourse.title !== oldCourse.title ||
        newCourse.progress !== oldCourse.progress ||
        newCourse.completedModules !== oldCourse.completedModules ||
        newCourse.totalModules !== oldCourse.totalModules
      ) {
        return true;
      }
    }

    return false; // No changes detected
  };

  // Helper function to fetch progress in background (non-blocking)
  const fetchProgressInBackground = async (coursesData) => {
    // Prevent duplicate fetches
    if (isFetchingProgress) {
      console.log('⏭️ Progress fetch already in progress, skipping...');
      return;
    }

    // Check if we've already updated progress (prevent loops)
    if (progressUpdateCountRef.current >= maxProgressUpdates) {
      console.log('⏭️ Progress already updated, skipping to prevent loops...');
      return;
    }

    setIsFetchingProgress(true);
    progressUpdateCountRef.current += 1;
    console.log('🔄 Fetching progress updates in background... (attempt', progressUpdateCountRef.current, ')');

    try {
      const coursesWithUpdatedProgress = await Promise.all(
        coursesData.map(async (course) => {
          try {
            const progressData = await courseService.getCourseProgress(course._id);
            const progressValue = progressData?.progress ||
              progressData?.completion_percentage ||
              progressData?.stats?.completion_percentage ||
              course.progress || 0;

            return {
              ...course,
              progress: Math.round(progressValue),
              completedModules: progressData?.completed_modules || course.completedModules || 0,
              totalModules: progressData?.total_modules || course.totalModules || 0,
              lastAccessedModule: progressData?.last_accessed_module || course.lastAccessedModule,
              lastAccessedAt: progressData?.last_accessed_at || course.lastAccessedAt
            };
          } catch (error) {
            console.warn(`⚠️ Could not fetch progress for ${course.title}:`, error.message);
            return course; // Return course as-is if progress fetch fails
          }
        })
      );

      // Check if data actually changed before updating state
      const currentCourses = lastFetchedDataRef.current || enrolledCourses;
      if (!hasDataChanged(coursesWithUpdatedProgress, currentCourses)) {
        console.log('📋 No changes detected in progress data, skipping update');
        return;
      }

      // Update state with refreshed progress only if there are changes
      console.log('✅ Progress data has changed, updating...');
      setEnrolledCourses(coursesWithUpdatedProgress);
      localStorage.setItem('enrolledCourses', JSON.stringify(coursesWithUpdatedProgress));
      lastFetchedDataRef.current = coursesWithUpdatedProgress; // Update ref
      console.log('✅ Progress data updated in background');
    } catch (error) {
      console.warn('⚠️ Background progress update failed:', error);
    } finally {
      setIsFetchingProgress(false);
    }
  };

  // Fetch enrolled courses for current user from API and sync with localStorage
  const fetchEnrolledCourses = async () => {
    // Prevent duplicate fetches
    if (isFetchingCourses) {
      console.log('⏭️ Course fetch already in progress, skipping...');
      return;
    }

    try {
      setIsFetchingCourses(true);
      setLoading(true);
      console.log('🔍 Fetching enrolled courses...');

      // Check if this is a branch student
      const isBranchStudent = branchStudentDashboardService.isBranchStudent();
      console.log('🎓 [StudentCourses] Is branch student:', isBranchStudent);

      if (isBranchStudent) {
        console.log('🏢 [StudentCourses] Fetching branch student courses...');

        try {
          const branchData = await branchStudentDashboardService.getEnrolledCourses();
          const courses = branchData.courses || [];
          console.log('✅ [StudentCourses] Branch courses loaded:', courses);

          // Transform branch course data to match expected structure
          const transformedCourses = courses.map(course => ({
            _id: course.id || course._id,
            id: course.id || course._id,
            title: course.title,
            name: course.title,
            description: course.description,
            instructor: course.instructor,
            progress: course.progress || 0,
            status: course.status,
            enrolled_at: course.enrolled_at,
            branch_code: course.branch_code,
            franchise_code: course.franchise_code
          }));

          setEnrolledCourses(transformedCourses);
          setTotalCourses(transformedCourses.length);
          setLoading(false);
          setIsInitialLoad(false);

          console.log(`✅ [StudentCourses] Processed ${transformedCourses.length} branch courses`);
          return;

        } catch (branchError) {
          console.error('❌ [StudentCourses] Failed to fetch branch courses:', branchError);
          // Fall back to regular course fetching
        }
      }

      // OPTIMIZATION 1: Load cached data first for instant display (regular students)
      const cachedCoursesStr = localStorage.getItem('enrolledCourses');
      if (cachedCoursesStr) {
        try {
          const cachedCourses = JSON.parse(cachedCoursesStr);
          if (cachedCourses && Array.isArray(cachedCourses) && cachedCourses.length > 0) {
            console.log('⚡ Showing cached courses immediately:', cachedCourses.length);
            const validCachedCourses = cachedCourses.filter(course =>
              course && (course._id || course.id) && course.title
            );
            setEnrolledCourses(validCachedCourses);
            setTotalCourses(validCachedCourses.length);
            setLoading(false);
            setIsInitialLoad(false);
            lastFetchedDataRef.current = validCachedCourses; // Initialize ref with cached data
          }
        } catch (parseError) {
          console.warn('⚠️ Failed to parse cached courses:', parseError);
        }
      }

      // OPTIMIZATION 2: Fetch fresh data from API (without blocking UI)
      try {
        console.log('🌐 Calling API: courseService.getEnrolledCourses()');
        const apiCourses = await courseService.getEnrolledCourses();
        console.log('📦 API Response:', apiCourses);

        if (apiCourses && apiCourses.courses && Array.isArray(apiCourses.courses)) {
          const courses = apiCourses.courses;
          console.log(`✅ Found ${courses.length} enrolled courses from API`);

          // OPTIMIZATION 3: Display courses immediately with progress from API
          const coursesWithBasicInfo = await Promise.all(courses.map(async (course) => {
            const courseId = course._id || course.id || course.course_id;
            console.log(`📚 Processing course: ${course.title} (ID: ${courseId})`);

            // Try to get progress from API immediately
            let progressData = null;
            try {
              progressData = await courseService.getCourseProgress(courseId);
              console.log(`📊 Progress for ${course.title}:`, progressData);
            } catch (error) {
              console.warn(`⚠️ Could not fetch progress for ${course.title}:`, error.message);
            }

            // Extract progress values from various possible locations
            const progress = progressData?.progress ||
              progressData?.completion_percentage ||
              progressData?.stats?.completion_percentage ||
              course.progress ||
              course.completion_percentage ||
              0;

            const completedModules = progressData?.completed_modules ||
              progressData?.completed_content ||
              course.completedModules ||
              course.completed_modules ||
              0;

            const totalModules = progressData?.total_modules ||
              progressData?.total_content ||
              course.totalModules ||
              course.total_modules ||
              0;

            return {
              ...course,
              _id: courseId,
              enrolledDate: course.enrolledDate || course.enrollment_date || new Date().toISOString(),
              progress: Math.round(progress),
              completedModules: completedModules,
              totalModules: totalModules,
              lastAccessedModule: progressData?.last_accessed_module || course.lastAccessedModule,
              lastAccessedAt: progressData?.last_accessed_at || course.lastAccessedAt
            };
          }));

          const validCourses = coursesWithBasicInfo.filter(course =>
            course && course._id && course.title
          );

          // Check if API data is different from current state
          const currentCourses = enrolledCourses.length > 0 ? enrolledCourses :
            (cachedCoursesStr ? JSON.parse(cachedCoursesStr) : []);

          if (!hasDataChanged(validCourses, currentCourses)) {
            console.log('📋 No changes in API data, keeping current display');
            setIsInitialLoad(false);
            setLoading(false);
            return; // Don't update if data hasn't changed
          }

          // Update UI with progress-loaded courses
          console.log('✅ New data detected with progress, updating display');
          setEnrolledCourses(validCourses);
          setTotalCourses(validCourses.length);
          localStorage.setItem('enrolledCourses', JSON.stringify(validCourses));
          console.log('✅ Showing', validCourses.length, 'courses from API with progress data');
          setIsInitialLoad(false);
          setLoading(false);

          // Store reference to this data for future comparisons
          lastFetchedDataRef.current = validCourses;

          return;
        }
      } catch (apiError) {
        console.warn('⚠️ API fetch failed:', apiError.message);
      }

      // Fallback to localStorage if API fails
      const enrolledCoursesFromStorage = localStorage.getItem('enrolledCourses');
      console.log('📦 Falling back to localStorage data:', enrolledCoursesFromStorage);

      if (enrolledCoursesFromStorage) {
        try {
          const parsedCourses = JSON.parse(enrolledCoursesFromStorage);
          console.log('📝 Parsed courses from localStorage:', parsedCourses);

          // Ensure each course has required fields and normalize IDs
          const validCourses = parsedCourses.filter(course => {
            const hasId = course && (course._id || course.id || course.course_id);
            const hasTitle = course && course.title;
            if (!hasId || !hasTitle) {
              console.warn('⚠️ Filtering out invalid course:', course);
            }
            return hasId && hasTitle;
          }).map(course => {
            // Normalize course data structure
            const courseId = course._id || course.id || course.course_id;
            return {
              ...course,
              id: courseId,
              _id: courseId,
              course_id: courseId,
              // Ensure enrollment date exists
              enrolledDate: course.enrolledDate || course.enrolled_at || new Date().toISOString(),
              progress: course.progress || 0
            };
          });

          console.log('✅ Valid courses after processing:', validCourses.length, validCourses);

          if (validCourses.length > 0) {
            setEnrolledCourses(validCourses);
            setTotalCourses(validCourses.length);
            console.log('✅ Enrolled courses loaded from localStorage:', validCourses);
            console.log('📊 Total enrolled courses:', validCourses.length);
          } else {
            console.log('📋 No valid courses found in localStorage');
            setEnrolledCourses([]);
            setTotalCourses(0);
          }

          if (validCourses.length !== parsedCourses.length) {
            console.warn('⚠️ Some courses were filtered out due to missing required fields');
            // Update localStorage with cleaned data
            localStorage.setItem('enrolledCourses', JSON.stringify(validCourses));
          }
        } catch (parseError) {
          console.error('❌ Error parsing enrolled courses from localStorage:', parseError);
          setEnrolledCourses([]);
          setTotalCourses(0);
        }
      } else {
        console.log('💭 No enrolled courses found in localStorage - setting empty state');
        setEnrolledCourses([]);
        setTotalCourses(0);
      }
    } catch (error) {
      console.error('❌ Error loading enrolled courses:', error);
      console.error('Error details:', error.message);
      setEnrolledCourses([]);
      setTotalCourses(0);
    } finally {
      setIsInitialLoad(false); // Mark initial load as complete
      setLoading(false); // Always stop loading when done
      setIsFetchingCourses(false); // Reset fetch flag
    }
  };

  // Fetch all published courses - DISABLED for now, only show enrolled courses
  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);

      // Don't fetch courses from API - only show enrolled courses
      console.log('📭 Not fetching courses from API - only showing enrolled courses');
      setCourses([]);
      setTotalCourses(0);

    } catch (error) {
      console.error('Error fetching courses:', error);
      setError('Failed to load courses: ' + error.message);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await courseService.getCategories();
      setCategories(response || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Fetch levels
  const fetchLevels = async () => {
    try {
      const response = await courseService.getLevels();
      setLevels(response || ['Beginner', 'Intermediate', 'Advanced']);
    } catch (error) {
      console.error('Error fetching levels:', error);
      setLevels(['Beginner', 'Intermediate', 'Advanced']);
    }
  };

  // Show course details
  const showCourseDetails = async (course) => {
    try {
      setLoading(true);
      const detailedCourse = await courseService.getCourseById(course._id || course.id);

      // Try to get course statistics
      try {
        const stats = await courseService.getCourseStatistics(course._id || course.id);
        detailedCourse.statistics = stats;
      } catch (statsError) {
        console.log('No statistics available for this course');
      }

      setSelectedCourse(detailedCourse);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error loading course details:', error);
      setError('Failed to load course details: ' + error.message);
      setSelectedCourse(course);
      setShowDetailsModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Handle enrollment - enrolls student in course and adds to "My Courses"
  const handleEnrollCourse = async (courseId) => {
    try {
      setLoading(true);

      // Call the enrollment API
      const enrollmentResult = await courseService.enrollInCourse(courseId, {
        paymentMethod: 'free',
        amount: 0
      });

      console.log('Enrollment successful:', enrollmentResult);

      // Find the enrolled course
      const enrolledCourse = courses.find(course => course._id === courseId || course.id === courseId);

      if (enrolledCourse) {
        // Add to enrolled courses list
        setEnrolledCourses(prev => [...prev, enrolledCourse]);

        // Save to localStorage for persistence
        const existingEnrolledCourses = JSON.parse(localStorage.getItem('enrolledCourses') || '[]');
        const updatedEnrolledCourses = [...existingEnrolledCourses, {
          ...enrolledCourse,
          id: enrolledCourse._id || enrolledCourse.id,
          enrolledDate: new Date().toISOString(),
          progress: 0
        }];
        localStorage.setItem('enrolledCourses', JSON.stringify(updatedEnrolledCourses));

        // Trigger custom event to update MyCourses component
        window.dispatchEvent(new CustomEvent('courseEnrolled'));

        // Update the courses list to reflect enrollment status
        setCourses(prev => prev.map(course =>
          (course._id === courseId || course.id === courseId)
            ? { ...course, isEnrolled: true }
            : course
        ));
      }

      // Show success message
      alert('Successfully enrolled in the course! You can now access it from "My Courses".');

      // Close modal if open
      if (showDetailsModal) {
        setShowDetailsModal(false);
      }

    } catch (error) {
      console.error('Error enrolling in course:', error);
      setError('Failed to enroll in course: ' + error.message);
      alert('Enrollment failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter enrolled courses based on search
  const filteredCourses = enrolledCourses.filter(course => {
    const matchesSearch = !searchTerm ||
      course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getInstructorName(course.instructor, course.instructor_name, '').toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  // Calculate pagination based on enrolled courses
  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);

  // Get current page courses for display
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageCourses = filteredCourses.slice(startIndex, endIndex);

  // Log filtering results (after all variables are defined)
  useEffect(() => {
    console.log('📊 Filtering Results:');
    console.log('  - Total enrolled courses:', enrolledCourses.length);
    console.log('  - After filtering:', filteredCourses.length);
    console.log('  - Search term:', searchTerm || 'none');
    console.log('  - Courses to display:', currentPageCourses.length);
  }, [enrolledCourses.length, filteredCourses.length, searchTerm, currentPageCourses.length]);

  const CourseCard = ({ course }) => {
    // Debug: Log course progress data
    console.log(`🎴 CourseCard for "${course.title}":`, {
      progress: course.progress,
      completedModules: course.completedModules,
      totalModules: course.totalModules,
      progressPercentage: getProgressPercentage(course.progress)
    });

    return (
      <div className="course-card rounded-lg overflow-hidden animate-fade-in">
        <div className="relative">
          <img
            src={getCourseThumbnail(course)}
            alt={course.title}
            className="w-full h-40 object-cover"
          />
          {/* Subtle gradient overlay for better text readability */}
          <div className="course-image-overlay"></div>

          {/* Improved badge positioning */}
          <div className="badge-container">
            <div className="flex gap-2">
              <Badge className="badge-enrolled text-xs sm:text-sm px-2 py-1 rounded-full font-semibold">
                {course.progress >= 100 ? '✅ COMPLETED' : 'ENROLLED'}
              </Badge>
              {course.progress > 0 && course.progress < 100 && (
                <Badge className="bg-blue-500 text-white text-xs sm:text-sm px-2 py-1 rounded-full font-semibold">
                  {getProgressPercentage(course.progress)}% IN PROGRESS
                </Badge>
              )}
            </div>
            <Badge className="badge-level text-xs sm:text-sm px-2 py-1 rounded-full font-medium">
              {course.level || 'Beginner'}
            </Badge>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium badge-category">{course.category || 'General'}</span>
            <div className="flex items-center text-yellow-500">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">
                {course.rating ? course.rating.toFixed(1) : '4.5'}
              </span>
            </div>
          </div>

          <h3 className="text-base font-semibold text-gray-900 mb-1 line-clamp-2">{course.title}</h3>
          <p className="text-xs text-gray-600 mb-2 line-clamp-2">{course.description}</p>

          <div className="flex items-center mb-2 text-xs text-gray-500">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>{getInstructorName(course.instructor, course.instructor_name)}</span>
            <span className="mx-2">•</span>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4M8 7l4 7 4-7M8 7H7a1 1 0 00-1 1v9a1 1 0 001 1h10a1 1 0 001-1V8a1 1 0 00-1-1h-1" />
            </svg>
            <span>Enrolled: {formatEnrollmentDate(course.enrolledDate)}</span>
          </div>

          {/* Progress Bar */}
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Progress</span>
              <span className={`font-semibold ${getProgressPercentage(course.progress) >= 100 ? 'text-orange-600' :
                getProgressPercentage(course.progress) >= 75 ? 'text-blue-600' :
                  getProgressPercentage(course.progress) >= 50 ? 'text-yellow-600' :
                    'text-[#988913]'
                }`}>
                {getProgressPercentage(course.progress) >= 100 ? '✓ ' : ''}{getProgressPercentage(course.progress)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${getProgressPercentage(course.progress) >= 100
                  ? 'bg-gradient-to-r from-orange-400 to-orange-500 animate-pulse'
                  : getProgressPercentage(course.progress) >= 75
                    ? 'bg-gradient-to-r from-blue-400 to-blue-500'
                    : getProgressPercentage(course.progress) >= 50
                      ? 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                      : 'progress-bar'
                  }`}
                style={{ width: `${getProgressPercentage(course.progress)}%` }}
              ></div>
            </div>
            {/* Show module completion details if available */}
            {course.completedModules !== undefined && course.totalModules !== undefined && course.totalModules > 0 && (
              <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                <span>{course.completedModules} of {course.totalModules} modules completed</span>
                {course.lastAccessedAt && (
                  <span className="text-gray-400">
                    Last accessed: {new Date(course.lastAccessedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => showCourseDetails(course)}
              className="btn-secondary flex items-center justify-center px-4 py-2 text-sm rounded-lg font-medium hover:shadow-lg transition-all duration-300"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>📋 View Course Details</span>
            </button>

            {/* Dynamic Learning Button based on progress */}
            {getProgressPercentage(course.progress) === 0 ? (
              <button
                onClick={() => {
                  window.location.href = `/course-content/${getCourseId(course)}`;
                }}
                className="btn-continue flex items-center justify-center px-4 py-2 text-sm rounded-lg font-bold"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1M9 10h1m4 0h1M9 10V9a3 3 0 116 0v1m-7 4a3 3 0 006 0m-3 3V9" />
                </svg>
                🚀 Let's Start Learning!
              </button>
            ) : getProgressPercentage(course.progress) >= 100 ? (
              <button
                onClick={() => {
                  window.location.href = `/course-content/${getCourseId(course)}`;
                }}
                className="btn-continue flex items-center justify-center px-4 py-2 text-sm rounded-lg font-bold"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ✅ Review Course (Completed)
              </button>
            ) : (
              <button
                onClick={() => {
                  const progressUrl = `/course-content/${getCourseId(course)}?continue=true`;
                  window.location.href = progressUrl;
                }}
                className="btn-primary flex items-center justify-center px-4 py-2 text-sm rounded-lg font-semibold"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Continue Learning ({getProgressPercentage(course.progress)}%)
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      {/* Debug Info Panel - Only show after initial load is complete */}
      {!isInitialLoad && enrolledCourses.length === 0 && !loading && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                {/* <p className="text-sm font-medium text-blue-800">
                  No enrolled courses found in API or localStorage
                </p> */}
                {/* <p className="text-sm text-blue-600 mt-1">
                  Open the browser console (F12) to see detailed logs. The component tries to load from the API first, then falls back to localStorage if needed.
                </p> */}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Notification Banner */}
      {hasNewUpdates && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 py-3 animate-fade-in">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-orange-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-800">
                  ✨ Course updates detected! Your courses have been refreshed with the latest data.
                </p>
              </div>
              <button
                onClick={() => setHasNewUpdates(false)}
                className="text-orange-600 hover:text-orange-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b border-[#e5e7eb]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#1f2937]">My Enrolled Courses</h1>
              <p className="mt-1 text-[#6b7280]">Access your enrolled courses and continue learning</p>
            </div>

            {/* Navigate to Browse Courses Button */}
            <div className="mt-4 md:mt-0">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('navigateToBrowseCourses'))}
                className="btn-primary inline-flex items-center px-4 py-2 text-white font-semibold rounded-lg shadow"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Find More Courses
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Summary Section - Only show after initial load */}
        {!isInitialLoad && enrolledCourses.length > 0 && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Courses</p>
                  <p className="text-2xl font-bold text-[#988913]">{enrolledCourses.length}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-[#988913]">
                    {enrolledCourses.filter(c => getProgressPercentage(c.progress) > 0 && getProgressPercentage(c.progress) < 100).length}
                  </p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {enrolledCourses.filter(c => getProgressPercentage(c.progress) >= 100).length}
                  </p>
                </div>
                <div className="bg-orange-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Not Started</p>
                  <p className="text-2xl font-bold text-gray-600">
                    {enrolledCourses.filter(c => getProgressPercentage(c.progress) === 0).length}
                  </p>
                </div>
                <div className="bg-gray-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg animate-fade-in">
            {error}
          </div>
        )}

        {loading && isInitialLoad && (
          <div className="flex flex-col justify-center items-center py-12">
            <LoadingSpinner size="large" color="#988913" />
            <p className="mt-4 text-gray-600 text-lg">Loading your enrolled courses...</p>
            <p className="mt-2 text-gray-500 text-sm">Please wait while we fetch your courses from the server</p>
          </div>
        )}

        {!loading && !isInitialLoad && filteredCourses.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto animate-fade-in">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-semibold text-[#1f2937] mb-4">No enrolled courses yet</h3>
              <p className="text-[#6b7280] mb-6">You haven't enrolled in any courses yet. Start your learning journey by browsing and enrolling in courses that interest you.</p>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('navigateToBrowseCourses'))}
                className="btn-primary inline-block py-3 px-6 text-white font-semibold rounded-lg shadow"
              >
                Browse Courses
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Results Summary */}
            <div className="mb-6 flex items-center justify-between">
              <p className="text-[#6b7280]">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredCourses.length)} of {filteredCourses.length} enrolled courses
              </p>
            </div>

            {/* Course Grid */}
            <div className={`grid gap-6 ${viewMode === 'grid'
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1'
              }`}>
              {currentPageCourses.map((course) => (
                <CourseCard key={course._id || course.id} course={course} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  activeColor="#988913"
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Course Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title={
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-800">📚 Course Details</span>
          </div>
        }
        size="xlarge"
      >
        {selectedCourse && (
          <div className="space-y-6">
            {/* Header Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <img
                  src={getCourseThumbnail(selectedCourse)}
                  alt={selectedCourse.title}
                  className="w-full h-64 object-cover rounded-lg shadow-lg"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl font-bold text-[#1f2937]">{selectedCourse.title}</h3>
                  <p className="text-[#6b7280] mt-2 leading-relaxed">{selectedCourse.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-[#6b7280] font-medium">Category</span>
                    <p className="font-semibold text-[#1f2937]">{selectedCourse.category}</p>
                  </div>
                  <div>
                    <span className="text-sm text-[#6b7280] font-medium">Instructor</span>
                    <p className="font-semibold text-[#1f2937]">
                      {getInstructorName(selectedCourse.instructor, selectedCourse.instructor_name)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-[#6b7280] font-medium">Level</span>
                    <p className="font-semibold text-[#1f2937]">{selectedCourse.level}</p>
                  </div>
                  <div>
                    <span className="text-sm text-[#6b7280] font-medium">Duration</span>
                    <p className="font-semibold text-[#1f2937]">{selectedCourse.duration || 'Self-paced'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-[#6b7280] font-medium">Language</span>
                    <p className="font-semibold text-[#1f2937]">{selectedCourse.language || 'English'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-[#6b7280] font-medium">Students</span>
                    <p className="font-semibold text-[#1f2937]">{selectedCourse.enrolled_students || 0} enrolled</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <Badge className="badge-enrolled">Published</Badge>
                  {selectedCourse.rating && selectedCourse.rating > 0 && (
                    <div className="flex items-center text-yellow-500">
                      <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="font-medium">{selectedCourse.rating.toFixed(1)}</span>
                      <span className="text-sm text-[#6b7280] ml-1">({selectedCourse.total_ratings || 0} reviews)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Course Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#f3f4f6] p-4 rounded-lg border border-[#e5e7eb]">
                <h4 className="text-sm font-medium text-[#6b7280] mb-1">Enrolled Students</h4>
                <p className="text-2xl font-bold text-[#988913]">{selectedCourse.enrolled_students || 0}</p>
              </div>
              <div className="bg-[#f3f4f6] p-4 rounded-lg border border-[#e5e7eb]">
                <h4 className="text-sm font-medium text-[#6b7280] mb-1">Price</h4>
                <p className="text-2xl font-bold text-[#988913]">
                  {selectedCourse.price === 0 ? 'FREE' : `$${selectedCourse.price}`}
                </p>
                {selectedCourse.original_price && selectedCourse.original_price > selectedCourse.price && (
                  <p className="text-sm text-[#6b7280] line-through">${selectedCourse.original_price}</p>
                )}
              </div>
              <div className="bg-[#f3f4f6] p-4 rounded-lg border border-[#e5e7eb]">
                <h4 className="text-sm font-medium text-[#6b7280] mb-1">Lessons</h4>
                <p className="text-2xl font-bold text-[#988913]">{selectedCourse.lessons || 0}</p>
              </div>
              <div className="bg-[#f3f4f6] p-4 rounded-lg border border-[#e5e7eb]">
                <h4 className="text-sm font-medium text-[#6b7280] mb-1">Rating</h4>
                <p className="text-2xl font-bold text-[#988913]">
                  {selectedCourse.rating ? selectedCourse.rating.toFixed(1) : '4.5'}
                </p>
              </div>
            </div>

            {/* Course Preview/What You'll Learn */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h4 className="text-lg font-semibold text-[#1f2937] mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                What You'll Learn
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedCourse.learning_objectives || selectedCourse.objectives ? (
                  (selectedCourse.learning_objectives || selectedCourse.objectives).map((objective, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <svg className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-gray-700">{objective}</span>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex items-start space-x-2">
                      <svg className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-gray-700">Master the core concepts and fundamentals</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <svg className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-gray-700">Build practical, real-world projects</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <svg className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-gray-700">Gain industry-relevant skills</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <svg className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-gray-700">Apply knowledge through hands-on exercises</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Tags */}
            {selectedCourse.tags && selectedCourse.tags.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-[#1f2937] mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Course Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedCourse.tags.map((tag, index) => (
                    <span key={index} className="px-3 py-1 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 text-sm rounded-full border border-purple-200 hover:from-purple-200 hover:to-blue-200 transition-all duration-200">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Social Media Sharing */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border border-gray-200">
              <h4 className="text-lg font-semibold text-[#1f2937] mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                Share this Course
              </h4>
              <p className="text-gray-600 text-sm mb-4">Help others discover this amazing course!</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(() => {
                  // Generate specific course URL for sharing
                  const courseId = getCourseId(selectedCourse);
                  const courseShareUrl = `http://localhost:4000/assignments/student/my-assignments/${student_Id}`;
                  const shareText = `Check out this amazing course: ${selectedCourse.title}`;

                  return (
                    <>
                      {/* Facebook Share */}
                      <button
                        onClick={() => {
                          const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(courseShareUrl)}&quote=${encodeURIComponent(shareText)}`;
                          window.open(url, '_blank', 'width=600,height=400');
                        }}
                        className="social-share-button flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                        <span className="text-sm font-medium">Facebook</span>
                      </button>

                      {/* Twitter Share */}
                      <button
                        onClick={() => {
                          const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(courseShareUrl)}`;
                          window.open(url, '_blank', 'width=600,height=400');
                        }}
                        className="social-share-button flex items-center justify-center space-x-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-3 rounded-lg"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                        </svg>
                        <span className="text-sm font-medium">Twitter</span>
                      </button>

                      {/* LinkedIn Share */}
                      <button
                        onClick={() => {
                          const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(courseShareUrl)}`;
                          window.open(url, '_blank', 'width=600,height=400');
                        }}
                        className="social-share-button flex items-center justify-center space-x-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-3 rounded-lg"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                        </svg>
                        <span className="text-sm font-medium">LinkedIn</span>
                      </button>

                      {/* WhatsApp Share */}
                      <button
                        onClick={() => {
                          const text = `${shareText} - ${courseShareUrl}`;
                          const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
                          window.open(url, '_blank');
                        }}
                        className="social-share-button flex items-center justify-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-lg"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                        </svg>
                        <span className="text-sm font-medium">WhatsApp</span>
                      </button>
                    </>
                  );
                })()}
              </div>

              {/* Copy Link Button */}
              <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={`http://localhost:4000/course/${getCourseId(selectedCourse)}`}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => {
                      const courseShareUrl = `http://localhost:4000/course/${getCourseId(selectedCourse)}`;
                      navigator.clipboard.writeText(courseShareUrl).then(() => {
                        alert('Course link copied to clipboard!');
                      }).catch(() => {
                        alert('Failed to copy link. Please copy it manually.');
                      });
                    }}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors duration-200 flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Copy</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-[#e5e7eb]">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200"
              >
                Close
              </button>

              <div className="flex space-x-3">
                {(() => {
                  const isEnrolled = enrolledCourses.some(enrolled =>
                    enrolled._id === selectedCourse._id || enrolled.id === selectedCourse.id || enrolled.course_id === selectedCourse._id
                  ) || selectedCourse.isEnrolled;

                  return isEnrolled ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setShowDetailsModal(false);
                          // Navigate to the specific course
                          const courseId = getCourseId(selectedCourse);
                          window.location.href = `/course-content/${courseId}`;
                        }}
                        className="px-6 py-2 bg-[#988913] hover:bg-[#7a6f10] text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1M9 10h1m4 0h1M9 10V9a3 3 0 116 0v1m-7 4a3 3 0 006 0m-3 3V9" />
                        </svg>
                        <span>Start Learning</span>
                      </button>
                      <span className="px-6 py-2 bg-[#6b7280] text-white rounded-lg cursor-not-allowed flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Enrolled</span>
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEnrollCourse(selectedCourse._id || selectedCourse.id)}
                      className="btn-primary px-6 py-2 text-white rounded-lg flex items-center space-x-2"
                      disabled={loading}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>{loading ? 'Enrolling...' : 'Enroll Now'}</span>
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StudentCourses;