// Question Service API
import { API_BASE_URL } from '../config/api.js';

export const questionService = {
  // Get all questions with pagination and filters
  async getQuestions(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.subject) queryParams.append('subject', params.subject);
      if (params.course) queryParams.append('course', params.course);
      if (params.difficulty) queryParams.append('difficulty', params.difficulty);
      if (params.search) queryParams.append('search', params.search);
      
      const url = `${API_BASE_URL}/api/questions?${queryParams.toString()}`;
      console.log('🔍 Fetching questions from:', url);
      
      // Try multiple token sources
      const token = localStorage.getItem('token') || 
                   localStorage.getItem('access_token') || 
                   localStorage.getItem('authToken');
                   
      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }
      
      console.log('🔑 Using authentication token:', token.substring(0, 20) + '...');
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📡 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please login again.');
        } else if (response.status === 403) {
          throw new Error('Access denied. You may not have permission to view questions.');
        } else if (response.status === 404) {
          throw new Error('Questions API endpoint not found.');
        } else {
          const errorText = await response.text();
          throw new Error(`HTTP error ${response.status}: ${errorText || response.statusText}`);
        }
      }

      const data = await response.json();
      console.log('✅ Questions fetched successfully:', data);
      
      // Handle both array and object responses
      if (Array.isArray(data)) {
        // If API returns just array, wrap it in expected format
        return {
          success: true,
          questions: data,
          total: data.length,
          total_pages: 1
        };
      } else if (data.success !== undefined) {
        // API returns proper object with success flag
        return data;
      } else if (data.questions) {
        // API returns object with questions but no success flag
        return {
          success: true,
          questions: data.questions,
          total: data.total || data.questions.length,
          total_pages: data.total_pages || 1
        };
      } else {
        // Fallback - wrap data as questions array
        return {
          success: true,
          questions: [],
          total: 0,
          total_pages: 1
        };
      }
    } catch (error) {
      console.error('❌ Error fetching questions:', error);
      throw error;
    }
  },

  // Get a specific question by ID
  async getQuestion(questionId) {
    try {
      const url = `${API_BASE_URL}/api/questions/${questionId}`;
      console.log('🔍 Fetching question:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Question fetched successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Error fetching question:', error);
      throw error;
    }
  },

  // Create a new question
  async createQuestion(questionData) {
    try {
      const url = `${API_BASE_URL}/api/questions`;
      console.log('🔍 Creating question:', url, questionData);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(questionData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Question created successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Error creating question:', error);
      throw error;
    }
  },

  // Update an existing question
  async updateQuestion(questionId, questionData) {
    try {
      const url = `${API_BASE_URL}/api/questions/${questionId}`;
      console.log('🔍 Updating question:', url, questionData);
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(questionData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Question updated successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Error updating question:', error);
      throw error;
    }
  },

  // Delete a question
  async deleteQuestion(questionId) {
    try {
      const url = `${API_BASE_URL}/api/questions/${questionId}`;
      console.log('🔍 Deleting question:', url);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Question deleted successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Error deleting question:', error);
      throw error;
    }
  },

  // Get filter options (subjects, courses, difficulties)
  async getFilterOptions() {
    try {
      console.log('🔍 Fetching filter options from subjects and courses APIs...');
      
      // Try multiple token sources
      const token = localStorage.getItem('token') || 
                   localStorage.getItem('access_token') || 
                   localStorage.getItem('authToken');
                   
      if (!token) {
        console.warn('⚠️ No authentication token found for filter options');
      }
      
      // Fetch subjects and courses from their respective APIs
      const [subjectsResponse, coursesResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/branch-subjects/subjects`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch(`${API_BASE_URL}/api/branch-courses/courses/dropdown`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })
      ]);

      let subjects = [];
      let courses = [];

      // Process subjects response
      if (subjectsResponse.ok) {
        const subjectsData = await subjectsResponse.json();
        console.log('📋 Subjects API response:', subjectsData);
        
        if (Array.isArray(subjectsData)) {
          subjects = [...new Set(subjectsData.map(s => s.subject_name).filter(Boolean))];
        } else if (subjectsData.success && Array.isArray(subjectsData.subjects)) {
          subjects = [...new Set(subjectsData.subjects.map(s => s.subject_name).filter(Boolean))];
        }
      } else {
        console.warn('❌ Subjects API failed:', subjectsResponse.status, subjectsResponse.statusText);
      }

      // Process courses response  
      if (coursesResponse.ok) {
        const coursesData = await coursesResponse.json();
        console.log('📋 Courses API response:', coursesData);
        
        if (Array.isArray(coursesData)) {
          courses = [...new Set(coursesData.map(c => c.course_name || c.name).filter(Boolean))];
        } else if (coursesData.success && Array.isArray(coursesData.courses)) {
          courses = [...new Set(coursesData.courses.map(c => c.course_name || c.name).filter(Boolean))];
        } else if (coursesData.courses && Array.isArray(coursesData.courses)) {
          courses = [...new Set(coursesData.courses.map(c => c.course_name || c.name).filter(Boolean))];
        }
      } else {
        console.warn('❌ Courses API failed:', coursesResponse.status, coursesResponse.statusText);
      }

      console.log('✅ Filter options fetched:', { 
        subjectsCount: subjects.length, 
        coursesCount: courses.length,
        subjects: subjects.slice(0, 5),
        courses: courses.slice(0, 5)
      });

      return {
        success: true,
        filters: {
          subjects: subjects.sort(),
          courses: courses.sort(),
          difficulties: ['Easy', 'Medium', 'Hard'] // Static difficulties
        }
      };
    } catch (error) {
      console.error('❌ Error fetching filter options:', error);
      
      // Fallback to basic question endpoint if subjects/courses APIs fail
      try {
        const url = `${API_BASE_URL}/api/questions/filters/options`;
        console.log('🔍 Falling back to question filter options:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Fallback filter options fetched:', data);
        return data;
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        
        // Return empty filters if everything fails
        return {
          success: true,
          filters: {
            subjects: [],
            courses: [],
            difficulties: ['Easy', 'Medium', 'Hard']
          }
        };
      }
    }
  },

  // Bulk delete questions
  async bulkDeleteQuestions(questionIds) {
    try {
      const deletePromises = questionIds.map(id => this.deleteQuestion(id));
      const results = await Promise.allSettled(deletePromises);
      
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;
      
      console.log(`✅ Bulk delete completed: ${successful} successful, ${failed} failed`);
      
      return {
        success: true,
        successful,
        failed,
        total: questionIds.length
      };
    } catch (error) {
      console.error('❌ Error in bulk delete:', error);
      throw error;
    }
  }
};

export default questionService;