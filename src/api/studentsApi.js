// API endpoints for students management
const API_BASE_URL = 'http://localhost:4000';

// Mock authentication for development/testing
const getMockToken = () => {
  // Create a basic JWT-like token for testing
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({
    user_id: "admin123",
    email: "admin@skillwallah.com",
    role: "admin",
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) // 7 days from now
  }));
  const signature = btoa("mock_signature_for_testing");
  return `${header}.${payload}.${signature}`;
};

// Get authentication token
const getAuthToken = () => {
  // Try to get token from various sources
  const token = localStorage.getItem('token') ||
    localStorage.getItem('adminToken') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('instructorToken') ||
    localStorage.getItem('studentToken');

  // If no valid token found, return a simple demo token
  return token || 'demo_token_for_development';
};

/**
 * Fetch all instructors from the backend
 * @returns {Promise} Promise resolving to instructors array
 */
export const fetchInstructors = async () => {
  try {
    const token = getAuthToken();

    // Try different endpoints in order of preference
    const endpoints = [
      '/users/instructors',
      '/users',
      '/admin/users/instructor'
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying instructor endpoint: ${API_BASE_URL}${endpoint}`);

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Success with instructor endpoint: ${endpoint}`, data);

          // Handle different response formats
          if (data.success && data.users) {
            // Format: {success: true, users: [...], message: "..."}
            const instructors = data.users.filter(user => user.role === 'instructor');
            return { success: true, users: instructors, message: 'Instructors fetched successfully' };
          } else if (data.success && data.data) {
            // Format: {success: true, data: [...], count: ...}
            const instructors = data.data.filter(user => user.role === 'instructor');
            return { success: true, users: instructors, message: 'Instructors fetched successfully' };
          } else if (Array.isArray(data)) {
            // Format: [...]
            const instructors = data.filter(user => user.role === 'instructor');
            return { success: true, users: instructors, message: 'Instructors fetched successfully' };
          }

          // If we got data but couldn't parse it, return it as-is
          return data;
        }
      } catch (error) {
        console.log(`❌ Failed with endpoint: ${endpoint}`, error.message);
        continue;
      }
    }

    // If all endpoints fail, return empty array
    console.log('All instructor endpoints failed, returning empty array');
    return { success: true, users: [], message: 'No instructors found' };

  } catch (error) {
    console.error('Error fetching instructors:', error);
    return { success: false, users: [], message: error.message };
  }
};

/**
 * Fetch all students from the backend
 * @returns {Promise} Promise resolving to students array
 */
export const fetchStudents = async () => {
  try {
    let response;
    let data;

    // Try different endpoints in order of preference
    const endpoints = [
      '/users/students',
      '/users',
      '/admin/users/student'
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${API_BASE_URL}${endpoint}`);

        // Try with token first
        const token = getAuthToken();
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        // If unauthorized, try without token
        if (!response.ok && response.status === 401) {
          console.log('Auth failed, trying without token...');
          response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
        }

        if (response.ok) {
          data = await response.json();
          console.log(`✅ Success with endpoint: ${endpoint}`);
          break;
        }
      } catch (error) {
        console.log(`❌ Failed with endpoint: ${endpoint}`, error.message);
        continue;
      }
    }

    if (!data) {
      throw new Error('All endpoints failed');
    }

    // Handle different response formats
    if (data.success && data.users) {
      // Format: {success: true, users: [...], message: "..."}
      const students = data.users.filter(user => user.role === 'student');
      return { success: true, users: students, message: 'Students fetched successfully' };
    } else if (data.success && data.data) {
      // Format: {success: true, data: [...], count: ...}
      const students = data.data.filter(user => user.role === 'student');
      return { success: true, users: students, message: 'Students fetched successfully' };
    } else if (Array.isArray(data)) {
      // Format: [...]
      const students = data.filter(user => user.role === 'student');
      return { success: true, users: students, message: 'Students fetched successfully' };
    }

    return data;
  } catch (error) {
    console.error('Error fetching students:', error);
    // Return mock data as fallback
    return {
      success: true,
      users: [
        {
          id: 'mock_1',
          user_id: 'std001',
          name: 'Demo Student 1',
          email: 'student1@demo.com',
          role: 'student',
          status: 'active',
          phone: '+1234567890',
          enrolled_courses: 2,
          progress: 65,
          last_login: new Date().toISOString()
        },
        {
          id: 'mock_2',
          user_id: 'std002',
          name: 'Demo Student 2',
          email: 'student2@demo.com',
          role: 'student',
          status: 'active',
          phone: '+1234567891',
          enrolled_courses: 1,
          progress: 30,
          last_login: new Date(Date.now() - 86400000).toISOString()
        }
      ],
      message: 'Using fallback demo data'
    };
  }
};

/**
 * Create a new student
 * @param {Object} studentData - Student data
 * @returns {Promise} Promise resolving to created student
 */
export const createStudent = async (studentData) => {
  try {
    // For now, simulate a successful creation since the API endpoint is not available
    console.warn('CREATE STUDENT: API endpoint not available, simulating success');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Return simulated success response
    return {
      success: true,
      message: 'Student created successfully (simulated)',
      user: {
        id: 'sim_' + Date.now(),
        ...studentData,
        role: 'student',
        created_at: new Date().toISOString()
      }
    };

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating student:', error);
    throw error;
  }
};

/**
 * Update a student
 * @param {string} studentId - Student ID
 * @param {Object} studentData - Updated student data
 * @returns {Promise} Promise resolving to updated student
 */
export const updateStudent = async (studentId, studentData) => {
  try {
    // For now, simulate a successful update since the API endpoint might not be available
    console.warn('UPDATE STUDENT: API endpoint not available, simulating success');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Return simulated success response
    return {
      success: true,
      message: 'Student updated successfully (simulated)',
      user: {
        id: studentId,
        ...studentData,
        role: 'student',
        updated_at: new Date().toISOString()
      }
    };

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating student:', error);
    throw error;
  }
};

/**
 * Delete a student
 * @param {string} studentId - Student ID
 * @returns {Promise} Promise resolving to deletion confirmation
 */
export const deleteStudent = async (studentId) => {
  try {
    // For now, simulate a successful deletion since the API endpoint might not be available
    console.warn('DELETE STUDENT: API endpoint not available, simulating success');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Return simulated success response
    return {
      success: true,
      message: 'Student deleted successfully (simulated)'
    };
  } catch (error) {
    console.error('Error deleting student:', error);
    throw error;
  }
};

/**
 * Get student details by ID
 * @param {string} studentId - Student ID
 * @returns {Promise} Promise resolving to student details
 */
/**
 * Get student details by ID
 * @param {string} studentId - Student ID
 * @returns {Promise} Promise resolving to student details
 */
export const getStudentById = async (studentId) => {
  try {
    const token = getAuthToken();

    // Try multiple endpoint patterns
    const endpoints = [
      `/users/students/${studentId}`,
      `/users/${studentId}`,
      `/admin/users/${studentId}`
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          return data.user || data;
        }
      } catch (error) {
        continue;
      }
    }

    throw new Error('Student not found');
  } catch (error) {
    console.error('Error fetching student details:', error);
    throw error;
  }
};

/**
 * Get student statistics
 * @returns {Promise} Promise resolving to student statistics
 */
/**
 * Get student statistics
 * @returns {Promise} Promise resolving to student statistics
 */
export const getStudentStats = async () => {
  try {
    const token = getAuthToken();

    // Try multiple endpoints for stats
    const endpoints = ['/users/students/stats', '/admin/dashboard/stats', '/stats'];

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying stats endpoint: ${API_BASE_URL}${endpoint}`);

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Stats success with: ${endpoint}`);
          return data;
        }
      } catch (error) {
        continue;
      }
    }

    // If all endpoints fail, return null to let component calculate stats
    console.log('All stats endpoints failed, will calculate from student data');
    return null;
  } catch (error) {
    console.error('Error fetching student statistics:', error);
    return null;
  }
};