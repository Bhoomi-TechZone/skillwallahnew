import {
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  EyeIcon,
  LinkIcon,
  PlayIcon,
  ShareIcon,
  StarIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ConnectWithUsModal from '../components/ConnectWithUsModal';
import paymentServices from '../services/paymentServices';

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [expandedModules, setExpandedModules] = useState({});
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);
  const [processingCourseId, setProcessingCourseId] = useState(null);
  const [paymentError, setPaymentError] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const [processingTimeout, setProcessingTimeout] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({
    rating: 5,
    comment: '',
    user_name: ''
  });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(null);
  const [reviewError, setReviewError] = useState(null);
  const [courseReviews, setCourseReviews] = useState([]);
  const [showAllReviews, setShowAllReviews] = useState(false);

  // Set up social media meta tags
  const updateMetaTags = (courseData) => {
    if (!courseData) return;

    // Update page title
    document.title = `${courseData.title} - Skill Wallah EdTech`;

    // Remove existing meta tags
    const existingTags = document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]');
    existingTags.forEach(tag => tag.remove());

    // Create new meta tags
    const metaTags = [
      // Open Graph tags for Facebook, LinkedIn, etc.
      { property: 'og:title', content: courseData.title },
      { property: 'og:description', content: courseData.description?.slice(0, 160) || 'Enhance your skills with this comprehensive course' },
      { property: 'og:image', content: courseData.thumbnail || 'http://localhost:4000/default-course-image.jpg' },
      { property: 'og:url', content: window.location.href },
      { property: 'og:type', content: 'article' },
      { property: 'og:site_name', content: 'Skill Wallah EdTech' },

      // Twitter Card tags
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: courseData.title },
      { name: 'twitter:description', content: courseData.description?.slice(0, 160) || 'Enhance your skills with this comprehensive course' },
      { name: 'twitter:image', content: courseData.thumbnail || 'http://localhost:4000/default-course-image.jpg' },

      // Additional meta tags
      { name: 'description', content: courseData.description?.slice(0, 160) || 'Enhance your skills with this comprehensive course' },
      { name: 'keywords', content: `${courseData.category || 'online course'}, ${courseData.level || 'education'}, ${courseData.tags || 'learning'}, Skill Wallah EdTech` }
    ];

    // Add meta tags to head
    metaTags.forEach(tag => {
      const meta = document.createElement('meta');
      if (tag.property) meta.setAttribute('property', tag.property);
      if (tag.name) meta.setAttribute('name', tag.name);
      meta.setAttribute('content', tag.content);
      document.head.appendChild(meta);
    });
  };

  // Fetch course details
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        setError(null);

        // First, try to get all courses and find the specific one
        console.log('Fetching courses to find course with ID:', id);

        const headers = {};
        const token = localStorage.getItem('token');
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        // Try to get all courses first and find the matching one
        try {
          const allCoursesResponse = await axios.get('http://localhost:4000/course/', {
            headers,
            timeout: 10000 // 10 second timeout
          });
          const allCourses = allCoursesResponse.data?.courses || allCoursesResponse.data || [];
          console.log('All courses fetched:', allCourses.length);
          console.log('Looking for course ID:', id);

          // Find course by ID (prioritize course_id, then MongoDB id)
          const foundCourse = allCourses.find(course => {
            // Try exact matches first
            if (course.course_id === id || course.id === id || course._id === id) {
              return true;
            }

            // Try case-insensitive matches
            if (String(course.course_id).toLowerCase() === String(id).toLowerCase()) {
              return true;
            }

            if (String(course.id).toLowerCase() === String(id).toLowerCase()) {
              return true;
            }

            return false;
          });

          if (foundCourse) {
            console.log('Course match found:', {
              course_id: foundCourse.course_id,
              id: foundCourse.id,
              title: foundCourse.title,
              searchId: id
            });
          }

          if (foundCourse) {
            console.log('Found course via list search:', foundCourse);
            setCourse(foundCourse);
            updateMetaTags(foundCourse);

            // Fetch modules for this course
            await fetchModules(foundCourse.id || foundCourse._id, headers);

            return;
          } else {
            console.log('No course found in list with ID:', id);
            // Log first few courses for debugging
            if (allCourses.length > 0) {
              console.log('Available course IDs:', allCourses.slice(0, 5).map(c => ({
                course_id: c.course_id,
                id: c.id,
                title: c.title
              })));
            }
          }
        } catch (listError) {
          console.warn('Failed to fetch course list:', listError);
          if (listError.response) {
            console.warn('List API Error Response:', {
              status: listError.response.status,
              data: listError.response.data
            });
          }
        }

        // Course not found in list, which is our main data source
        // The API doesn't support direct lookup by course_id, only by MongoDB ObjectID
        console.log(`Course with course_id "${id}" not found in course list`);
        console.log('Available courses:', allCourses.map(c => ({
          course_id: c.course_id,
          id: c.id,
          title: c.title
        })));

        throw new Error(`Course with ID "${id}" not found`);

      } catch (error) {
        console.error('Error fetching course:', error);

        let errorMessage = 'Course not found or failed to load';
        if (error.response?.status === 404) {
          errorMessage = `Course with ID "${id}" was not found`;
        } else if (error.response?.status === 401) {
          errorMessage = 'Authentication required to view this course';
        } else if (error.response?.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (error.message) {
          errorMessage = error.message;
        }

        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [id]);

  // Scroll to top when component mounts or course ID changes
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [id]);

  // Load reviews for current course
  useEffect(() => {
    if (course?.course_id || course?.id) {
      const loadReviews = () => {
        try {
          const storedReviews = JSON.parse(localStorage.getItem('course_reviews') || '[]');
          const courseId = course.course_id || course.id;
          const filteredReviews = storedReviews.filter(review =>
            review.course_id === courseId
          );
          setCourseReviews(filteredReviews);
          console.log('Loaded reviews for course:', courseId, filteredReviews);
        } catch (error) {
          console.error('Error loading reviews:', error);
          setCourseReviews([]);
        }
      };
      loadReviews();
    }
  }, [course]);

  // Cleanup processing timeout on unmount
  useEffect(() => {
    return () => {
      if (processingTimeout) {
        clearTimeout(processingTimeout);
      }
    };
  }, [processingTimeout]);

  // Fetch modules for the course
  const fetchModules = async (courseId, headers = {}) => {
    try {
      console.log('Fetching modules for course:', courseId);
      const modulesResponse = await axios.get(
        `http://localhost:4000/courses/${courseId}/modules`,
        { headers, timeout: 10000 }
      );
      const fetchedModules = modulesResponse.data?.modules || modulesResponse.data || [];
      console.log('Modules fetched:', fetchedModules.length);
      setModules(fetchedModules);
    } catch (error) {
      console.warn('Failed to fetch modules:', error);
      setModules([]);
    }
  };

  // Toggle module expansion
  const toggleModule = (moduleId) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  // Enhanced Social Media Share Functions
  const getCourseUrl = () => {
    return `${window.location.origin}/course/${course.course_id || course.id || course._id}?shared=true`;
  };

  const shareOnFacebook = () => {
    const courseUrl = getCourseUrl();
    const shareText = `🎓 "${course.title}"
    
📚 ${course.category || 'Professional Development'}
⭐ Level: ${course.level || 'All levels'}
💰 Price: $${course.price || 'Contact for pricing'}
    
Join thousands of learners enhancing their skills!`;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(courseUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
  };

  const shareOnTwitter = () => {
    const courseUrl = getCourseUrl();
    const twitterText = `🎓 "${course.title}" - ${course.category || 'Course'} 
    
${course.description?.substring(0, 80) || 'Enhance your skills with expert instruction'}...
    
💰 $${course.price || 'N/A'} | ⭐ ${course.level || 'All levels'}
    
#OnlineLearning #Education #ProfessionalDevelopment
${courseUrl}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  };

  const shareOnLinkedIn = () => {
    const courseUrl = getCourseUrl();
    const linkedinText = `Professional Development Opportunity: "${course.title}"
    
🎯 Category: ${course.category || 'Professional Skills'}
📈 Level: ${course.level || 'All levels'} 
⏱️ Duration: ${course.duration || 'Self-paced'}
💼 Investment: $${course.price || 'Contact for pricing'}
    
${course.description?.substring(0, 200) || 'Comprehensive course designed to enhance your professional skills and advance your career'}...
    
Advance your career with quality online education. Check it out!`;
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(courseUrl)}&summary=${encodeURIComponent(linkedinText)}`;
    window.open(linkedinUrl, '_blank', 'width=600,height=400');
  };

  const shareOnWhatsApp = () => {
    const courseUrl = getCourseUrl();
    const whatsappText = `🎓 *${course.title}*

📝 _${course.description?.substring(0, 120) || 'Amazing course content designed for professional development'}..._

📚 *Course Details:*
• Category: ${course.category || 'Professional Development'}
• Level: ${course.level || 'All levels'}  
• Price: $${course.price || 'Contact for pricing'}
• Duration: ${course.duration || 'Self-paced'}

🚀 Join thousands of learners advancing their careers!

Check it out: ${courseUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareOnInstagram = () => {
    const courseUrl = getCourseUrl();
    // Instagram doesn't support direct URL sharing like other platforms
    // So we'll copy the text and redirect to Instagram web
    const instagramText = `🎓 "${course.title}"
    
📚 ${course.category || 'Course'} | ⭐ ${course.level || 'All levels'}
💰 $${course.price || 'Contact for pricing'}
    
${course.description?.substring(0, 100) || 'Amazing course for professional development'}...
    
🚀 Enhance your skills today!
Link in bio: ${courseUrl}
    
#OnlineLearning #Education #ProfessionalDevelopment #${course.category?.replace(/\s+/g, '') || 'Course'}`;

    // Copy text to clipboard for Instagram post
    try {
      navigator.clipboard.writeText(instagramText).then(() => {
        // Show notification that text is copied
        const notification = document.createElement('div');
        notification.innerHTML = `
          <div style="position: fixed; top: 20px; right: 20px; background: linear-gradient(135deg, #E4405F, #C13584); color: white; padding: 16px 24px; border-radius: 12px; z-index: 9999; box-shadow: 0 10px 25px rgba(0,0,0,0.2); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; gap: 8px;">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
            <span style="font-weight: 500;">Instagram caption copied! Opening Instagram...</span>
          </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => {
          if (notification.parentNode) {
            document.body.removeChild(notification);
          }
        }, 3000);

        // Open Instagram in new tab
        window.open('https://www.instagram.com/', '_blank');
      });
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = instagramText;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Instagram caption copied to clipboard! Now opening Instagram...');
      window.open('https://www.instagram.com/', '_blank');
    }
  };

  const copyToClipboard = async () => {
    const courseUrl = getCourseUrl();
    try {
      await navigator.clipboard.writeText(courseUrl);
      // Show success notification
      const notification = document.createElement('div');
      notification.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 16px 24px; border-radius: 12px; z-index: 9999; box-shadow: 0 10px 25px rgba(0,0,0,0.2); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; gap: 8px;">
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
          <span style="font-weight: 500;">Course link copied to clipboard!</span>
        </div>
      `;
      document.body.appendChild(notification);
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 3000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = courseUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Course link copied to clipboard!');
    }
  };

  // Handle course enrollment
  const handleEnrollment = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login to enroll in this course');
      navigate('/login');
      return;
    }

    try {
      setEnrolling(true);
      // Add enrollment logic here
      alert('Enrollment functionality will be implemented soon!');
    } catch (error) {
      console.error('Error enrolling:', error);
      alert('Failed to enroll. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  // Check if user is logged in
  const isLoggedIn = () => {
    return !!localStorage.getItem('token');
  };

  // Handle enquiry button click
  const handleEnquiryClick = () => {
    if (isLoggedIn()) {
      // If logged in, proceed with payment
      handlePayment();
    } else {
      // If not logged in, show student login form
      navigate('/student-login');
    }
  };

  // Handle payment method - Updated to use Stripe enrollment
  const handlePayment = async () => {
    if (!course) return;

    const courseId = course.id || course._id || course.course_id;

    try {
      // Clear any previous errors/success messages
      setPaymentError(null);
      setPaymentSuccess(null);

      // Clear any existing timeout
      if (processingTimeout) {
        clearTimeout(processingTimeout);
      }

      // Set this specific course as processing
      setProcessingCourseId(courseId);

      // Set a safety timeout to clear processing state after 30 seconds
      const timeoutId = setTimeout(() => {
        console.warn('Processing timeout - resetting state');
        setProcessingCourseId(null);
        setPaymentError('Request timed out. Please try again.');
      }, 30000);
      setProcessingTimeout(timeoutId);

      // Check if user is logged in
      if (!isLoggedIn()) {
        clearTimeout(timeoutId);
        setProcessingCourseId(null);
        setPaymentError('Please login to enroll in this course');
        // Add small delay before navigation
        setTimeout(() => {
          navigate('/student-login');
        }, 1500);
        return;
      }

      // Check if course is free
      const price = parseFloat(course.price);
      if (isNaN(price) || price === 0) {
        await handleFreeEnrollment();
        clearTimeout(timeoutId);
        setProcessingCourseId(null);
        return;
      }

      // Handle paid course enrollment with Stripe
      // Note: handlePaidEnrollment will clear processingCourseId before redirect
      await handlePaidEnrollment();

      // Clear timeout if we get here
      clearTimeout(timeoutId);
    } catch (error) {
      console.error('Error during enrollment:', error);
      if (processingTimeout) {
        clearTimeout(processingTimeout);
      }
      setProcessingCourseId(null);
      setPaymentError(error.message || 'Failed to start enrollment process. Please try again.');
    }
  };

  // Handle free course enrollment
  const handleFreeEnrollment = async () => {
    try {
      // For free courses, directly call the enrollment API
      const studentId = paymentServices.getStudentId();
      if (!studentId) {
        throw new Error('Please login to enroll in courses');
      }

      const courseId = course.id || course._id || course.course_id;

      // Call backend to enroll student in free course
      const result = await paymentServices.enrollFreeCourse(courseId, studentId);

      // Show success message
      setPaymentSuccess(`Successfully enrolled in "${course.title}" 🎉`);

      // Dispatch custom event for other components
      window.dispatchEvent(new CustomEvent('courseEnrolled', {
        detail: { courseId, courseTitle: course.title }
      }));

    } catch (error) {
      console.error('Free enrollment error:', error);
      setPaymentError(error.message || 'Failed to enroll in free course');
    }
  };

  // Handle paid course enrollment with Stripe
  const handlePaidEnrollment = async () => {
    try {
      console.log('🔄 Starting paid enrollment for course:', course.title);

      const courseId = course.id || course._id || course.course_id;

      // Validate user is logged in
      if (!paymentServices.getStudentId()) {
        throw new Error('Please login to enroll in courses');
      }

      // Get course price and validate
      const amount = parseFloat(course.price);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Invalid course price');
      }

      console.log('💰 Payment amount (USD):', amount);

      console.log('📝 Creating Stripe checkout session for course:', courseId, 'Amount:', amount);

      // Create Stripe checkout session from backend
      const sessionData = await paymentServices.createCheckoutSession(
        courseId,
        amount,
        'USD',
        course.title
      );
      console.log('✅ Checkout session created successfully:', sessionData);

      // Validate response
      if (!sessionData || !sessionData.session_id) {
        console.error('Invalid session response:', sessionData);
        throw new Error('Invalid checkout session response');
      }

      // Save payment data to localStorage for return handling
      localStorage.setItem('pendingPayment', JSON.stringify({
        courseId: courseId,
        courseTitle: course.title,
        amount: amount,
        sessionId: sessionData.session_id,
        timestamp: new Date().toISOString()
      }));

      // Clear processing state before redirect (since the page will change)
      setProcessingCourseId(null);

      // Add a small delay to ensure state update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Redirect to Stripe checkout
      console.log('🚀 Redirecting to Stripe checkout...');
      await paymentServices.redirectToCheckout(sessionData.session_id);

      // If we reach here, the redirect failed - reset processing state
      setProcessingCourseId(null);

    } catch (error) {
      console.error('❌ Error in paid enrollment process:', error);

      // Clear processing state on error
      setProcessingCourseId(null);

      // Set user-friendly error message
      let errorMessage = 'Failed to initiate payment. Please try again.';
      if (error.message.includes('login')) {
        errorMessage = 'Please login to enroll in courses.';
      } else if (error.message.includes('price')) {
        errorMessage = 'Invalid course price. Please contact support.';
      } else if (error.message.includes('session')) {
        errorMessage = 'Payment system error. Please try again or contact support.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setPaymentError(errorMessage);

      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#988913] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading course details...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <ExclamationCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Course Not Found</h2>
          <p className="text-gray-600 mb-4">{error || 'The course you are looking for does not exist.'}</p>

          {/* Debug information */}
          <div className="text-sm text-gray-500 mb-6 p-3 bg-gray-100 rounded">
            <p>Looking for course ID: <code className="font-mono bg-white px-1 rounded">{id}</code></p>
            <p className="mt-1">If you're an instructor, this course might be in draft mode or not yet published.</p>
          </div>

          <div className="space-x-3">
            <button
              onClick={() => navigate('/browse')}
              className="px-6 py-3 bg-[#988913] text-white rounded-lg hover:bg-[#887a11] transition-colors"
            >
              Browse Courses
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Payment Success Message */}
      {paymentSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center max-w-md">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-orange-800">{paymentSuccess}</p>
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={() => setPaymentSuccess(null)}
              className="text-orange-400 hover:text-orange-600"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Payment Error Message */}
      {paymentError && (
        <div className="fixed top-4 right-4 z-50 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center max-w-md">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-red-800">{paymentError}</p>
          </div>
          <div className="ml-4 flex-shrink-0">
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
      {/* Hero Section - Coursera Style */}
      <div className="bg-white">
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Breadcrumb */}
            <div className="text-sm text-gray-600 mb-6">
              <span>Programming</span>
              <span className="mx-2">/</span>
              <span>Web Development</span>
              <span className="mx-2">/</span>
              <span>{course.category || 'FastAPI'}</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Side - Course Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* University/Provider */}
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-600 rounded flex items-center justify-center">
                    <span className="text-white font-bold text-lg">L</span>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">Skill Wallah EdTech</div>
                  </div>
                </div>

                {/* Course Title */}
                <h1 className="text-4xl font-bold text-gray-900 leading-tight">
                  {course.title || 'FastAPI Development Course'}
                </h1>

                {/* Provider Info */}
                <div className="text-gray-600">
                  {course.instructor_name || course.instructor || 'Skill Wallah EdTech'} via Online Learning
                  <span className="ml-2 w-4 h-4 inline-block bg-blue-600 rounded-full"></span>
                </div>

                {/* Rating and Reviews */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-5 h-5 ${i < Math.floor(course.rating || 4.5) ? 'text-blue-500' : 'text-gray-300'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-gray-700 font-medium">
                    {course.rating || '4.5'} ({course.total_ratings || 0} reviews)
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-blue-600 cursor-pointer">
                    <UserGroupIcon className="w-5 h-5" />
                    <span className="font-medium">{course.enrolled_students || 0} enrolled</span>
                  </div>
                  {/* <div className="flex items-center space-x-2 text-gray-600 cursor-pointer">
                    <span>📋</span>
                    <span>Add to list</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600 cursor-pointer">
                    <CheckCircleIcon className="w-5 h-5" />
                    <span>Mark complete</span>
                  </div> */}
                  <button
                    onClick={() => setShowReviewModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <StarIcon className="w-4 h-4" />
                    <span>Write review</span>
                  </button>
                </div>

                {/* Course Description Preview */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Overview</h3>
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">🎓</span>
                      <div>
                        <div className="font-semibold text-blue-900">Skill Wallah EdTech Special Offer:</div>
                        <div className="text-blue-800">All Certificates & Courses 30% Off!</div>
                      </div>
                      {/* <button className="ml-auto bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                        Grab it
                      </button> */}
                    </div>
                  </div>
                  <p className="text-gray-700 leading-relaxed">
                    {course.description || 'This comprehensive course will teach you FastAPI, a modern web framework for building APIs with Python. Learn to create high-performance, production-ready web applications with automatic API documentation, authentication, and more...'}
                  </p>
                </div>
              </div>

              {/* Right Side - Course Info Card */}
              <div className="space-y-6">
                {/* Course Thumbnail */}
                <div className="relative">
                  <img
                    src={course.thumbnail || course.image || '/api/placeholder/400/250'}
                    alt={course.title || 'Course Thumbnail'}
                    className="w-full h-48 object-cover rounded-lg"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/400x250/6366f1/ffffff?text=FASTAPI+COURSE';
                    }}
                  />
                </div>

                {/* Enquiry Button */}
                <button
                  onClick={handleEnquiryClick}
                  disabled={processingCourseId === (course.id || course._id || course.course_id)}
                  className={`w-full bg-gradient-to-r from-[#988913] to-[#c5a32e] hover:from-[#c5a32e] hover:to-[#988913] text-white py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 ${processingCourseId === (course.id || course._id || course.course_id) ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                  {processingCourseId === (course.id || course._id || course.course_id) ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <ChatBubbleLeftRightIcon className="w-5 h-5" />
                      <span>Enroll</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>

                {/* Course Info */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <span>💰</span>
                      <span className="font-medium">Skill Wallah EdTech</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        ${course.price || '49'}
                      </div>
                      {course.original_price && (
                        <div className="text-sm text-gray-500 line-through">
                          ${course.original_price}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="inline-flex items-center space-x-2 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    <span>Paid Course</span>
                  </div>

                  <div className="flex items-center space-x-2 text-gray-600">
                    <span>🗣️</span>
                    <span>{course.language || 'English'}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-gray-600">
                    <span>🎓</span>
                    <span>Paid Certificate Available</span>
                  </div>

                  <div className="flex items-center space-x-2 text-gray-600">
                    <ClockIcon className="w-5 h-5" />
                    <span>{course.duration || '12 hours 30 minutes'}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-gray-600">
                    <span>📱</span>
                    <span>On-Demand</span>
                  </div>

                  {/* <div className="text-gray-600 text-sm">
                    <div className="flex items-start space-x-2">
                      <GlobeAltIcon className="w-4 h-4 mt-0.5" />
                      <div>
                        <span>Arabic, French, Portuguese, Chinese, Italian, German, Russian, English, Spanish, Hebrew, Serbian, Greek, Hindi, Pashto, Nepali, Hungarian, Ukrainian, Indonesian, Urdu, Kazakh, Swedish, Greek, Thai, Japanese, Azerbaijani, Polish, Farsi, Dutch, Turkish</span>
                      </div>
                    </div>
                  </div> */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-6xl mx-auto">
            {/* Course Content - Full Width */}
            <div className="space-y-6">
              {/* What You'll Learn */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">What you'll learn</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {course.learning_objectives && course.learning_objectives.length > 0 ? (
                    course.learning_objectives.map((objective, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <CheckCircleIcon className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{objective}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex items-start space-x-2">
                        <CheckCircleIcon className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Master the fundamentals of {course.category}</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <CheckCircleIcon className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Gain practical, hands-on experience</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <CheckCircleIcon className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Build real-world projects for your portfolio</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <CheckCircleIcon className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Apply skills to professional environments</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Course Requirements */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Requirements</h2>
                <ul className="space-y-2 text-sm">
                  {course.requirements && course.requirements.length > 0 ? (
                    Array.isArray(course.requirements) ? (
                      course.requirements.map((req, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-gray-500 mt-1">•</span>
                          <span className="text-gray-700">{req}</span>
                        </li>
                      ))
                    ) : (
                      <li className="flex items-start space-x-2">
                        <span className="text-gray-500 mt-1">•</span>
                        <span className="text-gray-700">{course.requirements}</span>
                      </li>
                    )
                  ) : (
                    <>
                      <li className="flex items-start space-x-2">
                        <span className="text-gray-500 mt-1">•</span>
                        <span className="text-gray-700">Basic understanding of computer operations</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-gray-500 mt-1">•</span>
                        <span className="text-gray-700">A computer with internet access</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-gray-500 mt-1">•</span>
                        <span className="text-gray-700">Willingness to learn and practice</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>

              {/* Course Description */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Description</h2>
                <div className="prose max-w-none text-sm text-gray-700 leading-relaxed space-y-4">
                  <p>{course.description}</p>

                  {course.highlights && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Course Highlights:</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {course.highlights.split(',').map((highlight, index) => (
                          <li key={index}>{highlight.trim()}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {course.outcomes && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">What You'll Achieve:</h3>
                      <p>{course.outcomes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Who This Course Is For */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Who this course is for:</h2>
                <ul className="space-y-2 text-sm">
                  {course.target_audience && course.target_audience.length > 0 ? (
                    Array.isArray(course.target_audience) ? (
                      course.target_audience.map((audience, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-gray-500 mt-1">•</span>
                          <span className="text-gray-700">{audience}</span>
                        </li>
                      ))
                    ) : (
                      <li className="flex items-start space-x-2">
                        <span className="text-gray-500 mt-1">•</span>
                        <span className="text-gray-700">{course.target_audience}</span>
                      </li>
                    )
                  ) : (
                    <>
                      <li className="flex items-start space-x-2">
                        <span className="text-gray-500 mt-1">•</span>
                        <span className="text-gray-700">Beginners with no prior experience in {course.category}</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-gray-500 mt-1">•</span>
                        <span className="text-gray-700">Students looking to enhance their skills</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-gray-500 mt-1">•</span>
                        <span className="text-gray-700">Professionals seeking career advancement</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-gray-500 mt-1">•</span>
                        <span className="text-gray-700">Anyone interested in learning {course.category}</span>
                      </li>
                    </>
                  )}
                </ul>

                {/* Learning Objectives */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Key Skills</h3>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mt-0.5">
                          <CheckCircleIcon className="w-4 h-4 text-orange-600" />
                        </div>
                        <span className="text-gray-700">Comprehensive understanding of {course.category}</span>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mt-0.5">
                          <CheckCircleIcon className="w-4 h-4 text-orange-600" />
                        </div>
                        <span className="text-gray-700">Hands-on practical experience</span>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mt-0.5">
                          <CheckCircleIcon className="w-4 h-4 text-orange-600" />
                        </div>
                        <span className="text-gray-700">Industry best practices and techniques</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Course Benefits</h3>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                          <StarIcon className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-gray-700">Professional certification upon completion</span>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                          <StarIcon className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-gray-700">Career advancement opportunities</span>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                          <StarIcon className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-gray-700">Lifetime access to course materials</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Course Tags */}
              {course.tags && course.tags.length > 0 && (
                <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mr-4">
                      <span className="text-white font-bold text-lg">#</span>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">Topics Covered</h2>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {course.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#988913]/10 via-amber-50 to-yellow-50 text-[#887a11] rounded-2xl text-sm font-semibold border-2 border-[#988913]/20 hover:border-[#988913]/40 transition-colors shadow-sm"
                      >
                        <span className="w-2 h-2 bg-[#988913] rounded-full mr-2"></span>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Instructor Profile */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Instructor</h2>

                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 bg-gradient-to-r from-[#988913] to-[#887a11] rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                      {(course.instructor_name || course.instructor || 'I').charAt(0).toUpperCase()}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-purple-600 hover:text-purple-800 cursor-pointer mb-1">
                      {course.instructor_name || course.instructor || 'Dr. Angela Yu'}
                    </h3>
                    <p className="text-gray-600 mb-3">{course.instructor_title || 'Developer and Lead Instructor'}</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div className="flex items-center space-x-2">
                        <StarIcon className="w-4 h-4 text-gray-500" />
                        <span>{course.instructor_rating || '4.7'} Instructor Rating</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <UserGroupIcon className="w-4 h-4 text-gray-500" />
                        <span>{course.instructor_students || '2,919,588'} Students</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <PlayIcon className="w-4 h-4 text-gray-500" />
                        <span>{course.instructor_courses || '5'} Courses</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircleIcon className="w-4 h-4 text-gray-500" />
                        <span>{course.instructor_reviews || '724,724'} Reviews</span>
                      </div>
                    </div>

                    <div className="text-sm text-gray-700 leading-relaxed space-y-3">
                      <p>{course.instructor_bio || `I'm ${course.instructor_name || 'an experienced developer'} with extensive experience in ${course.category || 'web development'}. I have been teaching and helping students achieve their programming goals for many years.`}</p>

                      <p>I am the lead instructor at the Skill Wallah EdTech of Programming, where I have helped thousands of students transition into successful careers in technology.</p>

                      {course.instructor_experience && <p>{course.instructor_experience}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Student Reviews */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Student feedback</h2>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="text-4xl font-bold text-orange-500">
                        {courseReviews.length > 0
                          ? (courseReviews.reduce((sum, r) => sum + r.rating, 0) / courseReviews.length).toFixed(1)
                          : (course.rating || '4.7')
                        }
                      </div>
                      <div>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => {
                            const avgRating = courseReviews.length > 0
                              ? courseReviews.reduce((sum, r) => sum + r.rating, 0) / courseReviews.length
                              : (course.rating || 4.7);
                            return (
                              <StarIcon key={i} className={`w-4 h-4 ${i < Math.floor(avgRating) ? 'text-orange-400 fill-current' : 'text-gray-300'}`} />
                            );
                          })}
                        </div>
                        <div className="text-sm text-gray-600">
                          {courseReviews.length > 0 ? `${courseReviews.length} review${courseReviews.length !== 1 ? 's' : ''}` : 'Course Rating'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {courseReviews.length > 0 ? (
                    <>
                      {(showAllReviews ? courseReviews : courseReviews.slice(0, 3)).map((review, index) => {
                        const colors = ['purple', 'orange', 'blue', 'pink', 'indigo', 'red', 'yellow', 'teal'];
                        const color = colors[index % colors.length];
                        const initials = review.user_name ? review.user_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';
                        const timeAgo = new Date(review.created_at) ? (() => {
                          const diff = Date.now() - new Date(review.created_at).getTime();
                          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                          const hours = Math.floor(diff / (1000 * 60 * 60));
                          const minutes = Math.floor(diff / (1000 * 60));
                          if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
                          if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
                          if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
                          return 'Just now';
                        })() : 'Recently';

                        return (
                          <div key={index} className="border-b border-gray-200 pb-6 last:border-0">
                            <div className="flex items-start space-x-3 mb-3">
                              <div className={`w-10 h-10 bg-${color}-500 rounded-full flex items-center justify-center text-white font-medium`}>
                                {initials}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="font-medium text-gray-900">{review.user_name || 'Anonymous'}</span>
                                  <div className="flex">
                                    {[...Array(5)].map((_, i) => (
                                      <StarIcon key={i} className={`w-3 h-3 ${i < review.rating ? 'text-orange-400 fill-current' : 'text-gray-300'}`} />
                                    ))}
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 mb-2">{timeAgo}</div>
                                <p className="text-sm text-gray-700">{review.comment}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {courseReviews.length > 3 && (
                        <div className="text-center">
                          <button
                            onClick={() => setShowAllReviews(!showAllReviews)}
                            className="text-purple-600 hover:text-purple-800 font-medium text-sm transition-colors"
                          >
                            {showAllReviews ? 'Show less' : `Show all ${courseReviews.length} reviews`}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-400 mb-2">
                        <StarIcon className="w-12 h-12 mx-auto" />
                      </div>
                      <p className="text-gray-600 font-medium mb-1">No reviews yet</p>
                      <p className="text-sm text-gray-500">Be the first to review this course!</p>
                      <button
                        onClick={() => setShowReviewModal(true)}
                        className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
                      >
                        <StarIcon className="w-4 h-4" />
                        <span>Write the first review</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Review Modal */}
              {showReviewModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
                    <button
                      onClick={() => {
                        setShowReviewModal(false);
                        setReviewError(null);
                        setReviewSuccess(null);
                      }}
                      className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>

                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Write a Review</h3>

                    {reviewSuccess && (
                      <div className="mb-4 bg-orange-100 border border-orange-400 text-orange-700 px-4 py-3 rounded-lg">
                        {reviewSuccess}
                      </div>
                    )}

                    {reviewError && (
                      <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                        {reviewError}
                      </div>
                    )}

                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      setSubmittingReview(true);
                      setReviewError(null);
                      setReviewSuccess(null);

                      try {
                        // Get user info from localStorage
                        const userStr = localStorage.getItem('user');
                        const user = userStr ? JSON.parse(userStr) : null;

                        const reviewPayload = {
                          course_id: course.course_id || course.id,
                          rating: reviewData.rating,
                          comment: reviewData.comment,
                          user_name: reviewData.user_name || user?.name || user?.username || 'Anonymous',
                          user_id: user?.id || user?._id || 'guest',
                          created_at: new Date().toISOString()
                        };

                        console.log('Submitting review:', reviewPayload);

                        // Submit review via API - try multiple endpoints
                        let response;
                        const endpoints = [
                          'http://localhost:4000/course-reviews/',
                          'http://localhost:4000/feedback/',
                        ];

                        let success = false;
                        for (const endpoint of endpoints) {
                          try {
                            response = await fetch(endpoint, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify(reviewPayload)
                            });

                            if (response.ok) {
                              success = true;
                              break;
                            }
                          } catch (err) {
                            console.warn(`Failed to submit to ${endpoint}:`, err);
                          }
                        }

                        if (success) {
                          const result = await response.json();
                          console.log('Review submitted:', result);
                          setReviewSuccess('Thank you for your review! It will be displayed once approved.');

                          // Reset form
                          setReviewData({
                            rating: 5,
                            comment: '',
                            user_name: ''
                          });

                          // Close modal after 2 seconds
                          setTimeout(() => {
                            setShowReviewModal(false);
                            setReviewSuccess(null);
                          }, 2000);
                        } else {
                          // Fallback: Store review in localStorage for now
                          const storedReviews = JSON.parse(localStorage.getItem('course_reviews') || '[]');
                          storedReviews.push(reviewPayload);
                          localStorage.setItem('course_reviews', JSON.stringify(storedReviews));

                          setReviewSuccess('Thank you for your review! It has been saved successfully.');

                          // Reset form
                          setReviewData({
                            rating: 5,
                            comment: '',
                            user_name: ''
                          });

                          // Reload reviews
                          const updatedReviews = JSON.parse(localStorage.getItem('course_reviews') || '[]');
                          const courseId = course.course_id || course.id;
                          const filteredReviews = updatedReviews.filter(review => review.course_id === courseId);
                          setCourseReviews(filteredReviews);

                          // Close modal after 2 seconds
                          setTimeout(() => {
                            setShowReviewModal(false);
                            setReviewSuccess(null);
                          }, 2000);
                        }
                      } catch (error) {
                        console.error('Error submitting review:', error);

                        // Fallback: Store review in localStorage
                        try {
                          const reviewPayload = {
                            course_id: course.course_id || course.id,
                            rating: reviewData.rating,
                            comment: reviewData.comment,
                            user_name: reviewData.user_name || 'Anonymous',
                            created_at: new Date().toISOString()
                          };

                          const storedReviews = JSON.parse(localStorage.getItem('course_reviews') || '[]');
                          storedReviews.push(reviewPayload);
                          localStorage.setItem('course_reviews', JSON.stringify(storedReviews));

                          setReviewSuccess('Thank you for your review! It has been saved successfully.');

                          // Reset form
                          setReviewData({
                            rating: 5,
                            comment: '',
                            user_name: ''
                          });

                          // Close modal after 2 seconds
                          setTimeout(() => {
                            setShowReviewModal(false);
                            setReviewSuccess(null);
                          }, 2000);
                        } catch (storageError) {
                          setReviewError('Error submitting review. Please try again.');
                        }
                      } finally {
                        setSubmittingReview(false);
                      }
                    }}>
                      <div className="space-y-4">
                        {/* Name Input */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Your Name
                          </label>
                          <input
                            type="text"
                            value={reviewData.user_name}
                            onChange={(e) => setReviewData({ ...reviewData, user_name: e.target.value })}
                            placeholder="Enter your name"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {/* Rating */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Rating
                          </label>
                          <div className="flex space-x-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setReviewData({ ...reviewData, rating: star })}
                                className="focus:outline-none transition-transform hover:scale-110"
                              >
                                <StarIcon
                                  className={`w-8 h-8 ${star <= reviewData.rating
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                    }`}
                                />
                              </button>
                            ))}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {reviewData.rating} out of 5 stars
                          </p>
                        </div>

                        {/* Review Text */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Your Review
                          </label>
                          <textarea
                            value={reviewData.comment}
                            onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                            placeholder="Share your experience with this course..."
                            rows="4"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          />
                        </div>

                        {/* Submit Button */}
                        <div className="flex space-x-3">
                          <button
                            type="button"
                            onClick={() => {
                              setShowReviewModal(false);
                              setReviewError(null);
                              setReviewSuccess(null);
                            }}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            disabled={submittingReview}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={submittingReview || !reviewData.comment.trim()}
                            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                          >
                            {submittingReview ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Submitting...</span>
                              </>
                            ) : (
                              <>
                                <StarIcon className="w-4 h-4" />
                                <span>Submit Review</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Enhanced Share Course Section */}
              <div className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 rounded-2xl shadow-xl p-8 border border-blue-200/50 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
                      <ShareIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Share this course</h2>
                      <p className="text-gray-600 text-sm">Help others discover this amazing learning opportunity</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowShareModal(!showShareModal)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="More sharing options"
                  >
                    <EyeIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Share Buttons Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                  {/* Facebook */}
                  <button
                    onClick={shareOnFacebook}
                    className="group flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-2xl relative overflow-hidden"
                    title="Share on Facebook"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>

                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mb-2 group-hover:bg-white/30 transition-colors">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold">Facebook</span>
                  </button>

                  {/* Twitter */}
                  <button
                    onClick={shareOnTwitter}
                    className="group flex flex-col items-center justify-center p-6 bg-gradient-to-br from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white rounded-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-2xl relative overflow-hidden"
                    title="Share on Twitter"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>

                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mb-2 group-hover:bg-white/30 transition-colors">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold">Twitter</span>
                  </button>

                  {/* LinkedIn */}
                  <button
                    onClick={shareOnLinkedIn}
                    className="group flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white rounded-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-2xl relative overflow-hidden"
                    title="Share on LinkedIn"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>

                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mb-2 group-hover:bg-white/30 transition-colors">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold">LinkedIn</span>
                  </button>

                  {/* WhatsApp */}
                  <button
                    onClick={shareOnWhatsApp}
                    className="group flex flex-col items-center justify-center p-6 bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-2xl relative overflow-hidden"
                    title="Share on WhatsApp"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>

                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mb-2 group-hover:bg-white/30 transition-colors">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold">WhatsApp</span>
                  </button>

                  {/* Instagram */}
                  <button
                    onClick={shareOnInstagram}
                    className="group flex flex-col items-center justify-center p-6 bg-gradient-to-br from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-2xl relative overflow-hidden"
                    title="Share on Instagram"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>

                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mb-2 group-hover:bg-white/30 transition-colors">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold">Instagram</span>
                  </button>

                  {/* Copy Link */}
                  <button
                    onClick={copyToClipboard}
                    className="group flex flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-2xl relative overflow-hidden"
                    title="Copy Link"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>

                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mb-2 group-hover:bg-white/30 transition-colors">
                      <LinkIcon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold">Copy Link</span>
                  </button>
                </div>

                {/* Enhanced Copy Link Section */}
                <div className="mt-6 p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl border border-gray-200/50">
                  <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                    <LinkIcon className="w-4 h-4 mr-2 text-blue-600" />
                    Direct Course Link
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      readOnly
                      value={getCourseUrl()}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm bg-white cursor-pointer hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-gray-600"
                      onClick={copyToClipboard}
                      title="Click to copy course link"
                    />
                    <button
                      onClick={copyToClipboard}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <LinkIcon className="w-4 h-4" />
                      <span className="font-medium">Copy</span>
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-gray-500">
                    Share this link to help others discover this course
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enquiry Modal */}
      <ConnectWithUsModal
        isOpen={isEnquiryModalOpen}
        onClose={() => setIsEnquiryModalOpen(false)}
      />
    </div>
  );
};

export default CourseDetail;