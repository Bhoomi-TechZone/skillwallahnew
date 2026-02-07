import axios from 'axios';
import { getUserData } from '../utils/authUtils';

const API_BASE_URL = 'http://localhost:4000/api/branch-programs';

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

export const branchProgramService = {
  // Get all programs
  async getPrograms(filters = {}) {
    try {
      const api = createAuthenticatedRequest();
      const params = new URLSearchParams();

      if (filters.program_type) params.append('program_type', filters.program_type);
      if (filters.status) params.append('status', filters.status);

      const response = await api.get(`/programs?${params.toString()}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching programs:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch programs'
      };
    }
  },

  // Get single program
  async getProgram(programId) {
    try {
      const api = createAuthenticatedRequest();
      const response = await api.get(`/programs/${programId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching program:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch program'
      };
    }
  },

  // Create new program
  async createProgram(programData) {
    try {
      const api = createAuthenticatedRequest();

      // Generate program code if not provided
      if (!programData.program_code) {
        programData.program_code = programData.program_name
          .toUpperCase()
          .replace(/\s+/g, '_')
          .substring(0, 10);
      }

      const response = await api.post('/programs', programData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error creating program:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to create program'
      };
    }
  },

  // Update program
  async updateProgram(programId, programData) {
    try {
      const api = createAuthenticatedRequest();
      const response = await api.put(`/programs/${programId}`, programData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error updating program:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to update program'
      };
    }
  },

  // Delete program
  async deleteProgram(programId) {
    try {
      const api = createAuthenticatedRequest();
      await api.delete(`/programs/${programId}`);
      return {
        success: true
      };
    } catch (error) {
      console.error('Error deleting program:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to delete program'
      };
    }
  }
};