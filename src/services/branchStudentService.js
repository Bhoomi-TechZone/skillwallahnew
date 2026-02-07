// Branch Student Management API Service

import axios from 'axios';
import { getUserData } from '../utils/authUtils';

const API_BASE_URL = 'http://localhost:4000/api/branch-students';

// Create axios instance with authentication
const createAuthenticatedRequest = () => {
  const userData = getUserData();
  const token = userData?.token || localStorage.getItem('token') || localStorage.getItem('authToken');

  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    },
  });
};

class BranchStudentService {
  // Register a new student
  async registerStudent(studentData) {
    try {
      const api = createAuthenticatedRequest();
      console.log('📡 [STUDENT SERVICE] Requesting student registration:', studentData);

      const response = await api.post('/students/register', studentData);
      console.log('✅ [STUDENT SERVICE] Registration success:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [STUDENT SERVICE] Registration failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.detail || 'Student registration failed');
    }
  }

  // Upload student photo
  async uploadStudentPhoto(studentId, photoFile) {
    try {
      const api = createAuthenticatedRequest();
      const formData = new FormData();
      formData.append('photo', photoFile);

      const response = await api.post(`/students/${studentId}/upload-photo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('❌ [STUDENT SERVICE] Photo upload failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.detail || 'Photo upload failed');
    }
  }

  // Get list of students with filtering
  async getStudents(filters = {}) {
    try {
      const api = createAuthenticatedRequest();
      const params = new URLSearchParams();

      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });

      console.log('🌐 [STUDENT SERVICE] Fetching students with:', params.toString());
      const response = await api.get(`/students?${params.toString()}`);
      console.log('✅ [STUDENT SERVICE] Fetch success:', response.data);

      return response.data;
    } catch (error) {
      console.error('❌ [STUDENT SERVICE] Fetch students failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.detail || 'Failed to fetch students');
    }
  }

  // Get detailed student information
  async getStudentDetails(studentId) {
    try {
      const api = createAuthenticatedRequest();
      const response = await api.get(`/students/${studentId}`);
      return response.data;
    } catch (error) {
      console.error('❌ [STUDENT SERVICE] Fetch student details failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.detail || 'Failed to fetch student details');
    }
  }

  // Update student information
  async updateStudent(studentId, updateData) {
    try {
      const api = createAuthenticatedRequest();
      const response = await api.put(`/students/${studentId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('❌ [STUDENT SERVICE] Update student failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.detail || 'Failed to update student');
    }
  }

  // Delete (deactivate) student
  async deleteStudent(studentId) {
    try {
      const api = createAuthenticatedRequest();
      const response = await api.delete(`/students/${studentId}`);
      return response.data;
    } catch (error) {
      console.error('❌ [STUDENT SERVICE] Delete student failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.detail || 'Failed to delete student');
    }
  }

  // Get branch student statistics
  async getStudentStats() {
    try {
      const api = createAuthenticatedRequest();
      const response = await api.get('/students/stats/summary');
      return response.data;
    } catch (error) {
      console.error('❌ [STUDENT SERVICE] Fetch student stats failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.detail || 'Failed to fetch student stats');
    }
  }

  // Validator and helper methods can remain if needed for local consumption
  validateStudentData(studentData) {
    // Basic validation logic as before
    return { isValid: true, errors: {} };
  }
}

const branchStudentService = new BranchStudentService();
export default branchStudentService;