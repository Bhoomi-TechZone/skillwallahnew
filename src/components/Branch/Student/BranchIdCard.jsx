import React, { useState, useEffect } from 'react';
import { FaSearch, FaDownload, FaEye, FaPrint, FaFilter, FaSpinner, FaTimes, FaSync } from 'react-icons/fa';
import BranchLayout from '../BranchLayout';
import branchIdCardService from '../../../services/branchIdCardService';
import branchStudentService from '../../../services/branchStudentService';
import { generateIdCard, printIdCard, downloadIdCard } from '../../../utils/idCardGenerator';
import { getUserData } from '../../../utils/authUtils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const BranchIdCard = () => {
  // State management
  const [idCards, setIdCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchFilters, setSearchFilters] = useState({
    studentName: '',
    registrationNo: '',
    course: '',
    status: 'all'
  });
  const [selectedCard, setSelectedCard] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [students, setStudents] = useState([]);
  const [branchData, setBranchData] = useState(null);
  const [generatedIdCard, setGeneratedIdCard] = useState(null);

  // Get user data for branch info
  const userData = getUserData();
  const branchCode = userData?.branch_code || userData?.username || userData?.id || 'DEFAULT';
  const branchName = branchData?.branchName || branchData?.centre_name || branchData?.name ||
    userData?.branch_name || userData?.centre_name || userData?.franchise_name ||
    userData?.center_name || userData?.center ||
    (branchCode !== 'DEFAULT' ? branchCode.replace(/[-_]/g, ' ') : 'Branch');

  // Check user role - only admin can generate ID cards, branch_admin can only view
  const userRole = userData?.role || 'branch_admin';
  const isAdmin = userRole === 'admin' || userRole === 'superadmin' || userRole === 'super_admin';
  // Get branch code from token
  const getBranchCode = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('branchToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const code = payload.branch_code || payload.franchise_code || payload.sub;
        console.log('🔑 [ID CARDS] Token payload:', {
          branch_code: payload.branch_code,
          franchise_code: payload.franchise_code,
          role: payload.role,
          using: code
        });
        return code;
      } catch (error) {
        console.error('Error decoding token:', error);
        return null;
      }
    }
    return null;
  };

  // Fetch ID cards and students from backend with multiple strategies
  const fetchData = async () => {
    setLoading(true);
    try {
      const branchCode = getBranchCode();
      console.log('🔄 [ID CARDS] Fetching students with ID card data for branch:', branchCode);

      let studentsResponse;
      let fetchedStudents = [];

      // Strategy 1: Try to get students with complete data
      try {
        console.log('📡 [API STRATEGY 1] Fetching from branchStudentService...');
        studentsResponse = await branchStudentService.getStudents();
        fetchedStudents = studentsResponse.students || studentsResponse.data || [];
        console.log('✅ [API STRATEGY 1] Success:', fetchedStudents.length, 'students');
      } catch (error) {
        console.warn('⚠️ [API STRATEGY 1] Failed:', error.message);
      }

      // Strategy 2: If no students or incomplete data, try alternative API
      if (fetchedStudents.length === 0) {
        try {
          console.log('📡 [API STRATEGY 2] Trying alternative API...');
          const token = localStorage.getItem('token') || localStorage.getItem('branchToken');
          const response = await fetch(`${API_BASE_URL}/api/branch/students`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (response.ok) {
            const data = await response.json();
            fetchedStudents = data.students || data.data || data || [];
            console.log('✅ [API STRATEGY 2] Success:', fetchedStudents.length, 'students');
          }
        } catch (error) {
          console.warn('⚠️ [API STRATEGY 2] Failed:', error.message);
        }
      }

      // Strategy 3: Try branch-students endpoint if still no data
      if (fetchedStudents.length === 0) {
        try {
          console.log('📡 [API STRATEGY 3] Trying branch-students endpoint...');
          const token = localStorage.getItem('token') || localStorage.getItem('branchToken');
          const response = await fetch(`${API_BASE_URL}/api/branch-students/students`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (response.ok) {
            const data = await response.json();
            fetchedStudents = data.students || data.data || data || [];
            console.log('✅ [API STRATEGY 3] Success:', fetchedStudents.length, 'students');
          }
        } catch (error) {
          console.warn('⚠️ [API STRATEGY 3] Failed:', error.message);
        }
      }

      console.log('📦 [ID CARDS] Final API response with', fetchedStudents.length, 'students');
      console.log('👥 [ID CARDS] First student sample:', fetchedStudents[0]);

      // Log ALL students for debugging with COMPLETE data analysis
      fetchedStudents.forEach((student, idx) => {
        console.log(`👤 [ID CARDS] Student ${idx + 1}:`, {
          name: student.student_name,
          registration: student.registration_number,
          branch_code: student.branch_code,
          has_id_card: student.has_id_card,
          id_card_status: student.id_card?.status,
          id_card_number: student.id_card?.card_number,
          course: student.course,
          course_duration: student.course_duration,
          duration: student.duration,
          center: student.center,
          branch: student.branch,
          student_branch_code: student.student_branch_code,
          contact: student.contact_no,
          photo: student.photo,
          // Additional debug fields
          date_of_birth: student.date_of_birth,
          dob: student.dob,
          birth_date: student.birth_date,
          center_name: student.center_name,
          centre_name: student.centre_name,
          branch_name: student.branch_name,
          institute: student.institute,
          institute_name: student.institute_name,
          center_head: student.center_head,
          centre_head: student.centre_head,
          head_name: student.head_name,
          branch_head: student.branch_head,
          program: student.program,
          course_name: student.course_name,
          program_duration: student.program_duration,
          course_period: student.course_period,
          address: student.address,
          city: student.city,
          location: student.location
        });
        console.log(`📋 [COMPLETE STUDENT OBJECT ${idx + 1}]:`, student);
        console.log(`🔍 [DATA ANALYSIS ${idx + 1}] Available Keys:`, Object.keys(student));
      });

      setStudents(fetchedStudents);

      // Map students with their ID card details
      const enrichedIdCards = fetchedStudents.map(student => {
        const idCard = student.id_card;

        console.log(`🔍 [ID CARDS] Processing: ${student.student_name}, Has ID Card:`, student.has_id_card);

        // Enhanced photo URL formatting with better fallback logic
        let photoUrl = null;
        const photoSources = [
          idCard?.student_photo_url,
          student.student_photo_url,
          idCard?.photo_url,
          student.photo_url,
          student.photo,
          student.profile_photo,
          student.image,
          student.student_photo,
          student.photoPreview
        ].filter(Boolean);

        if (photoSources.length > 0) {
          const primaryPhoto = photoSources[0];

          console.log(`🖼️ [PHOTO SOURCE] Student ${student.student_name} - Using photo from:`, {
            source: primaryPhoto.includes('student_photo_url') ? 'student_photo_url (base64)' : primaryPhoto.includes('photo_url') ? 'photo_url' : 'student fields',
            url: primaryPhoto.substring(0, 100) + '...'
          });

          // If already a full URL or base64, use it as is
          if (primaryPhoto.startsWith('http') || primaryPhoto.startsWith('data:')) {
            photoUrl = primaryPhoto;
          } else {
            // Clean the path and construct URL with base URL
            let cleanPath = primaryPhoto.replace(/^\/+/, ''); // Remove leading slashes

            // Always prepend base URL for relative paths
            if (cleanPath.startsWith('static/')) {
              photoUrl = `${API_BASE_URL}/${cleanPath}`;
            } else if (cleanPath.startsWith('uploads/')) {
              photoUrl = `${API_BASE_URL}/${cleanPath}`;
            } else if (cleanPath.includes('student_photos/')) {
              photoUrl = `${API_BASE_URL}/static/uploads/${cleanPath}`;
            } else {
              // Default: prepend base URL
              photoUrl = `${API_BASE_URL}/${cleanPath}`;
            }
          }
          console.log(`🖼️ [PHOTO] Student ${student.student_name}:`, {
            originalPhoto: primaryPhoto,
            constructedUrl: photoUrl,
            photoSources
          });
        } else {
          console.log(`❌ [PHOTO] Student ${student.student_name} - No photo sources found`);
        }

        // Enhanced data mapping with extensive field checking and logging
        const enrichedCard = {
          id: idCard?.id || `student-${student.id}`,
          studentName: student.student_name || student.name || student.full_name || 'N/A',
          registrationNo: student.registration_number || student.reg_no || student.registration_no || student.roll_number || 'N/A',
          dateOfBirth: (() => {
            const dobFields = [student.date_of_birth, student.dob, student.birth_date, student.dateOfBirth];
            const validDob = dobFields.find(field => field && field !== 'N/A' && field !== '');
            return validDob || 'Not provided';
          })(),
          course: (() => {
            const courseFields = [student.course, student.course_name, student.program, student.subject];
            const validCourse = courseFields.find(field => field && field !== 'N/A' && field !== '');
            return validCourse || 'Course not specified';
          })(),
          duration: (() => {
            // Priority order: idCard.course_duration (from database), student fields
            const durationFields = [
              idCard?.course_duration,
              idCard?.duration,
              student.course_duration,
              student.duration,
              student.program_duration,
              student.course_period
            ];
            const validDuration = durationFields.find(field =>
              field &&
              field !== 'N/A' &&
              field !== '' &&
              field !== 'Not specified' &&
              field !== null &&
              field !== undefined
            );
            console.log(`⏱️ [DURATION] Student ${student.student_name} duration analysis:`, {
              idCard_course_duration: idCard?.course_duration,
              idCard_duration: idCard?.duration,
              course_duration: student.course_duration,
              duration: student.duration,
              program_duration: student.program_duration,
              course_period: student.course_period,
              allFields: durationFields,
              validDuration: validDuration,
              final: validDuration || 'Not specified'
            });

            // CRITICAL FIX: Prioritize idCard duration (stored in database) over student data
            const finalDuration = idCard?.course_duration || idCard?.duration || student.course_duration || validDuration || 'Not specified';
            console.log(`✅ [DURATION FIX] Final duration for ${student.student_name}: "${finalDuration}"`);
            return finalDuration;
          })(),
          center: student.center || student.centre_name || student.branch_name || student.institute_name || branchName || 'Center not specified',
          address: (() => {
            const addressFields = [student.address, student.city, student.location, student.permanent_address, student.current_address];
            const validAddress = addressFields.find(field => field && field !== 'N/A' && field !== '');
            return validAddress || 'Address not provided';
          })(),
          contact: (() => {
            const contactFields = [student.contact_no, student.phone, student.mobile, student.phone_number, student.contact_number];
            const validContact = contactFields.find(field => field && field !== 'N/A' && field !== '');
            return validContact || 'No contact';
          })(),
          status: idCard ? (idCard.status === 'active' ? 'approved' : idCard.status) : 'pending',
          createdBy: idCard ? 'Admin' : 'N/A',
          createdAt: idCard?.created_at ? new Date(idCard.created_at).toLocaleDateString() : 'N/A',
          photo: photoUrl,
          downloadUrl: idCard?.file_path || null,
          cardNumber: idCard?.card_number || 'Not Generated',
          issueDate: idCard?.issue_date ? new Date(idCard.issue_date).toLocaleDateString() : 'N/A',
          expiryDate: idCard?.expiry_date ? new Date(idCard.expiry_date).toLocaleDateString() : 'N/A',
          studentId: student.id,
          hasIdCard: student.has_id_card,
          studentData: student
        };

        return enrichedCard;
      });

      console.log(`✅ [ID CARDS] Total student records with/without ID cards: ${enrichedIdCards.length}`);
      console.log(`📊 [ID CARDS] All enriched cards:`, enrichedIdCards);
      setIdCards(enrichedIdCards);
    } catch (error) {
      console.error('❌ [ID CARDS] Error fetching data:', error);
      // Set empty array on error
      setIdCards([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Set up auto-refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing ID cards data...');
      fetchData();
    }, 30000); // 30 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(refreshInterval);
  }, []);

  // Handle search input changes
  const handleSearchChange = (field, value) => {
    setSearchFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setCurrentPage(1); // Reset to first page when searching
  };

  // Handle preview ID card
  const handlePreviewCard = async (card) => {
    try {
      console.log('🎴 [PREVIEW] Generating ID card for:', card.studentName);
      console.log('📦 [PREVIEW] Card data received:', card);

      // Set loading state and open modal immediately
      setSelectedCard(card);
      setGeneratedIdCard(null); // Reset previous image
      setIsPreviewModalOpen(true);

      // Map card data to student format expected by idCardGenerator
      const studentData = {
        student_name: card.studentName,
        registration_number: card.registrationNo,
        date_of_birth: card.dateOfBirth,
        course: card.course,
        duration: card.duration,
        course_duration: card.duration, // Add course_duration as fallback
        center: card.center,
        city: card.address,
        address: card.address, // Use address directly
        contact_no: card.contact,
        // Ensure consistent photo URL construction with multiple fallbacks
        photo: card.photo && card.photo !== 'N/A' ? card.photo : null,
        photo_url: card.photo && card.photo !== 'N/A' ? card.photo : null,
        photoPreview: card.photo && card.photo !== 'N/A' ? card.photo : null,
        // Additional fields for better ID card generation
        branch_name: card.center,
        card_number: card.cardNumber,
        issue_date: card.issueDate,
        expiry_date: card.expiryDate
      };

      console.log('🎯 [PREVIEW] Student data for generator:', studentData);
      console.log('⏱️ [PREVIEW DURATION] Duration fields:', {
        duration: studentData.duration,
        course_duration: studentData.course_duration
      });
      console.log('📸 [PREVIEW] All photo fields in card data:', {
        photo: card.photo,
        photoUrl: card.photoUrl,
        image: card.image,
        student_photo: card.student_photo,
        profile_photo: card.profile_photo
      });
      console.log('📸 [PREVIEW] Photo URL being used:', card.photo);
      console.log('📸 [PREVIEW] Photo exists check:', !!card.photo);
      console.log('📸 [PREVIEW] Photo type:', typeof card.photo);

      // Test photo URL if available
      if (card.photo && card.photo !== 'N/A') {
        console.log('🧪 [PREVIEW] Testing photo URL accessibility:', card.photo);
        try {
          const testImg = new Image();
          testImg.crossOrigin = 'anonymous';
          await new Promise((resolve, reject) => {
            testImg.onload = () => {
              console.log('✅ [PREVIEW] Photo URL is accessible');
              resolve();
            };
            testImg.onerror = () => {
              console.error('❌ [PREVIEW] Photo URL is not accessible:', card.photo);
              reject(new Error('Photo not accessible'));
            };
            testImg.src = card.photo;
            // Timeout after 5 seconds
            setTimeout(() => reject(new Error('Photo load timeout')), 5000);
          });
        } catch (error) {
          console.warn('⚠️ [PREVIEW] Photo URL test failed:', error);
        }
      }

      // Generate ID card image
      const idCardImage = await generateIdCard(studentData, { branchName });

      // Set the generated image
      setGeneratedIdCard(idCardImage);

      console.log('✅ [PREVIEW] ID card generated successfully:', !!idCardImage);
    } catch (error) {
      console.error('❌ [PREVIEW] Failed to generate ID card:', error);
      alert('Failed to generate ID card preview. Please try again.');
      setIsPreviewModalOpen(false);
    }
  };

  // Handle download ID card
  const handleDownloadCard = async (card) => {
    try {
      console.log('💾 [DOWNLOAD] Generating ID card for download:', card.studentName);
      console.log('💾 [DOWNLOAD] Card photo URL:', card.photo);
      console.log('💾 [DOWNLOAD] Card duration:', card.duration);

      // Map card data to student format
      const studentData = {
        student_name: card.studentName,
        registration_number: card.registrationNo,
        date_of_birth: card.dateOfBirth,
        course: card.course,
        duration: card.duration,
        course_duration: card.duration,
        center: card.center,
        city: card.address,
        address: card.address,
        contact_no: card.contact,
        // Photo with all possible sources
        photo: card.photo,
        photo_url: card.photo,
        student_photo_url: card.photo,
        photoPreview: card.photo,
        // Additional fields for better ID card generation
        branch_name: card.center,
        card_number: card.cardNumber,
        issue_date: card.issueDate,
        expiry_date: card.expiryDate
      };

      // Generate ID card image
      const idCardImage = await generateIdCard(studentData, { branchName });

      // Download the ID card
      downloadIdCard(idCardImage, `ID_Card_${card.registrationNo}.png`);

      console.log('✅ [DOWNLOAD] ID card downloaded successfully');
    } catch (error) {
      console.error('❌ [DOWNLOAD] Failed to download ID card:', error);
      alert('Failed to download ID card. Please try again.');
    }
  };

  // Handle print ID card
  const handlePrintCard = async (card) => {
    try {
      console.log('🖨️ [PRINT] Generating ID card for print:', card.studentName);

      // Map card data to student format
      const studentData = {
        student_name: card.studentName,
        registration_number: card.registrationNo,
        date_of_birth: card.dateOfBirth,
        course: card.course,
        duration: card.duration,
        course_duration: card.duration,
        center: card.center,
        city: card.address,
        address: card.address,
        contact_no: card.contact,
        // Photo with all possible sources
        photo: card.photo,
        photo_url: card.photo,
        student_photo_url: card.photo,
        photo: card.photo && card.photo !== 'N/A' ? card.photo : null,
        photo_url: card.photo && card.photo !== 'N/A' ? card.photo : null,
        photoPreview: card.photo && card.photo !== 'N/A' ? card.photo : null,
        // Additional fields for better ID card generation
        branch_name: card.center,
        card_number: card.cardNumber,
        issue_date: card.issueDate,
        expiry_date: card.expiryDate
      };

      console.log('📸 [PRINT] Photo data:', {
        cardPhoto: card.photo,
        photoUrl: studentData.photo_url,
        photoExists: !!card.photo
      });
      console.log('⏱️ [PRINT] Duration data:', {
        cardDuration: card.duration,
        studentDuration: studentData.duration
      });

      // Generate ID card image
      const idCardImage = await generateIdCard(studentData, { branchName });

      // Print the ID card
      printIdCard(idCardImage);

      console.log('✅ [PRINT] ID card sent to printer');
    } catch (error) {
      console.error('❌ [PRINT] Failed to print ID card:', error);
      alert('Failed to print ID card. Please try again.');
    }
  };

  // Handle generate ID card
  const handleGenerateIdCard = async (card) => {
    if (!card.studentId) {
      alert('Student ID not found. Cannot generate ID card.');
      return;
    }

    const confirmGenerate = window.confirm(
      `Generate ID card for ${card.studentName}?\n\nRegistration: ${card.registrationNo}`
    );

    if (!confirmGenerate) return;

    try {
      console.log('🎴 [ID CARDS] Generating ID card for student:', card.studentId);
      setLoading(true);

      const result = await branchIdCardService.generateIdCard(card.studentId, 'student');

      console.log('✅ [ID CARDS] ID card generated successfully:', result);
      alert(`ID card generated successfully for ${card.studentName}!`);

      // Reload data to show the new ID card
      await fetchData();
    } catch (error) {
      console.error('❌ [ID CARDS] Error generating ID card:', error);
      alert(`Failed to generate ID card: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter ID cards based on search criteria
  const filteredCards = idCards.filter(card => {
    const matchesName = !searchFilters.studentName ||
      card.studentName.toLowerCase().includes(searchFilters.studentName.toLowerCase());
    const matchesRegNo = !searchFilters.registrationNo ||
      card.registrationNo.includes(searchFilters.registrationNo);
    const matchesCourse = !searchFilters.course ||
      card.course.toLowerCase().includes(searchFilters.course.toLowerCase());
    const matchesStatus = searchFilters.status === 'all' || card.status === searchFilters.status;

    const passes = matchesName && matchesRegNo && matchesCourse && matchesStatus;

    console.log(`🔎 [FILTER] ${card.studentName}:`, {
      matchesName,
      matchesRegNo,
      matchesCourse,
      matchesStatus,
      cardStatus: card.status,
      filterStatus: searchFilters.status,
      passes
    });

    return passes;
  });

  console.log(`📋 [FILTER] Total cards: ${idCards.length}, Filtered: ${filteredCards.length}`);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCards.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCards.length / itemsPerPage);

  console.log(`📄 [PAGINATION] Page ${currentPage}, Items: ${currentItems.length}, Total Pages: ${totalPages}`);

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-orange-100 text-orange-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <BranchLayout>
      <div className="p-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                🆔 Student ID Cards
              </h1>
              <p className="text-sm text-green-600 flex items-center mt-1">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                Auto-refreshing every 30 seconds
              </p>
            </div>
            <div className="text-sm text-gray-600">
              Total Cards: <span className="font-semibold text-blue-600">{filteredCards.length}</span>
            </div>
          </div>

          {/* Search Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <input
                type="text"
                placeholder="Search by student name"
                value={searchFilters.studentName}
                onChange={(e) => handleSearchChange('studentName', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Registration number"
                value={searchFilters.registrationNo}
                onChange={(e) => handleSearchChange('registrationNo', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Search by course"
                value={searchFilters.course}
                onChange={(e) => handleSearchChange('course', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <select
                value={searchFilters.status}
                onChange={(e) => handleSearchChange('status', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{idCards.length}</div>
              <div className="text-sm text-blue-700">Total Students</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {idCards.filter(card => card.hasIdCard && card.status === 'approved').length}
              </div>
              <div className="text-sm text-orange-700">ID Cards Generated</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {idCards.filter(card => !card.hasIdCard).length}
              </div>
              <div className="text-sm text-yellow-700">Without ID Card</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {idCards.filter(card => card.hasIdCard && card.status === 'pending').length}
              </div>
              <div className="text-sm text-purple-700">Pending Approval</div>
            </div>
          </div>
        </div>

        {/* ID Cards List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Desktop Table Header */}
          <div className="hidden md:block bg-teal-600 text-white">
            <div className="grid grid-cols-9 gap-4 p-4 font-semibold text-center text-sm">
              <div>SN.</div>
              <div>Photo</div>
              <div>Student Info</div>
              <div>Registration No.</div>
              <div>Course & Duration</div>
              <div>Center</div>
              <div>Contact</div>
              <div>Status</div>
              <div>Actions</div>
            </div>
          </div>

          {/* Mobile Header (Optional) */}
          <div className="md:hidden bg-teal-600 text-white p-4 font-bold text-lg">
            Student Cards List
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-200">
            {(() => {
              console.log('🎨 [RENDER] loading:', loading, 'currentItems.length:', currentItems.length, 'currentItems:', currentItems);
              return null;
            })()}
            {loading ? (
              <div className="p-8 text-center">
                <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading ID cards...</p>
              </div>
            ) : currentItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-4">📭</div>
                <p>No ID cards found matching your search criteria.</p>
              </div>
            ) : (
              currentItems.map((card, index) => {
                console.log(`🎨 [RENDER] Rendering card ${index + 1}:`, card.studentName);
                console.log(`🎨 [RENDER] Card data:`, {
                  photo: card.photo,
                  center: card.center,
                  duration: card.duration,
                  course: card.course,
                  contact: card.contact
                });
                return (
                  <div key={card.id} className="block hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
                    {/* Desktop View */}
                    <div className="hidden md:grid grid-cols-9 gap-4 p-4 items-center text-sm">
                      <div className="text-center font-medium">
                        {indexOfFirstItem + index + 1}
                      </div>

                      {/* Photo Column */}
                      <div className="flex justify-center">
                        {card.photo && card.photo !== 'N/A' ? (
                          <img
                            src={card.photo}
                            alt={card.studentName}
                            className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                            onError={(e) => {
                              console.log(`❌ [PHOTO] Failed to load: ${card.photo}`);
                              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyMEM5Ljk1IDE5Ljk4IDkuOTcgMjQuOTUgMjAgMjVDMzAuMDMgMjUuMDUgMzAuMDUgMjAuMDIgMjAgMjBaIiBmaWxsPSIjOUNBM0FGII8+CjxwYXRoIGQ9Ik0yMCAxNkM2IDE1Ljk4IDYuMDIgMjQuOTggMjAgMjVDMzMuOTggMjUuMDIgMzQuMDIgMTYuMDIgMjAgMTZaIiBmaWxsPSIjOUNBM0FGII8+Cjwvc3ZnPgo=';
                              e.target.className = "w-12 h-12 rounded-full object-cover border-2 border-gray-200 bg-gray-100";
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs border-2 border-gray-200">
                            No Photo
                          </div>
                        )}
                      </div>

                      {/* Student Info Column */}
                      <div className="font-medium text-gray-900">
                        <div className="font-semibold">{card.studentName}</div>
                        <div className="text-xs text-gray-500">
                          DOB: {card.dateOfBirth && card.dateOfBirth !== 'Not provided' && card.dateOfBirth !== 'N/A' ? card.dateOfBirth : 'Not provided'}
                        </div>
                      </div>

                      {/* Registration Number */}
                      <div className="text-center font-mono text-blue-600 font-medium">
                        {card.registrationNo}
                      </div>

                      {/* Course & Duration Column */}
                      <div className="text-gray-700">
                        <div className="font-medium text-sm">
                          {card.course && card.course !== 'Course not specified' && card.course !== 'N/A' ?
                            (card.course.length > 25 ? `${card.course.substring(0, 25)}...` : card.course) :
                            'Course not specified'
                          }
                        </div>
                        <div className="text-xs text-blue-600 font-medium">
                          Duration: {card.duration && card.duration !== 'Not specified' && card.duration !== 'N/A' && card.duration.trim() !== '' ? card.duration : 'Not specified'}
                        </div>
                      </div>

                      {/* Center Column */}
                      <div className="text-gray-700">
                        <div className="font-medium text-sm">
                          {card.center && card.center !== 'Center not specified' && card.center !== 'N/A' ?
                            (card.center.length > 20 ? `${card.center.substring(0, 20)}...` : card.center) :
                            'Center not specified'
                          }
                        </div>
                        <div className="text-xs text-gray-500">
                          {card.address && card.address !== 'Address not provided' && card.address !== 'N/A' ?
                            (card.address.length > 25 ? `${card.address.substring(0, 25)}...` : card.address) :
                            'Address not provided'
                          }
                        </div>
                      </div>

                      {/* Contact Column */}
                      <div className="text-center">
                        <div className="font-medium text-sm">
                          {card.contact && card.contact !== 'No contact' && card.contact !== 'N/A' ? card.contact : 'No contact'}
                        </div>
                      </div>

                      {/* Status Column */}
                      <div className="text-center">
                        {card.hasIdCard ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(card.status)}`}>
                            {card.status.charAt(0).toUpperCase() + card.status.slice(1)}
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            No ID Card
                          </span>
                        )}
                      </div>

                      {/* Actions Column */}
                      <div className="flex justify-center gap-2">
                        {card.hasIdCard ? (
                          <>
                            <button
                              onClick={() => handlePreviewCard(card)}
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                              title="Preview ID Card"
                            >
                              <FaEye />
                            </button>
                            {card.status === 'approved' && (
                              <>
                                <button
                                  onClick={() => handleDownloadCard(card)}
                                  className="p-2 text-orange-600 hover:bg-orange-100 rounded-md transition-colors"
                                  title="Download ID Card"
                                >
                                  <FaDownload />
                                </button>
                                <button
                                  onClick={() => handlePrintCard(card)}
                                  className="p-2 text-purple-600 hover:bg-purple-100 rounded-md transition-colors"
                                  title="Print ID Card"
                                >
                                  <FaPrint />
                                </button>
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            {/* View button for all users */}
                            <button
                              onClick={() => handlePreviewCard(card)}
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                              title="View Student Details"
                            >
                              <FaEye />
                            </button>
                            {/* Generate ID Card button - only for admin */}
                            {isAdmin && (
                              <button
                                onClick={() => handleGenerateIdCard(card)}
                                disabled={loading}
                                className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Generate ID Card for this student"
                              >
                                🎴 Generate ID Card
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden p-4">
                      <div className="flex items-start gap-4">
                        {/* Photo */}
                        <div className="flex-shrink-0">
                          {card.photo && card.photo !== 'N/A' ? (
                            <img
                              src={card.photo}
                              alt={card.studentName}
                              className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                              onError={(e) => {
                                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyMEM5Ljk1IDE5Ljk4IDkuOTcgMjQuOTUgMjAgMjVDMzAuMDMgMjUuMDUgMzAuMDUgMjAuMDIgMjAgMjBaIiBmaWxsPSIjOUNBM0FGII8+CjxwYXRoIGQ9Ik0yMCAxNkM2IDE1Ljk4IDYuMDIgMjQuOTggMjAgMjVDMzMuOTggMjUuMDIgMzQuMDIgMTYuMDIgMjAgMTZaIiBmaWxsPSIjOUNBM0FGII8+Cjwvc3ZnPgo=';
                              }}
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs border-2 border-gray-200">
                              No Photo
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-bold text-gray-900 truncate">{card.studentName}</h3>
                              <p className="text-sm font-mono text-blue-600">{card.registrationNo}</p>
                            </div>
                            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full whitespace-nowrap ml-2">
                              {indexOfFirstItem + index + 1}
                            </span>
                          </div>

                          <div className="mt-2 space-y-1 text-sm text-gray-600">
                            <p className="flex items-start gap-2">
                              <span className="font-semibold text-xs uppercase w-16 shrink-0">Course:</span>
                              <span className="truncate">{card.course || 'N/A'}</span>
                            </p>
                            <p className="flex items-start gap-2">
                              <span className="font-semibold text-xs uppercase w-16 shrink-0">Duration:</span>
                              <span>{card.duration || 'N/A'}</span>
                            </p>
                            <p className="flex items-start gap-2">
                              <span className="font-semibold text-xs uppercase w-16 shrink-0">Status:</span>
                              {card.hasIdCard ? (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(card.status)}`}>
                                  {card.status.charAt(0).toUpperCase() + card.status.slice(1)}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  No ID Card
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Mobile Actions */}
                      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                        {card.hasIdCard ? (
                          <>
                            <button
                              onClick={() => handlePreviewCard(card)}
                              className="flex-1 flex items-center justify-center gap-1 py-2 px-3 bg-blue-50 text-blue-600 rounded-md text-sm font-medium hover:bg-blue-100 whitespace-nowrap"
                            >
                              <FaEye /> Preview
                            </button>
                            {card.status === 'approved' && (
                              <>
                                <button
                                  onClick={() => handleDownloadCard(card)}
                                  className="flex-1 flex items-center justify-center gap-1 py-2 px-3 bg-orange-50 text-orange-600 rounded-md text-sm font-medium hover:bg-orange-100 whitespace-nowrap"
                                >
                                  <FaDownload /> Download
                                </button>
                                <button
                                  onClick={() => handlePrintCard(card)}
                                  className="flex-1 flex items-center justify-center gap-1 py-2 px-3 bg-purple-50 text-purple-600 rounded-md text-sm font-medium hover:bg-purple-100 whitespace-nowrap"
                                >
                                  <FaPrint /> Print
                                </button>
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handlePreviewCard(card)}
                              className="flex-1 flex items-center justify-center gap-1 py-2 px-3 bg-blue-50 text-blue-600 rounded-md text-sm font-medium hover:bg-blue-100 whitespace-nowrap"
                            >
                              <FaEye /> View
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleGenerateIdCard(card)}
                                disabled={loading}
                                className="flex-1 flex items-center justify-center gap-1 py-2 px-3 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 whitespace-nowrap disabled:opacity-50"
                              >
                                🎴 Generate Card
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <div className="flex gap-2 flex-wrap justify-center">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>

              {[...Array(totalPages)].map((_, index) => (
                <button
                  key={index + 1}
                  onClick={() => setCurrentPage(index + 1)}
                  className={`px-4 py-2 border rounded-md ${currentPage === index + 1
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  {index + 1}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* ID Card Preview Modal */}
        {isPreviewModalOpen && selectedCard && (
          <div className="fixed inset-0 bg-white bg-opacity-20 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-white border-opacity-30">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">ID Card Preview - {selectedCard.studentName}</h2>
                <button
                  onClick={() => {
                    setIsPreviewModalOpen(false);
                    setGeneratedIdCard(null);
                    setSelectedCard(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  <FaTimes />
                </button>
              </div>

              {/* Generated ID Card Image */}
              {generatedIdCard ? (
                <div className="flex justify-center mb-6">
                  <img
                    src={generatedIdCard}
                    alt="ID Card"
                    className="max-w-full h-auto border-2 border-gray-300 rounded-lg shadow-lg"
                    style={{ maxHeight: '70vh' }}
                    onError={(e) => {
                      console.error('❌ [ID CARD IMAGE] Failed to load generated image:', generatedIdCard);
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDQwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTAwIiBmaWxsPSIjOUNBM0FGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE2cHgiPklEIENhcmQgRXJyb3I8L3RleHQ+Cjwvc3ZnPgo=';
                    }}
                  />
                </div>
              ) : (
                <div className="flex justify-center items-center py-12">
                  <FaSpinner className="animate-spin text-4xl text-blue-600" />
                  <p className="ml-4 text-gray-600">Generating ID card...</p>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 mt-6">
                <button
                  onClick={() => {
                    setIsPreviewModalOpen(false);
                    setGeneratedIdCard(null);
                    setSelectedCard(null);
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors w-full sm:w-auto"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleDownloadCard(selectedCard);
                  }}
                  className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors w-full sm:w-auto flex items-center justify-center"
                  disabled={!generatedIdCard}
                >
                  <FaDownload className="inline mr-2" />
                  Download
                </button>
                <button
                  onClick={() => {
                    handlePrintCard(selectedCard);
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors w-full sm:w-auto flex items-center justify-center"
                  disabled={!generatedIdCard}
                >
                  <FaPrint className="inline mr-2" />
                  Print
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BranchLayout>
  );
};

export default BranchIdCard;