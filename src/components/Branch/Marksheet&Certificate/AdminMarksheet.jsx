import React, { useState, useEffect, useRef } from 'react';
import { FaFileAlt, FaPlus, FaEdit, FaTrash, FaSearch, FaEye, FaDownload, FaPrint, FaCalculator, FaChartBar, FaGraduationCap, FaUsers } from 'react-icons/fa';
import { certificatesApi } from '../../../api/certificatesApi';
import { generateMarksheet, printMarksheet, printBulkMarksheets, downloadMarksheet } from '../../../utils/marksheetGenerator';
import { getUserData } from '../../../utils/authUtils';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const AdminMarksheet = () => {

  // Utility function to generate STRONGLY cache-busted image URLs (same as certificates)
  const getCacheBustedImageUrl = (imagePath) => {
    if (!imagePath) return null;

    // Clean the path
    let cleanPath = imagePath.replace(/\\/g, '/');

    // If it's a full URL, extract just the path part
    if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
      try {
        const url = new URL(cleanPath);
        cleanPath = url.pathname.substring(1); // Remove leading slash
      } catch (e) {
        console.error('Invalid URL:', cleanPath);
      }
    }

    // Remove any leading slashes
    cleanPath = cleanPath.replace(/^\/+/, '');

    // Use current timestamp + random values to ensure uniqueness every time
    const timestamp = new Date().getTime();
    const randomId = Math.random().toString(36).substring(2, 15);
    const sessionId = Math.random().toString(36).substring(2, 10);
    const uniqueKey = Math.random().toString(36).substring(2, 12);
    const cacheBuster = `?cb=${timestamp}&v=${randomId}&sid=${sessionId}&uk=${uniqueKey}&nocache=true&_=${Date.now()}`;

    // Always use API_BASE_URL for consistency
    const baseUrl = `${API_BASE_URL}/${cleanPath}`;
    return `${baseUrl}${cacheBuster}`;
  };

  const [marksheets, setMarksheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedMarksheet, setSelectedMarksheet] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Backend data
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [branches, setBranches] = useState([]);
  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Template paths
  const MARKSHEET_TEMPLATE_PATH = 'uploads/Marksheet/marksheet.jpeg';
  const MARKSHEET_OUTPUT_PATH = 'uploads/Marksheet/generated';

  // Form state for marksheet creation/editing
  const [formData, setFormData] = useState({
    student_id: '',
    course_id: '',
    semester: '',
    session_year: '',

    // NURCLM Template Fields
    student_name: '',
    father_name: '',
    mother_name: '',
    student_photo: null,
    branch_name: '',
    branch_code: '',
    branch_address: '',
    atc_name: '',  // ATC Name (same as branch_name)
    atc_address: '',  // ATC Address (same as branch_address)
    course_code: '',
    course_name: '',
    student_id_number: '',
    join_date: '',
    issue_date: new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '/'),
    sr_number: '',

    // Institute and Authority Information
    head_of_institute_name: 'Head of the Institute',
    head_signature: null,
    director_name: 'Director',
    director_signature: null,


    subjects: [
      {
        name: '',
        theory_marks: '',
        theory_max: '100',
        practical_marks: '0',
        practical_max: '0',
        grade: ''
      }
    ],
    total_marks: '',
    obtained_marks: '',
    percentage: '',
    grade: '',
    result: 'pass',
    status: 'pass',
    template: 'marksheet-fixed',
    template_path: MARKSHEET_TEMPLATE_PATH,
    use_uploaded_template: false
  });

  const statusOptions = ['draft', 'published', 'withheld'];
  const resultOptions = ['pass', 'fail', 'compartment'];
  const gradeOptions = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'];

  // Marksheet generation state
  const [generatedMarksheet, setGeneratedMarksheet] = useState(null);
  const [generatingMarksheet, setGeneratingMarksheet] = useState(false);
  const [selectedMarksheets, setSelectedMarksheets] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState(null);

  // Reset form function
  const resetForm = () => {
    setFormData({
      student_id: '',
      course_id: '',
      semester: '',
      session_year: '',

      // Student Information
      student_name: '',
      father_name: '',
      mother_name: '',
      student_photo: null,
      branch_name: '',
      branch_code: '',
      branch_address: '',
      atc_name: '',
      atc_address: '',
      course_code: '',
      course_name: '',
      student_id_number: '',
      join_date: '',
      issue_date: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/\//g, '/'),
      sr_number: '',

      // Institute and Authority Information
      head_of_institute_name: 'Head of the Institute',
      head_signature: null,
      director_name: 'Director',
      director_signature: null,

      // Additional Registration Details
      registration_type: 'SKILLWALLAH',
      iso_certification: 'ISO 9001:2015 CERTIFIED ORGANISATION',
      qr_code_data: '',
      verification_url: 'https://skillwallah.com/marksheet-verify?id=',

      subjects: [
        {
          name: '',
          theory_marks: '',
          theory_max: '100',
          practical_marks: '0',
          practical_max: '0',
          grade: ''
        }
      ],
      total_marks: '',
      obtained_marks: '',
      percentage: '',
      grade: '',
      result: 'pass',
      status: 'pass',
      template: 'marksheet-fixed',
      template_path: MARKSHEET_TEMPLATE_PATH,
      use_uploaded_template: false
    });
    setSelectedStudent(null);
  };

  // Removed template management state - using fixed template only

  // QR Code generation function
  const generateQRCodeData = (studentId, registrationNumber) => {
    return `${formData.verification_url}${registrationNumber || studentId}`;
  };

  // Generate serial number for marksheet
  const generateSerialNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `00${timestamp.slice(-2)}${random}`;
  };

  // Load marksheets from API
  const loadMarksheets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await certificatesApi.getMarksheets();
      console.log('📊 [MARKSHEET] Raw API response:', data);

      // Extract marksheets array from response
      const marksheetsData = data?.marksheets || data || [];

      // Process marksheets - don't pre-cache URLs, generate fresh ones on demand
      const processedMarksheets = Array.isArray(marksheetsData) ? marksheetsData : [];

      setMarksheets(processedMarksheets);
      console.log('✅ [MARKSHEET] Loaded marksheets:', processedMarksheets.length);
    } catch (error) {
      console.error('Error loading marksheets:', error);
      setError('Failed to load marksheets. Please try again.');
      setMarksheets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarksheets();
    loadStudents();
    loadBatches();
    loadCourses();
    loadBranchInfo();
    // Removed template loading - using fixed template only
  }, []);

  // Removed template loading functions - using fixed template path only

  // Load branch information for auto-population
  const loadBranchInfo = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');

      console.log('🏢 [MARKSHEET] Loading branch info for user:', userData);

      if (!token || !userData) {
        console.warn('⚠️ [MARKSHEET] Missing auth token or user data');
        return;
      }

      // Set default branch information from user data
      const defaultBranchInfo = {
        branch_name: userData.branch_name || userData.center_name || userData.institute_name || 'SkillWallah EdTech',
        branch_code: userData.branch_code || userData.franchise_code || '',
        branch_address: userData.branch_address || userData.center_address || userData.institute_address || 'Educational Institute'
      };

      console.log('🏢 [MARKSHEET] Default branch info:', defaultBranchInfo);

      // Try to fetch additional branch details from API
      try {
        const branchCode = defaultBranchInfo.branch_code;
        if (branchCode) {
          const response = await fetch(`http://localhost:4000/api/branch/details?branch_code=${branchCode}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const branchDetails = await response.json();
            console.log('🏢 [MARKSHEET] API branch details:', branchDetails);

            if (branchDetails.success && branchDetails.branch) {
              defaultBranchInfo.branch_name = branchDetails.branch.branch_name || defaultBranchInfo.branch_name;
              defaultBranchInfo.branch_address = branchDetails.branch.branch_address || defaultBranchInfo.branch_address;
            }
          }
        }
      } catch (apiError) {
        console.warn('⚠️ [MARKSHEET] Could not fetch additional branch details:', apiError);
      }

      // Update form data with branch information
      setFormData(prev => ({
        ...prev,
        ...defaultBranchInfo
      }));

      console.log('✅ [MARKSHEET] Branch info loaded and set');
    } catch (error) {
      console.error('💥 [MARKSHEET] Error loading branch info:', error);
    }
  };

  // Load students from backend
  const loadStudents = async () => {
    try {
      setStudentsLoading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      console.log('🎓 [MARKSHEET] Loading students with token:', token ? 'Present' : 'Missing');

      if (!token) {
        console.warn('❌ [MARKSHEET] No authentication token found');
        setStudents([]);
        setStudentsLoading(false);
        return;
      }

      // Get user context for branch filtering
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const branchCode = userData.branch_code || userData.franchise_code;
      console.log('🏢 [MARKSHEET] Using branch context:', { branchCode, userData: userData });

      // Build API URL with proper parameters
      const queryParams = new URLSearchParams();
      if (branchCode) {
        queryParams.append('branch_code', branchCode);
      }
      queryParams.append('page', '1');
      queryParams.append('limit', '1000'); // Get all students

      queryParams.append('exclude_id_card', 'true');
      const apiUrl = `http://localhost:4000/api/branch-students/students?${queryParams.toString()}`;
      console.log('📡 [MARKSHEET] API URL:', apiUrl);

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📊 [MARKSHEET] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [MARKSHEET] API Error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ [MARKSHEET] Raw API Response:', data);

      let studentsData = [];

      // Handle different response formats
      if (data && data.success && Array.isArray(data.students)) {
        studentsData = data.students;
      } else if (data && Array.isArray(data.data)) {
        studentsData = data.data;
      } else if (Array.isArray(data)) {
        studentsData = data;
      } else if (data && Array.isArray(data.students)) {
        studentsData = data.students;
      } else {
        console.warn('⚠️ [MARKSHEET] Unexpected response format:', data);
        studentsData = [];
      }

      console.log('📚 [MARKSHEET] Processed students:', { count: studentsData.length, data: studentsData });

      if (studentsData.length > 0) {
        console.log('👤 [MARKSHEET] First student sample:', studentsData[0]);
      } else {
        console.warn('⚠️ [MARKSHEET] No students found');
      }

      setStudents(studentsData);
    } catch (error) {
      console.error('💥 [MARKSHEET] Error loading students:', error);
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  // Load batches from backend using the correct API
  const loadBatches = async () => {
    try {
      setBatchesLoading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      console.log('👥 [MARKSHEET] Loading batches with token:', token ? 'Present' : 'Missing');

      if (!token) {
        console.warn('❌ [MARKSHEET] No authentication token found');
        setBatches([]);
        setBatchesLoading(false);
        return;
      }

      // Get user context for branch filtering
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const branchCode = userData.branch_code || userData.franchise_code;
      console.log('🏢 [MARKSHEET] Using branch context for batches:', { branchCode });

      // Build API URL with proper parameters
      const queryParams = new URLSearchParams();
      if (branchCode) {
        queryParams.append('branch_code', branchCode);
      }
      queryParams.append('page', '1');
      queryParams.append('limit', '1000'); // Get all batches

      const apiUrl = `http://localhost:4000/api/branch-batches/batches?${queryParams.toString()}`;
      console.log('📡 [MARKSHEET] Batches API URL:', apiUrl);

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📊 [MARKSHEET] Batches response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [MARKSHEET] Batches API Error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ [MARKSHEET] Raw Batches API Response:', data);

      let batchesData = [];

      // Handle different response formats
      if (data && data.success && Array.isArray(data.batches)) {
        batchesData = data.batches;
      } else if (data && Array.isArray(data.data)) {
        batchesData = data.data;
      } else if (Array.isArray(data)) {
        batchesData = data;
      } else if (data && Array.isArray(data.batches)) {
        batchesData = data.batches;
      } else {
        console.warn('⚠️ [MARKSHEET] Unexpected batches response format:', data);
        batchesData = [];
      }

      console.log(`✅ [MARKSHEET] Loaded ${batchesData.length} batches`);
      setBatches(batchesData);

    } catch (error) {
      console.error('❌ [MARKSHEET] Error loading batches:', error);
      setBatches([]);
    } finally {
      setBatchesLoading(false);
    }
  };

  // Load courses from backend
  const loadCourses = async () => {
    try {
      setCoursesLoading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      console.log('📚 [MARKSHEET] Loading courses with token:', token ? 'Present' : 'Missing');

      // Use the working API endpoint
      const endpoint = 'http://localhost:4000/api/branch-courses/courses';
      console.log('🔍 [MARKSHEET] Loading courses from:', endpoint);

      let coursesData = [];

      try {
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ [MARKSHEET] Courses API Response:', data);

          // Handle different response formats
          if (Array.isArray(data)) {
            coursesData = data;
          } else if (data.success && Array.isArray(data.courses)) {
            coursesData = data.courses;
          } else if (data.data && Array.isArray(data.data)) {
            coursesData = data.data;
          } else if (data.courses && Array.isArray(data.courses)) {
            coursesData = data.courses;
          } else {
            console.warn('⚠️ [MARKSHEET] Unexpected courses response format:', data);
            coursesData = [];
          }

          // Filter active courses only
          const activeCoursesData = coursesData.filter(course => course.is_active !== false);
          console.log('🔍 [MARKSHEET] Active courses found:', activeCoursesData.length);

          // Process course data for consistent format
          const processedCourses = activeCoursesData.map(course => ({
            id: course.id || course._id,
            course_name: course.course_name || course.name || course.title,
            course_code: course.course_code || course.code,
            name: course.course_name || course.name || course.title
          }));

          console.log('📚 [MARKSHEET] Processed courses:', { count: processedCourses.length, data: processedCourses });
          setCourses(processedCourses);

          if (processedCourses.length === 0) {
            console.warn('⚠️ [MARKSHEET] No active courses found');
          }
        } else {
          console.error('❌ [MARKSHEET] Failed to load courses:', response.status);
          setCourses([]);
        }
      } catch (error) {
        console.error('❌ [MARKSHEET] Error loading courses:', error.message);
        setCourses([]);
      }

    } catch (error) {
      console.error('💥 [MARKSHEET] Error loading courses:', error);
      setCourses([]);
    } finally {
      setCoursesLoading(false);
    }
  };

  // Load subjects when course is selected
  const loadSubjects = async (courseId) => {
    try {
      setSubjectsLoading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      console.log('📖 [MARKSHEET] Loading subjects for course:', courseId, 'with token:', token ? 'Present' : 'Missing');

      if (!courseId) {
        console.log('📖 [MARKSHEET] No course selected, clearing subjects');
        setSubjects([]);
        setSubjectsLoading(false);
        return;
      }

      // Get user context for branch filtering
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const branchCode = userData.branch_code || userData.franchise_code;

      // Try multiple possible endpoints
      const possibleEndpoints = [
        `http://localhost:4000/api/branch-subjects/subjects?course_id=${courseId}${branchCode ? `&branch_code=${branchCode}` : ''}`,
        `http://localhost:4000/api/subjects?course_id=${courseId}`,
        `http://localhost:4000/subjects?course_id=${courseId}`,
        `http://localhost:4000/api/subjects/course/${courseId}`,
        `http://localhost:4000/api/subjects?course_id=${courseId}`,
        `http://localhost:4000/subjects?course_id=${courseId}`
      ];

      let subjectsData = [];
      let success = false;

      for (const endpoint of possibleEndpoints) {
        try {
          console.log('🔍 [MARKSHEET] Trying subjects endpoint:', endpoint);

          const response = await fetch(endpoint, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            console.log('✅ [MARKSHEET] Subjects API Response from', endpoint, ':', data);

            // Handle different response formats
            if (Array.isArray(data)) {
              subjectsData = data;
            } else if (data.success && Array.isArray(data.subjects)) {
              subjectsData = data.subjects;
            } else if (data.data && Array.isArray(data.data)) {
              subjectsData = data.data;
            } else if (data.subjects && Array.isArray(data.subjects)) {
              subjectsData = data.subjects;
            } else {
              console.warn('⚠️ [MARKSHEET] Unexpected subjects response format from', endpoint, ':', data);
              continue;
            }

            success = true;
            break;
          } else {
            console.warn('⚠️ [MARKSHEET] Endpoint failed:', endpoint, response.status);
          }
        } catch (endpointError) {
          console.warn('⚠️ [MARKSHEET] Error with endpoint:', endpoint, endpointError.message);
          continue;
        }
      }

      if (success) {
        // Ensure subjects have proper structure
        const processedSubjects = subjectsData.map(subject => ({
          id: subject.id || subject._id,
          subject_name: subject.subject_name || subject.name || subject.title,
          subject_code: subject.subject_code || subject.code,
          name: subject.subject_name || subject.name || subject.title
        }));

        console.log('📖 [MARKSHEET] Processed subjects:', { count: processedSubjects.length, data: processedSubjects });
        setSubjects(processedSubjects);

        if (processedSubjects.length === 0) {
          console.warn('⚠️ [MARKSHEET] No subjects found for course:', courseId);
        }
      } else {
        console.error('❌ [MARKSHEET] All subject endpoints failed for course:', courseId);
        setSubjects([]);
      }

    } catch (error) {
      console.error('💥 [MARKSHEET] Error loading subjects:', error);
      setSubjects([]);
    } finally {
      setSubjectsLoading(false);
    }
  };

  // Handle student selection
  const handleStudentSelect = (studentId) => {
    const student = students.find(s => s.id === studentId || s._id === studentId);
    console.log('🎓 [MARKSHEET] Selected student:', student);
    setSelectedStudent(student);

    if (!student) {
      console.warn('⚠️ [MARKSHEET] Student not found for ID:', studentId);
      return;
    }

    // Generate QR code data and registration number
    const registrationNumber = student?.registration_number || `U85300UP2020NPL${studentId.toString().padStart(6, '0')}`;
    const qrData = generateQRCodeData(studentId, registrationNumber);

    // Convert admission date to YYYY-MM-DD format for date input
    let joinDateFormatted = '';
    if (student?.admission_date) {
      const admissionDate = new Date(student.admission_date);
      if (!isNaN(admissionDate.getTime())) {
        joinDateFormatted = admissionDate.toISOString().split('T')[0];
      }
    }

    // Get current date in YYYY-MM-DD format
    const currentDate = new Date().toISOString().split('T')[0];

    // Get user data for fallback branch information
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    // Determine best branch information (priority: student data, then user data, then defaults)
    const branchInfo = {
      branch_code: student?.branch_code || student?.center_code || student?.branch || student?.center || userData?.branch_code || userData?.franchise_code || '',
      branch_name: student?.branch_name || student?.center_name || student?.institute_name || userData?.branch_name || userData?.center_name || userData?.institute_name || 'SkillWallah EdTech',
      branch_address: student?.branch_address || student?.center_address || student?.institute_address || userData?.branch_address || userData?.center_address || userData?.institute_address || 'Educational Institute'
    };

    console.log('🏢 [MARKSHEET] Branch info for student:', branchInfo);

    setFormData(prev => ({
      ...prev,
      student_id: studentId,
      course_id: student?.course || student?.course_id || '',

      // Auto-fill branch/centre information
      ...branchInfo,
      atc_name: branchInfo.branch_name,
      atc_address: branchInfo.branch_address,

      // Auto-fill fields from student data
      student_name: student?.name || student?.student_name || '',
      father_name: student?.father_name || '',
      mother_name: student?.mother_name || '',
      student_photo: student?.photo_url || student?.photo || student?.photo_path || null,
      student_id_number: student?.registration_number || student?.student_id || student?.id || studentId,
      join_date: joinDateFormatted,
      issue_date: currentDate,
      sr_number: generateSerialNumber(),
      qr_code_data: qrData,

      // Institute and Authority Information - Use branch name as head
      head_of_institute_name: `Head of ${branchInfo.branch_name}`,
      director_name: 'Director',

      // Additional Registration Details
      registration_type: 'SKILLWALLAH',
      iso_certification: 'ISO 9001:2015 CERTIFIED ORGANISATION',
      verification_url: 'https://skillwallah.com/marksheet-verify?id='
    }));

    // Load subjects if student has a course
    const courseId = student?.course || student?.course_id;
    if (courseId) {
      console.log('🔄 [MARKSHEET] Auto-loading subjects for student course:', courseId);
      loadSubjects(courseId);
    }
  };

  // Handle course selection
  const handleCourseSelect = (courseId) => {
    const course = courses.find(c =>
      c.id === parseInt(courseId) ||
      c._id === courseId ||
      c.id === courseId
    );

    console.log('Selected course:', course, 'from courses:', courses);

    if (course) {
      setFormData(prev => ({
        ...prev,
        course_id: courseId,
        course_code: course.course_code || course.code || course.short_name || courseId.toString().toUpperCase(),
        course_name: course.course_name || course.name || course.title || ''
      }));
    } else {
      console.warn('Course not found for ID:', courseId);
    }

    loadSubjects(courseId);
  };

  // Filter marksheets
  const filteredMarksheets = Array.isArray(marksheets) ? marksheets.filter(sheet => {
    const matchesSearch = sheet.student_name?.toLowerCase().startsWith(searchTerm.toLowerCase()) ||
      sheet.studentName?.toLowerCase().startsWith(searchTerm.toLowerCase()) ||
      sheet.course_name?.toLowerCase().startsWith(searchTerm.toLowerCase()) ||
      sheet.courseName?.toLowerCase().startsWith(searchTerm.toLowerCase());
    const matchesResult = statusFilter === '' || sheet.result === statusFilter;
    const matchesSemester = semesterFilter === '' || sheet.semester === semesterFilter;
    return matchesSearch && matchesResult && matchesSemester;
  }) : [];

  // Handle create new marksheet
  const handleCreate = () => {
    setFormData({
      student_id: '',
      course_id: '',
      semester: '',
      session_year: '',
      subjects: [
        { name: '', full_marks: '', obtained_marks: '', grade: '' }
      ],
      total_marks: '',
      obtained_marks: '',
      percentage: '',
      grade: '',
      result: 'pass',
      status: 'draft'
    });
    setSelectedMarksheet(null);
    setShowModal(true);
  };

  // Handle edit marksheet
  const handleEdit = (marksheet) => {
    setFormData({
      student_id: marksheet.student_id || '',
      course_id: marksheet.course_id || '',
      semester: marksheet.semester || '',
      session_year: marksheet.session_year || '',
      subjects: marksheet.subjects || [{ name: '', full_marks: '', obtained_marks: '', grade: '' }],
      total_marks: marksheet.total_marks || '',
      obtained_marks: marksheet.obtained_marks || '',
      percentage: marksheet.percentage || '',
      grade: marksheet.grade || '',
      result: marksheet.result || 'pass',
      status: marksheet.result || 'pass' // Set status same as result for consistency
    });
    setSelectedMarksheet(marksheet);
    setShowModal(true);
  };

  // Add subject to form
  const addSubject = () => {
    setFormData(prev => ({
      ...prev,
      subjects: [...prev.subjects, {
        name: '',
        theory_marks: '',
        theory_max: '100',
        practical_marks: '0',
        practical_max: '0',
        grade: ''
      }]
    }));
  };

  // Remove subject from form
  const removeSubject = (index) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.filter((_, i) => i !== index)
    }));
  };

  // Update subject in form
  const updateSubject = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.map((subject, i) =>
        i === index ? { ...subject, [field]: value } : subject
      )
    }));
  };

  // Calculate totals
  const calculateTotals = () => {
    const totalMarks = formData.subjects.reduce((sum, subject) => {
      const theoryMax = parseInt(subject.theory_max) || 0;
      const practicalMax = parseInt(subject.practical_max) || 0;
      return sum + theoryMax + practicalMax;
    }, 0);

    const obtainedMarks = formData.subjects.reduce((sum, subject) => {
      const theoryMarks = parseInt(subject.theory_marks) || 0;
      const practicalMarks = parseInt(subject.practical_marks) || 0;
      return sum + theoryMarks + practicalMarks;
    }, 0);

    const percentage = totalMarks > 0 ? ((obtainedMarks / totalMarks) * 100).toFixed(2) : 0;

    let grade = 'F';
    if (percentage >= 90) grade = 'A+';
    else if (percentage >= 80) grade = 'A';
    else if (percentage >= 70) grade = 'B+';
    else if (percentage >= 60) grade = 'B';
    else if (percentage >= 50) grade = 'C+';
    else if (percentage >= 40) grade = 'C';
    else if (percentage >= 33) grade = 'D';

    const finalResult = percentage >= 33 ? 'pass' : 'fail';

    setFormData(prev => ({
      ...prev,
      total_marks: totalMarks,
      obtained_marks: obtainedMarks,
      percentage: parseFloat(percentage),
      grade,
      result: finalResult,
      status: finalResult
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      calculateTotals();

      if (selectedMarksheet) {
        // Backend doesn't support update, so we'll just create a new one
        alert('Updating marksheets is not supported. Please create a new one.');
        return;
      } else {
        try {
          // Get selected student and course data
          if (!Array.isArray(students)) {
            alert('Students data is not loaded. Please refresh the page and try again.');
            return;
          }
          if (!Array.isArray(courses)) {
            alert('Courses data is not loaded. Please refresh the page and try again.');
            return;
          }

          const studentData = students.find(s => (s.id || s._id) === formData.student_id);
          const courseData = courses.find(c => (c.id || c._id) === formData.course_id);

          console.log('🔍 [MARKSHEET] Debug info:', {
            selectedStudentId: formData.student_id,
            selectedCourseId: formData.course_id,
            studentData: {
              id: studentData?.id,
              _id: studentData?._id,
              name: studentData?.name || studentData?.student_name,
              branch_code: studentData?.branch_code,
              registration_number: studentData?.registration_number
            },
            courseData: {
              id: courseData?.id,
              _id: courseData?._id,
              name: courseData?.name || courseData?.course_name,
              course_code: courseData?.course_code
            },
            allStudents: students.slice(0, 3).map(s => ({
              id: s.id || s._id,
              name: s.name || s.student_name,
              branch_code: s.branch_code
            })),
            allCourses: courses.slice(0, 3).map(c => ({
              id: c.id || c._id,
              name: c.name || c.course_name,
              course_code: c.course_code
            }))
          });

          if (!studentData || !courseData) {
            const missingData = [];
            if (!studentData) missingData.push('student');
            if (!courseData) missingData.push('course');
            alert(`Please select a valid ${missingData.join(' and ')}.`);
            return;
          }

          // Ensure IDs are properly formatted as strings for backend
          const cleanStudentId = String(studentData.id || studentData._id).trim();
          const cleanCourseId = String(courseData.id || courseData._id).trim();

          console.log('🆔 [MARKSHEET] Clean IDs:', { cleanStudentId, cleanCourseId });

          // Validate ObjectId format (MongoDB ObjectId should be 24 character hex string)
          const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

          if (!isValidObjectId(cleanStudentId)) {
            console.error('❌ [MARKSHEET] Invalid student ID format:', cleanStudentId);
            alert(`Invalid student ID format: ${cleanStudentId}. Please contact support.`);
            return;
          }

          if (!isValidObjectId(cleanCourseId)) {
            console.error('❌ [MARKSHEET] Invalid course ID format:', cleanCourseId);
            alert(`Invalid course ID format: ${cleanCourseId}. Please contact support.`);
            return;
          }

          // Get current user's branch info for validation
          const userData = JSON.parse(localStorage.getItem('userData') || '{}');
          const userBranchCode = userData.branch_code || userData.franchise_code;

          console.log('🏢 [MARKSHEET] User branch info:', { userBranchCode, studentBranchCode: studentData.branch_code });

          // Validate required form data
          if (!formData.student_name) {
            alert('Student name is required. Please select a student first.');
            return;
          }

          if (!formData.semester) {
            alert('Please select a semester.');
            return;
          }

          if (!formData.subjects || formData.subjects.length === 0) {
            alert('Please add at least one subject with marks.');
            return;
          }

          // Validate subjects data
          const validSubjects = formData.subjects.filter(subject =>
            subject.name &&
            !isNaN(parseInt(subject.theory_marks)) &&
            parseInt(subject.theory_marks) >= 0
          );

          if (validSubjects.length === 0) {
            alert('Please ensure at least one subject has a valid name and theory marks.');
            return;
          }

          console.log('📊 [MARKSHEET] Subjects validation:', {
            totalSubjects: formData.subjects.length,
            validSubjects: validSubjects.length,
            subjects: formData.subjects
          });

          // Prepare photo URL - upload photo first if it's a File
          let photoUrl = null;

          console.log('📷 [MARKSHEET] Photo debug:', {
            student_photo_type: formData.student_photo ? (formData.student_photo instanceof File ? 'File' : typeof formData.student_photo) : 'null',
            student_photo_value: formData.student_photo instanceof File ? formData.student_photo.name : formData.student_photo,
            studentData_photo_url: studentData?.photo_url,
            studentData_photo: studentData?.photo,
            studentData_student_photo: studentData?.student_photo,
            selectedStudent_photo_url: selectedStudent?.photo_url
          });

          if (formData.student_photo instanceof File) {
            // Upload photo to backend first
            console.log('📷 [MARKSHEET] Uploading photo file to backend...', formData.student_photo.name);
            try {
              const photoFormData = new FormData();
              photoFormData.append('photo', formData.student_photo);
              photoFormData.append('student_id', cleanStudentId);

              const uploadResponse = await fetch(`${API_BASE_URL}/api/branch/students/upload-photo`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`
                },
                body: photoFormData
              });

              console.log('📷 [MARKSHEET] Upload response status:', uploadResponse.status);

              if (uploadResponse.ok) {
                const uploadResult = await uploadResponse.json();
                photoUrl = uploadResult.photo_url;
                console.log('📷 [MARKSHEET] Photo uploaded successfully:', photoUrl);
              } else {
                const errorText = await uploadResponse.text();
                console.warn('📷 [MARKSHEET] Photo upload failed:', uploadResponse.status, errorText);
                photoUrl = studentData?.photo_url || studentData?.photo || studentData?.student_photo || selectedStudent?.photo_url || null;
              }
            } catch (uploadErr) {
              console.error('📷 [MARKSHEET] Photo upload error:', uploadErr);
              photoUrl = studentData?.photo_url || studentData?.photo || studentData?.student_photo || selectedStudent?.photo_url || null;
            }
          } else if (formData.student_photo && typeof formData.student_photo === 'string') {
            // Already a URL string
            photoUrl = formData.student_photo;
            console.log('📷 [MARKSHEET] Using existing photo URL from form:', photoUrl);
          } else {
            // Try to get from student data
            photoUrl = studentData?.photo_url || studentData?.photo || studentData?.student_photo || selectedStudent?.photo_url || null;
            console.log('📷 [MARKSHEET] Using photo URL from student data:', photoUrl);
          }

          // Add cache-busting to photo URL to ensure fresh image is loaded
          if (photoUrl && typeof photoUrl === 'string') {
            // Remove any existing query parameters first
            const basePhotoUrl = photoUrl.split('?')[0];
            // Add unique timestamp to prevent caching
            const cacheBuster = `?t=${Date.now()}&r=${Math.random().toString(36).substring(7)}`;
            photoUrl = `${basePhotoUrl}${cacheBuster}`;
            console.log('📷 [MARKSHEET] Photo URL with cache-busting:', photoUrl);
          }

          console.log('📷 [MARKSHEET] Final photo URL for marksheet:', photoUrl);

          // Prepare marksheet data
          const marksheetData = {
            student_id: cleanStudentId,
            course_id: cleanCourseId,
            semester: parseInt(formData.semester),
            session_year: formData.session_year,

            // Template information - Use form data
            template: formData.template || 'marksheet-fixed',
            template_path: formData.template_path || MARKSHEET_TEMPLATE_PATH,
            use_template: formData.use_uploaded_template !== undefined ? formData.use_uploaded_template : true,

            // Template fields
            student_name: formData.student_name,
            father_name: formData.father_name,
            mother_name: formData.mother_name,
            photo_url: photoUrl,  // Send photo_url to backend
            atc_name: formData.atc_name,
            atc_address: formData.atc_address,
            course_code: formData.course_code,
            student_id_number: formData.student_id_number,
            join_date: formData.join_date,
            issue_date: formData.issue_date,
            sr_number: formData.sr_number,

            // Convert subjects to standard format
            subjects_results: validSubjects.map(subject => ({
              subject_name: subject.name,
              theory_marks: parseInt(subject.theory_marks) || 0,
              theory_max: parseInt(subject.theory_max) || 100,
              practical_marks: parseInt(subject.practical_marks) || 0,
              practical_max: parseInt(subject.practical_max) || 0
            })),

            total_marks: parseFloat(formData.total_marks) || 100,
            obtained_marks: parseFloat(formData.obtained_marks) || 0,
            percentage: parseFloat(formData.percentage) || 0,
            overall_grade: formData.grade || 'C',
            status: formData.result || 'pass',
            result: formData.result || 'pass'
          };

          console.log('📋 [MARKSHEET] Creating new marksheet with data:', {
            ...marksheetData,
            template_info: {
              template: marksheetData.template,
              template_path: marksheetData.template_path,
              use_template: marksheetData.use_template
            },
            debug_info: {
              original_student_id: formData.student_id,
              original_course_id: formData.course_id,
              student_found: !!studentData,
              course_found: !!courseData,
              user_branch: userBranchCode,
              student_branch: studentData?.branch_code,
              student_object_keys: Object.keys(studentData || {}),
              course_object_keys: Object.keys(courseData || {})
            }
          });

          // FORCE THE TEMPLATE PATH TO BE EXPLICIT
          console.log('🎨 [MARKSHEET] TEMPLATE INFO:', {
            forcedTemplate: 'marksheet-jpeg',
            forcedPath: '/uploads/Marksheet/Marksheet.jpeg',
            useTemplate: true
          });

          // Create new marksheet with backend
          const response = await certificatesApi.generateMarksheet(marksheetData);
          console.log('✅ [MARKSHEET] Backend response:', response);

          // Show success message
          alert(`🎉 Marksheet created successfully!\n\n📋 Student: ${formData.student_name}\n📚 Course: ${formData.course_code || courseData.course_name || courseData.name}\n🎯 Percentage: ${formData.percentage}%\n✅ Result: ${formData.result.toUpperCase()}\n\nMarksheet has been generated successfully!`);

          // Reset form and close modal
          setShowModal(false);
          resetForm();

          // Reload marksheets list to show the new marksheet
          await loadMarksheets();
        } catch (dataError) {
          console.error('💥 [MARKSHEET] Error in data preparation or API call:', dataError);

          // Handle data preparation errors
          if (dataError.message && dataError.message.includes('Cannot read properties')) {
            alert('Error accessing student or course data. Please refresh the page and try again.');
          } else if (dataError.message && dataError.message.includes('Invalid student ID')) {
            alert('Invalid student ID format. Please contact support.');
          } else if (dataError.message && dataError.message.includes('Invalid course ID')) {
            alert('Invalid course ID format. Please contact support.');
          } else {
            // Re-throw to be caught by outer catch
            throw dataError;
          }
        }
      }

      setShowModal(false);
    } catch (error) {
      console.error('💥 [MARKSHEET] Error saving marksheet:', error);

      // More specific error messages based on error type
      let errorMessage = 'Failed to save marksheet. Please try again.';

      if (error.message && error.message.includes('Student not found')) {
        errorMessage = `Student not found in database.\n\nPlease check:\n1. Student exists in the system\n2. Student belongs to your branch\n3. Student ID is valid\n\nStudent ID: ${formData.student_id}`;
      } else if (error.message && error.message.includes('Course not found')) {
        errorMessage = `Course not found in database.\n\nCourse ID: ${formData.course_id}`;
      } else if (error.message && error.message.includes('Branch not found')) {
        errorMessage = 'Branch information not found. Please contact support.';
      } else if (error.message && error.message.includes('400')) {
        errorMessage = `Invalid data provided:\n${error.message}`;
      } else if (error.message && error.message.includes('500')) {
        errorMessage = `Server error occurred:\n${error.message}`;
      }

      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete marksheet
  const handleDelete = async (marksheetId) => {
    if (window.confirm('Are you sure you want to delete this marksheet?')) {
      try {
        await certificatesApi.deleteMarksheet(marksheetId);
        alert('Marksheet deleted successfully!');
        await loadMarksheets(); // Reload the list
      } catch (error) {
        console.error('Error deleting marksheet:', error);
        alert('Failed to delete marksheet.');
      }
    }
  };

  // Handle preview marksheet - toggles inline view
  const handlePreview = async (marksheet) => {
    try {
      setPreviewError(false);

      // Toggle logic: if already expanded, close it
      if (expandedRowId === (marksheet.id || marksheet._id)) {
        setExpandedRowId(null);
        return;
      }

      console.log('📊 expanding marksheet row for:', marksheet);

      // Expand the row
      setExpandedRowId(marksheet.id || marksheet._id);

      // Check if marksheet has a generated file from backend  
      if (marksheet.file_path) {
        console.log('📸 Marksheet file path exists:', marksheet.file_path);
        // We just expanded the row, the render logic will handle the image display
        return;
      }

      // If no file path, generate it first in INLINE mode
      console.log('⚠️ No file path found, generating marksheet inline...');
      await handleGenerateMarksheet(marksheet, true); // true = inline mode

    } catch (error) {
      console.error('Error opening marksheet preview:', error);
      alert('Failed to open marksheet preview: ' + error.message);
    }
  };

  // Handle download marksheet
  const handleDownload = async (marksheet) => {
    try {
      console.log('💾 Downloading marksheet for:', marksheet);

      // Get student and course data
      const studentData = students.find(s => (s.id || s._id) === marksheet.student_id);
      const courseData = courses.find(c => (c.id || c._id) === marksheet.course_id);

      if (!studentData || !courseData) {
        throw new Error('Student or course data not found');
      }

      // Prepare marksheet data
      const marksheetData = {
        student_name: studentData.student_name || studentData.name,
        student_registration: studentData.registration_number || studentData.username,
        course_name: courseData.course_name || courseData.name,
        semester: marksheet.semester,
        session_year: marksheet.session_year,
        subjects: marksheet.subjects || [],
        total_marks: marksheet.total_marks,
        obtained_marks: marksheet.obtained_marks,
        percentage: marksheet.percentage,
        grade: marksheet.grade,
        result: marksheet.result
      };

      const userData = getUserData();
      const branchData = {
        branchName: userData?.branch_name || 'SkillWallah EdTech',
        template: marksheet.template_path || MARKSHEET_TEMPLATE_PATH
      };

      // Generate download using fixed template
      const marksheetImage = await generateMarksheet(marksheetData, branchData);
      const fileName = `${marksheet.semester}_${studentData.student_name.replace(/\s+/g, '_')}_Marksheet.png`;
      downloadMarksheet(marksheetImage, fileName);

      alert('Marksheet downloaded successfully!');
    } catch (error) {
      console.error('Error downloading marksheet:', error);
      alert('Failed to download marksheet: ' + error.message);
    }
  };

  // Handle print marksheet
  const handlePrintMarksheet = async (marksheet) => {
    try {
      console.log('🖨️ Printing marksheet for:', marksheet);

      // Get student and course data
      const studentData = students.find(s => (s.id || s._id) === marksheet.student_id);
      const courseData = courses.find(c => (c.id || c._id) === marksheet.course_id);

      if (!studentData || !courseData) {
        throw new Error('Student or course data not found');
      }

      // Prepare marksheet data
      const marksheetData = {
        student_name: studentData.student_name || studentData.name,
        student_registration: studentData.registration_number || studentData.username,
        course_name: courseData.course_name || courseData.name,
        semester: marksheet.semester,
        session_year: marksheet.session_year,
        subjects: marksheet.subjects || [],
        total_marks: marksheet.total_marks,
        obtained_marks: marksheet.obtained_marks,
        percentage: marksheet.percentage,
        grade: marksheet.grade,
        result: marksheet.result
      };

      const userData = getUserData();
      const branchData = {
        branchName: userData?.branch_name || 'SkillWallah EdTech',
        template: marksheet.template_path || MARKSHEET_TEMPLATE_PATH
      };

      // Generate print using fixed template
      const marksheetImage = await generateMarksheet(marksheetData, branchData);
      printMarksheet(marksheetImage);

    } catch (error) {
      console.error('Error printing marksheet:', error);
      alert('Failed to print marksheet: ' + error.message);
    }
  };

  // Handle bulk operations
  const handleSelectAllMarksheets = () => {
    if (selectAll) {
      setSelectedMarksheets([]);
    } else {
      setSelectedMarksheets(filteredMarksheets.map(sheet => sheet.id || sheet._id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectMarksheet = (marksheetId) => {
    if (selectedMarksheets.includes(marksheetId)) {
      setSelectedMarksheets(selectedMarksheets.filter(id => id !== marksheetId));
    } else {
      setSelectedMarksheets([...selectedMarksheets, marksheetId]);
    }
  };

  const handleBulkPrintMarksheets = async () => {
    if (selectedMarksheets.length === 0) {
      alert('Please select at least one marksheet to print');
      return;
    }

    try {
      setLoading(true);
      const marksheetsToPrint = filteredMarksheets.filter(sheet =>
        selectedMarksheets.includes(sheet.id || sheet._id)
      );

      const marksheetImages = [];
      const userData = getUserData();
      const branchData = {
        branchName: userData?.branch_name || 'SkillWallah EdTech',
        template: MARKSHEET_TEMPLATE_PATH
      };

      for (const marksheet of marksheetsToPrint) {
        const studentData = students.find(s => (s.id || s._id) === marksheet.student_id);
        const courseData = courses.find(c => (c.id || c._id) === marksheet.course_id);

        if (studentData && courseData) {
          const marksheetData = {
            student_name: studentData.student_name || studentData.name,
            student_registration: studentData.registration_number || studentData.username,
            course_name: courseData.course_name || courseData.name,
            semester: marksheet.semester,
            session_year: marksheet.session_year,
            subjects: marksheet.subjects || [],
            total_marks: marksheet.total_marks,
            obtained_marks: marksheet.obtained_marks,
            percentage: marksheet.percentage,
            grade: marksheet.grade,
            result: marksheet.result
          };

          // Generate using dynamic template if available
          const specificBranchData = {
            ...branchData,
            template: marksheet.template_path || branchData.template
          };
          const marksheetImage = await generateMarksheet(marksheetData, specificBranchData);
          marksheetImages.push(marksheetImage);
        }
      }

      printBulkMarksheets(marksheetImages);
      console.log('✅ Bulk marksheets printed successfully');

    } catch (error) {
      console.error('Error printing bulk marksheets:', error);
      alert('Failed to print marksheets: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle template file upload
  // Removed template upload functions - using fixed template only

  // Handle marksheet generation - exactly like certificate generation
  const handleGenerateMarksheet = async (marksheet, inlineMode = false) => {
    try {
      console.log('🎓 Generating marksheet for:', marksheet);
      setGeneratingMarksheet(true);

      // Get student and course data
      const studentData = students.find(s => (s.id || s._id) === marksheet.student_id);
      const courseData = courses.find(c => (c.id || c._id) === marksheet.course_id);

      if (!studentData || !courseData) {
        throw new Error('Student or course data not found');
      }

      // Prepare marksheet data for generation - match certificate structure
      const marksheetData = {
        ...marksheet,
        student_name: studentData.student_name || studentData.name,
        course_name: courseData.course_name || courseData.name,
        // Force use of fixed template path
        template_path: MARKSHEET_TEMPLATE_PATH,
        output_path: MARKSHEET_OUTPUT_PATH
      };

      console.log('📋 Generating marksheet with data:', marksheetData);

      // Call API to generate marksheet
      const result = await certificatesApi.generateMarksheet(marksheetData);
      console.log('✅ Marksheet generation result:', result);

      if (result.success && result.marksheet) {
        // Generate fresh cache-busted URL for the new marksheet image
        const generatedImageUrl = result.marksheet.file_path ? getCacheBustedImageUrl(result.marksheet.file_path) : null;
        console.log('📸 Generated marksheet image URL:', generatedImageUrl);

        // Refresh marksheets list first to get latest data
        await loadMarksheets();

        alert('Marksheet generated successfully!');

        // Auto-preview logic
        if (!inlineMode) {
          // Auto-preview the generated marksheet with fresh URL in MODAL if not inline
          setTimeout(() => {
            setSelectedMarksheet({
              ...marksheet,
              ...result.marksheet,
              file_path: result.marksheet.file_path
            });
            setShowPreviewModal(true);
          }, 200);
        } else {
          // If inline mode, simply update the state/list which will cause the expanded row to re-render with the new image
          console.log('🔄 Inline generation complete, expanded row will update automatically via list refresh');
        }

      } else {
        throw new Error(result.message || 'Failed to generate marksheet');
      }

    } catch (error) {
      console.error('Error generating marksheet:', error);
      alert('Failed to generate marksheet: ' + error.message);
    } finally {
      setGeneratingMarksheet(false);
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'published':
        return 'bg-amber-100 text-amber-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'withheld':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get grade color
  const getGradeColor = (grade) => {
    if (['A+', 'A'].includes(grade)) return 'text-amber-600 bg-amber-50';
    if (['B+', 'B'].includes(grade)) return 'text-orange-600 bg-orange-50';
    if (['C+', 'C'].includes(grade)) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  // Get result color
  const getResultColor = (result) => {
    switch (result) {
      case 'pass':
        return 'bg-amber-100 text-amber-800';
      case 'fail':
        return 'bg-red-100 text-red-800';
      case 'compartment':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredMarksheets.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredMarksheets.length / itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-2 rounded-lg">
                <FaFileAlt className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-secondary-900">📋 Marksheet Management</h1>
                <p className="text-sm text-secondary-600 mt-1">Create and manage student marksheets</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-amber-50 px-4 py-2 rounded-lg whitespace-nowrap">
                <span className="text-sm font-medium text-amber-700">
                  Total: {filteredMarksheets.length}
                </span>
              </div>
              <div className="bg-green-50 px-4 py-2 rounded-lg whitespace-nowrap">
                <span className="text-sm font-medium text-green-700">
                  Passed: {Array.isArray(filteredMarksheets) ? filteredMarksheets.filter(m => m.result === 'pass').length : 0}
                </span>
              </div>
              <button
                onClick={handleCreate}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-6 py-2.5 rounded-lg font-medium flex items-center justify-center space-x-2 transition-all duration-200 shadow-lg hover:shadow-xl w-full sm:w-auto"
              >
                <FaPlus className="w-4 h-4" />
                <span>Create Marksheet</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {/* Filters */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by student name or course name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 w-full border border-secondary-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
          >
            <option value="">--- All Results ---</option>
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
          </select>

          <select
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            className="px-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
          >
            <option value="">--- All Semesters ---</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
              <option key={sem} value={sem}>Semester {sem}</option>
            ))}
          </select>
        </div>

        {/* Marksheets Table */}
        {/* Mobile View - Cards */}
        <div className="md:hidden space-y-4 mb-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading marksheets...</p>
            </div>
          ) : currentItems.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm text-gray-500">
              No marksheets found
            </div>
          ) : (
            currentItems.map((marksheet) => (
              <div key={marksheet.id || marksheet._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{marksheet.student_name || marksheet.studentName || '-'}</h3>
                    <p className="text-sm text-amber-600 font-medium">{marksheet.student_registration || marksheet.registrationNumber || '-'}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getResultColor(marksheet.result || 'fail')}`}>
                    {(marksheet.result || 'N/A').charAt(0).toUpperCase() + (marksheet.result || 'N/A').slice(1)}
                  </span>
                </div>

                <div className="border-t border-gray-100 pt-2 space-y-1">
                  <p className="text-sm text-gray-700"><span className="font-medium">Course:</span> {marksheet.course_name || marksheet.courseName || '-'}</p>
                  <p className="text-xs text-purple-600">{marksheet.session_year || marksheet.programName || ''}</p>
                  <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 mt-1">
                    <FaGraduationCap className="w-3 h-3 mr-1" />
                    Sem {marksheet.semester || '-'}
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Marks</span>
                    <span className="font-semibold text-gray-900">{marksheet.obtained_marks || marksheet.obtainedMarks || 0}/{marksheet.total_marks || marksheet.totalMarks || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Percentage</span>
                    <span className="font-semibold text-amber-600">{marksheet.percentage || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${Math.min(marksheet.percentage || 0, 100)}%` }}></div>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2 mt-1">
                    <span className="text-gray-500">Grade</span>
                    <span className={`font-medium ${getGradeColor(marksheet.grade || 'F')}`}>{marksheet.grade || '-'}</span>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-gray-100">
                  <button onClick={() => handlePreview(marksheet)} className="p-2 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100"><FaEye /></button>
                  <button onClick={() => handleEdit(marksheet)} className="p-2 text-yellow-600 bg-yellow-50 rounded-lg hover:bg-yellow-100"><FaEdit /></button>
                  <button onClick={() => handleGenerateMarksheet(marksheet)} className="p-2 text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100" title="Generate"><FaFileAlt /></button>
                  {marksheet.status === 'published' && (
                    <>
                      <button className="p-2 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100"><FaDownload /></button>
                      <button className="p-2 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100"><FaPrint /></button>
                    </>
                  )}
                  <button onClick={() => handleDelete(marksheet.id)} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100"><FaTrash /></button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
                  <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">S.No.</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">Student Details</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">Course Info</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Semester</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Marks</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Grade</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Result</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-12 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600"></div>
                        <span className="text-sm text-gray-500">Loading marksheets...</span>
                      </div>
                    </td>
                  </tr>
                ) : currentItems.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-12 text-center text-sm text-gray-500">
                      No marksheets found
                    </td>
                  </tr>
                ) : (
                  currentItems.map((marksheet, index) => (
                    <React.Fragment key={marksheet.id || marksheet._id}>
                      <tr className="hover:bg-amber-50 transition-colors">
                        <td className="px-4 py-4">
                          <span className="text-sm font-medium text-secondary-900">
                            {indexOfFirstItem + index + 1}.
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <h3 className="text-sm font-semibold text-secondary-900">{marksheet.student_name || marksheet.studentName || '-'}</h3>
                            <p className="text-xs text-amber-600 font-medium">{marksheet.student_registration || marksheet.registrationNumber || '-'}</p>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-secondary-900 max-w-xs">
                              {marksheet.course_name || marksheet.courseName || '-'}
                            </div>
                            <div className="text-xs text-purple-600">{marksheet.session_year || marksheet.programName || ''}</div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                            <FaGraduationCap className="w-3 h-3 mr-1" />
                            Sem {marksheet.semester || '-'}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <div className="space-y-1">
                            <div className="text-sm font-semibold text-gray-900">
                              {marksheet.obtained_marks || marksheet.obtainedMarks || 0}/{marksheet.total_marks || marksheet.totalMarks || 0}
                            </div>
                            <div className="text-xs text-amber-600 font-medium">
                              {marksheet.percentage || 0}%
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.min(marksheet.percentage || 0, 100)}%`
                                }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <div className={`inline-flex items-center px-3 py-1 rounded text-xs font-medium ${getGradeColor(marksheet.grade || 'F')}`}>
                            {marksheet.grade || '-'}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getResultColor(marksheet.result || 'fail')}`}>
                            {(marksheet.result || 'N/A').charAt(0).toUpperCase() + (marksheet.result || 'N/A').slice(1)}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => handlePreview(marksheet)}
                              className={`p-1.5 rounded transition-colors ${expandedRowId === (marksheet.id || marksheet._id) ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-400' : 'text-amber-600 hover:bg-amber-50'}`}
                              title={expandedRowId === (marksheet.id || marksheet._id) ? "Close Preview" : "Preview"}
                            >
                              <FaEye className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleEdit(marksheet)}
                              className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                              title="Edit"
                            >
                              <FaEdit className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleGenerateMarksheet(marksheet)}
                              className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition-colors"
                              title="Regenerate Marksheet"
                            >
                              <FaFileAlt className="w-4 h-4" />
                            </button>

                            {marksheet.status === 'published' && (
                              <>
                                <button
                                  className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                  title="Download"
                                >
                                  <FaDownload className="w-4 h-4" />
                                </button>

                                <button
                                  className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                  title="Print"
                                >
                                  <FaPrint className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => handleGenerateMarksheet(marksheet)}
                                  className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                  title="Generate Marksheet with Template"
                                >
                                  <span className="w-4 h-4 text-xs">📄</span>
                                </button>
                              </>
                            )}

                            <button
                              onClick={() => handleDelete(marksheet.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <FaTrash className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {/* Expanded Row for Inline Preview */}
                      {(expandedRowId === (marksheet.id || marksheet._id)) && (
                        <tr className="bg-gray-50 border-b border-gray-200 animate-fadeIn">
                          <td colSpan="8" className="p-4">
                            <div className="bg-white rounded-lg shadow-inner border border-gray-200 p-4 relative">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                                <FaEye className="mr-2 text-amber-500" />
                                Marksheet Preview: {marksheet.student_name}
                              </h4>
                              <div className="flex justify-center bg-gray-100 rounded-lg p-2 min-h-[300px] items-center">
                                {marksheet.file_path ? (
                                  <div className="relative group">
                                    <img
                                      src={getCacheBustedImageUrl(marksheet.file_path)}
                                      alt="Marksheet Preview"
                                      className="max-w-2xl w-full h-auto shadow-lg rounded border border-gray-300 transition-transform duration-300 transform group-hover:scale-[1.02]"
                                      onError={(e) => {
                                        console.error('Failed to load marksheet image:', marksheet.file_path);
                                        e.target.onerror = null;
                                        e.target.style.display = 'none';
                                        const errorDiv = document.createElement('div');
                                        errorDiv.className = 'text-center p-4 text-red-500';
                                        errorDiv.innerHTML = 'Failed to load image. <br/><button onclick="window.location.reload()" class="text-blue-500 underline mt-2">Retry</button>';
                                        e.target.parentElement.appendChild(errorDiv);
                                      }}
                                    />
                                    <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <a href={getCacheBustedImageUrl(marksheet.file_path)} target="_blank" rel="noopener noreferrer" className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100 text-gray-700" title="Open in new tab">
                                        <FaEye />
                                      </a>
                                      <button onClick={() => handleDownload(marksheet)} className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100 text-blue-600" title="Download">
                                        <FaDownload />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-10">
                                    {generatingMarksheet ? (
                                      <div className="flex flex-col items-center">
                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600 mb-3"></div>
                                        <p className="text-gray-600 font-medium">Generating Marksheet Preview...</p>
                                      </div>
                                    ) : (
                                      <div className="text-gray-500">
                                        <p className="mb-2">Preview not available.</p>
                                        <button
                                          onClick={() => handleGenerateMarksheet(marksheet, true)}
                                          className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 transition"
                                        >
                                          Generate Now
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 mt-4 rounded-lg md:rounded-t-none">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-700">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredMarksheets.length)} of {filteredMarksheets.length} marksheets
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md">
                  {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedMarksheet ? 'Edit Marksheet' : 'Create New Marksheet'}
                  </h3>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={calculateTotals}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
                    >
                      <FaCalculator className="w-4 h-4" />
                      <span className="text-sm">Calculate</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-4 space-y-6">
                {/* Student Information */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Student Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Student *
                      </label>
                      <select
                        required
                        value={formData.student_id}
                        onChange={(e) => handleStudentSelect(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        disabled={studentsLoading}
                      >
                        <option value="">
                          {studentsLoading ? 'Loading students...' :
                            students.length === 0 ? 'No students available' :
                              '-- Select Student --'}
                        </option>
                        {students.map((student) => (
                          <option key={student.id || student._id} value={student.id || student._id}>
                            {student.student_name || student.name} - {student.registration_number || student.reg_no}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Registration Number
                      </label>
                      <input
                        type="text"
                        disabled
                        value={selectedStudent?.registration_number || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        placeholder="Auto-filled"
                      />
                    </div>

                    {/* Student Photo Upload */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Student Photo
                      </label>
                      <div className="flex items-center space-x-4">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setFormData(prev => ({ ...prev, student_photo: file }));
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        />
                        {formData.student_photo && (
                          <img
                            src={formData.student_photo instanceof File ? URL.createObjectURL(formData.student_photo) : formData.student_photo}
                            alt="Student Preview"
                            className="w-16 h-20 object-cover rounded border"
                          />
                        )}
                        {!formData.student_photo && selectedStudent?.photo_url && (
                          <img
                            src={getCacheBustedImageUrl(selectedStudent.photo_url)}
                            alt="Student"
                            className="w-16 h-20 object-cover rounded border"
                          />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Upload passport size photo (optional)</p>
                    </div>

                    {/* Father's Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Father's Name
                      </label>
                      <input
                        type="text"
                        value={formData.father_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, father_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        placeholder="Father's Name"
                      />
                    </div>

                    {/* Mother's Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mother's Name
                      </label>
                      <input
                        type="text"
                        value={formData.mother_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, mother_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        placeholder="Mother's Name"
                      />
                    </div>
                  </div>
                </div>

                {/* ATC & Registration Details */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">ATC & Registration Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Sr. Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sr. No.
                      </label>
                      <input
                        type="text"
                        value={formData.sr_number}
                        onChange={(e) => setFormData(prev => ({ ...prev, sr_number: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        placeholder="Auto-generated"
                      />
                    </div>


                    {/* ATC Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ATC Name (Branch)
                      </label>
                      <input
                        type="text"
                        value={formData.atc_name || formData.branch_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, atc_name: e.target.value, branch_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        placeholder="Authorized Training Centre Name"
                      />
                    </div>

                    {/* ATC Address */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ATC Address
                      </label>
                      <input
                        type="text"
                        value={formData.atc_address || formData.branch_address}
                        onChange={(e) => setFormData(prev => ({ ...prev, atc_address: e.target.value, branch_address: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Training Centre Address"
                      />
                    </div>

                    {/* Student ID Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Student ID
                      </label>
                      <input
                        type="text"
                        value={formData.student_id_number}
                        onChange={(e) => setFormData(prev => ({ ...prev, student_id_number: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Student ID Number"
                      />
                    </div>

                    {/* Join Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Join Date
                      </label>
                      <input
                        type="date"
                        value={formData.join_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, join_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Issue Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date of Issue
                      </label>
                      <input
                        type="text"
                        value={formData.issue_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, issue_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="DD/MM/YYYY"
                      />
                    </div>
                  </div>
                </div>

                {/* Course Information */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Course Information</h4>


                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Course/Program *
                      </label>
                      <select
                        required
                        value={formData.course_id}
                        onChange={(e) => {
                          console.log('📚 [MARKSHEET] Course selected:', e.target.value);
                          handleCourseSelect(e.target.value);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={coursesLoading}
                      >
                        <option value="">
                          {coursesLoading ? 'Loading courses...' :
                            courses.length === 0 ? 'No courses available' :
                              '-- Select Course --'}
                        </option>
                        {courses.map((course, index) => {
                          console.log('📚 [MARKSHEET] Rendering course option:', course);
                          return (
                            <option key={course.id || course._id || index} value={course.id || course._id}>
                              {course.course_name || course.name} {course.course_code ? `(${course.course_code})` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Semester *
                      </label>
                      <select
                        required
                        value={formData.semester}
                        onChange={(e) => setFormData(prev => ({ ...prev, semester: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Semester</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                          <option key={sem} value={sem}>Semester {sem}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Session Year *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.session_year}
                        onChange={(e) => setFormData(prev => ({ ...prev, session_year: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., 2024-2025"
                      />
                    </div>

                    {/* Course Code */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Course Code
                      </label>
                      <input
                        type="text"
                        value={formData.course_code}
                        onChange={(e) => setFormData(prev => ({ ...prev, course_code: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., BCC"
                      />
                    </div>

                    {/* Course Name (Display) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Course Name
                      </label>
                      <input
                        type="text"
                        value={formData.course_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, course_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Full Course Name"
                      />
                    </div>
                  </div>
                </div>

                {/* Exam Dates */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Exam Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Exam Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.examDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, examDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Result Date
                      </label>
                      <input
                        type="date"
                        value={formData.resultDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, resultDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Subjects */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-semibold text-gray-900">Subject Marks</h4>
                    <button
                      type="button"
                      onClick={addSubject}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                    >
                      <FaPlus className="w-4 h-4" />
                      <span>Add Subject</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formData.subjects.map((subject, index) => (
                      <div key={index} className="grid grid-cols-6 gap-3 p-3 bg-gray-50 rounded-lg">
                        <div>
                          <select
                            required
                            value={subject.name}
                            onChange={(e) => {
                              console.log('📖 [MARKSHEET] Subject selected:', e.target.value, 'for subject index:', index);
                              updateSubject(index, 'name', e.target.value);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          >
                            <option value="">
                              {subjectsLoading ? 'Loading subjects...' :
                                !formData.course_id ? 'Select course first' :
                                  subjects.length === 0 ? 'No subjects available' :
                                    'Select Subject'}
                            </option>
                            {subjects.map((sub, idx) => {
                              console.log('📖 [MARKSHEET] Rendering subject option:', sub);
                              return (
                                <option key={sub.id || sub._id || idx} value={sub.subject_name || sub.name}>
                                  {sub.subject_name || sub.name} {sub.subject_code ? `(${sub.subject_code})` : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                        <div>
                          <input
                            type="number"
                            placeholder="Theory Marks"
                            value={subject.theory_marks}
                            onChange={(e) => updateSubject(index, 'theory_marks', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                          <label className="text-xs text-gray-500">Theory Obtained</label>
                        </div>
                        <div>
                          <input
                            type="number"
                            placeholder="Theory Max"
                            value={subject.theory_max}
                            onChange={(e) => updateSubject(index, 'theory_max', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                          <label className="text-xs text-gray-500">Theory Max</label>
                        </div>
                        <div>
                          <input
                            type="number"
                            placeholder="Practical Marks"
                            value={subject.practical_marks}
                            onChange={(e) => updateSubject(index, 'practical_marks', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                          <label className="text-xs text-gray-500">Practical Obtained</label>
                        </div>
                        <div>
                          <input
                            type="number"
                            placeholder="Practical Max"
                            value={subject.practical_max}
                            onChange={(e) => updateSubject(index, 'practical_max', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                          <label className="text-xs text-gray-500">Practical Max</label>
                        </div>
                        <div className="flex justify-center">
                          {formData.subjects.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSubject(index)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <FaTrash className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Authority and Verification Information */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Authority Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Head of Institute Name
                      </label>
                      <input
                        type="text"
                        value={formData.head_of_institute_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, head_of_institute_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Head of the Institute"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Director Name
                      </label>
                      <input
                        type="text"
                        value={formData.director_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, director_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Director"
                      />
                    </div>
                  </div>

                  {/* QR Code Preview */}
                  {formData.qr_code_data && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-16 h-16 bg-white border border-gray-300 rounded-lg flex items-center justify-center">
                          <span className="text-xs text-gray-500">QR Code</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Verification QR Code</p>
                          <p className="text-xs text-gray-600">
                            URL: {formData.qr_code_data}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Results Summary */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Results Summary</h4>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Total Marks
                          </label>
                          <input
                            type="number"
                            value={formData.total_marks}
                            onChange={(e) => setFormData(prev => ({ ...prev, total_marks: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter total marks"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Obtained Marks
                          </label>
                          <input
                            type="number"
                            value={formData.obtained_marks}
                            onChange={(e) => setFormData(prev => ({ ...prev, obtained_marks: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter obtained marks"
                          />
                        </div>
                      </div>

                      {/* Auto Calculate Button */}
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            // Calculate from subjects if available, otherwise use total/obtained
                            let totalMarks = 0;
                            let obtainedMarks = 0;

                            if (formData.subjects && formData.subjects.length > 0 && formData.subjects[0].name) {
                              // Calculate from subjects
                              formData.subjects.forEach(subject => {
                                const theoryObtained = parseInt(subject.theory_marks) || 0;
                                const practicalObtained = parseInt(subject.practical_marks) || 0;
                                const theoryMax = parseInt(subject.theory_max) || 100;
                                const practicalMax = parseInt(subject.practical_max) || 0;

                                totalMarks += theoryMax + practicalMax;
                                obtainedMarks += theoryObtained + practicalObtained;
                              });
                            } else {
                              // Use manual total/obtained marks
                              totalMarks = parseInt(formData.total_marks) || 0;
                              obtainedMarks = parseInt(formData.obtained_marks) || 0;
                            }

                            const percentage = totalMarks > 0 ? parseFloat(((obtainedMarks / totalMarks) * 100).toFixed(2)) : 0;

                            // Grade calculation
                            let grade = 'F';
                            if (percentage >= 95) grade = 'A+';
                            else if (percentage >= 85) grade = 'A';
                            else if (percentage >= 75) grade = 'B+';
                            else if (percentage >= 65) grade = 'B';
                            else if (percentage >= 55) grade = 'C+';
                            else if (percentage >= 45) grade = 'C';
                            else if (percentage >= 35) grade = 'D';
                            else grade = 'F';

                            // Pass/Fail criteria (typically 35% is passing)
                            const isPass = percentage >= 35;

                            console.log('Calculation:', {
                              totalMarks,
                              obtainedMarks,
                              percentage,
                              grade,
                              result: isPass ? 'pass' : 'fail'
                            });

                            setFormData(prev => ({
                              ...prev,
                              total_marks: totalMarks,
                              obtained_marks: obtainedMarks,
                              percentage: percentage,
                              grade,
                              result: isPass ? 'pass' : 'fail'
                            }));
                          }}
                          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center space-x-2"
                        >
                          <span>Auto Calculate</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Percentage
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.percentage}
                            onChange={(e) => setFormData(prev => ({ ...prev, percentage: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter percentage"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Overall Grade
                          </label>
                          <select
                            value={formData.grade}
                            onChange={(e) => setFormData(prev => ({ ...prev, grade: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Select Grade</option>
                            {gradeOptions.map((grade) => (
                              <option key={grade} value={grade}>{grade}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Status & Result</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Result *
                        </label>
                        <select
                          required
                          value={formData.result}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            result: e.target.value,
                            status: e.target.value // Keep status same as result
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {resultOptions.map((result) => (
                            <option key={result} value={result}>
                              {result.charAt(0).toUpperCase() + result.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Status *
                        </label>
                        <select
                          required
                          value={formData.status}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            status: e.target.value,
                            result: e.target.value // Keep result same as status
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg font-medium transition-all duration-200"
                >
                  {selectedMarksheet ? 'Update' : 'Create'} Marksheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Marksheet Preview Modal */}
      {showPreviewModal && selectedMarksheet && (
        <div className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Marksheet Preview</h3>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Marksheet Preview */}
            <div className="px-6 py-8">
              {selectedMarksheet?.file_path && !previewError ? (
                // Show actual generated marksheet image - always use fresh cache-busted URL
                <div className="text-center">
                  <img
                    key={`marksheet-preview-${selectedMarksheet.id || selectedMarksheet._id}-${Date.now()}`}
                    src={getCacheBustedImageUrl(selectedMarksheet.file_path)}
                    alt="Marksheet Preview"
                    className="max-w-full h-auto border border-gray-300 rounded-lg shadow-lg"
                    onError={() => setPreviewError(true)}
                  />
                </div>
              ) : (
                // Fallback when file is missing
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-4">
                    <FaFileAlt className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">Preview Not Available</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    The marksheet image has not been generated yet.
                  </p>
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPreviewModal(false);
                        handleGenerateMarksheet(selectedMarksheet);
                      }}
                      className="inline-flex items-center rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
                    >
                      <FaFileAlt className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                      Generate Marksheet
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMarksheet;