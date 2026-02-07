// API service for feedback endpoints
// API service for feedback endpoints
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL_LOCAL || 'http://localhost:4000';

class FeedbackService {
  // Helper method for making API calls
  async makeRequest(url, options = {}) {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Get user's feedback (all, pending, or completed)
  async getUserFeedback(userId, status = null) {
    const url = status
      ? `${API_BASE_URL}/feedback/user/${userId}?status=${status}`
      : `${API_BASE_URL}/feedback/user/${userId}`;

    return this.makeRequest(url);
  }

  // Get user's feedback statistics
  async getUserFeedbackStats(userId) {
    return this.makeRequest(`${API_BASE_URL}/feedback/stats/user/${userId}`);
  }

  // Submit new feedback
  async submitFeedback(feedbackData) {
    return this.makeRequest(`${API_BASE_URL}/feedback/`, {
      method: 'POST',
      body: JSON.stringify(feedbackData),
    });
  }

  // Update existing feedback (for pending feedback)
  async updateFeedback(feedbackId, updateData) {
    return this.makeRequest(`${API_BASE_URL}/feedback/${feedbackId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  // Get feedback analytics
  async getFeedbackAnalytics(instructorId = null, courseId = null) {
    let url = `${API_BASE_URL}/feedback/analytics`;
    const params = new URLSearchParams();

    if (instructorId) params.append('instructor_id', instructorId);
    if (courseId) params.append('course_id', courseId);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return this.makeRequest(url);
  }

  // Get course feedback summary
  async getCourseFeedbackSummary(courseId) {
    if (!courseId || courseId === 'undefined') {
      throw new Error('Invalid courseId provided to getCourseFeedbackSummary');
    }
    return this.makeRequest(`${API_BASE_URL}/feedback/course/${courseId}/summary`);
  }
}

export const feedbackService = new FeedbackService();
