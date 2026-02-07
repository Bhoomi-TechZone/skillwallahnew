import React, { useState, useEffect } from 'react';
import {
  FaPlus, FaEdit, FaTrash, FaDownload, FaEye,
  FaSearch, FaSpinner, FaTimes,
  FaCertificate, FaCalendarAlt, FaPrint
} from 'react-icons/fa';
import { certificatesApi } from '../../../api/certificatesApi';
import { generateCertificate, printCertificate, printBulkCertificates, downloadCertificate } from '../../../utils/certificateGenerator';
import { getUserData } from '../../../utils/authUtils';

const AdminCertificate = ({ onDataChange }) => {

  // Utility function to generate STRONGLY cache-busted image URLs
  const getCacheBustedImageUrl = (imagePath) => {
    if (!imagePath) return null;
    const cleanPath = imagePath.replace(/\\/g, '/');
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 10);
    const sessionId = Math.random().toString(36).substr(2, 8);
    const cacheBuster = `?cb=${timestamp}&v=${randomId}&sid=${sessionId}&nocache=true&_=${Math.random()}`;
    const baseUrl = cleanPath.startsWith('http') ? cleanPath : `http://localhost:4000/${cleanPath}`;
    return `${baseUrl}${cacheBuster}`;
  };

  // FORCE image reload by clearing browser cache SAFELY
  const forceImageReload = (imageUrl) => {
    if (imageUrl) {
      console.log('🔄 FORCE reloading image:', imageUrl);

      try {
        // Method 1: Create multiple image objects to bust cache
        for (let i = 0; i < 3; i++) {
          const img = new Image();
          img.onload = () => console.log(`✅ Image reload attempt ${i + 1} successful`);
          img.onerror = () => console.warn(`⚠️ Image reload attempt ${i + 1} failed`);
          img.src = `${imageUrl}&bust${i}=${Math.random()}&time=${Date.now()}`;
        }

        // Method 2: Force browser to reload via timestamp (safer)
        const finalImg = new Image();
        finalImg.onload = () => console.log('✅ Final image reload successful');
        finalImg.onerror = () => console.warn('⚠️ Final image reload failed');
        finalImg.src = `${imageUrl}&final=${Date.now()}&rand=${Math.random()}`;

        console.log('✅ Image reload methods initiated safely');
      } catch (error) {
        console.warn('⚠️ Image reload failed safely:', error.message);
      }
    }
  };

  // State management
  const [certificates, setCertificates] = useState([]);
  const [filteredCertificates, setFilteredCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // Changed from '' to 'all'
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Dropdown data from backend
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    student_id: '',
    course_id: '',
    branch_code: '',
    certificate_type: 'completion',
    grade: '',
    cgpa: '',
    duration: '',
    programName: '',
    courseName: '',
    completionDate: '',
    issueDate: '',
    startDate: '', // New field
    certificate_number: '',
    template: 'certificate-fixed', // Fixed template only
    status: 'generated',
    // Additional dynamic fields for certificates
    father_name: '', // Father's name field
    date_of_birth: '', // Date of birth field
    percentage: '', // Percentage marks field
    photograph: null, // Student photo field
    atc_code: '', // ATC Code field (Authorized Training Centre)
    center_name: '', // Training center name
    center_address: '', // Training center address
    sr_number: '', // Serial number for certificate
    mca_registration_number: 'U85300UP2020NPL136478' // MCA Registration number (default value)
  });

  // Static options (these could also come from backend if needed)
  const statusOptions = ['generated', 'issued', 'cancelled'];
  const gradeOptions = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'];

  // Fixed template path - no fallbacks
  const FIXED_TEMPLATE_PATH = 'london_lms/uploads/Certificate/certificate.png';
  const FIXED_OUTPUT_PATH = 'london_lms/uploads/Certificate/generated';

  // Removed template availability state - using fixed template only

  // Certificate generation state
  const [generatedCertificate, setGeneratedCertificate] = useState(null);
  const [generatingCertificate, setGeneratingCertificate] = useState(false);
  const [selectedCertificates, setSelectedCertificates] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [editingCertificate, setEditingCertificate] = useState(null);

  // Load certificates from API with better error handling
  const loadCertificates = async () => {
    try {
      console.log('📋 Loading certificates from API...');
      setLoading(true);
      setError(null);

      // Use the original working getCertificates method with fallback
      let data = [];
      try {
        data = await certificatesApi.getCertificates();
        console.log('✅ Certificates loaded via getCertificates():', data);
      } catch (apiError) {
        console.warn('⚠️ getCertificates failed, trying alternative methods:', apiError);

        // Try role-based fallback only if the user role method exists
        try {
          const userRole = getUserRole();
          console.log('🔄 Trying role-based fetch for role:', userRole);

          if (userRole === 'admin' || userRole === 'super_admin') {
            data = await certificatesApi.getAllCertificates();
          } else if (userRole === 'branch_admin') {
            data = await certificatesApi.getBranchCertificates();
          } else {
            data = await certificatesApi.getMyCertificates();
          }
          console.log('✅ Certificates loaded via role-based method:', data);
        } catch (roleError) {
          console.error('❌ Role-based fetch also failed:', roleError);
          throw apiError; // Throw the original error
        }
      }

      console.log('📊 Total certificates:', data ? data.length : 0);
      console.log('📋 Sample certificate data:', data?.[0]);

      if (Array.isArray(data)) {
        // Process certificates to add cache-busted image URLs
        const processedCertificates = data.map(cert => {
          console.log('Processing certificate:', {
            id: cert.id || cert._id,
            student_name: cert.student_name,
            course_name: cert.course_name,
            status: cert.status,
            certificate_number: cert.certificate_number,
            grade_fields: {
              grade: cert.grade,
              overall_grade: cert.overall_grade,
              final_grade: cert.final_grade,
              result: cert.result,
              marks: cert.marks,
              percentage: cert.percentage
            }
          });
          return {
            ...cert,
            cached_generated_image: cert.file_path ? getCacheBustedImageUrl(cert.file_path) : null
          };
        });

        setCertificates(processedCertificates);
        setFilteredCertificates(processedCertificates);
        console.log('📝 Certificates set in state with cache-busted URLs:', processedCertificates.length);
      } else if (data && Array.isArray(data.certificates)) {
        // Handle object with certificates array
        const processedCertificates = data.certificates.map(cert => {
          console.log('Processing certificate from object:', {
            id: cert.id || cert._id,
            student_name: cert.student_name,
            course_name: cert.course_name,
            status: cert.status,
            certificate_number: cert.certificate_number
          });
          return {
            ...cert,
            cached_generated_image: cert.file_path ? getCacheBustedImageUrl(cert.file_path) : null
          };
        });
        setCertificates(processedCertificates);
        setFilteredCertificates(processedCertificates);
        console.log('📝 Certificates set in state from object response:', processedCertificates.length);
      } else {
        console.warn('⚠️ API returned non-array data:', data);
        setCertificates([]);
        setFilteredCertificates([]);
      }

      // NOTE: Removed automatic parent refresh to prevent reload cycles
      // Parent stats will be refreshed only when data is actually modified (create/update/delete)

    } catch (error) {
      console.error('❌ Error loading certificates:', error);
      setError(error.message || 'Failed to load certificates');
      setCertificates([]);
      setFilteredCertificates([]);

      // NOTE: Removed automatic parent refresh to prevent reload cycles

    } finally {
      setLoading(false);
    }
  };

  // Helper function to get user role
  const getUserRole = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.role || user.user_type || 'student';
    } catch (error) {
      console.warn('Failed to get user role, defaulting to student');
      return 'student';
    }
  };

  // Load branches from backend
  const loadBranches = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const response = await fetch('http://localhost:4000/api/branches/dropdown', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      console.log('Branches API Response:', data);
      if (data.success && data.branches) {
        setBranches(data.branches);
        // Auto-select first branch and set branch_code
        if (data.branches.length > 0) {
          const firstBranch = data.branches[0];
          setSelectedBranch(firstBranch);
          setFormData(prev => ({
            ...prev,
            branch_code: firstBranch.branch_code || firstBranch.code
          }));
        }
      } else if (Array.isArray(data)) {
        setBranches(data);
      } else {
        console.warn('Unexpected branches response format:', data);
        setBranches([]);
      }
    } catch (error) {
      console.error('Error loading branches:', error);
      setBranches([]);
    }
  };

  // Load students from backend
  const loadStudents = async () => {
    try {
      console.log('🔄 loadStudents called in AdminCertificate');
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      console.log('Loading students with token:', token ? 'Present' : 'Missing');

      if (!token) {
        console.warn('❌ No authentication token found');
        setStudents([]);
        return;
      }

      console.log('📡 Making request to /api/branch-students/students');
      const response = await fetch('http://localhost:4000/api/branch-students/students?exclude_id_card=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📋 Students response status:', response.status);
      console.log('📋 Students response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        console.error('❌ HTTP error! status:', response.status);
        const errorText = await response.text();
        console.error('❌ Error response text:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 Students API Response (raw):', data);
      console.log('📊 Response type:', typeof data);
      console.log('📊 Response keys:', Object.keys(data));

      let studentsData = [];

      // Handle different response formats
      if (data && data.success && Array.isArray(data.students)) {
        studentsData = data.students;
        console.log('✅ Using data.students format');
      } else if (data && Array.isArray(data.data)) {
        studentsData = data.data;
        console.log('✅ Using data.data format');
      } else if (Array.isArray(data)) {
        studentsData = data;
        console.log('✅ Using direct array format');
      } else if (data && Array.isArray(data.students)) {
        studentsData = data.students;
        console.log('✅ Using data.students (fallback) format');
      } else {
        console.warn('⚠️ Unexpected students response format:', data);
        studentsData = [];
      }

      console.log('✨ Processed students data:', studentsData);
      console.log('📈 Number of students found:', studentsData.length);

      if (studentsData.length > 0) {
        console.log('👤 First student sample:', studentsData[0]);
        console.log('👤 Student structure check:', {
          id: studentsData[0].id || studentsData[0]._id,
          name: studentsData[0].student_name || studentsData[0].name,
          reg: studentsData[0].registration_number || studentsData[0].reg_no
        });
      } else {
        console.warn('⚠️ No students found in response');
      }

      console.log('💾 Setting students state...');
      setStudents(studentsData);
      console.log('✅ Students state set successfully');

      // Auto-fill branch code from first student if available
      if (studentsData.length > 0 && studentsData[0].branch_code) {
        setFormData(prev => ({
          ...prev,
          branch_code: studentsData[0].branch_code
        }));
        console.log('✅ Branch code auto-filled from first student');
      }

    } catch (error) {
      console.error('💥 Error loading students:', error);
      console.error('💥 Error stack:', error.stack);
      setStudents([]);
    }
  };

  // Load courses from backend
  const loadCourses = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const response = await fetch('http://localhost:4000/api/branch-courses/courses', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      console.log('Courses API Response:', data);
      if (Array.isArray(data)) {
        setCourses(data);
      } else if (data.success && data.courses) {
        setCourses(data.courses);
      } else {
        console.warn('Unexpected courses response format:', data);
        setCourses([]);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
      setCourses([]);
    }
  };

  useEffect(() => {
    console.log('AdminCertificate component mounted, loading data...');
    loadCertificates();
    loadBranches();
    loadStudents();
    loadCourses();
    // Removed template loading - using fixed template only
  }, []);

  // Removed template loading functions - using fixed template path only

  // Debug effect to track students state changes
  useEffect(() => {
    console.log('Students state changed:', {
      count: students.length,
      students: students.slice(0, 3) // Show first 3 students for debugging
    });
  }, [students]);

  // Debug effect to track certificate state changes
  useEffect(() => {
    console.log('📊 Certificates state updated:', {
      totalCertificates: certificates.length,
      filteredCertificates: filteredCertificates.length,
      sampleCertificates: certificates.slice(0, 3).map(cert => ({
        id: cert.id || cert._id,
        student_name: cert.student_name,
        course_name: cert.course_name,
        status: cert.status,
        certificate_number: cert.certificate_number,
        grade: cert.grade || cert.overall_grade || cert.final_grade || cert.result
      }))
    });

    // NOTE: Removed getCertificateStats() call and automatic parent refresh to prevent reload cycles
    // Parent stats are refreshed explicitly after create/update/delete operations only
  }, [certificates]);

  // Filter and search certificates
  useEffect(() => {
    let filtered = Array.isArray(certificates) ? [...certificates] : [];

    // Status filter - fix the logic to handle 'all' and empty string
    if (statusFilter && statusFilter !== 'all' && statusFilter !== '') {
      filtered = filtered.filter(cert => cert.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(cert =>
        (cert.student_name || cert.studentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cert.course_name || cert.courseName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cert.student_registration || cert.registrationNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cert.certificate_number || cert.certificateNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal = a[sortBy] || '';
      let bVal = b[sortBy] || '';

      if (sortBy === 'created_at' || sortBy === 'issue_date') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    console.log('🔍 Filtered certificates:', {
      total: certificates.length,
      filtered: filtered.length,
      statusFilter,
      searchTerm
    });

    setFilteredCertificates(filtered);
  }, [certificates, searchTerm, statusFilter, sortBy, sortOrder]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Special handling for student selection
    if (name === 'student_id') {
      const selectedStudentData = students.find(s => (s.id || s._id) === value);
      console.log('Selected student in certificate form:', selectedStudentData);
      setSelectedStudent(selectedStudentData);
      setFormData(prev => ({
        ...prev,
        [name]: value,
        branch_code: selectedStudentData?.branch_code || selectedStudentData?.center || prev.branch_code
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle student selection
  const handleStudentSelect = (studentId) => {
    const student = students.find(s => (s.id || s._id) === studentId);
    setSelectedStudent(student);
    setFormData(prev => ({
      ...prev,
      student_id: studentId,
      branch_code: student?.branch_code || student?.center || ''
    }));
  };

  // Reset form data
  const resetForm = () => {
    // Use fixed template only
    const defaultTemplate = 'certificate-fixed';

    console.log('🔄 Resetting form with fixed template:', defaultTemplate);

    setFormData({
      student_id: '',
      course_id: '',
      branch_code: '',
      certificate_type: 'completion',
      grade: '',
      cgpa: '',
      duration: '',
      programName: '',
      courseName: '',
      completionDate: '',
      issueDate: '',
      startDate: '',
      certificate_number: '',
      template: defaultTemplate,
      status: 'generated',
      father_name: '',
      date_of_birth: '',
      percentage: '',
      photograph: null,
      atc_code: '',
      center_name: '',
      center_address: '',
      sr_number: '',
      mca_registration_number: 'U85300UP2020NPL136478'
    });
    setSelectedStudent(null);
    setEditingCertificate(null);
  };

  // Show message
  const showMessage = (type, text) => {
    console.log(`💬 Showing ${type} message:`, text);
    setMessage({ type, text });

    // Clear message after appropriate time
    const duration = type === 'success' ? 6000 : 8000; // Longer visibility
    setTimeout(() => setMessage({ type: '', text: '' }), duration);
  };

  // Handle show create certificate modal
  const handleShowCreateModal = async () => {
    console.log('🎯 Opening create certificate modal...');
    resetForm();
    setSelectedCertificate(null);
    setShowCreateModal(true);

    // Force reload students when modal opens
    console.log('🔄 Force reloading students for certificate modal...');
    await loadStudents();
  };

  // Handle create certificate form submission
  const handleCreateCertificate = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);

      // Get selected student data
      const selectedStudentData = students.find(s => (s.id || s._id) === formData.student_id);
      const selectedCourseData = courses.find(c => (c.id || c._id) === formData.course_id);

      // Use fixed template path only
      const selectedTemplate = {
        id: 'certificate-fixed',
        name: 'Certificate Template',
        description: 'Fixed certificate template',
        path: FIXED_TEMPLATE_PATH,
        filename: 'certificate.png'
      };

      if (!selectedStudentData) {
        throw new Error('Selected student not found');
      }

      if (!selectedCourseData) {
        throw new Error('Selected course not found');
      }

      // Generate ULTRA-UNIQUE identifiers with microsecond precision
      const microTime = performance.now();
      const nanoId = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}_${microTime.toString().replace('.', '')}`;
      const strongHash = btoa(`${Date.now()}_${Math.random()}_${microTime}_${formData.student_id}_${Math.random()}`).replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);

      // Prepare certificate data with all form values
      const certificateData = {
        student_id: formData.student_id,
        course_id: formData.course_id,
        certificate_type: formData.certificate_type,
        grade: formData.grade,
        issue_date: new Date().toISOString().split('T')[0], // Always current date
        completion_date: formData.completionDate || new Date().toISOString().split('T')[0], // Dynamic completion
        start_date: formData.startDate,
        duration: formData.duration,

        // Add ULTRA-STRONG unique identifiers to ensure fresh certificate generation
        generation_timestamp: Date.now(),
        micro_timestamp: microTime,
        nano_id: nanoId,
        unique_id: `cert_${nanoId}_${strongHash}`,
        session_id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}_${microTime}`,
        request_hash: strongHash,
        force_new: true,
        force_unique_file: true,
        bypass_cache: true,
        regenerate_always: true,

        // Template information
        template: formData.template,
        template_path: selectedTemplate.path,

        // Student data for template overlay with timestamp
        student_name: selectedStudentData.student_name || selectedStudentData.name,
        student_registration: selectedStudentData.registration_number || selectedStudentData.username,
        father_name: formData.father_name || selectedStudentData.father_name || '',
        date_of_birth: formData.date_of_birth || selectedStudentData.date_of_birth || '',

        // Add generation timestamp to student data for uniqueness
        generation_time: new Date().toISOString(),
        student_name_with_time: `${selectedStudentData.student_name || selectedStudentData.name}_${Date.now()}`,

        // Course data for template overlay with unique elements
        course_name: selectedCourseData.course_name || selectedCourseData.name,
        course_duration: selectedCourseData.duration || formData.duration,

        // Add UNIQUE VISIBLE content that will appear on certificate
        certificate_issue_time: new Date().toLocaleString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        unique_certificate_id: `CERT-${nanoId}-${strongHash.substring(0, 8)}`,
        generation_sequence: `SEQ-${microTime.toString().replace('.', '')}-${Date.now()}`,
        issue_timestamp: Date.now(),
        micro_issue_timestamp: microTime,
        certificate_serial: `SER${nanoId.substring(0, 12).toUpperCase()}`,

        // Additional unique fields that will be visible on certificate
        cgpa: formData.cgpa,
        percentage: formData.percentage,
        programName: formData.programName || selectedCourseData.course_name,
        courseName: formData.courseName || selectedCourseData.course_name,

        // ULTRA-UNIQUE WATERMARK DATA that will make each certificate visually different
        certificate_watermark: `Generated: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN')} [${nanoId.substring(0, 8)}]`,
        unique_batch_id: `BATCH-${nanoId}`,
        generation_note: `Certificate #${strongHash.substring(0, 10)} - Generated: ${new Date().toISOString()}`,
        verification_code: `VER${strongHash.substring(0, 12).toUpperCase()}`,
        certificate_number: `${formData.certificate_number || 'CERT'}-${nanoId.substring(0, 10)}-${strongHash.substring(0, 6)}`,
        status: formData.status,
        // Force ULTRA-unique file naming
        file_suffix: `_${nanoId}_${strongHash.substring(0, 8)}`,
        custom_filename: `certificate_${formData.student_id}_${nanoId}_${strongHash.substring(0, 8)}`,
        output_filename_override: `cert_${formData.student_id}_${Date.now()}_${microTime.toString().replace('.', '')}_${Math.random().toString(36).substring(2, 8)}`,

        // Template specific fields with unique timestamps
        atc_code: formData.atc_code || selectedBranch?.branch_code || 'SKILLWALLAH001',
        center_name: formData.center_name || selectedBranch?.centre_name || 'SkillWallah EdTech',
        center_address: formData.center_address || selectedBranch?.address || 'India',
        sr_number: `${formData.sr_number || 'SR'}-${Date.now()}`,
        mca_registration_number: formData.mca_registration_number || 'U85300UP2020NPL136478',
        // Note: photograph is handled separately and will be added as photo_url
      };

      // Handle photograph upload separately if included
      let photoUrl = null;
      if (formData.photograph) {
        try {
          console.log('📸 Uploading student photograph first...');
          photoUrl = await certificatesApi.uploadStudentPhoto(formData.photograph, formData.student_id);
          console.log('✅ Photo uploaded successfully:', photoUrl);
        } catch (error) {
          console.error('❌ Photo upload failed:', error);
          showMessage('error', 'Failed to upload student photograph: ' + error.message);
          return;
        }
      }

      // Add photo URL to certificate data
      if (photoUrl) {
        certificateData.photo_url = photoUrl;
      }

      const result = await certificatesApi.generateCertificate(certificateData);
      console.log('✅ Certificate creation result:', result);

      // Show success message with enhanced feedback
      const successMessage = `✅ New Certificate Generated Successfully! 
      Student: ${selectedStudentData.student_name || selectedStudentData.name}
      Time: ${new Date().toLocaleTimeString()}
      Unique ID: ${certificateData.unique_id}`;
      showMessage('success', successMessage);

      // Keep modal open briefly to show success, then close
      setTimeout(() => {
        setShowCreateModal(false);
      }, 2000); // 2 second delay to show success message

      // Reset form
      resetForm();

      // Single refresh of certificates data
      await loadCertificates();

      // Notify parent component about data change (for stats update)
      if (onDataChange) {
        console.log('📊 Triggering stats refresh after certificate creation');
        onDataChange();
      }

      // Auto-preview the created certificate if result contains certificate data
      if (result && result.certificate) {
        console.log('🖼️ Auto-opening certificate preview...');

        // Convert file_path to generated_image URL for preview with cache busting
        let generatedImageUrl = null;
        if (result.certificate.file_path) {
          // Use the utility function for consistent cache busting
          generatedImageUrl = getCacheBustedImageUrl(result.certificate.file_path);
          console.log('📸 Certificate image URL with cache buster:', generatedImageUrl);

          // Force image reload
          forceImageReload(generatedImageUrl);
        }

        // Create a preview object with the new certificate data
        const newCertificate = {
          ...result.certificate,
          student_name: selectedStudentData.student_name || selectedStudentData.name,
          student_registration: selectedStudentData.registration_number || selectedStudentData.username,
          course_name: selectedCourseData.course_name || selectedCourseData.name,
          template: formData.template,
          template_info: selectedTemplate,
          generated_image: generatedImageUrl
        };

        // Open preview with small delay to ensure modal closes first
        setTimeout(() => {
          setSelectedCertificate(newCertificate);
          setShowPreviewModal(true);
        }, 100);
      }
    } catch (error) {
      console.error('❌ Error creating certificate:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });

      // More detailed error message
      let errorMessage = 'Failed to create certificate';
      if (error.message.includes('404')) {
        errorMessage = 'Student or course not found. Please check your selections.';
      } else if (error.message.includes('400')) {
        errorMessage = 'Invalid data provided. Please check all required fields.';
      } else if (error.message.includes('500')) {
        errorMessage = 'Server error occurred. Please try again or contact support.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      showMessage('error', errorMessage);
      console.log('🚫 Not closing modal - allowing user to retry');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit certificate
  const handleEditCertificate = (certificate) => {
    setSelectedCertificate(certificate);

    // Find and set the selected student
    const student = students.find(s => (s.id || s._id) === certificate.student_id);
    setSelectedStudent(student);

    setFormData({
      student_id: certificate.student_id || '',
      course_id: certificate.course_id || '',
      certificate_type: certificate.certificate_type || 'completion',
      grade: certificate.grade || '',
      issueDate: certificate.issue_date ? certificate.issue_date.split('T')[0] : '',
      completionDate: certificate.completion_date ? certificate.completion_date.split('T')[0] : '',
      certificate_number: certificate.certificate_number || '',
      status: certificate.status || 'generated',
      branch_code: certificate.branch_code || '',
      cgpa: certificate.cgpa || '',
      duration: certificate.duration || '',
      programName: certificate.programName || '',
      courseName: certificate.courseName || certificate.course_name || '',
      startDate: certificate.start_date || '',
      father_name: certificate.father_name || '',
      date_of_birth: certificate.date_of_birth || '',
      percentage: certificate.percentage || '',
      photograph: null,
      atc_code: certificate.atc_code || '',
      center_name: certificate.center_name || '',
      template: certificate.template || 'certificate-fixed'
    });
    setShowEditModal(true);
  };

  // Status badge styling
  const getStatusBadge = (status) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
    switch (status) {
      case 'issued':
        return `${baseClasses} bg-orange-100 text-orange-800`;
      case 'generated':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'cancelled':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  // Status color helper
  const getStatusColor = (status) => {
    switch (status) {
      case 'issued':
        return 'bg-orange-100 text-orange-800';
      case 'generated':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Grade color helper
  const getGradeColor = (grade) => {
    if (!grade) return 'bg-gray-100 text-gray-800';
    const gradeUpper = grade.toUpperCase();
    if (gradeUpper === 'A+' || gradeUpper === 'A') {
      return 'bg-orange-100 text-orange-800';
    } else if (gradeUpper === 'B+' || gradeUpper === 'B') {
      return 'bg-blue-100 text-blue-800';
    } else if (gradeUpper === 'C+' || gradeUpper === 'C') {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-red-100 text-red-800';
    }
  };

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-GB');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Handle preview certificate generation - uses existing image or generates fresh
  const handlePreviewCertificate = async (certificate) => {
    // Prevent multiple simultaneous generations
    if (generatingCertificate) {
      console.log('🚫 Certificate generation already in progress, skipping...');
      return;
    }

    try {
      console.log('🎓 Opening certificate preview for:', certificate);

      // Check if certificate already has a generated image file from backend
      if (certificate.file_path) {
        // Apply cache busting even to existing certificates
        const cacheBustedImageUrl = getCacheBustedImageUrl(certificate.file_path);
        console.log('📸 Using existing certificate image with cache busting:', cacheBustedImageUrl);

        // Force reload the existing image to ensure fresh display
        forceImageReload(cacheBustedImageUrl);

        setSelectedCertificate({
          ...certificate,
          generated_image: cacheBustedImageUrl,
          template_info: { name: `Default Template [Loaded: ${new Date().toLocaleTimeString()}]` }
        });
        setShowPreviewModal(true);
        return;
      }

      // If no file_path, generate certificate on frontend
      setGeneratingCertificate(true);
      setGeneratedCertificate(null);

      // Clear any previous certificate data to ensure fresh generation
      setSelectedCertificate({
        ...certificate,
        generated_image: null,
        template_info: null
      });
      setShowPreviewModal(true);

      // Get fresh student and course data
      const studentData = students.find(s => (s.id || s._id) === certificate.student_id);
      const courseData = courses.find(c => (c.id || c._id) === certificate.course_id);

      if (!studentData || !courseData) {
        throw new Error('Student or course data not found');
      }

      // Use fixed template only
      const templateUsed = {
        id: 'certificate-fixed',
        name: 'Certificate Template',
        description: 'Fixed certificate template',
        path: FIXED_TEMPLATE_PATH,
        filename: 'certificate.png'
      };

      console.log('🎨 Using fixed template:', templateUsed);

      // Get branch data for certificate content
      const userData = getUserData();

      // Prepare data for certificate generator with UNIQUE CONTENT for each preview
      const certificateData = {
        // Basic student info with timestamp to make it unique
        student_name: `${studentData.student_name || studentData.name} [Preview: ${Date.now()}]`,
        student_registration: studentData.registration_number || studentData.username,
        father_name: certificate.father_name,
        date_of_birth: certificate.date_of_birth,

        // Add unique identifiers to make each preview different
        course_name: `${courseData.course_name || courseData.name} [Generated: ${new Date().toLocaleTimeString()}]`,
        course_duration: courseData.duration,
        start_date: certificate.start_date,
        certificate_number: `${certificate.certificate_number || 'CERT'}-PREVIEW-${Date.now()}`,
        certificate_type: certificate.certificate_type,
        grade: certificate.grade,
        percentage: certificate.percentage,
        completion_date: certificate.completion_date || new Date().toISOString().split('T')[0],
        issue_date: certificate.issue_date || new Date().toISOString().split('T')[0],
        cgpa: certificate.cgpa,
        template: certificate.template,

        // Add unique watermark data for preview
        preview_timestamp: new Date().toLocaleString('en-IN'),
        preview_id: `PREVIEW-${Date.now()}`,
        unique_preview_code: Math.random().toString(36).substr(2, 10).toUpperCase(),
        atc_code: certificate.atc_code,
        center_name: certificate.center_name || userData?.branch_name || userData?.name || 'SkillWallah EdTech',
        center_address: userData?.address || '',
        photo_url: studentData.photo || studentData.profile_image
      };

      console.log('🎨 Certificate data for preview:', certificateData);
      console.log('📄 Template being used:', templateUsed);
      console.log('🖼️ Template path:', templateUsed.path);

      // Generate certificate with proper template path
      const certificateImage = await generateCertificate(certificateData, templateUsed.path);

      // Create cache-busted URL for the generated certificate
      const cacheBustedImageUrl = getCacheBustedImageUrl(certificateImage);
      setGeneratedCertificate(cacheBustedImageUrl);

      setSelectedCertificate({
        ...certificate,
        generated_image: cacheBustedImageUrl,
        template_info: templateUsed
      });

      // Force reload the image
      forceImageReload(cacheBustedImageUrl);

    } catch (error) {
      console.error('Error generating certificate preview:', error);
      showMessage('error', 'Failed to generate certificate preview: ' + error.message);
    } finally {
      setGeneratingCertificate(false);
    }
  };

  // Handle regenerate certificate - calls backend API to recreate the certificate file
  const handleRegenerateCertificate = async (certificate) => {
    try {
      console.log('🔄 Regenerating certificate:', certificate);
      setGeneratingCertificate(true);

      // Get the certificate ID
      const certificateId = certificate._id || certificate.id || certificate.certificate_id;
      if (!certificateId) {
        throw new Error('Certificate ID not found');
      }

      showMessage('info', 'Regenerating certificate file...');

      // Add STRONG unique identifiers for fresh regeneration
      const regenerateData = {
        certificate_id: certificateId,
        generation_timestamp: Date.now(),
        unique_id: `regen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        regeneration_hash: `reghash_${btoa(Date.now() + Math.random()).replace(/[^a-zA-Z0-9]/g, '').substr(0, 16)}`,
        session_token: `regsess_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`,
        force_new: true,
        force_unique_file: true,
        delete_old_file: true,
        create_new_always: true
      };

      // Call the backend regenerate API with unique data
      const result = await certificatesApi.regenerateCertificate(certificateId, regenerateData);
      console.log('✅ Regenerate API result:', result);

      if (result && result.success) {
        // Build the new image URL with enhanced cache busting
        const cacheBustedImageUrl = getCacheBustedImageUrl(result.certificate.file_path);

        console.log('📸 New certificate image URL:', cacheBustedImageUrl);

        // Update the selected certificate with new image
        setSelectedCertificate({
          ...certificate,
          ...result.certificate,
          generated_image: cacheBustedImageUrl,
          template_info: { name: 'Default Template' }
        });

        // Force reload the image
        forceImageReload(cacheBustedImageUrl);

        showMessage('success', 'Certificate regenerated successfully!');

        // Force refresh certificates list after a short delay with cache busting
        setTimeout(async () => {
          console.log('🔄 Force refreshing certificate list after regeneration...');
          await loadCertificates();

          // Update the current certificate in the list
          setCertificates(prev => prev.map(c =>
            (c._id || c.id || c.certificate_id) === certificateId
              ? { ...c, cached_generated_image: cacheBustedImageUrl, file_path: result.certificate.file_path }
              : c
          ));
          setFilteredCertificates(prev => prev.map(c =>
            (c._id || c.id || c.certificate_id) === certificateId
              ? { ...c, cached_generated_image: cacheBustedImageUrl, file_path: result.certificate.file_path }
              : c
          ));
        }, 1000);

        // Immediate refresh as well
        await loadCertificates();
      } else {
        throw new Error(result?.message || 'Failed to regenerate certificate');
      }

    } catch (error) {
      console.error('❌ Error regenerating certificate:', error);
      showMessage('error', 'Failed to regenerate certificate: ' + error.message);
    } finally {
      setGeneratingCertificate(false);
    }
  };

  // Handle download certificate
  const handleDownload = async (certificate) => {
    try {
      console.log('💾 Downloading certificate for:', certificate);
      setLoading(true);

      const response = await certificatesApi.downloadCertificate(certificate.id || certificate._id);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${certificate.certificate_number}_${certificate.student_name?.replace(/\s+/g, '_')}_Certificate.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showMessage('success', 'Certificate downloaded successfully!');
    } catch (error) {
      console.error('Error downloading certificate:', error);
      showMessage('error', 'Failed to download certificate: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle print certificate
  const handlePrintCertificate = async (certificate) => {
    try {
      console.log('🖨️ Printing certificate for:', certificate);
      setLoading(true);

      // Get the certificate file from backend API
      const response = await certificatesApi.downloadCertificate(certificate.id || certificate._id);

      if (!response.ok) {
        throw new Error(`Failed to get certificate: ${response.status}`);
      }

      // Get the blob and create URL
      const blob = await response.blob();
      const imageUrl = window.URL.createObjectURL(blob);

      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>Certificate - ${certificate.certificate_number}</title>
            <style>
              body {
                margin: 0;
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background-color: #f5f5f5;
              }
              img {
                max-width: 100%;
                max-height: 100%;
                height: auto;
                border: 1px solid #ddd;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              }
              @media print {
                body {
                  background-color: white;
                  padding: 0;
                  margin: 0;
                }
                img {
                  border: none;
                  box-shadow: none;
                  max-width: 100%;
                  height: auto;
                }
              }
            </style>
          </head>
          <body>
            <img src="${imageUrl}" alt="Certificate" onload="window.focus(); setTimeout(() => window.print(), 500);" />
          </body>
        </html>
      `);
      printWindow.document.close();

      // Clean up the blob URL after printing
      setTimeout(() => {
        window.URL.revokeObjectURL(imageUrl);
      }, 10000);

      showMessage('success', 'Certificate sent to printer!');

    } catch (error) {
      console.error('Error printing certificate:', error);
      showMessage('error', 'Failed to print certificate: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk operations
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedCertificates([]);
    } else {
      setSelectedCertificates(filteredCertificates.map(cert => cert.id || cert._id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectCertificate = (certificateId) => {
    if (selectedCertificates.includes(certificateId)) {
      setSelectedCertificates(selectedCertificates.filter(id => id !== certificateId));
    } else {
      setSelectedCertificates([...selectedCertificates, certificateId]);
    }
  };

  const handleBulkPrint = async () => {
    if (selectedCertificates.length === 0) {
      alert('Please select at least one certificate to print');
      return;
    }

    try {
      setLoading(true);
      const certificatesToPrint = filteredCertificates.filter(cert =>
        selectedCertificates.includes(cert.id || cert._id)
      );

      const certificateImages = [];

      for (const certificate of certificatesToPrint) {
        const studentData = students.find(s => (s.id || s._id) === certificate.student_id);
        const courseData = courses.find(c => (c.id || c._id) === certificate.course_id);

        // Use fixed template only
        const templateUsed = {
          id: 'certificate-fixed',
          name: 'Certificate Template',
          path: FIXED_TEMPLATE_PATH
        };

        if (studentData && courseData) {
          const userData = getUserData();

          const certificateData = {
            student_name: studentData.student_name || studentData.name,
            student_registration: studentData.registration_number || studentData.username,
            course_name: courseData.course_name || courseData.name,
            certificate_number: certificate.certificate_number,
            certificate_type: certificate.certificate_type,
            grade: certificate.grade,
            completion_date: certificate.completion_date,
            issue_date: certificate.issue_date,
            father_name: certificate.father_name,
            date_of_birth: certificate.date_of_birth,
            percentage: certificate.percentage,
            atc_code: certificate.atc_code,
            center_name: certificate.center_name || userData?.branch_name || userData?.name || 'SkillWallah EdTech',
            center_address: userData?.address || '',
            photo_url: studentData.photo || studentData.profile_image,
            template: certificate.template
          };

          const certificateImage = await generateCertificate(certificateData, templateUsed.path);
          certificateImages.push(certificateImage);
        }
      }

      printBulkCertificates(certificateImages);
      console.log('✅ Bulk certificates printed successfully');

    } catch (error) {
      console.error('Error printing bulk certificates:', error);
      showMessage('error', 'Failed to print certificates: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle edit certificate
  const handleEdit = (certificate) => {
    try {
      console.log('✏️ Editing certificate:', certificate);

      // Find corresponding student and course
      const studentData = students.find(s => (s.id || s._id) === certificate.student_id);
      const courseData = courses.find(c => (c.id || c._id) === certificate.course_id);

      if (!studentData) {
        showMessage('error', 'Student data not found for this certificate');
        return;
      }

      // Populate form with certificate data
      setFormData({
        student_id: certificate.student_id,
        course_id: certificate.course_id,
        certificate_type: certificate.certificate_type || 'completion',
        grade: certificate.grade || '',
        issue_date: certificate.issue_date,
        completion_date: certificate.completion_date,
        percentage: certificate.percentage || '',
        father_name: certificate.father_name || '',
        date_of_birth: certificate.date_of_birth || '',
        atc_code: certificate.atc_code || '',
        center_name: certificate.center_name || '',
        center_address: certificate.center_address || '',
        status: certificate.status
      });

      setSelectedStudent(studentData);
      setEditingCertificate(certificate);
      setShowCreateModal(true);

    } catch (error) {
      console.error('Error preparing edit:', error);
      showMessage('error', 'Failed to load certificate data for editing');
    }
  };

  // Handle form submission (create or update)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editingCertificate) {
      // Update existing certificate
      await handleSaveCertificate();
    } else {
      // Create new certificate
      await handleCreateCertificate();
    }
  };

  // Handle save certificate (for updates)
  const handleSaveCertificate = async () => {
    try {
      if (!editingCertificate) {
        showMessage('error', 'No certificate selected for editing');
        return;
      }

      setLoading(true);
      console.log('💾 Saving certificate changes:', formData);

      const updateData = {
        certificate_type: formData.certificate_type,
        grade: formData.grade,
        issue_date: formData.issue_date,
        completion_date: formData.completion_date,
        status: formData.status,
        percentage: formData.percentage,
        father_name: formData.father_name,
        date_of_birth: formData.date_of_birth,
        atc_code: formData.atc_code,
        center_name: formData.center_name,
        center_address: formData.center_address
      };

      const result = await certificatesApi.updateCertificate(editingCertificate.id || editingCertificate._id, updateData);
      console.log('✅ Certificate update result:', result);

      showMessage('success', 'Certificate updated successfully!');
      setShowCreateModal(false);
      setEditingCertificate(null);
      resetForm();

      // Refresh certificates and update parent stats
      await loadCertificates();
      if (onDataChange) {
        console.log('📊 Triggering stats refresh after certificate update');
        onDataChange();
      }

    } catch (error) {
      console.error('Error saving certificate:', error);
      showMessage('error', error.message || 'Failed to save certificate changes');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete certificate
  const handleDelete = async (certificateId) => {
    if (window.confirm('Are you sure you want to delete this certificate?')) {
      try {
        await certificatesApi.deleteCertificate(certificateId);
        showMessage('success', 'Certificate deleted successfully!');
        await loadCertificates();

        // Update parent stats after deletion
        if (onDataChange) {
          console.log('📊 Triggering stats refresh after certificate deletion');
          onDataChange();
        }
      } catch (error) {
        console.error('Error deleting certificate:', error);
        showMessage('error', error.message || 'Failed to delete certificate');
      }
    }
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = Array.isArray(filteredCertificates) ? filteredCertificates.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = Math.ceil((Array.isArray(filteredCertificates) ? filteredCertificates.length : 0) / itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white p-2 rounded-lg">
                <FaCertificate className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-secondary-900">🏆 Certificate Management</h1>
                <p className="text-sm text-secondary-600 mt-1">Create and manage student certificates</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-yellow-50 px-4 py-2 rounded-lg whitespace-nowrap">
                <span className="text-sm font-medium text-yellow-700">
                  Total: {filteredCertificates.length}
                </span>
              </div>
              <div className="bg-orange-50 px-4 py-2 rounded-lg whitespace-nowrap">
                <span className="text-sm font-medium text-orange-700">
                  Issued: {Array.isArray(filteredCertificates) ? filteredCertificates.filter(c => c.status === 'issued').length : 0}
                </span>
              </div>
              <button
                onClick={handleShowCreateModal}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-6 py-2.5 rounded-lg font-medium flex items-center justify-center space-x-2 transition-all duration-200 shadow-lg hover:shadow-xl w-full sm:w-auto"
              >
                <FaPlus className="w-4 h-4" />
                <span>Create Certificate</span>
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
              placeholder="Search certificates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 w-full border border-secondary-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors"
          >
            <option value="all">--- All Status ---</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Certificates Table */}
        {/* Mobile View - Cards */}
        <div className="md:hidden space-y-4 mb-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading certificates...</p>
            </div>
          ) : currentItems.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm text-gray-500">
              No certificates found
            </div>
          ) : (
            currentItems.map((certificate) => (
              <div key={certificate.id || certificate._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{certificate.student_name || certificate.studentName || 'N/A'}</h3>
                    <p className="text-sm text-blue-600">{certificate.student_registration || certificate.registrationNumber || 'No Registration'}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(certificate.status || 'draft')}`}>
                    {certificate.status ? certificate.status.charAt(0).toUpperCase() + certificate.status.slice(1) : 'Draft'}
                  </span>
                </div>

                <div className="border-t border-gray-100 pt-2 space-y-1">
                  <p className="text-sm text-gray-700"><span className="font-medium">Course:</span> {certificate.course_name || certificate.courseName || 'N/A'}</p>
                  <p className="text-xs text-gray-500">{certificate.program_name || certificate.programName}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-gray-50 p-2 rounded">
                    <span className="text-xs text-gray-500 block">Certificate No</span>
                    <span className="font-mono text-orange-600 font-medium break-all">{certificate.certificate_number || certificate.certificateNumber || 'Not Generated'}</span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <span className="text-xs text-gray-500 block">Grade</span>
                    <span className={`font-medium ${getGradeColor(certificate.grade || certificate.overall_grade || certificate.final_grade || certificate.result)}`}>
                      {certificate.grade || certificate.overall_grade || certificate.final_grade || certificate.result || certificate.marks || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>Issued: {formatDate(certificate.issueDate || certificate.issue_date)}</span>
                  <span>Comp: {formatDate(certificate.completionDate || certificate.completion_date)}</span>
                </div>

                <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-gray-100">
                  <button onClick={() => handlePreviewCertificate(certificate)} disabled={generatingCertificate} className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"><FaEye /></button>
                  <button onClick={() => handleEdit(certificate)} className="p-2 text-yellow-600 bg-yellow-50 rounded-lg hover:bg-yellow-100"><FaEdit /></button>
                  {(certificate.status === 'generated' || certificate.status === 'issued') && (
                    <>
                      <button onClick={() => handleDownload(certificate)} className="p-2 text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100"><FaDownload /></button>
                      <button onClick={() => handlePrintCertificate(certificate)} className="p-2 text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100"><FaPrint /></button>
                    </>
                  )}
                  <button onClick={() => handleDelete(certificate.id)} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100"><FaTrash /></button>
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
                <tr className="bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-yellow-200">
                  <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">S.No.</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">Student Details</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">Course Info</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Certificate No.</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Academic Info</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Dates</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Status</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-12 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600"></div>
                        <span className="text-sm text-gray-500">Loading certificates...</span>
                      </div>
                    </td>
                  </tr>
                ) : currentItems.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-12 text-center text-sm text-gray-500">
                      No certificates found
                    </td>
                  </tr>
                ) : (
                  currentItems.map((certificate, index) => (
                    <tr key={certificate.id || certificate._id} className="hover:bg-yellow-50 transition-colors">
                      <td className="px-4 py-4">
                        <span className="text-sm font-medium text-secondary-900">
                          {indexOfFirstItem + index + 1}.
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold text-secondary-900">
                            {certificate.student_name || certificate.studentName || 'N/A'}
                          </h3>
                          <p className="text-xs text-blue-600 font-medium">
                            {certificate.student_registration || certificate.registrationNumber || 'No Registration'}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-secondary-900 max-w-xs truncate">
                            {certificate.course_name || certificate.courseName || 'N/A'}
                          </div>
                          <div className="text-xs text-purple-600 truncate max-w-xs">{certificate.program_name || certificate.programName || ''}</div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-center">
                        <div className="text-sm font-mono text-orange-600 bg-orange-50 px-2 py-1 rounded inline-block">
                          {certificate.certificate_number || certificate.certificateNumber || 'Not Generated'}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-center">
                        <div className="space-y-1">
                          <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getGradeColor(certificate.grade || certificate.overall_grade || certificate.final_grade || certificate.result)}`}>
                            Grade: {certificate.grade || certificate.overall_grade || certificate.final_grade || certificate.result || certificate.marks || 'N/A'}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-center">
                        <div className="space-y-1">
                          <div className="flex items-center justify-center space-x-1 text-xs text-orange-600">
                            <FaCalendarAlt className="w-3 h-3" />
                            <span>Completed: {formatDate(certificate.completionDate || certificate.completion_date)}</span>
                          </div>
                          <div className="flex items-center justify-center space-x-1 text-xs text-blue-600">
                            <FaCalendarAlt className="w-3 h-3" />
                            <span>Issued: {formatDate(certificate.issueDate || certificate.issue_date)}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-center">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(certificate.status || 'draft')}`}>
                          {certificate.status ? certificate.status.charAt(0).toUpperCase() + certificate.status.slice(1) : 'Draft'}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => handlePreviewCertificate(certificate)}
                            disabled={generatingCertificate}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Generate & Preview Certificate"
                          >
                            {generatingCertificate ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            ) : (
                              <FaEye className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            onClick={() => handleEdit(certificate)}
                            className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                            title="Edit"
                          >
                            <FaEdit className="w-4 h-4" />
                          </button>

                          {certificate.status === 'generated' || certificate.status === 'issued' ? (
                            <>
                              <button
                                onClick={() => handleDownload(certificate)}
                                className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition-colors"
                                title="Download"
                              >
                                <FaDownload className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handlePrintCertificate(certificate)}
                                className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                title="Print"
                              >
                                <FaPrint className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-gray-500 px-2">Not available</span>
                          )}

                          <button
                            onClick={() => handleDelete(certificate.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <FaTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
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
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredCertificates.length)} of {filteredCertificates.length} certificates
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm bg-yellow-600 text-white rounded-md">
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

      {/* (Create/Edit small modal block left as-is in your file; omitted here for brevity in explanation) */}
      {/* The rest of your modals (showModal, showCreateModal, showPreviewModal) remain unchanged
            except they now use the updated handlers and state above. */}

      {/* Create Certificate Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FaCertificate className="w-6 h-6 text-yellow-600" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    {editingCertificate ? 'Edit Certificate' : 'Create New Certificate'}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingCertificate(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Error/Success Messages */}
            {message.text && (
              <div className={`mx-6 mt-4 p-4 rounded-lg ${message.type === 'success'
                ? 'bg-orange-100 border border-orange-400 text-orange-700'
                : 'bg-red-100 border border-red-400 text-red-700'
                }`}>
                {message.text}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Student Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Student Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Student *
                    </label>
                    <select
                      required
                      name="student_id"
                      value={formData.student_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    >
                      <option value="">
                        {students.length === 0 ? 'Loading students...' : `-- Select Student (${students.length} available) --`}
                      </option>
                      {students && students.length > 0 && students.map((student) => {
                        const studentId = student.id || student._id || student.student_id;
                        const studentName = student.student_name || student.name || student.full_name || 'Unknown Student';
                        const regNumber = student.registration_number || student.reg_no || student.registration_no || 'No Reg#';

                        if (!studentId) {
                          console.warn('Student missing ID:', student);
                          return null;
                        }

                        return (
                          <option key={studentId} value={studentId}>
                            {studentName} - {regNumber}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Registration Number
                    </label>
                    <input
                      type="text"
                      disabled
                      value={selectedStudent?.registration_number || selectedStudent?.reg_no || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      placeholder="Auto-filled"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Branch/Center
                    </label>
                    <input
                      type="text"
                      disabled
                      value={selectedStudent?.center || selectedStudent?.branch || selectedStudent?.branch_code || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      placeholder="Auto-filled"
                    />
                  </div>
                </div>

                {/* Additional Student Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Father's Name *
                    </label>
                    <input
                      type="text"
                      required
                      name="father_name"
                      value={formData.father_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      placeholder="Enter father's name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      required
                      name="date_of_birth"
                      value={formData.date_of_birth}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Percentage *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      required
                      name="percentage"
                      value={formData.percentage}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      placeholder="e.g., 85.50"
                    />
                  </div>
                </div>

                {/* Student Photograph and Center Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Student Photograph *
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      required
                      onChange={(e) => {
                        const file = e.target.files[0];
                        setFormData(prev => ({ ...prev, photograph: file }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Upload student's photograph (JPG, PNG)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ATC Code *
                    </label>
                    <input
                      type="text"
                      required
                      name="atc_code"
                      value={formData.atc_code}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      placeholder="e.g., SKILLWALLAH102"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Center Name *
                    </label>
                    <input
                      type="text"
                      required
                      name="center_name"
                      value={formData.center_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      placeholder="e.g., SAKSHI COMPUTER EDUCATION INSTITUTE"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Course/Program *
                    </label>
                    <select
                      required
                      name="course_id"
                      value={formData.course_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    >
                      <option value="">{courses.length === 0 ? 'Loading courses...' : '-- Select Course --'}</option>
                      {courses.map((course) => (
                        <option key={course.id || course._id} value={course.id || course._id}>
                          {course.course_name || course.name} {course.course_code ? `(${course.course_code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Branch Code
                    </label>
                    <input
                      type="text"
                      name="branch_code"
                      value={formData.branch_code}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-gray-100"
                      placeholder="Auto-filled from student"
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Certificate Type *
                    </label>
                    <select
                      required
                      name="certificate_type"
                      value={formData.certificate_type}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    >
                      <option value="completion">Completion</option>
                      <option value="achievement">Achievement</option>
                      <option value="participation">Participation</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Academic Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Academic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Grade *
                    </label>
                    <select
                      required
                      name="grade"
                      value={formData.grade}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    >
                      <option value="">-- Select Grade --</option>
                      {gradeOptions.map((grade) => (
                        <option key={grade} value={grade}>{grade}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CGPA *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      required
                      name="cgpa"
                      value={formData.cgpa}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      placeholder="0.0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration *
                    </label>
                    <input
                      type="text"
                      required
                      name="duration"
                      value={formData.duration}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      placeholder="12 months"
                    />
                  </div>
                </div>
              </div>

              {/* Certificate Details */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Certificate Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Certificate Number
                    </label>
                    <input
                      type="text"
                      name="certificate_number"
                      value={formData.certificate_number}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      placeholder="Auto-generated if empty"
                    />
                  </div>


                </div>
              </div>

              {/* Dates */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Important Dates</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Completion Date *
                    </label>
                    <input
                      type="date"
                      required
                      name="completionDate"
                      value={formData.completionDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Issue Date *
                    </label>
                    <input
                      type="date"
                      required
                      name="issueDate"
                      value={formData.issueDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Certificate Status</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status *
                  </label>
                  <select
                    required
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 max-w-xs"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <FaCertificate className="w-4 h-4" />
                  )}
                  <span>{isSubmitting ? (editingCertificate ? 'Updating...' : 'Creating...') : (editingCertificate ? 'Update Certificate' : 'Create Certificate')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Certificate Preview Modal */}
      {showPreviewModal && selectedCertificate && (
        <div className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Certificate Preview</h3>
                  {selectedCertificate.template_info && (
                    <p className="text-sm text-gray-600">Template: {selectedCertificate.template_info.name || selectedCertificate.template}</p>
                  )}
                </div>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Certificate Preview */}
            <div className="px-6 py-8">
              {/* Show loading state when generating */}
              {generatingCertificate ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Generating certificate preview...</p>
                  <p className="text-sm text-gray-500 mt-2">Please wait while we create your certificate</p>
                </div>
              ) : selectedCertificate.generated_image ? (
                <div className="text-center">
                  <img
                    src={selectedCertificate.generated_image}
                    alt="Certificate"
                    className="max-w-full h-auto border border-gray-300 rounded-lg shadow-lg"
                    onError={(e) => {
                      console.error('Generated certificate image failed to load:', selectedCertificate.generated_image);
                      // Show fallback and option to regenerate
                      e.target.style.display = 'none';
                      const fallback = e.target.nextSibling;
                      if (fallback) fallback.style.display = 'block';
                    }}
                  />
                  {/* Fallback content when image fails to load */}
                  <div style={{ display: 'none' }} className="border-2 border-yellow-300 rounded-lg p-6 bg-yellow-50">
                    <div className="text-center space-y-4 mb-6">
                      <FaCertificate className="w-16 h-16 text-yellow-600 mx-auto" />
                      <h2 className="text-xl font-bold text-yellow-800">Certificate Image Not Found</h2>
                      <p className="text-yellow-600">The certificate file may need to be regenerated.</p>
                      <div className="space-y-2 mt-4">
                        <h3 className="text-lg font-semibold text-blue-600">
                          {selectedCertificate.student_name || selectedCertificate.studentName}
                        </h3>
                        <p className="text-gray-600">Certificate: {selectedCertificate.certificate_number}</p>
                        <p className="text-gray-600">Course: {selectedCertificate.course_name || selectedCertificate.courseName}</p>
                      </div>
                      <button
                        onClick={() => handleRegenerateCertificate(selectedCertificate)}
                        disabled={generatingCertificate}
                        className="mt-4 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {generatingCertificate ? '⏳ Regenerating...' : '🔄 Regenerate Certificate'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-4 border-yellow-500 rounded-lg p-8 bg-gradient-to-br from-yellow-50 to-orange-50">
                  <div className="text-center space-y-4">
                    <div className="flex justify-center">
                      <FaCertificate className="w-16 h-16 text-yellow-600" />
                    </div>
                    <p className="text-red-600 text-sm">⚠️ Certificate image not available - click to generate preview</p>

                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold text-blue-600">
                        {selectedCertificate.student_name || selectedCertificate.studentName}
                      </h2>
                      <p className="text-lg text-gray-700">
                        Registration No: <span className="font-mono font-medium">
                          {selectedCertificate.student_registration || selectedCertificate.registrationNumber}
                        </span>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-lg text-gray-700">has successfully completed the course</p>
                      <h3 className="text-xl font-bold text-purple-600">
                        {selectedCertificate.course_name || selectedCertificate.courseName}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                      {(selectedCertificate.grade || selectedCertificate.overall_grade || selectedCertificate.final_grade || selectedCertificate.result || selectedCertificate.marks) && (
                        <div>
                          <p className="text-gray-600">Grade Achieved</p>
                          <p className="text-2xl font-bold text-orange-600">{selectedCertificate.grade || selectedCertificate.overall_grade || selectedCertificate.final_grade || selectedCertificate.result || selectedCertificate.marks}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-600">Certificate Number</p>
                        <p className="text-lg font-mono font-bold text-purple-600">
                          {selectedCertificate.certificate_number || selectedCertificate.certificateNumber}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-gray-600">Completion Date</p>
                        <p className="font-medium">
                          {formatDate(selectedCertificate.completion_date || selectedCertificate.completionDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Issue Date</p>
                        <p className="font-medium">
                          {formatDate(selectedCertificate.issue_date || selectedCertificate.issueDate)}
                        </p>
                      </div>
                    </div>
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
              {selectedCertificate.generated_image && (
                <>
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = selectedCertificate.generated_image;
                      link.download = `certificate_${selectedCertificate.certificate_number || 'preview'}.png`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <FaDownload className="w-4 h-4 mr-2 inline" />
                    Download Image
                  </button>
                  <button
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                      printWindow.document.write(`
                          <html>
                            <head><title>Certificate</title></head>
                            <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;">
                              <img src="${selectedCertificate.generated_image}" style="max-width:100%;height:auto;" />
                            </body>
                          </html>
                        `);
                      printWindow.document.close();
                      printWindow.focus();
                      setTimeout(() => printWindow.print(), 250);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <FaPrint className="w-4 h-4 mr-2 inline" />
                    Print
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCertificate;
