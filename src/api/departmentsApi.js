/**
 * Departments API Service
 * Handles all API calls for Department management functionality
 */

const BASE_URL = 'http://localhost:4000';

// Helper function to get authentication headers
const getAuthHeaders = () => {
  let token = localStorage.getItem('adminToken') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('token') ||
    localStorage.getItem('jwt');

  if (!token || token === 'null' || token === 'undefined') {
    throw new Error('No authentication token found. Please login again.');
  }

  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
};

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP ${response.status}`;

    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.detail || errorData.message || errorMessage;
    } catch (e) {
      errorMessage = errorText || errorMessage;
    }

    throw new Error(errorMessage);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }

  return await response.text();
};

const DEPARTMENT_API_BASE = '/instructor/departments';

export const departmentsApi = {
  // Get all departments for the current branch
  getDepartments: async () => {
    try {
      const response = await fetch(`${BASE_URL}${DEPARTMENT_API_BASE}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      const data = await handleResponse(response);
      console.log('Departments API response:', data);
      return data;
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      throw error;
    }
  },

  // Create a new department
  createDepartment: async (departmentData) => {
    try {
      const response = await fetch(`${BASE_URL}${DEPARTMENT_API_BASE}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(departmentData),
      });

      const data = await handleResponse(response);
      console.log('Create department response:', data);
      return data;
    } catch (error) {
      console.error('Failed to create department:', error);
      throw error;
    }
  },

  // Update a department
  updateDepartment: async (departmentId, departmentData) => {
    try {
      const response = await fetch(`${BASE_URL}${DEPARTMENT_API_BASE}/${departmentId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(departmentData),
      });

      const data = await handleResponse(response);
      console.log('Update department response:', data);
      return data;
    } catch (error) {
      console.error('Failed to update department:', error);
      throw error;
    }
  },

  // Delete a department
  deleteDepartment: async (departmentId) => {
    try {
      const response = await fetch(`${BASE_URL}${DEPARTMENT_API_BASE}/${departmentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await handleResponse(response);
      console.log('Delete department response:', data);
      return data;
    } catch (error) {
      console.error('Failed to delete department:', error);
      throw error;
    }
  },

  // Toggle department status
  toggleDepartmentStatus: async (departmentId) => {
    try {
      const response = await fetch(`${BASE_URL}${DEPARTMENT_API_BASE}/${departmentId}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });

      const data = await handleResponse(response);
      console.log('Toggle department status response:', data);
      return data;
    } catch (error) {
      console.error('Failed to toggle department status:', error);
      throw error;
    }
  }
};

export default departmentsApi;