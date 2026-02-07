const API_BASE_URL = 'http://localhost:4000';

/**
 * Submit a partnership request to the backend
 * @param {Object} data - Partnership form data
 * @returns {Promise<Object>} Response from the backend
 */
export const submitPartnershipRequest = async (data) => {
  try {
    const response = await fetch(`${API_BASE_URL}/partnership_requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),

    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error submitting partnership request:', error);
    throw error;
  }
};
