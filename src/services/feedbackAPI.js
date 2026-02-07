// API service for feedback endpoints
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL_LOCAL || 'http://localhost:4000';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export const feedbackAPI = {
  // Get all feedback for a user
  async getUserFeedback(userId, status = null) {
    try {
      const url = status
        ? `${API_BASE_URL}/feedback/user/${userId}?status=${status}`
        : `${API_BASE_URL}/feedback/user/${userId}`;

      const response = await fetch(url, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch user feedback');
      return await response.json();
    } catch (error) {
      console.error('Error fetching user feedback:', error);
      throw error;
    }
  },

  // Get feedback statistics for a user
  async getUserFeedbackStats(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/feedback/stats/user/${userId}`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch feedback stats');
      return await response.json();
    } catch (error) {
      console.error('Error fetching feedback stats:', error);
      throw error;
    }
  },

  // Submit new feedback
  async submitFeedback(feedbackData) {
    try {
      console.log('Submitting feedback to:', `${API_BASE_URL}/feedback/`);
      console.log('Feedback data:', feedbackData);

      const response = await fetch(`${API_BASE_URL}/feedback/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(feedbackData)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        try {
          const errorData = await response.json();
          console.error('API error response:', errorData);

          if (errorData.detail) {
            // Handle FastAPI validation errors
            if (Array.isArray(errorData.detail)) {
              const validationErrors = errorData.detail.map(err =>
                `${err.loc ? err.loc.join('.') : 'field'}: ${err.msg}`
              ).join(', ');
              errorMessage = `Validation errors: ${validationErrors}`;
            } else {
              errorMessage = errorData.detail;
            }
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          const textError = await response.text();
          console.error('Failed to parse error response:', parseError);
          console.error('Raw error response:', textError);
          errorMessage += ` - ${textError}`;
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Feedback submission successful:', result);
      return result;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  },

  // Alias for submitFeedback
  async createFeedback(feedbackData) {
    return this.submitFeedback(feedbackData);
  },

  // Update existing feedback (for pending feedback)
  async updateFeedback(feedbackId, updateData) {
    try {
      const response = await fetch(`${API_BASE_URL}/feedback/${feedbackId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updateData)
      });

      if (!response.ok) throw new Error('Failed to update feedback');
      return await response.json();
    } catch (error) {
      console.error('Error updating feedback:', error);
      throw error;
    }
  },

  // Get feedback analytics
  async getFeedbackAnalytics(instructorId = null, courseId = null) {
    try {
      const params = new URLSearchParams();
      if (instructorId) params.append('instructor_id', instructorId);
      if (courseId) params.append('course_id', courseId);

      const url = `${API_BASE_URL}/feedback/analytics${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url, {
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error('Failed to fetch analytics');
      return await response.json();
    } catch (error) {
      console.error('Error fetching feedback analytics:', error);
      throw error;
    }
  },

  // Get feedback for a specific instructor
  async getInstructorFeedback(instructorId, courseId = null) {
    try {
      const params = new URLSearchParams();
      if (courseId) params.append('course_id', courseId);

      const url = `${API_BASE_URL}/feedback/instructor/${instructorId}${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url, {
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error('Failed to fetch instructor feedback');
      return await response.json();
    } catch (error) {
      console.error('Error fetching instructor feedback:', error);
      throw error;
    }
  },

  // Submit instructor response to feedback
  async submitInstructorResponse(feedbackId, instructorId, response) {
    try {
      const apiResponse = await fetch(`${API_BASE_URL}/feedback/${feedbackId}/response`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          feedback_id: feedbackId, // Required by backend schema
          instructor_id: instructorId,
          response: response
        })
      });

      if (!apiResponse.ok) throw new Error('Failed to submit instructor response');
      return await apiResponse.json();
    } catch (error) {
      console.error('Error submitting instructor response:', error);
      throw error;
    }
  },

  // Get all feedback (admin only)
  async getAllFeedback() {
    try {
      const response = await fetch(`${API_BASE_URL}/feedback/`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch all feedback');
      return await response.json();
    } catch (error) {
      console.error('Error fetching all feedback:', error);
      throw error;
    }
  }
};

// Helper function to transform API data to match UI format
export const transformFeedbackData = (apiFeedback) => {
  return {
    id: apiFeedback.id,
    type: apiFeedback.target_type,
    title: apiFeedback.target_title,
    instructor: apiFeedback.instructor_name,
    course: apiFeedback.course_name,
    status: apiFeedback.status,
    dueDate: apiFeedback.due_date,
    completedDate: apiFeedback.completed_date,
    attendedDate: apiFeedback.attended_date,
    submittedDate: apiFeedback.submitted_date,
    rating: apiFeedback.rating,
    comment: apiFeedback.comment,
    categories: apiFeedback.categories || [],
    categoryRatings: apiFeedback.category_ratings || {},
    instructorResponse: apiFeedback.instructor_response,
    createdDate: apiFeedback.created_date,
    updatedDate: apiFeedback.updated_date
  };
};

// Helper function to transform UI data to API format
export const transformToAPIFormat = (uiFeedback, userId) => {
  return {
    user_id: userId,
    target_type: uiFeedback.type,
    target_id: uiFeedback.target_id || uiFeedback.id,
    target_title: uiFeedback.title,
    instructor_id: uiFeedback.instructor_id,
    instructor_name: uiFeedback.instructor,
    course_id: uiFeedback.course_id,
    course_name: uiFeedback.course,
    rating: uiFeedback.rating,
    comment: uiFeedback.comment,
    categories: uiFeedback.categories,
    category_ratings: uiFeedback.categoryRatings,
    completed_date: uiFeedback.completedDate,
    attended_date: uiFeedback.attendedDate,
    submitted_date: uiFeedback.submittedDate
  };
};
