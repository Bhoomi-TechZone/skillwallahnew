import React, { useState, useEffect } from 'react';
import BranchLayout from '../../components/Branch/BranchLayout';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaUsers,
  FaUserGraduate,
  FaEye,
  FaEyeSlash,
  FaTimes,
  FaSearch,
  FaUserCheck,
  FaUserCog,
  FaSpinner,
  FaPrint,
  FaFolder,
  FaFileAlt,
  FaCalendarAlt,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaCamera
} from 'react-icons/fa';

const ManageStudents = () => {
  // State management
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [coursesLoading, setCourseLoading] = useState(false);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchContact, setSearchContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, studentId: null });
  const [viewDetailsModal, setViewDetailsModal] = useState(false);

  // State and District management
  const [statesData, setStatesData] = useState([]);
  const [districtsData, setDistrictsData] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  // API Base URL
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

  // Fetch Indian states from API
  const fetchStates = async () => {
    try {
      setLoadingStates(true);
      // Using a free API for Indian states and districts
      const response = await fetch('https://cdn-api.co-vin.in/api/v2/admin/location/states');
      if (response.ok) {
        const data = await response.json();
        setStatesData(data.states || []);
      } else {
        // Fallback to static data if API fails
        const fallbackStates = [
          { state_id: 1, state_name: 'Andhra Pradesh' },
          { state_id: 2, state_name: 'Arunachal Pradesh' },
          { state_id: 3, state_name: 'Assam' },
          { state_id: 4, state_name: 'Bihar' },
          { state_id: 5, state_name: 'Chhattisgarh' },
          { state_id: 6, state_name: 'Goa' },
          { state_id: 7, state_name: 'Gujarat' },
          { state_id: 8, state_name: 'Haryana' },
          { state_id: 9, state_name: 'Himachal Pradesh' },
          { state_id: 10, state_name: 'Jharkhand' },
          { state_id: 11, state_name: 'Karnataka' },
          { state_id: 12, state_name: 'Kerala' },
          { state_id: 13, state_name: 'Madhya Pradesh' },
          { state_id: 14, state_name: 'Maharashtra' },
          { state_id: 15, state_name: 'Manipur' },
          { state_id: 16, state_name: 'Meghalaya' },
          { state_id: 17, state_name: 'Mizoram' },
          { state_id: 18, state_name: 'Nagaland' },
          { state_id: 19, state_name: 'Odisha' },
          { state_id: 20, state_name: 'Punjab' },
          { state_id: 21, state_name: 'Rajasthan' },
          { state_id: 22, state_name: 'Sikkim' },
          { state_id: 23, state_name: 'Tamil Nadu' },
          { state_id: 24, state_name: 'Telangana' },
          { state_id: 25, state_name: 'Tripura' },
          { state_id: 26, state_name: 'Uttar Pradesh' },
          { state_id: 27, state_name: 'Uttarakhand' },
          { state_id: 28, state_name: 'West Bengal' },
          { state_id: 29, state_name: 'Andaman and Nicobar Islands' },
          { state_id: 30, state_name: 'Chandigarh' },
          { state_id: 31, state_name: 'Dadra and Nagar Haveli and Daman and Diu' },
          { state_id: 32, state_name: 'Delhi' },
          { state_id: 33, state_name: 'Jammu and Kashmir' },
          { state_id: 34, state_name: 'Ladakh' },
          { state_id: 35, state_name: 'Lakshadweep' },
          { state_id: 36, state_name: 'Puducherry' }
        ];
        setStatesData(fallbackStates);
      }
    } catch (error) {
      console.error('Error fetching states:', error);
      // Use fallback static data
      const fallbackStates = [
        { state_id: 26, state_name: 'Uttar Pradesh' },
        { state_id: 32, state_name: 'Delhi' },
        { state_id: 14, state_name: 'Maharashtra' },
        { state_id: 28, state_name: 'West Bengal' },
        { state_id: 21, state_name: 'Rajasthan' },
        { state_id: 20, state_name: 'Punjab' },
        { state_id: 8, state_name: 'Haryana' },
        { state_id: 11, state_name: 'Karnataka' },
        { state_id: 23, state_name: 'Tamil Nadu' },
        { state_id: 7, state_name: 'Gujarat' }
      ];
      setStatesData(fallbackStates);
    } finally {
      setLoadingStates(false);
    }
  };

  // Fetch districts for selected state
  const fetchDistricts = async (stateId) => {
    try {
      setLoadingDistricts(true);
      setDistrictsData([]);

      // Using CoWIN API for districts
      const response = await fetch(`https://cdn-api.co-vin.in/api/v2/admin/location/districts/${stateId}`);
      if (response.ok) {
        const data = await response.json();
        setDistrictsData(data.districts || []);
      } else {
        // Fallback districts based on common states
        const fallbackDistricts = getFallbackDistricts(stateId);
        setDistrictsData(fallbackDistricts);
      }
    } catch (error) {
      console.error('Error fetching districts:', error);
      // Use fallback districts
      const fallbackDistricts = getFallbackDistricts(stateId);
      setDistrictsData(fallbackDistricts);
    } finally {
      setLoadingDistricts(false);
    }
  };

  // Fallback districts for common states
  const getFallbackDistricts = (stateId) => {
    const districtMap = {
      26: [ // Uttar Pradesh
        { district_id: 1, district_name: 'Agra' },
        { district_id: 2, district_name: 'Aligarh' },
        { district_id: 3, district_name: 'Allahabad' },
        { district_id: 4, district_name: 'Bareilly' },
        { district_id: 5, district_name: 'Ghaziabad' },
        { district_id: 6, district_name: 'Kanpur' },
        { district_id: 7, district_name: 'Lucknow' },
        { district_id: 8, district_name: 'Meerut' },
        { district_id: 9, district_name: 'Moradabad' },
        { district_id: 10, district_name: 'Noida' },
        { district_id: 11, district_name: 'Varanasi' }
      ],
      32: [ // Delhi
        { district_id: 1, district_name: 'Central Delhi' },
        { district_id: 2, district_name: 'East Delhi' },
        { district_id: 3, district_name: 'New Delhi' },
        { district_id: 4, district_name: 'North Delhi' },
        { district_id: 5, district_name: 'North East Delhi' },
        { district_id: 6, district_name: 'North West Delhi' },
        { district_id: 7, district_name: 'Shahdara' },
        { district_id: 8, district_name: 'South Delhi' },
        { district_id: 9, district_name: 'South East Delhi' },
        { district_id: 10, district_name: 'South West Delhi' },
        { district_id: 11, district_name: 'West Delhi' }
      ],
      14: [ // Maharashtra
        { district_id: 1, district_name: 'Mumbai' },
        { district_id: 2, district_name: 'Pune' },
        { district_id: 3, district_name: 'Nagpur' },
        { district_id: 4, district_name: 'Nashik' },
        { district_id: 5, district_name: 'Aurangabad' },
        { district_id: 6, district_name: 'Solapur' },
        { district_id: 7, district_name: 'Kolhapur' },
        { district_id: 8, district_name: 'Sangli' }
      ],
      28: [ // West Bengal
        { district_id: 1, district_name: 'Kolkata' },
        { district_id: 2, district_name: 'Howrah' },
        { district_id: 3, district_name: 'Hooghly' },
        { district_id: 4, district_name: '24 Parganas North' },
        { district_id: 5, district_name: '24 Parganas South' },
        { district_id: 6, district_name: 'Darjeeling' },
        { district_id: 7, district_name: 'Jalpaiguri' }
      ]
    };
    return districtMap[stateId] || [];
  };

  // Form data for add/edit student
  const [formData, setFormData] = useState({
    // Personal Details
    branchCode: '', // This will store unique option value for dropdown selection
    actualBranchCode: '', // This will store actual branch code for API calls
    regNumber: '',
    admissionYear: '',
    studentName: '',
    fatherName: '',
    motherName: '',
    dateOfBirth: '',
    contactNo: '',
    parentContact: '',
    gender: '',
    maritalStatus: '',
    category: '',
    identityType: '',
    idNumber: '',
    state: '',
    district: '',
    pincode: '',
    emailId: '',
    lastGeneralQualification: '',
    religion: '',
    address: '',
    photo: null,

    // Course Details
    courseCategory: '',
    course: '',
    batch: '',
    netFee: '',
    discount: '',
    otherCharges: '',
    dateOfAdmission: '',
    enquirySource: ''
  });

  // Get franchise code from token
  const getFranchiseCode = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.franchise_code || payload.sub;
      } catch (error) {
        console.error('Error decoding token:', error);
        return null;
      }
    }
    return null;
  };

  // Fetch students from API
  const fetchStudents = async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      const franchiseCode = getFranchiseCode();

      // Build query parameters
      const queryParams = new URLSearchParams();

      // Add branch_code filter if available (use actual branch code, not franchise code)
      const actualBranchCode = getActualBranchCode();
      if (actualBranchCode && actualBranchCode !== '') {
        queryParams.append('branch_code', actualBranchCode);
        console.log('🏢 [Frontend] Using Branch Code for filter:', actualBranchCode);
      } else if (franchiseCode) {
        // Fallback to franchise code only if no branch code available
        queryParams.append('branch_code', franchiseCode);
        console.log('🏢 [Frontend] Fallback to Franchise Code:', franchiseCode);
      }

      // Add search filters
      if (filters.course) {
        queryParams.append('course', filters.course);
      }
      if (filters.batch) {
        queryParams.append('batch', filters.batch);
      }
      if (filters.admission_year) {
        queryParams.append('admission_year', filters.admission_year);
      }
      if (filters.search) {
        queryParams.append('search', filters.search);
      }

      // Add pagination
      queryParams.append('page', filters.page || 1);
      queryParams.append('limit', filters.limit || 100);

      const url = `${API_BASE_URL}/api/branch-students/students?${queryParams.toString()}`;
      console.log('🚀 [Frontend] Calling GET:', url);
      console.log('🔑 [Frontend] Using token:', token ? 'Present' : 'Missing');
      console.log('🏢 [Frontend] Branch Code:', franchiseCode);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const students = await response.json();
        console.log('✅ Students fetched successfully - RAW RESPONSE:', students);
        console.log('📊 Students type:', typeof students);
        console.log('📊 Is Array:', Array.isArray(students));
        console.log('📊 Total students retrieved:', Array.isArray(students) ? students.length : 'Not an array');

        // Handle both array and non-array responses with better debugging
        let studentsArray;
        if (Array.isArray(students)) {
          console.log('📊 Response is array, using directly');
          studentsArray = students;
        } else if (students.data && Array.isArray(students.data)) {
          console.log('📊 Response has data property, using students.data');
          studentsArray = students.data;
        } else if (students.students && Array.isArray(students.students)) {
          console.log('📊 Response has students property, using students.students');
          studentsArray = students.students;
        } else if (students.result && Array.isArray(students.result)) {
          console.log('📊 Response has result property, using students.result');
          studentsArray = students.result;
        } else {
          console.log('📊 Response structure unknown, wrapping in array');
          studentsArray = [students];
        }
        console.log('🔄 Final studentsArray to transform:', studentsArray);

        // Log EVERY student in the array
        studentsArray.forEach((student, index) => {
          console.log(`🔍 RAW Student ${index + 1} - COMPLETE OBJECT:`, JSON.stringify(student, null, 2));
          console.log(`🔍 RAW Student ${index + 1} - Field Check:`);
          console.log(`   - student_name: ${student.student_name}`);
          console.log(`   - student_registration: ${student.student_registration}`);
          console.log(`   - name: ${student.name}`);
          console.log(`   - registration_number: ${student.registration_number}`);
          console.log(`   - All keys:`, Object.keys(student));
        });

        // Log first student sample for debugging
        if (studentsArray.length > 0) {

          // Check for any course-related fields
          console.log('🔍 All course-related fields:');
          Object.keys(studentsArray[0]).forEach(key => {
            if (key.toLowerCase().includes('course')) {
              console.log(`   - ${key}: ${studentsArray[0][key]}`);
            }
          });
        }


        if (studentsArray.length === 0) {
          console.error('🚨 STUDENTS ARRAY IS EMPTY! This is the problem.');
          setStudents([]);
          return;
        }

        // Transform the data to match frontend expectations
        const transformedStudents = studentsArray.map((student, index) => {

          // Check if student object is null or undefined
          if (!student) {
            console.error(`🚨 Student ${index + 1} is null/undefined!`);
            return {
              id: `temp_${index}`,
              reg_number: 'ERROR - NULL STUDENT',
              registration_password: 'Not Set',
              name: 'ERROR - NULL STUDENT',
              course: 'No Course',
              contact: 'N/A',
              email: 'N/A',
              fee: 0,
              status: 'Active',
              payment_status: 'Pay',
              batch: 'N/A',
              course_category: 'N/A'
            };
          }

          const transformed = {
            id: student.id || student.student_id || student._id || `temp_${index}`,
            reg_number: student.student_registration || student.registration_number || student.reg_number || 'Not Assigned',
            registration_password: student.contact_no || student.contact || student.phone || student.mobile || 'Not Set',
            name: student.student_name || student.name || 'Name Missing',
            course: student.course || student.course_name || student.course_title || 'No Course',
            contact: student.contact_no || student.contact || student.phone || student.mobile || 'N/A',
            email: student.email_id || student.email || 'N/A',
            fee: student.net_fee || student.fee || student.total_fee || 0,
            status: student.admission_status || student.status || 'Active',
            payment_status: student.payment_status || 'Pay',
            branch_code: student.branch_code,
            franchise_code: student.franchise_code,
            batch: student.batch || student.batch_name || 'N/A',
            created_at: student.created_at,
            // Additional fields for better display
            course_category: student.course_category || 'N/A',
            date_of_admission: student.date_of_admission || student.admission_date,
            father_name: student.father_name || student.fatherName || student.father,
            gender: student.gender,
            date_of_birth: student.date_of_birth || student.dateOfBirth,
            // ID card related fields
            card_number: student.card_number,
            photo_url: student.photo_url,
            issue_date: student.issue_date,
            expiry_date: student.expiry_date
          };

          console.log(`✅ Transformed student ${index + 1}:`, transformed);
          return transformed;
        });

        setStudents(transformedStudents);
        // Cache fresh data
        localStorage.setItem('branch_students_list', JSON.stringify(transformedStudents));
        console.log('🔄 Transformed students count:', transformedStudents.length);
        console.log('🔍 First transformed student:', transformedStudents[0]);

        // Validate data completeness and log specific issues
        if (transformedStudents.length > 0) {
          const sample = transformedStudents[0];

        }

        // Validate data completeness
        const missingData = transformedStudents.filter(s =>
          s.name === 'Name Missing' || s.reg_number === 'Not Assigned' || s.course === 'No Course'
        );
        if (missingData.length > 0) {
          console.warn(`⚠️ Students with missing critical data: ${missingData.length}/${transformedStudents.length}`);
          console.warn('⚠️ Sample missing data student details:', JSON.stringify(missingData[0], null, 2));
          console.warn('⚠️ Missing fields analysis:');
          missingData[0] && Object.keys(missingData[0]).forEach(key => {
            const value = missingData[0][key];
            if (value === 'Name Missing' || value === 'Not Assigned' || value === 'No Course' || value === 'N/A') {
              console.warn(`   - ${key}: ${value}`);
            }
          });
        }
      } else {
        const errorData = await response.json();
        console.error('❌ API Error Response:', errorData);
        throw new Error(errorData.detail || 'Failed to fetch students');
      }
    } catch (error) {
      console.error('❌ Error fetching students:', error);
      setError(`Failed to load students: ${error.message}`);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // Debug function to test course and batch APIs
  const debugAPIs = async () => {
    console.log('🔍 [DEBUG] Testing course and batch API endpoints...');

    try {
      // Test courses without branch filter
      const response1 = await fetch(`${API_BASE_URL}/api/branch-courses/courses/dropdown`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response1.ok) {
        const data1 = await response1.json();
        console.log('🔍 [DEBUG] All courses:', data1);
      }

      // Test batches without branch filter
      const debugHeaders2 = { 'Content-Type': 'application/json' };
      const token = localStorage.getItem('token');
      if (token) {
        debugHeaders2['Authorization'] = `Bearer ${token}`;
      }

      const response2 = await fetch(`${API_BASE_URL}/api/branch-batches/batches/dropdown`, {
        method: 'GET',
        headers: debugHeaders2
      });

      if (response2.ok) {
        const data2 = await response2.json();
        console.log('🔍 [DEBUG] All batches:', data2);
      }

      // Test with specific branch codes
      const testBranches = ['FR-SK-0940', 'FR-IN-UTT-0A388'];
      for (const branch of testBranches) {
        // Test courses for branch
        const response3 = await fetch(`${API_BASE_URL}/api/branch-courses/courses/dropdown?branch_code=${branch}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response3.ok) {
          const data3 = await response3.json();
          console.log(`🔍 [DEBUG] Courses for ${branch}:`, data3);
        }

        // Test batches for branch
        const debugHeaders4 = { 'Content-Type': 'application/json' };
        if (token) {
          debugHeaders4['Authorization'] = `Bearer ${token}`;
        }

        const response4 = await fetch(`${API_BASE_URL}/api/branch-batches/batches/dropdown?branch_code=${branch}`, {
          method: 'GET',
          headers: debugHeaders4
        });

        if (response4.ok) {
          const data4 = await response4.json();
          console.log(`🔍 [DEBUG] Batches for ${branch}:`, data4);
        }
      }
    } catch (error) {
      console.error('🔍 [DEBUG] API test error:', error);
    }
  };

  // Make debug function available globally for browser console
  React.useEffect(() => {
    window.debugAPIs = debugAPIs;
    window.debugStudentData = () => {
      console.log('🔍 [DEBUG] Current students in state:', students);
      console.log('🔍 [DEBUG] Sample student:', students[0]);
      if (students.length > 0) {
        console.table(students.slice(0, 5)); // Show first 5 students in table format
      }
    };
    window.debugCourses = () => {
      console.log('🔍 [DEBUG] Current courses in state:', courses);
      console.log('🔍 [DEBUG] Courses loading:', coursesLoading);
      console.log('🔍 [DEBUG] Branch code:', formData.branchCode);
      if (courses.length > 0) {
        console.table(courses);
      }
    };
    window.refetchStudents = () => fetchStudents();
    window.refetchCourses = (branchCode) => {
      const branch = branchCode || formData.branchCode;
      console.log('🔄 Manual course refetch for branch:', branch);
      return fetchCourses(branch);
    };
    window.testAPI = async () => {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      const franchiseCode = getFranchiseCode();

      // Test student API
      const studentUrl = `${API_BASE_URL}/api/branch-students/students?branch_code=${franchiseCode}&page=1&limit=1`;
      console.log('🧪 Testing Student API:', studentUrl);

      const studentResponse = await fetch(studentUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const studentData = await studentResponse.json();
      console.log('🧪 Student API result:', studentData);

      // Test course API
      const courseUrl = `${API_BASE_URL}/api/branch-courses/courses/dropdown?branch_code=${franchiseCode}`;
      console.log('🧪 Testing Course API:', courseUrl);

      const courseResponse = await fetch(courseUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const courseData = await courseResponse.json();
      console.log('🧪 Course API result:', courseData);

      return { studentData, courseData };
    };
  }, [students, courses, formData.branchCode, coursesLoading]);

  // Fetch courses from API with branch code filtering
  const fetchCourses = async (branchCode = null) => {
    try {
      setCourseLoading(true);

      // Use the provided branch code (from user selection) or fallback
      const targetBranchCode = branchCode || formData.actualBranchCode || formData.branchCode;
      console.log(`🚀 [Frontend] Fetching courses for selected branch: ${targetBranchCode}`);

      if (!targetBranchCode) {
        console.warn('⚠️ No branch code provided for course fetch');
        setCourses([]);
        return;
      }

      const url = `${API_BASE_URL}/api/branch-courses/courses`;
      console.log(`🔗 [Frontend] Course API URL: ${url}`);
      console.log(`🔍 [Frontend] Will filter for branch: ${targetBranchCode}`);

      // Add authentication headers
      const headers = {
        'Content-Type': 'application/json'
      };

      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('🔑 [Frontend] Added auth token to course request');
      } else {
        console.warn('⚠️ [Frontend] No auth token found for course request');
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });

      console.log(`📡 [Frontend] Course response status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Raw courses data from database:', data);

        // Get all courses from database
        let allCoursesArray = [];
        if (Array.isArray(data)) {
          allCoursesArray = data;
        } else if (data.courses && Array.isArray(data.courses)) {
          allCoursesArray = data.courses;
        } else if (data.data && Array.isArray(data.data)) {
          allCoursesArray = data.data;
        } else {
          console.warn('⚠️ Unknown database response structure:', data);
          allCoursesArray = [];
        }

        console.log(`📊 [Frontend] Total courses from database: ${allCoursesArray.length}`);
        console.log('📋 [Frontend] Raw course data sample:', allCoursesArray.slice(0, 3));

        // Filter courses by branch code
        const branchCourses = allCoursesArray.filter(course => {
          const courseBranch = course.branch_code || course.franchise_code;
          const matches = courseBranch === targetBranchCode;

          console.log(`🔍 Checking course: ${course.course_name} (Branch: "${courseBranch}" vs Target: "${targetBranchCode}")`);

          if (matches) {
            console.log(`✅ Course match: ${course.course_name} (${courseBranch})`);
          }
          return matches;
        });

        console.log(`🎯 [Frontend] Filtered courses for branch ${targetBranchCode}: ${branchCourses.length}`);

        // If no exact branch matches, try to show all available courses for now
        let coursesToShow = branchCourses;
        if (branchCourses.length === 0) {
          console.log('🔄 No exact branch matches found, checking if we should show all courses...');
          console.log('🔍 All available courses in database:');
          allCoursesArray.forEach(course => {
            console.log(`   - ${course.course_name} (Branch: "${course.branch_code || course.franchise_code || 'none'}")`);
          });

          // Show all courses if they exist (for testing/development)
          if (allCoursesArray.length > 0) {
            console.log('📋 Using all available courses since no branch-specific ones found');
            coursesToShow = allCoursesArray;
          }
        }

        if (coursesToShow.length > 0) {
          // Format courses for dropdown
          const formattedCourses = coursesToShow.map((course, index) => ({
            id: course.id || course.course_id || `course_${index}`,
            course_name: course.course_name || course.name || course.title,
            course_code: course.course_code || course.code,
            branch_code: course.branch_code || course.franchise_code,
            label: course.course_name || course.name || course.title,
            value: course.course_name || course.name || course.title
          }));

          console.log('📋 [Frontend] Formatted courses for dropdown:', formattedCourses);
          setCourses(formattedCourses);
        } else {
          console.warn(`⚠️ No courses found in database for branch: ${targetBranchCode}`);
          console.log('🔍 Available branches in database:', [...new Set(allCoursesArray.map(c => c.branch_code || c.franchise_code))]);

          // Show test courses if no real ones found
          const testCourses = [
            {
              id: 'test_1',
              course_name: 'Bachelor of Computer Applications (BCA)',
              course_code: 'BCA001',
              branch_code: targetBranchCode,
              label: 'Bachelor of Computer Applications (BCA)',
              value: 'Bachelor of Computer Applications (BCA)'
            },
            {
              id: 'test_2',
              course_name: 'Master of Computer Applications (MCA)',
              course_code: 'MCA001',
              branch_code: targetBranchCode,
              label: 'Master of Computer Applications (MCA)',
              value: 'Master of Computer Applications (MCA)'
            }
          ];

          console.log('🧪 Using test courses - no database matches found');
          setCourses(testCourses);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Error fetching courses:', response.status, response.statusText, errorText);
        console.log('🧪 Setting test courses due to API error');
        setCourses(errorTestCourses);
      }
    } catch (error) {
      console.error('❌ Error fetching courses:', error);


      console.log('🧪 Setting test courses due to network error');
      setCourses(networkErrorCourses);
    } finally {
      setCourseLoading(false);
    }
  };

  // Fetch batches from API with branch code and course filtering
  const fetchBatches = async (branchCode = null, courseId = null) => {
    try {
      setBatchesLoading(true);

      const targetBranchCode = branchCode || formData.branchCode || getFranchiseCode();
      console.log(`🚀 [Frontend] Fetching batches for branch: ${targetBranchCode}, course: ${courseId}`);

      const url = `${API_BASE_URL}/api/branch-batches/batches`;
      console.log(`🔗 [Frontend] Batch API URL: ${url}`);
      console.log(`🔍 [Frontend] Will filter for branch: ${targetBranchCode}, course: ${courseId}`);

      // Prepare headers with authentication
      const headers = { 'Content-Type': 'application/json' };
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('🔑 [Frontend] Added auth token to batch request');
      } else {
        console.warn('⚠️ [Frontend] No auth token found for batch request');
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });

      console.log(`📡 [Frontend] Batches response status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Raw batches data from database:', data);

        // Get all batches from database  
        let allBatchesArray = [];
        if (Array.isArray(data)) {
          allBatchesArray = data;
        } else if (data.batches && Array.isArray(data.batches)) {
          allBatchesArray = data.batches;
        } else if (data.data && Array.isArray(data.data)) {
          allBatchesArray = data.data;
        } else {
          console.warn('⚠️ Unknown database response structure:', data);
          allBatchesArray = [];
        }

        console.log(`📊 [Frontend] Total batches from database: ${allBatchesArray.length}`);
        console.log('📋 [Frontend] Raw batch data sample:', allBatchesArray.slice(0, 3));

        // Filter batches by branch code and course
        const filteredBatches = allBatchesArray.filter(batch => {
          const batchBranch = batch.branch_code || batch.franchise_code;
          const batchCourse = batch.course_id || batch.course_name || batch.course;

          const branchMatches = batchBranch === targetBranchCode;
          const courseMatches = !courseId || batchCourse === courseId || batch.course_name === courseId;

          console.log(`🔍 Checking batch: ${batch.batch_name} (Branch: "${batchBranch}" vs Target: "${targetBranchCode}", Course: "${batchCourse}" vs Selected: "${courseId}")`);

          const matches = branchMatches && courseMatches;
          if (matches) {
            console.log(`✅ Batch match: ${batch.batch_name} (Branch: ${batchBranch}, Course: ${batchCourse})`);
          }
          return matches;
        });

        console.log(`🎯 [Frontend] Filtered batches for branch ${targetBranchCode}, course ${courseId}: ${filteredBatches.length}`);

        // If no exact matches, try to show all available batches for now
        let batchesToShow = filteredBatches;
        if (filteredBatches.length === 0) {
          console.log('🔄 No exact batch matches found, checking if we should show all batches...');
          console.log('🔍 All available batches in database:');
          allBatchesArray.forEach(batch => {
            console.log(`   - ${batch.batch_name} (Branch: "${batch.branch_code || batch.franchise_code || 'none'}", Course: "${batch.course_name || batch.course_id || 'none'}")`);
          });

          // Show all batches if they exist (for testing/development)
          if (allBatchesArray.length > 0) {
            console.log('📋 Using all available batches since no branch/course-specific ones found');
            batchesToShow = allBatchesArray;
          }
        }

        if (batchesToShow.length > 0) {
          console.log('📋 [Frontend] Database batch details:', batchesToShow.map(b => ({
            name: b.batch_name,
            code: b.batch_code,
            course_id: b.course_id,
            course_name: b.course_name,
            available_seats: b.available_seats,
            branch: b.branch_code
          })));

          setBatches(batchesToShow);
        } else {
          console.warn(`⚠️ No batches found in database for branch: ${targetBranchCode}, course: ${courseId}`);
          console.log('🔍 Available batches in database:', allBatchesArray.map(b => ({
            branch: b.branch_code,
            course: b.course_name,
            batch: b.batch_name
          })));

          // Set test batches if no matches
          setBatches([]);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Error fetching batches:', response.status, response.statusText, errorText);

        // Fallback: Set some default batches if API fails
        console.warn('🔄 Using fallback batch data');
        const fallbackBatches = [
          {
            id: "fallback_1",
            batch_name: "Morning Batch",
            batch_code: "MOR-001",
            course_id: courseId || "default",
            course_name: "General Course",
            timing: "10:00 AM - 12:00 PM",
            branch_code: targetBranchCode,
            available_seats: 20,
            label: "Morning Batch (20 seats available)",
            value: "Morning Batch"
          },
          {
            id: "fallback_2",
            batch_name: "Evening Batch",
            batch_code: "EVE-001",
            course_id: courseId || "default",
            course_name: "General Course",
            timing: "6:00 PM - 8:00 PM",
            branch_code: targetBranchCode,
            available_seats: 25,
            label: "Evening Batch (25 seats available)",
            value: "Evening Batch"
          }
        ];

        setBatches(fallbackBatches);
      }
    } catch (error) {
      console.error('❌ Error fetching batches:', error);

      // Set fallback batches on error
      const fallbackBatches = [
        {
          id: "error_fallback_1",
          batch_name: "Default Morning Batch",
          batch_code: "DEF-MOR",
          course_id: courseId || "default",
          timing: "10:00 AM - 12:00 PM",
          branch_code: branchCode || getFranchiseCode(),
          available_seats: 30,
          label: "Default Morning Batch",
          value: "Default Morning Batch"
        }
      ];

      setBatches(fallbackBatches);
    } finally {
      setBatchesLoading(false);
    }
  };

  // Fetch branches from API using the new enhanced endpoint
  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');

      console.log('🚀 [Frontend] Fetching all branches with branch codes...');

      const response = await fetch(`${API_BASE_URL}/api/branch/branches`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Branches API Response:', data);

        // The API returns branches with comprehensive details including branch_code
        const branchesData = data.branches || data.data || [];

        if (Array.isArray(branchesData) && branchesData.length > 0) {
          console.log(`🏢 Found ${branchesData.length} branches with branch codes`);

          // Transform the data to ensure consistent structure
          const formattedBranches = branchesData.map((branch, index) => {
            const branchCode = branch.franchise_code || branch.branch_code;
            const branchName = branch.display_name || branch.branch_name || branch.franchise_name;

            console.log(`🏢 Branch ${index + 1}: Code=${branchCode}, Name=${branchName}`);

            return {
              id: branch.id,
              _id: branch.id,
              branch_code: branchCode,
              franchise_code: branch.franchise_code,
              branch_name: branchName,
              franchise_name: branch.franchise_name,
              display_name: branchName,
              location: branch.location,
              address: branch.address,
              phone: branch.phone,
              email: branch.email,
              status: branch.status,
              owner: branch.owner
            };
          });

          setBranches(formattedBranches);
          console.log('✅ Branches loaded successfully:', formattedBranches.length);

        } else {
          console.warn('⚠️ No branches found in API response');
          setBranches([]);
        }
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to fetch branches:', errorData);
        throw new Error(errorData.detail || 'Failed to fetch branches');
      }

    } catch (error) {
      console.error('❌ Error fetching branches:', error);

      // Fallback: Try the dropdown endpoint if main endpoint fails
      try {
        console.log('🔄 Trying dropdown endpoint as fallback...');

        const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/api/branch/branches/dropdown`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const dropdownBranches = data.branches || data.options || [];

          if (dropdownBranches.length > 0) {
            console.log('✅ Fallback branches loaded:', dropdownBranches.length);
            setBranches(dropdownBranches.map(branch => ({
              id: branch.id,
              _id: branch.id,
              branch_code: branch.code || branch.value,
              branch_name: branch.label || branch.name,
              display_name: branch.label,
              status: branch.status
            })));
          } else {
            setBranches([]);
          }
        } else {
          setBranches([]);
        }
      } catch (fallbackError) {
        console.error('❌ Fallback endpoint also failed:', fallbackError);
        setBranches([]);
      }
    }
  };

  // Load data on component mount
  useEffect(() => {
    // 1. Try to load from cache immediately (Stale-While-Revalidate)
    const CACHE_KEY_STUDENTS = 'branch_students_list';
    const cachedStudents = localStorage.getItem(CACHE_KEY_STUDENTS);

    if (cachedStudents) {
      try {
        setStudents(JSON.parse(cachedStudents));
        setLoading(false); // Show cached data immediately
      } catch (e) { console.error('Error parsing cached data', e); }
    }

    const loadData = async () => {
      // Don't set loading true if we already showed cached data
      if (!cachedStudents) setLoading(true);
      await fetchBranches();
      await fetchStudents();
      await fetchStates(); // Added fetchStates to ensure location data is available
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle branch code selection specifically
  const handleBranchCodeChange = (e) => {
    const { value } = e.target;

    console.log('🔄 Branch code selection event - UNIQUE VALUE APPROACH:', {
      selectedValue: value,
      valueType: typeof value,
      isEmptyString: value === '',
      selectedIndex: e.target.selectedIndex,
      selectedText: e.target.options[e.target.selectedIndex]?.text,
      allOptions: Array.from(e.target.options).map(opt => ({ value: opt.value, text: opt.text })),
      timestamp: new Date().toISOString()
    });

    // Handle empty selection
    if (value === '' || e.target.selectedIndex === 0) {
      console.log('🧹 User cleared branch selection or selected placeholder');
      setCourses([]);
      setBatches([]);
      setFormData(prev => ({
        ...prev,
        branchCode: '',
        course: '',
        batch: ''
      }));
      return;
    }

    // Parse unique option value to get branch code and index
    if (!value.includes('___')) {
      console.error('❌ Invalid option value format:', value);
      return;
    }

    const [actualBranchCode, indexStr] = value.split('___');
    const branchIndex = parseInt(indexStr);

    if (isNaN(branchIndex) || branchIndex < 0 || branchIndex >= branches.length) {
      console.error('❌ Invalid branch index from option value:', branchIndex);
      return;
    }

    const selectedBranch = branches[branchIndex];

    console.log('🎆 Branch selected successfully:', {
      uniqueOptionValue: value,
      actualBranchCode: actualBranchCode,
      branchIndex: branchIndex,
      selectedBranch: selectedBranch,
      branchName: selectedBranch ? (selectedBranch.display_name || selectedBranch.branch_name) : 'Unknown'
    });

    // Clear existing state first to prevent conflicts
    setCourses([]);
    setBatches([]);

    // Update form data with the unique option value (so dropdown stays selected)
    // but use actual branch code for API calls
    setFormData(prev => ({
      ...prev,
      branchCode: value, // Store the unique value for dropdown selection
      actualBranchCode: actualBranchCode, // Store actual code for API calls
      course: '',
      batch: '',
      regNumber: prev.regNumber // Keep existing reg number
    }));

    // Fetch courses for selected branch using actual branch code
    if (actualBranchCode && actualBranchCode.trim() !== '') {
      console.log('🚀 Fetching courses for branch:', actualBranchCode);
      setTimeout(() => {
        fetchCourses(actualBranchCode);
      }, 100);
    } else {
      console.log('🧹 Branch cleared, resetting form');
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, files } = e.target;

    if (name === 'photo' && files) {
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }));
      return;
    }

    // Debug branch code selection - but prevent handling here
    if (name === 'branchCode') {
      console.warn('⚠️ Branch code change detected in handleInputChange - this should be handled by handleBranchCodeChange only');
      console.log('🔄 Branch code changing from:', formData.branchCode, 'to:', value);
      console.log('🔍 Available branches:', branches);
      // Don't handle branchCode here - let handleBranchCodeChange handle it
      return;
    }

    // Update form data immediately for all fields (except branchCode)
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Handle special cases without blocking the UI
    if (name === 'admissionYear' && !selectedStudent && value) {
      // Update registration number when year changes
      fetchNextRegistrationNumber(value).then(regNumber => {
        if (regNumber) {
          setFormData(prev => ({
            ...prev,
            regNumber: regNumber
          }));
        }
      });
    }

    // Note: Branch code changes are handled by handleBranchCodeChange function
    // to avoid conflicts and ensure proper state management

    // If course is selected, fetch batches for that course and branch
    if (name === 'course' && value && (formData.actualBranchCode || formData.branchCode)) {
      console.log(`🔄 Course selected: ${value}, fetching batches...`);

      // Clear batch selection when course changes
      setFormData(prev => ({
        ...prev,
        batch: ''
      }));

      // Fetch batches for selected course and branch (use actual branch code)
      const branchForAPI = formData.actualBranchCode || formData.branchCode;
      fetchBatches(branchForAPI, value);
    }

    // If state is selected, fetch districts for that state
    if (name === 'state' && value) {
      console.log('🔄 State selected:', value, 'fetching districts...');
      // Clear district field
      setFormData(prev => ({ ...prev, district: '' }));

      // Find state ID from states data
      const selectedState = statesData.find(state => state.state_name === value);
      if (selectedState) {
        setTimeout(() => {
          fetchDistricts(selectedState.state_id);
        }, 100);
      }
    }
  };

  // Get actual branch code from branches data (for API filtering only)
  const getActualBranchCode = () => {
    console.log('🔍 Getting actual branch code for API filtering, branches:', branches);
    if (branches && branches.length > 0) {
      const userBranch = branches[0]; // Use first branch for current user
      console.log('🔍 User branch data:', userBranch);
      const branchCode = userBranch.branch_code || userBranch.franchise_code || userBranch.code;
      console.log('🔍 Extracted branch code:', branchCode);
      return branchCode || '';
    }
    // Fallback to franchise code from token if no branches found
    const franchiseCode = getFranchiseCode();
    console.log('🔍 No branches found, using franchise code fallback:', franchiseCode);
    return franchiseCode || '';
  };

  // Fetch next registration number from backend
  const fetchNextRegistrationNumber = async (admissionYear = null) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      const year = admissionYear || new Date().getFullYear().toString();

      console.log('🔢 [Frontend] Fetching next registration number for year:', year);

      const response = await fetch(`${API_BASE_URL}/api/branch-students/next-registration-number?admission_year=${year}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Next registration number fetched:', data);
        return data.registration_number || '';
      } else {
        console.error('❌ Error fetching next registration number:', response.status);
        return '';
      }
    } catch (error) {
      console.error('❌ Error fetching next registration number:', error);
      return '';
    }
  };

  // Open add student modal
  const openAddModal = async () => {
    const currentYear = new Date().getFullYear().toString();

    console.log('🔄 Opening add modal for new student registration');
    console.log('🧪 Current formData before reset:', formData);
    console.log('🏢 Available branches:', branches.map((b, idx) => ({
      index: idx,
      id: b.id || b._id,
      code: b.branch_code || b.franchise_code,
      name: b.display_name || b.branch_name || b.franchise_name
    })));

    // Check for any duplicate branch codes
    const branchCodes = branches.map(b => b.branch_code || b.franchise_code);
    const duplicateCodes = branchCodes.filter((code, index) => branchCodes.indexOf(code) !== index);
    if (duplicateCodes.length > 0) {
      console.warn('⚠️ Duplicate branch codes found:', duplicateCodes);
    }

    // Clear any existing form state completely
    setCourses([]);
    setBatches([]);

    // Fetch next registration number (we'll get it after branch is selected)
    const nextRegNumber = await fetchNextRegistrationNumber(currentYear);

    const initialFormData = {
      branchCode: '', // Always start empty to force user selection - NO AUTO FILL
      actualBranchCode: '', // Always start empty - will be set when branch is selected
      regNumber: nextRegNumber,
      admissionYear: currentYear,
      studentName: '',
      fatherName: '',
      motherName: '',
      dateOfBirth: '',
      contactNo: '',
      parentContact: '',
      gender: '',
      maritalStatus: '',
      category: '',
      identityType: '',
      idNumber: '',
      state: '',
      district: '',
      pincode: '',
      emailId: '',
      lastGeneralQualification: '',
      religion: '',
      address: '',
      photo: null,
      courseCategory: '',
      course: '',
      batch: '',
      netFee: '',
      discount: '',
      otherCharges: '',
      dateOfAdmission: new Date().toISOString().split('T')[0],
      enquirySource: ''
    };

    console.log('✅ Setting initial form data with empty branch:', initialFormData.branchCode);
    console.log('📋 Full initial form data:', initialFormData);

    setFormData(initialFormData);
    setSelectedStudent(null);
    setCourses([]); // Clear courses until branch is selected
    setBatches([]); // Clear batches until course is selected
    setDistrictsData([]); // Clear districts until state is selected

    setIsAddModalOpen(true);
  };

  // Open edit student modal
  const openEditModal = async (student) => {
    console.log('🔄 Opening edit modal for student:', student);

    // If we don't have full details, fetch them first
    let fullStudentDetails = student;
    if (!student.fullDetails) {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/api/branch-students/students/${student.id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const details = await response.json();
          fullStudentDetails = { ...student, ...details, fullDetails: true };
          console.log('✅ Full student details fetched for edit:', fullStudentDetails);
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch full details, using available data:', error);
      }
    }

    setFormData({
      branchCode: fullStudentDetails.branch_code || '',
      regNumber: fullStudentDetails.registration_number || fullStudentDetails.reg_number || '',
      admissionYear: fullStudentDetails.admission_year || '',
      studentName: fullStudentDetails.student_name || fullStudentDetails.name || '',
      fatherName: fullStudentDetails.father_name || '',
      motherName: fullStudentDetails.mother_name || '',
      dateOfBirth: fullStudentDetails.date_of_birth || '',
      contactNo: fullStudentDetails.contact_no || fullStudentDetails.contact || '',
      parentContact: fullStudentDetails.parent_contact || '',
      gender: fullStudentDetails.gender || '',
      maritalStatus: fullStudentDetails.marital_status || '',
      category: fullStudentDetails.category || '',
      identityType: fullStudentDetails.identity_type || '',
      idNumber: fullStudentDetails.id_number || '',
      state: fullStudentDetails.state || '',
      district: fullStudentDetails.district || '',
      pincode: fullStudentDetails.pincode || '',
      emailId: fullStudentDetails.email_id || fullStudentDetails.email || '',
      lastGeneralQualification: fullStudentDetails.qualification || '',
      religion: fullStudentDetails.religion || '',
      address: fullStudentDetails.address || '',
      photo: null,
      courseCategory: fullStudentDetails.course_category || '',
      course: fullStudentDetails.course || '',
      batch: fullStudentDetails.batch || '',
      netFee: fullStudentDetails.net_fee || fullStudentDetails.fee || '',
      discount: fullStudentDetails.discount || '',
      otherCharges: fullStudentDetails.other_charges || '',
      dateOfAdmission: fullStudentDetails.admission_date || fullStudentDetails.date_of_admission || '',
      enquirySource: fullStudentDetails.enquiry_source || ''
    });

    setSelectedStudent(fullStudentDetails);

    // Load courses and batches for the selected branch
    if (fullStudentDetails.branch_code) {
      await fetchCourses(fullStudentDetails.branch_code);
      if (fullStudentDetails.course) {
        await fetchBatches(fullStudentDetails.branch_code, fullStudentDetails.course);
      }
    }

    setIsEditModalOpen(true);
  };

  // Close modals
  // Close modals
  const closeModals = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setViewDetailsModal(false);
    setSelectedStudent(null);
    setError(null);

    // Clear form data
    setFormData({
      branchCode: '',
      actualBranchCode: '',
      regNumber: '',
      admissionYear: '',
      studentName: '',
      fatherName: '',
      motherName: '',
      dateOfBirth: '',
      contactNo: '',
      parentContact: '',
      gender: '',
      maritalStatus: '',
      category: '',
      identityType: '',
      idNumber: '',
      state: '',
      district: '',
      pincode: '',
      emailId: '',
      lastGeneralQualification: '',
      religion: '',
      address: '',
      photo: null,
      courseCategory: '',
      course: '',
      batch: '',
      netFee: '',
      discount: '',
      otherCharges: '',
      dateOfAdmission: '',
      enquirySource: ''
    });

    // Clear related data
    setCourses([]);
    setBatches([]);
    setDistrictsData([]);
  };

  // Handle form submit with comprehensive validation
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Comprehensive client-side validation
      const validationErrors = [];

      // Required fields validation
      const requiredFields = {
        branchCode: 'Branch Code',
        studentName: 'Student Name',
        fatherName: 'Father Name',
        contactNo: 'Contact Number',
        emailId: 'Email ID',
        dateOfBirth: 'Date of Birth',
        gender: 'Gender',
        course: 'Course',
        batch: 'Batch',
        dateOfAdmission: 'Date of Admission'
      };

      // Check required fields
      for (const [field, label] of Object.entries(requiredFields)) {
        if (field === 'branchCode') {
          // For branch code, check both branchCode (unique value) and actualBranchCode
          if ((!formData[field] || formData[field].trim() === '') && (!formData.actualBranchCode || formData.actualBranchCode.trim() === '')) {
            validationErrors.push(`${label} is required`);
          }
        } else if (!formData[field] || formData[field].trim() === '') {
          validationErrors.push(`${label} is required`);
        }
      }

      // Name validation (only letters and spaces)
      const nameRegex = /^[a-zA-Z\s]+$/;
      if (formData.studentName && !nameRegex.test(formData.studentName)) {
        validationErrors.push('Student name should contain only letters and spaces');
      }

      if (formData.fatherName && !nameRegex.test(formData.fatherName)) {
        validationErrors.push('Father name should contain only letters and spaces');
      }

      if (formData.motherName && formData.motherName.trim() && !nameRegex.test(formData.motherName)) {
        validationErrors.push('Mother name should contain only letters and spaces');
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (formData.emailId && !emailRegex.test(formData.emailId)) {
        validationErrors.push('Please enter a valid email address');
      }

      // Phone validation (Indian format)
      const phoneRegex = /^[6-9]\d{9}$/;
      if (formData.contactNo && !phoneRegex.test(formData.contactNo)) {
        validationErrors.push('Phone number must be 10 digits starting with 6-9');
      }

      // Parent contact validation (if provided)
      if (formData.parentContact && formData.parentContact.trim() && !phoneRegex.test(formData.parentContact)) {
        validationErrors.push('Parent contact must be 10 digits starting with 6-9');
      }

      // Date of birth validation (should be at least 10 years old)
      if (formData.dateOfBirth) {
        const birthDate = new Date(formData.dateOfBirth);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();

        if (age < 10 || age > 100) {
          validationErrors.push('Age must be between 10 and 100 years');
        }
      }

      // Pincode validation (6 digits)
      if (formData.pincode && formData.pincode.trim()) {
        const pincodeRegex = /^\d{6}$/;
        if (!pincodeRegex.test(formData.pincode)) {
          validationErrors.push('Pincode must be exactly 6 digits');
        }
      }

      // ID number validation (if provided)
      if (formData.idNumber && formData.idNumber.trim()) {
        const idRegex = /^[A-Z0-9]{6,20}$/;
        if (!idRegex.test(formData.idNumber.toUpperCase())) {
          validationErrors.push('ID number must be 6-20 characters (letters and numbers only)');
        }
      }

      // Fee validation (if provided)
      if (formData.netFee && formData.netFee.trim()) {
        const fee = parseFloat(formData.netFee);
        if (isNaN(fee) || fee < 0) {
          validationErrors.push('Net fee must be a valid positive number');
        }
      }

      if (formData.discount && formData.discount.trim()) {
        const discount = parseFloat(formData.discount);
        if (isNaN(discount) || discount < 0) {
          validationErrors.push('Discount must be a valid positive number');
        }
      }

      // Show all validation errors
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join('\n'));
      }

      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');

      console.log('✅ [Validation] All validations passed');
      console.log('✅ [Validation] Branch Code:', formData.branchCode);
      console.log('✅ [Validation] Franchise Code:', getFranchiseCode());

      // Prepare student data according to backend schema
      const studentData = {
        registration_number: formData.regNumber,
        student_name: formData.studentName,
        email_id: formData.emailId,
        contact_no: formData.contactNo,
        course: formData.course,
        batch: formData.batch,
        branch_code: formData.actualBranchCode || formData.branchCode,
        franchise_code: getFranchiseCode(),
        admission_status: "Active",
        // Additional fields for comprehensive student record
        father_name: formData.fatherName || '',
        mother_name: formData.motherName || '',
        date_of_birth: formData.dateOfBirth || '',
        gender: formData.gender || '',
        marital_status: formData.maritalStatus || '',
        category: formData.category || '',
        identity_type: formData.identityType || '',
        id_number: formData.idNumber || '',
        state: formData.state || '',
        district: formData.district || '',
        pincode: formData.pincode || '',
        religion: formData.religion || '',
        address: formData.address || '',
        qualification: formData.lastGeneralQualification || '',
        admission_year: formData.admissionYear || new Date().getFullYear().toString(),
        parent_contact: formData.parentContact || '',
        course_category: formData.courseCategory || '',
        net_fee: formData.netFee ? parseFloat(formData.netFee) : 0,
        discount: formData.discount ? parseFloat(formData.discount) : 0,
        other_charges: formData.otherCharges ? parseFloat(formData.otherCharges) : 0,
        admission_date: formData.dateOfAdmission || new Date().toISOString().split('T')[0],
        enquiry_source: formData.enquirySource || ''
      };

      console.log('📤 [Frontend] Prepared student data:', studentData);

      const url = selectedStudent
        ? `${API_BASE_URL}/api/branch-students/students/${selectedStudent.id}`
        : `${API_BASE_URL}/api/branch-students/students/register`;

      const method = selectedStudent ? 'PUT' : 'POST';

      console.log(`🚀 [Frontend] Calling ${method} ${url}`);

      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(studentData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Student saved successfully:', result);

        // Close modals first to prevent stale data
        closeModals();

        // Refresh students list 
        await fetchStudents();

        // Show success message with green styling
        setSuccessMessage(`✅ Success! Student ${selectedStudent ? 'updated' : 'added'} successfully!`);
        setError(null);

        // Auto-dismiss success message after 4 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 4000);
      } else {
        const errorText = await response.text();
        console.error('❌ API Error Response:', response.status, errorText);
        throw new Error(`Failed to ${selectedStudent ? 'update' : 'add'} student: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Error saving student:', error);
      setError(error.message || `Error ${selectedStudent ? 'updating' : 'adding'} student. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete student
  const handleDelete = async (studentId) => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');

      console.log(`🚀 [Frontend] Calling DELETE /api/branch-students/students/${studentId}`);

      const response = await fetch(`${API_BASE_URL}/api/branch-students/students/${studentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Student deleted successfully:', result);

        // Close delete confirmation modal
        setDeleteConfirm({ show: false, studentId: null });

        // Remove from local state immediately for better UX
        setStudents(prev => {
          const updatedStudents = prev.filter(student => student.id !== studentId);
          console.log(`📊 Updated local state: ${updatedStudents.length} students remaining`);
          return updatedStudents;
        });

        // Show success message
        setError(null);

        // Refresh the entire students list from server to ensure consistency
        console.log('🔄 Refreshing students list from server...');
        setTimeout(async () => {
          try {
            await fetchStudents({ page: 1, limit: 100 });
            console.log('✅ Students list refreshed successfully');
          } catch (refreshError) {
            console.error('❌ Error refreshing students list:', refreshError);
          }
        }, 500);

      } else {
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || 'Failed to delete student';
        } catch {
          errorMessage = `HTTP ${response.status}: Failed to delete student`;
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ Error deleting student:', error);
      setError(`Delete failed: ${error.message}`);
      // Don't close the modal on error so user can try again
    } finally {
      setSubmitting(false);
    }
  };

  // Handle print student data
  const handlePrint = (student) => {
    // Create printable content
    const printContent = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="text-align: center; color: #333;">Student Details</h2>
        <hr>
        <p><strong>Registration Number:</strong> ${student.reg_number || ''}</p>
        <p><strong>Name:</strong> ${student.name || ''}</p>
        <p><strong>Course:</strong> ${student.course || ''}</p>
        <p><strong>Contact:</strong> ${student.contact || ''}</p>
        <p><strong>Email:</strong> ${student.email || ''}</p>
        <p><strong>Address:</strong> ${student.address || ''}</p>
        <p><strong>Fee:</strong> ₹${student.fee || 0}</p>
        <p><strong>Status:</strong> ${student.status || 'Active'}</p>
        <hr>
        <p style="text-align: center; color: #666; margin-top: 20px;">
          Generated on: ${new Date().toLocaleDateString()}
        </p>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  // Handle view student details - now opens modal instead of alert
  const handleViewDetails = async (student) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');

      console.log(`🚀 [Frontend] Fetching fresh details for student: ${student.id}`);
      console.log(`🔍 [Frontend] Student data passed to view:`, student);

      const response = await fetch(`${API_BASE_URL}/api/branch-students/students/${student.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const studentDetails = await response.json();
        console.log('✅ Fresh student details from API:', studentDetails);
        console.log('🔍 Field-by-field analysis:');
        Object.keys(studentDetails).forEach(key => {
          console.log(`  - ${key}:`, studentDetails[key]);
        });

        // Use actual API data without fallbacks - let's see what's really there
        const completeStudentData = {
          ...student, // Table data
          ...studentDetails, // Fresh API data - use as-is
          fullDetails: true
        };

        console.log('📊 Complete student data for view (mapped):', completeStudentData);

        // Update selectedStudent with full details and open modal
        setSelectedStudent(completeStudentData);
        setViewDetailsModal(true);
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to fetch details:', errorData);

        // Fallback: Show available data with better mapping
        const fallbackData = {
          ...student,
          registration_number: student.reg_number || student.student_registration || 'Not Available',
          student_name: student.name || student.student_name || 'Name not available',
          email_id: student.email || 'Not provided',
          contact_no: student.contact || 'Not provided',
          course: student.course || 'Not assigned',
          batch: student.batch || 'Not assigned',
          admission_status: student.status || 'Active',
          net_fee: student.fee || 0,
          fullDetails: false,
          error: 'Could not fetch complete details from server'
        };

        setSelectedStudent(fallbackData);
        setViewDetailsModal(true);
      }
    } catch (error) {
      console.error('❌ Error fetching student details:', error);

      // Fallback: Show available data with error message
      const fallbackData = {
        ...student,
        registration_number: student.reg_number || 'Not Available',
        student_name: student.name || 'Name not available',
        email_id: student.email || 'Not provided',
        contact_no: student.contact || 'Not provided',
        course: student.course || 'Not assigned',
        batch: student.batch || 'Not assigned',
        fullDetails: false,
        error: `Connection error: ${error.message}`
      };

      setSelectedStudent(fallbackData);
      setViewDetailsModal(true);
    }
  };

  // Toggle student status
  const toggleStudentStatus = async (studentId, currentStatus) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';

      console.log(`🚀 [Frontend] Toggling student status to: ${newStatus}`);

      const response = await fetch(`${API_BASE_URL}/api/branch-students/students/${studentId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          admission_status: newStatus
        })
      });

      console.log(`📡 Toggle Response Status: ${response.status}`);

      if (response.ok) {
        console.log('✅ Student status updated successfully');

        // Clear any existing errors
        setError(null);

        // Update local state
        setStudents(prev => prev.map(student =>
          student.id === studentId ? { ...student, status: newStatus } : student
        ));

        // Show success alert instead of error message
        alert(`Student status updated to ${newStatus} successfully`);
      } else {
        // API failed but we'll update locally as fallback
        console.warn('⚠️ API failed, updating locally');
        setStudents(prev => prev.map(student =>
          student.id === studentId ? { ...student, status: newStatus } : student
        ));

        // Show alert instead of persistent error
        alert(`Status changed locally to ${newStatus}. API update failed.`);
      }
    } catch (error) {
      console.error('❌ Error updating student status:', error);
      // Fallback to local update
      const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
      setStudents(prev => prev.map(student =>
        student.id === studentId ? { ...student, status: newStatus } : student
      ));

      // Show alert instead of persistent error
      alert(`Status changed locally to ${newStatus}. Connection error: ${error.message}`);
    }
  };

  // Handle search with backend API
  const handleSearch = () => {
    const searchFilters = {};

    // Combine all search terms into a single search query for backend
    const combinedSearch = [searchTerm, searchName, searchContact].filter(Boolean).join(' ');
    if (combinedSearch) {
      searchFilters.search = combinedSearch;
    }

    console.log('🔍 Performing search with filters:', searchFilters);
    fetchStudents(searchFilters);
  };

  // Auto-reload functionality removed as per user request

  // For now, show all students without client-side filtering since backend handles it
  const filteredStudents = students;

  if (loading && students.length === 0) {
    return (
      <BranchLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <FaSpinner className="text-4xl text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading students...</p>
          </div>
        </div>
      </BranchLayout>
    );
  }

  if (error) {
    return (
      <BranchLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <FaTrash className="text-4xl text-red-600 mb-4" />
          <p className="text-gray-600 text-lg">Error loading students</p>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              fetchStudents();
            }}
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded"
          >
            Try Again
          </button>
        </div>
      </BranchLayout>
    );
  }

  return (
    <BranchLayout>
      <div className="p-6">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                <FaUserGraduate className="text-white text-xl" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Manage Students</h1>
                <p className="text-sm text-gray-500">View and manage all student records</p>
              </div>
            </div>
            <button
              onClick={openAddModal}
              className="flex items-center justify-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 w-full md:w-auto"
            >
              <FaPlus className="mr-2" /> Can Add New Student
            </button>
          </div>
        </div>

        {/* Search Filters */}
        <div className="bg-amber-900 p-4 rounded-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="USERNAME / REG NUMBER"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-white bg-amber-800 placeholder-gray-300"
            />
            <input
              type="text"
              placeholder="TYPE STUDENT NAME"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-white bg-amber-800 placeholder-gray-300"
            />
            <input
              type="text"
              placeholder="TYPE CONTACT NO"
              value={searchContact}
              onChange={(e) => setSearchContact(e.target.value)}
              className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-white bg-amber-800 placeholder-gray-300"
            />
            <button
              onClick={handleSearch}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded flex items-center justify-center font-medium transition-colors duration-200"
            >
              <FaSearch className="mr-2" />
              Search
            </button>
          </div>
          <div className="mt-3 flex justify-end items-center">
            <button
              onClick={() => {
                setSearchTerm('');
                setSearchName('');
                setSearchContact('');
                fetchStudents({ page: 1, limit: 100 });
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-1 rounded text-sm transition-colors duration-200"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Mobile View (Cards) */}
        <div className="md:hidden space-y-4">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white rounded-2xl shadow-sm">
              <FaUsers className="text-4xl mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No students found</p>
            </div>
          ) : (
            filteredStudents.map((student) => (
              <div key={student.id} className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      {student.photo_url ? (
                        <img src={student.photo_url} alt={student.name} className="w-full h-full object-cover" />
                      ) : (
                        <FaUserGraduate className="text-gray-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{student.name}</h3>
                      <p className="text-xs text-gray-500">Reg: {student.reg_number}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${student.status === 'Active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                    }`}>
                    {student.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-2 rounded mb-3">
                  <div>
                    <span className="text-gray-500 block">Course:</span>
                    <span className="font-medium truncate">{student.course}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Batch:</span>
                    <span className="font-medium">{student.batch}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Contact:</span>
                    <span className="font-medium">{student.contact}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Fee:</span>
                    <span className="font-medium">₹{student.fee}</span>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <button onClick={() => handleViewDetails(student)} className="p-2 text-blue-600 bg-blue-50 rounded-lg"><FaEye /></button>
                  <button onClick={() => openEditModal(student)} className="p-2 text-amber-600 bg-amber-50 rounded-lg"><FaEdit /></button>
                  <button onClick={() => setDeleteConfirm({ show: true, studentId: student.id })} className="p-2 text-red-600 bg-red-50 rounded-lg"><FaTrash /></button>
                  <button onClick={() => handlePrint(student)} className="p-2 text-purple-600 bg-purple-50 rounded-lg"><FaPrint /></button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Students Table */}
        <div className="hidden md:block bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Student Info</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Course Detail</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      <FaUsers className="text-4xl mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">No students found</p>
                      <p className="text-sm">Try adjusting your search or filters</p>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {student.photo_url ? (
                              <img src={student.photo_url} alt={student.name} className="w-full h-full object-cover" />
                            ) : (
                              <FaUserGraduate className="text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{student.name}</p>
                            <p className="text-xs text-gray-500">Reg: {student.reg_number}</p>
                            <p className="text-xs text-gray-400">ID: {student.registration_password}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{student.course}</p>
                          <p className="text-xs text-gray-500">Batch: {student.batch}</p>
                          <p className="text-xs text-gray-500">Fee: ₹{student.fee}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="flex items-center text-sm text-gray-600">
                            <FaPhone className="mr-2 text-xs text-gray-400" />
                            {student.contact}
                          </div>
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <FaEnvelope className="mr-2 text-xs text-gray-400" />
                            {student.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${student.status === 'Active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}>
                          {student.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleViewDetails(student)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <FaEye className="text-lg" />
                          </button>
                          <button
                            onClick={() => openEditModal(student)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <FaEdit className="text-lg" />
                          </button>
                          <button
                            onClick={() => handlePrint(student)}
                            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Print Details"
                          >
                            <FaPrint className="text-lg" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ show: true, studentId: student.id })}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <FaTrash className="text-lg" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing <span className="font-medium text-gray-900">{filteredStudents.length}</span> students
            </div>
            <div className="flex space-x-2">
              <button
                disabled
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-400 bg-gray-100 cursor-not-allowed"
              >
                Previous
              </button>
              <button
                disabled
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-400 bg-gray-100 cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Add/Edit Student Modal */}
        {(isAddModalOpen || isEditModalOpen) && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg p-6 w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                  <FaUserGraduate className="text-2xl text-gray-600 mr-3" />
                  <h2 className="text-xl font-bold text-gray-800">
                    {selectedStudent ? 'EDIT STUDENT' : 'STUDENT REGISTRATION'}
                  </h2>
                </div>
                <button
                  onClick={closeModals}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Personal Details Section */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-purple-600 mb-4 flex items-center">
                    <FaUsers className="mr-2" />
                    1. PERSONAL DETAILS
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Row 1 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        BRANCH CODE *
                      </label>
                      <select
                        name="branchCode"
                        value={(() => {
                          console.log('🎯 Dropdown rendering with:', {
                            formDataBranchCode: formData.branchCode,
                            branches: branches.map(b => ({
                              code: b.branch_code || b.franchise_code,
                              name: b.display_name || b.branch_name
                            })),
                            selectedValue: formData.branchCode || ''
                          });
                          return formData.branchCode || '';
                        })()}
                        onChange={handleBranchCodeChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                        required
                      >
                        <option value="" disabled={false}>--- Select Branch Code ---</option>
                        {branches.length === 0 ? (
                          <option disabled>Loading branches...</option>
                        ) : (
                          branches.map((branch, index) => {
                            const branchCode = branch.branch_code || branch.franchise_code;
                            const branchName = branch.display_name || branch.branch_name || branch.franchise_name;
                            const location = branch.location ? ` (${branch.location})` : '';

                            // Only show branches that have valid branch codes
                            if (!branchCode) {
                              console.warn('⚠️ Branch without code found:', branch);
                              return null;
                            }

                            // Create unique option value to handle duplicate branch codes
                            const uniqueOptionValue = `${branchCode}___${index}`;

                            // Enhanced display with branch code, name, and location
                            const displayText = branchName
                              ? `${branchCode} - ${branchName}${location}`
                              : branchCode;

                            console.log('🏷️ Creating unique branch option:', {
                              index,
                              branchCode,
                              branchName,
                              displayText,
                              uniqueOptionValue,
                              isCurrentlySelected: uniqueOptionValue === formData.branchCode,
                              currentFormBranchCode: formData.branchCode
                            });

                            return (
                              <option
                                key={`branch-${index}-${branchCode}`}
                                value={uniqueOptionValue}
                                title={`${branchCode} - ${branchName} ${branch.address || ''}`}
                              >
                                {displayText}
                              </option>
                            );
                          }).filter(Boolean)
                        )}
                      </select>
                      {branches.length > 0 && (
                        <p className="text-xs text-gray-600 mt-1">
                          📋 {branches.length} branch{branches.length !== 1 ? 'es' : ''} available
                        </p>
                      )}
                      {!formData.branchCode && (
                        <p className="text-xs text-orange-600 mt-1">
                          ⚠️ Please select a branch to load available courses
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        REG. * {!selectedStudent && <span className="text-xs text-orange-600">(Auto-generated)</span>}
                      </label>
                      <input
                        type="text"
                        name="regNumber"
                        value={formData.regNumber}
                        onChange={handleInputChange}
                        placeholder={selectedStudent ? "Enter registration number" : "Auto-generated..."}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 ${!selectedStudent ? 'bg-gray-50 text-gray-600' : ''}`}
                        readOnly={!selectedStudent}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ADMISSION YEAR *
                      </label>
                      <select
                        name="admissionYear"
                        value={formData.admissionYear}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                        required
                      >
                        <option value="">Select year</option>
                        {Array.from({ length: 10 }, (_, i) => {
                          const year = new Date().getFullYear() - i;
                          return (
                            <option key={year} value={year.toString()}>
                              {year}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Row 2 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Student Name *
                      </label>
                      <input
                        type="text"
                        name="studentName"
                        value={formData.studentName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Father's Name *
                      </label>
                      <input
                        type="text"
                        name="fatherName"
                        value={formData.fatherName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mother's Name
                      </label>
                      <input
                        type="text"
                        name="motherName"
                        value={formData.motherName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Row 3 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date Of Birth*
                      </label>
                      <input
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contact No *
                      </label>
                      <input
                        type="tel"
                        name="contactNo"
                        value={formData.contactNo}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Parent's Contact
                      </label>
                      <input
                        type="tel"
                        name="parentContact"
                        value={formData.parentContact}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Row 4 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gender *
                      </label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                        required
                      >
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Marital Status
                      </label>
                      <select
                        name="maritalStatus"
                        value={formData.maritalStatus}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">Select</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last General Qualification
                      </label>
                      <select
                        name="lastGeneralQualification"
                        value={formData.lastGeneralQualification}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">Select</option>
                        <option value="10th">10th</option>
                        <option value="12th">12th</option>
                        <option value="Graduate">Graduate</option>
                        <option value="Post Graduate">Post Graduate</option>
                      </select>
                    </div>

                    {/* Row 5 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category
                      </label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">Select</option>
                        <option value="General">General</option>
                        <option value="OBC">OBC</option>
                        <option value="SC">SC</option>
                        <option value="ST">ST</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Your Religion
                      </label>
                      <select
                        name="religion"
                        value={formData.religion}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">Select</option>
                        <option value="Hindu">Hindu</option>
                        <option value="Muslim">Muslim</option>
                        <option value="Christian">Christian</option>
                        <option value="Sikh">Sikh</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Choose Your Identity Type
                      </label>
                      <select
                        name="identityType"
                        value={formData.identityType}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">Select</option>
                        <option value="Aadhaar">Aadhaar Card</option>
                        <option value="PAN">PAN Card</option>
                        <option value="Driving License">Driving License</option>
                        <option value="Voter ID">Voter ID</option>
                      </select>
                    </div>

                    {/* Row 6 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Id Number *
                      </label>
                      <input
                        type="text"
                        name="idNumber"
                        value={formData.idNumber}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State *
                      </label>
                      <select
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                        required
                        disabled={loadingStates}
                      >
                        <option value="">Select State</option>
                        {loadingStates ? (
                          <option disabled>Loading states...</option>
                        ) : (
                          statesData.map(state => (
                            <option key={state.state_id} value={state.state_name}>
                              {state.state_name}
                            </option>
                          ))
                        )}
                      </select>
                      {loadingStates && (
                        <p className="text-xs text-blue-600 mt-1">Loading states...</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        District *
                      </label>
                      <select
                        name="district"
                        value={formData.district}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                        disabled={!formData.state || loadingDistricts}
                        required
                      >
                        <option value="">Select District</option>
                        {loadingDistricts ? (
                          <option disabled>Loading districts...</option>
                        ) : !formData.state ? (
                          <option disabled>Please select a state first</option>
                        ) : districtsData.length === 0 ? (
                          <option disabled>No districts found for selected state</option>
                        ) : (
                          districtsData.map(district => (
                            <option key={district.district_id} value={district.district_name}>
                              {district.district_name}
                            </option>
                          ))
                        )}
                      </select>
                      {!formData.state && (
                        <p className="text-xs text-orange-600 mt-1">Please select a state first</p>
                      )}
                      {loadingDistricts && (
                        <p className="text-xs text-blue-600 mt-1">Loading districts...</p>
                      )}
                    </div>

                    {/* Row 7 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Id *
                      </label>
                      <input
                        type="email"
                        name="emailId"
                        value={formData.emailId}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pincode *
                      </label>
                      <input
                        type="text"
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Photo
                      </label>
                      <div className="flex flex-col">
                        <input
                          type="file"
                          name="photo"
                          onChange={handleInputChange}
                          accept="image/*"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <small className="text-red-500 mt-1">Photo must be in jpg/jpeg/bmp 4nd 5o less then 500KB</small>
                      </div>
                    </div>

                    {/* Address - Full Width */}
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address
                      </label>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        rows="3"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Course Details Section */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-purple-600 mb-4 flex items-center">
                    <FaFileAlt className="mr-2" />
                    2. COURSE DETAILS
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Course Category *
                      </label>
                      <select
                        name="courseCategory"
                        value={formData.courseCategory}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                        required
                      >
                        <option value="">-- COURSE CATEGORY --</option>
                        <option value="Computer Science">Computer Science</option>
                        <option value="Science">Science</option>
                        <option value="Commerce">Commerce</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Course *
                      </label>
                      <div className="flex space-x-2">
                        <select
                          name="course"
                          value={formData.course}
                          onChange={handleInputChange}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                          required
                          disabled={!formData.branchCode}
                        >
                          <option value="">-- Courses --</option>
                          {coursesLoading ? (
                            <option disabled>Loading courses...</option>
                          ) : courses && courses.length > 0 ? (
                            courses.map((course, index) => {
                              const courseValue = course.course_name || course.value || course.name || course.title || `course_${index}`;
                              const courseLabel = course.label || course.course_name || course.name || course.title || `Course ${index + 1}`;

                              return (
                                <option key={course.id || `course_${index}`} value={courseValue}>
                                  {courseLabel}
                                </option>
                              );
                            })
                          ) : (
                            <option disabled>
                              {!formData.branchCode
                                ? 'Please select a branch first'
                                : courses === null
                                  ? 'Loading courses...'
                                  : 'No courses available for selected branch'
                              }
                            </option>
                          )}
                        </select>
                      </div>
                      {!formData.branchCode && (
                        <p className="text-xs text-orange-600 mt-1">
                          Please select a branch first to load courses
                        </p>
                      )}
                      {formData.branchCode && courses && courses.length === 0 && !coursesLoading && (
                        <p className="text-xs text-blue-600 mt-1">
                          Debug: Branch "{formData.branchCode}" selected. Try console: window.debugCourses(); window.refetchCourses();
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Batch *
                      </label>
                      <div className="flex space-x-2">
                        <select
                          name="batch"
                          value={formData.batch}
                          onChange={handleInputChange}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                          required
                          disabled={!formData.course}
                        >
                          <option value="">-- Select Batch --</option>
                          {batchesLoading ? (
                            <option disabled>Loading batches...</option>
                          ) : batches.length > 0 ? (
                            batches.map(batch => (
                              <option key={batch.id} value={batch.batch_name || batch.value}>
                                {batch.label || `${batch.batch_name} (${batch.available_seats || 'N/A'} seats)`}
                              </option>
                            ))
                          ) : (
                            <option disabled>
                              {formData.course ? 'No batches available for selected course' : 'Please select a course first'}
                            </option>
                          )}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        NET FEE
                      </label>
                      <input
                        type="number"
                        name="netFee"
                        value={formData.netFee}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        DISCOUNT
                      </label>
                      <input
                        type="number"
                        name="discount"
                        value={formData.discount}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Other Charges
                      </label>
                      <input
                        type="number"
                        name="otherCharges"
                        value={formData.otherCharges}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date of Admission *
                      </label>
                      <input
                        type="date"
                        name="dateOfAdmission"
                        value={formData.dateOfAdmission}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Enquiry Source
                      </label>
                      <select
                        name="enquirySource"
                        value={formData.enquirySource}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">Select</option>
                        <option value="Online">Online</option>
                        <option value="Walk-in">Walk-in</option>
                        <option value="Referral">Referral</option>
                        <option value="Advertisement">Advertisement</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center space-x-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-lg flex items-center font-medium transition-colors duration-200 disabled:opacity-50"
                  >
                    {submitting ? <FaSpinner className="animate-spin mr-2" /> : null}
                    {selectedStudent ? 'Update Student' : 'Submit'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModals}
                    className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg flex items-center font-medium transition-colors duration-200"
                  >
                    Exit
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm.show && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl border border-white/20">
              <div className="flex items-center mb-4">
                <FaTrash className="text-red-600 text-2xl mr-3" />
                <h3 className="text-lg font-semibold text-gray-800">Confirm Delete</h3>
              </div>

              <p className="text-gray-600 mb-2">
                Are you sure you want to <span className="font-semibold text-red-600">permanently delete</span> this student?
              </p>
              <p className="text-sm text-red-500 mb-6">
                ⚠️ This will also delete all related records (ID cards, certificates, payments, results).
                This action cannot be undone.
              </p>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteConfirm({ show: false, studentId: null })}
                  disabled={submitting}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm.studentId)}
                  disabled={submitting}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 flex items-center"
                >
                  {submitting ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <FaTrash className="mr-2" />
                      Delete Permanently
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Details Modal */}
        {viewDetailsModal && selectedStudent && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                  <FaUserGraduate className="text-2xl text-amber-600 mr-3" />
                  <h2 className="text-xl font-bold text-gray-800">Student Details</h2>
                </div>
                <button
                  onClick={() => {
                    setViewDetailsModal(false);
                    setSelectedStudent(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    <FaUserCheck className="mr-2" />
                    Personal Information
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Registration Number:</span>
                      <span className="text-gray-800 font-mono bg-amber-50 px-2 py-1 rounded">
                        {selectedStudent.student_registration || selectedStudent.registration_number || selectedStudent.reg_number || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Name:</span>
                      <span className="text-gray-800 font-semibold text-amber-600">
                        {selectedStudent.student_name || selectedStudent.name || 'N/A'}
                      </span>
                    </div>
                    {selectedStudent.father_name && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Father's Name:</span>
                        <span className="text-gray-800">{selectedStudent.father_name}</span>
                      </div>
                    )}
                    {selectedStudent.mother_name && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Mother's Name:</span>
                        <span className="text-gray-800">{selectedStudent.mother_name}</span>
                      </div>
                    )}
                    {selectedStudent.date_of_birth && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Date of Birth:</span>
                        <span className="text-gray-800">{new Date(selectedStudent.date_of_birth).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedStudent.gender && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Gender:</span>
                        <span className="text-gray-800">{selectedStudent.gender}</span>
                      </div>
                    )}
                    {selectedStudent.category && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Category:</span>
                        <span className="text-gray-800">{selectedStudent.category}</span>
                      </div>
                    )}
                    {selectedStudent.religion && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Religion:</span>
                        <span className="text-gray-800">{selectedStudent.religion}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    <FaPhone className="mr-2" />
                    Contact Information
                  </h3>
                  <div className="space-y-2">
                    {(selectedStudent.email_id || selectedStudent.email) && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Email:</span>
                        <span className="text-gray-800">
                          <a href={`mailto:${selectedStudent.email_id || selectedStudent.email}`} className="text-amber-600 hover:underline">
                            {selectedStudent.email_id || selectedStudent.email}
                          </a>
                        </span>
                      </div>
                    )}
                    {(selectedStudent.contact_no || selectedStudent.contact) && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Contact:</span>
                        <span className="text-gray-800">
                          <a href={`tel:${selectedStudent.contact_no || selectedStudent.contact}`} className="text-amber-600 hover:underline">
                            {selectedStudent.contact_no || selectedStudent.contact}
                          </a>
                        </span>
                      </div>
                    )}
                    {selectedStudent.parent_contact && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Parent Contact:</span>
                        <span className="text-gray-800">
                          <a href={`tel:${selectedStudent.parent_contact}`} className="text-amber-600 hover:underline">
                            {selectedStudent.parent_contact}
                          </a>
                        </span>
                      </div>
                    )}
                    {selectedStudent.state && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">State:</span>
                        <span className="text-gray-800">{selectedStudent.state}</span>
                      </div>
                    )}
                    {selectedStudent.district && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">District:</span>
                        <span className="text-gray-800">{selectedStudent.district}</span>
                      </div>
                    )}
                    {selectedStudent.pincode && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Pincode:</span>
                        <span className="text-gray-800">{selectedStudent.pincode}</span>
                      </div>
                    )}
                    {selectedStudent.address && (
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-gray-600">Address:</span>
                        <span className="text-gray-800 text-right">{selectedStudent.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Course Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    <FaFileAlt className="mr-2" />
                    Course Information
                  </h3>
                  <div className="space-y-2">
                    {(selectedStudent.course || selectedStudent.course_name) && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Course:</span>
                        <span className="text-gray-800 font-semibold text-amber-600">
                          {selectedStudent.course || selectedStudent.course_name}
                        </span>
                      </div>
                    )}
                    {(selectedStudent.batch || selectedStudent.batch_name) && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Batch:</span>
                        <span className="text-gray-800">
                          {selectedStudent.batch || selectedStudent.batch_name}
                        </span>
                      </div>
                    )}
                    {selectedStudent.branch_code && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Branch Code:</span>
                        <span className="text-gray-800 font-mono bg-gray-100 px-2 py-1 rounded">
                          {selectedStudent.branch_code}
                        </span>
                      </div>
                    )}
                    {selectedStudent.admission_year && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Admission Year:</span>
                        <span className="text-gray-800">{selectedStudent.admission_year}</span>
                      </div>
                    )}
                    {(selectedStudent.admission_date || selectedStudent.date_of_admission) && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Admission Date:</span>
                        <span className="text-gray-800">
                          {new Date(selectedStudent.admission_date || selectedStudent.date_of_admission).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {(selectedStudent.qualification || selectedStudent.last_general_qualification) && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Qualification:</span>
                        <span className="text-gray-800">
                          {selectedStudent.qualification || selectedStudent.last_general_qualification}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    <FaUserCog className="mr-2" />
                    Status & Fee Information
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Status:</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${(selectedStudent.admission_status || selectedStudent.status) === 'Active' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'}`}>
                        {selectedStudent.admission_status || selectedStudent.status || 'Active'}
                      </span>
                    </div>
                    {(selectedStudent.net_fee || selectedStudent.fee) && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Net Fee:</span>
                        <span className="text-gray-800 font-semibold">₹{selectedStudent.net_fee || selectedStudent.fee}</span>
                      </div>
                    )}
                    {selectedStudent.discount > 0 && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Discount:</span>
                        <span className="text-gray-800">₹{selectedStudent.discount}</span>
                      </div>
                    )}
                    {selectedStudent.other_charges > 0 && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Other Charges:</span>
                        <span className="text-gray-800">₹{selectedStudent.other_charges}</span>
                      </div>
                    )}
                    {selectedStudent.enquiry_source && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Enquiry Source:</span>
                        <span className="text-gray-800">{selectedStudent.enquiry_source}</span>
                      </div>
                    )}
                    {selectedStudent.created_at && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Created:</span>
                        <span className="text-gray-800 text-sm">
                          {new Date(selectedStudent.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {selectedStudent.error && (
                      <div className="flex justify-between">
                        <span className="font-medium text-red-600">⚠️ Note:</span>
                        <span className="text-red-600 text-sm">{selectedStudent.error}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setViewDetailsModal(false);
                    setSelectedStudent(null);
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg z-50">
            <div className="flex items-center">
              <FaTimes className="mr-2" />
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-3 text-red-600 hover:text-red-800"
              >
                <FaTimes />
              </button>
            </div>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-lg z-50 animate-pulse">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {successMessage}
              <button
                onClick={() => setSuccessMessage(null)}
                className="ml-3 text-green-600 hover:text-green-800"
              >
                <FaTimes />
              </button>
            </div>
          </div>
        )}
      </div>
    </BranchLayout>
  );
};

export default ManageStudents;