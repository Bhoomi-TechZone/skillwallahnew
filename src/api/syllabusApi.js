/**
 * API functions for syllabus management
 */

const API_BASE_URL = 'http://localhost:4000';

/**
 * Get authentication headers with flexible token and branch code handling
 */
export const getAuthHeaders = () => {
  const authToken = localStorage.getItem('token') || localStorage.getItem('authToken');
  const branchCode = localStorage.getItem('branch_code') || localStorage.getItem('branchCode');
  const franchiseCode = localStorage.getItem('franchise_code') || localStorage.getItem('franchiseCode');

  const headers = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  if (branchCode) {
    headers['X-Branch-Code'] = branchCode;
  }

  if (franchiseCode) {
    headers['X-Franchise-Code'] = franchiseCode;
  }

  return headers;
};

/**
 * Check authentication status (non-blocking)
 */
export const checkAuthentication = () => {
  try {
    const authToken = localStorage.getItem('token') || localStorage.getItem('authToken');
    const branchCode = localStorage.getItem('branch_code') || localStorage.getItem('branchCode');

    return {
      isAuthenticated: !!authToken,
      authToken: authToken,
      branchCode: branchCode,
      error: !authToken ? 'Authentication token not found. Please login again.' : null
    };
  } catch (error) {
    return {
      isAuthenticated: false,
      authToken: null,
      branchCode: null,
      error: `Authentication check failed: ${error.message}`
    };
  }
};

/**
 * Fetch all syllabuses with filtering options
 */
export const fetchSyllabuses = async (filters = {}) => {
  try {
    console.log('🔄 Fetching syllabuses from backend API...', filters);

    const authToken = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (!authToken) {
      throw new Error('Authentication token not found. Please login again.');
    }

    const queryParams = new URLSearchParams();
    if (filters.program) queryParams.append('program_id', filters.program);
    if (filters.course) queryParams.append('course_id', filters.course);
    if (filters.subject) queryParams.append('subject_id', filters.subject);
    if (filters.search) queryParams.append('search', filters.search);

    const endpoint = `/api/syllabuses${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      // Get detailed error information from the server
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || `HTTP ${response.status} Error`;
      } catch {
        const errorText = await response.text();
        errorMessage = errorText || `HTTP ${response.status} Error`;
      }

      if (response.status === 401) {
        throw new Error(`Authentication failed: ${errorMessage}`);
      } else if (response.status === 500) {
        throw new Error(`Server error (500): ${errorMessage}`);
      } else {
        throw new Error(`${errorMessage} (Status: ${response.status})`);
      }
    }

    const data = await response.json();
    console.log('✅ Syllabuses API Response:', data);

    return data.syllabuses || [];
  } catch (error) {
    console.error('❌ Error fetching syllabuses:', error);
    throw error;
  }
};

/**
 * Fetch all programs from branch API
 */
export const fetchPrograms = async () => {
  try {
    console.log('🔄 Fetching programs from branch API...');

    const authToken = localStorage.getItem('token') || localStorage.getItem('authToken');
    const branchCode = localStorage.getItem('branch_code') || localStorage.getItem('branchCode') || localStorage.getItem('selectedBranchCode') || localStorage.getItem('currentBranchCode');
    const franchiseCode = localStorage.getItem('franchise_code') || localStorage.getItem('franchiseCode');

    console.log('[PROGRAMS] localStorage check:', { authToken: !!authToken, branchCode, franchiseCode });

    if (!authToken) {
      throw new Error('Authentication token not found. Please login again.');
    }

    const headers = getAuthHeaders();
    console.log('[PROGRAMS] Request headers:', headers);

    const response = await fetch(`${API_BASE_URL}/api/branch-programs/programs`, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      // Get detailed error information from the server
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || `HTTP ${response.status} Error`;
      } catch {
        const errorText = await response.text();
        errorMessage = errorText || `HTTP ${response.status} Error`;
      }

      console.error('[PROGRAMS] API Error:', { status: response.status, message: errorMessage });

      if (response.status === 401) {
        throw new Error(`Authentication failed: ${errorMessage}`);
      } else if (response.status === 500) {
        throw new Error(`Server error (500): ${errorMessage}`);
      } else {
        throw new Error(`${errorMessage} (Status: ${response.status})`);
      }
    }

    const data = await response.json();
    console.log('✅ Programs API Response:', data);
    console.log(`[PROGRAMS] Returned ${Array.isArray(data) ? data.length : data.programs ? data.programs.length : 0} programs`);

    return data.programs || data || [];
  } catch (error) {
    console.error('❌ Error fetching programs:', error);
    throw error;
  }
};

/**
 * Fetch courses for a specific program from branch API
 */
export const fetchCoursesByProgram = async (programId) => {
  try {
    console.log('🔄 Fetching courses for program:', programId);

    const authToken = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (!authToken) {
      throw new Error('Authentication token not found. Please login again.');
    }

    // Get branch_code and franchise_code from localStorage with multiple possible key names
    let branchCode = localStorage.getItem('branch_code') ||
      localStorage.getItem('branchCode') ||
      localStorage.getItem('selectedBranchCode') ||
      localStorage.getItem('currentBranchCode');

    let franchiseCode = localStorage.getItem('franchise_code') ||
      localStorage.getItem('franchiseCode') ||
      localStorage.getItem('selectedFranchiseCode') ||
      localStorage.getItem('currentFranchiseCode');

    // Log what we found
    console.log('📦 LocalStorage check:', {
      branchCode,
      franchiseCode,
      allKeys: Object.keys(localStorage).filter(k => k.includes('branch') || k.includes('franchise'))
    });

    // Build URL with program_id and branch/franchise filter
    let url = `${API_BASE_URL}/api/branch-courses/courses`;
    const params = new URLSearchParams();

    if (programId) {
      params.append('program_id', programId);
    }
    if (branchCode) {
      params.append('branch_code', branchCode);
      console.log('✅ Adding branch_code to request:', branchCode);
    } else if (franchiseCode) {
      params.append('franchise_code', franchiseCode);
      console.log('✅ Adding franchise_code to request:', franchiseCode);
    } else {
      console.log('⚠️ Warning: No branch_code or franchise_code found in localStorage');
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    console.log('🔗 Fetching courses from URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      // Get detailed error information from the server
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || `HTTP ${response.status} Error`;
      } catch {
        const errorText = await response.text();
        errorMessage = errorText || `HTTP ${response.status} Error`;
      }

      if (response.status === 401) {
        throw new Error(`Authentication failed: ${errorMessage}`);
      } else if (response.status === 500) {
        throw new Error(`Server error (500): ${errorMessage}`);
      } else {
        throw new Error(`${errorMessage} (Status: ${response.status})`);
      }
    }

    const data = await response.json();
    console.log('✅ Courses API Response:', data);

    // Branch courses API returns array directly
    const courses = Array.isArray(data) ? data : [];

    console.log(`🔍 Found ${courses.length} courses for program ${programId}`);
    return courses;
  } catch (error) {
    console.error('❌ Error fetching courses:', error);
    throw error;
  }
};

/**
 * Fetch subjects for a specific course from branch API
 */
export const fetchSubjectsByCourse = async (courseId) => {
  try {
    console.log('🔄 Fetching subjects for course:', courseId);

    const authToken = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (!authToken) {
      throw new Error('Authentication token not found. Please login again.');
    }

    // Use the correct backend endpoint
    const response = await fetch(`${API_BASE_URL}/api/branch-subjects/subjects?course_id=${courseId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      // Get detailed error information from the server
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || `HTTP ${response.status} Error`;
      } catch {
        const errorText = await response.text();
        errorMessage = errorText || `HTTP ${response.status} Error`;
      }

      if (response.status === 401) {
        throw new Error(`Authentication failed: ${errorMessage}`);
      } else if (response.status === 500) {
        throw new Error(`Server error (500): ${errorMessage}`);
      } else {
        throw new Error(`${errorMessage} (Status: ${response.status})`);
      }
    }

    const data = await response.json();
    console.log('✅ Subjects API Response:', data);

    // Backend returns array directly
    return data || [];
  } catch (error) {
    console.error('❌ Error fetching subjects:', error);
    throw error;
  }
};

/**
 * Create new syllabus
 */
export const createSyllabus = async (syllabusData) => {
  try {
    console.log('🔄 Creating syllabus:', syllabusData);

    const auth = checkAuthentication();
    if (!auth.isAuthenticated) {
      throw new Error(auth.error);
    }

    const response = await fetch(`${API_BASE_URL}/api/syllabuses/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(syllabusData),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed. Please login again.');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Create syllabus API Response:', data);

    return data;
  } catch (error) {
    console.error('❌ Error creating syllabus:', error);
    throw error;
  }
};

/**
 * Upload syllabus file
 */
export const uploadSyllabusFile = async (file) => {
  try {
    console.log('🔄 Uploading syllabus file:', file.name);

    const auth = checkAuthentication();
    if (!auth.isAuthenticated) {
      throw new Error(auth.error);
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/syllabuses/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${auth.authToken}`,
        'X-Branch-Code': auth.branchCode || ''
      },
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed. Please login again.');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Upload file API Response:', data);

    return data;
  } catch (error) {
    console.error('❌ Error uploading file:', error);
    throw error;
  }
};

/**
 * Update syllabus
 */
export const updateSyllabus = async (syllabusId, syllabusData) => {
  try {
    console.log('🔄 Updating syllabus:', syllabusId, syllabusData);

    const auth = checkAuthentication();
    if (!auth.isAuthenticated) {
      throw new Error(auth.error);
    }

    const response = await fetch(`${API_BASE_URL}/api/syllabuses/${syllabusId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(syllabusData),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed. Please login again.');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Update syllabus API Response:', data);

    return data;
  } catch (error) {
    console.error('❌ Error updating syllabus:', error);
    throw error;
  }
};

/**
 * Delete syllabus
 */
export const deleteSyllabus = async (syllabusId) => {
  try {
    console.log('🔄 Deleting syllabus:', syllabusId);

    const auth = checkAuthentication();
    if (!auth.isAuthenticated) {
      throw new Error(auth.error);
    }

    const response = await fetch(`${API_BASE_URL}/api/syllabuses/${syllabusId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed. Please login again.');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Delete syllabus API Response:', data);

    return data;
  } catch (error) {
    console.error('❌ Error deleting syllabus:', error);
    throw error;
  }
};

/**
 * Download syllabus file
 */
export const downloadSyllabus = async (syllabusId) => {
  try {
    console.log('🔄 Downloading syllabus:', syllabusId);

    const auth = checkAuthentication();
    if (!auth.isAuthenticated) {
      throw new Error(auth.error);
    }

    const response = await fetch(`${API_BASE_URL}/api/syllabuses/${syllabusId}/download`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed. Please login again.');
      }
      if (response.status === 404) {
        throw new Error('Syllabus file not found on server.');
      }
      throw new Error(`Download failed: HTTP ${response.status}`);
    }

    // Get the filename from response headers or use default
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'syllabus.pdf';

    if (contentDisposition) {
      const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
      const matches = filenameRegex.exec(contentDisposition);
      if (matches != null && matches[1]) {
        filename = matches[1].replace(/['"]/g, '');
      }
    }

    // Convert response to blob
    const blob = await response.blob();

    // Create download link and trigger download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = url;
    link.download = filename;

    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up object URL
    window.URL.revokeObjectURL(url);

    console.log('✅ Download triggered successfully for:', filename);
    return { status: 'success', filename: filename };

  } catch (error) {
    console.error('❌ Error downloading syllabus:', error);
    throw error;
  }
};

/**
 * Get syllabus details
 */
export const getSyllabusDetails = async (syllabusId) => {
  try {
    console.log('🔄 Getting syllabus details:', syllabusId);

    const auth = checkAuthentication();
    if (!auth.isAuthenticated) {
      throw new Error(auth.error);
    }

    const response = await fetch(`${API_BASE_URL}/api/syllabuses/${syllabusId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed. Please login again.');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Syllabus details API Response:', data);

    // Extract syllabus from response (API returns {status, syllabus})
    return data.syllabus || data;
  } catch (error) {
    console.error('❌ Error getting syllabus details:', error);
    throw error;
  }
};

/**
 * Test authentication status
 */
export const testAuthentication = () => {
  try {
    const authToken = localStorage.getItem('token') || localStorage.getItem('authToken');
    const branchCode = localStorage.getItem('branch_code') || localStorage.getItem('branchCode');

    return {
      isAuthenticated: !!authToken,
      authToken: authToken,
      branchCode: branchCode,
      error: !authToken ? 'No authentication token found' : null
    };
  } catch (error) {
    return {
      isAuthenticated: false,
      authToken: null,
      branchCode: null,
      error: error.message
    };
  }
};
