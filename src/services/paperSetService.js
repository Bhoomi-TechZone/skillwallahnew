import axios from 'axios';
import { getUserData } from '../utils/authUtils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

// Create axios instance with authentication
const createAuthenticatedRequest = () => {
  const userData = getUserData();
  const token = userData?.token || localStorage.getItem('token') || localStorage.getItem('adminToken');

  return axios.create({
    baseURL: `${API_BASE_URL}/api/branch-paper-sets`,
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    },
  });
};

export const paperSetService = {
  // Get all paper sets for the branch
  async getPaperSets(filters = {}) {
    try {
      const api = createAuthenticatedRequest();
      const params = new URLSearchParams();

      // Get branch_code from user data
      const userData = getUserData();
      const branchCode = userData?.branch_code || userData?.franchise_code;

      if (branchCode) {
        params.append('branch_code', branchCode);
      }

      if (filters.status) params.append('status', filters.status);
      if (filters.course_id) params.append('course_id', filters.course_id);

      const url = `/paper-sets?${params.toString()}`;
      console.log('📡 [PAPER SET SERVICE] Fetching paper sets from:', url);

      const response = await api.get(url);
      console.log('✅ [PAPER SET SERVICE] Received response:', response.data);
      console.log('✅ [PAPER SET SERVICE] Response data type:', typeof response.data);
      console.log('✅ [PAPER SET SERVICE] Response data.data:', response.data?.data);

      return {
        success: true,
        data: response.data?.data || response.data || []
      };
    } catch (error) {
      console.error('❌ [PAPER SET SERVICE] Error fetching paper sets:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch paper sets',
        data: []
      };
    }
  },

  // Create new paper set
  async createPaperSet(paperSetData) {
    try {
      const api = createAuthenticatedRequest();
      console.log('📝 [PAPER SET SERVICE] Creating paper set:', paperSetData);

      const response = await api.post('/paper-sets', paperSetData);
      console.log('✅ [PAPER SET SERVICE] Paper set created:', response.data);

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ [PAPER SET SERVICE] Error creating paper set:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to create paper set'
      };
    }
  },

  // Update existing paper set
  async updatePaperSet(paperSetId, paperSetData) {
    try {
      const api = createAuthenticatedRequest();
      console.log('📝 [PAPER SET SERVICE] Updating paper set:', paperSetId, paperSetData);

      const response = await api.put(`/paper-sets/${paperSetId}`, paperSetData);
      console.log('✅ [PAPER SET SERVICE] Paper set updated:', response.data);

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ [PAPER SET SERVICE] Error updating paper set:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to update paper set'
      };
    }
  },

  // Delete paper set
  async deletePaperSet(paperSetId) {
    try {
      const api = createAuthenticatedRequest();
      console.log('🗑️ [PAPER SET SERVICE] Deleting paper set:', paperSetId);

      await api.delete(`/paper-sets/${paperSetId}`);
      console.log('✅ [PAPER SET SERVICE] Paper set deleted successfully');

      return {
        success: true
      };
    } catch (error) {
      console.error('❌ [PAPER SET SERVICE] Error deleting paper set:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to delete paper set'
      };
    }
  },

  // Get single paper set by ID
  async getPaperSet(paperSetId) {
    try {
      const api = createAuthenticatedRequest();
      console.log('🔍 [PAPER SET SERVICE] Fetching paper set:', paperSetId);

      const response = await api.get(`/paper-sets/${paperSetId}`);
      console.log('✅ [PAPER SET SERVICE] Paper set fetched:', response.data);

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ [PAPER SET SERVICE] Error fetching paper set:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch paper set'
      };
    }
  }
};

export default paperSetService;