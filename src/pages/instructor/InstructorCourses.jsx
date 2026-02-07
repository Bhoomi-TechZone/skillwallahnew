import {
  BookOpenIcon,
  CheckIcon,
  ClockIcon,
  CloudArrowUpIcon,
  CurrencyDollarIcon,
  DocumentIcon,
  EyeIcon,
  AdjustmentsHorizontalIcon as FilterIcon,
  PencilIcon,
  PlusIcon,
  MagnifyingGlassIcon as SearchIcon,
  ShareIcon,
  StarIcon,
  TrashIcon,
  UserGroupIcon,
  VideoCameraIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import CreateCourseModal from '../../components/CreateCourseModal';

// Throttle function to prevent excessive progress updates and reduce flickering
const throttle = (func, delay) => {
  let timeoutId;
  let lastExecTime = 0;
  return (...args) => {
    const currentTime = Date.now();
    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
};

const InstructorCourses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('title');
  const [viewMode, setViewMode] = useState('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showModulesModal, setShowModulesModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Add custom animations via style tag
  useEffect(() => {
    const styleId = 'upload-modal-animations';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scaleIn 0.3s ease-out;
        }
        .scroll-smooth {
          scroll-behavior: smooth;
        }
        .scroll-smooth::-webkit-scrollbar {
          width: 8px;
        }
        .scroll-smooth::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .scroll-smooth::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #3b82f6, #8b5cf6);
          border-radius: 10px;
        }
        .scroll-smooth::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #2563eb, #7c3aed);
        }
        
        /* Anti-flickering optimizations */
        .upload-progress-bar {
          will-change: width;
          transform: translateZ(0);
          backface-visibility: hidden;
        }
        
        .upload-modal-content {
          will-change: transform, opacity;
          transform: translateZ(0);
          backface-visibility: hidden;
        }
        
        .upload-button {
          will-change: transform, background-color;
          transform: translateZ(0);
          backface-visibility: hidden;
        }
      `;
      document.head.appendChild(style);
    }
    return () => {
      const styleElement = document.getElementById(styleId);
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, []);
  const [viewingCourse, setViewingCourse] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingCourse, setUploadingCourse] = useState(null);
  const [uploadType, setUploadType] = useState('lecture'); // 'lecture' or 'pdf'
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);

  // Throttled progress updater to reduce flickering
  const throttledProgressUpdate = useCallback(
    throttle((progress) => {
      setUploadProgress(progress);
    }, 100), // Update every 100ms max
    []
  );

  const [lectureDetails, setLectureDetails] = useState({
    title: '',
    description: '',
    duration: '',
    order: 1,
    isPreview: false,
    module: '',
    tags: []
  });
  const [pdfDetails, setPdfDetails] = useState({
    title: '',
    description: '',
    category: 'material', // material, assignment, resource
    module: ''
  });
  const [dragActive, setDragActive] = useState(false);
  const [existingLectures, setExistingLectures] = useState([]);
  const [existingPdfs, setExistingPdfs] = useState([]);
  const [showExistingContent, setShowExistingContent] = useState(false);
  const [modules, setModules] = useState([]);
  const [newModuleName, setNewModuleName] = useState('');
  const [showAddModule, setShowAddModule] = useState(false);

  // Refs to track modal loading state and prevent duplicate fetches
  const modalHasLoadedRef = useRef(false);
  const modalCourseIdRef = useRef(null);
  const [isLoadingModalContent, setIsLoadingModalContent] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharingCourse, setSharingCourse] = useState(null);
  const [shareUrl, setShareUrl] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [shareContentPreview, setShareContentPreview] = useState('');
  const [customShareMessage, setCustomShareMessage] = useState('');
  const [openDropdownCourseId, setOpenDropdownCourseId] = useState(null);
  const [showContentPreview, setShowContentPreview] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [lastSharedPlatform, setLastSharedPlatform] = useState('');
  const [shareCount, setShareCount] = useState({});
  const [showLectureViewerModal, setShowLectureViewerModal] = useState(false);
  const [lectureViewerCourse, setLectureViewerCourse] = useState(null);
  const [uploadDropdownOpen, setUploadDropdownOpen] = useState(null); // Track which course's upload dropdown is open
  const fileInputRef = useRef(null);

  // Form state management
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    originalPrice: '',
    duration: '',
    level: 'Beginner',
    language: 'english',
    tags: '',
    thumbnail: ''
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createSuccess, setCreateSuccess] = useState(null);

  // Optimized input change handler
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Reset form function
  const resetForm = useCallback(() => {
    setFormData({
      title: '',
      description: '',
      category: '',
      price: '',
      originalPrice: '',
      duration: '',
      level: 'Beginner',
      language: 'english',
      tags: '',
      thumbnail: ''
    });
    setCreateError(null);
    setCreateSuccess(null);
    setIsEditing(false);
    setEditingCourse(null);
  }, []);

  // Fetch user profile
  const fetchUserProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await axios.get('http://localhost:4000/auth/profile', { headers });
      setUserProfile(response.data);
      console.log('User profile loaded:', response.data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Fallback to localStorage
      try {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (storedUser && storedUser.user_id) {
          setUserProfile(storedUser);
        }
      } catch (e) {
        console.warn('Error parsing stored user data:', e);
      }
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // Fetch courses
  const fetchCourses = useCallback(async () => {
    console.log('[fetchCourses] Called at:', new Date().toISOString());
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.get('http://localhost:4000/instructor/my-courses', { headers });

      console.log('[fetchCourses] API Response:', response.data);

      let coursesData = [];

      // Handle the instructor my-courses API response structure
      if (response.data && response.data.success && response.data.data && Array.isArray(response.data.data.courses)) {
        coursesData = response.data.data.courses;
      } else if (response.data && Array.isArray(response.data.courses)) {
        coursesData = response.data.courses;
      } else if (Array.isArray(response.data)) {
        coursesData = response.data;
      } else {
        console.warn('[fetchCourses] Unexpected response structure:', response.data);
        coursesData = [];
      }

      console.log('[fetchCourses] Success - Courses count:', coursesData.length);
      setCourses(coursesData);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError(error.response?.data?.detail || error.message || 'Failed to fetch courses');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle course creation and updating
  const handleCreateCourse = useCallback(async (courseFormData) => {
    console.log('Form submitted with data:', courseFormData);

    // Validate required fields
    if (!courseFormData.title.trim()) {
      setCreateError('Course title is required');
      return false;
    }
    if (!courseFormData.description.trim()) {
      setCreateError('Course description is required');
      return false;
    }
    if (!courseFormData.category) {
      setCreateError('Course category is required');
      return false;
    }
    if (!courseFormData.price || parseFloat(courseFormData.price) <= 0) {
      setCreateError('Valid course price is required');
      return false;
    }

    setCreating(true);
    setCreateError(null);
    setCreateSuccess(null);

    try {
      const token = localStorage.getItem('token');

      // Use existing userProfile state instead of fetching again
      let currentUser = userProfile || {};

      // Fallback to localStorage if userProfile is not available
      if (!currentUser.user_id && !currentUser._id && !currentUser.id) {
        try {
          currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        } catch (e) {
          console.warn('Error parsing user data:', e);
        }
      }

      // Last resort: use test user data
      if (!currentUser.user_id && !currentUser._id && !currentUser.id) {
        currentUser = {
          user_id: 'test_instructor_' + Date.now(),
          name: 'Test Instructor',
          role: 'instructor'
        };
        console.log('Using test user data:', currentUser);
      }

      console.log('Token:', token ? 'Present' : 'Missing');
      console.log('Current user:', currentUser);

      // Prepare data for backend
      const courseData = {
        title: courseFormData.title.trim(),
        description: courseFormData.description.trim(),
        instructor: currentUser.user_id || currentUser._id || currentUser.id || 'default_instructor',
        instructor_name: currentUser.name || currentUser.full_name || 'Instructor',
        price: parseFloat(courseFormData.price) || 0,
        original_price: parseFloat(courseFormData.originalPrice) || parseFloat(courseFormData.price) || 0,
        thumbnail: courseFormData.thumbnail.trim() || 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=300',
        category: courseFormData.category.trim(),
        duration: courseFormData.duration.trim(),
        lessons: parseInt(courseFormData.lessons) || 0,
        level: courseFormData.level,
        language: courseFormData.language,
        tags: courseFormData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        published: Boolean(courseFormData.published),
        created_by: currentUser.user_id || currentUser._id || currentUser.id || 'default_user',
        created_by_role: currentUser.role || 'instructor'
      };

      console.log(`${isEditing ? 'Updating' : 'Creating'} course with data:`, courseData);

      let response;
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      if (isEditing && editingCourse) {
        // Validate courseId before making API call
        const courseId = editingCourse.id || editingCourse._id;
        if (!courseId || courseId === 'undefined') {
          console.error('Invalid courseId for editing course:', editingCourse);
          alert('Error: Invalid course ID. Please refresh the page and try again.');
          return;
        }

        // For updates, exclude fields that should not be changed and ensure proper types
        const validLevels = ['Beginner', 'Intermediate', 'Advanced'];

        // Ensure price validation - original_price must be >= price
        const price = parseFloat(courseData.price) || 0;
        const originalPrice = parseFloat(courseData.original_price) || 0;

        // If original_price is less than price, set it to price to avoid validation error
        const validatedOriginalPrice = originalPrice < price ? price : originalPrice;

        // Warn user if we adjusted the original price
        if (originalPrice < price && originalPrice > 0) {
          console.warn(`Price validation: Original price (${originalPrice}) was less than current price (${price}). Adjusted original price to ${validatedOriginalPrice}.`);
        }

        const updateData = {
          title: courseData.title,
          description: courseData.description,
          price: price,
          original_price: validatedOriginalPrice,
          thumbnail: courseData.thumbnail,
          category: courseData.category,
          duration: courseData.duration,
          lessons: parseInt(courseData.lessons) || 0,
          level: validLevels.includes(courseData.level) ? courseData.level : 'Beginner',
          language: courseData.language,
          tags: Array.isArray(courseData.tags) ? courseData.tags : [],
          published: Boolean(courseData.published)
        };

        // Remove any undefined or null values
        Object.keys(updateData).forEach(key => {
          if (updateData[key] === undefined || updateData[key] === null) {
            delete updateData[key];
          }
        });

        console.log('=== COURSE UPDATE DEBUG ===');
        console.log('Course ID:', courseId);
        console.log('Is Editing:', isEditing);
        console.log('Selected Course:', selectedCourse);
        console.log('Form Data (courseData):', courseData);
        console.log('Prepared Update Data:', updateData);
        console.log('Update Data Keys:', Object.keys(updateData));
        console.log('Update Data Types:', Object.keys(updateData).map(key => `${key}: ${typeof updateData[key]}`));
        console.log('Update URL:', `http://localhost:4000/course/${courseId}`);
        console.log('========================');

        console.log('Sending update data to backend:', updateData);
        console.log('Update data fields:', Object.keys(updateData));

        response = await axios.put(`http://localhost:4000/course/${courseId}`, updateData, { headers });
        console.log('Course updated successfully:', response.data);
      } else {
        response = await axios.post('http://localhost:4000/course/', courseData, { headers });
        console.log('Course created successfully:', response.data);
      }

      const successMessage = `Course ${isEditing ? 'updated' : 'created'} successfully!`;
      console.log(successMessage);
      setCreateSuccess(successMessage);

      // Refresh courses list after a short delay to avoid interfering with form state
      setTimeout(() => {
        fetchCourses();
      }, 500);

      return true;

    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} course:`, error);

      let errorMessage = `Failed to ${isEditing ? 'update' : 'create'} course`;

      if (error.response) {
        console.log('Error response:', error.response);
        console.log('Error status:', error.response.status);
        console.log('Error data:', error.response.data);
        console.log('Error headers:', error.response.headers);

        // Log validation errors specifically
        if (error.response.status === 400) {
          console.error('400 Bad Request - Validation Error Details:', error.response.data);
        }

        if (error.response.data?.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.status === 401) {
          errorMessage = 'Authentication failed. Please login again.';
        } else if (error.response.status === 422) {
          errorMessage = 'Invalid data provided. Please check all fields.';
        } else if (error.response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      } else if (error.request) {
        console.log('No response received:', error.request);
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        console.log('Error message:', error.message);
        errorMessage = error.message;
      }

      setCreateError(errorMessage);
      return false;
    } finally {
      setCreating(false);
    }
  }, [fetchCourses, isEditing, editingCourse, userProfile]);

  // Initial data fetch - only run once on mount
  useEffect(() => {
    console.log('[Initial useEffect] Running fetchCourses and fetchUserProfile');
    fetchCourses();
    fetchUserProfile();
  }, []); // Empty dependency array - only run once on mount

  // Close upload dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (uploadDropdownOpen && !event.target.closest('.upload-dropdown-container')) {
        setUploadDropdownOpen(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [uploadDropdownOpen]);

  const filteredCourses = (Array.isArray(courses) ? courses : []).filter(course => {
    // Debug logging if courses is not an array
    if (!Array.isArray(courses)) {
      console.error('[InstructorCourses] courses is not an array:', typeof courses, courses);
    }
    const matchesSearch = course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = filterCategory === 'all' || course.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || course.status === filterStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return (a.title || '').localeCompare(b.title || '');
      case 'students':
        return (b.enrolled_students || 0) - (a.enrolled_students || 0);
      case 'price':
        return (b.price || 0) - (a.price || 0);
      case 'rating':
        return (b.rating || 0) - (a.rating || 0);
      case 'created':
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      default:
        return 0;
    }
  });

  // Default course categories - synchronized with CreateCourseModal
  const defaultCategories = [
    'Development',
    'Business',
    'Finance & Accounting',
    'IT & Software',
    'Office Productivity',
    'Personal Development',
    'Design',
    'Marketing',
    'Lifestyle',
    'Photography & Video',
    'Health & Fitness',
    'Music',
    'Teaching & Academics'
  ];

  // Use only default static categories
  const categories = ['all', ...defaultCategories];

  const statuses = ['all', 'published', 'draft'];

  const handleView = (course) => {
    console.log('Viewing course:', course);
    setViewingCourse(course);
    setShowViewModal(true);
  };

  // Handle sharing functionality
  const handleShare = (course) => {
    console.log('Sharing course:', course);
    const courseId = course.id || course._id;
    const baseUrl = window.location.origin;
    const shareLink = `${baseUrl}/course/${courseId}`;

    setSharingCourse(course);
    setShareUrl(shareLink);
    setShowShareModal(true);
    setLinkCopied(false);
  };

  // Copy link to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    }
  };

  // Generate comprehensive sharing content with complete course details
  const generateShareContent = (platform, course) => {
    // Instructor Information
    const instructor = userProfile?.username || userProfile?.name || 'Expert Instructor';
    const instructorEmail = userProfile?.email || 'contact@londonschool.edu';
    const instructorBio = userProfile?.bio || 'Experienced educator with proven expertise in professional development';
    const instructorPhone = userProfile?.phone || '+44 20 7946 0958';

    // Course Information - Extract all available details
    const courseTitle = course.title || 'Professional Development Course';
    const courseDescription = course.description || 'Comprehensive course designed to enhance your professional skills and advance your career with practical, hands-on learning experience.';
    const price = course.price ? `$${course.price}` : 'Free';
    const originalPrice = course.original_price ? `$${course.original_price}` : null;
    const level = course.level || 'All Levels';
    const category = course.category || 'Professional Development';
    const duration = course.duration || '4-6 weeks';
    const rating = course.rating || '4.8';
    const students = course.enrolled_count || course.students_count || '500+';
    const language = course.language || 'English';
    const courseTags = course.tags || ['Professional Development', 'Career Growth', 'Skills Enhancement'];
    const courseStatus = course.status || 'Active';
    const createdDate = course.created_at ? new Date(course.created_at).getFullYear() : new Date().getFullYear();

    // Course Learning Outcomes & Features
    const learningOutcomes = [
      `Master key concepts in ${category}`,
      `Gain practical, hands-on experience`,
      `Develop professional-grade skills`,
      `Build a portfolio of real-world projects`,
      `Network with industry professionals`,
      `Receive personalized feedback and guidance`
    ];

    const courseFeatures = [
      'HD Video Lectures',
      'Downloadable Resources',
      'Practical Assignments',
      'Interactive Quizzes',
      'Discussion Forums',
      'Direct Instructor Access',
      'Mobile App Access',
      'Progress Tracking'
    ];

    // Platform Information
    const platformInfo = {
      name: 'Skill Wallah EdTech',
      website: 'https://londonschool.edu',
      description: 'Premier online learning platform for professional development and career advancement',
      email: 'info@londonschool.edu',
      phone: '+44 20 7946 0958',
      address: 'London, United Kingdom',
      features: ['24/7 Support', 'Certificate of Completion', 'Lifetime Access', 'Mobile Learning', 'Progress Tracking', 'Community Access'],
      established: '2020',
      courses: '1000+',
      instructors: '200+',
      students: '50,000+',
      rating: '4.9',
      socialMedia: {
        facebook: 'https://facebook.com/londonschool',
        twitter: 'https://twitter.com/londonschool',
        linkedin: 'https://linkedin.com/company/londonschool',
        instagram: 'https://instagram.com/londonschool'
      }
    };

    // Create comprehensive content templates with complete course details
    const templates = {
      facebook: {
        title: `🎓 ${courseTitle} | ${platformInfo.name}`,
        description: `🚀 Transform Your Career with "${courseTitle}"!\n\n📚 COMPLETE COURSE DETAILS:\n• Course: ${courseTitle}\n• Description: ${courseDescription.substring(0, 120)}...\n• Instructor: ${instructor}\n• Level: ${level}\n• Duration: ${duration}\n• Language: ${language}\n• Price: ${price}${originalPrice ? ` (Regular: ${originalPrice})` : ''}\n• Rating: ⭐ ${rating}/5 (${students} successful students)\n• Status: ${courseStatus}\n\n🎯 WHAT YOU'LL LEARN:\n${learningOutcomes.slice(0, 4).map(outcome => `• ${outcome}`).join('\n')}\n\n👨‍🏫 INSTRUCTOR PROFILE:\n• Name: ${instructor}\n• Email: ${instructorEmail}\n• Phone: ${instructorPhone}\n• Bio: ${instructorBio}\n• Teaching Since: ${createdDate}\n\n🏫 ABOUT ${platformInfo.name.toUpperCase()}:\n• Trusted Learning Platform Since ${platformInfo.established}\n• ${platformInfo.courses} Professional Courses\n• ${platformInfo.instructors} Expert Instructors\n• ${platformInfo.students} Satisfied Learners Worldwide\n• Platform Rating: ${platformInfo.rating}⭐\n• Contact: ${platformInfo.email} | ${platformInfo.phone}\n\n✨ COURSE FEATURES:\n${courseFeatures.slice(0, 6).map(feature => `• ${feature}`).join('\n')}\n\n🌟 PLATFORM BENEFITS:\n${platformInfo.features.map(feature => `• ${feature}`).join('\n')}\n\n🎯 COURSE TAGS: ${courseTags.join(' | ')}\n\n💡 Why This Course?\n• Comprehensive ${category} training\n• Real-world practical applications\n• Expert guidance throughout\n• Industry-recognized certification\n• Lifetime access to materials\n• Active community support\n\n� Ready to Start? Contact us today!\n📧 ${platformInfo.email}\n📱 ${platformInfo.phone}\n🌐 ${platformInfo.website}\n\n#${platformInfo.name.replace(/\s+/g, '')} #${category.replace(/\s+/g, '')} #OnlineLearning #ProfessionalDevelopment #${instructor.replace(/\s+/g, '')} #SkillUp #CareerGrowth #Education #${language}Learning`,
      },
      twitter: {
        title: `🎓 ${courseTitle}`,
        description: `� Course: ${course.title}\n👨‍🏫 Instructor: ${instructor}\n💰 Price: ${price} | ⭐ ${rating}/5\n📊 Level: ${level} | ⏱️ ${duration}\n\n🏫 ${platformInfo.name}\n✅ ${platformInfo.students} students\n✅ ${platformInfo.courses} courses\n✅ Certificate included\n✅ Lifetime access\n\n📧 Instructor: ${instructorEmail}\n🌟 ${instructorBio}\n\n🚀 Join thousands mastering ${category}!`,
        hashtags: `${platformInfo.name.replace(' ', '')},${category.replace(' ', '')},OnlineLearning,Education,${instructor.replace(' ', '')},SkillUp,Career`,
      },
      linkedin: {
        title: `${courseTitle} - ${platformInfo.name}`,
        description: `🎯 PROFESSIONAL DEVELOPMENT OPPORTUNITY\n\n📚 COMPREHENSIVE COURSE OVERVIEW:\n• Title: ${courseTitle}\n• Description: ${courseDescription.substring(0, 150)}...\n• Category: ${category}\n• Level: ${level}\n• Duration: ${duration}\n• Language: ${language}\n• Investment: ${price}${originalPrice ? ` (Regular: ${originalPrice})` : ''}\n• Rating: ${rating}⭐ (${students} professionals enrolled)\n• Status: ${courseStatus}\n\n🎯 LEARNING OUTCOMES:\n${learningOutcomes.slice(0, 4).map(outcome => `• ${outcome}`).join('\n')}\n\n👨‍🏫 INSTRUCTOR PROFILE:\n• Name: ${instructor}\n• Expertise: ${category}\n• Email: ${instructorEmail}\n• Phone: ${instructorPhone}\n• Background: ${instructorBio}\n• Teaching Since: ${createdDate}\n• Specialization: Proven track record in ${category}\n\n🏫 ABOUT ${platformInfo.name.toUpperCase()}:\n• Established: ${platformInfo.established}\n• Course Catalog: ${platformInfo.courses} professional courses\n• Expert Faculty: ${platformInfo.instructors} industry professionals\n• Global Alumni: ${platformInfo.students} professionals worldwide\n• Platform Rating: ${platformInfo.rating}⭐\n• Contact: ${platformInfo.email} | ${platformInfo.phone}\n• Website: ${platformInfo.website}\n\n✨ COURSE FEATURES:\n${courseFeatures.slice(0, 6).map(feature => `• ${feature}`).join('\n')}\n\n🌟 PLATFORM BENEFITS:\n${platformInfo.features.join(' • ')}\n\n💼 CAREER IMPACT:\n• Industry-relevant skills and practical knowledge\n• Immediate application in professional settings\n• Enhanced career prospects and advancement opportunities\n• Professional networking with peers and industry experts\n• Recognized certificate for LinkedIn profile enhancement\n• Direct access to ${instructor} for mentorship\n\n🚀 WHY CHOOSE THIS COURSE?\n• Expert-led instruction with real-world applications\n• Flexible schedule that fits your professional life\n• Comprehensive curriculum designed by industry leaders\n• Ongoing support and personalized mentorship\n• Lifetime access to course materials and updates\n• Active professional community and networking\n\n📈 Take the next strategic step in your professional development. This course is designed for ${level} professionals looking to excel in ${category}.\n\n� READY TO ADVANCE YOUR CAREER?\n📧 Instructor: ${instructorEmail}\n📱 Platform: ${platformInfo.phone}\n🌐 Website: ${platformInfo.website}\n\n🔗 Connect with us today and start your transformation!`,
      },
      whatsapp: {
        content: `🎓 *${courseTitle}* | ${platformInfo.name}\n\n🌟 Hey! Check out this comprehensive course I found!\n\n📚 *COMPLETE COURSE DETAILS:*\n• Course: ${courseTitle}\n• Description: ${courseDescription.substring(0, 100)}...\n• Category: ${category}\n• Level: ${level}\n• Duration: ${duration}\n• Language: ${language}\n• Price: ${price}${originalPrice ? ` (Regular: ${originalPrice})` : ''}\n• Rating: ${rating}⭐ (${students} students)\n• Status: ${courseStatus}\n\n🎯 *WHAT YOU'LL LEARN:*\n${learningOutcomes.slice(0, 4).map(outcome => `• ${outcome}`).join('\n')}\n\n👨‍🏫 *INSTRUCTOR INFO:*\n• Name: ${instructor}\n• Email: ${instructorEmail}\n• Phone: ${instructorPhone}\n• Expertise: ${category}\n• Bio: ${instructorBio}\n• Teaching Since: ${createdDate}\n\n🏫 *PLATFORM: ${platformInfo.name}*\n• Since: ${platformInfo.established}\n• Courses: ${platformInfo.courses}\n• Instructors: ${platformInfo.instructors}\n• Students: ${platformInfo.students}\n• Platform Rating: ${platformInfo.rating}⭐\n• Website: ${platformInfo.website}\n• Contact: ${platformInfo.email} | ${platformInfo.phone}\n\n✨ *COURSE FEATURES:*\n${courseFeatures.slice(0, 6).map(feature => `• ${feature}`).join('\n')}\n\n🌟 *PLATFORM BENEFITS:*\n${platformInfo.features.map(feature => `• ${feature}`).join('\n')}\n\n🏷️ *COURSE TAGS:* ${courseTags.join(' | ')}\n\n🚀 Perfect for ${level} learners wanting to master ${category}!\n\n📞 *CONTACT INFO:*\n📧 Instructor: ${instructorEmail}\n📱 Platform: ${platformInfo.phone}\n🌐 Website: ${platformInfo.website}\n\nEnroll here: `,
      },
      telegram: {
        title: `📚 ${courseTitle} - ${platformInfo.name}`,
        description: `🎯 *Master ${category} with Expert Training!*\n\n📖 *COMPLETE COURSE INFORMATION:*\n• Title: ${courseTitle}\n• Description: ${courseDescription.substring(0, 100)}...\n• Level: ${level}\n• Duration: ${duration}\n• Language: ${language}\n• Price: ${price}${originalPrice ? ` (Regular: ${originalPrice})` : ''}\n• Rating: ${rating}⭐ (${students} learners)\n• Status: ${courseStatus}\n\n🎯 *WHAT YOU'LL MASTER:*\n${learningOutcomes.slice(0, 4).map(outcome => `• ${outcome}`).join('\n')}\n\n👨‍🏫 *INSTRUCTOR DETAILS:*\n• Name: ${instructor}\n• Email: ${instructorEmail}\n• Phone: ${instructorPhone}\n• Bio: ${instructorBio}\n• Specialization: ${category}\n• Teaching Since: ${createdDate}\n\n🏫 *ABOUT ${platformInfo.name.toUpperCase()}:*\n• Trusted platform since ${platformInfo.established}\n• ${platformInfo.courses} courses available\n• ${platformInfo.instructors} expert instructors\n• ${platformInfo.students} successful graduates\n• Platform Rating: ${platformInfo.rating}⭐\n• Contact: ${platformInfo.email} | ${platformInfo.phone}\n• Website: ${platformInfo.website}\n\n✨ *COURSE FEATURES:*\n${courseFeatures.slice(0, 6).map(feature => `• ${feature}`).join('\n')}\n\n🌟 *PLATFORM BENEFITS:*\n${platformInfo.features.join(', ')}\n\n🏷️ *COURSE TAGS:* ${courseTags.join(' | ')}\n\n💡 *WHY THIS COURSE?*\n• Learn from industry expert ${instructor}\n• Comprehensive ${category} curriculum with practical applications\n• Flexible online learning that fits your schedule\n• Industry-recognized certificate upon completion\n• Lifetime access to all materials and updates\n• 24/7 student support and active community\n• Direct instructor access for personalized guidance\n\n� *GET STARTED TODAY:*\n📧 Instructor: ${instructorEmail}\n📱 Platform: ${platformInfo.phone}\n🌐 Website: ${platformInfo.website}\n\n�🚀 Join our community of successful learners and advance your career!`,
      },
      email: {
        subject: `🎓 ${courseTitle} - Complete Course Information | ${platformInfo.name}`,
        body: `Subject: Professional Development Opportunity - ${courseTitle}\n\nDear Learning Enthusiast,\n\nI'm excited to share comprehensive information about an excellent learning opportunity that I believe would be valuable for your professional development.\n\n═══════════════════════════════════════════\n📚 COMPLETE COURSE INFORMATION\n═══════════════════════════════════════════\n\nCourse Title: ${courseTitle}\nCategory: ${category}\nLevel: ${level}\nDuration: ${duration}\nLanguage: ${language}\nPrice: ${price}${originalPrice ? ` (Regular Price: ${originalPrice})` : ''}\nRating: ${rating}⭐ out of 5\nEnrolled Students: ${students}\nCourse Status: ${courseStatus}\nCreated: ${createdDate}\n\nCourse Description:\n${courseDescription}\n\n🎯 LEARNING OUTCOMES:\n${learningOutcomes.map(outcome => `• ${outcome}`).join('\n')}\n\n✨ COURSE FEATURES:\n${courseFeatures.map(feature => `• ${feature}`).join('\n')}\n\n🏷️ Course Tags: ${courseTags.join(', ')}\n\n═══════════════════════════════════════════\n👨‍🏫 COMPREHENSIVE INSTRUCTOR DETAILS\n═══════════════════════════════════════════\n\nInstructor Name: ${instructor}\nEmail Contact: ${instructorEmail}\nPhone Contact: ${instructorPhone}\nSpecialization: ${category}\nProfessional Background: ${instructorBio}\nTeaching Since: ${createdDate}\n\nOur instructor ${instructor} brings years of industry experience and a proven track record in ${category}. They are committed to providing personalized guidance, expert mentorship, and ongoing support throughout your entire learning journey.\n\n═══════════════════════════════════════════\n🏫 PLATFORM INFORMATION - ${platformInfo.name}\n═══════════════════════════════════════════\n\nPlatform Name: ${platformInfo.name}\nWebsite: ${platformInfo.website}\nEmail: ${platformInfo.email}\nPhone: ${platformInfo.phone}\nAddress: ${platformInfo.address}\nEstablished: ${platformInfo.established}\nMission: ${platformInfo.description}\n\nPlatform Statistics:\n• Total Courses: ${platformInfo.courses}\n• Expert Instructors: ${platformInfo.instructors}\n• Satisfied Students: ${platformInfo.students}\n• Platform Rating: ${platformInfo.rating}⭐\n• Success Rate: 95%+\n\nPlatform Features & Benefits:\n${platformInfo.features.map(feature => `• ${feature}`).join('\n')}\n\nSocial Media:\n• Facebook: ${platformInfo.socialMedia.facebook}\n• Twitter: ${platformInfo.socialMedia.twitter}\n• LinkedIn: ${platformInfo.socialMedia.linkedin}\n• Instagram: ${platformInfo.socialMedia.instagram}\n\n═══════════════════════════════════════════\n🎯 WHAT YOU'LL GAIN FROM THIS COURSE\n═══════════════════════════════════════════\n\n✅ Industry-Relevant Skills: Master practical ${category} techniques used by top professionals\n✅ Expert Mentorship: Direct access to ${instructor} for personalized guidance and support\n✅ Flexible Learning: Study at your own pace with lifetime access to all materials\n✅ Professional Certificate: Enhance your resume with our industry-recognized certification\n✅ Career Advancement: Apply new skills immediately in your current or future professional role\n✅ Community Access: Connect with fellow learners and industry professionals worldwide\n✅ Practical Experience: Work on real-world projects and build a professional portfolio\n✅ Ongoing Support: 24/7 technical support and continuous instructor availability\n\n═══════════════════════════════════════════\n🚀 WHY CHOOSE THIS COURSE & PLATFORM?\n═══════════════════════════════════════════\n\n1. EXPERT INSTRUCTION: Learn from ${instructor}, a recognized expert and practitioner in ${category}\n2. PROVEN CURRICULUM: ${level}-friendly content designed for maximum learning efficiency and retention\n3. PRACTICAL APPLICATION: Real-world projects, case studies, and hands-on assignments\n4. COMPREHENSIVE SUPPORT: 24/7 technical support plus direct instructor guidance\n5. CAREER IMPACT: Skills that directly translate to career growth and new opportunities\n6. TRUSTED PLATFORM: ${platformInfo.name} has been delivering quality education since ${platformInfo.established}\n7. FLEXIBILITY: Learn at your own pace with lifetime access to materials\n8. COMMUNITY: Join a network of ${platformInfo.students} professionals worldwide\n\n═══════════════════════════════════════════\n📞 GET STARTED TODAY - CONTACT INFORMATION\n═══════════════════════════════════════════\n\nReady to take the next step in your professional development?\n\n📧 DIRECT INSTRUCTOR CONTACT:\nInstructor: ${instructor}\nEmail: ${instructorEmail}\nPhone: ${instructorPhone}\n\n📱 PLATFORM SUPPORT:\nPlatform: ${platformInfo.name}\nEmail: ${platformInfo.email}\nPhone: ${platformInfo.phone}\nWebsite: ${platformInfo.website}\n\n🌐 SOCIAL MEDIA:\nFacebook: ${platformInfo.socialMedia.facebook}\nLinkedIn: ${platformInfo.socialMedia.linkedin}\nTwitter: ${platformInfo.socialMedia.twitter}\n\n📋 ENROLLMENT PROCESS:\n1. Visit the course link below\n2. Review the complete curriculum and syllabus\n3. Enroll with secure payment (${price}${originalPrice ? ` - Save ${(parseFloat(originalPrice.replace('$', '')) - parseFloat(price.replace('$', ''))).toFixed(0)}!` : ''})\n4. Get immediate access and start learning\n5. Connect with ${instructor} and join our student community\n6. Begin your transformation in ${category}\n\nDon't miss this opportunity to advance your career in ${category} with expert instruction from ${instructor}!\n\nBest regards,\nThe ${platformInfo.name} Team\n\nP.S. This course has earned a ${rating}⭐ rating from over ${students} successful students worldwide. Join our community of learners and start your professional transformation today!\n\n---\n${platformInfo.name} | ${platformInfo.website} | ${platformInfo.email}\n"${platformInfo.description}" | Established ${platformInfo.established}`,
      }
    };

    return templates[platform] || templates.facebook;
  };

  // Preview share content before sharing
  const previewShareContent = (platform) => {
    const content = generateShareContent(platform, sharingCourse);
    setSelectedPlatform(platform);
    setShareContentPreview(content);
    setShowContentPreview(true);
  };

  // Enhanced social media sharing functions
  const shareOnPlatform = (platform) => {
    const content = generateShareContent(platform, sharingCourse);
    const url = encodeURIComponent(shareUrl);

    let shareLink = '';

    switch (platform) {
      case 'facebook':
        const fbTitle = encodeURIComponent(content.title);
        const fbDescription = encodeURIComponent(content.description);
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${fbTitle}%0A%0A${fbDescription}`;
        break;

      case 'twitter':
        const twitterText = encodeURIComponent(`${content.title}\n\n${content.description}`);
        shareLink = `https://twitter.com/intent/tweet?url=${url}&text=${twitterText}&hashtags=${content.hashtags}`;
        break;

      case 'linkedin':
        const linkedInTitle = encodeURIComponent(content.title);
        const linkedInSummary = encodeURIComponent(content.description);
        shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${linkedInTitle}&summary=${linkedInSummary}`;
        break;

      case 'whatsapp':
        const whatsappText = encodeURIComponent(`${content.content}${shareUrl}`);
        shareLink = `https://wa.me/?text=${whatsappText}`;
        break;

      case 'telegram':
        const telegramText = encodeURIComponent(`${content.title}\n\n${content.description}\n\n🔗 Course Link:`);
        shareLink = `https://t.me/share/url?url=${url}&text=${telegramText}`;
        break;

      case 'email':
        const emailSubject = encodeURIComponent(content.subject);
        const emailBody = encodeURIComponent(`${content.body}\n\nCourse Link: ${shareUrl}`);
        shareLink = `mailto:?subject=${emailSubject}&body=${emailBody}`;
        break;

      default:
        return;
    }

    // Track sharing analytics (optional)
    trackSharingEvent(platform, sharingCourse.course_id);

    // Update share count and show success message
    setShareCount(prev => ({
      ...prev,
      [platform]: (prev[platform] || 0) + 1
    }));

    setLastSharedPlatform(platform);
    setShareSuccess(true);

    // Hide success message after 3 seconds
    setTimeout(() => {
      setShareSuccess(false);
    }, 3000);

    window.open(shareLink, '_blank', 'width=600,height=400,scrollbars=yes,resizable=yes');
  };

  // Optional: Track sharing events for analytics
  const trackSharingEvent = async (platform, courseId) => {
    try {
      // You can implement analytics tracking here
      console.log(`Course shared on ${platform}:`, courseId);

    } catch (error) {
      console.log('Analytics tracking failed:', error);
    }
  };

  const handleUploadContent = useCallback((course, type) => {
    // Prevent multiple rapid clicks
    if (showUploadModal) return;

    // Batch state updates to prevent multiple renders and flickering
    const batchUpdate = () => {
      setUploadingCourse(course);
      setUploadType(type);
      setUploadProgress(0);
      setIsUploading(false);
      setUploadFiles([]);
      setIsLoadingModalContent(true);
      setContentReady(false);
      setShowUploadModal(true);
    };

    // Use requestAnimationFrame to batch DOM updates and prevent flickering
    requestAnimationFrame(() => {
      batchUpdate();

      // Simulate content loading with smooth transition
      setTimeout(() => {
        if (showUploadModal) { // Only update if modal is still open
          setIsLoadingModalContent(false);
          setContentReady(true);
        }
      }, 200); // Reduced loading time for better UX
    });
  }, [showUploadModal]);

  // Stable callback for closing upload modal to prevent re-renders and flickering
  const handleCloseUploadModal = useCallback(() => {
    // Prevent multiple rapid calls
    if (!showUploadModal) return;

    // Smooth close transition with immediate visual feedback
    const batchClose = () => {
      setIsLoadingModalContent(false);
      setContentReady(false);
      setShowUploadModal(false);

      // Reset states after modal is hidden to prevent layout shifts
      setTimeout(() => {
        setUploadingCourse(null);
        setUploadProgress(0);
        setIsUploading(false);
        setUploadFiles([]);
        setShowExistingContent(false);
        setNewModuleName('');
        setShowAddModule(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 100); // Reduced delay for better responsiveness
    };

    // Use requestAnimationFrame for smooth animation
    requestAnimationFrame(batchClose);
  }, [showUploadModal]);

  // Handle file upload for lectures and PDFs
  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files?.[0];
    const currentUploadingCourse = uploadingCourse; // Capture current value
    if (!file || !currentUploadingCourse) return;

    // Validate file type based on upload type
    const isLecture = uploadType === 'lecture';
    const allowedTypes = isLecture
      ? ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm']
      : ['application/pdf'];

    const fileExtension = file.name.toLowerCase().split('.').pop();
    const validExtensions = isLecture
      ? ['mp4', 'avi', 'mov', 'wmv', 'webm']
      : ['pdf'];

    if (!validExtensions.includes(fileExtension)) {
      alert(`Please upload a valid ${isLecture ? 'video' : 'PDF'} file`);
      return;
    }

    // Validate file size (max 500MB for videos, 50MB for PDFs)
    const maxSize = isLecture ? 500 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
      const sizeLimit = isLecture ? '500MB' : '50MB';
      alert(`File size too large. Please upload a file smaller than ${sizeLimit}`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('course_id', currentUploadingCourse.id || currentUploadingCourse._id);
      formData.append('upload_type', uploadType);

      const token = localStorage.getItem('token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Upload file with progress tracking
      const endpoint = `http://localhost:4000/course/${currentUploadingCourse.id || currentUploadingCourse._id}/upload-${uploadType}`;
      const response = await axios.post(endpoint, formData, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          // Use throttled progress update to prevent excessive re-renders
          throttledProgressUpdate(progress);
        },
      });

      console.log('Upload successful:', response.data);

      // Show success message
      const message = document.createElement('div');
      message.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 12px 20px; border-radius: 8px; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          ✓ ${isLecture ? 'Lecture' : 'PDF'} uploaded successfully!
        </div>
      `;
      document.body.appendChild(message);
      setTimeout(() => document.body.removeChild(message), 4000);

      // Close modal and refresh
      setShowUploadModal(false);
      await fetchCourses();

    } catch (error) {
      console.error('Upload failed:', error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: endpoint,
        courseId: currentUploadingCourse.id || currentUploadingCourse._id
      });

      let errorMessage = `Failed to upload ${isLecture ? 'lecture' : 'PDF'}`;

      if (error.response?.status === 404) {
        errorMessage = `Course not found. Please check if the course exists. Course ID: ${currentUploadingCourse.id || currentUploadingCourse._id}`;
      } else if (error.response?.status === 413) {
        errorMessage = 'File too large. Please upload a smaller file.';
      } else if (error.response?.status === 415) {
        errorMessage = `Unsupported file type. Please upload ${isLecture ? 'video' : 'PDF'} files only.`;
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        errorMessage = error.message || 'Unknown error occurred';
      }

      alert(`Upload failed: ${errorMessage}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [uploadType, uploadingCourse?.id, uploadingCourse?._id, fetchCourses]);

  const handleEdit = (course) => {
    console.log('Editing course:', course);
    setIsEditing(true);
    setEditingCourse(course);
    setShowCreateModal(true);
  };

  const handleModules = (course) => {
    console.log('Managing modules for course:', course);
    alert(`Module management for "${course.title}" - Coming soon!`);
    // setSelectedCourse(course);
    // setShowModulesModal(true);
  };

  const handleDelete = async (course) => {
    if (window.confirm(`Are you sure you want to delete the course: ${course.title}?`)) {
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        // Use the MongoDB ObjectId (id field) for the DELETE request
        // The API expects the id field, not the course_id field
        const courseId = course.id || course._id;

        if (!courseId) {
          console.error('No valid course ID found:', course);
          alert('Unable to delete course: Invalid course ID');
          return;
        }

        console.log('Attempting to delete course:', {
          courseId,
          course_id: course.course_id,
          title: course.title,
          url: `http://localhost:4000/course/${courseId}`
        });

        const response = await axios.delete(`http://localhost:4000/course/${courseId}`, { headers });
        console.log('Delete response:', response);

        // Remove from local state after successful deletion
        setCourses(prev => (Array.isArray(prev) ? prev : []).filter(c => c.id !== courseId));

        console.log('Course deleted successfully:', courseId);
        alert('Course deleted successfully!');

      } catch (error) {
        console.error('Failed to delete course:', {
          error,
          response: error.response,
          data: error.response?.data,
          status: error.response?.status,
          statusText: error.response?.statusText
        });

        let errorMessage = 'Failed to delete course';

        if (error.response?.data?.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response?.status === 400) {
          errorMessage = 'Invalid course ID format. Please refresh the page and try again.';
        } else if (error.response?.status === 401) {
          errorMessage = 'Authentication failed. Please login again.';
        } else if (error.response?.status === 404) {
          errorMessage = 'Course not found. It may have been already deleted.';
        } else if (error.response?.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        }

        alert(`Failed to delete course: ${errorMessage}`);
      }
    }
  };

  // Course Card Component - Optimized for 3-column layout and memoized
  const CourseCard = React.memo(({ course }) => (
    <div className="bg-gradient-to-br from-white via-yellow-50 to-amber-50 rounded-2xl p-5 shadow-lg border border-[#988913]/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-[#988913]/40 relative overflow-hidden">
      {/* Golden accent corner */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-[#988913]/10 to-transparent rounded-bl-full"></div>

      {/* Clickable Image and Title Area */}
      <div
        className="cursor-pointer"
        onClick={() => navigate(`/course-content/${course.id || course._id}`)}
      >
        <div className="relative mb-4">
          <img
            src={course.thumbnail || 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=300'}
            alt={course.title}
            className="w-full h-44 object-cover rounded-xl shadow-md hover:opacity-90 transition-opacity"
          />
          <div className="absolute top-2 right-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full shadow-lg ${course.published
              ? 'bg-gradient-to-r from-emerald-500 to-orange-600 text-white'
              : 'bg-gradient-to-r from-[#988913] to-[#887a11] text-white'
              }`}>
              {course.published ? 'Published' : 'Draft'}
            </span>
          </div>
        </div>

        <h3 className="text-lg font-bold text-gray-900 line-clamp-2 leading-tight hover:text-[#988913] transition-colors" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>{course.title}</h3>
      </div>

      <div className="space-y-3 relative z-10 mt-3">
        <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">{course.description}</p>

        <div className="flex items-center justify-between text-xs">
          <span className="bg-gradient-to-r from-[#988913]/20 to-amber-100 text-[#887a11] px-2 py-1 rounded-md border border-[#988913]/30 font-medium truncate max-w-[60%]">{course.category}</span>
          <span className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 px-2 py-1 rounded-md border border-purple-200 font-medium">{course.level}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <span className="text-lg font-bold text-[#988913]" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>${course.price}</span>
            {course.original_price > course.price && (
              <span className="text-xs text-gray-500 line-through">${course.original_price}</span>
            )}
          </div>
          <div className="text-xs text-gray-600 font-medium">{course.duration}</div>
        </div>

        <div className="space-y-2 pt-2">
          {/* First row - Main actions */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              className="flex items-center justify-center space-x-1 px-2 py-2 bg-gradient-to-r from-[#988913] to-[#887a11] text-white text-xs rounded-md hover:from-[#887a11] hover:to-[#776a0f] transition-all duration-300 shadow-md hover:shadow-lg"
              onClick={() => handleEdit(course)}
              style={{ boxShadow: '0 2px 8px rgba(152, 137, 19, 0.2)' }}
              title="Edit course"
            >
              <PencilIcon className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              className="flex items-center justify-center space-x-1 px-2 py-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 text-xs rounded-md hover:from-gray-200 hover:to-gray-300 transition-all duration-300 shadow-md"
              onClick={() => handleView(course)}
              title="View course details"
            >
              <EyeIcon className="w-3.5 h-3.5" />
              <span>View</span>
            </button>
            <button
              className="flex items-center justify-center space-x-1 px-2 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-md hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-md hover:shadow-lg"
              onClick={() => handleDelete(course)}
              title="Delete course"
            >
              <TrashIcon className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>

          {/* Second row - Modules and Share */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="relative upload-dropdown-container">
              <button
                className="w-full flex items-center justify-center space-x-1 px-2 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs rounded-md hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-md hover:shadow-lg"
                onClick={() => setUploadDropdownOpen(uploadDropdownOpen === course.id ? null : course.id)}
                style={{ boxShadow: '0 2px 8px rgba(59, 130, 246, 0.2)' }}
                title="Upload content"
              >
                <BookOpenIcon className="w-3.5 h-3.5" />
                <span>Upload</span>
              </button>

              {/* Dropdown Menu */}
              {uploadDropdownOpen === course.id && (
                <div className="absolute bottom-full left-0 mb-1 w-40 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden animate-scale-in">
                  <button
                    onClick={() => {
                      setUploadDropdownOpen(null);
                      handleUploadContent(course, 'pdf');
                    }}
                    className="w-full flex items-center space-x-2 px-4 py-3 text-left text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors upload-state-transition click-area"
                    style={{
                      willChange: 'background-color, color',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }}
                  >
                    <DocumentIcon className="w-5 h-5 text-purple-600" />
                    <span className="font-medium">Upload PDF</span>
                  </button>
                  <div className="h-px bg-gray-200"></div>
                  <button
                    onClick={() => {
                      setUploadDropdownOpen(null);
                      handleUploadContent(course, 'lecture');
                    }}
                    className="w-full flex items-center space-x-2 px-4 py-3 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors upload-state-transition click-area"
                    style={{
                      willChange: 'background-color, color',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }}
                  >
                    <VideoCameraIcon className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">Upload Video</span>
                  </button>
                </div>
              )}
            </div>
            <button
              className="flex items-center justify-center space-x-1 px-2 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs rounded-md hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 shadow-md hover:shadow-lg"
              onClick={() => handleShare(course)}
              title="Share course on social media"
            >
              <ShareIcon className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  ), (prevProps, nextProps) => {
    // Only re-render if course data actually changes
    return prevProps.course._id === nextProps.course._id &&
      prevProps.course.title === nextProps.course.title &&
      prevProps.course.thumbnail === nextProps.course.thumbnail &&
      prevProps.course.category === nextProps.course.category &&
      prevProps.course.enrolledStudents === nextProps.course.enrolledStudents;
  });

  // Share Modal Component
  const ShareModal = ({ isOpen, course, shareUrl, onClose }) => {
    if (!isOpen || !course) return null;

    return ReactDOM.createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
          {/* Modal Header */}
          <div className="relative bg-gradient-to-r from-[#988913] to-[#887a11] text-white p-6 rounded-t-2xl">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-1">Share Course</h2>
                <p className="text-sm opacity-90">"{course.title}"</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-6">
            {/* Success Message */}
            {shareSuccess && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckIcon className="w-5 h-5 text-orange-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-800">
                      Successfully shared on {lastSharedPlatform}!
                    </p>
                    <p className="text-xs text-orange-600">
                      Your course content has been optimized for maximum engagement.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Course Preview */}
            <div className="flex items-center space-x-3 mb-6 p-3 bg-gray-50 rounded-lg">
              <img
                src={course.thumbnail || 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=100'}
                alt={course.title}
                className="w-12 h-12 object-cover rounded-lg"
              />
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 truncate">{course.title}</h3>
                <p className="text-sm text-gray-600">${course.price} • {course.level}</p>
              </div>
            </div>

            {/* Copy Link Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Share Link</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                />
                <button
                  onClick={copyToClipboard}
                  className={`px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-1 ${linkCopied
                    ? 'bg-orange-100 text-orange-700 border border-orange-200'
                    : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                    }`}
                >
                  {linkCopied ? (
                    <>
                      <CheckIcon className="w-4 h-4" />
                      <span className="text-sm">Copied!</span>
                    </>
                  ) : (
                    <>
                      <ClipboardDocumentIcon className="w-4 h-4" />
                      <span className="text-sm">Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Content Preview Toggle */}
            <div className="mb-4">
              <button
                onClick={() => setShowContentPreview(!showContentPreview)}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <EyeIcon className="w-4 h-4" />
                <span>{showContentPreview ? 'Hide' : 'Preview'} Share Content</span>
              </button>
            </div>

            {/* Content Preview Section */}
            {showContentPreview && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Content Preview</h3>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {['facebook', 'twitter', 'linkedin', 'whatsapp'].map((platform) => (
                    <button
                      key={platform}
                      onClick={() => previewShareContent(platform)}
                      className={`px-3 py-2 text-xs rounded-lg transition-colors capitalize ${selectedPlatform === platform
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                      {platform}
                    </button>
                  ))}
                </div>

                {shareContentPreview && (
                  <div className="bg-white p-3 rounded-lg border text-sm">
                    <div className="font-medium text-gray-800 mb-1">
                      {shareContentPreview.title || shareContentPreview.subject}
                    </div>
                    <div className="text-gray-600 text-xs whitespace-pre-line">
                      {shareContentPreview.description || shareContentPreview.content || shareContentPreview.body}
                    </div>
                    {shareContentPreview.hashtags && (
                      <div className="mt-2 text-blue-600 text-xs">
                        #{shareContentPreview.hashtags.replace(/,/g, ' #')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Social Media Platforms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Share on Social Media</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => shareOnPlatform('facebook')}
                  className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors group"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Facebook</span>
                  <EyeIcon className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                  onClick={() => shareOnPlatform('twitter')}
                  className="flex items-center justify-center space-x-2 px-4 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors group"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                  <span>Twitter</span>
                  <EyeIcon className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                  onClick={() => shareOnPlatform('linkedin')}
                  className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors group"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  <span>LinkedIn</span>
                  <EyeIcon className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                  onClick={() => shareOnPlatform('whatsapp')}
                  className="flex items-center justify-center space-x-2 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors group"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.415 3.516" />
                  </svg>
                  <span>WhatsApp</span>
                  <EyeIcon className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                  onClick={() => shareOnPlatform('telegram')}
                  className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors group"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                  </svg>
                  <span>Telegram</span>
                  <EyeIcon className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                  onClick={() => shareOnPlatform('email')}
                  className="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors col-span-2 group"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>Email</span>
                  <EyeIcon className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>

              {/* Sharing Analytics */}
              {Object.keys(shareCount).length > 0 && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-800 mb-2">Sharing Activity</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(shareCount).map(([platform, count]) => (
                      <div key={platform} className="flex items-center space-x-1 px-2 py-1 bg-white rounded-md border text-xs">
                        <span className="capitalize text-gray-600">{platform}:</span>
                        <span className="font-medium text-gray-800">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Share Tips */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">Smart Sharing</h4>
                    <p className="text-xs text-blue-600 mt-1">
                      Each platform gets optimized content with relevant hashtags, professional formatting, and platform-specific messaging to maximize engagement.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // Course View Modal Component
  const CourseViewModal = ({ isOpen, course, onClose }) => {
    if (!isOpen || !course) return null;

    return ReactDOM.createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full h-[90vh] max-h-[90vh] flex flex-col overflow-hidden">
          {/* Modal Header */}
          <div className="relative bg-gradient-to-r from-[#988913] to-[#887a11] text-white p-6 rounded-t-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/10 to-transparent rounded-bl-full"></div>
            <div className="flex items-start justify-between relative z-10">
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">{course.title}</h2>
                <p className="text-sm opacity-90">Course Details & Information</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Modal Content - Scrollable */}
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Course Thumbnail and Basic Info */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <img
                    src={course.thumbnail || 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600'}
                    alt={course.title}
                    className="w-full h-64 object-cover rounded-xl shadow-lg"
                  />
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Course Overview</h3>
                    <p className="text-gray-700 leading-relaxed">{course.description}</p>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${course.published
                      ? 'bg-orange-100 text-orange-800 border border-orange-200'
                      : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                      }`}>
                      {course.published ? 'Published' : 'Draft'}
                    </span>
                    <span className="text-sm text-gray-500">
                      ID: {course.id || course._id || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Course Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                  <div className="flex items-center space-x-2">
                    <CurrencyDollarIcon className="w-6 h-6 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Price</p>
                      <p className="text-xl font-bold text-blue-900">${course.price || '0'}</p>
                      {course.original_price && course.original_price > course.price && (
                        <p className="text-sm text-gray-500 line-through">${course.original_price}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
                  <div className="flex items-center space-x-2">
                    <UserGroupIcon className="w-6 h-6 text-orange-600" />
                    <div>
                      <p className="text-sm font-medium text-orange-800">Students</p>
                      <p className="text-xl font-bold text-orange-900">{course.enrolled_students || '0'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                  <div className="flex items-center space-x-2">
                    <ClockIcon className="w-6 h-6 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium text-purple-800">Duration</p>
                      <p className="text-lg font-bold text-purple-900">{course.duration || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-xl border border-yellow-200">
                  <div className="flex items-center space-x-2">
                    <StarIcon className="w-6 h-6 text-yellow-600" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Rating</p>
                      <p className="text-xl font-bold text-yellow-900">{course.rating || '0'}/5</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Course Details */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Course Information</h3>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Category:</span>
                      <span className="font-medium text-gray-900">{course.category || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Level:</span>
                      <span className="font-medium text-gray-900">{course.level || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Language:</span>
                      <span className="font-medium text-gray-900 capitalize">{course.language || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lessons:</span>
                      <span className="font-medium text-gray-900">{course.lessons || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span className="font-medium text-gray-900">
                        {course.created_at ? new Date(course.created_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Instructor Information</h3>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Instructor:</span>
                      <span className="font-medium text-gray-900">{course.instructor_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Instructor ID:</span>
                      <span className="font-medium text-gray-900 text-sm">{course.instructor || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created By:</span>
                      <span className="font-medium text-gray-900 text-sm">{course.created_by || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Role:</span>
                      <span className="font-medium text-gray-900 capitalize">{course.created_by_role || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {course.tags && course.tags.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {course.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gradient-to-r from-[#988913]/20 to-amber-100 text-[#887a11] text-sm font-medium rounded-full border border-[#988913]/30"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Course Content Status */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Status</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <VideoCameraIcon className="w-6 h-6 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Video Lectures</p>
                      <p className="text-sm text-gray-500">Ready for upload</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <DocumentIcon className="w-6 h-6 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">PDF Materials</p>
                      <p className="text-sm text-gray-500">Ready for upload</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer - Fixed at bottom */}
            <div className="border-t border-gray-200 px-6 py-4 bg-white rounded-b-2xl flex-shrink-0">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      onClose();
                      handleEdit(course);
                    }}
                    className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-[#988913] to-[#887a11] text-white rounded-lg hover:from-[#887a11] hover:to-[#776a0f] transition-all duration-300 shadow-md hover:shadow-lg font-medium"
                  >
                    <PencilIcon className="w-5 h-5" />
                    <span>Edit Course</span>
                  </button>
                  <button
                    onClick={() => {
                      onClose();
                      handleShare(course);
                    }}
                    className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg font-medium"
                  >
                    <ShareIcon className="w-5 h-5" />
                    <span>Share Course</span>
                  </button>
                </div>
                <button
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // Enhanced Upload Modal Component with Advanced Features
  const UploadModal = React.memo(({ isOpen, course, type, onClose }) => {
    const scrollContainerRef = useRef(null);

    // Move state INSIDE the modal to prevent parent re-renders
    const [localLectureDetails, setLocalLectureDetails] = useState({
      title: '',
      description: '',
      duration: '',
      order: 1,
      isPreview: false,
      module: '',
      tags: []
    });
    const [localPdfDetails, setLocalPdfDetails] = useState({
      title: '',
      description: '',
      category: 'material',
      module: ''
    });

    // Add Module state - also inside modal to prevent parent re-renders
    const [localNewModuleName, setLocalNewModuleName] = useState('');
    const [localShowAddModule, setLocalShowAddModule] = useState(false);

    // Early return only if modal is not open
    if (!isOpen) {
      // Reset refs when modal closes
      if (modalHasLoadedRef.current) {
        modalHasLoadedRef.current = false;
        modalCourseIdRef.current = null;
      }
      return null;
    }

    // If course is missing, show error in modal instead of returning null
    if (!course) {
      return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md">
            <p className="text-red-600 font-semibold text-lg mb-4">Error: Course not found</p>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>,
        document.body
      );
    }

    const isLecture = type === 'lecture';
    const details = isLecture ? localLectureDetails : localPdfDetails;

    // Compute if upload button should be enabled
    // Allow upload if: not uploading, has files, has title, and either has module selected OR new module name entered
    const isUploadButtonEnabled = !isUploading &&
      uploadFiles.length > 0 &&
      details.title?.trim() &&
      (details.module?.trim() || localNewModuleName?.trim());

    // Direct input change handler using LOCAL state (prevents parent re-renders)
    const handleDetailChange = (field, value) => {
      if (type === 'lecture') {
        setLocalLectureDetails(prev => ({ ...prev, [field]: value }));
      } else {
        setLocalPdfDetails(prev => ({ ...prev, [field]: value }));
      }
    };

    // Reset form when modal opens or type changes
    useEffect(() => {
      if (isOpen) {
        setLocalLectureDetails({
          title: '',
          description: '',
          duration: '',
          order: 1,
          isPreview: false,
          module: '',
          tags: []
        });
        setLocalPdfDetails({
          title: '',
          description: '',
          category: 'material',
          module: ''
        });
        // Reset add module state
        setLocalNewModuleName('');
        setLocalShowAddModule(false);
      }
    }, [isOpen, type]);

    // Extract stable course ID to prevent infinite re-renders
    const stableCourseId = useMemo(() => course?.id || course?._id, [course?.id, course?._id]);

    // Fetch existing content when modal opens - only once per course
    useEffect(() => {
      // Skip if no course ID
      if (!stableCourseId) return;

      console.log('[Modal useEffect] Triggered - isOpen:', isOpen, 'courseId:', stableCourseId, 'hasLoaded:', modalHasLoadedRef.current, 'cachedId:', modalCourseIdRef.current);

      // Only fetch if modal is open AND (not loaded OR different course)
      if (isOpen && (!modalHasLoadedRef.current || modalCourseIdRef.current !== stableCourseId)) {
        console.log('[Modal useEffect] Fetching content for course:', stableCourseId);

        // Set refs IMMEDIATELY to prevent duplicate calls during async operation
        modalHasLoadedRef.current = true;
        modalCourseIdRef.current = stableCourseId;

        const fetchData = async () => {
          setIsLoadingModalContent(true);
          setContentReady(false);

          try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            // Fetch all data in parallel for better performance
            const [lecturesResponse, pdfsResponse, modulesResponse] = await Promise.all([
              axios.get(`http://localhost:4000/course/${stableCourseId}/lectures`, { headers }).catch((err) => {
                console.log('Lectures API error:', err.response?.status);
                return { data: { lectures: [] } };
              }),
              axios.get(`http://localhost:4000/course/${stableCourseId}/pdfs`, { headers }).catch((err) => {
                console.log('PDFs API error:', err.response?.status);
                return { data: { pdfs: [] } };
              }),
              axios.get(`http://localhost:4000/courses/${stableCourseId}/modules`, { headers }).catch((err) => {
                console.log('Modules API error:', err.response?.status, err.response?.data);
                return { data: [] };
              })
            ]);

            // Backend returns {lectures: [...], total_lectures: n} format
            const lecturesData = lecturesResponse?.data?.lectures || [];
            const pdfsData = pdfsResponse?.data?.pdfs || [];
            const modulesData = Array.isArray(modulesResponse?.data) ? modulesResponse.data : [];

            console.log('Content loaded:', { lectures: lecturesData.length, pdfs: pdfsData.length, modules: modulesData.length });
            console.log('Modules data:', modulesData);

            setExistingLectures(Array.isArray(lecturesData) ? lecturesData : []);
            setExistingPdfs(Array.isArray(pdfsData) ? pdfsData : []);
            setModules(Array.isArray(modulesData) ? modulesData : []);
            setContentReady(true);
            setIsLoadingModalContent(false);
          } catch (error) {
            console.error('Error fetching content:', error);
            // Set empty arrays if endpoints don't exist yet
            setExistingLectures([]);
            setExistingPdfs([]);
            setModules([]);
            setContentReady(true);
            setIsLoadingModalContent(false);
          }
        };

        fetchData();
      }
    }, [isOpen, stableCourseId]); // Use stable course ID to prevent infinite loops

    // Scroll to top when modal opens or tab changes
    useEffect(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }
    }, [showExistingContent]);

    // Prevent body scroll when modal is open for stability
    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
        return () => {
          document.body.style.overflow = '';
        };
      }
    }, [isOpen]);

    // Add new module - using LOCAL state
    const handleAddModule = async (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      const trimmedName = localNewModuleName.trim();

      if (!trimmedName) {
        alert('Please enter a module name');
        return;
      }

      if (trimmedName.length < 1) {
        alert('Module name must be at least 1 character');
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

        console.log('Creating module:', trimmedName, 'for course:', course.id || course._id);

        // Prepare payload
        const payload = {
          name: trimmedName,
          order: modules.length + 1
        };

        console.log('Module payload:', payload);

        const response = await axios.post(
          `http://localhost:4000/courses/${course.id || course._id}/modules`,
          payload,
          { headers }
        );

        console.log('Module created successfully:', response.data);

        // Fetch modules again after adding
        const modulesResponse = await axios.get(
          `http://localhost:4000/courses/${course.id || course._id}/modules`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const updatedModules = modulesResponse.data || [];
        console.log('Updated modules list:', updatedModules);
        setModules(updatedModules);

        // Automatically select the newly created module
        if (isLecture) {
          setLocalLectureDetails(prev => ({ ...prev, module: trimmedName }));
        } else {
          setLocalPdfDetails(prev => ({ ...prev, module: trimmedName }));
        }

        setLocalNewModuleName('');
        setLocalShowAddModule(false);

        // Success message
        const message = document.createElement('div');
        message.innerHTML = `
          <div style="position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 12px 20px; border-radius: 8px; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            ✓ Module "${trimmedName}" added successfully!
          </div>
        `;
        document.body.appendChild(message);
        setTimeout(() => {
          if (message.parentNode) {
            document.body.removeChild(message);
          }
        }, 3000);
      } catch (error) {
        console.error('Error adding module:', error);
        console.error('Error response:', error.response);

        let errorMsg = 'Failed to add module';

        if (error.response?.data?.detail) {
          // Handle array of errors (Pydantic validation errors)
          if (Array.isArray(error.response.data.detail)) {
            const errors = error.response.data.detail.map(err =>
              `${err.loc?.join('.')}: ${err.msg}`
            ).join(', ');
            errorMsg = `Validation error: ${errors}`;
          } else {
            errorMsg = error.response.data.detail;
          }
        } else if (error.response?.data?.message) {
          errorMsg = error.response.data.message;
        } else if (error.message) {
          errorMsg = error.message;
        }

        // Show error message
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
          <div style="position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 12px 20px; border-radius: 8px; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.15); max-width: 400px;">
            ❌ ${errorMsg}
          </div>
        `;
        document.body.appendChild(errorDiv);
        setTimeout(() => {
          if (errorDiv.parentNode) {
            document.body.removeChild(errorDiv);
          }
        }, 5000);
      }
    };

    // Handle drag events
    const handleDrag = useCallback((e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "dragenter" || e.type === "dragover") {
        setDragActive(true);
      } else if (e.type === "dragleave") {
        setDragActive(false);
      }
    }, []);

    // Handle file drop
    const handleDrop = useCallback((e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const files = Array.from(e.dataTransfer.files);
        setUploadFiles(files);
      }
    }, []);

    // Handle file selection - memoized to prevent re-renders
    const handleFileSelect = useCallback((event) => {
      const files = Array.from(event.target.files || []);
      setUploadFiles(files);
    }, []);

    // Reset modal state - now using LOCAL state
    const resetModalState = () => {
      setUploadFiles([]);
      setLocalLectureDetails({
        title: '',
        description: '',
        duration: '',
        order: 1,
        isPreview: false,
        module: '',
        tags: []
      });
      setLocalPdfDetails({
        title: '',
        description: '',
        category: 'material',
        module: ''
      });
      setUploadProgress(0);
      setIsUploading(false);
      setDragActive(false);
      setShowExistingContent(false);
      setLocalShowAddModule(false);
      setLocalNewModuleName('');
    };

    // Fetch existing content function
    const fetchExistingContent = useCallback(async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };
        const currentCourseId = course.id || course._id;

        const [lecturesResponse, pdfsResponse] = await Promise.all([
          axios.get(`http://localhost:4000/course/${currentCourseId}/lectures`, { headers }).catch(() => ({ data: { lectures: [] } })),
          axios.get(`http://localhost:4000/course/${currentCourseId}/pdfs`, { headers }).catch(() => ({ data: { pdfs: [] } }))
        ]);

        // Backend returns {lectures: [...], total_lectures: n} or {pdfs: [...], total_pdfs: n}
        const lecturesData = lecturesResponse.data?.lectures || [];
        const pdfsData = pdfsResponse.data?.pdfs || [];

        setExistingLectures(Array.isArray(lecturesData) ? lecturesData : []);
        setExistingPdfs(Array.isArray(pdfsData) ? pdfsData : []);
      } catch (error) {
        console.log('Error fetching content:', error);
        setExistingLectures([]);
        setExistingPdfs([]);
      }
    }, [course]);

    // Handle modal close with useCallback for stability
    const handleClose = useCallback(() => {
      if (!isUploading) {
        resetModalState();
        onClose();
      }
    }, [isUploading, onClose]);

    // Delete content
    const handleDeleteContent = async (contentId, contentType) => {
      if (!confirm(`Are you sure you want to delete this ${contentType}?`)) return;

      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };
        await axios.delete(
          `http://localhost:4000/course/${course.id || course._id}/${contentType}/${contentId}`,
          { headers }
        );

        await fetchExistingContent();

        const message = document.createElement('div');
        message.innerHTML = `
          <div style="position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 12px 20px; border-radius: 8px; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            ✓ ${contentType} deleted successfully!
          </div>
        `;
        document.body.appendChild(message);
        setTimeout(() => document.body.removeChild(message), 3000);
      } catch (error) {
        console.error('Error deleting content:', error);
        alert(`Failed to delete ${contentType}`);
      }
    };

    // Handle form submit
    const handleSubmit = async () => {
      if (uploadFiles.length === 0) {
        alert('Please select a file to upload');
        return;
      }

      if (!details.title) {
        alert('Please enter a title');
        return;
      }

      // Use selected module or new module name
      const moduleToUse = details.module?.trim() || localNewModuleName?.trim();

      if (!moduleToUse) {
        alert('Please select a module or enter a new module name');
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);

      try {
        const successfulUploads = [];
        const failedUploads = [];

        for (let i = 0; i < uploadFiles.length; i++) {
          const file = uploadFiles[i];

          try {
            const formData = new FormData();
            formData.append('file', file);

            // Add metadata as form fields
            formData.append('title', details.title);
            formData.append('description', details.description || '');
            formData.append('module', moduleToUse);
            formData.append('module_name', moduleToUse); // Add module_name for backend

            // Find module ID if the module exists in the list
            const selectedModule = modules.find(m => m.name === moduleToUse);
            if (selectedModule && selectedModule.id) {
              formData.append('module_id', selectedModule.id);
            }
            // If no module_id found, backend will auto-create the module

            if (isLecture) {
              formData.append('duration', details.duration || '');
              formData.append('order', details.order || 1);
              formData.append('is_preview', details.isPreview || false);
              if (details.tags && details.tags.length > 0) {
                formData.append('tags', JSON.stringify(details.tags));
              }
            } else {
              formData.append('category', details.category || 'material');
            }

            const token = localStorage.getItem('token');
            const headers = {
              'Authorization': `Bearer ${token}`
            };

            // Use the correct backend endpoint
            const endpoint = `http://localhost:4000/course/${course.id || course._id}/upload-${type}`;

            const response = await axios.post(endpoint, formData, {
              headers,
              onUploadProgress: (progressEvent) => {
                const fileProgress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                const totalProgress = Math.round(((i * 100) + fileProgress) / uploadFiles.length);
                // Use throttled progress update to reduce flickering
                throttledProgressUpdate(totalProgress);
              },
            });

            successfulUploads.push({
              file: file.name,
              response: response.data
            });

          } catch (fileError) {
            console.error(`Error uploading ${file.name}:`, fileError);
            failedUploads.push({
              file: file.name,
              error: fileError.response?.data?.detail || fileError.message
            });
          }
        }

        // Show results
        if (successfulUploads.length > 0) {
          const message = document.createElement('div');
          message.innerHTML = `
            <div style="position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 12px 20px; border-radius: 8px; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              ✓ ${successfulUploads.length} ${isLecture ? 'lecture(s)' : 'PDF(s)'} uploaded successfully!
            </div>
          `;
          document.body.appendChild(message);
          setTimeout(() => {
            if (message.parentNode) {
              document.body.removeChild(message);
            }
          }, 4000);
        }

        if (failedUploads.length > 0) {
          const errorMsg = document.createElement('div');
          errorMsg.innerHTML = `
            <div style="position: fixed; top: 80px; right: 20px; background: #ef4444; color: white; padding: 12px 20px; border-radius: 8px; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 400px;">
              ⚠ ${failedUploads.length} file(s) failed to upload
              <div style="margin-top: 8px; font-size: 12px;">
                ${failedUploads.map(f => `• ${f.file}: ${f.error}`).join('<br>')}
              </div>
            </div>
          `;
          document.body.appendChild(errorMsg);
          setTimeout(() => {
            if (errorMsg.parentNode) {
              document.body.removeChild(errorMsg);
            }
          }, 6000);
        }

        // Refresh content and reset form
        await fetchExistingContent();

        // Refresh modules list to get any newly created modules
        try {
          const token = localStorage.getItem('token');
          const modulesResponse = await axios.get(
            `http://localhost:4000/courses/${course.id || course._id}/modules`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          const updatedModulesData = Array.isArray(modulesResponse.data) ? modulesResponse.data : [];
          console.log('Refreshed modules after upload:', updatedModulesData);
          setModules(updatedModulesData);
        } catch (error) {
          console.log('Could not refresh modules:', error);
        }

        resetModalState();

        // Only close modal if all uploads succeeded
        if (failedUploads.length === 0) {
          onClose();
        } else {
          setIsUploading(false);
        }

      } catch (error) {
        console.error('Upload failed:', error);
        let errorMessage = `Failed to upload ${isLecture ? 'lecture' : 'PDF'}`;

        if (error.response?.status === 413) {
          errorMessage = 'File too large. Please upload a smaller file.';
        } else if (error.response?.status === 415) {
          errorMessage = `Unsupported file type. Please upload ${isLecture ? 'video' : 'PDF'} files only.`;
        } else if (error.response?.data?.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }

        alert(errorMessage);
        setIsUploading(false);
      }
    };

    return ReactDOM.createPortal(
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in"
        style={{ position: 'fixed', inset: 0 }}
        onClick={(e) => {
          // Prevent closing when clicking the backdrop
          if (e.target === e.currentTarget && !isUploading) {
            e.stopPropagation();
            handleClose();
          }
        }}
      >
        <div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-[800px] min-w-[600px] max-h-[95vh] overflow-hidden flex flex-col animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header - Enhanced Color Scheme */}
          <div className={`relative ${isLecture ? 'bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600' : 'bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600'} text-white p-6 shadow-lg`}>
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle at 20% 50%, white 2px, transparent 2px), radial-gradient(circle at 80% 80%, white 2px, transparent 2px)',
                backgroundSize: '60px 60px'
              }}></div>
            </div>
            <div className="relative flex items-start justify-between z-10">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    {isLecture ? (
                      <VideoCameraIcon className="w-8 h-8" />
                    ) : (
                      <DocumentIcon className="w-8 h-8" />
                    )}
                  </div>
                  <h2 className="text-3xl font-bold drop-shadow-lg">
                    {isLecture ? 'Upload Lecture Videos' : 'Upload PDF Documents'}
                  </h2>
                </div>
                <p className="text-sm opacity-90 ml-11 drop-shadow">
                  Managing content for: <span className="font-semibold text-white">"{course.title}"</span>
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={isUploading}
                className="p-2 hover:bg-white/20 rounded-full transition-all duration-200 disabled:opacity-50 hover:scale-110 active:scale-95"
              >
                <XMarkIcon className="w-7 h-7 drop-shadow" />
              </button>
            </div>
          </div>

          {/* Modal Content - Scrollable with Auto Scroll-to-Top */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scroll-smooth upload-modal-content">
            {isLoadingModalContent ? (
              /* Loading State - Optimized to prevent flickering */
              <div className="flex items-center justify-center p-12 min-h-[400px] animate-fade-in">
                <div className="text-center space-y-4">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto"></div>
                  <p className="text-gray-600 font-medium text-lg">Preparing upload interface...</p>
                  <p className="text-gray-500 text-sm">Setting up file upload components</p>
                </div>
              </div>
            ) : contentReady ? (
              <div className="p-6 animate-fade-in">
                {/* Upload Area - Full Width */}
                <div className="space-y-6">
                  {/* Upload New Content - No Tabs */}
                  <div className="space-y-6 animate-fade-in">
                    {/* File Upload Section */}
                    <div
                      className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-200 ${dragActive
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                        }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={handleFileSelect}
                        accept={isLecture ? "video/*" : "application/pdf"}
                        multiple
                      />
                      <label
                        htmlFor="file-upload"
                        className="flex flex-col items-center justify-center cursor-pointer"
                      >
                        <CloudArrowUpIcon className={`w-16 h-16 mb-4 ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />
                        <p className="text-lg font-semibold text-gray-700 mb-2">
                          {uploadFiles.length > 0
                            ? `${uploadFiles.length} file(s) selected`
                            : `Drag and drop ${isLecture ? 'video' : 'PDF'} files here`}
                        </p>
                        <p className="text-sm text-gray-500">or click to browse files</p>
                        {uploadFiles.length > 0 && (
                          <div className="mt-4 space-y-2 w-full">
                            {Array.from(uploadFiles).map((file, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-white px-4 py-2 rounded-lg shadow-sm">
                                <span className="text-sm text-gray-700 truncate">{file.name}</span>
                                <span className="text-xs text-gray-500 ml-2">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </label>
                    </div>

                    {/* Lesson/Content Details Form */}
                    <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 space-y-4">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">
                        {isLecture ? 'Lecture' : 'PDF'} Details
                      </h3>

                      {/* Title */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={details.title}
                          onChange={(e) => handleDetailChange('title', e.target.value)}
                          placeholder={`Enter ${isLecture ? 'lecture' : 'PDF'} title`}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Description
                        </label>
                        <textarea
                          value={details.description}
                          onChange={(e) => handleDetailChange('description', e.target.value)}
                          placeholder={`Enter ${isLecture ? 'lecture' : 'PDF'} description`}
                          rows={3}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors resize-none"
                        />
                      </div>

                      {/* Module Selection */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Module <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={details.module}
                            onChange={(e) => handleDetailChange('module', e.target.value)}
                            className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-white"
                          >
                            <option value="">Select a module</option>
                            {modules.map((module) => (
                              <option key={module.id || module._id} value={module.name}>
                                {module.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setLocalShowAddModule(!localShowAddModule)}
                            className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                          >
                            <PlusIcon className="w-5 h-5" />
                            Add Module
                          </button>
                        </div>
                      </div>

                      {/* Add New Module */}
                      {localShowAddModule && (
                        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4 animate-scale-in">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={localNewModuleName}
                              onChange={(e) => setLocalNewModuleName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddModule(e);
                                }
                              }}
                              placeholder="Enter new module name"
                              className="flex-1 px-4 py-2 border-2 border-indigo-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={handleAddModule}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setLocalShowAddModule(false);
                                setLocalNewModuleName('');
                              }}
                              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Lecture-specific fields */}
                      {isLecture && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            {/* Duration */}
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Duration (minutes)
                              </label>
                              <input
                                type="number"
                                value={details.duration}
                                onChange={(e) => handleDetailChange('duration', e.target.value)}
                                placeholder="e.g., 30"
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                              />
                            </div>

                            {/* Order */}
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Lesson Order
                              </label>
                              <input
                                type="number"
                                value={details.order}
                                onChange={(e) => handleDetailChange('order', e.target.value)}
                                placeholder="e.g., 1"
                                min="1"
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                              />
                            </div>
                          </div>

                          {/* Preview Checkbox */}
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="isPreview"
                              checked={details.isPreview}
                              onChange={(e) => handleDetailChange('isPreview', e.target.checked)}
                              className="w-5 h-5 text-blue-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <label htmlFor="isPreview" className="ml-3 text-sm font-semibold text-gray-700">
                              Make this a free preview lesson
                            </label>
                          </div>
                        </>
                      )}

                      {/* PDF-specific fields */}
                      {!isLecture && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Category
                          </label>
                          <select
                            value={details.category}
                            onChange={(e) => handleDetailChange('category', e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-white"
                          >
                            <option value="material">Study Material</option>
                            <option value="assignment">Assignment</option>
                            <option value="resource">Additional Resource</option>
                          </select>
                        </div>
                      )}

                      {/* Upload Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSubmit();
                        }}
                        disabled={!isUploadButtonEnabled}
                        className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg upload-button"
                      >
                        {isUploading ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                            <span>Uploading... {uploadProgress}%</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <CloudArrowUpIcon className="w-6 h-6" />
                            <span>Upload {uploadFiles.length} {isLecture ? 'Lecture(s)' : 'PDF(s)'}</span>
                          </div>
                        )}
                      </button>

                      {/* Upload Progress - Smooth animation */}
                      {isUploading && (
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out rounded-full shadow-sm upload-progress-bar"
                            style={{
                              width: `${uploadProgress}%`
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Modal Footer - Fixed */}
          <div className="border-t-2 border-gray-200 px-6 py-4 bg-gray-50">
            <div className="flex items-center justify-end">
              <button
                onClick={handleClose}
                disabled={isUploading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }, (prevProps, nextProps) => {
    // Custom comparison function - return true if props are equal (skip re-render)
    // Only re-render if these props actually changed
    const isEqual = (
      prevProps.isOpen === nextProps.isOpen &&
      prevProps.type === nextProps.type &&
      (prevProps.course?.id || prevProps.course?._id) === (nextProps.course?.id || nextProps.course?._id) &&
      prevProps.uploadProgress === nextProps.uploadProgress
    );
    return isEqual; // true = skip re-render, false = re-render
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Golden Theme */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gradient-to-r from-white via-yellow-50 to-amber-50 rounded-2xl p-6 shadow-lg border border-[#988913]/20 relative overflow-hidden">
        {/* Golden accent background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#988913]/10 to-transparent rounded-bl-full"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-[#988913]/10 to-transparent rounded-tr-full"></div>

        <div className="flex items-center gap-4 relative z-10">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#988913] to-[#887a11] bg-clip-text text-transparent" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              My Courses
            </h1>
            <div className="flex items-center mt-1">
              <div className="w-8 h-0.5 bg-gradient-to-r from-[#988913] to-transparent rounded"></div>
              <p className="text-gray-600 ml-2">Create, manage and track your course performance</p>
            </div>
            {profileLoading && (
              <div className="mt-2 text-sm text-[#988913]/70">Loading profile...</div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-4 relative z-10">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all duration-300 shadow-md hover:shadow-lg"
          >
            <FilterIcon className="w-5 h-5" />
            <span>Filters</span>
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('=== CREATE COURSE BUTTON CLICKED ===');
              console.log('Current showCreateModal state:', showCreateModal);
              console.log('Current isEditing:', isEditing);
              console.log('Current editingCourse:', editingCourse);

              // Reset editing state first
              setIsEditing(false);
              setEditingCourse(null);

              // Then open modal
              setShowCreateModal(true);

              console.log('State updates triggered');

              // Force a check after state update
              setTimeout(() => {
                console.log('After state update - showCreateModal should be true');
              }, 100);
            }}
            className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-[#988913] to-[#887a11] text-white rounded-xl hover:from-[#887a11] hover:to-[#776a0f] transition-all duration-300 shadow-lg hover:shadow-xl"
            style={{ boxShadow: '0 4px 15px rgba(152, 137, 19, 0.3)' }}
          >
            <PlusIcon className="w-5 h-5" />
            <span>Create Course</span>
          </button>
        </div>
      </div>

      {/* Error Display with Golden Theme */}
      {error && (
        <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-4 shadow-md">
          <div className="flex items-center">
            <div className="text-red-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading courses</h3>
              <p className="mt-1 text-sm text-red-600">{error}</p>
              <button
                onClick={fetchCourses}
                className="mt-2 text-sm text-red-800 underline hover:text-red-900 font-medium"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters with Golden Theme */}
      {showFilters && (
        <div className="bg-gradient-to-br from-white via-yellow-50 to-amber-50 rounded-2xl p-6 shadow-lg border border-[#988913]/20 animate-fade-in relative overflow-hidden">
          {/* Golden accent corner */}
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-[#988913]/10 to-transparent rounded-bl-full"></div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#988913] w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search courses, tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[#988913]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#988913] focus:border-[#988913] bg-white/70 backdrop-blur-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-[#988913]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#988913] focus:border-[#988913] bg-white/70 backdrop-blur-sm"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-2 border border-[#988913]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#988913] focus:border-[#988913] bg-white/70 backdrop-blur-sm"
              >
                <option value="">All Categories</option>
                <option value="technology">Technology</option>
                <option value="business">Business</option>
                <option value="design">Design</option>
                <option value="marketing">Marketing</option>
                <option value="health">Health & Fitness</option>
                <option value="arts">Arts & Crafts</option>
                <option value="music">Music</option>
                <option value="cooking">Cooking</option>
                <option value="language">Language</option>
                <option value="science">Science</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 border border-[#988913]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#988913] focus:border-[#988913] bg-white/70 backdrop-blur-sm"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="students">Most Students</option>
                <option value="rating">Highest Rating</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Course Grid - Fixed 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          // Loading skeleton - 6 cards for 2 rows of 3
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg overflow-hidden animate-pulse">
              <div className="h-48 bg-gray-300"></div>
              <div className="p-6">
                <div className="h-4 bg-gray-300 rounded mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-2/3 mb-4"></div>
                <div className="flex items-center justify-between">
                  <div className="h-3 bg-gray-300 rounded w-16"></div>
                  <div className="h-3 bg-gray-300 rounded w-20"></div>
                </div>
              </div>
            </div>
          ))
        ) : filteredCourses.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <BookOpenIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No courses found</h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter || categoryFilter
                ? "Try adjusting your filters to see more courses."
                : "You haven't created any courses yet. Create your first course to get started!"}
            </p>
            {!searchTerm && !statusFilter && !categoryFilter && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#988913] to-[#b8a632] text-white font-semibold rounded-xl hover:from-[#856d0f] hover:to-[#a19029] transform hover:scale-105 transition-all duration-200 shadow-lg"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Create Your First Course
              </button>
            )}
          </div>
        ) : (
          filteredCourses.map((course, index) => (
            <CourseCard key={course._id || course.id || course.course_id || `course-${index}`} course={course} />
          ))
        )}
      </div>

      {/* Create Course Modal */}
      <CreateCourseModal
        isOpen={showCreateModal}
        onClose={() => {
          console.log('Modal onClose called');
          setShowCreateModal(false);
          setIsEditing(false);
          setEditingCourse(null);
        }}
        onSuccess={() => {
          console.log('Modal onSuccess called');
          // Refresh courses list when course is created/updated successfully
          fetchCourses();
          setShowCreateModal(false);
          setIsEditing(false);
          setEditingCourse(null);
        }}
        isEditing={isEditing}
        editingCourse={editingCourse}
      />

      {/* Course View Modal */}
      <CourseViewModal
        isOpen={showViewModal}
        course={viewingCourse}
        onClose={() => {
          setShowViewModal(false);
          setViewingCourse(null);
        }}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        course={sharingCourse}
        shareUrl={shareUrl}
        onClose={() => {
          setShowShareModal(false);
          setSharingCourse(null);
          setShareUrl('');
          setLinkCopied(false);
        }}
      />

      {/* Upload Content Modal */}
      <UploadModal
        isOpen={showUploadModal}
        course={uploadingCourse}
        type={uploadType}
        uploadProgress={uploadProgress}
        onClose={handleCloseUploadModal}
      />
    </div>
  );
};

export default InstructorCourses;