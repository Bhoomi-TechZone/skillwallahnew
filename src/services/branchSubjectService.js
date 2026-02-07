import axios from 'axios';
import { getUserData } from '../utils/authUtils';

const API_BASE_URL = 'http://localhost:4000/api/branch-subjects';

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

export const branchSubjectService = {
  // Get all subjects
  async getSubjects(filters = {}) {
    try {
      const api = createAuthenticatedRequest();
      const params = new URLSearchParams();

      // Get branch_code from user data
      const userData = getUserData();
      const branchCode = userData?.branch_code;

      console.log('🔍 [SUBJECT SERVICE] User data:', userData);
      console.log('🔍 [SUBJECT SERVICE] Branch code:', branchCode);

      // Add branch_code to filters if available
      if (branchCode) {
        params.append('branch_code', branchCode);
        console.log('✅ [SUBJECT SERVICE] Adding branch_code to request:', branchCode);
      }

      if (filters.program_id) params.append('program_id', filters.program_id);
      if (filters.course_id) params.append('course_id', filters.course_id);
      if (filters.semester) params.append('semester', filters.semester);
      if (filters.subject_type) params.append('subject_type', filters.subject_type);
      if (filters.status) params.append('status', filters.status);

      const url = `/subjects?${params.toString()}`;
      console.log('📡 [SUBJECT SERVICE] Fetching subjects from:', url);

      const response = await api.get(url);

      console.log('✅ [SUBJECT SERVICE] Received response:', response.data);

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ [SUBJECT SERVICE] Error fetching subjects:', error);
      console.error('❌ [SUBJECT SERVICE] Error response:', error.response?.data);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch subjects'
      };
    }
  },

  // Get single subject
  async getSubject(subjectId) {
    try {
      const api = createAuthenticatedRequest();

      console.log('🔍 [SUBJECT SERVICE] Fetching subject:', subjectId);

      const response = await api.get(`/subjects/${subjectId}`);

      console.log('✅ [SUBJECT SERVICE] Subject fetched:', response.data);

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ [SUBJECT SERVICE] Error fetching subject:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch subject'
      };
    }
  },

  // Create new subject
  async createSubject(subjectData) {
    try {
      const api = createAuthenticatedRequest();

      console.log('➕ [SUBJECT SERVICE] Creating subject:', subjectData);

      // Map frontend fields to backend fields
      const backendData = {
        subject_name: subjectData.subject_name,
        subject_code: subjectData.subject_code || subjectData.subject_name
          .toUpperCase()
          .replace(/\s+/g, '_')
          .substring(0, 8),
        // Only include program_id and course_id if they are valid ObjectId-like strings (24 chars)
        ...(subjectData.program_id && subjectData.program_id.length === 24 ? { program_id: subjectData.program_id } : {}),
        ...(subjectData.course_id && subjectData.course_id.length === 24 ? { course_id: subjectData.course_id } : {}),
        semester: subjectData.semester ? parseInt(subjectData.semester) : null,
        credits: subjectData.credits ? parseInt(subjectData.credits) : null,
        subject_type: subjectData.subject_type || "theory",
        description: subjectData.description || "",
        status: subjectData.status || (subjectData.is_active ? "active" : "inactive"),
        // Include marks fields if provided
        ...(subjectData.theory_marks ? { theory_marks: parseInt(subjectData.theory_marks) } : {}),
        ...(subjectData.practical_marks ? { practical_marks: parseInt(subjectData.practical_marks) } : {})
      };

      console.log('📤 [SUBJECT SERVICE] Mapped data:', backendData);

      const response = await api.post('/subjects', backendData);

      console.log('✅ [SUBJECT SERVICE] Subject created:', response.data);

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ [SUBJECT SERVICE] Error creating subject:', error);
      console.error('❌ [SUBJECT SERVICE] Error response:', error.response?.data);
      console.error('❌ [SUBJECT SERVICE] Error message:', error.message);

      // Extract more detailed error information
      let errorMessage = 'Failed to create subject';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  },

  // Update subject
  async updateSubject(subjectId, subjectData) {
    try {
      const api = createAuthenticatedRequest();

      console.log('🔄 [SUBJECT SERVICE] Updating subject:', subjectId);
      console.log('🔄 [SUBJECT SERVICE] Update data:', subjectData);

      // Map frontend fields to backend fields
      const backendData = {
        subject_name: subjectData.subject_name,
        subject_code: subjectData.subject_code,
        // Only include program_id and course_id if they are valid ObjectId-like strings (24 chars)
        ...(subjectData.program_id && subjectData.program_id.length === 24 ? { program_id: subjectData.program_id } : {}),
        ...(subjectData.course_id && subjectData.course_id.length === 24 ? { course_id: subjectData.course_id } : {}),
        semester: subjectData.semester ? parseInt(subjectData.semester) : null,
        credits: subjectData.credits ? parseInt(subjectData.credits) : null,
        subject_type: subjectData.subject_type || "theory",
        description: subjectData.description || "",
        status: subjectData.status || (subjectData.is_active ? "active" : "inactive"),
        // Include marks fields if provided
        ...(subjectData.theory_marks ? { theory_marks: parseInt(subjectData.theory_marks) } : {}),
        ...(subjectData.practical_marks ? { practical_marks: parseInt(subjectData.practical_marks) } : {})
      };

      console.log('📤 [SUBJECT SERVICE] Mapped data:', backendData);

      const response = await api.put(`/subjects/${subjectId}`, backendData);

      console.log('✅ [SUBJECT SERVICE] Subject updated:', response.data);

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ [SUBJECT SERVICE] Error updating subject:', error);
      console.error('❌ [SUBJECT SERVICE] Error response:', error.response?.data);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to update subject'
      };
    }
  },

  // Delete subject
  async deleteSubject(subjectId) {
    try {
      const api = createAuthenticatedRequest();

      console.log('🗑️ [SUBJECT SERVICE] Deleting subject:', subjectId);

      const response = await api.delete(`/subjects/${subjectId}`);

      console.log('✅ [SUBJECT SERVICE] Subject deleted:', response.data);

      return {
        success: true,
        message: response.data?.message || 'Subject deleted successfully',
        data: response.data
      };
    } catch (error) {
      console.error('❌ [SUBJECT SERVICE] Error deleting subject:', error);
      console.error('❌ [SUBJECT SERVICE] Error response:', error.response?.data);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to delete subject'
      };
    }
  }
};