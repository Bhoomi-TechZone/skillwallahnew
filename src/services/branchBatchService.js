import axios from 'axios';
import { getUserData } from '../utils/authUtils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

// Create axios instance with authentication
const createAuthenticatedRequest = () => {
  const userData = getUserData();
  const token = userData?.token || localStorage.getItem('token') || localStorage.getItem('adminToken');

  console.log('🔐 [BranchBatchService] Token details:', {
    userData: userData ? 'exists' : 'null',
    userToken: userData?.token ? 'exists' : 'null',
    localStorageToken: localStorage.getItem('token') ? 'exists' : 'null',
    adminToken: localStorage.getItem('adminToken') ? 'exists' : 'null',
    finalToken: token ? 'exists' : 'null'
  });

  if (!token) {
    console.error('🚫 [BranchBatchService] No authentication token found!');
    throw new Error('Authentication token not found. Please login again.');
  }

  return axios.create({
    baseURL: `${API_BASE_URL}/api/branch-batches`,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
};

export const branchBatchService = {
  // Get all batches
  async getBatches(filters = {}) {
    try {
      const api = createAuthenticatedRequest();
      const params = new URLSearchParams();

      if (filters.program_id) params.append('program_id', filters.program_id);
      if (filters.course_id) params.append('course_id', filters.course_id);
      if (filters.subject_id) params.append('subject_id', filters.subject_id);
      if (filters.instructor_id) params.append('instructor_id', filters.instructor_id);
      if (filters.status) params.append('status', filters.status);

      const response = await api.get(`/batches?${params.toString()}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching batches:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch batches'
      };
    }
  },

  // Get single batch
  async getBatch(batchId) {
    try {
      const api = createAuthenticatedRequest();
      const response = await api.get(`/batches/${batchId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching batch:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch batch'
      };
    }
  },

  // Create new batch
  async createBatch(batchData) {
    try {
      const api = createAuthenticatedRequest();

      // Generate batch code if not provided
      if (!batchData.batch_code) {
        batchData.batch_code = batchData.batch_name
          .toUpperCase()
          .replace(/\s+/g, '_')
          .substring(0, 8);
      }

      // Map frontend fields to backend fields
      const mappedData = {
        batch_name: batchData.batch_name || batchData.batchName,
        batch_code: batchData.batch_code,
        program_id: batchData.program_id,
        course_id: batchData.course_id,
        subject_id: batchData.subject_id,
        instructor_name: batchData.instructor || batchData.instructor_name,
        start_date: batchData.start_date || batchData.startDate,
        end_date: batchData.end_date || batchData.endDate,
        max_capacity: parseInt(batchData.max_capacity || batchData.maxCapacity) || 30,
        current_enrollment: parseInt(batchData.current_enrollment || batchData.students) || 0,
        status: batchData.status || 'active',
        timing: batchData.timing || '',
        days_of_week: batchData.days_of_week || '',
        fee: parseFloat(batchData.fee) || 0.0
      };

      const response = await api.post('/batches', mappedData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error creating batch:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to create batch'
      };
    }
  },

  // Update batch
  async updateBatch(batchId, batchData) {
    try {
      const api = createAuthenticatedRequest();

      // Map frontend fields to backend fields
      const mappedData = {};
      if (batchData.batch_name || batchData.batchName) mappedData.batch_name = batchData.batch_name || batchData.batchName;
      if (batchData.instructor || batchData.instructor_name) mappedData.instructor_name = batchData.instructor || batchData.instructor_name;
      if (batchData.start_date || batchData.startDate) mappedData.start_date = batchData.start_date || batchData.startDate;
      if (batchData.end_date || batchData.endDate) mappedData.end_date = batchData.end_date || batchData.endDate;
      if (batchData.max_capacity || batchData.maxCapacity) mappedData.max_capacity = parseInt(batchData.max_capacity || batchData.maxCapacity);
      if (batchData.status) mappedData.status = batchData.status;
      if (batchData.timing) mappedData.timing = batchData.timing;
      if (batchData.days_of_week) mappedData.days_of_week = batchData.days_of_week;
      if (batchData.fee !== undefined) mappedData.fee = parseFloat(batchData.fee) || 0.0;

      const response = await api.put(`/batches/${batchId}`, mappedData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error updating batch:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to update batch'
      };
    }
  },

  // Delete batch
  async deleteBatch(batchId) {
    try {
      const api = createAuthenticatedRequest();
      await api.delete(`/batches/${batchId}`);
      return {
        success: true
      };
    } catch (error) {
      console.error('Error deleting batch:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to delete batch'
      };
    }
  },

  // Helper function to format batch data for frontend display
  formatBatchForDisplay(batch) {
    return {
      id: batch.id,
      batchName: batch.batch_name,
      batchCode: batch.batch_code,
      programName: batch.program_name || 'N/A',
      courseName: batch.course_name || 'N/A',
      subjectName: batch.subject_name || 'N/A',
      instructor: batch.instructor_name || 'N/A',
      startDate: batch.start_date,
      endDate: batch.end_date,
      timing: batch.timing || 'N/A',
      daysOfWeek: batch.days_of_week || 'N/A',
      maxCapacity: batch.max_capacity,
      students: batch.total_students || batch.current_enrollment || 0,
      availableSeats: batch.available_seats,
      status: batch.status,
      fee: batch.fee || 0,
      createdAt: batch.created_at,
      updatedAt: batch.updated_at
    };
  }
};