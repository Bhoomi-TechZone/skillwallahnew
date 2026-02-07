// API endpoints for student progress management
const API_BASE_URL = 'http://localhost:4000';

/**
 * Get detailed progress information for a specific student
 * @param {string} studentId - The ID of the student
 * @returns {Promise<Object>} Student progress details
 */
export const getStudentProgressDetails = async (studentId) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/instructor/students/${studentId}/progress`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching student progress details:', error);
    throw error;
  }
};

/**
 * Get all students enrolled in instructor's courses
 * @returns {Promise<Array>} List of students
 */
export const getInstructorStudents = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/instructor/students`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching instructor students:', error);
    throw error;
  }
};

/**
 * Get student progress for a specific course
 * @param {string} studentId - The ID of the student
 * @param {string} courseId - The ID of the course
 * @returns {Promise<Object>} Student progress for the course
 */
export const getStudentCourseProgress = async (studentId, courseId) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/instructor/students/${studentId}/progress?course_id=${courseId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching student course progress:', error);
    throw error;
  }
};

export default {
  getStudentProgressDetails,
  getInstructorStudents,
  getStudentCourseProgress
};
