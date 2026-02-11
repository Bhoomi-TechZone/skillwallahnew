// API endpoints for live classes
const API_BASE_URL = 'http://localhost:4000';

// Get authentication token
const getAuthToken = () => {
  // Try to get token from various sources
  const token = localStorage.getItem('token') ||
    localStorage.getItem('adminToken') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('instructorToken') ||
    localStorage.getItem('studentToken');

  return token || '';
};

/**
 * Fetch live sessions that are currently active for students
 * @returns {Promise} Promise resolving to live sessions array
 */
export const fetchLiveSessions = async () => {
  try {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/live-sessions/student/live-now`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Error fetching live sessions:', error);
    // Return empty array as fallback
    return [];
  }
};

/**
 * Generate token for joining a live session
 * @param {string} sessionId - Session ID to join
 * @returns {Promise} Promise resolving to session token data
 */
export const generateSessionToken = async (sessionId) => {
  try {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/live-sessions/generate-token/${sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Error generating session token:', error);
    throw error;
  }
};