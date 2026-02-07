import { getApiBaseUrl } from '../config/api.js';

const API_BASE_URL = getApiBaseUrl();

class NoticeService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/notices`;
  }

  // Get Authorization header
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  // Get all notices
  async getNotices(skip = 0, limit = 50) {
    try {
      const response = await fetch(`${this.baseURL}?skip=${skip}&limit=${limit}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch notices:', error);
      throw error;
    }
  }

  // Get a specific notice by ID
  async getNoticeById(noticeId) {
    try {
      const response = await fetch(`${this.baseURL}/${noticeId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch notice:', error);
      throw error;
    }
  }

  // Create a new notice
  async createNotice(noticeData) {
    try {
      const response = await fetch(`${this.baseURL}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(noticeData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to create notice:', error);
      throw error;
    }
  }

  // Update a notice
  async updateNotice(noticeId, updateData) {
    try {
      const response = await fetch(`${this.baseURL}/${noticeId}`, {
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
      console.error('Failed to update notice:', error);
      throw error;
    }
  }

  // Delete a notice
  async deleteNotice(noticeId) {
    try {
      const response = await fetch(`${this.baseURL}/${noticeId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to delete notice:', error);
      throw error;
    }
  }

  // Get notices by category
  async getNoticesByCategory(category, skip = 0, limit = 50) {
    try {
      const response = await fetch(`${this.baseURL}/category/${category}?skip=${skip}&limit=${limit}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch notices by category:', error);
      throw error;
    }
  }

  // Get active notices (not expired)
  async getActiveNotices(skip = 0, limit = 50) {
    try {
      const response = await fetch(`${this.baseURL}/active?skip=${skip}&limit=${limit}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch active notices:', error);
      throw error;
    }
  }

  // Pin/unpin a notice
  async toggleNoticePin(noticeId) {
    try {
      const response = await fetch(`${this.baseURL}/${noticeId}/pin`, {
        method: 'PUT',
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to toggle notice pin:', error);
      throw error;
    }
  }

  // Get pinned notices
  async getPinnedNotices() {
    try {
      const response = await fetch(`${this.baseURL}/pinned`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch pinned notices:', error);
      throw error;
    }
  }

  // Search notices
  async searchNotices(query, skip = 0, limit = 50) {
    try {
      const response = await fetch(`${this.baseURL}/search?q=${encodeURIComponent(query)}&skip=${skip}&limit=${limit}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to search notices:', error);
      throw error;
    }
  }

  // Get notice statistics
  async getNoticeStats() {
    try {
      const response = await fetch(`${this.baseURL}/stats`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch notice stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const noticeService = new NoticeService();
export default noticeService;
