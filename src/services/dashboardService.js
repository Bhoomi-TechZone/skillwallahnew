import { getApiBaseUrl } from '../config/api.js';

const API_BASE_URL = getApiBaseUrl();

class DashboardService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/dashboard`;
    this.adminBaseURL = `${API_BASE_URL}/admin`;
  }

  // Get Authorization header
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  // Get general dashboard data (for authenticated user)
  async getDashboard() {
    try {
      const response = await fetch(`${this.baseURL}/`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      throw error;
    }
  }

  // Get specific student dashboard (admin/teacher access)
  async getStudentDashboard(studentId) {
    try {
      const response = await fetch(`${this.baseURL}/${studentId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch student dashboard:', error);
      throw error;
    }
  }

  // Get my enrolled courses
  async getMyCourses() {
    try {
      const response = await fetch(`${this.baseURL}/my-courses`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch my courses:', error);
      throw error;
    }
  }

  // Admin Dashboard APIs
  
  // Get admin dashboard stats
  async getAdminStats() {
    try {
      const response = await fetch(`${this.adminBaseURL}/dashboard/stats`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
      throw error;
    }
  }

  // Get popular instructors
  async getPopularInstructors() {
    try {
      const response = await fetch(`${this.adminBaseURL}/dashboard/popular-instructors`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch popular instructors:', error);
      throw error;
    }
  }

  // Get transactions data
  async getTransactions() {
    try {
      const response = await fetch(`${API_BASE_URL}/transaction`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      throw error;
    }
  }

  // Get analytics data
  async getAnalytics(period = 'week') {
    try {
      const response = await fetch(`${this.adminBaseURL}/dashboard/analytics?period=${period}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      throw error;
    }
  }

  // Get admin profile
  async getAdminProfile() {
    try {
      const response = await fetch(`${this.adminBaseURL}/profile`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch admin profile:', error);
      throw error;
    }
  }

  // Update admin profile
  async updateAdminProfile(profileData) {
    try {
      const response = await fetch(`${this.adminBaseURL}/profile`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update admin profile:', error);
      throw error;
    }
  }

  // Get all users (admin)
  async getAllUsers() {
    try {
      const response = await fetch(`${this.adminBaseURL}/users`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch all users:', error);
      throw error;
    }
  }

  // Get students (admin)
  async getAdminStudents() {
    try {
      const response = await fetch(`${this.adminBaseURL}/users/student`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch admin students:', error);
      throw error;
    }
  }

  // Get instructors (admin)
  async getAdminInstructors() {
    try {
      const response = await fetch(`${this.adminBaseURL}/users/instructor`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch admin instructors:', error);
      throw error;
    }
  }

  // Update user (admin)
  async updateUser(userId, userData) {
    try {
      const response = await fetch(`${this.adminBaseURL}/users/${userId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  }

  // Delete user (admin)
  async deleteUser(userId) {
    try {
      const response = await fetch(`${this.adminBaseURL}/users/${userId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to delete user:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const dashboardService = new DashboardService();
export default dashboardService;
