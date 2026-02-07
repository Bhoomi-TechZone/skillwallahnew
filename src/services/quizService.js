import { getApiBaseUrl } from '../config/api.js';

const API_BASE_URL = getApiBaseUrl();

class QuizService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/quizzes`;
    this.questionsURL = `${API_BASE_URL}/questions`;
    this.attemptsURL = `${API_BASE_URL}/attempts`;
  }

  // Get Authorization header
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  // Create a new quiz
  async createQuiz(quizData) {
    try {
      const response = await fetch(`${this.baseURL}/`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(quizData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create quiz:', error);
      throw error;
    }
  }

  // Get quizzes for a course
  async getQuizzesForCourse(courseId) {
    try {
      const response = await fetch(`${this.baseURL}/${courseId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch quizzes for course:', error);
      throw error;
    }
  }

  // Get quiz by ID
  async getQuizById(quizId) {
    try {
      const response = await fetch(`${this.baseURL}/quiz/${quizId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch quiz:', error);
      throw error;
    }
  }

  // Update quiz
  async updateQuiz(quizId, updateData) {
    try {
      const response = await fetch(`${this.baseURL}/quiz/${quizId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update quiz:', error);
      throw error;
    }
  }

  // Delete quiz
  async deleteQuiz(quizId) {
    try {
      const response = await fetch(`${this.baseURL}/quiz/${quizId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to delete quiz:', error);
      throw error;
    }
  }

  // Get questions for a quiz
  async getQuestionsForQuiz(quizId) {
    try {
      const response = await fetch(`${this.questionsURL}/${quizId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch questions for quiz:', error);
      throw error;
    }
  }

  // Add question to quiz
  async addQuestionToQuiz(quizId, questionData) {
    try {
      const response = await fetch(`${this.questionsURL}/${quizId}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(questionData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to add question to quiz:', error);
      throw error;
    }
  }

  // Update question
  async updateQuestion(questionId, updateData) {
    try {
      const response = await fetch(`${this.questionsURL}/question/${questionId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update question:', error);
      throw error;
    }
  }

  // Delete question
  async deleteQuestion(questionId) {
    try {
      const response = await fetch(`${this.questionsURL}/question/${questionId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to delete question:', error);
      throw error;
    }
  }

  // Start quiz attempt
  async startQuizAttempt(quizId) {
    try {
      const response = await fetch(`${this.attemptsURL}/start/${quizId}`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to start quiz attempt:', error);
      throw error;
    }
  }

  // Submit quiz attempt
  async submitQuizAttempt(attemptId, answers) {
    try {
      const response = await fetch(`${this.attemptsURL}/submit/${attemptId}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ answers })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to submit quiz attempt:', error);
      throw error;
    }
  }

  // Get quiz attempt results
  async getQuizAttemptResults(attemptId) {
    try {
      const response = await fetch(`${this.attemptsURL}/results/${attemptId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch quiz attempt results:', error);
      throw error;
    }
  }

  // Get my quiz attempts
  async getMyQuizAttempts(quizId = null) {
    try {
      const url = quizId ? 
        `${this.attemptsURL}/my-attempts/${quizId}` :
        `${this.attemptsURL}/my-attempts`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch my quiz attempts:', error);
      throw error;
    }
  }

  // Get quiz attempts for a quiz (instructor/admin)
  async getQuizAttempts(quizId) {
    try {
      const response = await fetch(`${this.attemptsURL}/quiz/${quizId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch quiz attempts:', error);
      throw error;
    }
  }

  // Get quiz statistics
  async getQuizStatistics(quizId) {
    try {
      const response = await fetch(`${this.baseURL}/quiz/${quizId}/statistics`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch quiz statistics:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const quizService = new QuizService();
export default quizService;
