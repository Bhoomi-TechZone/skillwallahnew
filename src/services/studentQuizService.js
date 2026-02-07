import axios from 'axios';
import { getRoleToken } from '../utils/authUtils';

// Base API URL
const API_BASE_URL = 'http://localhost:4000';

class StudentQuizService {
  constructor() {
    this.apiUrl = API_BASE_URL;
  }

  // Get authentication headers
  getHeaders() {
    const token = getRoleToken('student');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  // Get all quizzes for a specific student based on enrolled courses
  async getAllQuizzes(studentId = null) {
    try {
      if (!studentId) {
        // Try to get from token if not provided
        const token = this.getHeaders().Authorization?.split(' ')[1];
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            studentId = payload.user_id || payload.id || payload._id;
          } catch (e) { }
        }
      }
      if (!studentId) {
        throw new Error('Student ID is required to fetch quizzes');
      }
      console.log('Fetching all quizzes for studentId:', studentId);

      // Try multiple endpoints in order of preference
      const endpoints = [
        '/quizzes/student/my-quizzes',
        '/quizzes/my-quizzes',
        '/api/quizzes/my-quizzes',
        '/quizzes/student',
        '/api/quizzes/student',
        '/student/quizzes'
      ];

      for (const endpoint of endpoints) {
        try {
          const url = `${this.apiUrl}${endpoint}?student_id=${studentId}`;
          console.log(`Trying endpoint: ${url}`);
          const response = await axios.get(url, {
            headers: this.getHeaders()
          });
          console.log(`Success with endpoint ${endpoint}:`, response.data);

          // Handle different response structures
          let quizzes = [];
          if (Array.isArray(response.data)) {
            quizzes = response.data;
          } else if (response.data.quizzes) {
            quizzes = response.data.quizzes;
          } else if (response.data.data) {
            quizzes = Array.isArray(response.data.data) ? response.data.data : response.data.data.quizzes || [];
          }

          return this.normalizeQuizzes(quizzes);
        } catch (error) {
          console.log(`Failed endpoint ${endpoint}:`, error.response?.status, error.message);
          continue;
        }
      }

      throw new Error('Unable to connect to quiz service. All endpoints failed.');
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      throw error;
    }
  }

  // Normalize quiz data to ensure consistent structure
  normalizeQuizzes(quizzes) {
    return quizzes.map(quiz => ({
      id: quiz.id || quiz._id || quiz.quiz_id,
      title: quiz.title || quiz.name || 'Untitled Quiz',
      description: quiz.description || quiz.details || 'No description available',
      course: quiz.course || quiz.course_name || quiz.subject || 'General',
      courseId: quiz.course_id || quiz.courseId,
      instructor: quiz.instructor || quiz.instructor_name || quiz.teacher || 'Staff',
      dueDate: quiz.due_date || quiz.dueDate || quiz.deadline,
      status: quiz.status || (quiz.is_published ? 'published' : 'draft'),
      totalMarks: quiz.total_marks || quiz.totalMarks || quiz.points || 100,
      timeLimit: quiz.time_limit || quiz.timeLimit || quiz.duration || 30,
      questionsCount: quiz.questions_count || quiz.questionsCount || quiz.total_questions || 0,
      attemptsAllowed: quiz.attempts_allowed || quiz.attemptsAllowed || 1,
      passingMarks: quiz.passing_marks || quiz.passingMarks || 50,
      quizType: quiz.quiz_type || quiz.quizType || 'multiple_choice',
      isPublished: quiz.is_published || quiz.isPublished || false,
      createdDate: quiz.created_date || quiz.createdDate || quiz.created_at,
      difficulty: quiz.difficulty || quiz.level || 'Intermediate'
    }));
  }

  // Get quiz details by ID
  async getQuizById(quizId) {
    try {
      console.log(`Fetching quiz details for ID: ${quizId}`);

      const endpoints = [
        `/quizzes/${quizId}`,
        `/api/quizzes/${quizId}`,
        `/quizzes/details/${quizId}`,
        `/api/quizzes/details/${quizId}`
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`Trying quiz detail endpoint: ${this.apiUrl}${endpoint}`);
          const response = await axios.get(`${this.apiUrl}${endpoint}`, {
            headers: this.getHeaders()
          });

          console.log(`Quiz detail success with endpoint ${endpoint}:`, response.data);
          return this.normalizeQuizzes([response.data])[0];
        } catch (error) {
          console.log(`Failed quiz detail endpoint ${endpoint}:`, error.response?.status, error.message);
          continue;
        }
      }

      throw new Error('All quiz detail endpoints failed');

    } catch (error) {
      console.error('Error fetching quiz details:', error);
      throw new Error(`Failed to fetch quiz details: ${error.message}`);
    }
  }

  // Submit quiz attempt
  async submitQuiz(quizId, answers, timeSpent) {
    try {
      console.log('Submitting quiz:', { quizId, answers, timeSpent });

      const submitData = {
        quiz_id: quizId,
        answers: answers,
        time_taken: timeSpent
      };

      const endpoints = [
        '/quizzes/submit',
        '/api/quizzes/submit',
        '/quiz-attempts/create',
        '/api/quiz-attempts/create'
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`Trying submission endpoint: ${this.apiUrl}${endpoint}`);
          const response = await axios.post(`${this.apiUrl}${endpoint}`, submitData, {
            headers: this.getHeaders()
          });

          console.log(`Submission success with endpoint ${endpoint}:`, response.data);
          return response.data;
        } catch (error) {
          console.log(`Failed submission endpoint ${endpoint}:`, error.response?.status, error.message);
          continue;
        }
      }

      throw new Error('All submission endpoints failed');

    } catch (error) {
      console.error('Error submitting quiz:', error);
      throw new Error(`Failed to submit quiz: ${error.message}`);
    }
  }
}

// Export singleton instance
const studentQuizService = new StudentQuizService();
export default studentQuizService;