import axios from 'axios';
import { getRoleToken } from '../utils/authUtils';

// Base API URL
const API_BASE_URL = 'http://localhost:4000';

class StudentAssignmentService {
  constructor() {
    this.apiUrl = API_BASE_URL;
  }

  // Get authentication headers
  getHeaders() {
    // Check all possible token sources
    const tokenSources = {
      'getRoleToken(student)': getRoleToken('student'),
      'localStorage.token': localStorage.getItem('token'),
      'localStorage.studentToken': localStorage.getItem('studentToken'),
      'localStorage.authToken': localStorage.getItem('authToken')
    };

    console.log('🔐 StudentAssignmentService getHeaders():');
    console.log('📋 All token sources:', tokenSources);

    const token = getRoleToken('student');
    console.log('  - Final token selected:', token ? `${token.substring(0, 20)}...` : 'null');
    console.log('  - Token length:', token ? token.length : 0);
    console.log('  - Token source:', this.getTokenSource());

    if (!token) {
      console.error('⚠️ CRITICAL: NO TOKEN FOUND! This WILL cause 403 Forbidden errors.');
      console.error('💡 Available localStorage items:');
      Object.keys(localStorage).forEach(key => {
        const value = localStorage.getItem(key);
        console.error(`   ${key}: ${value ? `${value.substring(0, 30)}...` : 'null'}`);
      });

      // Try to manually get any token as fallback
      const fallbackToken = localStorage.getItem('token') ||
        localStorage.getItem('studentToken') ||
        localStorage.getItem('authToken');

      if (fallbackToken) {
        console.warn('🔄 Using fallback token:', fallbackToken.substring(0, 30) + '...');
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${fallbackToken}`
        };
        console.log('📤 Request headers (with fallback):', headers);
        return headers;
      }
    }

    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };

    console.log('📤 Request headers:', headers);
    console.log('🔑 Authorization header will be:', headers.Authorization || 'NOT SET');
    return headers;
  }

  // Debug method to show token source
  getTokenSource() {
    const sources = [
      { name: 'studentToken', value: localStorage.getItem('studentToken') },
      { name: 'token', value: localStorage.getItem('token') },
      { name: 'authToken', value: localStorage.getItem('authToken') }
    ];

    return sources.filter(s => s.value).map(s => s.name);
  }

  // Get all assignments for a specific student (fixed, only one method)
  async getAllAssignments(studentId = null) {
    try {
      console.log('🚀 StudentAssignmentService.getAllAssignments() called');

      // Check if we have any authentication at all
      const hasAuth = this.getHeaders().Authorization;
      if (!hasAuth) {
        console.warn('⚠️ No authentication token found. This might be why endpoints are failing.');
        console.log('💡 Available localStorage keys:', Object.keys(localStorage));
      }

      if (!studentId) {
        // Try to get from token if not provided
        const token = this.getHeaders().Authorization?.split(' ')[1];
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            studentId = payload.user_id || payload.id || payload._id;
            console.log('📋 Extracted studentId from token:', studentId);
          } catch (e) {
            console.warn('⚠️ Could not decode token:', e.message);
          }
        }
      }
      if (!studentId) {
        throw new Error('Student ID is required to fetch assignments');
      }
      console.log('🔍 Fetching assignments for studentId:', studentId);

      // Test basic connectivity first
      try {
        console.log('🌐 Testing basic connectivity to:', this.apiUrl);
        const healthResponse = await axios.get(`${this.apiUrl}/health`, { timeout: 5000 });
        console.log('✅ Server is reachable:', healthResponse.status);
      } catch (healthError) {
        console.warn('⚠️ Server health check failed:', healthError.message);
      }

      // Try multiple endpoints in order of preference, always append student_id as query param
      const endpoints = [
        '/assignments/student/my-assignments',
        '/assignments/my-assignments',
        '/api/assignments/my-assignments',
        '/assignments/student',
        '/api/assignments/student',
        '/student/assignments'
      ];
      for (const endpoint of endpoints) {
        try {
          const url = `${this.apiUrl}${endpoint}?student_id=${studentId}`;
          console.log(`🌐 Trying endpoint: ${url}`);
          console.log(`🔑 Headers:`, this.getHeaders());

          const response = await axios.get(url, {
            headers: this.getHeaders()
          });
          console.log(`✅ Success with endpoint ${endpoint}:`, response.data);
          // Handle different response structures
          let assignments = [];
          if (Array.isArray(response.data)) {
            assignments = response.data;
          } else if (response.data.assignments) {
            assignments = response.data.assignments;
          } else if (response.data.data) {
            assignments = Array.isArray(response.data.data) ? response.data.data : response.data.data.assignments || [];
          }
          return this.normalizeAssignments(assignments);
        } catch (error) {
          console.log(`❌ Failed endpoint ${endpoint}:`);
          console.log(`   Status: ${error.response?.status}`);
          console.log(`   Message: ${error.message}`);
          console.log(`   Response data:`, error.response?.data);
          console.log(`   Response headers:`, error.response?.headers);
          continue;
        }
      }

      // If all endpoints failed with auth, try one more time with fallback approaches
      console.warn('🔄 All authenticated endpoints failed. Trying fallback approaches...');

      // Try without authentication (in case server allows anonymous access for debugging)
      try {
        const url = `${this.apiUrl}/assignments/student/my-assignments?student_id=${studentId}`;
        console.log(`🌐 Trying without auth: ${url}`);

        const response = await axios.get(url, {
          headers: { 'Content-Type': 'application/json' }
        });
        console.log(`✅ Success without auth:`, response.data);

        let assignments = [];
        if (Array.isArray(response.data)) {
          assignments = response.data;
        } else if (response.data.assignments) {
          assignments = response.data.assignments;
        } else if (response.data.data) {
          assignments = Array.isArray(response.data.data) ? response.data.data : response.data.data.assignments || [];
        }
        return this.normalizeAssignments(assignments);
      } catch (noAuthError) {
        console.log(`❌ Failed without auth:`, noAuthError.response?.status, noAuthError.message);
      }

      throw new Error('Unable to connect to assignment service. All endpoints failed.');
    } catch (error) {
      console.error('Error fetching assignments:', error);
      throw error;
    }
  }

  // Normalize assignment data to ensure consistent structure
  normalizeAssignments(assignments) {
    return assignments.map(assignment => {
      // Extract PDF attachments from backend fields
      const attachments = [];

      // Add attachment files if they exist
      if (assignment.attachment_file) {
        const filename = assignment.attachment_file.split('/').pop() || assignment.attachment_file.split('\\').pop();
        attachments.push(filename);
      }

      // Also check questions_pdf_path (legacy support)
      if (assignment.questions_pdf_path && assignment.questions_pdf_path !== assignment.attachment_file) {
        const filename = assignment.questions_pdf_path.split('/').pop() || assignment.questions_pdf_path.split('\\').pop();
        attachments.push(filename);
      }

      // Check for any other attachment arrays
      if (assignment.attachments && Array.isArray(assignment.attachments)) {
        attachments.push(...assignment.attachments);
      }

      if (assignment.files && Array.isArray(assignment.files)) {
        attachments.push(...assignment.files);
      }

      if (assignment.resources && Array.isArray(assignment.resources)) {
        attachments.push(...assignment.resources);
      }

      return {
        id: assignment.id || assignment._id || assignment.assignment_id,
        title: assignment.title || assignment.name || 'Untitled Assignment',
        description: assignment.description || assignment.details || 'No description available',
        course: assignment.course || assignment.course_name || assignment.subject || 'General',
        instructor: assignment.instructor || assignment.instructor_name || assignment.teacher || 'Staff',
        dueDate: assignment.due_date || assignment.dueDate || assignment.deadline || new Date().toISOString().split('T')[0],
        submittedDate: assignment.submitted_date || assignment.submittedDate || assignment.submission_date || null,
        status: assignment.status || (assignment.submitted_date ? 'submitted' : 'pending'),
        points: assignment.points || assignment.max_points || assignment.total_points || 100,
        score: assignment.score || assignment.earned_points || null,
        feedback: assignment.feedback || assignment.comments || null,
        difficulty: assignment.difficulty || assignment.level || 'Intermediate',
        timeAllowed: assignment.time_allowed || assignment.timeAllowed || assignment.duration || assignment.estimated_time ? `${assignment.estimated_time} hours` : '2 hours',
        submissionFormat: assignment.submission_format || assignment.submissionFormat || 'Document upload',
        requirements: assignment.requirements || assignment.criteria || assignment.instructions ? [assignment.instructions] : [
          'Complete all sections',
          'Follow submission guidelines',
          'Submit before deadline'
        ],
        attachments: attachments, // Use the extracted attachments
        // Store original paths for download functionality
        _originalAttachmentPath: assignment.attachment_file,
        _originalQuestionsPath: assignment.questions_pdf_path
      };
    });
  }

  // Download assignment file
  async downloadAssignmentFile(assignmentId, filename = null) {
    try {
      console.log(`📥 Downloading file for assignment ${assignmentId}, filename: ${filename}`);

      // Try multiple download endpoints
      const endpoints = [
        `/assignments/${assignmentId}/download`,
        `/assignments/${assignmentId}/file`,
        `/assignments/${assignmentId}/attachment`,
        `/api/assignments/${assignmentId}/download`,
        `/uploads/assignments/${filename}` // Direct file access if filename provided
      ];

      for (const endpoint of endpoints) {
        try {
          const url = `${this.apiUrl}${endpoint}`;
          console.log(`🌐 Trying download endpoint: ${url}`);

          const response = await axios.get(url, {
            headers: this.getHeaders(),
            responseType: 'blob',
            timeout: 30000 // 30 second timeout for file downloads
          });

          console.log(`✅ Download successful from ${endpoint}`);
          return response.data;

        } catch (error) {
          console.log(`❌ Download failed from ${endpoint}: ${error.response?.status} ${error.message}`);
          continue;
        }
      }

      throw new Error('All download endpoints failed');

    } catch (error) {
      console.error('Error downloading assignment file:', error);
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  // Submit assignment
  async submitAssignment(submissionData) {
    try {
      console.log('📤 StudentAssignmentService.submitAssignment() called');
      console.log('📋 Submission data:', submissionData);

      const { assignment_id, file, comments } = submissionData;

      if (!assignment_id) {
        throw new Error('Assignment ID is required');
      }

      if (!file) {
        throw new Error('File is required for submission');
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('assignment_id', assignment_id);
      formData.append('file', file);
      if (comments) {
        formData.append('comments', comments);
      }

      // Get student ID from token if not provided
      let studentId = submissionData.student_id;
      if (!studentId) {
        const token = this.getHeaders().Authorization?.split(' ')[1];
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            studentId = payload.user_id || payload.id || payload._id;
          } catch (e) {
            console.warn('⚠️ Could not extract student_id from token:', e.message);
          }
        }
      }

      if (studentId) {
        formData.append('student_id', studentId);
      }

      console.log('📤 Submitting assignment with FormData:');
      console.log(`   - assignment_id: ${assignment_id}`);
      console.log(`   - file: ${file.name} (${file.size} bytes)`);
      console.log(`   - student_id: ${studentId}`);
      console.log(`   - comments: ${comments || 'None'}`);

      // Try multiple submission endpoints
      const endpoints = [
        '/submissions/submit',
        '/api/submissions/submit',
        '/assignments/submit',
        '/api/assignments/submit'
      ];

      for (const endpoint of endpoints) {
        try {
          const url = `${this.apiUrl}${endpoint}`;
          console.log(`🌐 Trying submission endpoint: ${url}`);

          const response = await axios.post(url, formData, {
            headers: {
              ...this.getHeaders(),
              'Content-Type': 'multipart/form-data'
            }
          });

          console.log(`✅ Submission successful via ${endpoint}:`, response.data);
          return response.data;

        } catch (error) {
          console.log(`❌ Submission failed via ${endpoint}:`);
          console.log(`   Status: ${error.response?.status}`);
          console.log(`   Message: ${error.message}`);
          console.log(`   Response:`, error.response?.data);
          continue;
        }
      }

      throw new Error('All submission endpoints failed. Please check server connection.');

    } catch (error) {
      console.error('❌ Error submitting assignment:', error);
      throw error;
    }
  }

  // Get assignment by ID
  async getAssignmentById(assignmentId) {
    try {
      console.log(`Fetching assignment details for ID: ${assignmentId}`);

      const endpoint = `/assignments/${assignmentId}`;

      const response = await axios.get(`${this.apiUrl}${endpoint}`, {
        headers: this.getHeaders()
      });

      return this.normalizeAssignments([response.data])[0];

    } catch (error) {
      console.error('Error fetching assignment details:', error);
      throw new Error(`Failed to fetch assignment details: ${error.message}`);
    }
  }
}

// Export instance
const studentAssignmentService = new StudentAssignmentService();
export default studentAssignmentService;
