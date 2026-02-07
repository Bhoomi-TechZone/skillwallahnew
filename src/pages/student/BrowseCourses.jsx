import React, { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  AdjustmentsHorizontalIcon,
  StarIcon,
  ClockIcon,
  BookOpenIcon,
  AcademicCapIcon,
  CurrencyDollarIcon,
  EyeIcon,
  UserPlusIcon,
  HeartIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  ShareIcon,
  LinkIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import courseService from '../../services/courseService';
import paymentServices from '../../services/paymentServices';

const BrowseCourses = () => {
  const [allCourses, setAllCourses] = useState([]); // Store all courses from API
  const [courses, setCourses] = useState([]); // Store filtered courses for display
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: 'All Categories',
    level: 'All Levels',
    price: 'All Prices'
  });
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [wishlistedCourses, setWishlistedCourses] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState(new Set());
  const [processingCourseIds, setProcessingCourseIds] = useState(new Set());
  const [processingTimeouts, setProcessingTimeouts] = useState(new Map());
  const [paymentError, setPaymentError] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showCourseCard, setShowCourseCard] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareSelectedCourse, setShareSelectedCourse] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const coursesPerPage = 12;

  // Helper function to set processing state with timeout
  const setProcessingWithTimeout = (courseId, timeoutMs = 30000) => {
    // Set processing state
    setProcessingCourseIds(prev => new Set([...prev, courseId]));

    // Clear any existing timeout for this course
    const existingTimeout = processingTimeouts.get(courseId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeoutId = setTimeout(() => {
      console.warn(`Processing timeout for course ${courseId}, clearing processing state`);
      setProcessingCourseIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(courseId);
        return newSet;
      });
      setProcessingTimeouts(prev => {
        const newMap = new Map(prev);
        newMap.delete(courseId);
        return newMap;
      });
      setPaymentError('Operation timed out. Please try again.');
    }, timeoutMs);

    setProcessingTimeouts(prev => new Map(prev.set(courseId, timeoutId)));
  };

  // Helper function to clear processing state
  const clearProcessingState = (courseId) => {
    setProcessingCourseIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(courseId);
      return newSet;
    });

    // Clear timeout
    const timeoutId = processingTimeouts.get(courseId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      setProcessingTimeouts(prev => {
        const newMap = new Map(prev);
        newMap.delete(courseId);
        return newMap;
      });
    }
  };

  // Mock categories and levels - in real app these might come from API
  const categories = [
    'All Categories',
    'Programming',
    'Design',
    'Business',
    'Marketing',
    'Data Science',
    'Photography',
    'Music',
    'Languages'
  ];

  const levels = [
    'All Levels',
    'Beginner',
    'Intermediate',
    'Advanced'
  ];

  const priceRanges = [
    'All Prices',
    'Free',
    'Under $50',
    '$50 - $100',
    'Over $100'
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'popular', label: 'Most Popular' }
  ];

  // Fetch courses from API and enrolled courses
  useEffect(() => {
    fetchCourses();
    loadEnrolledCourses();
  }, []);

  // Listen for course enrollment events
  useEffect(() => {
    const handleCourseEnrolled = async () => {
      console.log('Course enrolled event received - refreshing enrolled courses');
      await loadEnrolledCourses();
    };

    window.addEventListener('courseEnrolled', handleCourseEnrolled);

    return () => {
      window.removeEventListener('courseEnrolled', handleCourseEnrolled);
    };
  }, []);

  // Apply filters when dependencies change
  useEffect(() => {
    applyFilters();
  }, [allCourses, searchTerm, filters, sortBy, currentPage, enrolledCourseIds]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      // Clear all processing timeouts when component unmounts
      processingTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    };
  }, [processingTimeouts]);

  // Load enrolled courses from backend API and sync with localStorage
  const loadEnrolledCourses = async () => {
    try {
      console.log('🔄 Loading enrolled courses from backend API...');

      // Check if user is authenticated first
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');

      if (!token || !user) {
        console.log('⚠️ User not authenticated, skipping enrolled courses fetch');
        setEnrolledCourseIds(new Set());
        return;
      }

      // Fetch from backend API first
      const apiResponse = await courseService.getEnrolledCourses();
      console.log('API Response:', apiResponse);

      let enrolledCoursesData = [];

      // Handle different response structures
      if (apiResponse.courses && Array.isArray(apiResponse.courses)) {
        enrolledCoursesData = apiResponse.courses;
      } else if (Array.isArray(apiResponse)) {
        enrolledCoursesData = apiResponse;
      } else if (apiResponse.data && Array.isArray(apiResponse.data)) {
        enrolledCoursesData = apiResponse.data;
      }

      // Transform and extract course IDs
      const enrolledIds = new Set();
      const transformedCourses = enrolledCoursesData.map(enrollment => {
        const course = enrollment.course || enrollment;
        const courseId = course.id || course._id || course.course_id;
        if (courseId) {
          enrolledIds.add(courseId);
        }
        return {
          ...course,
          id: courseId,
          _id: courseId,
          enrolledDate: enrollment.enrolled_at || enrollment.enrolledDate || new Date().toISOString(),
          progress: enrollment.progress || 0
        };
      });

      setEnrolledCourseIds(enrolledIds);
      console.log('✅ Loaded enrolled course IDs from API:', Array.from(enrolledIds));

      // Sync with localStorage for backup/offline access
      localStorage.setItem('enrolledCourses', JSON.stringify(transformedCourses));
      console.log('💾 Enrolled courses synced to localStorage');

    } catch (error) {
      console.error('❌ Error loading enrolled courses from API:', error);

      // Handle different types of authentication errors
      if (error.message.includes('Authentication') || error.message.includes('Permission denied')) {
        console.log('🔒 Authentication issue, user may need to log in again');
        setEnrolledCourseIds(new Set());
        return;
      }

      console.log('🔄 Falling back to localStorage...');

      // Fallback to localStorage if API fails
      try {
        const enrolledCoursesFromStorage = localStorage.getItem('enrolledCourses');
        if (enrolledCoursesFromStorage) {
          const parsedCourses = JSON.parse(enrolledCoursesFromStorage);
          const enrolledIds = new Set(
            parsedCourses.map(course =>
              course.id || course._id || course.courseId || course.course_id
            ).filter(Boolean)
          );
          setEnrolledCourseIds(enrolledIds);
          console.log('✅ Loaded enrolled course IDs from localStorage (fallback):', Array.from(enrolledIds));
        } else {
          setEnrolledCourseIds(new Set());
          console.log('📭 No enrolled courses found in localStorage');
        }
      } catch (localStorageError) {
        console.error('❌ Error loading from localStorage:', localStorageError);
        setEnrolledCourseIds(new Set());
      }
    }
  };

  // Razorpay handles payments inline, so no need for return URL handling
  const handlePaymentReturn = () => {
    // This method is kept for compatibility but not needed for Razorpay
    console.log('Payment return handling - not needed for Razorpay inline payments');
  };

  // Apply client-side filtering and sorting
  const applyFilters = () => {
    if (allCourses.length === 0) {
      setCourses([]);
      setTotalPages(1);
      return;
    }

    let filteredCourses = [...allCourses];

    console.log('🔍 Applying filters:', {
      searchTerm,
      category: filters.category,
      level: filters.level,
      price: filters.price,
      sortBy,
      totalCourses: allCourses.length,
      enrolledCoursesCount: enrolledCourseIds.size
    });

    // First, filter out already enrolled courses
    filteredCourses = filteredCourses.filter(course => {
      const courseId = course.id || course._id || course.courseId || course.course_id;
      const isEnrolled = enrolledCourseIds.has(courseId);
      if (isEnrolled) {
        console.log(`Filtering out enrolled course: ${course.title} (ID: ${courseId})`);
      }
      return !isEnrolled;
    });
    console.log(`After removing enrolled courses: ${filteredCourses.length} courses`);

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filteredCourses = filteredCourses.filter(course =>
        course.title.toLowerCase().includes(searchLower) ||
        course.subtitle.toLowerCase().includes(searchLower) ||
        course.instructor.name.toLowerCase().includes(searchLower) ||
        course.category.toLowerCase().includes(searchLower) ||
        course.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
      console.log(`After search filter: ${filteredCourses.length} courses`);
    }

    // Apply category filter
    if (filters.category && filters.category !== 'All Categories') {
      filteredCourses = filteredCourses.filter(course =>
        course.category.toLowerCase() === filters.category.toLowerCase()
      );
      console.log(`After category filter: ${filteredCourses.length} courses`);
    }

    // Apply level filter
    if (filters.level && filters.level !== 'All Levels') {
      filteredCourses = filteredCourses.filter(course =>
        course.level.toLowerCase() === filters.level.toLowerCase()
      );
      console.log(`After level filter: ${filteredCourses.length} courses`);
    }

    // Apply price filter
    if (filters.price && filters.price !== 'All Prices') {
      filteredCourses = filteredCourses.filter(course => {
        const price = parseFloat(course.price) || 0;
        switch (filters.price) {
          case 'Free':
            return price === 0;
          case 'Under $50':
            return price > 0 && price < 50;
          case '$50 - $100':
            return price >= 50 && price <= 100;
          case 'Over $100':
            return price > 100;
          default:
            return true;
        }
      });
      console.log(`After price filter: ${filteredCourses.length} courses`);
    }

    // Apply sorting
    filteredCourses.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
        case 'price-high':
          return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'popular':
          return (b.totalReviews || 0) - (a.totalReviews || 0);
        case 'title':
          return a.title.localeCompare(b.title);
        case 'oldest':
          return new Date(a.createdDate || 0) - new Date(b.createdDate || 0);
        case 'newest':
        default:
          return new Date(b.createdDate || 0) - new Date(a.createdDate || 0);
      }
    });

    console.log(`After sorting by ${sortBy}: ${filteredCourses.length} courses`);

    // Update the displayed courses and pagination
    const totalFiltered = filteredCourses.length;
    const startIndex = (currentPage - 1) * coursesPerPage;
    const paginatedCourses = filteredCourses.slice(startIndex, startIndex + coursesPerPage);

    setCourses(paginatedCourses);
    setTotalPages(Math.ceil(totalFiltered / coursesPerPage));

    console.log(`Showing page ${currentPage}: ${paginatedCourses.length} courses (${startIndex + 1}-${startIndex + paginatedCourses.length} of ${totalFiltered})`);
  };

  // Handle enrollment click (free or paid)
  const handleEnrollClick = async (course) => {
    const courseId = course.id || course._id || course.courseId || course.course_id;

    try {
      // Clear any previous errors/success messages
      setPaymentError(null);
      setPaymentSuccess(null);

      // Set this specific course as processing with timeout
      setProcessingWithTimeout(courseId);

      // Check if course is free
      if (course.price === 0 || course.price === '0' || course.isFree) {
        await handleFreeEnrollment(courseId, course.title);
        return;
      }

      // Handle paid course enrollment with PayPal (server-side only)
      await handlePaidEnrollment(course);
    } catch (error) {
      console.error('Error during enrollment:', error);
      setPaymentError('Failed to start enrollment process. Please try again.');
      // Always clear processing state if error occurs
      clearProcessingState(courseId);
    }
  };

  // Handle free course enrollment
  const handleFreeEnrollment = async (courseId, courseTitle) => {
    try {
      // For free courses, directly call the enrollment API
      const studentId = paymentServices.getStudentId();
      if (!studentId) {
        throw new Error('Please login to enroll in courses');
      }

      // Call backend to enroll student in free course
      const result = await paymentServices.enrollFreeCourse(courseId, studentId);
      console.log('✅ Free enrollment result:', result);

      // Update enrolled courses immediately
      setEnrolledCourseIds(prev => new Set([...prev, courseId]));

      // Get current course details from allCourses
      const currentCourse = allCourses.find(c => {
        const id = c.id || c._id || c.courseId || c.course_id;
        return id === courseId;
      });

      // Create proper course enrollment object
      const enrollmentData = {
        ...currentCourse,
        id: courseId,
        _id: courseId,
        course_id: courseId,
        enrolledDate: new Date().toISOString(),
        enrolled_at: new Date().toISOString(),
        progress: 0,
        completed: false,
        payment_method: 'free',
        enrollment_type: 'free'
      };

      // Update localStorage immediately with proper format
      const existingCourses = localStorage.getItem('enrolledCourses');
      let enrolledCourses = [];

      if (existingCourses) {
        try {
          enrolledCourses = JSON.parse(existingCourses);
        } catch (e) {
          console.error('Error parsing existing enrolled courses:', e);
          enrolledCourses = [];
        }
      }

      // Add new course if not already enrolled
      const alreadyEnrolled = enrolledCourses.some(course => {
        const id = course.id || course._id || course.course_id;
        return id === courseId;
      });

      if (!alreadyEnrolled) {
        enrolledCourses.push(enrollmentData);
        localStorage.setItem('enrolledCourses', JSON.stringify(enrolledCourses));
        console.log('💾 Updated localStorage with new enrollment:', enrollmentData);
      }

      // Refresh enrolled courses from backend
      await loadEnrolledCourses();

      // Show success message
      setPaymentSuccess(`Successfully enrolled in "${courseTitle}" 🎉`);

      // Clear success message after 5 seconds
      setTimeout(() => {
        setPaymentSuccess(null);
      }, 5000);

      // Dispatch custom event for other components with detailed data
      window.dispatchEvent(new CustomEvent('courseEnrolled', {
        detail: {
          courseId,
          courseTitle,
          type: 'free',
          timestamp: new Date().toISOString(),
          courseData: enrollmentData
        }
      }));

      // Also trigger storage event for components listening to localStorage changes
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'enrolledCourses',
        newValue: JSON.stringify(enrolledCourses),
        oldValue: existingCourses
      }));

      // Trigger refresh events for dashboard components
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refreshEnrolledCourses'));
        window.dispatchEvent(new CustomEvent('refreshDashboard'));

        // Navigate to My Courses after successful free enrollment
        window.dispatchEvent(new CustomEvent('navigateToSection', {
          detail: 'Courses'
        }));
      }, 1000);

    } catch (error) {
      console.error('Free enrollment error:', error);
      setPaymentError(error.message || 'Failed to enroll in free course');
    } finally {
      // Always clear processing state
      clearProcessingState(courseId);
    }
  };

  // Handle paid course enrollment with Razorpay
  const handlePaidEnrollment = async (course) => {
    const courseId = course.id || course._id || course.courseId || course.course_id;

    try {
      console.log('🔄 Starting paid enrollment for course:', course.title, 'ID:', courseId);

      // Validate user is logged in
      if (!paymentServices.getStudentId()) {
        throw new Error('Please login to enroll in courses');
      }

      // Get course price and validate
      const amount = parseFloat(course.price);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Invalid course price');
      }

      console.log('💰 Payment amount (INR):', amount, 'Original price:', course.price);

      // Process Razorpay payment
      const paymentResult = await paymentServices.processRazorpayPayment(course);

      if (paymentResult.success) {
        // Payment successful - update enrollment state
        setEnrolledCourseIds(prev => new Set([...prev, courseId]));

        // Get current course details from allCourses
        const currentCourse = allCourses.find(c => {
          const id = c.id || c._id || c.courseId || c.course_id;
          return id === courseId;
        });

        // Create proper course enrollment object
        const enrollmentData = {
          ...currentCourse,
          id: courseId,
          _id: courseId,
          course_id: courseId,
          enrolledDate: new Date().toISOString(),
          enrolled_at: new Date().toISOString(),
          progress: 0,
          completed: false,
          payment_method: 'razorpay',
          payment_id: paymentResult.paymentId,
          order_id: paymentResult.orderId,
          amount: course.price,
          enrollment_type: 'paid'
        };

        // Update localStorage immediately with proper format
        const existingCourses = localStorage.getItem('enrolledCourses');
        let enrolledCourses = [];

        if (existingCourses) {
          try {
            enrolledCourses = JSON.parse(existingCourses);
          } catch (e) {
            console.error('Error parsing existing enrolled courses:', e);
            enrolledCourses = [];
          }
        }

        // Add new course if not already enrolled
        const alreadyEnrolled = enrolledCourses.some(enrolledCourse => {
          const id = enrolledCourse.id || enrolledCourse._id || enrolledCourse.course_id;
          return id === courseId;
        });

        if (!alreadyEnrolled) {
          enrolledCourses.push(enrollmentData);
          localStorage.setItem('enrolledCourses', JSON.stringify(enrolledCourses));
          console.log('💾 Updated localStorage with new paid enrollment:', enrollmentData);
        }

        await loadEnrolledCourses();

        // Show success message
        setPaymentSuccess(`Enrollment Successful! Welcome to "${course.title}" 🎉`);

        // Clear success message after 5 seconds
        setTimeout(() => {
          setPaymentSuccess(null);
        }, 5000);

        // Dispatch event for other components with detailed payment info
        window.dispatchEvent(new CustomEvent('courseEnrolled', {
          detail: {
            courseId,
            courseTitle: course.title,
            paymentId: paymentResult.paymentId,
            orderId: paymentResult.orderId,
            type: 'paid',
            amount: course.price,
            timestamp: new Date().toISOString(),
            courseData: enrollmentData
          }
        }));

        // Also trigger storage event for components listening to localStorage changes
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'enrolledCourses',
          newValue: JSON.stringify(enrolledCourses),
          oldValue: existingCourses
        }));

        // Force refresh of dashboard and course lists
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('refreshDashboard'));
          window.dispatchEvent(new CustomEvent('refreshEnrolledCourses'));

          // Also navigate to My Courses section after successful payment
          window.dispatchEvent(new CustomEvent('navigateToSection', {
            detail: 'Courses'
          }));
        }, 1000);

        // Show success message with navigation option
        setTimeout(() => {
          if (confirm('🎉 Payment successful! Would you like to go to "My Courses" to start learning?')) {
            window.dispatchEvent(new CustomEvent('navigateToSection', {
              detail: 'Courses'
            }));
          }
        }, 2000);
      }

    } catch (error) {
      console.error('❌ Error in paid enrollment process:', error);

      // Set user-friendly error message
      let errorMessage = 'Failed to process payment. Please try again.';
      if (error.message.includes('login')) {
        errorMessage = 'Please login to enroll in courses.';
      } else if (error.message.includes('price')) {
        errorMessage = 'Invalid course price. Please contact support.';
      } else if (error.message.includes('cancelled')) {
        errorMessage = 'Payment was cancelled. You can try again anytime.';
      } else if (error.message.includes('SDK')) {
        errorMessage = 'Payment system unavailable. Please refresh and try again.';
      }

      setPaymentError(errorMessage);

    } finally {
      // Always clear processing state
      clearProcessingState(courseId);
    }
  };

  // Handle successful payment
  const handlePaymentSuccess = async (response, courseId, courseTitle) => {
    try {
      console.log('Verifying payment...', response);

      // Verify payment with backend
      const verificationResult = await paymentServices.verifyPayment(
        response.razorpay_payment_id,
        response.razorpay_order_id,
        response.razorpay_signature,
        courseId
      );

      console.log('Payment verification result:', verificationResult);

      if (verificationResult.success || verificationResult.verified) {
        // Update enrolled courses
        setEnrolledCourseIds(prev => new Set([...prev, courseId]));

        // Refresh enrolled courses from backend
        await loadEnrolledCourses();

        // Show success message
        setPaymentSuccess(`Enrollment Successful! Welcome to "${courseTitle}" 🎉`);

        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('courseEnrolled', {
          detail: { courseId, courseTitle, paymentId: response.razorpay_payment_id }
        }));

      } else {
        throw new Error('Payment verification failed');
      }

    } catch (error) {
      console.error('Payment verification error:', error);
      setPaymentError('Payment completed but verification failed. Please contact support.');
    } finally {
      // Remove from processing state
      setProcessingCourseIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(courseId);
        return newSet;
      });
    }
  };

  // Handle payment failure
  const handlePaymentFailure = (error, courseId) => {
    console.error('Payment failed:', error);

    // Remove from processing state
    setProcessingCourseIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(courseId);
      return newSet;
    });

    if (error === 'Payment cancelled by user') {
      setPaymentError('Payment was cancelled. You can try again anytime.');
    } else {
      setPaymentError('Payment failed. Please try again or contact support.');
    }
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Fetching courses from API...');

      // Use branch courses API which doesn't require authentication
      const response = await fetch('http://localhost:4000/api/branch-courses/courses', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        throw new Error(`Failed to fetch courses: ${response.status} ${response.statusText}`);
      }

      // Check content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('Response is not JSON, content-type:', contentType);
        throw new Error('Response is not JSON');
      }

      const data = await response.json();
      console.log('API Response:', data);

      // Branch API returns array directly
      const coursesData = Array.isArray(data) ? data : (data.courses || []);

      // Transform courses to match the expected format
      const transformedCourses = coursesData.map((course, index) => {
        // Get the actual price from various possible field names
        const coursePrice = course.price || course.course_fee || course.fee || 0;
        const numPrice = typeof coursePrice === 'string' ? parseFloat(coursePrice) : coursePrice;

        return {
          id: course.id || course._id || index + 1,
          title: course.course_name || course.title || 'Untitled Course',
          subtitle: course.description || 'No description available',
          instructor: {
            name: course.instructor_name || 'Unknown Instructor'
          },
          price: numPrice,
          originalPrice: course.original_price || numPrice || 0,
          isFree: numPrice === 0,
          thumbnail: course.thumbnail || '/api/placeholder/300/200',
          category: course.category || 'General',
          level: course.level || 'Beginner',
          rating: course.rating || 0,
          totalReviews: course.total_ratings || 0,
          duration: course.duration ? `${course.duration} hours` : '8 weeks',
          lessonsCount: course.lessons || 10,
          published: course.published !== false,
          courseId: course.course_id || '',
          tags: course.tags || []
        };
      });

      // Filter to show only published courses
      const publishedCourses = transformedCourses.filter(course => course.published);

      console.log('✅ API call successful, courses loaded from API');
      console.log('Total courses from API:', transformedCourses.length);
      console.log('Published courses (showing):', publishedCourses.length);
      console.log('Unpublished courses (hidden):', transformedCourses.filter(course => !course.published).length);

      // Store only published courses
      setAllCourses(publishedCourses);

    } catch (err) {
      console.error('Error fetching courses:', err);
      setError(err.message);
      setAllCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleSortChange = (value) => {
    setSortBy(value);
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilters({
      category: 'All Categories',
      level: 'All Levels',
      price: 'All Prices'
    });
    setSortBy('newest');
    setCurrentPage(1);
  };

  const toggleWishlist = (courseId) => {
    setWishlistedCourses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(courseId)) {
        newSet.delete(courseId);
      } else {
        newSet.add(courseId);
      }
      return newSet;
    });
  };

  const showCourseDetails = (course) => {
    setSelectedCourse(course);
    setShowCourseCard(true);
  };

  // Share functionality
  const generateCourseUrl = (course) => {
    // Generate a shareable URL for the course
    const baseUrl = window.location.origin;
    const courseId = course.id || course._id || course.courseId || course.course_id;
    return `${baseUrl}/course/${courseId}`;
  };

  const handleShare = (course) => {
    setShareSelectedCourse(course);
    setShareModalOpen(true);
  };

  const shareToWhatsApp = (course) => {
    const url = generateCourseUrl(course);
    const text = `Check out this amazing course: "${course.title}" by ${course.instructor?.name || 'Expert Instructor'}. ${course.price === 0 ? 'It\'s FREE!' : `Price: ₹${course.price}`}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${text}\n\n${url}`)}`;
    window.open(whatsappUrl, '_blank');
    setShareModalOpen(false);
  };

  const shareToTelegram = (course) => {
    const url = generateCourseUrl(course);
    const text = `Check out this amazing course: "${course.title}" by ${course.instructor?.name || 'Expert Instructor'}. ${course.price === 0 ? 'It\'s FREE!' : `Price: ₹${course.price}`}`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(telegramUrl, '_blank');
    setShareModalOpen(false);
  };

  const shareToFacebook = (course) => {
    const url = generateCourseUrl(course);
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, '_blank');
    setShareModalOpen(false);
  };

  const shareToTwitter = (course) => {
    const url = generateCourseUrl(course);
    const text = `Check out this amazing course: "${course.title}" by ${course.instructor?.name || 'Expert Instructor'}. ${course.price === 0 ? 'It\'s FREE!' : `Price: ₹${course.price}`} #OnlineLearning #Education`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
    setShareModalOpen(false);
  };

  const shareToLinkedIn = (course) => {
    const url = generateCourseUrl(course);
    const text = `Check out this amazing course: "${course.title}" by ${course.instructor?.name || 'Expert Instructor'}. ${course.price === 0 ? 'It\'s FREE!' : `Price: ₹${course.price}`} #OnlineLearning #Education #ProfessionalDevelopment`;
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&title=${encodeURIComponent(course.title)}&summary=${encodeURIComponent(text)}`;
    window.open(linkedinUrl, '_blank');
    setShareModalOpen(false);
  };

  const shareToInstagram = (course) => {
    const url = generateCourseUrl(course);
    const text = `Check out this amazing course: "${course.title}" by ${course.instructor?.name || 'Expert Instructor'}. ${course.price === 0 ? 'It\'s FREE!' : `Price: ₹${course.price}`}`;
    // Instagram doesn't support direct web sharing, so we'll use a generic share with the link
    // Users can copy the link and share it in Instagram Stories or DMs
    const instagramUrl = `https://www.instagram.com/`;
    window.open(instagramUrl, '_blank');
    // Also copy to clipboard for easy sharing
    navigator.clipboard.writeText(`${text}\n\n${url}`).catch(() => {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = `${text}\n\n${url}`;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    });
    alert('Link copied to clipboard! You can now share it on Instagram Stories or DMs.');
    setShareModalOpen(false);
  };

  const shareViaSMS = (course) => {
    const url = generateCourseUrl(course);
    const text = `Check out this amazing course: "${course.title}" by ${course.instructor?.name || 'Expert Instructor'}. ${course.price === 0 ? 'It\'s FREE!' : `Price: ₹${course.price}`}`;
    const smsUrl = `sms:?body=${encodeURIComponent(`${text}\n\n${url}`)}`;
    window.location.href = smsUrl;
    setShareModalOpen(false);
  };

  const shareToMessenger = (course) => {
    const url = generateCourseUrl(course);
    const messengerUrl = `https://www.messenger.com/t/?link=${encodeURIComponent(url)}`;
    window.open(messengerUrl, '_blank');
    setShareModalOpen(false);
  };

  const shareViaEmail = (course) => {
    const url = generateCourseUrl(course);
    const subject = `Check out this course: ${course.title}`;
    const body = `Hi there!\n\nI found this amazing course that I thought you might be interested in:\n\nCourse: "${course.title}"\nInstructor: ${course.instructor?.name || 'Expert Instructor'}\nLevel: ${course.level || 'Beginner'}\nPrice: ${course.price === 0 ? 'FREE' : `₹${course.price}`}\n\nYou can check it out here: ${url}\n\nHappy learning!`;
    const emailUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = emailUrl;
    setShareModalOpen(false);
  };

  const copyToClipboard = async (course) => {
    try {
      const url = generateCourseUrl(course);
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
        setShareModalOpen(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = generateCourseUrl(course);
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
        setShareModalOpen(false);
      }, 2000);
    }
  };

  const renderStars = (rating, totalReviews = 0) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <StarIconSolid key={i} className="h-4 w-4 text-yellow-400" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <div key={i} className="relative">
            <StarIcon className="h-4 w-4 text-gray-300" />
            <div className="absolute inset-0 w-1/2 overflow-hidden">
              <StarIconSolid className="h-4 w-4 text-yellow-400" />
            </div>
          </div>
        );
      } else {
        stars.push(
          <StarIcon key={i} className="h-4 w-4 text-gray-300" />
        );
      }
    }

    return (
      <div className="flex items-center space-x-1">
        <div className="flex">{stars}</div>
        <span className="text-sm text-gray-600">
          {rating.toFixed(1)} ({totalReviews})
        </span>
      </div>
    );
  };

  const CourseCardSkeleton = () => (
    <div className="bg-white rounded-xl shadow-md animate-pulse border border-gray-100 overflow-hidden">
      {/* Image Skeleton */}
      <div className="h-48 bg-gray-200"></div>

      {/* Content Skeleton */}
      <div className="p-5">
        {/* Title Skeleton */}
        <div className="h-6 bg-gray-200 rounded mb-3"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>

        {/* Instructor Skeleton */}
        <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>

        {/* Rating Skeleton */}
        <div className="flex items-center space-x-1 mb-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 w-4 bg-gray-200 rounded"></div>
          ))}
          <div className="h-3 bg-gray-200 rounded w-10 ml-2"></div>
        </div>

        {/* Price Skeleton */}
        <div className="h-6 bg-gray-200 rounded w-20 mb-5"></div>

        {/* Meta Info Skeleton */}
        <div className="flex justify-between items-center mb-5">
          <div className="h-4 bg-gray-200 rounded w-16"></div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
          <div className="h-5 bg-gray-200 rounded w-16"></div>
        </div>

        {/* Button Skeleton */}
        <div className="h-10 bg-gray-200 rounded w-full"></div>
      </div>
    </div>
  );

  const CourseCard = ({ course }) => (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-gray-200 group transform hover:-translate-y-1">
      {/* Image Container */}
      <div className="relative overflow-hidden">
        <img
          src={course.thumbnail || '/api/placeholder/300/200'}
          alt={course.title || 'Course Thumbnail'}
          className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            e.target.src = '/api/placeholder/300/200';
          }}
        />
        {/* Wishlist and Share Buttons */}
        <div className="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {/* Share Button */}
          <button
            onClick={() => handleShare(course)}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white shadow-md hover:shadow-lg transition-all duration-300"
          >
            <ShareIcon className="h-5 w-5 text-gray-600 hover:text-blue-500" />
          </button>

          {/* Wishlist Button */}
          <button
            onClick={() => toggleWishlist(course.id)}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white shadow-md hover:shadow-lg transition-all duration-300"
          >
            {wishlistedCourses.has(course.id) ? (
              <HeartIconSolid className="h-5 w-5 text-red-500" />
            ) : (
              <HeartIcon className="h-5 w-5 text-gray-600 hover:text-red-500" />
            )}
          </button>
        </div>
        {/* Premium Badge or Enrolled Badge */}
        {(() => {
          const courseId = course.id || course._id || course.courseId || course.course_id;
          const isEnrolled = enrolledCourseIds.has(courseId);

          if (isEnrolled) {
            return (
              <div className="absolute bottom-3 left-3">
                <span className="bg-orange-600 text-white text-sm font-semibold px-3 py-1 rounded-full flex items-center space-x-1">
                  <span>✓</span>
                  <span>Enrolled</span>
                </span>
              </div>
            );
          } else if (!course.isFree) {
            return (
              <div className="absolute bottom-3 left-3">
                <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold px-3 py-1 rounded-full flex items-center space-x-1">
                  <span>⭐</span>
                  <span>Premium</span>
                </span>
              </div>
            );
          }
          return null;
        })()}
      </div>

      {/* Card Content */}
      <div className="p-5">
        {/* Course Title */}
        <h3 className="font-semibold text-lg mb-3 text-gray-900 line-clamp-2 group-hover:text-indigo-600 transition-colors duration-300">
          {course.title}
        </h3>

        {/* Instructor */}
        <p className="text-sm text-gray-600 mb-4">
          by {course.instructor?.name || course.instructor || 'Unknown Instructor'}
        </p>

        {/* Rating */}
        {course.rating > 0 && (
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-sm font-medium text-yellow-600">{course.rating.toFixed(1)}</span>
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <StarIconSolid
                  key={i}
                  className={`h-4 w-4 ${i < Math.floor(course.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-500">({course.totalReviews || 0})</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center space-x-2 mb-5">
          {course.price === 0 || course.price === '0' || course.isFree ? (
            <span className="text-xl font-bold text-orange-600">Free</span>
          ) : (
            <>
              <span className="text-xl font-bold text-gray-900">₹{course.price}</span>
              {course.originalPrice && course.originalPrice > course.price && (
                <span className="text-sm text-gray-500 line-through">₹{course.originalPrice}</span>
              )}
            </>
          )}
        </div>

        {/* Course Meta */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-5">
          {course.duration && (
            <div className="flex items-center space-x-1.5">
              <ClockIcon className="h-4 w-4 text-gray-400" />
              <span>{course.duration}</span>
            </div>
          )}
          {course.lessonsCount && (
            <div className="flex items-center space-x-1.5">
              <BookOpenIcon className="h-4 w-4 text-gray-400" />
              <span>{course.lessonsCount} lessons</span>
            </div>
          )}
          {course.level && (
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${course.level === 'Beginner' ? 'bg-orange-100 text-orange-700' :
              course.level === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'}`}>
              {course.level}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {/* View Details Button */}
          <button
            onClick={() => showCourseDetails(course)}
            className="w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-300 bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 hover:border-gray-400 flex items-center justify-center space-x-2"
          >
            <EyeIcon className="h-4 w-4" />
            <span>View Details</span>
          </button>

          {/* Enroll Button */}
          {(() => {
            const courseId = course.id || course._id || course.courseId || course.course_id;
            const isEnrolled = enrolledCourseIds.has(courseId);
            const isProcessing = processingCourseIds.has(courseId);

            return isEnrolled ? (
              <button
                disabled
                className="w-full py-2.5 px-4 rounded-lg font-medium text-sm bg-gray-400 text-white cursor-not-allowed"
              >
                Already Enrolled
              </button>
            ) : (
              <button
                onClick={() => handleEnrollClick(course)}
                disabled={isProcessing}
                className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center space-x-2 ${isProcessing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
                  }`}
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>
                      {course.price === 0 || course.price === '0' || course.isFree
                        ? 'Enrolling...'
                        : 'Processing Payment...'
                      }
                    </span>
                  </>
                ) : course.price === 0 || course.price === '0' || course.isFree ? (
                  <>
                    <UserPlusIcon className="h-4 w-4" />
                    <span>Enroll Free</span>
                  </>
                ) : (
                  <>
                    <CurrencyDollarIcon className="h-4 w-4" />
                    <span>Enroll for ₹{course.price}</span>
                  </>
                )}
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );

  const EmptyState = () => (
    <div className="col-span-full flex flex-col items-center justify-center py-12">
      <BookOpenIcon className="h-16 w-16 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">No courses found</h3>
      <p className="text-gray-500 text-center max-w-md">
        {searchTerm || Object.values(filters).some(f => f && f !== 'All Categories' && f !== 'All Levels' && f !== 'All Prices')
          ? "Try adjusting your search criteria or filters to find more courses."
          : "There are no courses available at the moment."}
      </p>
    </div>
  );

  const ErrorState = () => (
    <div className="col-span-full flex flex-col items-center justify-center py-12">
      <ExclamationTriangleIcon className="h-16 w-16 text-red-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading courses</h3>
      <p className="text-gray-500 text-center max-w-md mb-4">{error}</p>
      <button
        onClick={fetchCourses}
        className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
      >
        Try Again
      </button>
    </div>
  );

  return (
    <div className="h-full bg-gray-50 w-full overflow-hidden">
      <style dangerouslySetInnerHTML={{
        __html: `
        .scrollbar-hide {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
          background: transparent !important;
        }
        .no-scrollbar {
          overflow: hidden !important;
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none !important;
        }
        /* Ensure no horizontal overflow anywhere */
        * {
          box-sizing: border-box;
        }
        body, html {
          overflow-x: hidden;
        }

        /* New Styles for Responsive Layout like My Courses */
        body, html, #root {
          width: 100%;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }

        /* Fix Recommended for you Slider */
        .no-scrollbar {
          overflow-x: hidden !important;
        }

        [ref="recommendedSliderRef"] {
          width: 100% !important;
          max-width: calc(100vw - 32px) !important; /* Adjust for px-4 padding on both sides */
          display: flex !important;
          flex-wrap: nowrap !important;
          overflow-x: hidden !important;
        }

        [ref="recommendedSliderRef"] > div {
          flex: 0 0 auto !important;
          width: 288px !important; /* w-72 */
          min-width: 0 !important;
        }

        /* Adjust Grid Layout for All Courses */
        .grid-cols-1, .md\\:grid-cols-2, .lg\\:grid-cols-3, .xl\\:grid-cols-4 {
          width: 100% !important;
          max-width: calc(100vw - 32px) !important; /* Match container width */
          margin: 0 auto !important;
        }

        /* Ensure cards don't overflow grid */
        .min-w-0 {
          width: 100% !important;
        }

        /* Responsive adjustments */
        @media (max-width: 1024px) {
          [ref="recommendedSliderRef"] {
            padding-left: 8px !important;
            padding-right: 8px !important;
          }

          [ref="recommendedSliderRef"] > div {
            width: 240px !important; /* Reduce card width on smaller screens */
          }

          .lg\\:grid-cols-3 {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .xl\\:grid-cols-4 {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 640px) {
          [ref="recommendedSliderRef"] > div {
            width: 200px !important; /* Further reduce on mobile */
          }

          .md\\:grid-cols-2 {
            grid-template-columns: 1fr !important;
          }
        }
        `
      }} />

      <div className="w-full h-full overflow-y-auto overflow-x-hidden px-4 py-4">
        {/* Header */}
        <div className="mb-6">
        </div>

        {/* Payment Success Message */}
        {paymentSuccess && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-orange-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-orange-800 font-medium">{paymentSuccess}</p>
                  <p className="text-orange-600 text-sm mt-1">You can now access your course from "My Courses" section.</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => {
                    // Navigate to My Courses section if in student dashboard
                    if (window.location.pathname.includes('student-dashboard')) {
                      window.dispatchEvent(new CustomEvent('navigateToSection', { detail: 'Courses' }));
                    } else {
                      // If not in dashboard, navigate to student dashboard
                      window.location.href = '/student-dashboard?section=Courses';
                    }
                  }}
                  className="px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors font-medium"
                >
                  View My Courses
                </button>
                <button
                  onClick={() => setPaymentSuccess(null)}
                  className="text-orange-600 hover:text-orange-800 p-1"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Error Message */}
        {paymentError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-red-800">{paymentError}</p>
            </div>
            <div className="ml-auto">
              <button
                onClick={() => setPaymentError(null)}
                className="text-red-400 hover:text-red-600"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 w-full">
          {/* Search Bar */}
          <div className="relative mb-4 w-full">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters Toggle for Mobile */}
          <div className="flex items-center justify-between mb-4 lg:hidden">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <FunnelIcon className="h-5 w-5" />
              <span>Filters</span>
            </button>
          </div>

          {/* Filters */}
          <div className={`grid grid-cols-2 lg:grid-cols-5 gap-4 ${showFilters ? 'block' : 'hidden lg:grid'}`}>
            {/* Category Filter */}
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1 ">Category</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Level Filter */}
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
              <select
                value={filters.level}
                onChange={(e) => handleFilterChange('level', e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {levels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            {/* Price Filter */}
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
              <select
                value={filters.price}
                onChange={(e) => handleFilterChange('price', e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {priceRanges.map(price => (
                  <option key={price} value={price}>{price}</option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Clear Filters Button */}
            <div className="flex items-end col-span-2 lg:col-span-1 min-w-0">
              <button
                onClick={clearFilters}
                className="w-full p-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium border border-gray-300"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Filter Summary */}
          {(searchTerm || filters.category !== 'All Categories' || filters.level !== 'All Levels' || filters.price !== 'All Prices' || sortBy !== 'newest') && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm text-gray-600">Active filters:</span>
              {searchTerm && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Search: "{searchTerm}"
                  <button
                    onClick={() => setSearchTerm('')}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.category !== 'All Categories' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  {filters.category}
                  <button
                    onClick={() => handleFilterChange('category', 'All Categories')}
                    className="ml-1 text-orange-600 hover:text-orange-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.level !== 'All Levels' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  {filters.level}
                  <button
                    onClick={() => handleFilterChange('level', 'All Levels')}
                    className="ml-1 text-yellow-600 hover:text-yellow-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.price !== 'All Prices' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  {filters.price}
                  <button
                    onClick={() => handleFilterChange('price', 'All Prices')}
                    className="ml-1 text-purple-600 hover:text-purple-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {sortBy !== 'newest' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Sort: {sortOptions.find(opt => opt.value === sortBy)?.label}
                  <button
                    onClick={() => setSortBy('newest')}
                    className="ml-1 text-gray-600 hover:text-gray-800"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Course Sections */}
        <div className="space-y-8 sm:space-y-10 lg:space-y-12">
          {/* All Courses Section */}
          <div>
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">All Courses</h2>
              <div className="text-sm text-gray-500">
                {courses.length > 0
                  ? `Showing ${((currentPage - 1) * coursesPerPage) + 1} to ${Math.min(currentPage * coursesPerPage, courses.length)} of ${courses.length} courses`
                  : 'No courses available'
                }
              </div>
            </div>

            {/* Grid Layout like My Courses */}
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 justify-center">
              {!loading && !error && courses.map(course => (
                <div key={course.id} className="min-w-0">
                  <CourseCard course={course} />
                </div>
              ))}
              {loading && (
                Array(10).fill(0).map((_, index) => (
                  <div key={index} className="min-w-0">
                    <CourseCardSkeleton />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Error and Empty States */}
          {error && (
            <div className="text-center py-12 w-full">
              <ErrorState />
            </div>
          )}

          {!loading && !error && courses.length === 0 && (
            <div className="text-center py-12">
              <EmptyState />
            </div>
          )}
        </div>

        {/* Pagination - Only show for All Courses section if needed */}
        {!loading && !error && courses.length > 20 && (
          <div className="flex items-center justify-center mt-6 sm:mt-8">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex items-center space-x-1 px-2 sm:px-3 py-2 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </button>

              <span className="px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-700">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center space-x-1 px-2 sm:px-3 py-2 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="hidden sm:inline">Next</span>
                <span className="sm:hidden">Next</span>
                <ChevronRightIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Course Details Card */}
      {showCourseCard && selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Card Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <BookOpenIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Course Details</h2>
                    <p className="text-blue-100 text-sm">Complete course information</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCourseCard(false)}
                  className="text-white hover:text-gray-200 transition-colors p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Card Content */}
            <div className="p-6 space-y-6">
              {/* Course Image and Basic Info */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="sm:w-1/3">
                  <img
                    src={selectedCourse.thumbnail || '/api/placeholder/300/200'}
                    alt={selectedCourse.title}
                    className="w-full h-48 object-cover rounded-lg shadow-md"
                  />
                </div>
                <div className="sm:w-2/3 space-y-3">
                  <h3 className="text-2xl font-bold text-gray-900">{selectedCourse.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {selectedCourse.description || 'A comprehensive course designed to help you master new skills and advance your career.'}
                  </p>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center text-yellow-500">
                      {selectedCourse.rating > 0 && (
                        <>
                          <StarIconSolid className="w-5 h-5 mr-1" />
                          <span className="font-medium">{selectedCourse.rating.toFixed(1)}</span>
                          <span className="text-sm text-gray-500 ml-1">({selectedCourse.totalReviews || 0} reviews)</span>
                        </>
                      )}
                    </div>
                    {(() => {
                      const courseId = selectedCourse.id || selectedCourse._id || selectedCourse.courseId || selectedCourse.course_id;
                      const isEnrolled = enrolledCourseIds.has(courseId);
                      return isEnrolled ? (
                        <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                          ✓ Enrolled
                        </span>
                      ) : (
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                          Available
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Course Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Instructor</h4>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedCourse.instructor?.name || selectedCourse.instructor || 'Expert Instructor'}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Level</h4>
                  <p className="text-lg font-semibold text-gray-900">{selectedCourse.level || 'Beginner'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Duration</h4>
                  <p className="text-lg font-semibold text-gray-900">{selectedCourse.duration || 'Self-paced'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Lessons</h4>
                  <p className="text-lg font-semibold text-gray-900">{selectedCourse.lessonsCount || 'Multiple'} lessons</p>
                </div>
              </div>

              {/* Price Section */}
              <div className="bg-gradient-to-r from-orange-50 to-blue-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Course Price</h4>
                <div className="flex items-center space-x-3">
                  {selectedCourse.price === 0 || selectedCourse.price === '0' || selectedCourse.isFree ? (
                    <span className="text-3xl font-bold text-orange-600">FREE</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-gray-900">₹{selectedCourse.price}</span>
                      {selectedCourse.originalPrice && selectedCourse.originalPrice > selectedCourse.price && (
                        <span className="text-lg text-gray-500 line-through">₹{selectedCourse.originalPrice}</span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* What You'll Learn */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  What You'll Learn
                </h4>
                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <svg className="w-4 h-4 text-orange-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-700">Master the core concepts and fundamentals</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <svg className="w-4 h-4 text-orange-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-700">Build practical, real-world projects</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <svg className="w-4 h-4 text-orange-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-700">Gain industry-relevant skills and knowledge</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <svg className="w-4 h-4 text-orange-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-700">Apply knowledge through hands-on exercises</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-between items-center">
              <button
                onClick={() => setShowCourseCard(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Close
              </button>
              <div className="flex space-x-3">
                {(() => {
                  const courseId = selectedCourse.id || selectedCourse._id || selectedCourse.courseId || selectedCourse.course_id;
                  const isEnrolled = enrolledCourseIds.has(courseId);
                  const isProcessing = processingCourseIds.has(courseId);

                  return isEnrolled ? (
                    <span className="px-6 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed font-medium">
                      Already Enrolled
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        setShowCourseCard(false);
                        handleEnrollClick(selectedCourse);
                      }}
                      disabled={isProcessing}
                      className={`px-6 py-2 rounded-lg font-medium flex items-center space-x-2 transition-all duration-300 ${isProcessing
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:scale-105 shadow-lg'
                        }`}
                    >
                      {isProcessing ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>
                            {selectedCourse.price === 0 || selectedCourse.price === '0' || selectedCourse.isFree
                              ? 'Enrolling...'
                              : 'Redirecting to Stripe...'
                            }
                          </span>
                        </>
                      ) : selectedCourse.price === 0 || selectedCourse.price === '0' || selectedCourse.isFree ? (
                        <>
                          <UserPlusIcon className="h-4 w-4" />
                          <span>Enroll Free</span>
                        </>
                      ) : (
                        <>
                          <CurrencyDollarIcon className="h-4 w-4" />
                          <span>Enroll for ₹{selectedCourse.price}</span>
                        </>
                      )}
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Share Modal */}
      {shareModalOpen && shareSelectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <ShareIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Share Course</h3>
                    <p className="text-blue-100 text-sm">Share "{shareSelectedCourse.title}"</p>
                  </div>
                </div>
                <button
                  onClick={() => setShareModalOpen(false)}
                  className="text-white hover:text-gray-200 transition-colors p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {copySuccess && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-orange-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-medium text-orange-800">Link copied to clipboard!</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                {/* WhatsApp */}
                <button
                  onClick={() => shareToWhatsApp(shareSelectedCourse)}
                  className="flex flex-col items-center p-3 rounded-xl bg-orange-50 hover:bg-orange-100 transition-colors duration-200 group"
                >
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.487" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-gray-700">WhatsApp</span>
                </button>

                {/* Telegram */}
                <button
                  onClick={() => shareToTelegram(shareSelectedCourse)}
                  className="flex flex-col items-center p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors duration-200 group"
                >
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-gray-700">Telegram</span>
                </button>

                {/* Facebook */}
                <button
                  onClick={() => shareToFacebook(shareSelectedCourse)}
                  className="flex flex-col items-center p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors duration-200 group"
                >
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-gray-700">Facebook</span>
                </button>

                {/* Twitter/X */}
                <button
                  onClick={() => shareToTwitter(shareSelectedCourse)}
                  className="flex flex-col items-center p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors duration-200 group"
                >
                  <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-gray-700">Twitter</span>
                </button>

                {/* LinkedIn */}
                <button
                  onClick={() => shareToLinkedIn(shareSelectedCourse)}
                  className="flex flex-col items-center p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors duration-200 group"
                >
                  <div className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-gray-700">LinkedIn</span>
                </button>

                {/* Instagram */}
                <button
                  onClick={() => shareToInstagram(shareSelectedCourse)}
                  className="flex flex-col items-center p-3 rounded-xl bg-pink-50 hover:bg-pink-100 transition-colors duration-200 group"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-500 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-gray-700">Instagram</span>
                </button>

                {/* Email */}
                <button
                  onClick={() => shareViaEmail(shareSelectedCourse)}
                  className="flex flex-col items-center p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors duration-200 group"
                >
                  <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-gray-700">Email</span>
                </button>

                {/* SMS */}
                <button
                  onClick={() => shareViaSMS(shareSelectedCourse)}
                  className="flex flex-col items-center p-3 rounded-xl bg-orange-50 hover:bg-orange-100 transition-colors duration-200 group"
                >
                  <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-gray-700">SMS</span>
                </button>

                {/* Messenger */}
                <button
                  onClick={() => shareToMessenger(shareSelectedCourse)}
                  className="flex flex-col items-center p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors duration-200 group"
                >
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 4.975 0 11.111c0 3.497 1.745 6.616 4.472 8.652V24l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.974 12-11.111C24 4.975 18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8.1l3.13 3.26L19.752 8.1l-6.561 6.863z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-gray-700">Messenger</span>
                </button>

                {/* Copy Link */}
                <button
                  onClick={() => copyToClipboard(shareSelectedCourse)}
                  className="flex flex-col items-center p-3 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors duration-200 group"
                >
                  <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <LinkIcon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-gray-700">Copy Link</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrowseCourses;