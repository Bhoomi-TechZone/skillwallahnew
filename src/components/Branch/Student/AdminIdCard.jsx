import React, { useState, useEffect } from 'react';
import { FaSearch, FaPrint, FaTrash, FaEye, FaPlus, FaTimes, FaCamera, FaDownload } from 'react-icons/fa';
import BranchLayout from '../BranchLayout';
import branchStudentService from '../../../services/branchStudentService';
import { branchCourseService } from '../../../services/branchCourseService';
import branchDetailsService from '../../../services/branchDetailsService';
import { branchesApi } from '../../../api/branchesApi';
import { getUserData } from '../../../utils/authUtils';
import { generateIdCard, printIdCard, printBulkIdCards, downloadIdCard } from '../../../utils/idCardGenerator';

const AdminIdCard = () => {
  // State management
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [error, setError] = useState(null);
  const [branchData, setBranchData] = useState(null);

  // Get user data for branch info
  const userData = getUserData();

  // Simple branch code and name handling
  const branchCode = userData?.branch_code || userData?.franchise_code || 'DEFAULT';
  const branchName = branchData?.branchName || branchData?.centre_name || branchData?.name ||
    userData?.branch_name || userData?.centre_name || userData?.franchise_name ||
    userData?.center_name || userData?.center ||
    (branchCode !== 'DEFAULT' ? branchCode.replace(/[-_]/g, ' ') : 'Branch');

  console.log('🛡️ [ID CARD] Available branch name sources:', {
    'branchData.branchName': branchData?.branchName,
    'branchData.centre_name': branchData?.centre_name,
    'branchData.name': branchData?.name,
    'userData.branch_name': userData?.branch_name,
    'userData.centre_name': userData?.centre_name,
    'userData.franchise_name': userData?.franchise_name,
    'userData.center_name': userData?.center_name,
    'userData.center': userData?.center,
    'branchCode_formatted': (branchCode !== 'DEFAULT' ? branchCode.replace(/[-_]/g, ' ') : 'N/A'),
    'final_branchName': branchName
  });
  const [searchFilters, setSearchFilters] = useState({
    username: '',
    studentName: '',
    contactNo: ''
  });
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedStudentForPreview, setSelectedStudentForPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [generatedIdCard, setGeneratedIdCard] = useState(null);
  const [generatingIdCard, setGeneratingIdCard] = useState(false);



  // Form data for adding new ID card
  const [formData, setFormData] = useState({
    student_name: '',
    registration_number: '',
    date_of_birth: '',
    course: '',
    duration: '',
    center: branchName && branchName !== 'Branch' ? branchName : '',
    address: '',
    contact_no: '',
    email_id: '',
    father_name: '',
    mother_name: '',
    password: '',
    admission_year: new Date().getFullYear().toString(),
    batch: '',
    date_of_admission: new Date().toISOString().split('T')[0],
    photo: null,
    photoPreview: null
  });

  // Load students from API
  const loadStudents = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try with proper branch context and cache busting
      const queryParams = userData?.branch_code ?
        { branch_code: userData.branch_code } :
        userData?.franchise_code ?
          { franchise_code: userData.franchise_code } :
          {};

      // Add cache busting parameter
      queryParams._t = new Date().getTime();

      console.log('🔍 [ID CARD] Query params for students:', queryParams);
      const result = await branchStudentService.getStudents(queryParams);
      console.log('✅ [ID CARD] Students API response:', result);

      let rawStudents = [];
      if (Array.isArray(result)) {
        rawStudents = result;
      } else if (result.students && Array.isArray(result.students)) {
        rawStudents = result.students;
      } else if (result.data && Array.isArray(result.data)) {
        rawStudents = result.data;
      } else if (result.success && result.data && Array.isArray(result.data.students)) {
        rawStudents = result.data.students;
      }

      // Fetch ID cards from backend using single, reliable endpoint
      console.log('🔍 [ID CARD] Fetching ID cards from backend...');
      let idCards = [];
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');

      try {
        const idCardResponse = await fetch('http://localhost:4000/api/branch/id-cards', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        if (idCardResponse.ok) {
          const idCardResult = await idCardResponse.json();
          console.log('✅ [ID CARD] ID cards response:', idCardResult);

          // Handle different response formats consistently
          if (Array.isArray(idCardResult)) {
            idCards = idCardResult;
          } else if (idCardResult.data && Array.isArray(idCardResult.data)) {
            idCards = idCardResult.data;
          } else if (idCardResult.success && Array.isArray(idCardResult.id_cards)) {
            idCards = idCardResult.id_cards;
          } else {
            console.warn('⚠️ [ID CARD] Unexpected response format:', idCardResult);
          }

          console.log(`📊 [ID CARD] Successfully loaded ${idCards.length} ID cards`);
        } else {
          console.error('❌ [ID CARD] Failed to fetch ID cards:', idCardResponse.status);
        }
      } catch (error) {
        console.error('❌ [ID CARD] Error fetching ID cards:', error);
      }

      // Cache raw students data
      localStorage.setItem('branch_idcard_students', JSON.stringify(rawStudents));
      // Store ID cards separately if needed, or rely on transformed data caching


      // Create multiple maps for matching ID cards with students
      const idCardMap = {};
      const registrationMap = {};
      const nameMap = {};

      idCards.forEach(card => {
        const cardData = {
          id: card._id || card.id,
          card_number: card.card_number,
          issue_date: card.issue_date,
          expiry_date: card.expiry_date,
          status: card.status,
          file_path: card.file_path,
          photo_url: card.photo_url,
          student_photo_url: card.student_photo_url,
          course_duration: card.course_duration,
          duration: card.duration,
          address: card.address,
          student_name: card.student_name,
          branch_code: card.branch_code
        };

        // Map by student ID
        if (card.student_id) {
          idCardMap[card.student_id] = cardData;
        }

        // Map by registration number
        if (card.student_registration) {
          registrationMap[card.student_registration] = cardData;
        }

        // Map by student name (as backup)
        if (card.student_name) {
          const nameKey = card.student_name.toLowerCase().trim();
          nameMap[nameKey] = cardData;
        }
      });

      console.log('🗂️ [ID CARD] ID Card maps created:');
      console.log('🆔 Student ID Map:', Object.keys(idCardMap).length, 'entries');
      console.log('📄 Registration Map:', Object.keys(registrationMap).length, 'entries');
      console.log('👤 Name Map:', Object.keys(nameMap).length, 'entries');
      console.log('🔍 Sample entries:', {
        idCardMap: Object.keys(idCardMap).slice(0, 3),
        registrationMap: Object.keys(registrationMap).slice(0, 3),
        nameMap: Object.keys(nameMap).slice(0, 3)
      });

      // Standardize student objects and match with ID cards using comprehensive strategies
      const mappedStudents = rawStudents.map(s => {
        const studentId = s.id || s._id;
        const studentName = s.student_name || s.name || 'Unknown';
        const registrationNumber = s.registration_number || s.registration_no || s.registrationNo || 'N/A';

        // Try multiple matching strategies
        let matchedIdCard = null;

        // Strategy 1: Match by student ID
        if (studentId && idCardMap[studentId]) {
          matchedIdCard = idCardMap[studentId];
        }

        // Strategy 2: Match by registration number
        if (!matchedIdCard && registrationNumber && registrationMap[registrationNumber]) {
          matchedIdCard = registrationMap[registrationNumber];
        }

        // Strategy 3: Match by name (case-insensitive)
        if (!matchedIdCard && studentName) {
          const nameKey = studentName.toLowerCase().trim();
          if (nameMap[nameKey]) {
            matchedIdCard = nameMap[nameKey];
          }
        }

        // Strategy 4: Cross-reference matching (for cases like same student, different branch codes)
        if (!matchedIdCard && studentName && registrationNumber) {
          // Look for similar patterns in any ID card
          const possibleMatch = idCards.find(card => {
            const nameMatches = card.student_name &&
              card.student_name.toLowerCase().trim() === studentName.toLowerCase().trim();
            const idMatches = card.student_id === studentId;
            const regSimilar = card.student_registration &&
              (card.student_registration.includes(studentName.split(' ')[0]) ||
                registrationNumber.includes(card.student_registration.split('_')[0]));

            return nameMatches || idMatches || regSimilar;
          });

          if (possibleMatch) {
            matchedIdCard = {
              id: possibleMatch._id || possibleMatch.id,
              card_number: possibleMatch.card_number,
              issue_date: possibleMatch.issue_date,
              expiry_date: possibleMatch.expiry_date,
              status: possibleMatch.status,
              file_path: possibleMatch.file_path,
              photo_url: possibleMatch.photo_url,
              student_photo_url: possibleMatch.student_photo_url,
              course_duration: possibleMatch.course_duration,
              duration: possibleMatch.duration,
              address: possibleMatch.address,
              student_name: possibleMatch.student_name,
              branch_code: possibleMatch.branch_code
            };
            console.log(`✅ [ID CARD] Strategy 4 SUCCESS - Cross-matched ${studentName} with card:`, possibleMatch.card_number);
          }
        }

        // Strategy 5: Check inline ID card data
        if (!matchedIdCard && s.id_card) {
          matchedIdCard = {
            id: s.id_card.id || s.id_card._id,
            card_number: s.id_card.card_number,
            issue_date: s.id_card.issue_date,
            expiry_date: s.id_card.expiry_date,
            status: s.id_card.status,
            file_path: s.id_card.file_path,
            photo_url: s.id_card.photo_url,
            student_photo_url: s.id_card.student_photo_url,
            course_duration: s.id_card.course_duration,
            duration: s.id_card.duration,
            address: s.id_card.address
          };
          console.log(`✅ [ID CARD] Strategy 5 SUCCESS - Using inline ID card for ${studentName}`);
        }

        if (!matchedIdCard) {
          console.log(`❌ [ID CARD] No ID card found for ${studentName} using any strategy`);
        }

        return {
          ...s,
          id: studentId,
          student_name: studentName,
          contact_no: s.contact_no || s.contact_number || s.contact || s.phone || s.mobile || 'N/A',
          course: s.course || s.course_name || s.course_enrolled || 'N/A',
          registration_number: registrationNumber,
          // Ensure these fields are preserved and properly mapped
          date_of_birth: s.date_of_birth || s.dob || s.birth_date || '',
          duration: s.duration || s.course_duration || s.program_duration || 'N/A',
          center: (() => {
            // Enhanced center name mapping with multiple fallback strategies
            const centerFields = [
              s.center,
              s.centre,
              s.centre_name,
              s.branch,
              s.branch_name,
              s.franchise_name,
              s.institute_name,
              s.center_name
            ];

            // Find first valid center name
            const validCenter = centerFields.find(field => field && field !== 'N/A' && field.trim() !== '');

            if (validCenter) {
              return validCenter;
            }

            // Use resolved branch name as fallback
            if (branchName && branchName !== 'Branch') {
              return branchName;
            }

            // Format branch code as last resort
            if (s.branch_code && s.branch_code !== 'DEFAULT') {
              return s.branch_code.replace(/[-_]/g, ' ').toUpperCase();
            }

            return 'N/A';
          })(),
          address: s.address || s.student_address || s.permanent_address || 'N/A',
          email_id: s.email_id || s.email || s.student_email || '',
          father_name: s.father_name || s.fathers_name || s.parent_name || 'N/A',
          mother_name: s.mother_name || s.mothers_name || 'N/A',
          date_of_admission: s.date_of_admission || s.admission_date || s.enrollment_date || s.joining_date || '',
          photo: s.photo || s.photo_url || s.student_photo || s.profile_image || '',
          photoPreview: (() => {
            const API_BASE_URL = 'http://localhost:4000';
            const photoSources = [s.photoPreview, s.photo, s.photo_url, s.student_photo, s.profile_image].filter(Boolean);
            if (photoSources.length > 0) {
              const photo = photoSources[0];
              // If already a full URL, use it
              if (photo.startsWith('http') || photo.startsWith('data:')) {
                return photo;
              } else {
                // Clean the path and construct URL
                let cleanPath = photo.replace(/^\/+/, ''); // Remove leading slashes

                // Try different URL constructions
                if (cleanPath.includes('uploads/')) {
                  const fullUrl = `${API_BASE_URL}/${cleanPath}`;
                  console.log(`📸 [PHOTO] ${s.student_name}: ${photo} -> ${fullUrl}`);
                  return fullUrl;
                } else {
                  // Try multiple standard paths
                  const fullUrl = `${API_BASE_URL}/uploads/profile/${cleanPath}`;
                  console.log(`📸 [PHOTO] ${s.student_name}: ${photo} -> ${fullUrl}`);
                  return fullUrl;
                }
              }
            }
            return '';
          })(),
          // Map ID card data from matching strategies
          id_card: matchedIdCard ? {
            id: matchedIdCard.id,
            card_number: matchedIdCard.card_number,
            issue_date: matchedIdCard.issue_date,
            expiry_date: matchedIdCard.expiry_date,
            status: matchedIdCard.status,
            file_path: matchedIdCard.file_path,
            photo_url: matchedIdCard.photo_url,
            student_photo_url: matchedIdCard.student_photo_url,
            course_duration: matchedIdCard.course_duration,
            duration: matchedIdCard.duration,
            address: matchedIdCard.address
          } : null,
          // Also check for has_id_card flag
          has_id_card: !!matchedIdCard || s.has_id_card || !!s.id_card
        };
      });

      console.log('📋 [ID CARD] Mapped students with ID card data:', mappedStudents);

      // Log first few students for debugging
      mappedStudents.slice(0, 3).forEach((student, idx) => {
        console.log(`👤 [ID CARD] Student ${idx + 1} Debug:`, {
          name: student.student_name,
          registration: student.registration_number,
          center: student.center,
          branch_code: student.branch_code,
          center_fields: {
            original_center: student.center,
            centre: student.centre,
            branch: student.branch,
            branch_name: student.branch_name,
            franchise_name: student.franchise_name,
            resolved_branchName: branchName
          },
          has_id_card: student.has_id_card,
          photo: student.photo,
          photoPreview: student.photoPreview
        });
      });

      // Filter out admin users and keep only actual students
      const actualStudents = mappedStudents.filter(student => {
        // Exclude admin roles - keep only students
        const userRole = student.role || student.user_role || student.account_type || '';
        const isAdmin = userRole.toLowerCase().includes('admin') ||
          userRole.toLowerCase().includes('staff') ||
          userRole.toLowerCase().includes('teacher') ||
          userRole.toLowerCase().includes('instructor');

        // Also check if this looks like a student record (has student-specific fields)
        const hasStudentFields = student.course || student.registration_number || student.admission_date;

        const isStudent = !isAdmin && hasStudentFields;
        return isStudent;
      });

      console.log(`🎯 [ID CARD] Filtered to actual students: ${actualStudents.length} from ${mappedStudents.length} total records`);

      // For franchise admin, show all students. For branch admin, filter by branch
      const filteredStudents = userData?.role === 'admin' || userData?.franchise_code ?
        actualStudents : // Show all students for franchise admin
        actualStudents.filter(student => {
          const studentBranch = student.center || student.branch || student.branch_code || '';
          const matchesBranch = studentBranch.toLowerCase() === branchName.toLowerCase() ||
            studentBranch.toLowerCase().includes(branchName.toLowerCase()) ||
            student.branch_code === branchCode;
          return matchesBranch;
        });

      setStudents(filteredStudents);
      // Cache the final processed list
      localStorage.setItem('branch_idcard_students_list', JSON.stringify(filteredStudents));
    } catch (error) {
      console.error('❌ [ID CARD] Error loading students:', error);
      console.error('❌ [ID CARD] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setError(`Failed to load students: ${error.message}. Please check console for details.`);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // Load courses from API
  const loadCourses = async () => {
    try {
      setCoursesLoading(true);
      console.log('🔍 [ID CARD] Loading courses...');

      const response = await branchCourseService.getCourses();
      console.log('✅ [ID CARD] Courses loaded:', response);

      if (response.success && response.data) {
        setCourses(response.data);
      } else {
        console.warn('⚠️ [ID CARD] Failed to load courses');
        setCourses([]);
      }
    } catch (error) {
      console.error('❌ [ID CARD] Error loading courses:', error);
      setCourses([]);
    } finally {
      setCoursesLoading(false);
    }
  };

  // Load branch details from API
  const loadBranchDetails = async () => {
    try {
      console.log('🔍 [ID CARD] Loading branch details...');
      const details = await branchDetailsService.getCurrentBranchDetails();
      console.log('✅ [ID CARD] Branch details loaded:', details);
      if (details) {
        setBranchData(details);
        // Update form data center field with actual branch name
        if (details.branchName || details.centre_name || details.name) {
          const actualBranchName = details.branchName || details.centre_name || details.name;
          console.log('🏛️ [ID CARD] Setting branch name to:', actualBranchName);
          setFormData(prev => ({ ...prev, center: actualBranchName }));
        }
      }
    } catch (error) {
      console.error('❌ [ID CARD] Error loading branch details:', error);
    }
  };

  // Load all branches for dropdown
  const loadBranches = async () => {
    try {
      setBranchesLoading(true);
      console.log('🔍 [ID CARD] Loading all branches...');

      // Try to get all branches
      const userData = getUserData();
      const franchiseCode = userData?.franchise_code;

      let branchesData;
      if (franchiseCode) {
        console.log('📡 [ID CARD] Fetching branches for franchise:', franchiseCode);
        branchesData = await branchesApi.getBranches(franchiseCode);
      } else {
        console.log('📡 [ID CARD] Fetching all branches');
        branchesData = await branchesApi.getAllBranches();
      }

      console.log('✅ [ID CARD] Branches data received:', branchesData);

      // Extract branches array from response
      let branchesArray = [];
      if (Array.isArray(branchesData)) {
        branchesArray = branchesData;
      } else if (branchesData.branches && Array.isArray(branchesData.branches)) {
        branchesArray = branchesData.branches;
      } else if (branchesData.data && Array.isArray(branchesData.data)) {
        branchesArray = branchesData.data;
      }

      console.log(`✅ [ID CARD] Loaded ${branchesArray.length} branches`);
      setBranches(branchesArray);
    } catch (error) {
      console.error('❌ [ID CARD] Error loading branches:', error);
      // Set default to current branch if loading fails
      if (branchName && branchName !== 'Branch') {
        setBranches([{ centre_info: { centre_name: branchName }, franchise_code: branchCode }]);
      }
    } finally {
      setBranchesLoading(false);
    }
  };

  useEffect(() => {
    // 1. Try to load from cache immediately (Stale-While-Revalidate)
    const CACHE_KEY_STUDENTS = 'branch_idcard_students_list';
    const cachedStudents = localStorage.getItem(CACHE_KEY_STUDENTS);

    if (cachedStudents) {
      try {
        setStudents(JSON.parse(cachedStudents));
        setLoading(false); // Show cached data immediately
      } catch (e) { console.error('Error parsing cached data', e); }
    }

    loadBranchDetails();

    // Initial Load - don't show loading if cached
    if (!cachedStudents) setLoading(true);
    loadStudents();
    loadCourses();
    loadBranches(); // Load branches for dropdown

    // Set up periodic database sync to ensure UI stays in sync
    const syncInterval = setInterval(async () => {
      console.log('🔄 [AUTO SYNC] Checking for database updates...');
      try {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        const response = await fetch('http://localhost:4000/api/branch/id-cards', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          const currentData = await response.json();
          const currentIdCards = currentData.success ? (currentData.id_cards || []) : [];

          // Check if we need to refresh by comparing counts
          const token = localStorage.getItem('lastIdCardCount');
          const lastCount = parseInt(token || '0');
          const currentCount = currentIdCards.length;

          if (currentCount !== lastCount) {
            console.log(`🔄 [AUTO SYNC] Database changed: ${lastCount} -> ${currentCount} ID cards. Refreshing...`);
            localStorage.setItem('lastIdCardCount', currentCount.toString());
            await loadStudents();
          }
        }
      } catch (error) {
        console.log('🔄 [AUTO SYNC] Check failed (normal during development):', error.message);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(syncInterval);
  }, []);

  // Handle search input changes
  const handleSearchChange = (field, value) => {
    setSearchFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle form input changes
  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-fill duration when course is selected
    if (field === 'course') {
      const selectedCourse = courses.find(c => c.course_name === value);
      if (selectedCourse && selectedCourse.duration_hours) {
        const months = Math.ceil(selectedCourse.duration_hours / 720);
        setFormData(prev => ({
          ...prev,
          duration: `${months} Month${months > 1 ? 's' : ''}`
        }));
      }
    }
  };

  // Handle photo upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          photo: file,
          photoPreview: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle add new ID card
  const handleAddNew = () => {
    setFormData({
      student_name: '',
      registration_number: `${branchCode}_${new Date().getFullYear()}_${String(students.length + 1).padStart(3, '0')}`,
      date_of_birth: '',
      course: '',
      duration: '',
      center: branchName,
      address: '',
      contact_no: '',
      email_id: '',
      father_name: '',
      mother_name: '',
      password: '',
      admission_year: new Date().getFullYear().toString(),
      batch: '',
      date_of_admission: new Date().toISOString().split('T')[0],
      photo: null,
      photoPreview: null
    });
    setIsAddModalOpen(true);
  };

  // Handle save student with ID card
  const handleSaveIdCard = async (e) => {
    e.preventDefault();

    if (!formData.student_name || !formData.registration_number || !formData.contact_no) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      console.log('💾 [ID CARD] Saving student:', formData);

      // Prepare student data for API
      const studentData = {
        branch_code: branchCode,
        registration_number: formData.registration_number,
        student_name: formData.student_name,
        father_name: formData.father_name || 'N/A',
        mother_name: formData.mother_name || 'N/A',
        date_of_birth: formData.date_of_birth,
        contact_no: formData.contact_no,
        email_id: formData.email_id,
        password: formData.password || 'password123',
        admission_year: formData.admission_year,
        course: formData.course,
        batch: formData.batch || 'Default',
        date_of_admission: formData.date_of_admission,
        address: formData.address,
        center: formData.center,
        duration: formData.duration,
        net_fee: 0,
        discount: 0,
        other_charge: 0
      };

      console.log('📤 [ID CARD] Sending student data:', studentData);

      const result = await branchStudentService.registerStudent(studentData);
      console.log('✅ [ID CARD] Student created:', result);

      // Merge the result with formData to ensure we have all fields
      const savedStudent = {
        ...studentData,
        ...result,
        id: result.id || result._id,
        photoPreview: formData.photoPreview,
        photo: formData.photoPreview, // Ensure photo is available for ID card generation
        student_photo: formData.photoPreview,
        photo_url: formData.photoPreview,
        profile_image: formData.photoPreview,
        profile_photo: formData.photoPreview,
        image: formData.photoPreview,
        avatar: formData.photoPreview
      };

      // Upload photo if provided
      if (formData.photo && savedStudent.id) {
        try {
          await branchStudentService.uploadStudentPhoto(savedStudent.id, formData.photo);
          console.log('✅ [ID CARD] Photo uploaded');

          // Update the savedStudent with the uploaded photo info
          savedStudent.photo = formData.photoPreview;
          savedStudent.photoPreview = formData.photoPreview;
          savedStudent.student_photo = formData.photoPreview;
          savedStudent.photo_url = formData.photoPreview;
          savedStudent.profile_image = formData.photoPreview;

        } catch (photoError) {
          console.warn('⚠️ [ID CARD] Photo upload failed:', photoError);
        }
      }

      // Create ID card record in database
      if (savedStudent.id) {
        try {
          console.log('💾 [ID CARD] Creating ID card record for new student...');
          const token = localStorage.getItem('access_token') || localStorage.getItem('token');

          const idCardPayload = {
            student_id: savedStudent.id,
            student_name: savedStudent.student_name,
            registration_number: savedStudent.registration_number,
            branch_code: branchCode,
            card_number: `ID-${savedStudent.registration_number}`,
            issue_date: new Date().toISOString(),
            expiry_date: new Date(Date.now() + (2 * 365 * 24 * 60 * 60 * 1000)).toISOString(), // 2 years from now
            status: 'active',
            card_type: 'student',
            photo_url: savedStudent.photoPreview || savedStudent.photo_url
          };

          console.log('📤 [ID CARD] Saving ID card to database:', idCardPayload);

          const idCardResponse = await fetch('http://localhost:4000/api/branch/id-cards', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(idCardPayload)
          });

          if (idCardResponse.ok) {
            const savedIdCard = await idCardResponse.json();
            console.log('✅ [ID CARD] ID card saved to database:', savedIdCard);
            savedStudent.id_card = savedIdCard;
            savedStudent.has_id_card = true;
          } else {
            const errorText = await idCardResponse.text();
            console.error('❌ [ID CARD] Failed to save ID card to database:', idCardResponse.status, errorText);
          }
        } catch (idCardError) {
          console.error('❌ [ID CARD] ID card creation error:', idCardError);
        }
      }

      alert('Student and ID Card created successfully!');
      setIsAddModalOpen(false);

      // Force reload students to get fresh data
      await loadStudents();

      // Add a small delay and then auto-preview with the fresh student data
      setTimeout(async () => {
        // Get the fresh student data from the reloaded list
        await loadStudents(); // Double refresh to ensure data is up-to-date
        const freshStudent = students.find(s => s.id === savedStudent.id || s.registration_number === savedStudent.registration_number);
        if (freshStudent) {
          console.log('📸 [ID CARD] Auto-previewing with fresh student data:', freshStudent);
          // Ensure the fresh student has all photo data
          const enrichedStudent = {
            ...freshStudent,
            photoPreview: savedStudent.photoPreview,
            photo: savedStudent.photo,
            student_photo: savedStudent.student_photo,
            photo_url: savedStudent.photo_url,
            profile_image: savedStudent.profile_image,
            profile_photo: savedStudent.profile_photo,
            image: savedStudent.image,
            avatar: savedStudent.avatar
          };
          handlePreviewIdCard(enrichedStudent);
        } else {
          handlePreviewIdCard(savedStudent);
        }
      }, 1000);

    } catch (error) {
      console.error('❌ [ID CARD] Error saving student:', error);
      alert(error.message || 'Failed to save student. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Shared photo resolution function for consistency across all ID card operations
  const resolveStudentPhoto = (student) => {
    const API_BASE_URL = 'http://localhost:4000';
    let photoUrl = '';

    // Priority 1: Check idCard.student_photo_url (actual student photo, NOT photo_url which is ID card file path)
    const photoSources = [
      student.id_card?.student_photo_url,  // Base64 or URL of student photo from backend
      student.photoPreview,
      student.photo,
      student.photo_url,
      student.student_photo,
      student.profile_image,
      student.profile_photo,
      student.image,
      student.avatar
    ].filter(Boolean);

    console.log('📸 [PHOTO RESOLVE] Available photo sources:', photoSources);
    console.log('📸 [PHOTO RESOLVE] Student photo fields:', {
      idCard_student_photo_url: student.id_card?.student_photo_url,
      photo: student.photo,
      photoPreview: student.photoPreview,
      photo_url: student.photo_url,
      student_photo: student.student_photo,
      profile_image: student.profile_image,
      profile_photo: student.profile_photo,
      image: student.image,
      avatar: student.avatar,
      note: 'id_card.photo_url is ID card file path, not student photo'
    });

    if (photoSources.length > 0) {
      const primaryPhoto = photoSources[0];

      if (primaryPhoto.startsWith('data:image/')) {
        // Base64 image data - use directly
        photoUrl = primaryPhoto;
        console.log('📸 [PHOTO RESOLVE] Using base64 image data');
      } else if (primaryPhoto.startsWith('http://') || primaryPhoto.startsWith('https://')) {
        // Full URL - use directly
        photoUrl = primaryPhoto;
        console.log('📸 [PHOTO RESOLVE] Using full URL:', photoUrl);
      } else if (primaryPhoto.startsWith('/uploads/') || primaryPhoto.startsWith('uploads/')) {
        // Relative path to uploads
        const cleanPath = primaryPhoto.startsWith('/') ? primaryPhoto : `/${primaryPhoto}`;
        photoUrl = `${API_BASE_URL}${cleanPath}`;
        console.log('📸 [PHOTO RESOLVE] Converted relative upload path to full URL:', photoUrl);
      } else if (primaryPhoto.includes('uploads')) {
        // Contains uploads in path
        const uploadsIndex = primaryPhoto.indexOf('uploads');
        const pathFromUploads = primaryPhoto.substring(uploadsIndex);
        photoUrl = `${API_BASE_URL}/${pathFromUploads}`;
        console.log('📸 [PHOTO RESOLVE] Extracted uploads path:', photoUrl);
      } else {
        // Treat as filename in profile uploads
        photoUrl = `${API_BASE_URL}/uploads/profile/${primaryPhoto}`;
        console.log('📸 [PHOTO RESOLVE] Treating as profile filename:', photoUrl);
      }
    } else {
      console.log('📸 [PHOTO RESOLVE] No photo sources found, using default');
      photoUrl = null;
    }

    console.log('📸 [PHOTO RESOLVE] Final resolved photo URL:', photoUrl);
    return photoUrl && photoUrl !== '' && photoUrl !== 'N/A' ? photoUrl : null;
  };

  // Handle preview ID card
  const handlePreviewIdCard = async (student) => {
    try {
      console.log('🎴 [ID CARD] Previewing ID card for:', student.student_name);

      // Check if this student's ID card was explicitly deleted
      if (student.id_card_deleted) {
        console.log('⚠️ [ID CARD] Student ID card was deleted, showing preview only');
      }

      // Set loading state and open modal immediately
      setSelectedStudentForPreview(student);
      setGeneratedIdCard(null); // Reset previous image
      setIsPreviewModalOpen(true);
      setGeneratingIdCard(true);

      console.log('🎨 [ID CARD] Preview requested for student:', student);

      // Use shared photo resolution function
      const photoUrl = resolveStudentPhoto(student);

      // Ensure all necessary fields are present
      const studentData = {
        student_name: student.student_name || student.name || 'N/A',
        registration_number: student.registration_number || student.reg_no || 'N/A',
        date_of_birth: student.date_of_birth || student.dob || '',
        course: student.course || student.course_name || 'N/A',
        duration: (() => {
          const durationFields = [student.id_card?.course_duration, student.course_duration, student.duration, student.program_duration, student.course_period];
          const validDuration = durationFields.find(field =>
            field &&
            field !== 'N/A' &&
            field !== '' &&
            field !== 'Not specified' &&
            field !== null &&
            field !== undefined
          );
          console.log(`⏱️ [ADMIN DURATION] Student ${student.student_name} duration analysis:`, {
            idCard_course_duration: student.id_card?.course_duration,
            course_duration: student.course_duration,
            duration: student.duration,
            program_duration: student.program_duration,
            course_period: student.course_period,
            validDuration: validDuration,
            final: validDuration || 'N/A'
          });
          return validDuration || 'N/A';
        })(),
        center: student.center || student.branch || branchName || 'N/A',
        address: student.id_card?.address || student.address || 'N/A',
        contact_no: student.contact_no || student.phone || student.mobile || 'N/A',
        email_id: student.email_id || student.email || '',
        father_name: student.father_name || 'N/A',
        mother_name: student.mother_name || 'N/A',
        date_of_admission: student.date_of_admission || student.admission_date || '',
        // Ensure photo URLs are properly validated and accessible
        photo: photoUrl && photoUrl !== '' && photoUrl !== 'N/A' ? photoUrl : null,
        photoPreview: photoUrl && photoUrl !== '' && photoUrl !== 'N/A' ? photoUrl : null,
        student_photo_url: student.id_card?.student_photo_url,
        photo_url: student.id_card?.photo_url,
        course_duration: student.id_card?.course_duration
      };

      console.log('🎨 [ID CARD] Final student data prepared for generation:', studentData);
      console.log('📸 [ID CARD] Photo validation details:', {
        originalPhotoUrl: photoUrl,
        hasValidPhoto: !!(photoUrl && photoUrl !== '' && photoUrl !== 'N/A'),
        photoInData: studentData.photo,
        photoPreviewInData: studentData.photoPreview
      });

      console.log('🎨 [ID CARD] Starting ID card generation...');

      // First, check if ID card exists in database, if not create it
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      let existingIdCard = null;

      try {
        // Check if ID card already exists
        const checkResponse = await fetch(`http://localhost:4000/api/branch/id-cards/student/${student.id || student._id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        if (checkResponse.ok) {
          existingIdCard = await checkResponse.json();
          console.log('🔍 [ID CARD PREVIEW] Existing ID card found:', existingIdCard);
        }
      } catch (error) {
        console.log('🔍 [ID CARD PREVIEW] No existing ID card found, will create new one');
      }

      // If no existing ID card and not explicitly deleted, create one in database
      if (!existingIdCard && !student.id_card_deleted) {
        console.log('💾 [ID CARD PREVIEW] Creating ID card record in database...');
        try {
          const idCardPayload = {
            student_id: student.id || student._id,
            student_name: studentData.student_name,
            registration_number: studentData.registration_number,
            branch_code: branchCode,
            card_number: `ID-${studentData.registration_number}`,
            issue_date: new Date().toISOString(),
            expiry_date: new Date(Date.now() + (2 * 365 * 24 * 60 * 60 * 1000)).toISOString(), // 2 years from now
            status: 'active',
            card_type: 'student',
            photo_url: studentData.photo || studentData.photoPreview
          };

          const response = await fetch('http://localhost:4000/api/branch/id-cards/generate', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(idCardPayload)
          });

          if (response.ok) {
            const savedIdCard = await response.json();
            console.log('✅ [ID CARD PREVIEW] ID card saved to database:', savedIdCard);
            existingIdCard = savedIdCard;
          } else {
            const errorText = await response.text();
            console.error('❌ [ID CARD PREVIEW] Failed to save ID card:', response.status, errorText);
          }
        } catch (dbError) {
          console.error('❌ [ID CARD PREVIEW] Database save error:', dbError);
        }
      }

      // Generate the ID card image
      const idCardImage = await generateIdCard(studentData, { branchName });
      setGeneratedIdCard(idCardImage);
      setGeneratingIdCard(false);
      console.log('✅ [ID CARD] ID card generated successfully:', !!idCardImage);

      // Only update student's ID card status locally if generation was successful AND the ID card wasn't explicitly deleted
      if (idCardImage && student && !student.id_card_deleted) {
        const updatedStudents = students.map(s => {
          if ((s.id || s._id) === (student.id || student._id)) {
            return {
              ...s,
              id_card: {
                id: `local_${student.id || student._id}_${Date.now()}`,
                card_number: `ID-${s.registration_number}`,
                issue_date: new Date().toISOString(),
                status: 'active',
                file_path: idCardImage,
                photo_url: photoUrl
              },
              has_id_card: true,
              id_card_deleted: false, // Clear deletion flag since we're generating a new one
              id_card_deleted_at: null,
              // Preserve photo data across all possible photo fields for consistent access
              photo: photoUrl || s.photo || s.photoPreview || student.photoPreview,
              photoPreview: photoUrl || s.photoPreview || s.photo || student.photoPreview,
              student_photo: photoUrl || s.student_photo || student.photoPreview,
              photo_url: photoUrl || s.photo_url || student.photoPreview,
              profile_image: photoUrl || s.profile_image || student.photoPreview,
              profile_photo: photoUrl || s.profile_photo || student.photoPreview,
              image: photoUrl || s.image || student.photoPreview,
              avatar: photoUrl || s.avatar || student.photoPreview
            };
          }
          return s;
        });
        setStudents(updatedStudents);

        console.log('✅ [ID CARD] Student data updated with ID card info and comprehensive photo data');
        console.log('📸 [ID CARD] Updated photo fields:', {
          photo: photoUrl,
          hasPhoto: !!photoUrl,
          studentId: student.id || student._id
        });
      } else if (student && student.id_card_deleted) {
        console.log('🚫 [ID CARD] Skipping status update - ID card was previously deleted (preview only)');
      }
    } catch (error) {
      console.error('❌ [ID CARD] Preview generation failed:', error);
      alert('Failed to generate ID card preview. Please try again.');
      setGeneratingIdCard(false);
      setIsPreviewModalOpen(false);
    }
  };

  // Handle search
  const handleSearch = () => {
    console.log('Searching with filters:', searchFilters);
    // Implement search logic here
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchFilters({
      username: '',
      studentName: '',
      contactNo: ''
    });
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(student => student.id || student._id));
    }
    setSelectAll(!selectAll);
  };

  // Handle individual selection
  const handleSelectStudent = (studentId) => {
    // Ensure consistent ID format
    const normalizedStudentId = String(studentId);
    const normalizedSelectedStudents = selectedStudents.map(id => String(id));

    console.log('🔘 [SELECTION] Student selection toggled:', {
      studentId: normalizedStudentId,
      currentlySelected: normalizedSelectedStudents.includes(normalizedStudentId),
      totalSelected: selectedStudents.length,
      allSelected: selectedStudents
    });

    if (normalizedSelectedStudents.includes(normalizedStudentId)) {
      const newSelection = selectedStudents.filter(id => String(id) !== normalizedStudentId);
      setSelectedStudents(newSelection);
      console.log('➖ [SELECTION] Student deselected, new total:', newSelection.length);
    } else {
      const newSelection = [...selectedStudents, studentId];
      setSelectedStudents(newSelection);
      console.log('➕ [SELECTION] Student selected, new total:', newSelection.length);
    }
  };

  // Handle print selected
  const handlePrint = async () => {
    if (selectedStudents.length === 0) {
      alert('Please select at least one student to print ID cards');
      return;
    }

    try {
      console.log('🖨️ [ID CARD] Printing ID cards for students:', selectedStudents);
      setLoading(true);

      // Get selected student objects
      const studentsToPrint = students.filter(s =>
        selectedStudents.includes(s.id || s._id)
      );

      // Generate ID cards for all selected students with proper photo resolution and database storage
      const idCardPromises = studentsToPrint.map(async (student) => {
        // Resolve photo URL with comprehensive logic for each student
        const API_BASE_URL = 'http://localhost:4000';
        let photoUrl = '';
        const photoSources = [student.photoPreview, student.photo, student.photo_url, student.student_photo, student.profile_image].filter(Boolean);

        if (photoSources.length > 0) {
          const primaryPhoto = photoSources[0];

          // If already a full URL or base64, use it as is
          if (primaryPhoto.startsWith('http') || primaryPhoto.startsWith('data:')) {
            photoUrl = primaryPhoto;
          } else {
            // Convert relative path to full URL
            const cleanPath = primaryPhoto.startsWith('/') ? primaryPhoto : `/${primaryPhoto}`;
            photoUrl = `${API_BASE_URL}${cleanPath}`;
          }

          // Test photo URL accessibility for bulk print
          try {
            const response = await fetch(photoUrl);
            if (!response.ok) {
              console.warn(`⚠️ [BULK PRINT] Photo URL not accessible for ${student.student_name}:`, photoUrl);
              photoUrl = '';
            }
          } catch (error) {
            console.warn(`⚠️ [BULK PRINT] Photo URL test failed for ${student.student_name}:`, error);
            photoUrl = '';
          }
        }

        // Prepare student data with resolved photo
        const studentData = {
          student_name: student.student_name || student.name || 'N/A',
          registration_number: student.registration_number || student.reg_no || 'N/A',
          date_of_birth: student.date_of_birth || student.dob || '',
          course: student.course || student.course_name || 'N/A',
          duration: student.duration || 'N/A',
          center: student.center || student.branch || branchName || 'N/A',
          address: student.address || 'N/A',
          contact_no: student.contact_no || student.phone || student.mobile || 'N/A',
          email_id: student.email_id || student.email || '',
          father_name: student.father_name || 'N/A',
          mother_name: student.mother_name || 'N/A',
          date_of_admission: student.date_of_admission || student.admission_date || '',
          photo: photoUrl && photoUrl !== '' && photoUrl !== 'N/A' ? photoUrl : null,
          photoPreview: photoUrl && photoUrl !== '' && photoUrl !== 'N/A' ? photoUrl : null
        };

        // Save ID card to database if not exists
        if (!student.id_card && !student.id_card_deleted) {
          try {
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');
            const idCardPayload = {
              student_id: student.id || student._id,
              student_name: studentData.student_name,
              registration_number: studentData.registration_number,
              branch_code: branchCode,
              card_number: `ID-${studentData.registration_number}`,
              issue_date: new Date().toISOString(),
              expiry_date: new Date(Date.now() + (2 * 365 * 24 * 60 * 60 * 1000)).toISOString(),
              status: 'active',
              card_type: 'student',
              photo_url: studentData.photo || studentData.photoPreview
            };

            const idCardResponse = await fetch('http://localhost:4000/api/branch/id-cards/generate', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(idCardPayload)
            });

            if (idCardResponse.ok) {
              const savedIdCard = await idCardResponse.json();
              console.log(`✅ [BULK PRINT] ID card saved to database for ${student.student_name}:`, savedIdCard);
            } else {
              console.warn(`⚠️ [BULK PRINT] Failed to save ID card to database for ${student.student_name}`);
            }
          } catch (error) {
            console.warn(`⚠️ [BULK PRINT] Database save error for ${student.student_name}:`, error);
          }
        }

        console.log(`🎨 [BULK PRINT] Generating ID card for ${student.student_name} with photo:`, !!(studentData.photo || studentData.photoPreview));
        return generateIdCard(studentData, { branchName });
      });

      const idCardImages = await Promise.all(idCardPromises);

      // Print all ID cards
      printBulkIdCards(idCardImages);

      console.log('✅ [ID CARD] Bulk ID cards printed successfully');

      // Reload students to sync with database
      await loadStudents();
    } catch (error) {
      console.error('❌ [ID CARD] Error printing ID cards:', error);
      alert('Failed to print ID cards. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle print single ID card
  const handlePrintSingle = async (student) => {
    try {
      console.log('🖨️ [ID CARD] Printing ID card for:', student.student_name);

      // Use shared photo resolution function
      const photoUrl = resolveStudentPhoto(student);

      // Map student data properly
      const studentData = {
        student_name: student.student_name || student.name || 'N/A',
        registration_number: student.registration_number || student.reg_no || 'N/A',
        date_of_birth: student.date_of_birth || student.dob || '',
        course: student.course || student.course_name || 'N/A',
        duration: student.id_card?.course_duration || student.duration || 'N/A',
        center: student.center || student.branch || branchName || 'N/A',
        address: student.id_card?.address || student.address || 'N/A',
        contact_no: student.contact_no || student.phone || student.mobile || 'N/A',
        email_id: student.email_id || student.email || '',
        father_name: student.father_name || 'N/A',
        mother_name: student.mother_name || 'N/A',
        date_of_admission: student.date_of_admission || student.admission_date || '',
        photo: photoUrl && photoUrl !== '' && photoUrl !== 'N/A' ? photoUrl : null,
        photoPreview: photoUrl && photoUrl !== '' && photoUrl !== 'N/A' ? photoUrl : null,
        student_photo_url: student.id_card?.student_photo_url,
        photo_url: student.id_card?.photo_url,
        course_duration: student.id_card?.course_duration
      };

      console.log('🎨 [ID CARD PRINT] Final student data for generation:', {
        name: studentData.student_name,
        photo: studentData.photo,
        photoPreview: studentData.photoPreview,
        hasPhoto: !!(studentData.photo || studentData.photoPreview)
      });

      const idCardImage = await generateIdCard(studentData, { branchName });
      printIdCard(idCardImage);
      console.log('✅ [ID CARD] ID card printed successfully with photo:', !!(studentData.photo || studentData.photoPreview));
    } catch (error) {
      console.error('❌ [ID CARD] Error printing ID card:', error);
      alert('Failed to print ID card. Please try again.');
    }
  };

  // Handle generate ID card via backend API
  const handleGenerateIdCard = async (student) => {
    try {
      console.log('🎨 [ID CARD] Generating ID card via backend API for:', student.student_name);

      // Use shared photo resolution function
      const photoUrl = resolveStudentPhoto(student);

      // Resolve address from multiple sources
      const studentAddress = student.address || student.student_address || student.permanent_address || '';

      // Resolve duration from multiple sources
      const studentDuration = student.duration || student.course_duration || student.program_duration || '';

      const response = await fetch('http://localhost:4000/api/branch/id-cards/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token') || localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id: student.id || student._id,
          student_name: student.student_name || student.name,
          registration_number: student.registration_number || student.reg_no,
          branch_code: branchCode,
          card_number: `ID-${student.registration_number || student.reg_no}`,
          card_type: 'student',
          photo_url: photoUrl,
          address: studentAddress,
          duration: studentDuration,
          issue_date: new Date().toISOString(),
          expiry_date: new Date(Date.now() + (2 * 365 * 24 * 60 * 60 * 1000)).toISOString(), // 2 years from now
          status: 'active'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ [ID CARD] Backend generation successful:', result);
        alert(`ID Card generated successfully! Card Number: ${result.id_card?.card_number || 'Generated'}`);

        // Reload students to get updated data
        await loadStudents();
        return;
      } else {
        const error = await response.json();
        console.error('❌ [ID CARD] Backend generation failed:', error);
        throw new Error(error.detail || 'Failed to generate ID card');
      }
    } catch (error) {
      console.error('❌ [ID CARD] Error generating ID card:', error);
      alert(`Failed to generate ID card: ${error.message}. Please try again.`);
    }
  };

  // Handle download ID card via backend API
  const handleBackendIdCardDownload = async (student) => {
    try {
      console.log('📥 [ID CARD] Backend API download for:', student.student_name);

      // If student has ID card data with backend ID, use backend download
      if (student.id_card && student.id_card.id) {
        const response = await fetch(`http://localhost:4000/api/branch/id-cards/${student.id_card.id}/download`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token') || localStorage.getItem('token')}`,
          },
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${student.registration_number}_${student.student_name.replace(/\s+/g, '_')}_ID_Card.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          console.log('✅ [ID CARD] Backend download successful');
          return;
        }
      }

      // Fallback to client-side generation with comprehensive photo resolution
      console.log('🔄 [ID CARD] Falling back to client-side generation with photo resolution');

      // Use shared photo resolution function
      const photoUrl = resolveStudentPhoto(student);

      // Prepare student data with resolved photo
      const studentData = {
        student_name: student.student_name || student.name || 'N/A',
        registration_number: student.registration_number || student.reg_no || 'N/A',
        date_of_birth: student.date_of_birth || student.dob || '',
        course: student.course || student.course_name || 'N/A',
        duration: student.duration || 'N/A',
        center: student.center || student.branch || branchName || 'N/A',
        address: student.address || 'N/A',
        contact_no: student.contact_no || student.phone || student.mobile || 'N/A',
        email_id: student.email_id || student.email || '',
        father_name: student.father_name || 'N/A',
        mother_name: student.mother_name || 'N/A',
        date_of_admission: student.date_of_admission || student.admission_date || '',
        photo: photoUrl && photoUrl !== '' && photoUrl !== 'N/A' ? photoUrl : null,
        photoPreview: photoUrl && photoUrl !== '' && photoUrl !== 'N/A' ? photoUrl : null
      };

      console.log('🎨 [ID CARD BACKEND] Final student data for generation:', {
        name: studentData.student_name,
        photo: studentData.photo,
        photoPreview: studentData.photoPreview,
        hasPhoto: !!(studentData.photo || studentData.photoPreview)
      });

      const idCardImage = await generateIdCard(studentData, { branchName });
      const fileName = `${studentData.registration_number}_${studentData.student_name.replace(/\s+/g, '_')}_ID_Card.png`;
      downloadIdCard(idCardImage, fileName);
      console.log('✅ [ID CARD] Backend fallback download successful with photo:', !!(studentData.photo || studentData.photoPreview));

    } catch (error) {
      console.error('❌ [ID CARD] Backend download error:', error);
      alert('Failed to download ID card. Please try again.');
    }
  };

  // Handle download ID card
  const handleDownloadIdCard = async (student) => {
    try {
      console.log('💾 [ID CARD] Downloading ID card for:', student.student_name);
      console.log('🔍 [ID CARD] Student ID for database check:', student.id || student._id);

      // First, check if ID card already exists in database
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      let existingIdCard = null;

      try {
        console.log('🔍 [ID CARD] Checking database for existing ID card...');
        const checkResponse = await fetch('http://localhost:4000/api/branch/id-cards', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          if (checkData.success && checkData.id_cards) {
            // Look for existing ID card for this student
            existingIdCard = checkData.id_cards.find(card => {
              const studentId = student.id || student._id;
              return (
                String(card.student_id) === String(studentId) ||
                card.registration_number === student.registration_number ||
                card.student_name.toLowerCase().trim() === student.student_name.toLowerCase().trim()
              );
            });

            if (existingIdCard) {
              console.log('✅ [ID CARD] Found existing ID card in database:', {
                id: existingIdCard.id,
                student_name: existingIdCard.student_name,
                card_number: existingIdCard.card_number,
                status: existingIdCard.status
              });
            } else {
              console.log('ℹ️ [ID CARD] No existing ID card found in database for this student');
            }
          }
        }
      } catch (checkError) {
        console.error('⚠️ [ID CARD] Error checking for existing ID card:', checkError);
      }

      // Use shared photo resolution function
      const photoUrl = resolveStudentPhoto(student);

      console.log('🔍 [ID CARD DOWNLOAD] Photo resolution details:', {
        studentId: student.id || student._id,
        studentName: student.student_name,
        originalPhoto: student.photo,
        originalPhotoPreview: student.photoPreview,
        resolvedPhotoUrl: photoUrl,
        hasResolvedPhoto: !!photoUrl
      });

      // Map student data properly with enhanced photo handling
      const studentData = {
        student_name: student.student_name || student.name || 'N/A',
        registration_number: student.registration_number || student.reg_no || 'N/A',
        date_of_birth: student.date_of_birth || student.dob || '',
        course: student.course || student.course_name || 'N/A',
        duration: student.id_card?.course_duration || student.duration || 'N/A',
        center: student.center || student.branch || branchName || 'N/A',
        address: student.id_card?.address || student.address || 'N/A',
        contact_no: student.contact_no || student.phone || student.mobile || 'N/A',
        email_id: student.email_id || student.email || '',
        father_name: student.father_name || 'N/A',
        mother_name: student.mother_name || 'N/A',
        date_of_admission: student.date_of_admission || student.admission_date || '',
        photo: photoUrl && photoUrl !== '' && photoUrl !== 'N/A' ? photoUrl : null,
        photoPreview: photoUrl && photoUrl !== '' && photoUrl !== 'N/A' ? photoUrl : null,
        student_photo_url: student.id_card?.student_photo_url,
        photo_url: student.id_card?.photo_url,
        course_duration: student.id_card?.course_duration
      };

      console.log('🎨 [ID CARD DOWNLOAD] Final studentData for generateIdCard:', {
        name: studentData.student_name,
        registration: studentData.registration_number,
        photo: studentData.photo,
        photoPreview: studentData.photoPreview,
        hasPhoto: !!(studentData.photo || studentData.photoPreview),
        existingInDB: !!existingIdCard
      });

      console.log('🔍 [ID CARD DOWNLOAD] About to call generateIdCard with params:', {
        studentData: {
          ...studentData,
          photo: studentData.photo ? 'HAS_PHOTO' : 'NO_PHOTO'
        },
        branchConfig: { branchName }
      });

      // If no existing ID card, FIRST save to database, THEN generate image
      if (!existingIdCard) {
        console.log('💾 [ID CARD] STEP 1: Creating ID card record in database...');

        try {
          const idCardPayload = {
            student_id: student.id || student._id,
            student_name: studentData.student_name,
            registration_number: studentData.registration_number,
            branch_code: branchCode,
            card_number: `ID-${studentData.registration_number}`,
            issue_date: new Date().toISOString(),
            expiry_date: new Date(Date.now() + (2 * 365 * 24 * 60 * 60 * 1000)).toISOString(), // 2 years from now
            status: 'active',
            card_type: 'student',
            photo_url: studentData.photo || studentData.photoPreview,
            address: studentData.address || '',
            duration: studentData.duration || ''
          };

          console.log('💾 [ID CARD] Creating ID card with payload:', idCardPayload);

          const databaseResponse = await fetch('http://localhost:4000/api/branch/id-cards/generate', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(idCardPayload)
          });

          console.log('💾 [ID CARD] Database save response status:', databaseResponse.status);

          if (databaseResponse.ok) {
            const databaseResult = await databaseResponse.json();
            console.log('✅ [ID CARD] Database save SUCCESS:', databaseResult);

            // Update existingIdCard with the newly created one
            existingIdCard = databaseResult.id_card || databaseResult;
          } else {
            const errorText = await databaseResponse.text();
            console.error('❌ [ID CARD] Database save FAILED:', databaseResponse.status, errorText);
            // Continue with generation even if DB save fails, but warn user
            console.warn('⚠️ [ID CARD] Continuing with image generation despite database save failure');
          }

        } catch (databaseError) {
          console.error('❌ [ID CARD] Database save error:', databaseError);
          console.warn('⚠️ [ID CARD] Continuing with image generation despite database error');
        }
      }

      console.log('🎨 [ID CARD] STEP 2: Generating ID card image...');

      // Generate ID card image - Use same parameters as preview for consistency
      const idCardImage = await generateIdCard(studentData, { branchName });

      console.log('🎨 [ID CARD DOWNLOAD] ID card generation result:', {
        imageGenerated: !!idCardImage,
        imageSize: idCardImage ? idCardImage.length : 0,
        studentHadPhoto: !!(studentData.photo || studentData.photoPreview),
        photoUrl: studentData.photo || studentData.photoPreview
      });

      if (!idCardImage) {
        throw new Error('Failed to generate ID card image - no image data returned');
      }

      console.log('📁 [ID CARD] STEP 3: Downloading generated image...');

      // Create download filename
      const fileName = `${studentData.registration_number}_${studentData.student_name.replace(/\s+/g, '_')}_ID_Card.png`;

      // Download the generated ID card
      downloadIdCard(idCardImage, fileName);

      console.log('✅ [ID CARD] ID card created and downloaded successfully with photo:', !!(studentData.photo || studentData.photoPreview));

      // Always reload students to get the latest database state
      console.log('🔄 [ID CARD] STEP 4: Reloading students to sync with database...');
      await loadStudents();

    } catch (error) {
      console.error('❌ [ID CARD] Error in ID card creation process:', error);
      alert('Failed to create ID card. Please try again.');
    }
  };

  // Handle delete ID card only (keep student record)
  const handleDeleteIdCard = async (student) => {
    if (!student.id_card || !student.id_card.id) {
      alert('This student does not have an ID card to delete');
      return;
    }

    // Check if this is a local/temporary ID card
    const isLocalIdCard = student.id_card.id.toString().startsWith('local_');

    const confirmMessage = `Are you sure you want to delete the ID card for ${student.student_name}?\n\nThis will only remove the ID card, the student record will remain intact.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setLoading(true);

    try {
      console.log('🗑️ [ID CARD] Deleting ID card for:', student.student_name, 'ID:', student.id_card.id);

      // If it's a local ID card, just update the local state
      if (isLocalIdCard) {
        console.log('🔄 [ID CARD] Removing local ID card from state');
        // Update local state to remove the local ID card and mark as deleted
        const updatedStudents = students.map(s => {
          if ((s.id || s._id) === (student.id || student._id)) {
            return {
              ...s,
              has_id_card: false,
              id_card: null,
              id_card_deleted: true, // Mark as explicitly deleted
              id_card_deleted_at: new Date().toISOString()
            };
          }
          return s;
        });
        setStudents(updatedStudents);
        alert(`Local ID card removed for ${student.student_name}`);
      } else {
        // For backend ID cards, call the API
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');

        const response = await fetch(`http://localhost:4000/api/branch/id-cards/${student.id_card.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          console.log('✅ [ID CARD] Backend ID card deleted successfully');

          // Update local state to mark as deleted
          const updatedStudents = students.map(s => {
            if ((s.id || s._id) === (student.id || student._id)) {
              return {
                ...s,
                has_id_card: false,
                id_card: null,
                id_card_deleted: true, // Mark as explicitly deleted
                id_card_deleted_at: new Date().toISOString()
              };
            }
            return s;
          });
          setStudents(updatedStudents);

          alert('ID card deleted successfully!');
        } else {
          const errorData = await response.json().catch(() => ({ message: 'Failed to delete ID card' }));
          console.error('❌ [ID CARD] Delete failed:', errorData);
          alert(`Failed to delete ID card: ${errorData.message || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('❌ [ID CARD] Delete error:', error);
      alert(`Failed to delete ID card: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle clear all ID cards
  const handleClearAllIds = () => {
    if (window.confirm('Are you sure you want to clear selected students? This action will deselect all.')) {
      setSelectedStudents([]);
      setSelectAll(false);
      console.log('Selection cleared');
    }
  };

  // Handle delete selected students
  const handleDeleteSelected = async () => {
    if (selectedStudents.length === 0) {
      alert('Please select at least one student to delete');
      return;
    }

    const studentsToDelete = students.filter(s => selectedStudents.includes(s.id || s._id));
    const studentNames = studentsToDelete.map(s => s.student_name).join(', ');

    const confirmMessage = `Are you sure you want to delete ${selectedStudents.length} student(s) completely?\n\nStudents: ${studentNames}\n\nThis will delete both the student records AND their ID cards. This action cannot be undone.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setLoading(true);

    try {
      let successCount = 0;
      let failCount = 0;
      const errors = [];
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');

      // Process deletions sequentially
      for (const studentId of selectedStudents) {
        try {
          const student = studentsToDelete.find(s => (s.id || s._id) === studentId);

          if (!studentId) {
            throw new Error('Student ID not found');
          }

          // Direct API call for deletion
          const response = await fetch(`http://localhost:4000/api/branch-students/students/${studentId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }

          successCount++;

          // Small delay to prevent overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
          failCount++;
          const student = studentsToDelete.find(s => (s.id || s._id) === studentId);
          errors.push(`${student?.student_name || studentId}: ${error.message}`);
        }
      }

      // Always reload students after deletion attempts
      await loadStudents();

      // Clear selections
      setSelectedStudents([]);
      setSelectAll(false);

      // Show results
      if (successCount > 0) {
        if (failCount === 0) {
          alert(`Successfully deleted all ${successCount} student(s)!`);
        } else {
          alert(`Successfully deleted ${successCount} student(s).\n\n${failCount} deletion(s) failed:\n${errors.join('\n')}`);
        }
      } else {
        alert(`Failed to delete any students.\n\nErrors:\n${errors.join('\n')}`);
      }

    } catch (error) {
      console.error('Bulk delete error:', error);
      alert('An unexpected error occurred while deleting students. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter students based on search
  const filteredStudents = students.filter(student => {
    const matchesUsername = !searchFilters.username ||
      student.student_name?.toLowerCase().includes(searchFilters.username.toLowerCase());
    const matchesStudentName = !searchFilters.studentName ||
      student.student_name?.toLowerCase().includes(searchFilters.studentName.toLowerCase());
    const matchesContact = !searchFilters.contactNo ||
      student.contact_no?.includes(searchFilters.contactNo);

    return matchesUsername && matchesStudentName && matchesContact;
  });

  return (
    <BranchLayout>
      <div className="p-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center text-center md:text-left">
              📋 MANAGE STUDENT IDCARD
            </h1>
            <button
              onClick={handleAddNew}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors font-semibold shadow-sm"
            >
              <FaPlus />
              Add New Student
            </button>
          </div>

          {/* Search Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <input
                type="text"
                placeholder="USERNAME"
                value={searchFilters.username}
                onChange={(e) => handleSearchChange('username', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="TYPE STUDENT NAME"
                value={searchFilters.studentName}
                onChange={(e) => handleSearchChange('studentName', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="TYPE CONTACT NO"
                value={searchFilters.contactNo}
                onChange={(e) => handleSearchChange('contactNo', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={handleSearch}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <FaSearch />
              Search
            </button>
            <button
              onClick={handleClearSearch}
              className="flex items-center gap-2 px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Clear Search
            </button>
          </div>
        </div>

        {/* Table Container - Responsive Handling */}
        {/* We rely on Mobile Cards for < md and Desktop Table for >= md */}

        {/* Mobile View (Cards) */}
        <div className="md:hidden space-y-4">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <div className="text-gray-400 mb-2">
                <FaSearch className="inline-block text-4xl" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No students found</h3>
              <p className="text-gray-500">Try adjusting your search criteria</p>
            </div>
          ) : (
            filteredStudents.map((student) => (
              <div key={student.id} className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    <div
                      onClick={() => handleSelectStudent(student.id)}
                      className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer ${selectedStudents[student.id]
                        ? 'bg-orange-500 border-orange-500'
                        : 'border-gray-300'
                        }`}
                    >
                      {selectedStudents[student.id] && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-200 flex-shrink-0">
                      {resolveStudentPhoto(student) ? (
                        <img
                          src={resolveStudentPhoto(student)}
                          alt={student.student_name}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/40'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-orange-100 text-orange-500 font-bold text-xs">
                          {student.student_name ? student.student_name.charAt(0).toUpperCase() : '?'}
                        </div>
                      )}
                    </div>
                    <div onClick={() => handlePreviewIdCard(student)} className="cursor-pointer">
                      <h3 className="font-bold text-gray-900">{student.student_name}</h3>
                      <p className="text-xs text-gray-500">{student.registration_number}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${student.has_id_card
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                    }`}>
                    {student.has_id_card ? 'Generated' : 'Pending'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-2 rounded mb-3">
                  <div>
                    <span className="text-gray-500 block">Course:</span>
                    <span className="font-medium truncate">{student.course}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Contact:</span>
                    <span className="font-medium">{student.contact_no}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePreviewIdCard(student)}
                    className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg flex justify-center items-center hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    <FaEye className="mr-2" /> View
                  </button>
                  {student.has_id_card && (
                    <button
                      onClick={() => handleDeleteIdCard(student)}
                      className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg flex justify-center items-center hover:bg-red-100 transition-colors text-sm font-medium"
                    >
                      <FaTrash className="mr-2" /> Delete
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Students Table */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <div
                      onClick={handleSelectAll}
                      className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer ${selectAll
                        ? 'bg-orange-500 border-orange-500'
                        : 'border-gray-300 bg-white'
                        }`}
                    >
                      {selectAll && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                    </div>
                  </th>
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
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <FaSearch className="text-4xl text-gray-300 mb-2" />
                        <p className="text-lg font-medium">No students found</p>
                        <p className="text-sm">Try adjusting your search criteria</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-amber-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div
                          onClick={() => handleSelectStudent(student.id)}
                          className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer ${selectedStudents[student.id]
                            ? 'bg-orange-500 border-orange-500'
                            : 'border-gray-300'
                            }`}
                        >
                          {selectedStudents[student.id] && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handlePreviewIdCard(student)}>
                          <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-200 flex-shrink-0">
                            {resolveStudentPhoto(student) ? (
                              <img
                                src={resolveStudentPhoto(student)}
                                alt={student.student_name}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/40'; }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-orange-100 text-orange-500 font-bold text-sm">
                                {student.student_name ? student.student_name.charAt(0).toUpperCase() : '?'}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">{student.student_name}</p>
                            <p className="text-xs text-gray-500">{student.registration_number}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{student.course}</p>
                          <p className="text-xs text-gray-500">{student.duration || 'Duration N/A'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{student.contact_no}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[150px]">{student.email_id || 'No Email'}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${student.has_id_card
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                          }`}>
                          {student.has_id_card ? 'Generated' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handlePreviewIdCard(student)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View ID Card"
                          >
                            <FaEye className="text-lg" />
                          </button>
                          {student.has_id_card && (
                            <button
                              onClick={() => handleDeleteIdCard(student)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete ID Card"
                            >
                              <FaTrash className="text-lg" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls could go here */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing <span className="font-medium">{filteredStudents.length}</span> students
            </div>
          </div>
        </div>

        {/* Bottom Action Buttons - Simplified for ID Card Management Only */}
        <div className="mt-6 flex flex-wrap gap-4 justify-center">
          <button
            onClick={async () => {
              if (selectedStudents.length === 0) {
                alert('Please select at least one student to delete ID cards');
                return;
              }

              const studentsWithIdCards = students.filter(s =>
                selectedStudents.includes(s.id || s._id) && (s.id_card || s.has_id_card)
              );

              if (studentsWithIdCards.length === 0) {
                alert('None of the selected students have ID cards to delete');
                return;
              }

              const confirmMessage = `Are you sure you want to delete ID cards for ${studentsWithIdCards.length} selected student(s)?\n\nThis will only delete the ID cards, student records will remain intact.`;
              if (!window.confirm(confirmMessage)) {
                return;
              }

              setLoading(true);
              try {
                let successCount = 0;
                const token = localStorage.getItem('access_token') || localStorage.getItem('token');

                for (const student of studentsWithIdCards) {
                  if (student.id_card?.id) {
                    try {
                      const response = await fetch(`http://localhost:4000/api/branch/id-cards/${student.id_card.id}`, {
                        method: 'DELETE',
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json',
                        },
                      });

                      if (response.ok) {
                        successCount++;
                      }
                    } catch (error) {
                      console.error('Error deleting ID card for:', student.student_name, error);
                    }
                  }
                }

                alert(`Successfully deleted ${successCount} ID cards`);
                await loadStudents();
                setSelectedStudents([]);
                setSelectAll(false);
              } catch (error) {
                console.error('Bulk ID card delete error:', error);
                alert('Error deleting ID cards. Please try again.');
              } finally {
                setLoading(false);
              }
            }}
            disabled={selectedStudents.length === 0}
            className={`flex items-center gap-2 px-8 py-3 rounded-md font-semibold transition-colors ${selectedStudents.length > 0
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            title="Delete ID cards only (keep student records)"
          >
            <FaTrash />
            Delete ID Cards ({selectedStudents.length})
          </button>

          <button
            onClick={handleClearAllIds}
            disabled={selectedStudents.length === 0}
            className={`flex items-center gap-2 px-8 py-3 rounded-md font-semibold transition-colors ${selectedStudents.length > 0
              ? 'bg-orange-600 text-white hover:bg-orange-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
          >
            Clear Selection
          </button>
        </div>

        {/* Selected Count */}
        {selectedStudents.length > 0 && (
          <div className="mt-4 text-center">
            <p className="text-gray-600">
              Selected {selectedStudents.length} of {filteredStudents.length} students
            </p>
          </div>
        )}

        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg p-4 md:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Add New Student ID Card</h2>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleSaveIdCard}>
                {/* Student Selection Dropdown */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    📋 Select Existing Student (Optional)
                  </label>
                  <select
                    onChange={(e) => {
                      const selectedStudentId = e.target.value;
                      if (selectedStudentId) {
                        const selectedStudent = students.find(s => s.id === selectedStudentId);
                        if (selectedStudent) {
                          console.log('📝 [ID CARD] Selected student:', selectedStudent);
                          setFormData({
                            student_name: selectedStudent.student_name || '',
                            registration_number: selectedStudent.registration_number || '',
                            date_of_birth: selectedStudent.date_of_birth ?
                              new Date(selectedStudent.date_of_birth).toISOString().split('T')[0] : '',
                            course: selectedStudent.course || '',
                            duration: selectedStudent.duration || '',
                            center: selectedStudent.center || branchName,
                            address: selectedStudent.address || '',
                            contact_no: selectedStudent.contact_no || '',
                            email_id: selectedStudent.email || selectedStudent.email_id || '',
                            father_name: selectedStudent.father_name || '',
                            mother_name: selectedStudent.mother_name || '',
                            password: '',
                            admission_year: selectedStudent.admission_year || new Date().getFullYear().toString(),
                            batch: selectedStudent.batch || selectedStudent.batch_name || '',
                            date_of_admission: selectedStudent.date_of_admission ||
                              new Date().toISOString().split('T')[0],
                            photo: null,
                            photoPreview: null
                          });
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">-- Select a student to auto-fill details --</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.student_name} - {student.registration_number} ({student.course})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-blue-600 mt-2">
                    💡 Select a student from the list to automatically fill their details, or leave blank to enter manually
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Student Name *
                    </label>
                    <input
                      type="text"
                      value={formData.student_name}
                      onChange={(e) => handleFormChange('student_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter student name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Registration Number *
                    </label>
                    <input
                      type="text"
                      value={formData.registration_number}
                      onChange={(e) => handleFormChange('registration_number', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter registration number"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => handleFormChange('date_of_birth', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Course *
                    </label>
                    <select
                      value={formData.course}
                      onChange={(e) => handleFormChange('course', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select Course</option>
                      {coursesLoading ? (
                        <option disabled>Loading courses...</option>
                      ) : courses.length === 0 ? (
                        <option disabled>No courses available</option>
                      ) : (
                        courses.map((course) => (
                          <option key={course.id || course._id} value={course.course_name}>
                            {course.course_name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration
                    </label>
                    <select
                      value={formData.duration}
                      onChange={(e) => handleFormChange('duration', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Duration</option>
                      <option value="3 Months">3 Months</option>
                      <option value="6 Months">6 Months</option>
                      <option value="1 Year">1 Year</option>
                      <option value="2 Years">2 Years</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Branch *
                    </label>
                    <select
                      value={formData.center}
                      onChange={(e) => handleFormChange('center', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select Branch</option>
                      {branchesLoading ? (
                        <option disabled>Loading branches...</option>
                      ) : branches.length === 0 ? (
                        <option value={branchName}>{branchName}</option>
                      ) : (
                        branches.map((branch, index) => {
                          const centreName = branch.centre_info?.centre_name ||
                            branch.centre_name ||
                            branch.name ||
                            branch.branch_name ||
                            `Branch ${index + 1}`;
                          const centreCode = branch.centre_info?.code ||
                            branch.franchise_code ||
                            branch.code ||
                            '';
                          return (
                            <option
                              key={branch._id || branch.id || index}
                              value={centreName}
                            >
                              {centreName} {centreCode ? `(${centreCode})` : ''}
                            </option>
                          );
                        })
                      )}
                    </select>
                    {branches.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {branches.length} branch{branches.length !== 1 ? 'es' : ''} available
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address *
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleFormChange('address', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter address"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Number *
                    </label>
                    <input
                      type="tel"
                      value={formData.contact_no}
                      onChange={(e) => handleFormChange('contact_no', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter contact number"
                      required
                    />
                  </div>
                </div>

                {/* Photo Upload */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Student Photo
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center bg-gray-50">
                      {formData.photoPreview ? (
                        <img
                          src={formData.photoPreview}
                          alt="Preview"
                          className="w-full h-full object-cover rounded-md"
                        />
                      ) : (
                        <FaCamera className="text-gray-400 text-2xl" />
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                        id="photo-upload"
                      />
                      <label
                        htmlFor="photo-upload"
                        className="cursor-pointer flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        <FaCamera />
                        Upload Photo
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Recommended: 150x150 pixels, JPG/PNG format
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`px-6 py-2 rounded-md transition-colors ${submitting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                      } text-white`}
                  >
                    {submitting ? 'Saving...' : 'Save ID Card'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ID Card Preview Modal */}
        {isPreviewModalOpen && selectedStudentForPreview && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg p-4 md:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">ID Card Preview</h2>
                <button
                  onClick={() => {
                    setIsPreviewModalOpen(false);
                    setGeneratedIdCard(null);
                    setGeneratingIdCard(false);
                    setSelectedStudentForPreview(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  <FaTimes />
                </button>
              </div>

              {/* Generated ID Card Display */}
              <div className="flex justify-center mb-6">
                {generatingIdCard ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
                    <p className="text-gray-600">Generating ID card...</p>
                  </div>
                ) : generatedIdCard ? (
                  <div className="relative">
                    <img
                      src={generatedIdCard}
                      alt="Student ID Card"
                      className="max-w-full border-2 border-gray-300 rounded-lg shadow-lg"
                      style={{ maxHeight: '500px' }}
                      onError={(e) => {
                        console.error('❌ [ID CARD IMAGE] Failed to load generated image:', generatedIdCard);
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDQwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTAwIiBmaWxsPSIjOUNBM0FGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE2cHgiPklEIENhcmQgRXJyb3I8L3RleHQ+Cjwvc3ZnPgo=';
                      }}
                    />
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <p className="text-yellow-800">Failed to generate ID card. Please try again.</p>
                  </div>
                )}
              </div>

              {/* Student Information */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-800 mb-3">Student Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <span className="ml-2 font-medium">{selectedStudentForPreview.student_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Registration No:</span>
                    <span className="ml-2 font-medium">{selectedStudentForPreview.registration_number}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Course:</span>
                    <span className="ml-2 font-medium">{selectedStudentForPreview.course}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Contact:</span>
                    <span className="ml-2 font-medium">{selectedStudentForPreview.contact_no}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Branch:</span>
                    <span className="ml-2 font-medium">{selectedStudentForPreview.center || branchName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Duration:</span>
                    <span className="ml-2 font-medium">{selectedStudentForPreview.duration || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    setIsPreviewModalOpen(false);
                    setGeneratedIdCard(null);
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                {generatedIdCard && (
                  <>
                    <button
                      onClick={() => {
                        const fileName = `${selectedStudentForPreview.registration_number}_${selectedStudentForPreview.student_name.replace(/\s+/g, '_')}_ID_Card.png`;
                        downloadIdCard(generatedIdCard, fileName);
                      }}
                      className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center gap-2"
                    >
                      <FaDownload />
                      Download
                    </button>
                    <button
                      onClick={() => printIdCard(generatedIdCard)}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <FaPrint />
                      Print ID Card
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </BranchLayout>
  );
};

export default AdminIdCard;