/**
 * Branch Dashboard API Service
 * Handles all API calls for Branch Dashboard data
 */

const BASE_URL = 'http://localhost:4000';

// Helper function to get authentication headers with TOKEN VALIDATION
const getAuthHeaders = () => {
  console.log('🔍 [BranchAPI] Getting authentication headers...');

  // Get token with validation
  const token = localStorage.getItem('token') || localStorage.getItem('authToken');
  const userString = localStorage.getItem('user');

  if (!token || token === 'null' || token === 'undefined') {
    console.error('❌ [BranchAPI] No valid authentication token found');
    throw new Error('No authentication token found. Please login again.');
  }

  // VALIDATE TOKEN MATCHES USER
  if (userString) {
    try {
      const user = JSON.parse(userString);
      const tokenParts = token.split('.');

      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        const tokenEmail = payload.email || payload.sub;
        const userEmail = user.email;

        if (tokenEmail && userEmail && tokenEmail !== userEmail) {
          console.error('❌ [BranchAPI] TOKEN MISMATCH!');
          console.error(`   Token email: ${tokenEmail}`);
          console.error(`   User email: ${userEmail}`);

          // Clear mismatched tokens
          localStorage.clear();
          window.location.href = '/';
          throw new Error('Token mismatch detected');
        }

        console.log(`✅ [BranchAPI] Token validated for: ${userEmail}`);
      }
    } catch (e) {
      if (e.message === 'Token mismatch detected') throw e;
      console.warn('⚠️ [BranchAPI] Could not validate token:', e);
    }
  }

  console.log('✅ [BranchAPI] Authentication token found and valid');

  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
};

// Helper function to get branch_code from user data
const getBranchCode = () => {
  // Try to get from localStorage
  const branchCode = localStorage.getItem('branch_code') ||
    localStorage.getItem('branchCode') ||
    localStorage.getItem('franchise_code');

  if (branchCode) return branchCode;

  // Try to parse from user data in localStorage
  try {
    const userDataStr = localStorage.getItem('user') || localStorage.getItem('userData');
    if (userDataStr) {
      const userData = JSON.parse(userDataStr);
      return userData.branch_code || userData.franchise_code || userData.branchCode;
    }
  } catch (e) {
    console.warn('Could not parse user data from localStorage');
  }

  return null;
};

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = {
        detail: `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
        url: response.url
      };
    }

    const errorMessage = errorData.detail || errorData.message || `API Error: ${response.status}`;
    console.error('❌ [Dashboard API] Error:', errorMessage, errorData);
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data;
};

// Branch Dashboard API operations
export const branchDashboardApi = {
  /**
   * Get all programs for the branch
   */
  async getPrograms() {
    try {
      console.log('📚 Fetching programs...');
      const branchCode = getBranchCode();
      const franchiseCode = localStorage.getItem('franchise_code');
      const queryParams = new URLSearchParams();
      if (branchCode) queryParams.append('branch_code', branchCode);
      if (franchiseCode) queryParams.append('franchise_code', franchiseCode);

      const url = `${BASE_URL}/api/branch-programs/programs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const data = await handleResponse(response);

      // Handle different response formats
      const programs = Array.isArray(data) ? data : (data.programs || []);
      console.log(`📚 Programs fetched: ${programs.length}`);
      return programs;
    } catch (error) {
      console.error('Error fetching programs:', error);
      return []; // Return empty array instead of throwing
    }
  },

  /**
   * Get all courses for the branch
   */
  async getCourses(params = {}) {
    try {
      console.log('📖 Fetching courses...');
      const branchCode = getBranchCode();
      const franchiseCode = localStorage.getItem('franchise_code');
      const queryParams = new URLSearchParams();
      if (branchCode) queryParams.append('branch_code', branchCode);
      if (franchiseCode) queryParams.append('franchise_code', franchiseCode);
      if (params.program_id) queryParams.append('program_id', params.program_id);
      if (params.status) queryParams.append('status', params.status);

      const url = `${BASE_URL}/api/branch-courses/courses${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const data = await handleResponse(response);

      // Handle different response formats
      const courses = Array.isArray(data) ? data : (data.courses || []);
      console.log(`📖 Courses fetched: ${courses.length}`);
      return courses;
    } catch (error) {
      console.error('Error fetching courses:', error);
      return []; // Return empty array instead of throwing
    }
  },

  /**
   * Get all subjects for the branch
   */
  async getSubjects(params = {}) {
    try {
      console.log('📝 Fetching subjects...');
      const branchCode = getBranchCode();
      const franchiseCode = localStorage.getItem('franchise_code');
      const queryParams = new URLSearchParams();
      if (branchCode) queryParams.append('branch_code', branchCode);
      if (franchiseCode) queryParams.append('franchise_code', franchiseCode);
      if (params.program_id) queryParams.append('program_id', params.program_id);
      if (params.course_id) queryParams.append('course_id', params.course_id);
      if (params.status) queryParams.append('status', params.status);

      const url = `${BASE_URL}/api/branch-subjects/subjects${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      console.log('📝 Subjects API URL:', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const data = await handleResponse(response);

      console.log('📝 Subjects raw response:', data);

      // Handle different response formats
      const subjects = Array.isArray(data) ? data : (data.subjects || []);
      console.log(`📝 Subjects fetched: ${subjects.length}`);
      return subjects;
    } catch (error) {
      console.error('Error fetching subjects:', error);
      return []; // Return empty array instead of throwing
    }
  },

  /**
   * Get all batches for the branch
   */
  async getBatches(params = {}) {
    try {
      console.log('👥 Fetching batches...');
      const branchCode = getBranchCode();
      const franchiseCode = localStorage.getItem('franchise_code');
      const queryParams = new URLSearchParams();
      if (branchCode) queryParams.append('branch_code', branchCode);
      if (franchiseCode) queryParams.append('franchise_code', franchiseCode);
      if (params.program_id) queryParams.append('program_id', params.program_id);
      if (params.course_id) queryParams.append('course_id', params.course_id);
      if (params.status) queryParams.append('status', params.status);

      const url = `${BASE_URL}/api/branch-batches/batches${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const data = await handleResponse(response);

      // Handle different response formats
      const batches = Array.isArray(data) ? data : (data.batches || []);
      console.log(`👥 Batches fetched: ${batches.length}`);
      return batches;
    } catch (error) {
      console.error('Error fetching batches:', error);
      return []; // Return empty array instead of throwing
    }
  },

  /**
   * Get all students for the branch
   */
  async getStudents() {
    try {
      console.log('🎓 Fetching students...');
      const branchCode = getBranchCode();
      const franchiseCode = localStorage.getItem('franchise_code');
      const queryParams = new URLSearchParams();
      if (branchCode) queryParams.append('branch_code', branchCode);
      if (franchiseCode) queryParams.append('franchise_code', franchiseCode);
      queryParams.append('page', '1');
      queryParams.append('limit', '10000'); // Get all students
      // Exclude ID card data for performance optimization
      queryParams.append('exclude_id_card', 'true');

      const url = `${BASE_URL}/api/branch-students/students?${queryParams.toString()}`;
      console.log('🎓 Students API URL:', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const data = await handleResponse(response);

      console.log('🎓 Students raw response:', data);

      // Handle both array response and object with students array
      // API returns { students: [], total: N }
      if (Array.isArray(data)) {
        console.log(`🎓 Students fetched (array): ${data.length}`);
        return data;
      }

      // If response has total count, use that for accurate count
      const students = data.students || [];
      const total = data.total || students.length;
      console.log(`🎓 Students fetched: ${students.length}, Total in DB: ${total}`);

      // Return an object with both students array and total count
      return { students, total, isCountResponse: true };
    } catch (error) {
      console.error('Error fetching students:', error);
      return { students: [], total: 0, isCountResponse: true }; // Return object on error
    }
  },

  /**
   * Get all instructors for the branch
   */
  async getInstructors() {
    try {
      console.log('👨‍🏫 Fetching instructors...');
      const response = await fetch(`${BASE_URL}/instructor/instructors`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const data = await handleResponse(response);
      return Array.isArray(data) ? data : (data.instructors || []);
    } catch (error) {
      console.error('Error fetching instructors:', error);
      return [];
    }
  },

  /**
   * Get all staff for the branch
   */
  async getStaff() {
    try {
      console.log('👨‍🏫 Fetching staff...');

      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const url = `${BASE_URL}/api/branch/staff?_t=${timestamp}`;

      const headers = getAuthHeaders();
      // Add aggressive cache-busting headers
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      headers['Pragma'] = 'no-cache';
      headers['Expires'] = '0';

      console.log('👨‍🏫 Staff API URL:', url);
      console.log('👨‍🏫 Staff API Headers:', {
        ...headers,
        Authorization: headers.Authorization?.substring(0, 30) + '...'
      });

      const response = await fetch(url, {
        method: 'GET',
        headers: headers,
        cache: 'no-store' // Force no caching
      });
      const data = await handleResponse(response);
      console.log('👨‍🏫 Staff API Response:', data);
      return Array.isArray(data) ? data : (data.staff || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
      return [];
    }
  },

  /**
   * Get all study materials for the branch
   */
  async getStudyMaterials(params = {}) {
    try {
      console.log('📚 Fetching study materials...');
      const branchCode = getBranchCode();
      const franchiseCode = localStorage.getItem('franchise_code');
      const queryParams = new URLSearchParams();
      if (branchCode) queryParams.append('branch_code', branchCode);
      if (franchiseCode) queryParams.append('franchise_code', franchiseCode);
      if (params.program_id) queryParams.append('program_id', params.program_id);
      if (params.course_id) queryParams.append('course_id', params.course_id);
      if (params.status) queryParams.append('status', params.status);

      const url = `${BASE_URL}/api/branch-study-materials/materials${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const data = await handleResponse(response);

      // Handle different response formats
      const materials = Array.isArray(data) ? data : (data.materials || data.study_materials || []);
      console.log(`📚 Study materials fetched: ${materials.length}`);
      return materials;
    } catch (error) {
      console.error('Error fetching study materials:', error);
      return []; // Return empty array instead of throwing
    }
  },

  /**
   * Get all paper sets for the branch
   */
  async getPaperSets() {
    try {
      console.log('📄 Fetching paper sets...');
      const response = await fetch(`${BASE_URL}/api/branch-paper-sets/paper-sets`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching paper sets:', error);
      throw error;
    }
  },

  /**
   * Get all certificates for the branch
   */
  async getCertificates(params = {}) {
    try {
      console.log('🎖️ Fetching certificates...');
      const queryParams = new URLSearchParams();
      if (params.student_id) queryParams.append('student_id', params.student_id);
      if (params.status) queryParams.append('status', params.status);

      const url = `${BASE_URL}/api/branch-certificates/certificates${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching certificates:', error);
      throw error;
    }
  },

  /**
   * Get all marksheets for the branch
   */
  async getMarksheets(params = {}) {
    try {
      console.log('📋 Fetching marksheets...');
      const queryParams = new URLSearchParams();
      if (params.student_id) queryParams.append('student_id', params.student_id);
      if (params.status) queryParams.append('status', params.status);

      const url = `${BASE_URL}/api/branch-certificates/marksheets${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching marksheets:', error);
      throw error;
    }
  },

  /**
   * Get all users for the branch
   */
  async getBranchUsers() {
    try {
      console.log('👤 Fetching branch users...');
      const response = await fetch(`${BASE_URL}/api/branch/branch-users`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching branch users:', error);
      throw error;
    }
  },

  /**
   * Get branch wallet balance from payments
   */
  async getWalletBalance() {
    try {
      console.log('💰 Fetching wallet balance from payments...');
      const response = await fetch(`${BASE_URL}/api/branch/branch-payments`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const data = await handleResponse(response);

      // Calculate total wallet balance from payments
      let totalBalance = 0;
      if (Array.isArray(data)) {
        totalBalance = data.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      } else if (data.payments && Array.isArray(data.payments)) {
        totalBalance = data.payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      } else if (data.total_balance !== undefined) {
        totalBalance = data.total_balance;
      }

      return totalBalance || 0;
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      return 0; // Return 0 if error
    }
  },

  /**
   * Get all branches (for franchise admin)
   */
  async getBranches() {
    try {
      console.log('🏢 Fetching all branches...');
      console.log('🔐 Auth headers check:', getAuthHeaders());

      // Use the simple branches API endpoint
      const response = await fetch(`${BASE_URL}/api/branch/branches`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      console.log('🏢 Branches API response status:', response.status);
      console.log('🏢 Branches API response headers:', Object.fromEntries(response.headers));

      const data = await handleResponse(response);

      console.log('🏢 Branches raw response:', data);
      console.log('🏢 Branches response type:', typeof data, Array.isArray(data));

      // Handle different response formats
      let branches = [];
      if (Array.isArray(data)) {
        branches = data;
        console.log('🏢 Using data as array directly');
      } else if (data.branches && Array.isArray(data.branches)) {
        branches = data.branches;
        console.log('🏢 Using data.branches array');
      } else if (data.data && Array.isArray(data.data)) {
        branches = data.data;
        console.log('🏢 Using data.data array');
      } else if (data.results && Array.isArray(data.results)) {
        branches = data.results;
        console.log('🏢 Using data.results array');
      } else {
        console.warn('🏢 Unknown response format:', data);
      }

      console.log(`🏢 Found ${branches.length} total branches`);
      console.log('🏢 Sample branch data:', branches[0]);
      return branches;

    } catch (error) {
      console.error('❌ Error fetching branches:', error);
      console.error('❌ Error details:', error.message, error.stack);
      return [];
    }
  },

  /**
   * Get branch totals from specific branch API
   */
  async getBranchTotals() {
    try {
      console.log('📊 Fetching branch totals from dashboard stats API...');

      // Call the optimized dashboard stats endpoint
      // FIX: Correct URL for admin_branch_router mount point (/api/admin/branch)
      const response = await fetch(`${BASE_URL}/api/admin/branch/dashboard-stats`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const data = await handleResponse(response);
      console.log('📊 Dashboard stats raw response:', data);

      // FIX: Unpack nested stats object (backend returns { success: true, stats: {...} })
      const statsData = data.stats || data;

      // Transform the response to match expected format
      if (statsData) {
        const totals = {
          total_students: statsData.students || 0,
          total_courses: statsData.courses || 0,
          total_programs: statsData.programs || 0,
          total_batches: statsData.batches || 0,
          total_instructors: statsData.instructors || 0,
          total_staff: statsData.staff || 0,
          total_certificates: 0,  // Not provided by stats endpoint
          total_marksheets: 0,  // Not provided by stats endpoint
          total_subjects: statsData.subjects || 0,
          total_study_materials: statsData.studyMaterials || statsData.study_materials || 0,
          total_branches: statsData.branches || 1,
          walletBalance: statsData.walletBalance, // Include wallet balance
          branch_data: statsData // Store full data for charts
        };

        console.log('📊 Transformed branch totals:', totals);
        return totals;
      }

      return {};
    } catch (error) {
      console.error('Error fetching branch totals:', error);
      return {};
    }
  },

  /**
   * Get all enrollments/batches
   */
  async getEnrollments() {
    try {
      console.log('📝 Fetching enrollments...');
      const response = await fetch(`${BASE_URL}/api/admin/branch/enrollments`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const data = await handleResponse(response);
      console.log('📝 Enrollments raw response:', data);
      return Array.isArray(data) ? data : (data.enrollments || []);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      return [];
    }
  },

  /**
   * Get all batches from dedicated batches API
   */
  async getBatchesFromAPI() {
    try {
      console.log('👥 Fetching batches from dedicated API...');
      const branchCode = getBranchCode();
      console.log('🏢 Using branch_code for batches:', branchCode);

      const url = branchCode
        ? `${BASE_URL}/api/branch-batches/batches?branch_code=${branchCode}`
        : `${BASE_URL}/api/branch-batches/batches`;

      console.log('🌐 Batches API URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      const data = await handleResponse(response);
      console.log('👥 Batches API response:', data);
      console.log('📊 Batches count:', Array.isArray(data) ? data.length : 0);

      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('❌ Error fetching batches from API:', error);
      return [];
    }
  },

  /**
   * Get batches (using dedicated batches API)
   */
  async getBatches() {
    return this.getBatchesFromAPI();
  },

  /**
   * Get comprehensive dashboard statistics
   */
  async getDashboardStats() {
    try {
      console.log('📊 Fetching comprehensive dashboard stats...');

      // Start independent requests in parallel
      const branchTotalsPromise = this.getBranchTotals().catch(err => {
        console.warn('⚠️ Failed to get branch totals:', err);
        return {};
      });

      // Always fetch staff separately in parallel as requested, since main stats might not have latest
      const staffPromise = this.getStaff().catch(err => {
        console.warn('⚠️ Failed to fetch staff separately:', err);
        return [];
      });

      // Also start wallet balance fetch in parallel as a fallback/verification
      // (It's lightweight enough to just fetch)
      const walletPromise = this.getWalletBalance().catch(() => 0);

      console.log('⏳ Api requests started in parallel...');

      // Wait for all to complete
      const [branchTotals, staffList, fallbackWallet] = await Promise.all([
        branchTotalsPromise,
        staffPromise,
        walletPromise
      ]);

      console.log('✅ Parallel API calls completed');

      // Determine wallet balance: use stats if available, else fallback
      let walletBalance = branchTotals.walletBalance;
      if (walletBalance === undefined || walletBalance === null) {
        walletBalance = fallbackWallet;
        console.log('💰 Used fallback wallet balance:', walletBalance);
      }

      // Determine staff count: use precise list length if available, else stats
      let staffCount = branchTotals.total_staff || 0;
      if (Array.isArray(staffList)) {
        staffCount = staffList.length;
      }

      // Extract charts data if available from backend
      const backendCharts = branchTotals.branch_data?.charts || {};

      // Construct the comprehensive stats object
      const stats = {
        programs: branchTotals.total_programs || 0,
        courses: branchTotals.total_courses || 0,
        subjects: branchTotals.total_subjects || 0,
        students: branchTotals.total_students || 0,
        instructors: branchTotals.total_instructors || 0,
        staff: staffCount,
        studyMaterials: branchTotals.total_study_materials || 0,
        batches: branchTotals.total_batches || 0,
        users: (branchTotals.total_students || 0) + (branchTotals.total_instructors || 0),
        walletBalance: typeof walletBalance === 'number' ? walletBalance : 0,
        certificates: branchTotals.total_certificates || 0,
        marksheets: branchTotals.total_marksheets || 0,
        branches: branchTotals.total_branches || 1,

        // Pass through chart data
        charts: backendCharts
      };

      console.log('📊 Final consolidated stats:', stats);

      return {
        stats,
        rawData: {
          programs: [],
          courses: [],
          subjects: [],
          students: [],
          instructors: [],
          staff: staffList || [], // Return actual staff list if we have it
          studyMaterials: [],
          batches: [],
          users: [],
          branches: []
        }
      };

    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error);
      throw error;
    }
  }
};

export default branchDashboardApi;
