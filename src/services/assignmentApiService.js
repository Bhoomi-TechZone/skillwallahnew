// Assignment API Service
// This service handles all API calls for assignment management

const API_BASE_URL = 'http://localhost:4000';

class AssignmentApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Get authentication token from localStorage
  getAuthToken() {
    return localStorage.getItem('token') ||
      localStorage.getItem('instructorToken') ||
      localStorage.getItem('authToken');
  }

  // Get current user info from token
  getCurrentUserInfo() {
    try {
      const token = this.getAuthToken();
      if (token) {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        return {
          user_id: tokenPayload.user_id,
          name: tokenPayload.name,
          email: tokenPayload.email,
          role: tokenPayload.role
        };
      }
    } catch (e) {
      console.log('Could not decode token for user info');
    }
    return null;
  }

  // Generic request helper
  async makeRequest(endpoint, options = {}) {
    const token = this.getAuthToken();

    const defaultHeaders = {
      'Authorization': `Bearer ${token}`
    };

    // Don't set Content-Type for FormData requests
    if (!(options.body instanceof FormData)) {
      defaultHeaders['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);

      // Handle different response types
      const contentType = response.headers.get('Content-Type') || '';

      let data;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        throw new Error(data.message || data.detail || data || `HTTP ${response.status}`);
      }

      return { data, status: response.status };
    } catch (error) {
      console.error(`API Error for ${endpoint}:`, error);
      throw error;
    }
  }

  // 1. Get Instructor Assignments
  async getInstructorAssignments(filters = {}) {
    const queryParams = new URLSearchParams();

    if (filters.course_id) queryParams.append('course_id', filters.course_id);
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.type) queryParams.append('type', filters.type);
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.page) queryParams.append('page', filters.page.toString());
    if (filters.limit) queryParams.append('limit', filters.limit.toString());

    const endpoint = `/assignments/instructor${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

    const response = await this.makeRequest(endpoint, {
      method: 'GET'
    });

    // Transform response to match frontend expectations
    let assignmentList = [];

    if (Array.isArray(response.data)) {
      assignmentList = response.data;
    } else if (response.data.assignments && Array.isArray(response.data.assignments)) {
      assignmentList = response.data.assignments;
    } else if (response.data.data && Array.isArray(response.data.data)) {
      assignmentList = response.data.data;
    }

    // Transform assignments to match frontend format
    const transformedAssignments = assignmentList.map(assignment => ({
      id: assignment._id || assignment.id,
      title: assignment.title,
      courseId: assignment.course_id || assignment.courseId,
      courseName: assignment.course_name || assignment.courseName || 'Unknown Course',
      description: assignment.description,
      instructions: assignment.instructions,
      type: assignment.type || 'exercise',
      dueDate: assignment.due_date || assignment.dueDate,
      maxPoints: assignment.max_points || assignment.maxPoints || 0,
      estimatedTime: assignment.estimated_time || assignment.estimatedTime,
      assignedStudents: assignment.assigned_students || assignment.assignedStudents || [],
      submissions: assignment.submissions || 0,
      graded: assignment.graded || 0,
      avgScore: assignment.avg_score || assignment.avgScore || 0,
      status: assignment.status || assignment.visibility || 'draft',
      visibility: assignment.visibility || assignment.status || 'draft',
      createdDate: assignment.created_at || assignment.createdDate || assignment.created_date,
      updatedDate: assignment.updated_at || assignment.updatedDate || assignment.updated_date,
      attachmentUrl: assignment.attachment_url || assignment.attachmentUrl,
      instructorId: assignment.instructor_id || assignment.instructorId
    }));

    return {
      assignments: transformedAssignments,
      total: response.data.total || transformedAssignments.length,
      page: response.data.page || 1,
      limit: response.data.limit || 50
    };
  }

  // 2. Create Assignment
  async createAssignment(formData) {
    // Create FormData object for file upload
    const submitData = new FormData();

    // Add all form fields
    submitData.append('title', formData.title);
    submitData.append('description', formData.description);
    if (formData.instructions) {
      submitData.append('instructions', formData.instructions);
    }
    submitData.append('type', formData.type);
    submitData.append('max_points', formData.maxPoints.toString());
    submitData.append('due_date', formData.dueDate);
    submitData.append('course_id', formData.courseId);
    submitData.append('status', formData.visibility || formData.status);

    if (formData.estimatedTime) {
      submitData.append('estimated_time', formData.estimatedTime.toString());
    }

    if (formData.assignedStudents && formData.assignedStudents.length > 0) {
      submitData.append('assigned_students', JSON.stringify(formData.assignedStudents));
    }

    // Add file if present
    if (formData.attachmentFile) {
      submitData.append('attachment', formData.attachmentFile);
    }

    const response = await this.makeRequest('/assignments/', {
      method: 'POST',
      body: submitData
    });

    return response.data;
  }

  // 3. Get Single Assignment
  async getAssignmentById(assignmentId) {
    const response = await this.makeRequest(`/assignments/${assignmentId}`, {
      method: 'GET'
    });

    // Transform single assignment response
    const assignment = response.data.assignment || response.data;

    return {
      id: assignment._id || assignment.id,
      title: assignment.title,
      courseId: assignment.course_id || assignment.courseId,
      courseName: assignment.course_name || assignment.courseName || 'Unknown Course',
      description: assignment.description,
      instructions: assignment.instructions,
      type: assignment.type || 'exercise',
      dueDate: assignment.due_date || assignment.dueDate,
      maxPoints: assignment.max_points || assignment.maxPoints || 0,
      estimatedTime: assignment.estimated_time || assignment.estimatedTime,
      assignedStudents: assignment.assigned_students || assignment.assignedStudents || [],
      submissions: assignment.submissions || 0,
      graded: assignment.graded || 0,
      avgScore: assignment.avg_score || assignment.avgScore || 0,
      status: assignment.status || assignment.visibility || 'draft',
      visibility: assignment.visibility || assignment.status || 'draft',
      createdDate: assignment.created_at || assignment.createdDate || assignment.created_date,
      updatedDate: assignment.updated_at || assignment.updatedDate || assignment.updated_date,
      attachmentUrl: assignment.attachment_url || assignment.attachmentUrl,
      instructorId: assignment.instructor_id || assignment.instructorId
    };
  }

  // 4. Update Assignment
  async updateAssignment(assignmentId, formData) {
    // Create FormData object for file upload
    const submitData = new FormData();

    // Add all form fields
    submitData.append('title', formData.title);
    submitData.append('description', formData.description);
    if (formData.instructions) {
      submitData.append('instructions', formData.instructions);
    }
    submitData.append('type', formData.type);
    submitData.append('max_points', formData.maxPoints.toString());
    submitData.append('due_date', formData.dueDate);
    submitData.append('course_id', formData.courseId);
    submitData.append('status', formData.visibility || formData.status);

    if (formData.estimatedTime) {
      submitData.append('estimated_time', formData.estimatedTime.toString());
    }

    if (formData.assignedStudents && formData.assignedStudents.length > 0) {
      submitData.append('assigned_students', JSON.stringify(formData.assignedStudents));
    }

    // Add file if present
    if (formData.attachmentFile) {
      submitData.append('attachment', formData.attachmentFile);
    }

    const response = await this.makeRequest(`/assignments/${assignmentId}`, {
      method: 'PUT',
      body: submitData
    });

    return response.data;
  }

  // 5. Delete Assignment
  async deleteAssignment(assignmentId) {
    const response = await this.makeRequest(`/assignments/${assignmentId}`, {
      method: 'DELETE'
    });

    return response.data;
  }

  // 6. Get Assignment Statistics
  async getAssignmentStatistics() {
    try {
      const response = await this.makeRequest('/assignments/instructor/statistics', {
        method: 'GET'
      });

      return response.data.statistics || response.data;
    } catch (error) {
      // If statistics endpoint doesn't exist, calculate from assignments
      console.warn('Statistics endpoint not available, calculating from assignments list');

      const { assignments } = await this.getInstructorAssignments();

      return {
        totalAssignments: assignments.length,
        totalSubmissions: assignments.reduce((sum, assignment) => sum + assignment.submissions, 0),
        pendingGrading: assignments.reduce((sum, assignment) => sum + (assignment.submissions - assignment.graded), 0),
        averageScore: Math.round(assignments.reduce((sum, assignment) => sum + assignment.avgScore, 0) / assignments.length || 0),
        assignmentsByType: {
          project: assignments.filter(a => a.type === 'project').length,
          exercise: assignments.filter(a => a.type === 'exercise').length,
          quiz: assignments.filter(a => a.type === 'quiz').length,
          essay: assignments.filter(a => a.type === 'essay').length
        },
        assignmentsByStatus: {
          published: assignments.filter(a => a.status === 'published').length,
          draft: assignments.filter(a => a.status === 'draft').length
        },
        overdueAssignments: assignments.filter(a => new Date(a.dueDate) < new Date()).length
      };
    }
  }

  // 7. Get Instructor Courses (for assignment form)
  async getInstructorCourses() {
    const response = await this.makeRequest('/instructor/my-courses', {
      method: 'GET'
    });

    const currentUser = this.getCurrentUserInfo();
    let coursesData = [];

    // Handle different response formats
    if (Array.isArray(response.data)) {
      coursesData = response.data;
    } else if (response.data.courses && Array.isArray(response.data.courses)) {
      coursesData = response.data.courses;
    }

    // Filter courses created by this instructor
    const instructorCourses = coursesData.filter(course =>
      course.instructor === currentUser?.user_id ||
      course.instructor_id === currentUser?.user_id
    );

    // Transform to consistent format
    return instructorCourses.map(course => ({
      id: course._id || course.id,
      name: course.title || course.name || 'Untitled Course'
    }));
  }

  // 8. Get Students for Course (for assignment form)
  async getStudentsForCourse(courseId) {
    const queryParams = new URLSearchParams();
    queryParams.append('course_id', courseId);

    const response = await this.makeRequest(`/instructor/students?${queryParams.toString()}`, {
      method: 'GET'
    });

    const studentsData = response.data.students || response.data;

    if (!Array.isArray(studentsData)) {
      return [];
    }

    // Transform to consistent format
    return studentsData.map(student => ({
      id: student.student_id || student.id,
      name: student.name,
      email: student.email
    }));
  }

  // 9. Download Assignment File
  async downloadAssignmentFile(assignmentId) {
    const token = this.getAuthToken();

    const response = await fetch(`${this.baseURL}/assignments/${assignmentId}/download`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to download file');
    }

    return response.blob();
  }

  // 10. Get Assignments by Course (utility method)
  async getAssignmentsByCourse(courseId) {
    return this.getInstructorAssignments({ course_id: courseId });
  }

  // 11. Search Assignments (utility method)
  async searchAssignments(searchTerm, filters = {}) {
    return this.getInstructorAssignments({
      search: searchTerm,
      ...filters
    });
  }

  // 12. Bulk Operations (utility methods)
  async bulkUpdateAssignments(assignmentIds, updates) {
    const promises = assignmentIds.map(id =>
      this.updateAssignment(id, updates)
    );

    return Promise.allSettled(promises);
  }

  async bulkDeleteAssignments(assignmentIds) {
    const promises = assignmentIds.map(id =>
      this.deleteAssignment(id)
    );

    return Promise.allSettled(promises);
  }

  // 13. Assignment Submission Methods (for future use)
  async getAssignmentSubmissions(assignmentId) {
    const response = await this.makeRequest(`/assignments/${assignmentId}/submissions`, {
      method: 'GET'
    });

    return response.data;
  }

  async gradeSubmission(assignmentId, submissionId, gradeData) {
    const response = await this.makeRequest(`/assignments/${assignmentId}/submissions/${submissionId}/grade`, {
      method: 'POST',
      body: JSON.stringify(gradeData)
    });

    return response.data;
  }
}

// Create and export singleton instance
const assignmentApiService = new AssignmentApiService();

// Export both the class and instance
export { AssignmentApiService };
export default assignmentApiService;

// Helper functions for form validation
export const validateAssignmentForm = (formData) => {
  const errors = {};

  if (!formData.title?.trim()) {
    errors.title = 'Title is required';
  }

  if (!formData.courseId) {
    errors.courseId = 'Course selection is required';
  }

  if (!formData.description?.trim()) {
    errors.description = 'Description is required';
  }

  if (!formData.type) {
    errors.type = 'Assignment type is required';
  }

  if (!formData.maxPoints || formData.maxPoints <= 0) {
    errors.maxPoints = 'Max points must be a positive number';
  }

  if (!formData.dueDate) {
    errors.dueDate = 'Due date is required';
  }

  if (formData.estimatedTime && formData.estimatedTime < 0) {
    errors.estimatedTime = 'Estimated time cannot be negative';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Helper function to format dates
export const formatAssignmentDate = (dateString) => {
  if (!dateString) return 'Not set';

  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return 'Invalid date';
  }
};

// Helper function to calculate grading progress
export const calculateGradingProgress = (assignment) => {
  if (!assignment.submissions || assignment.submissions === 0) {
    return 0;
  }

  return Math.round((assignment.graded / assignment.submissions) * 100);
};

// Helper function to check if assignment is overdue
export const isAssignmentOverdue = (dueDate) => {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
};
