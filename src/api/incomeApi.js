/**
 * Income & Expense API Service
 * Handles all API calls for Income and Expense management
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
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = {
        detail: `HTTP ${response.status}: ${response.statusText}`
      };
    }
    throw new Error(errorData.detail || errorData.message || `API Error: ${response.status}`);
  }

  return await response.json();
};

// ============ INCOME HEAD API ============

/**
 * Get all income heads
 */
export const getIncomeHeads = async () => {
  try {
    const response = await fetch(`${BASE_URL}/api/branch/income-heads`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching income heads:', error);
    throw error;
  }
};

/**
 * Create new income head
 */
export const createIncomeHead = async (headData) => {
  try {
    const response = await fetch(`${BASE_URL}/api/branch/income-heads`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(headData),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error creating income head:', error);
    throw error;
  }
};

/**
 * Update income head
 */
export const updateIncomeHead = async (id, headData) => {
  try {
    const response = await fetch(`${BASE_URL}/api/branch/income-heads/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(headData),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error updating income head:', error);
    throw error;
  }
};

/**
 * Toggle income head status
 */
export const toggleIncomeHeadStatus = async (id) => {
  try {
    const response = await fetch(`${BASE_URL}/api/branch/income-heads/${id}/toggle-status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error toggling income head status:', error);
    throw error;
  }
};

// ============ CASHIN API ============

/**
 * Get all cashin records
 */
export const getCashins = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (filters.branchId) queryParams.append('branch_id', filters.branchId);
    if (filters.headId) queryParams.append('head_id', filters.headId);
    if (filters.fromDate) queryParams.append('from_date', filters.fromDate);
    if (filters.toDate) queryParams.append('to_date', filters.toDate);

    const url = `${BASE_URL}/api/branch/cashins${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching cashins:', error);
    throw error;
  }
};

/**
 * Create new cashin record
 */
export const createCashin = async (cashinData) => {
  try {
    const response = await fetch(`${BASE_URL}/api/branch/cashins`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(cashinData),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error creating cashin:', error);
    throw error;
  }
};

/**
 * Update cashin record
 */
export const updateCashin = async (id, cashinData) => {
  try {
    const response = await fetch(`${BASE_URL}/api/branch/cashins/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(cashinData),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error updating cashin:', error);
    throw error;
  }
};

/**
 * Delete cashin record
 */
export const deleteCashin = async (id) => {
  try {
    const response = await fetch(`${BASE_URL}/api/branch/cashins/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error deleting cashin:', error);
    throw error;
  }
};
