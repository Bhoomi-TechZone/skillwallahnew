// Exam Results API Service
import { API_BASE_URL } from '../config/api.js';

export const examResultsApi = {
  // Get all results with optional filters
  async getResults(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.student_id) queryParams.append('student_id', filters.student_id);
      if (filters.paper_id) queryParams.append('paper_id', filters.paper_id);
      if (filters.exam_schedule_id) queryParams.append('exam_schedule_id', filters.exam_schedule_id);
      if (filters.status) queryParams.append('status', filters.status);
      
      const url = `${API_BASE_URL}/api/branch-results/results?${queryParams.toString()}`;
      console.log('🔍 Fetching exam results from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Exam results fetched successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Error fetching exam results:', error);
      throw error;
    }
  },

  // Get a single result by ID
  async getResult(resultId) {
    try {
      const url = `${API_BASE_URL}/api/branch-results/results/${resultId}`;
      console.log('🔍 Fetching exam result:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Exam result fetched successfully:', data);
      // Handle both direct data and wrapped response
      return data.data || data;
    } catch (error) {
      console.error('❌ Error fetching exam result:', error);
      throw error;
    }
  },

  // Delete a result
  async deleteResult(resultId) {
    try {
      const url = `${API_BASE_URL}/api/branch-results/results/${resultId}`;
      console.log('🗑️ Deleting exam result:', url);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Exam result deleted successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Error deleting exam result:', error);
      throw error;
    }
  },

  // Download solution for a result
  async downloadSolution(resultId) {
    try {
      const url = `${API_BASE_URL}/api/branch-assessments/results/${resultId}/solution`;
      console.log('📥 Downloading solution for result:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Solution downloaded successfully:', data);
      
      // Create and download the file
      if (data.solution) {
        const blob = new Blob([JSON.stringify(data.solution, null, 2)], {
          type: 'application/json'
        });
        
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = data.download_filename || 'solution.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }
      
      return data;
    } catch (error) {
      console.error('❌ Error downloading solution:', error);
      throw error;
    }
  },

  // Get results summary statistics
  async getResultsSummary() {
    try {
      const url = `${API_BASE_URL}/api/branch-assessments/results/stats/summary`;
      console.log('📊 Fetching results summary:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Results summary fetched successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Error fetching results summary:', error);
      throw error;
    }
  },

  // Get filter options
  async getFilterOptions() {
    try {
      const url = `${API_BASE_URL}/api/branch-assessments/results/filter/options`;
      console.log('🔍 Fetching filter options:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Filter options fetched successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Error fetching filter options:', error);
      throw error;
    }
  },

  // Create a new result
  async createResult(resultData) {
    try {
      const url = `${API_BASE_URL}/api/branch-assessments/results`;
      console.log('➕ Creating exam result:', url, resultData);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(resultData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Exam result created successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Error creating exam result:', error);
      throw error;
    }
  }
};