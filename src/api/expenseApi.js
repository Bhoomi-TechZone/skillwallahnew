/**
 * Expense API Service
 * Handles all expense-related API calls
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

// ==================== Expense Heads ====================

/**
 * Get all expense heads
 */
export const getExpenseHeads = async () => {
  try {
    const response = await fetch(`${BASE_URL}/api/branch/expense-heads`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching expense heads:', error);
    throw error;
  }
};

/**
 * Create new expense head
 */
export const createExpenseHead = async (headData) => {
  try {
    const response = await fetch(`${BASE_URL}/api/branch/expense-heads`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(headData)
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error creating expense head:', error);
    throw error;
  }
};

/**
 * Update expense head
 */
export const updateExpenseHead = async (id, headData) => {
  try {
    const response = await fetch(`${BASE_URL}/api/branch/expense-heads/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(headData)
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error updating expense head:', error);
    throw error;
  }
};

/**
 * Toggle expense head status
 */
export const toggleExpenseHeadStatus = async (id) => {
  try {
    const response = await fetch(`${BASE_URL}/api/branch/expense-heads/${id}/toggle-status`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error toggling expense head status:', error);
    throw error;
  }
};

// ==================== Cashouts (Expenses) ====================

/**
 * Get all cashouts with optional filters
 */
export const getCashouts = async (filters = {}) => {
  try {
    const params = new URLSearchParams();

    if (filters.branchId) params.append('branch_id', filters.branchId);
    if (filters.headId) params.append('head_id', filters.headId);
    if (filters.fromDate) params.append('from_date', filters.fromDate);
    if (filters.toDate) params.append('to_date', filters.toDate);

    const queryString = params.toString();
    const url = queryString ? `${BASE_URL}/api/branch/cashouts?${queryString}` : `${BASE_URL}/api/branch/cashouts`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching cashouts:', error);
    throw error;
  }
};

/**
 * Create new cashout
 */
export const createCashout = async (cashoutData) => {
  try {
    const response = await fetch(`${BASE_URL}/api/branch/cashouts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(cashoutData)
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error creating cashout:', error);
    throw error;
  }
};

/**
 * Update cashout
 */
export const updateCashout = async (id, cashoutData) => {
  try {
    const response = await fetch(`${BASE_URL}/api/branch/cashouts/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(cashoutData)
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error updating cashout:', error);
    throw error;
  }
};

/**
 * Delete cashout
 */
export const deleteCashout = async (id) => {
  try {
    const response = await fetch(`${BASE_URL}/api/branch/cashouts/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error deleting cashout:', error);
    throw error;
  }
};

export default {
  getExpenseHeads,
  createExpenseHead,
  updateExpenseHead,
  toggleExpenseHeadStatus,
  getCashouts,
  createCashout,
  updateCashout,
  deleteCashout
};
