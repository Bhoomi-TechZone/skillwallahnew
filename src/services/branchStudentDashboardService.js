// Branch Student Dashboard Service for handling branch-based student data

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

class BranchStudentDashboardService {

  /**
   * Get branch student dashboard data
   */
  async getDashboardData() {
    try {
      console.log('📊 [BranchStudentService] Fetching branch student dashboard data...');

      const api = createAuthenticatedRequest();
      const response = await api.get('/api/branch-students/dashboard');

      console.log('✅ [BranchStudentService] Dashboard data retrieved:', response.data);

      return {
        success: true,
        data: response.data.data,
        message: response.data.message,
        branch_info: response.data.data.student_info
      };

    } catch (error) {
      console.error('❌ [BranchStudentService] Dashboard data fetch error:', error);

      if (error.response?.status === 403) {
        throw new Error('Access denied: Branch student access required');
      }

      throw new Error(error.response?.data?.detail || 'Failed to fetch dashboard data');
    }
  }

  /**
   * Get enrolled courses for branch student
   */
  async getEnrolledCourses() {
    try {
      console.log('📚 [BranchStudentService] Fetching branch student courses...');

      const api = createAuthenticatedRequest();
      const response = await api.get('/api/branch-students/courses');

      console.log('✅ [BranchStudentService] Courses retrieved:', response.data);

      return {
        success: true,
        courses: response.data.courses,
        total: response.data.total,
        branch_info: response.data.branch_info
      };

    } catch (error) {
      console.error('❌ [BranchStudentService] Courses fetch error:', error);
      throw new Error(error.response?.data?.detail || 'Failed to fetch courses');
    }
  }

  /**
   * Get assignments for branch student
   */
  async getAssignments() {
    try {
      console.log('📝 [BranchStudentService] Fetching branch student assignments...');

      const api = createAuthenticatedRequest();
      const response = await api.get('/api/branch-students/assignments');

      console.log('✅ [BranchStudentService] Assignments retrieved:', response.data);

      return {
        success: true,
        assignments: response.data.assignments,
        total: response.data.total,
        branch_info: response.data.branch_info
      };

    } catch (error) {
      console.error('❌ [BranchStudentService] Assignments fetch error:', error);
      throw new Error(error.response?.data?.detail || 'Failed to fetch assignments');
    }
  }

  /**
   * Get quizzes for branch student
   */
  async getQuizzes() {
    try {
      console.log('❓ [BranchStudentService] Fetching branch student quizzes...');

      const api = createAuthenticatedRequest();
      const response = await api.get('/api/branch-students/quizzes');

      console.log('✅ [BranchStudentService] Quizzes retrieved:', response.data);

      return {
        success: true,
        quizzes: response.data.quizzes,
        total: response.data.total,
        branch_info: response.data.branch_info
      };

    } catch (error) {
      console.error('❌ [BranchStudentService] Quizzes fetch error:', error);
      throw new Error(error.response?.data?.detail || 'Failed to fetch quizzes');
    }
  }

  /**
   * Get study materials for branch student
   */
  async getStudyMaterials() {
    try {
      console.log('📖 [BranchStudentService] Fetching branch study materials...');

      const api = createAuthenticatedRequest();
      const response = await api.get('/api/branch-students/study-materials');

      console.log('✅ [BranchStudentService] Study materials retrieved:', response.data);

      return {
        success: true,
        study_materials: response.data.study_materials,
        total: response.data.total,
        branch_info: response.data.branch_info
      };

    } catch (error) {
      console.error('❌ [BranchStudentService] Study materials fetch error:', error);
      throw new Error(error.response?.data?.detail || 'Failed to fetch study materials');
    }
  }

  /**
   * Get video classes for branch student
   */
  async getVideoClasses() {
    try {
      console.log('🎥 [BranchStudentService] Fetching branch video classes...');

      const api = createAuthenticatedRequest();
      const response = await api.get('/api/branch-students/video-classes');

      console.log('✅ [BranchStudentService] Video classes retrieved:', response.data);

      return {
        success: true,
        video_classes: response.data.video_classes,
        total: response.data.total,
        branch_info: response.data.branch_info
      };

    } catch (error) {
      console.error('❌ [BranchStudentService] Video classes fetch error:', error);
      throw new Error(error.response?.data?.detail || 'Failed to fetch video classes');
    }
  }

  /**
   * Get paper sets (assessments) for branch student
   */
  async getPaperSets() {
    try {
      console.log('📄 [BranchStudentService] Fetching branch paper sets...');

      const api = createAuthenticatedRequest();
      const response = await api.get('/api/branch-paper-sets/paper-sets');

      console.log('✅ [BranchStudentService] Paper sets retrieved:', response.data);

      return {
        success: true,
        paper_sets: response.data.paper_sets || [],
        total: response.data.total || 0
      };

    } catch (error) {
      console.error('❌ [BranchStudentService] Paper sets fetch error:', error);
      throw new Error(error.response?.data?.detail || 'Failed to fetch paper sets');
    }
  }

  /**
   * Get questions for a specific paper set
   */
  async getQuestions(paperSetId = null, page = 1, limit = 100) {
    try {
      console.log('❓ [BranchStudentService] Fetching questions...');

      const api = createAuthenticatedRequest();
      const params = { page, limit };
      if (paperSetId) {
        params.paper_set_id = paperSetId;
      }

      const response = await api.get('/api/questions/', { params });

      console.log('✅ [BranchStudentService] Questions retrieved:', response.data);

      return {
        success: true,
        questions: response.data.questions || [],
        total: response.data.total || 0,
        page: response.data.page || 1
      };

    } catch (error) {
      console.error('❌ [BranchStudentService] Questions fetch error:', error);
      throw new Error(error.response?.data?.detail || 'Failed to fetch questions');
    }
  }

  /**
   * Submit paper set attempt
   */
  async submitPaperSetAttempt(paperSetId, answers, timeTaken) {
    try {
      console.log('📤 [BranchStudentService] Submitting paper set attempt...');

      const api = createAuthenticatedRequest();
      const response = await api.post('/api/branch-paper-sets/submit', {
        paper_set_id: paperSetId,
        answers: answers,
        time_taken: timeTaken,
        completed_at: new Date().toISOString()
      });

      console.log('✅ [BranchStudentService] Paper set attempt submitted:', response.data);

      return {
        success: true,
        result: response.data
      };

    } catch (error) {
      console.error('❌ [BranchStudentService] Paper set submission error:', error);
      throw new Error(error.response?.data?.detail || 'Failed to submit paper set');
    }
  }

  /**
   * Get profile data for branch student
   */
  async getProfile() {
    try {
      console.log('👤 [BranchStudentService] Fetching branch student profile...');

      const api = createAuthenticatedRequest();
      const response = await api.get('/api/branch-students/profile');

      console.log('✅ [BranchStudentService] Profile retrieved:', response.data);

      return {
        success: true,
        profile: response.data.data,
        message: response.data.message
      };

    } catch (error) {
      console.error('❌ [BranchStudentService] Profile fetch error:', error);
      throw new Error(error.response?.data?.detail || 'Failed to fetch profile');
    }
  }

  /**
   * Check if current user is a branch student
   */
  isBranchStudent() {
    try {
      const userData = getUserData();
      return userData?.is_branch_student === true && userData?.branch_code;
    } catch (error) {
      console.error('❌ [BranchStudentService] Error checking branch student status:', error);
      return false;
    }
  }

  /**
   * Get branch information for current user
   */
  getBranchInfo() {
    try {
      const userData = getUserData();
      return {
        branch_code: userData?.branch_code,
        franchise_code: userData?.franchise_code,
        is_branch_student: userData?.is_branch_student,
        student_name: userData?.name
      };
    } catch (error) {
      console.error('❌ [BranchStudentService] Error getting branch info:', error);
      return null;
    }
  }

  /**
   * Get comprehensive student statistics
   */
  async getStudentStatistics() {
    try {
      console.log('📈 [BranchStudentService] Fetching comprehensive student statistics...');

      const [dashboardData, assignments, quizzes] = await Promise.all([
        this.getDashboardData(),
        this.getAssignments(),
        this.getQuizzes()
      ]);

      const stats = dashboardData.data.statistics;
      const assignmentStats = {
        total: assignments.total,
        completed: assignments.assignments.filter(a => a.status === 'Submitted').length,
        pending: assignments.assignments.filter(a => a.status === 'Pending').length
      };

      const quizStats = {
        total: quizzes.total,
        completed: quizzes.quizzes.filter(q => q.status === 'Completed').length,
        available: quizzes.quizzes.filter(q => q.status === 'Available').length
      };

      return {
        success: true,
        statistics: {
          ...stats,
          assignment_details: assignmentStats,
          quiz_details: quizStats
        },
        branch_info: dashboardData.branch_info
      };

    } catch (error) {
      console.error('❌ [BranchStudentService] Statistics fetch error:', error);
      throw new Error('Failed to fetch comprehensive statistics');
    }
  }

  /**
   * Refresh all student data
   */
  async refreshAllData() {
    try {
      console.log('🔄 [BranchStudentService] Refreshing all branch student data...');

      const [dashboard, courses, assignments, quizzes, materials, videos] = await Promise.all([
        this.getDashboardData(),
        this.getEnrolledCourses(),
        this.getAssignments(),
        this.getQuizzes(),
        this.getStudyMaterials(),
        this.getVideoClasses()
      ]);

      console.log('✅ [BranchStudentService] All data refreshed successfully');

      return {
        success: true,
        dashboard: dashboard.data,
        courses: courses.courses,
        assignments: assignments.assignments,
        quizzes: quizzes.quizzes,
        study_materials: materials.study_materials,
        video_classes: videos.video_classes
      };

    } catch (error) {
      console.error('❌ [BranchStudentService] Data refresh error:', error);
      throw new Error('Failed to refresh student data');
    }
  }

  /**
   * Get live sessions for branch student
   */
  async getLiveSessions() {
    try {
      console.log('🔴 [BranchStudentService] Fetching branch live sessions...');

      const api = createAuthenticatedRequest();
      const response = await api.get('/api/live-sessions/student/live-now');

      console.log('✅ [BranchStudentService] Live sessions retrieved:', response.data);

      return {
        success: true,
        sessions: response.data || []
      };

    } catch (error) {
      console.error('❌ [BranchStudentService] Live sessions fetch error:', error);
      // Return empty array as fallback
      return {
        success: true,
        sessions: []
      };
    }
  }
}

// Export singleton instance
const branchStudentDashboardService = new BranchStudentDashboardService();
export default branchStudentDashboardService;