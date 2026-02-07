// Comprehensive API Integration Service
// This file exports all API services for easy frontend integration

// Import all individual services
import authService from './authService.js';
import { courseService } from './courseService.js';
import { userService } from './userService.js';
import { assignmentService } from './assignmentService.js';
import { moduleService } from './moduleService.js';
import { quizService } from './quizService.js';
import { dashboardService } from './dashboardService.js';
import { certificateService } from './certificateService.js';
import { notificationService } from './notificationService.js';
import { noticeService } from './noticeService.js';
import { learningPathService } from './learningPathService.js';
import { supportService } from './supportService.js';

// Export all services as named exports for individual use
export {
  authService,
  courseService,
  userService,
  assignmentService,
  moduleService,
  quizService,
  dashboardService,
  certificateService,
  notificationService,
  noticeService,
  learningPathService,
  supportService
};

// Main API integration class that provides access to all services
class APIIntegrationService {
  constructor() {
    this.auth = authService;
    this.courses = courseService;
    this.users = userService;
    this.assignments = assignmentService;
    this.modules = moduleService;
    this.quizzes = quizService;
    this.dashboard = dashboardService;
    this.certificates = certificateService;
    this.notifications = notificationService;
    this.notices = noticeService;
    this.learningPaths = learningPathService;
    this.support = supportService;
  }

  // Health check for all services
  async healthCheck() {
    try {
      const results = await Promise.allSettled([
        this.auth.healthCheck?.() || Promise.resolve({ service: 'auth', status: 'available' }),
        this.dashboard.getDashboard?.() || Promise.resolve({ service: 'dashboard', status: 'available' })
      ]);

      return {
        overall: 'healthy',
        services: results.map((result, index) => ({
          service: ['auth', 'dashboard'][index],
          status: result.status === 'fulfilled' ? 'healthy' : 'error',
          detail: result.status === 'fulfilled' ? result.value : result.reason
        }))
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        overall: 'error',
        error: error.message
      };
    }
  }

  // Bulk operations
  async bulkOperations() {
    return {
      // User management
      users: {
        createMultiple: async (usersData) => {
          const results = await Promise.allSettled(
            usersData.map(userData => this.auth.register(userData))
          );
          return results;
        },
        
        updateMultiple: async (updates) => {
          const results = await Promise.allSettled(
            updates.map(({ userId, data }) => this.users.updateUser(userId, data))
          );
          return results;
        }
      },

      // Course management
      courses: {
        createMultiple: async (coursesData) => {
          const results = await Promise.allSettled(
            coursesData.map(courseData => this.courses.createCourse(courseData))
          );
          return results;
        },

        bulkUpdate: async (updates) => {
          return await this.courses.bulkUpdateCourses(updates);
        }
      },

      // Notifications
      notifications: {
        sendBulk: async (notificationData) => {
          return await this.notifications.sendBulkNotifications(notificationData);
        }
      },

      // Certificates
      certificates: {
        issueBulk: async (certificatesData) => {
          return await this.certificates.bulkIssueCertificates(certificatesData);
        }
      }
    };
  }

  // Analytics and reporting
  async getAnalytics() {
    try {
      const [
        dashboardStats,
        learningPathStats,
        notificationStats,
        certificateStats
      ] = await Promise.allSettled([
        this.dashboard.getAdminStats(),
        this.learningPaths.getStatistics(),
        this.notifications.getNotificationStats(),
        this.certificates.getCertificateStats()
      ]);

      return {
        dashboard: dashboardStats.status === 'fulfilled' ? dashboardStats.value : null,
        learningPaths: learningPathStats.status === 'fulfilled' ? learningPathStats.value : null,
        notifications: notificationStats.status === 'fulfilled' ? notificationStats.value : null,
        certificates: certificateStats.status === 'fulfilled' ? certificateStats.value : null
      };
    } catch (error) {
      console.error('Analytics fetch failed:', error);
      throw error;
    }
  }

  // Search across all services
  async globalSearch(query) {
    try {
      const searchPromises = [
        this.courses.getCourses({ search: query }).catch(() => []),
        this.learningPaths.searchLearningPaths(query).catch(() => []),
        this.notices.searchNotices(query).catch(() => ({ notices: [] })),
        this.users.getUsers().then(users => 
          users.filter(user => 
            user.name?.toLowerCase().includes(query.toLowerCase()) ||
            user.email?.toLowerCase().includes(query.toLowerCase())
          )
        ).catch(() => [])
      ];

      const [courses, learningPaths, notices, users] = await Promise.all(searchPromises);

      return {
        courses: courses.courses || courses,
        learningPaths: learningPaths.learning_paths || learningPaths,
        notices: notices.notices || [],
        users
      };
    } catch (error) {
      console.error('Global search failed:', error);
      throw error;
    }
  }

  // Quick actions for common operations
  quickActions() {
    return {
      // Student quick actions
      student: {
        enrollInCourse: async (courseId) => {
          return await this.courses.enrollInCourse(courseId);
        },
        
        submitAssignment: async (assignmentData) => {
          return await this.assignments.submitAssignment(assignmentData);
        },
        
        takeQuiz: async (quizId) => {
          return await this.quizzes.startQuizAttempt(quizId);
        }
      },

      // Instructor quick actions
      instructor: {
        createCourse: async (courseData) => {
          return await this.courses.createCourse(courseData);
        },
        
        createAssignment: async (assignmentData) => {
          return await this.assignments.createAssignment(assignmentData);
        },
        
        postNotice: async (noticeData) => {
          return await this.notices.createNotice(noticeData);
        }
      },

      // Admin quick actions
      admin: {
        createUser: async (userData) => {
          return await this.auth.register(userData);
        },
        
        toggleUserStatus: async (userId) => {
          return await this.users.toggleUserStatus(userId);
        },
        
        issueCertificate: async (certificateData) => {
          return await this.certificates.issueCertificate(certificateData);
        },
        
        sendNotification: async (notificationData) => {
          return await this.notifications.createAdminNotification(notificationData);
        }
      }
    };
  }

  // Data synchronization
  async syncData() {
    try {
      // This would be used for offline/online synchronization
      const syncResults = {
        timestamp: new Date().toISOString(),
        status: 'completed',
        synced: []
      };

      // Add sync logic here as needed
      console.log('Data sync completed:', syncResults);
      return syncResults;
    } catch (error) {
      console.error('Data sync failed:', error);
      throw error;
    }
  }
}

// Export the main API integration service
export const apiIntegration = new APIIntegrationService();
export default apiIntegration;

// Utility functions for API integration
export const apiUtils = {
  // Format error messages consistently
  formatError: (error) => {
    if (error.response?.data?.detail) {
      return error.response.data.detail;
    }
    if (error.message) {
      return error.message;
    }
    return 'An unexpected error occurred';
  },

  // Handle API responses consistently
  handleResponse: async (response) => {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  },

  // Build query parameters
  buildQueryParams: (params) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });
    return queryParams.toString();
  },

  // Validate required fields
  validateRequired: (data, requiredFields) => {
    const missingFields = requiredFields.filter(field => !data[field]);
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
  },

  // Format date for API
  formatDate: (date) => {
    if (!date) return null;
    if (typeof date === 'string') return date;
    return date.toISOString();
  }
};
