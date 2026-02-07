import { getApiBaseUrl } from '../config/api.js';

const API_BASE_URL = getApiBaseUrl();

class UploadService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/upload`;
  }

  // Get Authorization header
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  // Upload course thumbnail
  async uploadCourseThumbnail(courseId, file, resize = true) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('resize', resize.toString());

      const response = await fetch(`${this.baseURL}/course-thumbnail/${courseId}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to upload thumbnail:', error);
      throw error;
    }
  }

  // Get course thumbnail URL
  getCourseThumbnailUrl(courseId, extension = '.jpg') {
    return `${this.baseURL}/course-thumbnail/${courseId}${extension}`;
  }

  // Delete course thumbnail
  async deleteCourseThumbnail(courseId) {
    try {
      const response = await fetch(`${this.baseURL}/course-thumbnail/${courseId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to delete thumbnail:', error);
      throw error;
    }
  }

  // List all course thumbnails
  async listCourseThumbnails() {
    try {
      const response = await fetch(`${this.baseURL}/course-thumbnails/list`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to list thumbnails:', error);
      throw error;
    }
  }

  // Validate file before upload
  validateImageFile(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please select a JPEG, PNG, WebP, or GIF image.');
    }

    if (file.size > maxSize) {
      throw new Error('File is too large. Maximum size is 5MB.');
    }

    return true;
  }

  // Create thumbnail preview
  createPreviewUrl(file) {
    return URL.createObjectURL(file);
  }

  // Clean up preview URL
  revokePreviewUrl(url) {
    URL.revokeObjectURL(url);
  }
}

// Export singleton instance
export const uploadService = new UploadService();
export default uploadService;
