import { getApiBaseUrl } from '../config/api.js';

const API_BASE_URL = getApiBaseUrl();

class ModuleService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/courses`;
  }

  // Get Authorization header
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  // Create a new module for a course
  async createModule(courseId, moduleData) {
    try {
      const response = await fetch(`${this.baseURL}/${courseId}/modules`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(moduleData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create module:', error);
      throw error;
    }
  }

  // Get all modules for a course
  async getModulesForCourse(courseId) {
    try {
      const response = await fetch(`${this.baseURL}/${courseId}/modules`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch modules for course:', error);
      throw error;
    }
  }

  // Get module by ID
  async getModuleById(moduleId) {
    try {
      const response = await fetch(`${this.baseURL}/modules/${moduleId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch module:', error);
      throw error;
    }
  }

  // Update module
  async updateModule(moduleId, updateData) {
    try {
      const response = await fetch(`${this.baseURL}/modules/${moduleId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update module:', error);
      throw error;
    }
  }

  // Delete module
  async deleteModule(moduleId) {
    try {
      const response = await fetch(`${this.baseURL}/modules/${moduleId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to delete module:', error);
      throw error;
    }
  }

  // Reorder modules in a course
  async reorderModules(courseId, moduleOrder) {
    try {
      const response = await fetch(`${this.baseURL}/${courseId}/modules/reorder`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ module_order: moduleOrder })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to reorder modules:', error);
      throw error;
    }
  }

  // Mark module as completed (student)
  async markModuleComplete(moduleId) {
    try {
      const response = await fetch(`${this.baseURL}/modules/${moduleId}/complete`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to mark module as complete:', error);
      throw error;
    }
  }

  // Get module progress for student
  async getModuleProgress(moduleId, studentId = null) {
    try {
      const url = studentId ? 
        `${this.baseURL}/modules/${moduleId}/progress/${studentId}` :
        `${this.baseURL}/modules/${moduleId}/progress`;

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
      console.error('Failed to fetch module progress:', error);
      throw error;
    }
  }

  // Get course progress (all modules)
  async getCourseProgress(courseId, studentId = null) {
    try {
      const url = studentId ? 
        `${this.baseURL}/${courseId}/progress/${studentId}` :
        `${this.baseURL}/${courseId}/progress`;

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
      console.error('Failed to fetch course progress:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const moduleService = new ModuleService();
export default moduleService;
