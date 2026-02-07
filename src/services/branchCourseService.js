import axios from 'axios';
import { getUserData } from '../utils/authUtils';

const API_BASE_URL = 'http://localhost:4000/api/branch-courses';

// Create axios instance with authentication
const createAuthenticatedRequest = () => {
  const userData = getUserData();
  const token = userData?.token || localStorage.getItem('token');

  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
};

export const branchCourseService = {
  // Get all courses
  async getCourses(filters = {}) {
    try {
      const api = createAuthenticatedRequest();
      const params = new URLSearchParams();

      // Get branch_code from user data
      const userData = getUserData();
      const branchCode = userData?.branch_code;

      console.log('🔍 [COURSE SERVICE] User data:', userData);
      console.log('🔍 [COURSE SERVICE] Branch code:', branchCode);

      // Add branch_code to filters if available
      if (branchCode) {
        params.append('branch_code', branchCode);
        console.log('✅ [COURSE SERVICE] Adding branch_code to request:', branchCode);
      }

      if (filters.program_id) params.append('program_id', filters.program_id);
      if (filters.status) params.append('status', filters.status);

      const url = `/courses?${params.toString()}`;
      console.log('📡 [COURSE SERVICE] Fetching courses from:', url);

      const response = await api.get(url);

      console.log('✅ [COURSE SERVICE] Received response:', response.data);

      // Map backend response to frontend format
      const mappedData = (response.data || []).map(course => ({
        id: course.id,
        course_name: course.course_name,
        course_category: course.category || course.program_name || 'Uncategorized',
        program_id: course.program_id,
        program_name: course.program_name,
        course_fee: course.fee || 0,
        duration_hours: course.duration_months ? course.duration_months * 720 : 0, // Convert months to hours
        max_students: course.max_students,
        is_active: course.status === 'active',
        course_description: course.description || '',
        instructor_name: course.instructor_name || 'TBD',
        course_level: 'Beginner', // Default since not in backend
        enrolled_students: course.enrolled_students || 0
      }));

      console.log('✅ [COURSE SERVICE] Mapped data:', mappedData);

      return {
        success: true,
        data: mappedData
      };
    } catch (error) {
      console.error('❌ [COURSE SERVICE] Error fetching courses:', error);
      console.error('❌ [COURSE SERVICE] Error response:', error.response?.data);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch courses'
      };
    }
  },

  // Get single course
  async getCourse(courseId) {
    try {
      const api = createAuthenticatedRequest();
      const response = await api.get(`/courses/${courseId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching course:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch course'
      };
    }
  },

  // Create new course
  async createCourse(courseData) {
    try {
      const api = createAuthenticatedRequest();

      // Map frontend form data to backend API format
      const mappedData = {
        course_name: courseData.course_name,
        course_code: courseData.course_code || courseData.course_name
          ?.toUpperCase()
          .replace(/\s+/g, '_')
          .substring(0, 10) || 'COURSE_001',
        category: courseData.course_category || '',
        description: courseData.course_description || '',
        duration_months: courseData.duration_hours ? Math.ceil(courseData.duration_hours / 720) : 6, // Convert hours to months (assuming 720 hours = 1 year)
        fee: parseFloat(courseData.course_fee) || 0,
        admission_fee: parseFloat(courseData.admission_fee) || 0,
        syllabus_outline: courseData.course_description || '',
        prerequisites: courseData.prerequisites || '',
        max_students: parseInt(courseData.max_students) || 50,
        status: courseData.is_active ? 'active' : 'inactive',
        program_id: courseData.program_id || null // Use the actual program_id from the form
      };

      console.log('Mapped course data:', mappedData);

      const response = await api.post('/courses', mappedData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error creating course:', error);
      console.error('Error response:', error.response?.data);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to create course'
      };
    }
  },

  // Update course
  async updateCourse(courseId, courseData) {
    try {
      const api = createAuthenticatedRequest();

      console.log('🔄 [UPDATE COURSE] Starting update for course:', courseId);
      console.log('🔄 [UPDATE COURSE] Input data:', courseData);

      // Map frontend form data to backend API format
      const mappedData = {};

      if (courseData.course_name) mappedData.course_name = courseData.course_name;
      if (courseData.course_category) mappedData.category = courseData.course_category;
      if (courseData.course_description) mappedData.description = courseData.course_description;
      if (courseData.duration_hours) mappedData.duration_months = Math.ceil(courseData.duration_hours / 720);
      if (courseData.course_fee !== undefined) mappedData.fee = parseFloat(courseData.course_fee);
      if (courseData.max_students !== undefined) mappedData.max_students = parseInt(courseData.max_students);
      if (courseData.is_active !== undefined) mappedData.status = courseData.is_active ? 'active' : 'inactive';

      console.log('🔄 [UPDATE COURSE] Mapped data:', mappedData);

      const response = await api.put(`/courses/${courseId}`, mappedData);

      console.log('✅ [UPDATE COURSE] Update successful:', response.data);

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ [UPDATE COURSE] Error updating course:', error);
      console.error('❌ [UPDATE COURSE] Error response:', error.response?.data);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to update course'
      };
    }
  },

  // Delete course
  async deleteCourse(courseId) {
    try {
      const api = createAuthenticatedRequest();

      console.log('🗑️ [DELETE COURSE SERVICE] Deleting course:', courseId);

      const response = await api.delete(`/courses/${courseId}`);

      console.log('✅ [DELETE COURSE SERVICE] Delete successful:', response.data);

      return {
        success: true,
        message: response.data?.message || 'Course deleted successfully',
        data: response.data
      };
    } catch (error) {
      console.error('❌ [DELETE COURSE SERVICE] Error deleting course:', error);
      console.error('❌ [DELETE COURSE SERVICE] Error response:', error.response?.data);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to delete course'
      };
    }
  },

  // Helper function to format duration for display
  formatDuration(durationMonths) {
    if (!durationMonths) return 'N/A';
    if (durationMonths >= 12) {
      const years = Math.floor(durationMonths / 12);
      const months = durationMonths % 12;
      if (months === 0) {
        return `${years} Year${years > 1 ? 's' : ''}`;
      } else {
        return `${years}Y ${months}M`;
      }
    }
    return `${durationMonths} Month${durationMonths > 1 ? 's' : ''}`;
  }
};