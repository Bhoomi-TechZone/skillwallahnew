import { XMarkIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { fetchInstructors } from '../api/studentsApi';

// Throttle utility for reducing rapid updates
const throttle = (func, limit) => {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
};

const CreateCourseModal = ({
  isOpen,
  onClose,
  onSuccess,
  isEditing = false,
  editingCourse = null
}) => {
  // Form state with validation
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructor: '',
    instructor_name: '',
    course_id: '',
    category: '',
    price: '',
    original_price: '',
    duration: '',
    duration_value: '',
    duration_unit: 'hours',
    level: 'Beginner',
    language: 'english',
    tags: '',
    thumbnail: '',
    published: false,
    learning_objectives: '',
    prerequisites: '',
    target_audience: '',
    certificate: false,
    commission_type: 'percentage',
    commission_value: '0.0'
  });

  // Component state
  const [formErrors, setFormErrors] = useState({});
  const [createSuccess, setCreateSuccess] = useState('');
  const [creating, setCreating] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [existingCourses, setExistingCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loadingInstructors, setLoadingInstructors] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState(null);

  const [learningPaths, setLearningPaths] = useState([]);
  const [loadingLearningPaths, setLoadingLearningPaths] = useState(false);

  // File upload state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadError, setUploadError] = useState(false);
  const [uploadedThumbnailUrl, setUploadedThumbnailUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Two-page modal state (for editing only)
  const [currentPage, setCurrentPage] = useState(1); // 1 for details, 2 for upload
  const [updatedCourseId, setUpdatedCourseId] = useState(null); // Store course ID after update

  // Content upload state (for page 2)
  const [contentUploads, setContentUploads] = useState({
    lectures: [],
    pdfs: []
  });
  const [uploadingContent, setUploadingContent] = useState(false);
  const [contentUploadProgress, setContentUploadProgress] = useState(0);
  const [contentUploadType, setContentUploadType] = useState('lecture'); // 'lecture' or 'pdf'

  // Throttled progress updaters to prevent flickering
  const throttledProgressUpdate = useCallback(
    throttle((progress) => {
      setUploadProgress(progress);
    }, 50), // Update every 50ms max
    []
  );

  const throttledContentProgressUpdate = useCallback(
    throttle((progress) => {
      setContentUploadProgress(progress);
    }, 50), // Update every 50ms max
    []
  );

  // Refs to prevent unnecessary re-renders
  const modalRef = useRef(null);
  const hasInitialized = useRef(false);
  const videoFileRef = useRef(null);
  const pdfFileRef = useRef(null);

  // Function to fetch existing courses to check for duplicates
  const fetchExistingCourses = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.get('http://localhost:4000/course/', { headers });
      if (response.data && Array.isArray(response.data)) {
        setExistingCourses(response.data);
      }
    } catch (error) {
      console.warn('Could not fetch existing courses for duplicate check:', error);
      setExistingCourses([]);
    }
  }, []);

  // Default course categories based on your specification (memoized to prevent re-renders)
  const defaultCategories = useMemo(() => [
    { id: 'development', title: 'Development' },
    { id: 'business', title: 'Business' },
    { id: 'finance-accounting', title: 'Finance & Accounting' },
    { id: 'it-software', title: 'IT & Software' },
    { id: 'office-productivity', title: 'Office Productivity' },
    { id: 'personal-development', title: 'Personal Development' },
    { id: 'design', title: 'Design' },
    { id: 'marketing', title: 'Marketing' },
    { id: 'lifestyle', title: 'Lifestyle' },
    { id: 'photography-video', title: 'Photography & Video' },
    { id: 'health-fitness', title: 'Health & Fitness' },
    { id: 'music', title: 'Music' },
    { id: 'teaching-academics', title: 'Teaching & Academics' }
  ], []);

  // Function to load learning paths - using ONLY default categories
  const fetchLearningPaths = useCallback(async () => {
    setLoadingLearningPaths(true);

    try {
      console.log('� Using default static categories only (no API call)');

      // Use ONLY default static categories - no API call, no merging
      setLearningPaths(defaultCategories);

      console.log('✅ Loaded', defaultCategories.length, 'default categories:', defaultCategories.map(cat => cat.title));
    } catch (error) {
      console.error('❌ Error loading categories:', error);
      // Fallback to default categories anyway
      setLearningPaths(defaultCategories);
    } finally {
      setLoadingLearningPaths(false);
    }
  }, [defaultCategories]);

  // Function to generate unique course ID from title
  const generateCourseId = useCallback((title) => {
    if (!title || typeof title !== 'string') return '';

    // Remove special characters and spaces, take first 4 characters, convert to uppercase
    const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const titlePrefix = cleanTitle.substring(0, 4).padEnd(4, 'X'); // Pad with 'X' if less than 4 chars

    // Check for duplicates and increment number if needed
    let courseNumber = 1;
    let courseId = `${titlePrefix}${courseNumber.toString().padStart(3, '0')}`;

    // Keep incrementing until we find a unique ID
    while (existingCourses.some(course => course.course_id === courseId)) {
      courseNumber++;
      courseId = `${titlePrefix}${courseNumber.toString().padStart(3, '0')}`;

      // Safety limit to prevent infinite loop
      if (courseNumber > 999) {
        courseId = `${titlePrefix}${Date.now().toString().slice(-3)}`;
        break;
      }
    }

    return courseId;
  }, [existingCourses]);

  // Always fetch current user from API and use user_id for instructor
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        // Try multiple token keys
        const token = localStorage.getItem('token') ||
          localStorage.getItem('adminToken') ||
          localStorage.getItem('authToken') ||
          localStorage.getItem('instructorToken');
        console.log('Token available:', token ? 'Yes' : 'No');

        if (!token) {
          console.warn('No authentication token found in localStorage');
          // Try to use stored user data as fallback
          const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
          if (storedUser && (storedUser.user_id || storedUser.id || storedUser._id)) {
            const userId = storedUser.user_id || storedUser.id || storedUser._id;
            const userName = storedUser.name || storedUser.full_name || storedUser.username || storedUser.email || 'Current User';
            setFormData(prev => ({
              ...prev,
              instructor: userId,
              instructor_name: userName
            }));
            console.log('✅ Using stored user data (no token):', { userId, userName });
          }
          return;
        }

        const headers = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        console.log('Fetching user profile from API...');
        // Fetch user profile from the correct endpoint
        const response = await axios.get('http://localhost:4000/auth/profile', { headers });
        console.log('Profile API response:', response.data);

        const user = response.data;
        if (user && (user.user_id || user.id || user._id)) {
          const userId = user.user_id || user.id || user._id;
          const userName = user.name || user.full_name || user.username || user.email || 'Current User';

          console.log('Setting instructor fields:', { userId, userName });
          setFormData(prev => ({
            ...prev,
            instructor: userId,
            instructor_name: userName
          }));

          console.log('✅ Auto-populated instructor fields:', { userId, userName });
        } else {
          console.warn('No user_id found in profile response:', user);
        }
      } catch (e) {
        console.warn('Error fetching current user from profile API:', e);
        console.log('Trying fallback to localStorage...');

        // Fallback to stored user data
        try {
          const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
          console.log('Stored user data:', storedUser);

          if (storedUser && (storedUser.user_id || storedUser.id || storedUser._id)) {
            const userId = storedUser.user_id || storedUser.id || storedUser._id;
            const userName = storedUser.name || storedUser.full_name || storedUser.username || storedUser.email || 'Current User';

            setFormData(prev => ({
              ...prev,
              instructor: userId,
              instructor_name: userName
            }));

            console.log('✅ Using stored user data:', { userId, userName });
          } else {
            console.warn('No valid user data found in localStorage');
          }
        } catch (parseError) {
          console.warn('Error parsing stored user data:', parseError);
        }
      }
    };

    // Fetch user data whenever modal opens (not just first time)
    if (isOpen && !isEditing) {
      console.log('Modal opened - fetching user profile...');
      fetchCurrentUser();
    } else if (isOpen && isEditing && editingCourse) {
      console.log('Modal opened for editing - populating form with course data...');

      // Parse duration string to extract value and unit
      let durationValue = '';
      let durationUnit = 'hours';
      if (editingCourse.duration) {
        const durationMatch = editingCourse.duration.match(/^(\d+)\s*(\w+)$/);
        if (durationMatch) {
          durationValue = durationMatch[1];
          durationUnit = durationMatch[2].toLowerCase();
        }
      }

      setFormData({
        title: editingCourse.title || '',
        description: editingCourse.description || '',
        instructor: editingCourse.instructor || '',
        instructor_name: editingCourse.instructor_name || '',
        course_id: editingCourse.course_id || '',
        category: editingCourse.category || '',
        price: editingCourse.price?.toString() || '',
        original_price: editingCourse.original_price?.toString() || '',
        duration: editingCourse.duration || '',
        duration_value: durationValue,
        duration_unit: durationUnit,
        level: editingCourse.level || 'Beginner',
        language: editingCourse.language || 'english',
        tags: Array.isArray(editingCourse.tags) ? editingCourse.tags.join(', ') : '',
        thumbnail: editingCourse.thumbnail || '',
        published: editingCourse.published || false,
        learning_objectives: editingCourse.learning_objectives || '',
        prerequisites: editingCourse.prerequisites || '',
        target_audience: editingCourse.target_audience || '',
        certificate: editingCourse.certificate || false,
        commission_type: editingCourse.commission_type || 'percentage',
        commission_value: editingCourse.commission_value?.toString() || '0.0'
      });
      setPreviewImage(editingCourse.thumbnail || '');

      // Check if thumbnail is an uploaded file or external URL
      if (editingCourse.thumbnail && editingCourse.thumbnail.includes('/upload/course-thumbnail/')) {
        setUploadedThumbnailUrl(editingCourse.thumbnail);
      } else {
        setUploadedThumbnailUrl('');
      }
    }
  }, [isOpen, isEditing, editingCourse]);

  // Fetch existing courses when modal opens for duplicate checking
  useEffect(() => {
    if (isOpen && !isEditing) {
      fetchExistingCourses();
    }
  }, [isOpen, isEditing, fetchExistingCourses]);

  // Fetch learning paths when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchLearningPaths();
    }
  }, [isOpen, fetchLearningPaths]);

  // Fetch instructors when modal opens (for admin/super_admin users)
  useEffect(() => {
    const loadInstructors = async () => {
      if (!isOpen) return;

      try {
        // Get current user role - try multiple token keys
        const token = localStorage.getItem('token') ||
          localStorage.getItem('adminToken') ||
          localStorage.getItem('authToken') ||
          localStorage.getItem('instructorToken');

        if (token) {
          try {
            const tokenPayload = JSON.parse(atob(token.split('.')[1]));
            const role = tokenPayload.role;
            setCurrentUserRole(role);
            console.log('✅ User role detected:', role);

            // Only fetch instructors for admin/super_admin users
            if (role === 'admin' || role === 'super_admin' || role === 'superadmin') {
              setLoadingInstructors(true);
              console.log('Fetching instructors for', role);

              const response = await fetchInstructors();
              console.log('Instructors API response:', response);

              if (response.success && response.users) {
                setInstructors(response.users);
                console.log('✅ Instructors loaded:', response.users.length);
              } else if (Array.isArray(response)) {
                setInstructors(response);
                console.log('✅ Instructors loaded (array):', response.length);
              } else {
                console.warn('No instructors found');
                setInstructors([]);
              }
              setLoadingInstructors(false);
            }
          } catch (tokenError) {
            console.error('Error parsing token:', tokenError);
            setCurrentUserRole(null);
          }
        } else {
          console.warn('No authentication token found');
          setCurrentUserRole(null);
        }
      } catch (error) {
        console.error('Error loading instructors:', error);
        setLoadingInstructors(false);
        setInstructors([]);
      }
    };

    loadInstructors();
  }, [isOpen]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormErrors({});
      setCreateSuccess('');
      setCreating(false);
      // Reset upload state
      setUploadProgress(0);
      setUploadMessage('');
      setUploadError(false);
      setUploadedThumbnailUrl('');
      setIsUploading(false);

      // Reset two-page modal state
      setCurrentPage(1);
      setUpdatedCourseId(null);
      setContentUploads({ lectures: [], pdfs: [] });
      setUploadingContent(false);
      setContentUploadProgress(0);
      setContentUploadType('lecture');

      if (!isEditing) {
        setFormData({
          title: '',
          description: '',
          instructor: '',
          instructor_name: '',
          course_id: '',
          category: '',
          price: '',
          original_price: '',
          duration: '',
          duration_value: '',
          duration_unit: 'hours',
          level: 'Beginner',
          language: 'english',
          tags: '',
          thumbnail: '',
          published: false,
          learning_objectives: '',
          prerequisites: '',
          target_audience: '',
          certificate: false,
          commission_type: 'percentage',
          commission_value: '0.0'
        });
        setPreviewImage('');
      }
    }
  }, [isOpen, isEditing]);

  // Handle thumbnail URL changes for immediate preview
  useEffect(() => {
    if (formData.thumbnail && formData.thumbnail !== uploadedThumbnailUrl) {
      // Only set preview if it's a valid URL (starts with http)
      if (formData.thumbnail.startsWith('http')) {
        setPreviewImage(formData.thumbnail);
      }
    }
  }, [formData.thumbnail, uploadedThumbnailUrl]);

  // Optimized input change handler
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      // Auto-generate course ID when title changes (only for new courses, not editing)
      if (field === 'title' && !isEditing && value.trim()) {
        newData.course_id = generateCourseId(value);
      }

      return newData;
    });

    // Handle thumbnail preview for both file upload and URL input
    if (field === 'thumbnail') {
      setPreviewImage(value);
      // Clear uploaded thumbnail URL when manually entering URL
      if (value && value !== uploadedThumbnailUrl) {
        setUploadedThumbnailUrl('');
      }
    }

    // Clear field errors
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [formErrors, isEditing, generateCourseId, uploadedThumbnailUrl]);

  // Form validation
  const validateForm = useCallback(() => {
    const errors = {};

    if (!formData.title?.trim()) errors.title = 'Course title is required';
    if (!formData.description?.trim()) errors.description = 'Description is required';
    if (!formData.category) errors.category = 'Category is required';

    // Price validation - allow 0 for free courses, but must be a valid number
    const priceValue = parseFloat(formData.price);
    if (formData.price === '' || formData.price === null || formData.price === undefined) {
      errors.price = 'Price is required (enter 0 for free courses)';
    } else if (isNaN(priceValue) || priceValue < 0) {
      errors.price = 'Price must be 0 or greater';
    }

    if (!formData.duration?.trim()) errors.duration = 'Duration is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  // Course creation handler
  const handleCreateCourse = useCallback(async () => {
    if (!validateForm()) return false;

    setCreating(true);
    setFormErrors({});

    try {
      const token = localStorage.getItem('token');

      // Get current user info or create test user
      let currentUser = {};
      try {
        currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      } catch (e) {
        console.warn('Error parsing user data:', e);
      }

      if (!currentUser.user_id && !currentUser._id && !currentUser.id) {
        currentUser = {
          user_id: 'test_instructor_' + Date.now(),
          name: 'Test Instructor',
          role: 'instructor'
        };
        console.log('Using test user data:', currentUser);
      }

      // Prepare data for backend
      // Handle price - ensure it's a valid number (0 for free courses)
      const priceValue = formData.price !== '' && formData.price !== null && formData.price !== undefined
        ? parseFloat(formData.price)
        : 0;

      // Handle original_price - can be null or a valid number
      let originalPriceValue = null;
      if (formData.original_price && formData.original_price !== '') {
        const parsedOriginalPrice = parseFloat(formData.original_price);
        if (!isNaN(parsedOriginalPrice) && parsedOriginalPrice >= 0) {
          originalPriceValue = parsedOriginalPrice;
        }
      }

      const courseData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        instructor: formData.instructor.trim() || currentUser.user_id || currentUser._id || currentUser.id || 'default_instructor',
        instructor_name: formData.instructor_name.trim() || currentUser.name || currentUser.full_name || 'Instructor',
        category: formData.category,
        price: priceValue,
        original_price: originalPriceValue,
        duration: formData.duration.trim() || null,
        level: formData.level || 'Beginner',
        language: formData.language || 'english',
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [],
        thumbnail: formData.thumbnail.trim() || null,
        published: formData.published || false,
        status: isEditing ? (editingCourse?.status || "Active") : "Pending", // New courses need admin approval
        lessons: 0,
        created_by: currentUser.user_id || currentUser._id || currentUser.id || 'default_user',
        created_by_role: currentUser.role || 'instructor',
        commission_type: formData.commission_type || 'percentage',
        commission_value: parseFloat(formData.commission_value) || 0.0
      };

      console.log(`${isEditing ? 'Updating' : 'Creating'} course with data:`, courseData);

      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      let response;
      if (isEditing && editingCourse) {
        const courseId = editingCourse.id || editingCourse._id;
        if (!courseId || courseId === 'undefined') {
          console.error('Invalid courseId for editing course in CreateCourseModal:', editingCourse);
          alert('Error: Invalid course ID. Please refresh the page and try again.');
          return;
        }
        response = await axios.put(`http://localhost:4000/course/${courseId}`, courseData, { headers });
      } else {
        response = await axios.post('http://localhost:4000/course/', courseData, { headers });
      }

      setCreateSuccess(`Course ${isEditing ? 'updated' : 'created'} successfully!`);

      // For editing, move to page 2 for content upload
      if (isEditing) {
        // Store the updated course ID for content uploads
        setUpdatedCourseId(editingCourse.id || editingCourse._id || editingCourse.course_id);
        setTimeout(() => {
          setCurrentPage(2);
          setCreateSuccess('');
        }, 1500);
      } else {
        // For new courses, close modal after delay
        setTimeout(() => {
          onSuccess && onSuccess();
        }, 1500);
      }

      return true;
    } catch (error) {
      console.error('Error creating/updating course:', error);

      let errorMessage = 'Failed to create course. Please try again.';
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map(err => err.msg || err.message || 'Validation error').join(', ');
        }
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please login again.';
      } else if (error.response?.status === 422) {
        errorMessage = 'Invalid data provided. Please check all fields.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }

      setFormErrors({ general: errorMessage });
      return false;
    } finally {
      setCreating(false);
    }
  }, [validateForm, formData, isEditing, editingCourse, onSuccess]);

  // Handle form submission and navigation
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    handleCreateCourse();
  }, [handleCreateCourse]);

  // Navigate back to page 1
  const handleBackToPage1 = useCallback(() => {
    setCurrentPage(1);
  }, []);

  // Complete the editing process
  const handleCompleteEdit = useCallback(() => {
    onSuccess && onSuccess();
  }, [onSuccess]);

  // File upload handler
  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log('File selected:', file.name, file.type, file.size);

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setUploadMessage('Please select a valid image file (JPG, PNG, WebP, or GIF)');
      setUploadError(true);
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setUploadMessage('File size must be less than 5MB');
      setUploadError(true);
      return;
    }

    // Show immediate preview using FileReader
    const reader = new FileReader();
    reader.onload = (e) => {
      const localPreview = e.target.result;
      console.log('Setting local preview:', localPreview.substring(0, 50) + '...');
      setPreviewImage(localPreview);
    };
    reader.readAsDataURL(file);

    // Reset upload state
    setUploadProgress(0);
    setUploadMessage('');
    setUploadError(false);
    setIsUploading(true);

    try {
      // Generate temporary course ID for upload if creating new course
      let courseId;
      if (isEditing && editingCourse) {
        courseId = editingCourse.id || editingCourse._id || editingCourse.course_id;
      } else {
        courseId = formData.course_id || generateCourseId(formData.title) || `temp_${Date.now()}`;
      }

      console.log('Upload courseId:', courseId);
      console.log('Form title:', formData.title);
      console.log('Generated course ID:', formData.course_id);

      // Prepare form data
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('resize', 'true');

      // Get token for authentication
      const token = localStorage.getItem('token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('Using auth token:', token.substring(0, 20) + '...');
      } else {
        console.warn('No auth token found - upload may fail');
      }

      // Upload with progress tracking
      const xhr = new XMLHttpRequest();

      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            // Use requestAnimationFrame to throttle progress updates and reduce flickering
            requestAnimationFrame(() => {
              setUploadProgress(progress);
            });
          }
        });

        xhr.onload = () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              console.log('Upload response:', response);
              if (response.success) {
                // Construct full thumbnail URL
                const thumbnailUrl = `http://localhost:4000${response.thumbnail_url}`;

                setUploadedThumbnailUrl(thumbnailUrl);
                setPreviewImage(thumbnailUrl);
                handleInputChange('thumbnail', thumbnailUrl);
                setUploadMessage('Thumbnail uploaded successfully!');
                setUploadError(false);
                setUploadProgress(100);

                console.log('Upload successful, thumbnail URL:', thumbnailUrl);
                resolve(response);
              } else {
                console.error('Upload failed:', response.message);
                setUploadMessage(response.message || 'Upload failed');
                setUploadError(true);
                reject(new Error(response.message || 'Upload failed'));
              }
            } catch (e) {
              console.error('Invalid response from server:', xhr.responseText);
              setUploadMessage('Invalid response from server');
              setUploadError(true);
              reject(new Error('Invalid response from server'));
            }
          } else {
            console.error('Upload failed with status:', xhr.status, xhr.responseText);
            let errorMessage = `Upload failed with status: ${xhr.status}`;

            // Try to parse error details from response
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              if (errorResponse.detail) {
                if (errorResponse.detail.includes('Permission denied')) {
                  errorMessage = 'Server permission error. Please contact administrator.';
                } else if (errorResponse.detail.includes('No such file or directory')) {
                  errorMessage = 'Server directory not found. Please contact administrator.';
                } else {
                  errorMessage = errorResponse.detail;
                }
              }
            } catch (e) {
              // Keep the default error message if we can't parse the response
            }

            setUploadMessage(errorMessage);
            setUploadError(true);
            reject(new Error(errorMessage));
          }
          setIsUploading(false);
        };

        xhr.onerror = () => {
          reject(new Error('Network error during upload'));
          setIsUploading(false);
        };

        const uploadUrl = `http://localhost:4000/upload/course-thumbnail/${courseId}`;
        console.log('Upload URL:', uploadUrl);

        xhr.open('POST', uploadUrl);

        // Add auth header if available
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        console.log('Starting file upload...');
        xhr.send(uploadFormData);
      });

    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadMessage(error.message || 'Failed to upload thumbnail');
      setUploadError(true);
      setUploadProgress(0);
      setIsUploading(false);
      // Keep the local preview even if upload fails
      // setPreviewImage(''); // Don't clear preview on upload error
    }
  }, [formData.course_id, formData.title, generateCourseId, handleInputChange, isEditing, editingCourse]);

  // Handle thumbnail removal
  const handleRemoveThumbnail = useCallback(async () => {
    if (!uploadedThumbnailUrl) return;

    try {
      let courseId;
      if (isEditing && editingCourse) {
        courseId = editingCourse.id || editingCourse._id || editingCourse.course_id;
      } else {
        courseId = formData.course_id || `temp_${Date.now()}`;
      }

      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Call delete API
      const response = await axios.delete(`http://localhost:4000/upload/course-thumbnail/${courseId}`, { headers });

      if (response.data.success) {
        setUploadedThumbnailUrl('');
        setPreviewImage('');
        handleInputChange('thumbnail', '');
        setUploadMessage('Thumbnail removed successfully');
        setUploadError(false);
      }
    } catch (error) {
      console.warn('Error removing thumbnail:', error);
      // Still clear the local state even if delete fails
      setUploadedThumbnailUrl('');
      setPreviewImage('');
      handleInputChange('thumbnail', '');
    }
  }, [uploadedThumbnailUrl, formData.course_id, handleInputChange, isEditing, editingCourse]);

  // Content upload handlers
  const handleContentFileUpload = useCallback(async (event, type) => {
    const file = event.target.files[0];
    if (!file || !updatedCourseId) return;

    // Validate file type and size
    const isLecture = type === 'lecture';
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

    // Check file size
    const maxSize = isLecture ? 500 * 1024 * 1024 : 50 * 1024 * 1024; // 500MB for video, 50MB for PDF
    if (file.size > maxSize) {
      alert(`File size exceeds ${isLecture ? '500MB' : '50MB'} limit`);
      return;
    }

    setUploadingContent(true);
    setContentUploadProgress(0);
    setContentUploadType(type);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const endpoint = `http://localhost:4000/course/${updatedCourseId}/upload-${type}`;

      const xhr = new XMLHttpRequest();

      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            // Use throttled updates for smoother progress
            throttledContentProgressUpdate(progress);
          }
        });

        xhr.onload = () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);

              // Add to local state
              setContentUploads(prev => ({
                ...prev,
                [type === 'lecture' ? 'lectures' : 'pdfs']: [
                  ...prev[type === 'lecture' ? 'lectures' : 'pdfs'],
                  {
                    filename: response.filename,
                    original_name: response.original_name,
                    file_size: response.file_size,
                    sequence_number: response.sequence_number
                  }
                ]
              }));

              // Show success message
              const message = document.createElement('div');
              message.innerHTML = `
                <div style="position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 12px 20px; border-radius: 8px; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                  ✓ ${isLecture ? 'Video' : 'PDF'} uploaded successfully!
                </div>
              `;
              document.body.appendChild(message);
              setTimeout(() => document.body.removeChild(message), 3000);

              resolve(response);
            } catch (e) {
              reject(new Error('Invalid response from server'));
            }
          } else {
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
          setUploadingContent(false);
          setContentUploadProgress(0);
        };

        xhr.onerror = () => {
          reject(new Error('Network error during upload'));
          setUploadingContent(false);
          setContentUploadProgress(0);
        };

        const token = localStorage.getItem('token');
        xhr.open('POST', endpoint);
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        xhr.send(formData);
      });

    } catch (error) {
      console.error('Upload failed:', error);
      alert(`Failed to upload ${isLecture ? 'video' : 'PDF'}: ${error.message}`);
      setUploadingContent(false);
      setContentUploadProgress(0);
    }
  }, [updatedCourseId]);

  // Handle modal close
  const handleClose = useCallback(() => {
    if (currentPage === 2 || (!formData.title && !formData.description)) {
      onClose();
      return;
    }

    if (window.confirm('Are you sure you want to close? Any unsaved changes will be lost.')) {
      onClose();
    }
  }, [formData.title, formData.description, onClose, currentPage]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget && !creating) {
      handleClose();
    }
  }, [creating, handleClose]);

  // Don't render if not open - return early to save performance
  if (!isOpen) {
    return null;
  }

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 modal-backdrop"
      onClick={handleBackdropClick}
      style={{ animation: 'fadeIn 0.3s ease-out' }}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden transform transition-all duration-300 upload-modal animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: 'slideIn 0.3s ease-out',
          willChange: 'transform, opacity',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden'
        }}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 px-6 py-4 text-white">
          <button
            onClick={handleClose}
            disabled={creating}
            className="absolute top-3 right-3 text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>

          <h2 className="text-2xl font-bold">
            {isEditing ? (
              currentPage === 1 ? '✏️ Edit Course Details' : '� Upload Course Content'
            ) : '�🚀 Create New Course'}
          </h2>
          <p className="text-white/90 mt-1">
            {isEditing ? (
              currentPage === 1
                ? 'Update your course information below'
                : 'Upload videos and PDF materials for your course'
            ) : 'Fill in the details below to create your course'}
          </p>

          {/* Progress indicator for editing */}
          {isEditing && (
            <div className="flex items-center mt-3 space-x-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${currentPage === 1 ? 'bg-white text-blue-600' : 'bg-white/30 text-white'
                }`}>
                1
              </div>
              <div className="flex-1 h-1 bg-white/30 rounded-full">
                <div className={`h-full bg-white rounded-full transition-all duration-300 ${currentPage >= 2 ? 'w-full' : 'w-0'
                  }`}></div>
              </div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${currentPage === 2 ? 'bg-white text-blue-600' : 'bg-white/30 text-white'
                }`}>
                2
              </div>
            </div>
          )}
        </div>

        {/* Form Content */}
        <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {/* Success Message */}
          {createSuccess && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center">
              <div className="text-orange-500 mr-3">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-orange-800 font-medium">{createSuccess}</p>
            </div>
          )}

          {/* Error Message */}
          {formErrors.general && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center">
              <div className="text-red-500 mr-3">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-red-800 font-medium">{formErrors.general}</p>
            </div>
          )}

          {/* Page 1: Course Details Form (Create new course OR Edit course details) */}
          {(!isEditing || currentPage === 1) && (
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              {/* Basic Information Section */}
              <div className="bg-gray-50 p-6 rounded-xl">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="bg-[#988913] text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">1</span>
                  Basic Information
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Course Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all duration-200 ${formErrors.title ? 'border-red-300 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                        }`}
                      placeholder="Enter an engaging course title"
                    />
                    {formErrors.title && <p className="text-red-500 text-sm mt-1">{formErrors.title}</p>}
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Course Description *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={4}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all duration-200 resize-none ${formErrors.description ? 'border-red-300 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                        }`}
                      placeholder="Describe what students will learn and achieve..."
                    />
                    {formErrors.description && <p className="text-red-500 text-sm mt-1">{formErrors.description}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all duration-200 ${formErrors.category ? 'border-red-300 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                        }`}
                      disabled={loadingLearningPaths}
                    >
                      <option value="">
                        {loadingLearningPaths ? 'Loading categories...' : 'Select Category'}
                      </option>

                      {/* Dynamic API Categories First (if available) */}
                      {!loadingLearningPaths && learningPaths.length > 0 && (
                        <>
                          {learningPaths.map((path) => (
                            <option
                              key={path.id}
                              value={path.title}
                            >
                              {path.title}
                            </option>
                          ))}
                        </>
                      )}

                      {/* Fallback to Default Categories if API fails */}
                      {!loadingLearningPaths && learningPaths.length === 0 && (
                        <>
                          {defaultCategories.map((category) => (
                            <option
                              key={category.id}
                              value={category.title}
                            >
                              {category.title}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                    {formErrors.category && <p className="text-red-500 text-sm mt-1">{formErrors.category}</p>}

                    {/* Category Status Indicator */}
                    <div className="mt-2 text-sm">
                      {loadingLearningPaths ? (
                        <span className="text-blue-600 flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2"></div>
                          Loading categories from API...
                        </span>
                      ) : learningPaths.length > defaultCategories.length ? (
                        <span className="text-orange-600 flex items-center">
                          ✓ {learningPaths.length} categories loaded ({learningPaths.length - defaultCategories.length} from API, {defaultCategories.length} default)
                        </span>
                      ) : (
                        <span className="text-orange-600 flex items-center">
                          {/* ⚠ Using {defaultCategories.length} default categories (API returned no additional categories) */}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Difficulty Level
                    </label>
                    <select
                      value={formData.level}
                      onChange={(e) => handleInputChange('level', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-all duration-200"
                    >
                      <option value="Beginner">🟢 Beginner</option>
                      <option value="Intermediate">🟡 Intermediate</option>
                      <option value="Advanced">🔴 Advanced</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Pricing & Details Section */}
              <div className="bg-gray-50 p-6 rounded-xl">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="bg-[#c5a32e] text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">2</span>
                  Pricing & Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price ($) *
                    </label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', e.target.value)}
                      min="0"
                      step="0.01"
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all duration-200 ${formErrors.price ? 'border-red-300 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                        }`}
                      placeholder="29.99"
                    />
                    {formErrors.price && <p className="text-red-500 text-sm mt-1">{formErrors.price}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Original Price ($)
                    </label>
                    <input
                      type="number"
                      value={formData.original_price}
                      onChange={(e) => handleInputChange('original_price', e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-all duration-200"
                      placeholder="49.99 (if discounted)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration *
                    </label>
                    <div className="flex gap-3">
                      <div className="w-32">
                        <input
                          type="number"
                          min="1"
                          value={formData.duration_value}
                          onChange={(e) => {
                            const value = e.target.value;
                            const unit = formData.duration_unit;
                            handleInputChange('duration_value', value);
                            // Update combined duration string
                            if (value) {
                              handleInputChange('duration', `${value} ${unit}`);
                            } else {
                              handleInputChange('duration', '');
                            }
                          }}
                          className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all duration-200 ${formErrors.duration ? 'border-red-300 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                            }`}
                          placeholder="8"
                        />
                      </div>
                      <div className="flex-1">
                        <select
                          value={formData.duration_unit}
                          onChange={(e) => {
                            const unit = e.target.value;
                            const value = formData.duration_value;
                            handleInputChange('duration_unit', unit);
                            // Update combined duration string
                            if (value) {
                              handleInputChange('duration', `${value} ${unit}`);
                            }
                          }}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-all duration-200 bg-white"
                        >
                          <option value="hours">Hours</option>
                          <option value="weeks">Weeks</option>
                          <option value="months">Months</option>
                          <option value="years">Years</option>
                          <option value="self-paced">Self-paced</option>
                        </select>
                      </div>
                    </div>
                    {formErrors.duration && <p className="text-red-500 text-sm mt-1">{formErrors.duration}</p>}
                  </div>

                  {/* Commission Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Commission Type
                    </label>
                    <select
                      value={formData.commission_type}
                      onChange={(e) => handleInputChange('commission_type', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-all duration-200"
                    >
                      <option value="percentage">Percentage</option>
                    </select>
                    <p className="text-gray-500 text-xs mt-1">How platform commission is calculated</p>
                  </div>

                  {/* Commission Value */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Commission Value {formData.commission_type === 'percentage' ? '(%)' : '($)'}
                    </label>
                    <input
                      type="number"
                      value={formData.commission_value}
                      onChange={(e) => handleInputChange('commission_value', e.target.value)}
                      min="0"
                      max={formData.commission_type === 'percentage' ? "100" : undefined}
                      step="0.01"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-all duration-200"
                      placeholder={formData.commission_type === 'percentage' ? "15.0" : "5.00"}
                    />
                    <p className="text-gray-500 text-xs mt-1">
                      {formData.commission_type === 'percentage'
                        ? 'Percentage of course price (0-100%)'
                        : 'Fixed amount in dollars'
                      }
                    </p>
                  </div>

                  {/* Earnings Preview */}
                  {formData.price && parseFloat(formData.price) > 0 && (
                    <div className="bg-gradient-to-r from-blue-50 to-orange-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">💰 Earnings Preview</h4>
                      {(() => {
                        const price = parseFloat(formData.price) || 0;
                        const commissionValue = parseFloat(formData.commission_value) || 0;
                        const commissionType = formData.commission_type;

                        let platformEarn;
                        if (commissionType === 'percentage') {
                          platformEarn = Math.round(price * commissionValue / 100 * 100) / 100;
                        } else {
                          platformEarn = Math.min(commissionValue, price);
                        }
                        const instructorEarn = Math.round((price - platformEarn) * 100) / 100;

                        return (
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Platform:</span>
                              <span className="font-medium text-blue-600">${platformEarn.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between border-t pt-1">
                              <span className="text-gray-600">Instructor:</span>
                              <span className="font-medium text-orange-600">${instructorEarn.toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Language
                    </label>
                    <select
                      value={formData.language}
                      onChange={(e) => handleInputChange('language', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-all duration-200"
                    >
                      <option value="english">🇺🇸 English</option>
                      <option value="spanish">🇪🇸 Spanish</option>
                      <option value="french">🇫🇷 French</option>
                      <option value="german">🇩🇪 German</option>
                      <option value="portuguese">�� Portuguese</option>
                      <option value="italian">�� Italian</option>
                      <option value="russian">🇷🇺 Russian</option>
                      <option value="dutch">🇳🇱 Dutch</option>
                      <option value="none">� Other/Multiple Languages</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Published Status
                    </label>
                    <select
                      value={formData.published}
                      onChange={(e) => handleInputChange('published', e.target.value === 'true')}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-all duration-200"
                    >
                      <option value={false}>🔒 Draft</option>
                      <option value={true}>✅ Published</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Certificate Available
                    </label>
                    <select
                      value={formData.certificate}
                      onChange={(e) => handleInputChange('certificate', e.target.value === 'true')}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-all duration-200"
                    >
                      <option value={false}>❌ No Certificate</option>
                      <option value={true}>🏆 Certificate Available</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Content & Learning Section */}
              <div className="bg-gray-50 p-6 rounded-xl">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">3</span>
                  Learning Content
                </h3>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Learning Objectives
                    </label>
                    <textarea
                      value={formData.learning_objectives}
                      onChange={(e) => handleInputChange('learning_objectives', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-all duration-200 resize-none"
                      placeholder="What will students learn from this course?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prerequisites
                    </label>
                    <textarea
                      value={formData.prerequisites}
                      onChange={(e) => handleInputChange('prerequisites', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-all duration-200 resize-none"
                      placeholder="What knowledge or skills should students have before taking this course?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Target Audience
                    </label>
                    <textarea
                      value={formData.target_audience}
                      onChange={(e) => handleInputChange('target_audience', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-all duration-200 resize-none"
                      placeholder="Who is this course for?"
                    />
                  </div>
                </div>
              </div>

              {/* Media & Advanced Section */}
              <div className="bg-gray-50 p-6 rounded-xl">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">4</span>
                  Media & Advanced Settings
                </h3>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Course Thumbnail
                    </label>

                    {/* Upload Section */}
                    <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors duration-200">
                      <div className="space-y-4">
                        {/* File Upload */}
                        <div>
                          <input
                            type="file"
                            id="thumbnail-upload"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          <label
                            htmlFor="thumbnail-upload"
                            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#988913] to-[#7d7310] hover:from-[#7d7310] hover:to-[#988913] text-white rounded-lg cursor-pointer shadow hover:shadow-lg hover:shadow-[#988913]/25 transition-all duration-200"
                          >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            Choose Image File
                          </label>
                          <p className="text-xs text-gray-500 mt-2">
                            JPG, PNG, WebP or GIF (max 5MB)
                          </p>
                        </div>

                        <div className="flex items-center">
                          <div className="flex-1 h-px bg-gray-300"></div>
                          <span className="px-3 text-sm text-gray-500">OR</span>
                          <div className="flex-1 h-px bg-gray-300"></div>
                        </div>

                        {/* URL Input */}
                        <div>
                          <input
                            type="url"
                            value={formData.thumbnail}
                            onChange={(e) => handleInputChange('thumbnail', e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-all duration-200"
                            placeholder="https://example.com/course-image.jpg"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Enter image URL directly
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Upload Progress */}
                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                          <span>Uploading...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-[#988913] h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${uploadProgress}%`,
                              transform: 'translateZ(0)',
                              willChange: 'width'
                            }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Upload Success/Error Messages */}
                    {uploadMessage && (
                      <div className={`mt-4 p-3 rounded-lg ${uploadError ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-orange-50 text-orange-800 border border-orange-200'}`}>
                        <div className="flex items-center">
                          {uploadError ? (
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                          <span className="text-sm font-medium">{uploadMessage}</span>
                        </div>
                      </div>
                    )}

                    {/* Preview */}
                    {previewImage && (
                      <div className="mt-4 p-3 bg-white rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium text-gray-700">Preview:</p>
                            <p className="text-xs text-gray-500">
                              {uploadedThumbnailUrl ? 'Uploaded image' : previewImage.startsWith('data:') ? 'Local file (not uploaded)' : 'External URL'}
                            </p>
                          </div>
                          {uploadedThumbnailUrl && (
                            <button
                              type="button"
                              onClick={handleRemoveThumbnail}
                              className="text-red-600 hover:text-red-800 text-xs"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <img
                          src={previewImage}
                          alt="Course thumbnail preview"
                          className="w-40 h-24 object-cover rounded-lg border shadow-sm"
                          onError={(e) => {
                            console.error('Failed to load image:', previewImage);
                            e.target.style.display = 'none';
                          }}
                          onLoad={() => {
                            console.log('Image loaded successfully:', previewImage.substring(0, 50) + '...');
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => handleInputChange('tags', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-all duration-200"
                      placeholder="e.g., JavaScript, React, Web Development, Frontend"
                    />
                    <p className="text-gray-500 text-sm mt-1">Add tags to help students find your course</p>
                  </div>

                  {/* Instructor Selection - Show for admin/super_admin, auto-populated for instructors */}
                  {currentUserRole && (currentUserRole === 'admin' || currentUserRole === 'super_admin' || currentUserRole === 'superadmin') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Instructor <span className="text-red-500">*</span>
                      </label>
                      {loadingInstructors ? (
                        <div className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-50 flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2"></div>
                          <span className="text-gray-600">Loading instructors...</span>
                        </div>
                      ) : (
                        <select
                          value={formData.instructor}
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            const selectedInstructor = instructors.find(inst =>
                              (inst.id || inst._id || inst.user_id) === selectedId
                            );
                            handleInputChange('instructor', selectedId);
                            if (selectedInstructor) {
                              const name = selectedInstructor.name || selectedInstructor.full_name || selectedInstructor.username || 'Instructor';
                              handleInputChange('instructor_name', name);
                            }
                          }}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-all duration-200 bg-white"
                          required
                        >
                          <option value="">-- Select an Instructor --</option>
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
                      {instructors.length === 0 && !loadingInstructors && (
                        <p className="text-orange-600 text-sm mt-1">⚠️ No instructors found. Please add instructors first.</p>
                      )}
                      {formData.instructor && (
                        <p className="text-orange-600 text-sm mt-1">✓ Instructor selected: {formData.instructor_name}</p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Course ID
                      {formData.course_id && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Auto-generated (unique)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={formData.course_id}
                      onChange={(e) => handleInputChange('course_id', e.target.value)}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-blue-500 transition-all duration-200 ${formData.course_id ? 'bg-blue-50 border-blue-300' : 'border-gray-300'
                        }`}
                      placeholder="TITL001 (auto-generated from title)"
                      title={formData.course_id ? 'Auto-generated unique course identifier from title' : 'Enter course ID or let it auto-generate from title'}
                    />
                    {formData.course_id ? (
                      <p className="text-blue-600 text-xs mt-1">✓ Unique ID generated: "{formData.course_id}" (checked against existing courses)</p>
                    ) : (
                      <p className="text-gray-500 text-sm mt-1">Will auto-generate unique ID when you enter a course title</p>
                    )}
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* Page 2: Content Upload (Only for editing) */}
          {isEditing && currentPage === 2 && (
            <div className="space-y-8">
              {/* Upload Section Header */}
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Upload Course Content</h3>
                <p className="text-gray-600">Add videos and PDF materials to your course</p>
                <p className="text-sm text-gray-500 mt-1">Course: {formData.title}</p>
              </div>

              {/* Video Upload Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Video Lectures
                </h4>

                {/* Video Upload Area */}
                <div className="space-y-4">
                  <input
                    ref={videoFileRef}
                    type="file"
                    accept="video/*,.mp4,.avi,.mov,.wmv,.webm"
                    onChange={(e) => handleContentFileUpload(e, 'lecture')}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => videoFileRef.current?.click()}
                    disabled={uploadingContent && contentUploadType === 'lecture'}
                    className="w-full py-4 px-6 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-400 bg-blue-50 hover:bg-blue-100 transition-colors duration-200 flex flex-col items-center space-y-2"
                  >
                    {uploadingContent && contentUploadType === 'lecture' ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                        <span className="text-blue-700">Uploading... {contentUploadProgress}%</span>
                      </div>
                    ) : (
                      <>
                        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-blue-700 font-medium">Choose Video File</span>
                        <span className="text-blue-600 text-sm">MP4, AVI, MOV, WMV, WebM (max 500MB)</span>
                      </>
                    )}
                  </button>

                  {/* Video Progress Bar */}
                  {uploadingContent && contentUploadType === 'lecture' && (
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${contentUploadProgress}%`,
                          transform: 'translateZ(0)',
                          willChange: 'width'
                        }}
                      ></div>
                    </div>
                  )}

                  {/* Uploaded Videos List */}
                  {contentUploads.lectures.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-sm font-medium text-blue-800 mb-2">Uploaded Videos:</h5>
                      <div className="space-y-2">
                        {contentUploads.lectures.map((lecture, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                            <div className="flex items-center space-x-2">
                              <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                              </svg>
                              <span className="text-sm text-gray-700">{lecture.original_name}</span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {(lecture.file_size / (1024 * 1024)).toFixed(2)} MB
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* PDF Upload Section */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-purple-800 mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  PDF Materials
                </h4>

                {/* PDF Upload Area */}
                <div className="space-y-4">
                  <input
                    ref={pdfFileRef}
                    type="file"
                    accept=".pdf"
                    onChange={(e) => handleContentFileUpload(e, 'pdf')}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => pdfFileRef.current?.click()}
                    disabled={uploadingContent && contentUploadType === 'pdf'}
                    className="w-full py-4 px-6 border-2 border-dashed border-purple-300 rounded-lg hover:border-purple-400 bg-purple-50 hover:bg-purple-100 transition-colors duration-200 flex flex-col items-center space-y-2"
                  >
                    {uploadingContent && contentUploadType === 'pdf' ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-500 border-t-transparent"></div>
                        <span className="text-purple-700">Uploading... {contentUploadProgress}%</span>
                      </div>
                    ) : (
                      <>
                        <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-purple-700 font-medium">Choose PDF File</span>
                        <span className="text-purple-600 text-sm">PDF documents (max 50MB)</span>
                      </>
                    )}
                  </button>

                  {/* PDF Progress Bar */}
                  {uploadingContent && contentUploadType === 'pdf' && (
                    <div className="w-full bg-purple-200 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${contentUploadProgress}%`,
                          transform: 'translateZ(0)',
                          willChange: 'width'
                        }}
                      ></div>
                    </div>
                  )}

                  {/* Uploaded PDFs List */}
                  {contentUploads.pdfs.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-sm font-medium text-purple-800 mb-2">Uploaded PDFs:</h5>
                      <div className="space-y-2">
                        {contentUploads.pdfs.map((pdf, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                            <div className="flex items-center space-x-2">
                              <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                              </svg>
                              <span className="text-sm text-gray-700">{pdf.original_name}</span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {(pdf.file_size / (1024 * 1024)).toFixed(2)} MB
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Tips */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h5 className="text-sm font-semibold text-gray-800 mb-2">💡 Upload Tips:</h5>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Videos are automatically organized and named for easy management</li>
                  <li>• Supported video formats: MP4, AVI, MOV, WMV, WebM (max 500MB each)</li>
                  <li>• PDF materials support documents up to 50MB each</li>
                  <li>• You can upload multiple files - add them one by one</li>
                  <li>• All files are stored securely and accessible to enrolled students</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 bg-gray-50 border-t border-gray-200">
          {/* Page 1 Footer */}
          {(!isEditing || currentPage === 1) && (
            <div className="flex items-center justify-end w-full space-x-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={creating}
                className="px-6 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-all duration-200 border border-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCreateCourse}
                disabled={creating}
                className={`flex items-center space-x-2 px-8 py-3 rounded-lg font-medium transition-all duration-200 ${creating
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-gradient-to-r from-[#988913] to-[#7d7310] text-white hover:from-[#7d7310] hover:to-[#988913] shadow-lg hover:shadow-xl hover:shadow-[#988913]/25 transform hover:-translate-y-0.5'
                  }`}
              >
                {creating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>{isEditing ? 'Updating...' : 'Creating...'}</span>
                  </>
                ) : (
                  <>
                    <span>{isEditing ? '💾 Save and Continue' : '🚀 Create Course'}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Page 2 Footer */}
          {isEditing && currentPage === 2 && (
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={handleBackToPage1}
                disabled={uploadingContent}
                className="px-6 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-all duration-200 border border-gray-300 disabled:opacity-50"
              >
                ← Back to Details
              </button>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={uploadingContent}
                  className="px-6 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-all duration-200 border border-gray-300 disabled:opacity-50"
                >
                  Skip Upload
                </button>

                <button
                  type="button"
                  onClick={handleCompleteEdit}
                  disabled={uploadingContent}
                  className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:transform-none"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Complete Edit</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

// Memoize component with custom comparison to prevent unnecessary re-renders
export default React.memo(CreateCourseModal, (prevProps, nextProps) => {
  // Return true if props are equal (skip re-render)
  // Return false if props changed (do re-render)

  // If modal is closed and was closed, skip re-render
  if (!prevProps.isOpen && !nextProps.isOpen) {
    return true; // Skip re-render
  }

  // Check if relevant props changed
  return (
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.isEditing === nextProps.isEditing &&
    prevProps.editingCourse?.id === nextProps.editingCourse?.id
    // Note: We intentionally don't compare onClose and onSuccess 
    // because they're created inline and always "different"
    // but the component will still work correctly
  );
});
