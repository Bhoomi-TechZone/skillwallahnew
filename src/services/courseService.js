import { getApiBaseUrl } from '../config/api.js';
import { getAuthHeaders } from '../utils/authUtils.js';

const API_BASE_URL = getApiBaseUrl();

class CourseService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/course`;
  }

  // Get Authorization header (deprecated - use getAuthHeaders from authUtils)
  getAuthHeaders() {
    // Use the centralized auth utility for consistency
    return getAuthHeaders();
  }

  // Create a new course
  async createCourse(courseData) {
    try {
      const response = await fetch(`${this.baseURL}/`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(courseData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create course:', error);
      throw error;
    }
  }

  // Get all courses with filters
  async getCourses(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Add filter parameters matching backend API
      if (filters.skip !== undefined) queryParams.append('skip', filters.skip);
      if (filters.limit !== undefined) queryParams.append('limit', filters.limit);
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.level) queryParams.append('level', filters.level);
      if (filters.published !== undefined) queryParams.append('published', filters.published);
      if (filters.min_price !== undefined) queryParams.append('min_price', filters.min_price);
      if (filters.max_price !== undefined) queryParams.append('max_price', filters.max_price);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.instructor) queryParams.append('instructor', filters.instructor);

      const url = queryParams.toString() ? 
        `${this.baseURL}/?${queryParams.toString()}` : 
        `${this.baseURL}/`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      throw error;
    }
  }

  // Get a specific course by ID
  async getCourseById(courseId) {
    try {
      const response = await fetch(`${this.baseURL}/${courseId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch course:', error);
      throw error;
    }
  }

  // Update a course
  async updateCourse(courseId, updateData) {
    try {
      console.log('=== COURSESERVICE UPDATE DEBUG ===');
      console.log('Course ID:', courseId);
      console.log('Update data:', updateData);
      console.log('API URL:', `${this.baseURL}/${courseId}`);
      
      const headers = this.getAuthHeaders();
      console.log('Request headers:', headers);
      
      const response = await fetch(`${this.baseURL}/${courseId}`, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(updateData)
      });

      console.log('Response status:', response.status);
      console.log('Response status text:', response.statusText);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        try {
          const errorData = await response.json();
          console.log('Error response data:', errorData);
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
          // Try to get response as text
          try {
            const errorText = await response.text();
            console.log('Error response text:', errorText);
          } catch (textError) {
            console.error('Could not read error response as text:', textError);
          }
        }
        
        // Add specific error messages for common status codes
        if (response.status === 401) {
          errorMessage = 'Unauthorized. Please log in again.';
        } else if (response.status === 403) {
          errorMessage = 'Forbidden. You do not have permission to update this course.';
        } else if (response.status === 404) {
          errorMessage = 'Course not found.';
        } else if (response.status === 422) {
          errorMessage = 'Validation error: ' + errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log('Success response data:', responseData);
      return responseData;
    } catch (error) {
      console.error('Failed to update course:', error);
      throw error;
    }
  }

  // Delete a course
  async deleteCourse(courseId) {
    try {
      const response = await fetch(`${this.baseURL}/${courseId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to delete course:', error);
      throw error;
    }
  }

  // Get courses by instructor
  async getCoursesByInstructor(instructorId, publishedOnly = false) {
    try {
      const queryParams = new URLSearchParams();
      if (publishedOnly) queryParams.append('published_only', publishedOnly);
      
      const url = queryParams.toString() ? 
        `${this.baseURL}/instructor/${instructorId}?${queryParams.toString()}` : 
        `${this.baseURL}/instructor/${instructorId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch instructor courses:', error);
      throw error;
    }
  }

  // Get course statistics
  async getCourseStatistics(courseId) {
    try {
      const response = await fetch(`${this.baseURL}/${courseId}/statistics`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch course statistics:', error);
      throw error;
    }
  }

  // Bulk update courses
  async bulkUpdateCourses(courseIds, updates) {
    try {
      const response = await fetch(`${this.baseURL}/bulk-update`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          course_ids: courseIds,
          updates: updates
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to bulk update courses:', error);
      throw error;
    }
  }

  // Get all course categories
  async getCourseCategories() {
    try {
      const response = await fetch(`${this.baseURL}/categories/list`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch course categories:', error);
      throw error;
    }
  }

  // Get all course levels
  async getCourseLevels() {
    try {
      const response = await fetch(`${this.baseURL}/levels/list`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch course levels:', error);
      throw error;
    }
  }

  // Enroll in a course
  async enrollInCourse(courseId, paymentData = {}) {
    try {
      const headers = this.getAuthHeaders();
      console.log('=== ENROLLMENT DEBUG ===');
      console.log('Course ID:', courseId);
      console.log('Payment data:', paymentData);
      console.log('Request headers:', headers);
      console.log('API URL:', `${API_BASE_URL}/enrollment/enroll`);
      
      const requestBody = {
        course_id: courseId,
        payment_method: paymentData.paymentMethod || 'free',
        amount_paid: paymentData.amount || 0
      };
      console.log('Request body:', requestBody);

      const response = await fetch(`${API_BASE_URL}/enrollment/enroll`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status);
      console.log('Response status text:', response.statusText);

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        try {
          const errorData = await response.json();
          console.log('Error response data:', errorData);
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
          const errorText = await response.text();
          console.log('Error response text:', errorText);
          errorMessage = errorText || errorMessage;
        }
        
        // Add specific error messages for common status codes
        if (response.status === 401) {
          errorMessage = 'Unauthorized. Please log in again.';
          console.error('Authentication failed. Check if token is valid and not expired.');
        } else if (response.status === 403) {
          errorMessage = 'Forbidden. You do not have permission to enroll in this course.';
        } else if (response.status === 404) {
          errorMessage = 'Course or enrollment endpoint not found.';
        } else if (response.status === 422) {
          errorMessage = 'Validation error: ' + errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log('Success response data:', responseData);
      return responseData;
    } catch (error) {
      console.error('Failed to enroll in course:', error);
      throw error;
    }
  }

  // Get enrolled courses for current user
  async getEnrolledCourses() {
    try {
      console.log('📚 Fetching enrolled courses from API...');
      
      // Get auth headers with debug info
      const headers = this.getAuthHeaders();
      console.log('Auth headers:', headers);
      
      // Check if we have a token
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const user = localStorage.getItem('user') || sessionStorage.getItem('user');
      const userInfo = localStorage.getItem('userInfo') || sessionStorage.getItem('userInfo');
      
      console.log('Token exists:', !!token);
      console.log('User exists:', !!user);
      console.log('UserInfo exists:', !!userInfo);
      
      if (!token) {
        console.error('❌ No authentication token found');
        throw new Error('Authentication required. Please log in.');
      }

      // Try to decode JWT token to get user_id
      let studentId;
      
      // First, try to decode the JWT token
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const decodedToken = JSON.parse(jsonPayload);
        studentId = decodedToken.user_id || decodedToken.id || decodedToken.sub;
        console.log('🎫 Decoded JWT - Student ID from token:', studentId);
        console.log('🎫 Full decoded token:', decodedToken);
      } catch (decodeError) {
        console.warn('⚠️ Could not decode JWT token:', decodeError);
      }
      
      // Fallback to localStorage user data
      if (!studentId && user) {
        try {
          const userData = JSON.parse(user);
          studentId = userData.id || userData._id || userData.student_id || userData.user_id;
          console.log('👤 Student ID from localStorage user:', studentId);
        } catch (parseError) {
          console.error('Error parsing user data:', parseError);
        }
      }
      
      // Fallback to userInfo
      if (!studentId && userInfo) {
        try {
          const userInfoData = JSON.parse(userInfo);
          studentId = userInfoData.id || userInfoData._id || userInfoData.student_id || userInfoData.user_id;
          console.log('👤 Student ID from localStorage userInfo:', studentId);
        } catch (parseError) {
          console.error('Error parsing userInfo data:', parseError);
        }
      }

      if (!studentId) {
        console.error('❌ No student ID found in token or storage');
        console.log('Storage contents:', { user, userInfo });
        throw new Error('Student ID not found. Please log in again.');
      }
      
      console.log('✅ Final Student ID to use:', studentId);
      
      // Use the new enrolled courses API endpoint
      console.log('🔍 Making request to:', `${API_BASE_URL}/enrollment/enrolled-courses/${studentId}`);
      
      const response = await fetch(`${API_BASE_URL}/enrollment/enrolled-courses/${studentId}`, {
        method: 'GET',
        headers: headers
      });

      console.log('API response status:', response.status);

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        try {
          const errorData = await response.json();
          console.log('Error response data:', errorData);
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
          const errorText = await response.text();
          console.log('Error response text:', errorText);
        }
        
        // Add specific error handling for common status codes
        if (response.status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (response.status === 403) {
          errorMessage = 'Permission denied. Please check your account status.';
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ API Response received:', data);
      
      // The new API returns array directly, so wrap it in courses object for consistency
      const courses = Array.isArray(data) ? data : (data.courses || []);
      console.log('✅ Processed enrolled courses:', courses.length, 'courses found');
      
      // Also update localStorage for offline access
      if (courses.length > 0) {
        localStorage.setItem('enrolledCourses', JSON.stringify(courses));
        console.log('💾 Updated localStorage with', courses.length, 'courses');
      }
      
      return { courses };
    } catch (error) {
      console.error('❌ Failed to fetch enrolled courses from API:', error);
      
      // Fallback to localStorage if API fails
      console.log('📦 Falling back to localStorage...');
      try {
        const localData = localStorage.getItem('enrolledCourses');
        if (localData) {
          const courses = JSON.parse(localData);
          console.log('📦 Retrieved from localStorage:', courses.length, 'courses');
          return { courses: Array.isArray(courses) ? courses : [] };
        }
      } catch (parseError) {
        console.error('❌ Error parsing localStorage data:', parseError);
      }
      
      // Return empty if both API and localStorage fail
      console.log('📭 No courses found anywhere, returning empty array');
      return { courses: [] };
    }
  }

  // Get instructor's courses for live session creation
  async getInstructorCourses() {
    try {
      // Try without authentication first since course API might be public
      const response = await fetch(`${this.baseURL}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Return courses in a format compatible with the live session component
      return {
        success: true,
        courses: data.courses || [],
        total: data.total || 0
      };
    } catch (error) {
      console.error('Failed to fetch instructor courses:', error);
      // Return error format for debugging
      return {
        success: false,
        message: error.message,
        courses: [],
        total: 0
      };
    }
  }

  // Get all courses (public endpoint)
  async getAllCourses(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Add filter parameters
      if (filters.skip !== undefined) queryParams.append('skip', filters.skip);
      if (filters.limit !== undefined) queryParams.append('limit', filters.limit);
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.level) queryParams.append('level', filters.level);
      if (filters.published !== undefined) queryParams.append('published', filters.published);

      const url = queryParams.toString() ? 
        `${this.baseURL}/?${queryParams.toString()}` : 
        `${this.baseURL}/`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch all courses:', error);
      throw error;
    }
  }

  // Get course progress for current user
  async getCourseProgress(courseId) {
    try {
      console.log(`🔍 Fetching progress for course: ${courseId}`);
      
      const response = await fetch(`${API_BASE_URL}/api/progress/course/${courseId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        // If 404 or no progress found, return default progress
        if (response.status === 404) {
          console.log(`📭 No progress found for course ${courseId}, returning default`);
          return {
            progress: 0,
            completion_percentage: 0,
            completed_modules: 0,
            total_modules: 0,
            stats: {
              total_content: 0,
              completed_content: 0,
              completion_percentage: 0
            }
          };
        }
        
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Progress data for course ${courseId}:`, data);
      
      // Return formatted progress data
      return {
        progress: data.stats?.completion_percentage || 0,
        completion_percentage: data.stats?.completion_percentage || 0,
        completed_modules: data.stats?.completed_content || 0,
        total_modules: data.stats?.total_content || 0,
        completed_content: data.stats?.completed_content || 0,
        total_content: data.stats?.total_content || 0,
        last_accessed_at: data.progress?.[0]?.updated_at || null,
        stats: data.stats || {}
      };
    } catch (error) {
      console.error(`Failed to fetch course progress for ${courseId}:`, error);
      // Return default progress instead of throwing error
      return {
        progress: 0,
        completion_percentage: 0,
        completed_modules: 0,
        total_modules: 0
      };
    }
  }

  // Get progress stats for a course
  async getCourseProgressStats(courseId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/progress/stats/${courseId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch course progress stats:', error);
      throw error;
    }
  }

  // Update progress for a content item
  async updateProgress(progressData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/progress/update`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(progressData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update progress:', error);
      throw error;
    }
  }

  // Mark content as complete
  async markContentComplete(courseId, contentId, moduleId = null, contentType = 'video') {
    try {
      const response = await fetch(`${API_BASE_URL}/api/progress/mark-complete`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          course_id: courseId,
          content_id: contentId,
          module_id: moduleId,
          content_type: contentType
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to mark content as complete:', error);
      throw error;
    }
  }

  // Alias methods for backward compatibility
  async getCategories() {
    return this.getCourseCategories();
  }

  async getLevels() {
    return this.getCourseLevels();
  }
}

// Create and export singleton instance
const courseService = new CourseService();
export { courseService };
export default courseService;
