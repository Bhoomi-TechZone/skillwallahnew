// Branch Student Content Service - Programs, Courses, Subjects

import axios from 'axios';
import { getUserData } from '../utils/authUtils';

const API_BASE_URL = 'http://localhost:4000';

// Create axios instance with authentication
const createAuthenticatedRequest = () => {
  const userData = getUserData();
  const token = userData?.token || localStorage.getItem('token') || localStorage.getItem('access_token');

  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    },
  });
};

class BranchStudentContentService {

  /**
   * Get all programs for branch student
   */
  async getPrograms() {
    try {
      console.log('📚 [ContentService] Fetching programs...');

      const api = createAuthenticatedRequest();
      const response = await api.get('/api/branch-programs');

      console.log('✅ [ContentService] Programs retrieved:', response.data);

      return {
        success: true,
        programs: response.data.programs || [],
        total: response.data.total || 0
      };

    } catch (error) {
      console.error('❌ [ContentService] Programs fetch error:', error);
      return {
        success: false,
        programs: [],
        total: 0,
        error: error.response?.data?.detail || 'Failed to fetch programs'
      };
    }
  }

  /**
   * Get all courses for branch student
   */
  async getCourses(programId = null) {
    try {
      console.log('📖 [ContentService] Fetching courses...');

      const api = createAuthenticatedRequest();
      const url = programId
        ? `/api/branch-courses?program_id=${programId}`
        : '/api/branch-courses';

      const response = await api.get(url);

      console.log('✅ [ContentService] Courses retrieved:', response.data);

      return {
        success: true,
        courses: response.data.courses || [],
        total: response.data.total || 0
      };

    } catch (error) {
      console.error('❌ [ContentService] Courses fetch error:', error);
      return {
        success: false,
        courses: [],
        total: 0,
        error: error.response?.data?.detail || 'Failed to fetch courses'
      };
    }
  }

  /**
   * Get all subjects for branch student
   */
  async getSubjects(courseId = null) {
    try {
      console.log('📝 [ContentService] Fetching subjects...');

      const api = createAuthenticatedRequest();
      const url = courseId
        ? `/api/branch-subjects?course_id=${courseId}`
        : '/api/branch-subjects';

      const response = await api.get(url);

      console.log('✅ [ContentService] Subjects retrieved:', response.data);

      return {
        success: true,
        subjects: response.data.subjects || [],
        total: response.data.total || 0
      };

    } catch (error) {
      console.error('❌ [ContentService] Subjects fetch error:', error);
      return {
        success: false,
        subjects: [],
        total: 0,
        error: error.response?.data?.detail || 'Failed to fetch subjects'
      };
    }
  }

  /**
   * Get all content (programs, courses, subjects) in one call
   */
  async getAllContent() {
    try {
      console.log('🔄 [ContentService] Fetching all content...');

      const [programs, courses, subjects] = await Promise.all([
        this.getPrograms(),
        this.getCourses(),
        this.getSubjects()
      ]);

      console.log('✅ [ContentService] All content fetched successfully');

      return {
        success: true,
        programs: programs.programs,
        courses: courses.courses,
        subjects: subjects.subjects,
        totals: {
          programs: programs.total,
          courses: courses.total,
          subjects: subjects.total
        }
      };

    } catch (error) {
      console.error('❌ [ContentService] All content fetch error:', error);
      return {
        success: false,
        programs: [],
        courses: [],
        subjects: [],
        error: 'Failed to fetch all content'
      };
    }
  }

  /**
   * Get program by ID
   */
  async getProgramById(programId) {
    try {
      const api = createAuthenticatedRequest();
      const response = await api.get(`/api/branch-programs/${programId}`);

      return {
        success: true,
        program: response.data.program
      };
    } catch (error) {
      console.error('❌ [ContentService] Program fetch error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch program'
      };
    }
  }

  /**
   * Get course by ID
   */
  async getCourseById(courseId) {
    try {
      const api = createAuthenticatedRequest();
      const response = await api.get(`/api/branch-courses/${courseId}`);

      return {
        success: true,
        course: response.data.course
      };
    } catch (error) {
      console.error('❌ [ContentService] Course fetch error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch course'
      };
    }
  }

  /**
   * Get subject by ID
   */
  async getSubjectById(subjectId) {
    try {
      const api = createAuthenticatedRequest();
      const response = await api.get(`/api/branch-subjects/${subjectId}`);

      return {
        success: true,
        subject: response.data.subject
      };
    } catch (error) {
      console.error('❌ [ContentService] Subject fetch error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch subject'
      };
    }
  }
}

// Export singleton instance
const branchStudentContentService = new BranchStudentContentService();
export default branchStudentContentService;
