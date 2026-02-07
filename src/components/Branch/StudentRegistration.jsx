import { useState, useEffect } from 'react';
import { FaPlus, FaEye, FaEdit, FaTrash, FaArrowLeft, FaSpinner, FaSearch, FaTimes, FaSave } from 'react-icons/fa';
import BranchLayout from './BranchLayout';

const StudentRegistration = () => {
  // View mode state - 'table' or 'form'
  const [viewMode, setViewMode] = useState('table');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);

  // Dropdown data from backend
  const [branches, setBranches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(false);

  // API Base URL
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

  const [formData, setFormData] = useState({
    // Personal Details
    branchCode: '',
    reg: '230',
    admissionYear: '',
    studentName: '',
    fatherName: '',
    motherName: '',
    dateOfBirth: '',
    contactNo: '',
    parentContact: '',
    gender: '',
    category: '',
    religion: '',
    maritalStatus: '',
    identityType: '',
    idNumber: '',
    lastGeneralQualification: '',
    state: '',
    district: '',
    address: '',
    pincode: '',
    emailId: '',
    photo: null,

    // Course Details
    courseCategory: '',
    course: '',
    courseDuration: '',
    batch: '',
    netFee: '',
    discount: '',
    otherCharge: '',
    dateOfAdmission: '',
    enquirySource: ''
  });

  // Get franchise/branch code from token
  const getBranchCode = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('branchToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.franchise_code || payload.branch_code || payload.sub;
      } catch (error) {
        console.error('Error decoding token:', error);
        return null;
      }
    }
    return null;
  };

  // Fetch students from API
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('branchToken');
      const branchCode = getBranchCode();

      console.log('🔍 [StudentRegistration] Token:', token ? 'Present' : 'Missing');
      console.log('🔍 [StudentRegistration] Branch Code:', branchCode);

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (branchCode) {
        queryParams.append('branch_code', branchCode);
      }
      queryParams.append('page', 1);
      queryParams.append('limit', 100);

      queryParams.append('exclude_id_card', 'true');
      const url = `${API_BASE_URL}/api/branch-students/students?${queryParams.toString()}`;
      console.log('🚀 [StudentRegistration] Fetching students from URL:', url);
      console.log('🚀 [StudentRegistration] Request headers:', {
        'Authorization': token ? `Bearer ${token.substring(0, 20)}...` : 'No token',
        'Content-Type': 'application/json'
      });

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🎯 [StudentRegistration] API Response:', data);
        console.log('🎯 [StudentRegistration] Data type:', Array.isArray(data) ? 'Array' : 'Object');

        // The API returns a direct array of students, not wrapped in an object
        if (Array.isArray(data)) {
          console.log('🎯 [StudentRegistration] Students array (direct):', data);
          console.log('🎯 [StudentRegistration] Students count:', data.length);
          setStudents(data);
        } else if (data.students && Array.isArray(data.students)) {
          console.log('🎯 [StudentRegistration] Students array (wrapped):', data.students);
          console.log('🎯 [StudentRegistration] Students count:', data.students.length);
          setStudents(data.students);
        } else {
          console.log('🎯 [StudentRegistration] Unexpected response format:', data);
          setStudents([]);
        }
      } else {
        console.error('❌ [StudentRegistration] Failed to fetch students. Status:', response.status);
        const errorText = await response.text();
        console.error('❌ [StudentRegistration] Error response:', errorText);
        setStudents([]);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // Initialize data on component mount
  useEffect(() => {
    if (viewMode === 'table') {
      fetchStudents();
    } else if (viewMode === 'form') {
      fetchBranches();
      fetchCourses();
      fetchBatches();
    }
  }, [viewMode]);

  // Load dropdown data when edit modal opens
  useEffect(() => {
    if (showEditModal) {
      fetchBranches();
      fetchCourses();
      fetchBatches();
    }
  }, [showEditModal]);

  // Fetch branches from backend
  const fetchBranches = async () => {
    try {
      setLoadingBranches(true);
      console.log('🏢 [StudentRegistration] Fetching branches...');

      const response = await fetch(`${API_BASE_URL}/api/branches/dropdown`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🏢 [StudentRegistration] Branches response:', data);

        if (data.branches && Array.isArray(data.branches)) {
          setBranches(data.branches);
          console.log('🏢 [StudentRegistration] Loaded', data.branches.length, 'branches');
        } else if (data.options && Array.isArray(data.options)) {
          setBranches(data.options);
        } else {
          setBranches([]);
        }
      } else {
        console.error('❌ [StudentRegistration] Failed to fetch branches:', response.status);
        setBranches([]);
      }
    } catch (error) {
      console.error('❌ [StudentRegistration] Error fetching branches:', error);
      setBranches([]);
    } finally {
      setLoadingBranches(false);
    }
  };

  // Fetch courses from backend
  const fetchCourses = async (branchCode = null) => {
    try {
      setLoadingCourses(true);
      console.log('📚 [StudentRegistration] Fetching courses...');

      let url = `${API_BASE_URL}/api/branch-courses/courses/dropdown`;
      if (branchCode) {
        url += `?branch_code=${branchCode}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📚 [StudentRegistration] Courses response:', data);

        if (data.courses && Array.isArray(data.courses)) {
          setCourses(data.courses);
          console.log('📚 [StudentRegistration] Loaded', data.courses.length, 'courses');
        } else if (data.options && Array.isArray(data.options)) {
          setCourses(data.options);
        } else {
          setCourses([]);
        }
      } else {
        console.error('❌ [StudentRegistration] Failed to fetch courses:', response.status);
        setCourses([]);
      }
    } catch (error) {
      console.error('❌ [StudentRegistration] Error fetching courses:', error);
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  };

  // Fetch batches from backend
  const fetchBatches = async (branchCode = null, courseId = null) => {
    try {
      setLoadingBatches(true);
      console.log('📋 [StudentRegistration] Fetching batches...');

      let url = `${API_BASE_URL}/api/branch-batches/batches/dropdown`;
      const params = new URLSearchParams();
      if (branchCode) {
        params.append('branch_code', branchCode);
      }
      if (courseId) {
        params.append('course_id', courseId);
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📋 [StudentRegistration] Batches response:', data);

        if (data.batches && Array.isArray(data.batches)) {
          setBatches(data.batches);
          console.log('📋 [StudentRegistration] Loaded', data.batches.length, 'batches');
        } else if (data.options && Array.isArray(data.options)) {
          setBatches(data.options);
        } else if (Array.isArray(data)) {
          setBatches(data);
        } else {
          setBatches([]);
        }
      } else {
        console.error('❌ [StudentRegistration] Failed to fetch batches:', response.status);
        setBatches([]);
      }
    } catch (error) {
      console.error('❌ [StudentRegistration] Error fetching batches:', error);
      setBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  };

  // Validation helpers
  const isOnlyLettersAndSpaces = (value) => /^[a-zA-Z\s]*$/.test(value);
  const isOnlyNumbers = (value) => /^[0-9]*$/.test(value);
  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value === '';
  const isValidAddress = (value) => /^[a-zA-Z0-9\s,.\-\/]*$/.test(value); // Allow letters, numbers, spaces, commas, dots, hyphens, slashes

  // Fields that should only accept letters and spaces (names)
  const nameFields = ['studentName', 'fatherName', 'motherName', 'state', 'district'];

  // Fields that should only accept numbers
  const numericFields = ['contactNo', 'parentContact', 'pincode', 'netFee', 'discount', 'otherCharge'];

  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }));
    } else {
      // Apply validation based on field type
      let validatedValue = value;

      // For name fields - only allow letters and spaces
      if (nameFields.includes(name)) {
        if (!isOnlyLettersAndSpaces(value)) {
          return; // Don't update if invalid
        }
      }

      // For numeric fields - only allow numbers
      if (numericFields.includes(name)) {
        if (!isOnlyNumbers(value)) {
          return; // Don't update if invalid
        }
      }

      // For address field - allow alphanumeric with special characters
      if (name === 'address') {
        if (!isValidAddress(value)) {
          return; // Don't update if invalid
        }
      }

      setFormData(prev => ({
        ...prev,
        [name]: validatedValue
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('branchToken');
      const branchCode = getBranchCode();

      if (!token) {
        alert('Authentication token not found. Please login again.');
        return;
      }

      // Prepare student data for API
      const studentData = {
        branch_code: formData.branchCode || branchCode,
        admission_year: formData.admissionYear || new Date().getFullYear().toString(),
        student_name: formData.studentName,
        father_name: formData.fatherName,
        mother_name: formData.motherName,
        date_of_birth: formData.dateOfBirth || '',
        contact_no: formData.contactNo,
        parent_contact: formData.parentContact,
        gender: formData.gender,
        category: formData.category,
        religion: formData.religion,
        marital_status: formData.maritalStatus,
        identity_type: formData.identityType,
        id_number: formData.idNumber,
        last_general_qualification: formData.lastGeneralQualification,
        state: formData.state,
        district: formData.district,
        address: formData.address,
        pincode: formData.pincode,
        email: formData.emailId,
        course: formData.course,
        course_duration: formData.courseDuration || '',
        duration: formData.courseDuration || '',
        batch: formData.batch,
        net_fee: parseFloat(formData.netFee) || 0,
        discount: parseFloat(formData.discount) || 0,
        other_charges: parseFloat(formData.otherCharge) || 0,
        date_of_admission: formData.dateOfAdmission || '',
        enquiry_source: formData.enquirySource
      };

      console.log('📤 [StudentRegistration] Sending student data:', studentData);

      const response = await fetch(`${API_BASE_URL}/api/branch-students/students/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(studentData)
      });

      console.log('📥 [StudentRegistration] Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ [StudentRegistration] Student registered successfully:', result);
        alert('Student registered successfully!');

        // Go back to table view and refresh the student list
        setViewMode('table');
        await fetchStudents();
      } else {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        console.error('❌ [StudentRegistration] Error response:', errorData);
        alert(`Error registering student: ${errorData.detail || response.statusText}`);
      }
    } catch (error) {
      console.error('❌ [StudentRegistration] Error:', error);
      alert(`Error registering student: ${error.message}`);
    }
  };

  const handleExit = () => {
    // Go back to table view
    setViewMode('table');
    // Reset form
    setFormData({
      branchCode: '',
      reg: '230',
      admissionYear: '',
      studentName: '',
      fatherName: '',
      motherName: '',
      dateOfBirth: '',
      contactNo: '',
      parentContact: '',
      gender: '',
      category: '',
      religion: '',
      maritalStatus: '',
      identityType: '',
      idNumber: '',
      lastGeneralQualification: '',
      state: '',
      district: '',
      address: '',
      pincode: '',
      emailId: '',
      photo: null,
      courseCategory: '',
      course: '',
      batch: '',
      netFee: '',
      discount: '',
      otherCharge: '',
      dateOfAdmission: '',
      enquirySource: ''
    });
  };

  // Handle view/edit student
  const handleViewStudent = async (student) => {
    console.log('👁️ [StudentRegistration] Viewing student:', student);
    setActionLoading(true);

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('branchToken');
      const studentId = student.id || student._id;

      // Fetch detailed student info from API
      const response = await fetch(`${API_BASE_URL}/api/branch-students/students/${studentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [StudentRegistration] Student details fetched:', data);
        setSelectedStudent(data);
        setShowViewModal(true);
      } else {
        // If API fails, use the student data we already have
        console.warn('⚠️ [StudentRegistration] API fetch failed, using existing data');
        setSelectedStudent(student);
        setShowViewModal(true);
      }
    } catch (error) {
      console.error('❌ [StudentRegistration] Error fetching student details:', error);
      // Fallback to existing data
      setSelectedStudent(student);
      setShowViewModal(true);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle edit student
  const handleEditStudent = async (student) => {
    console.log('✏️ [StudentRegistration] Editing student:', student);
    setActionLoading(true);
    setShowViewModal(false); // Close view modal if open

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('branchToken');
      const studentId = student.id || student._id;

      // Fetch detailed student info from API
      const response = await fetch(`${API_BASE_URL}/api/branch-students/students/${studentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [StudentRegistration] Student details for edit:', data);
        setSelectedStudent(data);

        // Populate form data
        setFormData({
          branchCode: data.branch_code || '',
          reg: data.registration_number || '',
          admissionYear: data.admission_year || '',
          studentName: data.student_name || '',
          fatherName: data.father_name || '',
          motherName: data.mother_name || '',
          dateOfBirth: data.date_of_birth || '',
          contactNo: data.contact_no || '',
          parentContact: data.parent_contact || '',
          gender: data.gender || '',
          category: data.category || '',
          religion: data.religion || '',
          maritalStatus: data.marital_status || '',
          identityType: data.identity_type || '',
          idNumber: data.id_number || '',
          lastGeneralQualification: data.last_general_qualification || '',
          state: data.state || '',
          district: data.district || '',
          address: data.address || '',
          pincode: data.pincode || '',
          emailId: data.email_id || data.email || '',
          photo: null,
          courseCategory: data.course_category || '',
          course: data.course || '',
          batch: data.batch || '',
          netFee: data.net_fee || '',
          discount: data.discount || '',
          otherCharge: data.other_charge || '',
          dateOfAdmission: data.date_of_admission || '',
          enquirySource: data.enquiry_source || ''
        });

        setShowEditModal(true);
      } else {
        console.warn('⚠️ [StudentRegistration] API fetch failed, using existing data');
        setSelectedStudent(student);
        setFormData({
          branchCode: student.branch_code || '',
          reg: student.registration_number || '',
          admissionYear: '',
          studentName: student.student_name || '',
          fatherName: student.father_name || '',
          motherName: student.mother_name || '',
          dateOfBirth: student.date_of_birth || '',
          contactNo: student.contact_no || '',
          parentContact: student.parent_contact || '',
          gender: student.gender || '',
          category: student.category || '',
          religion: student.religion || '',
          maritalStatus: student.marital_status || '',
          identityType: student.identity_type || '',
          idNumber: student.id_number || '',
          lastGeneralQualification: student.last_general_qualification || '',
          state: student.state || '',
          district: student.district || '',
          address: student.address || '',
          pincode: student.pincode || '',
          emailId: student.email_id || student.email || '',
          photo: null,
          courseCategory: student.course_category || '',
          course: student.course || '',
          batch: student.batch || '',
          netFee: student.net_fee || '',
          discount: student.discount || '',
          otherCharge: student.other_charge || '',
          dateOfAdmission: student.date_of_admission || '',
          enquirySource: student.enquiry_source || ''
        });
        setShowEditModal(true);
      }
    } catch (error) {
      console.error('❌ [StudentRegistration] Error fetching student for edit:', error);
      alert('Error loading student data for editing');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle update student (submit edit form)
  const handleUpdateStudent = async (e) => {
    e.preventDefault();

    if (!selectedStudent) {
      alert('No student selected for update');
      return;
    }

    setActionLoading(true);

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('branchToken');
      const studentId = selectedStudent.id || selectedStudent._id;

      // Prepare update data
      const updateData = {
        student_name: formData.studentName,
        father_name: formData.fatherName,
        mother_name: formData.motherName,
        date_of_birth: formData.dateOfBirth || null,
        contact_no: formData.contactNo,
        parent_contact: formData.parentContact,
        gender: formData.gender,
        category: formData.category,
        religion: formData.religion,
        marital_status: formData.maritalStatus,
        identity_type: formData.identityType,
        id_number: formData.idNumber,
        last_general_qualification: formData.lastGeneralQualification,
        state: formData.state,
        district: formData.district,
        address: formData.address,
        pincode: formData.pincode,
        email: formData.emailId,
        course: formData.course,
        batch: formData.batch,
        net_fee: parseFloat(formData.netFee) || 0,
        discount: parseFloat(formData.discount) || 0,
        other_charge: parseFloat(formData.otherCharge) || 0,
        enquiry_source: formData.enquirySource
      };

      console.log('📤 [StudentRegistration] Updating student:', studentId, updateData);

      const response = await fetch(`${API_BASE_URL}/api/branch-students/students/${studentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ [StudentRegistration] Student updated successfully:', result);
        alert('Student updated successfully!');

        // Close modal and refresh
        setShowEditModal(false);
        setSelectedStudent(null);
        await fetchStudents();
      } else {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        console.error('❌ [StudentRegistration] Update error:', errorData);
        alert(`Error updating student: ${errorData.detail || response.statusText}`);
      }
    } catch (error) {
      console.error('❌ [StudentRegistration] Error updating student:', error);
      alert(`Error updating student: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete student
  const handleDeleteStudent = async (studentId) => {
    setDeleteConfirm(studentId);
  };

  // Confirm delete student
  const confirmDeleteStudent = async () => {
    if (!deleteConfirm) return;

    setActionLoading(true);

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('branchToken');

      console.log('🗑️ [StudentRegistration] Deleting student:', deleteConfirm);

      const response = await fetch(`${API_BASE_URL}/api/branch-students/students/${deleteConfirm}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ [StudentRegistration] Student deleted successfully:', result);
        alert('Student deleted successfully!');

        // Refresh the student list
        await fetchStudents();
      } else {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        console.error('❌ [StudentRegistration] Delete error:', errorData);
        alert(`Error deleting student: ${errorData.detail || response.statusText}`);
      }
    } catch (error) {
      console.error('❌ [StudentRegistration] Error deleting student:', error);
      alert(`Error deleting student: ${error.message}`);
    } finally {
      setActionLoading(false);
      setDeleteConfirm(null);
    }
  };

  // Filter students based on search
  const filteredStudents = students.filter(student =>
    student.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.registration_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.contact_no?.includes(searchTerm)
  );

  // Render table view
  const renderTableView = () => (
    <div className="p-6">
      {/* Header */}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center">
          <span className="text-2xl mr-3">👥</span>
          <h1 className="text-2xl font-bold text-gray-800">MANAGE STUDENTS</h1>
        </div>
        <button
          onClick={() => setShowFormModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors font-semibold w-full md:w-auto"
        >
          <FaPlus />
          Register Student
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, registration number, or contact..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Desktop Table Header */}
        <div className="hidden md:block bg-blue-600 text-white">
          <div className="grid grid-cols-7 gap-4 p-4 font-semibold text-center h-full items-center">
            <div>SN.</div>
            <div>Student Name</div>
            <div>Registration No.</div>
            <div>Course</div>
            <div>Contact</div>
            <div>Admission Date</div>
            <div>Actions</div>
          </div>
        </div>

        {/* Mobile Header (Optional or just rely on cards) */}
        <div className="md:hidden bg-blue-600 text-white p-4 font-semibold">
          Student List
        </div>

        {/* Table/Card Body */}
        <div className="divide-y divide-gray-200">
          {(() => {
            return null;
          })()}

          {loading ? (
            <div className="p-8 text-center">
              <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-4">📚</div>
              <p>No students found.</p>
              <p className="text-sm">Click "Register Student" to add the first student.</p>
            </div>
          ) : (
            filteredStudents.map((student, index) => (
              <div key={student.id || index} className="hover:bg-gray-50 transition-colors">
                {/* Desktop View */}
                <div className="hidden md:grid grid-cols-7 gap-4 p-4 items-center text-sm">
                  <div className="text-center font-medium">{index + 1}</div>
                  <div className="font-medium text-gray-900">{student.student_name || 'N/A'}</div>
                  <div className="text-center font-mono text-blue-600">{student.registration_number || 'N/A'}</div>
                  <div className="text-gray-700">{student.course || 'N/A'}</div>
                  <div className="text-center">{student.contact_no || 'N/A'}</div>
                  <div className="text-center">
                    {student.created_at ? new Date(student.created_at).toLocaleDateString() : 'N/A'}
                  </div>
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => handleViewStudent(student)}
                      className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                      title="View Student"
                      disabled={actionLoading}
                    >
                      <FaEye className="text-lg" />
                    </button>
                    <button
                      onClick={() => handleEditStudent(student)}
                      className="p-1.5 text-orange-600 hover:bg-orange-100 rounded-md transition-colors"
                      title="Edit Student"
                      disabled={actionLoading}
                    >
                      <FaEdit className="text-lg" />
                    </button>
                    <button
                      onClick={() => handleDeleteStudent(student.id || student._id)}
                      className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                      title="Delete Student"
                      disabled={actionLoading}
                    >
                      <FaTrash className="text-lg" />
                    </button>
                  </div>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{student.student_name || 'N/A'}</h3>
                      <p className="text-sm font-mono text-blue-600">{student.registration_number || 'N/A'}</p>
                    </div>
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                      {index + 1}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                    <div>
                      <span className="block text-xs text-gray-400">Course</span>
                      {student.course || 'N/A'}
                    </div>
                    <div>
                      <span className="block text-xs text-gray-400">Contact</span>
                      {student.contact_no || 'N/A'}
                    </div>
                    <div>
                      <span className="block text-xs text-gray-400">Admission Date</span>
                      {student.created_at ? new Date(student.created_at).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleViewStudent(student)}
                      className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-md text-sm font-medium hover:bg-blue-100"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleEditStudent(student)}
                      className="flex-1 py-2 bg-orange-50 text-orange-600 rounded-md text-sm font-medium hover:bg-orange-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteStudent(student.id || student._id)}
                      className="flex-1 py-2 bg-red-50 text-red-600 rounded-md text-sm font-medium hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{students.length}</div>
            <div className="text-sm text-gray-600">Total Students</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {students.filter(s => s.created_at && new Date(s.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
            </div>
            <div className="text-sm text-gray-600">New This Month</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {new Set(students.map(s => s.course)).size}
            </div>
            <div className="text-sm text-gray-600">Active Courses</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {filteredStudents.length}
            </div>
            <div className="text-sm text-gray-600">Filtered Results</div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render form view
  const renderFormView = () => (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center">
          <span className="text-2xl mr-3">📋</span>
          <h1 className="text-2xl font-bold text-gray-800">STUDENT REGISTRATION</h1>
        </div>
        <button
          onClick={() => setViewMode('table')}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors w-full md:w-auto"
        >
          <FaArrowLeft />
          Back to Students
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        {/* Personal Details Section */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-red-600 mb-6">1. PERSONAL DETAILS</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                BRANCH CODE *
              </label>
              <select
                name="branchCode"
                value={formData.branchCode}
                onChange={(e) => {
                  handleInputChange(e);
                  // Fetch courses for selected branch
                  if (e.target.value) {
                    fetchCourses(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={loadingBranches}
              >
                <option value="">
                  {loadingBranches ? 'Loading branches...' : 'Select Branch'}
                </option>
                {branches.map((branch) => (
                  <option key={branch.id || branch.code} value={branch.code || branch.branch_code || branch.value}>
                    {branch.name || branch.branch_name || branch.centre_name || branch.label} ({branch.code || branch.branch_code || branch.value})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                REG. *
              </label>
              <input
                type="text"
                name="reg"
                value={formData.reg}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select year</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Student Name * <span className="text-xs text-gray-400">(Letters only)</span>
              </label>
              <input
                type="text"
                name="studentName"
                value={formData.studentName}
                onChange={handleInputChange}
                placeholder="Enter student name (letters only)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Father's Name * <span className="text-xs text-gray-400">(Letters only)</span>
              </label>
              <input
                type="text"
                name="fatherName"
                value={formData.fatherName}
                onChange={handleInputChange}
                placeholder="Enter father's name (letters only)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mother's Name <span className="text-xs text-gray-400">(Letters only)</span>
              </label>
              <input
                type="text"
                name="motherName"
                value={formData.motherName}
                onChange={handleInputChange}
                placeholder="Enter mother's name (letters only)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Of Birth*
              </label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact No * <span className="text-xs text-gray-400">(Numbers only)</span>
              </label>
              <input
                type="tel"
                name="contactNo"
                value={formData.contactNo}
                onChange={handleInputChange}
                placeholder="Enter 10 digit mobile number"
                maxLength={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parent's Contact <span className="text-xs text-gray-400">(Numbers only)</span>
              </label>
              <input
                type="tel"
                name="parentContact"
                value={formData.parentContact}
                onChange={handleInputChange}
                placeholder="Enter 10 digit mobile number"
                maxLength={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender *
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                Marital Status
              </label>
              <select
                name="maritalStatus"
                value={formData.maritalStatus}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select</option>
                <option value="Aadhaar">Aadhaar Card</option>
                <option value="PAN">PAN Card</option>
                <option value="Passport">Passport</option>
                <option value="VoterID">Voter ID</option>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select</option>
                <option value="10th">10th</option>
                <option value="12th">12th</option>
                <option value="Graduate">Graduate</option>
                <option value="Post Graduate">Post Graduate</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Id Number *
              </label>
              <input
                type="text"
                name="idNumber"
                value={formData.idNumber}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select</option>
                <option value="West Bengal">West Bengal</option>
                <option value="Delhi">Delhi</option>
                <option value="Mumbai">Mumbai</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                District
              </label>
              <select
                name="district"
                value={formData.district}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">--Select--</option>
                <option value="Kolkata">Kolkata</option>
                <option value="North 24 Parganas">North 24 Parganas</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address <span className="text-xs text-gray-400">(Letters, numbers allowed)</span>
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows="2"
                placeholder="Enter full address"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pincode * <span className="text-xs text-gray-400">(Numbers only)</span>
              </label>
              <input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleInputChange}
                placeholder="Enter 6 digit pincode"
                maxLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Id *
              </label>
              <input
                type="email"
                name="emailId"
                value={formData.emailId}
                onChange={handleInputChange}
                placeholder="Enter valid email address"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photo
              </label>
              <input
                type="file"
                name="photo"
                onChange={handleInputChange}
                accept="image/jpeg,image/jpg,image/bmp"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-red-500 mt-1">
                Photo must be in jpg/jpeg/bmp And Siz less than 500kB
              </p>
            </div>
          </div>
        </div>

        {/* Course Details Section */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-red-600 mb-6">2. COURSE DETAILS</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course Category *
              </label>
              <select
                name="courseCategory"
                value={formData.courseCategory}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">-- COURSE CATEGORY --</option>
                {/* Get unique categories from courses */}
                {[...new Set(courses.map(c => c.category).filter(Boolean))].length > 0
                  ? [...new Set(courses.map(c => c.category).filter(Boolean))].map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))
                  : <>
                    <option value="Computer Course">Computer Course</option>
                    <option value="Language Course">Language Course</option>
                    <option value="Professional Course">Professional Course</option>
                    <option value="Technical Course">Technical Course</option>
                  </>
                }
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course *
              </label>
              <select
                name="course"
                value={formData.course}
                onChange={(e) => {
                  handleInputChange(e);
                  // Auto-fill course fee and duration if available
                  const selectedCourse = courses.find(c => c.course_name === e.target.value || c.value === e.target.value);
                  if (selectedCourse) {
                    setFormData(prev => ({
                      ...prev,
                      course: e.target.value,
                      netFee: selectedCourse.fee || prev.netFee,
                      courseDuration: selectedCourse.duration || selectedCourse.course_duration || ''
                    }));
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={loadingCourses}
              >
                <option value="">
                  {loadingCourses ? 'Loading courses...' : '-- Courses --'}
                </option>
                {courses.map((course) => (
                  <option key={course.id || course.course_code} value={course.course_name || course.value}>
                    {course.course_code ? `${course.course_code} - ${course.course_name}` : course.course_name || course.label}
                    {course.fee ? ` (₹${course.fee})` : ''}
                    {course.duration ? ` - ${course.duration}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Batch *
              </label>
              <select
                name="batch"
                value={formData.batch}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={loadingBatches}
              >
                <option value="">
                  {loadingBatches ? 'Loading batches...' : '-- Section/Batch --'}
                </option>
                {batches.length > 0
                  ? batches.map((batch) => (
                    <option key={batch.id || batch.batch_name || batch.value} value={batch.batch_name || batch.name || batch.value}>
                      {batch.batch_name || batch.name || batch.label}
                      {batch.timing ? ` (${batch.timing})` : ''}
                    </option>
                  ))
                  : <>
                    <option value="Morning">Morning</option>
                    <option value="Evening">Evening</option>
                    <option value="Weekend">Weekend</option>
                  </>
                }
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                NET FEE <span className="text-xs text-gray-400">(Numbers only)</span>
              </label>
              <input
                type="text"
                name="netFee"
                value={formData.netFee}
                onChange={handleInputChange}
                placeholder="Enter fee amount"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                DISCOUNT <span className="text-xs text-gray-400">(Numbers only)</span>
              </label>
              <input
                type="text"
                name="discount"
                value={formData.discount}
                onChange={handleInputChange}
                placeholder="Enter discount amount"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Other Charge <span className="text-xs text-gray-400">(Numbers only)</span>
              </label>
              <input
                type="text"
                name="otherCharge"
                value={formData.otherCharge}
                onChange={handleInputChange}
                placeholder="Enter other charges"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select</option>
                <option value="Online">Online</option>
                <option value="Reference">Reference</option>
                <option value="Advertisement">Advertisement</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 pt-6 border-t">
          <button
            type="submit"
            className="px-8 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
          >
            Submit
          </button>
          <button
            type="button"
            onClick={handleExit}
            className="px-8 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
          >
            Exit
          </button>
        </div>
      </form>
    </div>
  );

  // Delete Confirmation Modal
  const renderDeleteConfirmModal = () => {
    if (!deleteConfirm) return null;

    const studentToDelete = students.find(s => (s.id || s._id) === deleteConfirm);

    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-2xl p-6 max-w-md w-full mx-4 border border-white/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <FaTrash className="text-red-600 text-xl" />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Delete Student</h3>
          </div>

          <p className="text-gray-600 mb-2">
            Are you sure you want to permanently delete this student?
          </p>

          {studentToDelete && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="font-semibold text-gray-800">{studentToDelete.student_name}</p>
              <p className="text-sm text-gray-500">{studentToDelete.registration_number}</p>
            </div>
          )}

          <p className="text-sm text-red-600 mb-6">
            ⚠️ This action cannot be undone. All related data (ID cards, certificates, payments) will also be deleted.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteStudent}
              disabled={actionLoading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {actionLoading ? <FaSpinner className="animate-spin" /> : <FaTrash />}
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Form Modal
  const renderFormModal = () => {
    if (!showFormModal) return null;

    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto border border-white/20">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 border-b bg-orange-600 text-white sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📋</span>
              <h2 className="text-xl font-bold">Student Registration</h2>
            </div>
            <button
              onClick={() => setShowFormModal(false)}
              className="text-white hover:text-gray-200 text-2xl font-bold p-1"
            >
              <FaTimes />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6">
            <form onSubmit={handleSubmit}>
              {/* Personal Details Section */}
              <div className="mb-8">
                <h2 className="text-lg font-bold text-red-600 mb-6">1. PERSONAL DETAILS</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Branch Code *</label>
                    <select
                      name="branchCode"
                      value={formData.branchCode}
                      onChange={handleInputChange}
                      required
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Branch</option>
                      {loadingBranches ? (
                        <option disabled>Loading branches...</option>
                      ) : (
                        branches.map((branch) => (
                          <option key={branch.id || branch.branch_code} value={branch.branch_code || branch.code}>
                            {branch.branch_name || branch.name} ({branch.branch_code || branch.code})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Registration Number</label>
                    <div className="flex">
                      <span className="inline-flex items-center px-2 text-sm text-gray-500 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md">
                        REG-
                      </span>
                      <input
                        type="text"
                        name="reg"
                        value={formData.reg}
                        onChange={handleInputChange}
                        className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-r-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Auto-generated"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Admission Year</label>
                    <select
                      name="admissionYear"
                      value={formData.admissionYear}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Year</option>
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Student Name *</label>
                    <input
                      type="text"
                      name="studentName"
                      value={formData.studentName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Father Name</label>
                    <input
                      type="text"
                      name="fatherName"
                      value={formData.fatherName}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Mother Name</label>
                    <input
                      type="text"
                      name="motherName"
                      value={formData.motherName}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Contact Number *</label>
                    <input
                      type="tel"
                      name="contactNo"
                      value={formData.contactNo}
                      onChange={handleInputChange}
                      required
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Parent Contact</label>
                    <input
                      type="tel"
                      name="parentContact"
                      value={formData.parentContact}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Category</option>
                      <option value="General">General</option>
                      <option value="OBC">OBC</option>
                      <option value="SC">SC</option>
                      <option value="ST">ST</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Religion</label>
                    <select
                      name="religion"
                      value={formData.religion}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Religion</option>
                      <option value="Hindu">Hindu</option>
                      <option value="Muslim">Muslim</option>
                      <option value="Christian">Christian</option>
                      <option value="Sikh">Sikh</option>
                      <option value="Buddhist">Buddhist</option>
                      <option value="Jain">Jain</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Marital Status</label>
                    <select
                      name="maritalStatus"
                      value={formData.maritalStatus}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Status</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Identity Type</label>
                    <select
                      name="identityType"
                      value={formData.identityType}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select ID Type</option>
                      <option value="Aadhar Card">Aadhar Card</option>
                      <option value="PAN Card">PAN Card</option>
                      <option value="Voter ID">Voter ID</option>
                      <option value="Passport">Passport</option>
                      <option value="Driving License">Driving License</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">ID Number</label>
                    <input
                      type="text"
                      name="idNumber"
                      value={formData.idNumber}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Last General Qualification</label>
                    <input
                      type="text"
                      name="lastGeneralQualification"
                      value={formData.lastGeneralQualification}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">District</label>
                    <input
                      type="text"
                      name="district"
                      value={formData.district}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Pincode</label>
                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email ID</label>
                    <input
                      type="email"
                      name="emailId"
                      value={formData.emailId}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Photo</label>
                    <input
                      type="file"
                      name="photo"
                      onChange={handleFileChange}
                      accept="image/*"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Course Details Section */}
              <div className="mb-8">
                <h2 className="text-lg font-bold text-red-600 mb-6">2. COURSE DETAILS</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Course Category</label>
                    <select
                      name="courseCategory"
                      value={formData.courseCategory}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Category</option>
                      <option value="Certificate">Certificate</option>
                      <option value="Diploma">Diploma</option>
                      <option value="Degree">Degree</option>
                      <option value="Professional">Professional</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Course *</label>
                    <select
                      name="course"
                      value={formData.course}
                      onChange={handleInputChange}
                      required
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Course</option>
                      {loadingCourses ? (
                        <option disabled>Loading courses...</option>
                      ) : (
                        courses.map((course) => (
                          <option key={course.id} value={course.course_name || course.name}>
                            {course.course_name || course.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Course Duration</label>
                    <input
                      type="text"
                      name="courseDuration"
                      value={formData.courseDuration}
                      onChange={handleInputChange}
                      placeholder="e.g., 6 months"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Batch</label>
                    <select
                      name="batch"
                      value={formData.batch}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Batch</option>
                      {loadingBatches ? (
                        <option disabled>Loading batches...</option>
                      ) : (
                        batches.map((batch) => (
                          <option key={batch.id} value={batch.batch_name || batch.name}>
                            {batch.batch_name || batch.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Net Fee</label>
                    <input
                      type="number"
                      name="netFee"
                      value={formData.netFee}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Discount</label>
                    <input
                      type="number"
                      name="discount"
                      value={formData.discount}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Other Charges</label>
                    <input
                      type="number"
                      name="otherCharge"
                      value={formData.otherCharge}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Date of Admission</label>
                    <input
                      type="date"
                      name="dateOfAdmission"
                      value={formData.dateOfAdmission}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Enquiry Source</label>
                    <select
                      name="enquirySource"
                      value={formData.enquirySource}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Source</option>
                      <option value="Walk-in">Walk-in</option>
                      <option value="Online">Online</option>
                      <option value="Referral">Referral</option>
                      <option value="Social Media">Social Media</option>
                      <option value="Advertisement">Advertisement</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 pt-6 border-t bg-gray-50 -mx-6 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {actionLoading ? <FaSpinner className="animate-spin" /> : <FaSave />}
                  Register Student
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // Render content based on view mode
  const renderContent = () => {
    return renderTableView();
  };

  // View Student Modal
  const renderViewModal = () => {
    if (!showViewModal || !selectedStudent) return null;

    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-white/20">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 border-b bg-blue-600 text-white">
            <div className="flex items-center gap-3">
              <span className="text-2xl">👤</span>
              <h2 className="text-xl font-bold">Student Details</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleEditStudent(selectedStudent)}
                className="flex items-center gap-2 px-3 py-1.5 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors text-sm"
              >
                <FaEdit />
                Edit
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedStudent(null);
                }}
                className="p-2 hover:bg-blue-700 rounded-md transition-colors"
              >
                <FaTimes />
              </button>
            </div>
          </div>

          {/* Modal Body - Scrollable */}
          <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
            {/* Student Photo and Basic Info */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-6 pb-6 border-b">
              <div className="w-32 h-32 md:w-24 md:h-24 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm border border-gray-100">
                {selectedStudent.photo ? (
                  <img src={selectedStudent.photo} alt="Student" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl md:text-3xl text-gray-400">👤</span>
                )}
              </div>
              <div className="text-center md:text-left">
                <h3 className="text-2xl md:text-xl font-bold text-gray-800">{selectedStudent.student_name || 'N/A'}</h3>
                <p className="text-blue-600 font-mono text-lg md:text-base">{selectedStudent.registration_number || 'N/A'}</p>
                <p className="text-gray-600">{selectedStudent.course || 'N/A'}</p>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${selectedStudent.admission_status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                  {selectedStudent.admission_status || 'Active'}
                </span>
              </div>
            </div>

            {/* Personal Details */}
            <div className="mb-6">
              <h4 className="text-md font-bold text-red-600 mb-3 flex items-center gap-2">
                <span>📋</span> Personal Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div className="bg-gray-50 p-2 rounded">
                  <label className="block text-xs text-gray-500">Father's Name</label>
                  <p className="font-medium">{selectedStudent.father_name || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <label className="block text-xs text-gray-500">Mother's Name</label>
                  <p className="font-medium">{selectedStudent.mother_name || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <label className="block text-xs text-gray-500">Date of Birth</label>
                  <p className="font-medium">{selectedStudent.date_of_birth || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <label className="block text-xs text-gray-500">Gender</label>
                  <p className="font-medium">{selectedStudent.gender || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <label className="block text-xs text-gray-500">Category</label>
                  <p className="font-medium">{selectedStudent.category || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <label className="block text-xs text-gray-500">Religion</label>
                  <p className="font-medium">{selectedStudent.religion || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="mb-6">
              <h4 className="text-md font-bold text-red-600 mb-3 flex items-center gap-2">
                <span>📞</span> Contact Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div className="bg-gray-50 p-2 rounded">
                  <label className="block text-xs text-gray-500">Contact No</label>
                  <p className="font-medium">{selectedStudent.contact_no || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <label className="block text-xs text-gray-500">Parent Contact</label>
                  <p className="font-medium">{selectedStudent.parent_contact || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <label className="block text-xs text-gray-500">Email</label>
                  <p className="font-medium truncate">{selectedStudent.email_id || selectedStudent.email || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <label className="block text-xs text-gray-500">State</label>
                  <p className="font-medium">{selectedStudent.state || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <label className="block text-xs text-gray-500">District</label>
                  <p className="font-medium">{selectedStudent.district || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <label className="block text-xs text-gray-500">Pincode</label>
                  <p className="font-medium">{selectedStudent.pincode || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded col-span-1 sm:col-span-2 md:col-span-3">
                  <label className="block text-xs text-gray-500">Address</label>
                  <p className="font-medium">{selectedStudent.address || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Course & Fee Details */}
            <div>
              <h4 className="text-md font-bold text-red-600 mb-3 flex items-center gap-2">
                <span>📚</span> Course & Fee Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div className="bg-gray-50 p-2 rounded">
                  <label className="block text-xs text-gray-500">Course</label>
                  <p className="font-medium">{selectedStudent.course || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <label className="block text-xs text-gray-500">Batch</label>
                  <p className="font-medium">{selectedStudent.batch || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <label className="block text-xs text-gray-500">Branch Code</label>
                  <p className="font-medium">{selectedStudent.branch_code || 'N/A'}</p>
                </div>
                <div className="bg-blue-50 p-2 rounded">
                  <label className="block text-xs text-gray-500">Net Fee</label>
                  <p className="font-medium text-blue-600">₹{selectedStudent.net_fee || 0}</p>
                </div>
                <div className="bg-orange-50 p-2 rounded">
                  <label className="block text-xs text-gray-500">Discount</label>
                  <p className="font-medium text-orange-600">₹{selectedStudent.discount || 0}</p>
                </div>
                <div className="bg-green-50 p-2 rounded">
                  <label className="block text-xs text-gray-500">Total Fee</label>
                  <p className="font-medium text-green-600">₹{selectedStudent.total_fee || ((selectedStudent.net_fee || 0) - (selectedStudent.discount || 0))}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Edit Student Modal
  const renderEditModal = () => {
    if (!showEditModal || !selectedStudent) return null;

    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-white/20">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 border-b bg-orange-600 text-white">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✏️</span>
              <h2 className="text-xl font-bold">Edit Student</h2>
            </div>
            <button
              onClick={() => {
                setShowEditModal(false);
                setSelectedStudent(null);
              }}
              className="p-2 hover:bg-orange-700 rounded-md transition-colors"
            >
              <FaTimes />
            </button>
          </div>

          {/* Modal Body - Scrollable */}
          <form onSubmit={handleUpdateStudent} className="overflow-y-auto max-h-[calc(90vh-140px)] p-6">
            {/* Personal Details */}
            <div className="mb-6">
              <h4 className="text-md font-bold text-red-600 mb-3">Personal Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Registration No.</label>
                  <input
                    type="text"
                    value={formData.reg}
                    disabled
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Student Name *</label>
                  <input
                    type="text"
                    name="studentName"
                    value={formData.studentName}
                    onChange={handleInputChange}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Father's Name *</label>
                  <input
                    type="text"
                    name="fatherName"
                    value={formData.fatherName}
                    onChange={handleInputChange}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Mother's Name</label>
                  <input
                    type="text"
                    name="motherName"
                    value={formData.motherName}
                    onChange={handleInputChange}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date Of Birth</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Gender *</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="mb-6">
              <h4 className="text-md font-bold text-red-600 mb-3">Contact Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contact No *</label>
                  <input
                    type="tel"
                    name="contactNo"
                    value={formData.contactNo}
                    onChange={handleInputChange}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Parent Contact</label>
                  <input
                    type="tel"
                    name="parentContact"
                    value={formData.parentContact}
                    onChange={handleInputChange}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    name="emailId"
                    value={formData.emailId}
                    onChange={handleInputChange}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">District</label>
                  <input
                    type="text"
                    name="district"
                    value={formData.district}
                    onChange={handleInputChange}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleInputChange}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="col-span-1 sm:col-span-2 md:col-span-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows="2"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Course & Fee Details */}
            <div className="mb-4">
              <h4 className="text-md font-bold text-red-600 mb-3">Course & Fee Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Course</label>
                  <input
                    type="text"
                    name="course"
                    value={formData.course}
                    onChange={handleInputChange}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Batch</label>
                  <input
                    type="text"
                    name="batch"
                    value={formData.batch}
                    onChange={handleInputChange}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Net Fee</label>
                  <input
                    type="number"
                    name="netFee"
                    value={formData.netFee}
                    onChange={handleInputChange}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Discount</label>
                  <input
                    type="number"
                    name="discount"
                    value={formData.discount}
                    onChange={handleInputChange}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Other Charges</label>
                  <input
                    type="number"
                    name="otherCharge"
                    value={formData.otherCharge}
                    onChange={handleInputChange}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </form>

          {/* Modal Footer */}
          <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
            <button
              type="button"
              onClick={() => {
                setShowEditModal(false);
                setSelectedStudent(null);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpdateStudent}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {actionLoading ? <FaSpinner className="animate-spin" /> : <FaSave />}
              Update Student
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <BranchLayout>
      {renderContent()}
      {renderViewModal()}
      {renderEditModal()}
      {renderFormModal()}
      {loading && (
        <div className="bg-white rounded-lg p-6 flex items-center gap-3">
          <FaSpinner className="animate-spin text-2xl text-blue-600" />
          <span className="text-gray-700">Loading...</span>
        </div>
      )}
    </BranchLayout>
  );
};

export default StudentRegistration;