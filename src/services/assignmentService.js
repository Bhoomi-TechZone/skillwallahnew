import { getApiBaseUrl } from '../config/api.js';

const API_BASE_URL = getApiBaseUrl();

class AssignmentService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/assignments`;
  }

  // Get Authorization header
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  // Get multipart headers for file uploads
  getMultipartHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Authorization': token ? `Bearer ${token}` : ''
      // Note: Don't set Content-Type for FormData, browser will set it automatically
    };
  }

  // Create a new assignment
  async createAssignment(assignmentData) {
    try {
      const formData = new FormData();
      
      // Append text fields
      formData.append('title', assignmentData.title);
      formData.append('course_id', assignmentData.course_id);
      
      if (assignmentData.description) {
        formData.append('description', assignmentData.description);
      }
      
      if (assignmentData.due_date) {
        formData.append('due_date', assignmentData.due_date);
      }
      
      // Append file if provided
      if (assignmentData.questions_pdf) {
        formData.append('questions_pdf', assignmentData.questions_pdf);
      }

      const response = await fetch(`${this.baseURL}/`, {
        method: 'POST',
        headers: this.getMultipartHeaders(),
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create assignment:', error);
      throw error;
    }
  }

  // Get assignments for a specific course
  async getAssignmentsForCourse(courseId) {
    try {
      if (!courseId || courseId === 'undefined') {
        throw new Error('Invalid courseId provided to getAssignmentsForCourse');
      }
      const response = await fetch(`${this.baseURL}/course/${courseId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch assignments for course:', error);
      throw error;
    }
  }

  // Get assignment by ID
  async getAssignmentById(assignmentId) {
    try {
      const response = await fetch(`${this.baseURL}/${assignmentId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch assignment:', error);
      throw error;
    }
  }

  // Update assignment
  async updateAssignment(assignmentId, updateData) {
    try {
      const response = await fetch(`${this.baseURL}/${assignmentId}`, {
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
      console.error('Failed to update assignment:', error);
      throw error;
    }
  }

  // Delete assignment
  async deleteAssignment(assignmentId) {
    try {
      const response = await fetch(`${this.baseURL}/${assignmentId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to delete assignment:', error);
      throw error;
    }
  }

  // Download assignment PDF
  async downloadAssignmentPDF(assignmentId) {
    try {
      const response = await fetch(`${this.baseURL}/${assignmentId}/pdf`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Return the blob for download
      return await response.blob();
    } catch (error) {
      console.error('Failed to download assignment PDF:', error);
      throw error;
    }
  }

  // Submit assignment (student)
  async submitAssignment(submissionData) {
    try {
      const formData = new FormData();
      
      // Append text fields
      formData.append('assignment_id', submissionData.assignment_id);
      
      if (submissionData.text_answer) {
        formData.append('text_answer', submissionData.text_answer);
      }
      
      // Append file if provided
      if (submissionData.submission_file) {
        formData.append('submission_file', submissionData.submission_file);
      }

      const response = await fetch(`${API_BASE_URL}/submissions/submit`, {
        method: 'POST',
        headers: this.getMultipartHeaders(),
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to submit assignment:', error);
      throw error;
    }
  }

  // Get submissions for assignment (instructor/admin)
  async getSubmissionsForAssignment(assignmentId) {
    try {
      const response = await fetch(`${API_BASE_URL}/submissions/assignment/${assignmentId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch submissions for assignment:', error);
      throw error;
    }
  }

  // Get my submissions (student)
  async getMySubmissions() {
    try {
      const response = await fetch(`${API_BASE_URL}/submissions/my-submissions`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch my submissions:', error);
      throw error;
    }
  }

  // Grade submission (instructor/admin)
  async gradeSubmission(submissionId, gradeData) {
    try {
      const response = await fetch(`${API_BASE_URL}/submissions/${submissionId}/grade`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(gradeData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to grade submission:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const assignmentService = new AssignmentService();
export default assignmentService;
