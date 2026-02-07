// Temporary CORS workaround using a proxy approach
// This can be used until the backend CORS headers are properly configured

export const corsWorkaroundFetch = async (url, options = {}) => {
  // Try the direct request first
  try {
    const response = await fetch(url, {
      ...options,
      mode: 'cors',
      credentials: 'omit'
    });
    return response;
  } catch (error) {
    // If it fails due to CORS, log the error and suggest solutions
    console.error('🚫 CORS Error:', error.message);

    // Check if it's specifically a CORS error
    if (error.name === 'TypeError' && error.message.includes('CORS')) {
      console.log('🛠️  CORS Error Detected - Backend configuration needed');
      console.log('   1. Backend must add Access-Control-Allow-Origin header');
      console.log('   2. Backend must handle OPTIONS preflight requests');
      console.log('   3. See ASSIGNMENT_UPDATE_CORS_FIX_GUIDE.md for details');

      // Throw a user-friendly error
      throw new Error('CORS policy error: Backend server needs CORS configuration. Please contact your system administrator.');
    }

    // Re-throw other errors
    throw error;
  }
};

// Enhanced assignment update function with better error handling
export const updateAssignmentWithCORSHandling = async (assignmentId, formData, token) => {
  const API_BASE_URL = 'http://localhost:4000';

  try {
    let submitData, headers;

    if (formData.attachmentFile) {
      // Validate file first
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (formData.attachmentFile.size > maxSize) {
        throw new Error('File size must be less than 10MB');
      }

      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(formData.attachmentFile.type)) {
        throw new Error('Only PDF and Word documents are allowed');
      }

      // Prepare FormData
      submitData = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'attachmentFile') {
          submitData.append('attachment', formData.attachmentFile);
        } else if (key === 'assignedStudents') {
          submitData.append('assigned_students', JSON.stringify(formData.assignedStudents));
        } else if (key === 'maxPoints') {
          submitData.append('max_points', formData.maxPoints.toString());
        } else if (key === 'dueDate') {
          submitData.append('due_date', formData.dueDate);
        } else if (key === 'courseId') {
          submitData.append('course_id', formData.courseId);
        } else if (key === 'visibility') {
          submitData.append('status', formData.visibility);
        } else if (key === 'estimatedTime') {
          submitData.append('estimated_time', formData.estimatedTime.toString());
        } else {
          submitData.append(key, formData[key]);
        }
      });

      headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      };
    } else {
      // JSON data
      const jsonData = {
        title: formData.title,
        description: formData.description,
        instructions: formData.instructions,
        type: formData.type,
        max_points: parseInt(formData.maxPoints),
        due_date: formData.dueDate,
        course_id: formData.courseId,
        status: formData.visibility,
        assigned_students: formData.assignedStudents
      };

      if (formData.estimatedTime) {
        jsonData.estimated_time = parseFloat(formData.estimatedTime);
      }

      submitData = JSON.stringify(jsonData);
      headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
    }

    const response = await corsWorkaroundFetch(`${API_BASE_URL}/assignments/${assignmentId}`, {
      method: 'PUT',
      headers: headers,
      body: submitData
    });

    if (response.ok) {
      const result = await response.json();
      return { success: true, data: result };
    } else {
      const errorText = await response.text();
      let errorMessage = 'Failed to update assignment';

      if (response.status === 500) {
        errorMessage = 'Server error occurred. Please try again or contact support.';
        if (formData.attachmentFile) {
          errorMessage += ' This might be due to file upload issues.';
        }
      } else if (response.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (response.status === 403) {
        errorMessage = 'You do not have permission to update this assignment.';
      } else if (response.status === 422) {
        errorMessage = `Validation error: Please check your input data.`;
      }

      return { success: false, error: errorMessage, status: response.status };
    }

  } catch (error) {
    console.error('Assignment update error:', error);

    if (error.message.includes('CORS policy error')) {
      return {
        success: false,
        error: 'CORS configuration issue detected. The backend server needs to be configured to allow cross-origin requests from your domain. Please contact your system administrator.',
        isCORSError: true
      };
    }

    return {
      success: false,
      error: error.message || 'Network error occurred. Please check your connection and try again.'
    };
  }
};

export default { corsWorkaroundFetch, updateAssignmentWithCORSHandling };
