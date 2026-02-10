import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { getUserData, logout } from '../../utils/authUtils';
import branchStudentDashboardService from '../../services/branchStudentDashboardService';
import { generateIdCard } from '../../utils/idCardGenerator';

const API_BASE_URL = 'http://localhost:4000';

const StudentProfile = ({ showIdCard = false, onIdCardViewed = () => { }, studentData = null }) => {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadType, setUploadType] = useState('document');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [showIdCardModal, setShowIdCardModal] = useState(false);
  const [realIdCard, setRealIdCard] = useState(null);
  const [idCardLoading, setIdCardLoading] = useState(false);
  const [hasRealIdCard, setHasRealIdCard] = useState(false);
  const [generatedCardImage, setGeneratedCardImage] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      await loadProfileData();
      await loadUploadedFiles();
      // Load ID card after profile data is available
      await loadStudentIdCard();
    };
    loadData();
  }, []);

  // Auto-show ID card if requested from dashboard
  useEffect(() => {
    if (showIdCard) {
      setShowIdCardModal(true);
      onIdCardViewed(); // Notify parent that ID card was viewed
    }
  }, [showIdCard, onIdCardViewed]);

  // Auto-show ID card if requested from dashboard
  useEffect(() => {
    if (showIdCard) {
      setShowIdCardModal(true);
      onIdCardViewed(); // Notify parent that ID card was viewed
    }
  }, [showIdCard, onIdCardViewed]);

  const loadUploadedFiles = async () => {
    try {
      setFilesLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await axios.get(
        `${API_BASE_URL}/api/students/my-files`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      setUploadedFiles(response.data.files || []);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setFilesLoading(false);
    }
  };

  const loadStudentIdCard = async () => {
    try {
      setIdCardLoading(true);
      const token = localStorage.getItem('access_token') || localStorage.getItem('token') || localStorage.getItem('branchToken');
      const userData = getUserData();

      console.log('📋 [STUDENT ID CARD] Loading student ID card data...');
      console.log('👤 [STUDENT ID CARD] User data:', userData);

      // Get branch code from token or user data
      let branchCode = null;
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        branchCode = payload.branch_code || payload.franchise_code || payload.sub;
      } catch (error) {
        branchCode = userData?.branch_code || userData?.username;
      }

      console.log('🏢 [STUDENT ID CARD] Branch code:', branchCode);

      // Try to fetch ID card from branch_id_cards collection like AdminIdCard.jsx
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/branch/id-cards`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log('📦 [STUDENT ID CARD] Branch ID cards response:', response.data);

        const idCards = response.data.id_cards || response.data.students || response.data || [];

        // Find this student's ID card using multiple matching criteria
        const studentIdCard = idCards.find(card => {
          const matches = (
            // Match by registration number
            card.registration_number === userData?.student_id ||
            card.registration_number === profileData?.registrationNo ||
            // Match by student name (case insensitive)
            card.student_name?.toLowerCase().trim() === userData?.name?.toLowerCase().trim() ||
            card.student_name?.toLowerCase().trim() === profileData?.name?.toLowerCase().trim() ||
            // Match by email if available
            (card.email_id && userData?.email && card.email_id.toLowerCase() === userData.email.toLowerCase()) ||
            // Match by contact number
            (card.contact_no && userData?.phone && card.contact_no === userData.phone) ||
            (card.contact_no && userData?.mobile && card.contact_no === userData.mobile)
          );

          console.log(`🔍 [STUDENT ID CARD] Checking card for ${card.student_name}:`, {
            card_reg_no: card.registration_number,
            user_student_id: userData?.student_id,
            profile_reg_no: profileData?.registrationNo,
            card_name: card.student_name,
            user_name: userData?.name,
            profile_name: profileData?.name,
            matches
          });

          return matches;
        });

        console.log('🎯 [STUDENT ID CARD] Found matching card:', studentIdCard);

        if (studentIdCard) {
          console.log('✅ [STUDENT ID CARD] Found student record in DB');

          // Generate the ID card using the shared utility
          try {
            console.log('🎨 [STUDENT ID CARD] Generating client-side ID card...');

            // Map DB fields to Generator expected fields
            // The generator expects specific keys: duration, center, address, contact_no, etc.
            const cardData = {
              ...studentIdCard,
              student_name: studentIdCard.student_name || studentIdCard.name || profileData?.name || 'N/A',
              registration_number: studentIdCard.student_registration || studentIdCard.registration_number || profileData?.registrationNo || 'N/A',
              course: studentIdCard.course || profileData?.course || 'N/A',
              // IMPORTANT: Map course_duration to duration if duration is missing
              duration: studentIdCard.duration || studentIdCard.course_duration || profileData?.duration || 'N/A',
              // Map branch/center
              center: studentIdCard.center || studentIdCard.center_name || studentIdCard.branch_name || studentIdCard.branch_code || profileData?.branch || 'N/A',
              address: studentIdCard.address || profileData?.address || 'N/A',
              contact_no: studentIdCard.contact_no || studentIdCard.contact_number || studentIdCard.mobile || studentIdCard.phone || profileData?.mobile || 'N/A',
              // Ensure photo URL is accessible
              student_photo_url: studentIdCard.student_photo_url || studentIdCard.photo_url || studentIdCard.student_photo || studentIdCard.profile_image || ''
            };

            console.log('📋 [STUDENT ID CARD] Mapped Card Data for Generator:', cardData);

            const idCardImage = await generateIdCard(cardData);
            setGeneratedCardImage(idCardImage);

            setRealIdCard({
              has_id_card: true,
              id_card: {
                image_url: idCardImage, // Use generated Base64
                issue_date: studentIdCard.issue_date || studentIdCard.created_at,
                card_number: studentIdCard.card_number || studentIdCard.id,
                status: studentIdCard.status || 'active'
              },
              student_data: cardData // Use the mapped data
            });
            setHasRealIdCard(true);

          } catch (genError) {
            console.error('❌ [STUDENT ID CARD] Failed to generate client-side card:', genError);
            // Fallback to stored image if generation fails
            const rawImageUrl = studentIdCard.id_card_image_url ||
              studentIdCard.image_url ||
              studentIdCard.card_image ||
              (studentIdCard.id_card && studentIdCard.id_card.image_url) ||
              studentIdCard.file_path;

            if (rawImageUrl) {
              let finalImageUrl = rawImageUrl;
              if (rawImageUrl && !rawImageUrl.startsWith('http') && !rawImageUrl.startsWith('/')) {
                finalImageUrl = `/${rawImageUrl}`;
              }
              setRealIdCard({
                has_id_card: true,
                id_card: {
                  image_url: finalImageUrl,
                  issue_date: studentIdCard.issue_date || studentIdCard.created_at,
                  card_number: studentIdCard.card_number || studentIdCard.id,
                  status: studentIdCard.status || 'active'
                },
                student_data: studentIdCard
              });
              setHasRealIdCard(true);
            } else {
              setHasRealIdCard(false);
            }
          }

        } else {
          console.log('❌ [STUDENT ID CARD] No matching student ID card found');
          setHasRealIdCard(false);
        }

      } catch (error) {
        console.error('❌ [STUDENT ID CARD] Error fetching from branch ID cards:', error);
        setHasRealIdCard(false);
      }

    } catch (error) {
      console.error('❌ [STUDENT ID CARD] Error loading ID card:', error);
      setHasRealIdCard(false);
    } finally {
      setIdCardLoading(false);
    }
  };

  const getFileIcon = (type) => {
    const icons = {
      'document': '📄',
      'paper_answer': '📝',
      'assignment': '📋',
      'project': '📂',
      'certificate': '🏆',
      'id_proof': '🪪',
      'photo': '📷',
      'marksheet': '📊',
      'other': '📁'
    };
    return icons[type] || '📁';
  };

  const getFileTypeName = (type) => {
    const names = {
      'document': 'Document',
      'paper_answer': 'Paper Answer',
      'assignment': 'Assignment',
      'project': 'Project',
      'certificate': 'Certificate',
      'id_proof': 'ID Proof',
      'photo': 'Photo',
      'marksheet': 'Marksheet',
      'other': 'Other'
    };
    return names[type] || type;
  };

  const handleDownloadCard = () => {
    if (realIdCard?.id_card?.image_url) {
      const link = document.createElement('a');
      link.href = realIdCard.id_card.image_url;
      link.download = `ID_Card_${profileData?.registrationNo || 'Student'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePrintCard = () => {
    if (realIdCard?.id_card?.image_url) {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
          <html>
            <head><title>Student ID Card</title></head>
            <body style="margin: 0; padding: 20px; text-align: center;">
              <img src="${realIdCard.id_card.image_url}" style="max-width: 100%; height: auto;" />
              <script>onload = function() { window.print(); }</script>
            </body>
          </html>
        `);
      printWindow.document.close();
    }
  };

  const loadProfileData = async () => {
    try {
      const userData = getUserData();
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');

      // Log token payload for debugging
      if (token) {
        try {
          const tokenPayload = JSON.parse(atob(token.split('.')[1]));
          console.log('🔐 [StudentProfile] Token payload:', tokenPayload);
        } catch (tokenError) {
          console.log('⚠️ [StudentProfile] Could not parse token:', tokenError);
        }
      }

      console.log('📊 [StudentProfile] User data:', userData);

      // Check if this is a branch student
      const isBranchStudent = branchStudentDashboardService.isBranchStudent();
      console.log('🎓 [StudentProfile] Is branch student:', isBranchStudent);

      let profileDataFromApi;

      if (isBranchStudent) {
        console.log('🏢 [StudentProfile] Loading branch student profile...');

        // Use branch student service for branch students
        const profileResult = await branchStudentDashboardService.getProfile();

        console.log('✅ [StudentProfile] Branch profile loaded:', profileResult);

        profileDataFromApi = profileResult.profile;

      } else {
        console.log('👤 [StudentProfile] Loading regular student profile...');

        // Fetch regular student profile
        const response = await axios.get(
          `${API_BASE_URL}/api/students/profile`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        profileDataFromApi = response.data.data || response.data;
      }

      // Map the profile data ensuring all fields are present
      const mappedProfile = {
        name: profileDataFromApi?.name || userData?.name || 'Student',
        status: profileDataFromApi?.status || 'Active',
        registrationNo: profileDataFromApi?.registrationNo || profileDataFromApi?.registration_number || userData?.student_id || 'N/A',
        branch: profileDataFromApi?.branch || profileDataFromApi?.branch_code || userData?.branch_code || 'N/A',
        mobile: profileDataFromApi?.mobile || profileDataFromApi?.phone || userData?.phone || '',
        doj: profileDataFromApi?.doj || profileDataFromApi?.joiningDate || profileDataFromApi?.created_at || 'N/A',
        course: profileDataFromApi?.course || profileDataFromApi?.courseName || 'No Course Assigned',
        father: profileDataFromApi?.father || profileDataFromApi?.fatherName || '',
        dob: profileDataFromApi?.dob || profileDataFromApi?.dateOfBirth || '',
        gender: profileDataFromApi?.gender || '',
        email: profileDataFromApi?.email || userData?.email || '',
        address: profileDataFromApi?.address || '',
        joiningDate: profileDataFromApi?.joiningDate || profileDataFromApi?.doj || profileDataFromApi?.created_at || 'N/A',
        totalFee: parseFloat(profileDataFromApi?.totalFee || profileDataFromApi?.total_fee || 0),
        paidAmount: parseFloat(profileDataFromApi?.paidAmount || profileDataFromApi?.paid_amount || 0),
        dueAmount: parseFloat(profileDataFromApi?.dueAmount || profileDataFromApi?.due_amount || 0),
        upiId: profileDataFromApi?.upiId || '',
        batch: profileDataFromApi?.batch || profileDataFromApi?.batchName || '',
        category: profileDataFromApi?.category || ''
      };

      console.log('📋 [StudentProfile] Mapped profile data:', mappedProfile);
      setProfileData(mappedProfile);

      setLoading(false);

    } catch (error) {
      console.error('❌ [StudentProfile] Error loading profile:', error);

      // Set fallback data if API fails
      const userData = getUserData();
      setProfileData({
        name: userData?.name || 'Student',
        status: 'Active',
        registrationNo: userData?.student_id || userData?.id || 'N/A',
        branch: userData?.branch_code || 'N/A',
        mobile: userData?.phone || userData?.mobile || '',
        doj: userData?.created_at ? new Date(userData.created_at).toLocaleDateString() : 'N/A',
        course: userData?.course || 'No Course Assigned',
        father: '',
        dob: userData?.dob || '',
        gender: userData?.gender || '',
        email: userData?.email || '',
        address: userData?.address || '',
        joiningDate: userData?.created_at ? new Date(userData.created_at).toLocaleDateString() : 'N/A',
        totalFee: 0.00,
        paidAmount: 0.00,
        dueAmount: parseFloat(userData?.due_amount || 0),
        upiId: '',
        batch: '',
        category: ''
      });
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('type', uploadType);

    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        `${API_BASE_URL}/api/students/upload-file`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        }
      );

      // Add new file to the list
      const newFile = {
        filename: response.data.filename,
        file_url: response.data.file_url,
        type: uploadType,
        original_name: selectedFile.name,
        uploaded_at: new Date().toISOString()
      };
      setUploadedFiles(prev => [newFile, ...prev]);

      alert('File uploaded successfully!');
      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadProgress(0);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert(error.response?.data?.detail || 'Failed to upload file');
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-500 to-teal-500 px-6 py-4">
          <h2 className="text-white font-bold text-lg flex items-center">
            <span className="mr-2">👤</span>
            Profile Overview
          </h2>
        </div>

        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
            {/* Left Side - Student Info */}
            <div className="flex-1">
              <div className="flex items-center mb-4">
                <h3 className="text-2xl font-bold text-gray-800 mr-3">{profileData?.name}</h3>
                <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full">
                  {profileData?.status}
                </span>
              </div>

              <div className="space-y-4 text-sm mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-4 text-gray-700">
                  <div className="flex items-center">
                    <span className="font-medium mr-2 min-w-[60px] text-gray-900">Reg. No:</span>
                    <span className="truncate" title={profileData?.registrationNo}>{profileData?.registrationNo}</span>
                  </div>

                  <div className="flex items-center">
                    <span className="mr-2 text-lg">📍</span>
                    <span className="font-medium mr-2 text-gray-900">Branch:</span>
                    <span className="text-blue-600 truncate font-medium" title={profileData?.branch}>{profileData?.branch || 'N/A'}</span>
                  </div>

                  <div className="flex items-center">
                    <span className="mr-2 text-lg">📱</span>
                    <span className="font-medium mr-2 text-gray-900">Mobile:</span>
                    <span>{profileData?.mobile}</span>
                  </div>

                  <div className="flex items-center">
                    <span className="mr-2 text-lg">📅</span>
                    <span className="font-medium mr-2 text-gray-900">DOJ:</span>
                    <span>{profileData?.doj}</span>
                  </div>

                  <div className="flex items-center sm:col-span-2">
                    <span className="mr-2 text-lg">📚</span>
                    <span className="font-medium mr-2 text-gray-900">Course:</span>
                    <span className="truncate font-medium text-gray-800" title={profileData?.course}>{profileData?.course}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - ID Card Button */}
            <div className="mt-4 lg:mt-0 lg:ml-6 w-full lg:w-auto">
              <button
                onClick={() => setShowIdCardModal(true)}
                className="w-full lg:w-auto bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <span className="mr-2 text-lg">🆔</span>
                View ID Card
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">Preview & Download Your Student ID</p>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-500 to-teal-500 px-6 py-4">
          <h2 className="text-white font-bold text-lg flex items-center">
            <span className="mr-2">ℹ️</span>
            Personal Information
          </h2>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col sm:flex-row border-b border-gray-200 pb-3 gap-1 sm:gap-4">
              <span className="text-gray-600 w-full sm:w-32 font-medium sm:font-normal">Name</span>
              <span className="text-gray-800 font-medium">{profileData?.name}</span>
            </div>
            <div className="flex flex-col sm:flex-row border-b border-gray-200 pb-3 gap-1 sm:gap-4">
              <span className="text-gray-600 w-full sm:w-32 font-medium sm:font-normal">Father</span>
              <span className="text-gray-800 font-medium">{profileData?.father}</span>
            </div>
            <div className="flex flex-col sm:flex-row border-b border-gray-200 pb-3 gap-1 sm:gap-4">
              <span className="text-gray-600 w-full sm:w-32 font-medium sm:font-normal">Date Of Birth</span>
              <span className="text-gray-800 font-medium">{profileData?.dob}</span>
            </div>
            <div className="flex flex-col sm:flex-row border-b border-gray-200 pb-3 gap-1 sm:gap-4">
              <span className="text-gray-600 w-full sm:w-32 font-medium sm:font-normal">Gender</span>
              <span className="text-gray-800 font-medium">{profileData?.gender}</span>
            </div>
            <div className="flex flex-col sm:flex-row border-b border-gray-200 pb-3 gap-1 sm:gap-4">
              <span className="text-gray-600 w-full sm:w-32 font-medium sm:font-normal">Mobile</span>
              <span className="text-gray-800 font-medium">{profileData?.mobile}</span>
            </div>
            <div className="flex flex-col sm:flex-row border-b border-gray-200 pb-3 gap-1 sm:gap-4">
              <span className="text-gray-600 w-full sm:w-32 font-medium sm:font-normal">Email</span>
              <span className="text-gray-800 font-medium break-all">{profileData?.email}</span>
            </div>
            <div className="flex flex-col sm:flex-row border-b border-gray-200 pb-3 md:col-span-2 gap-1 sm:gap-4">
              <span className="text-gray-600 w-full sm:w-32 font-medium sm:font-normal">Address</span>
              <span className="text-gray-800 font-medium">{profileData?.address}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Course Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-500 to-teal-500 px-6 py-4">
          <h2 className="text-white font-bold text-lg flex items-center">
            <span className="mr-2">📚</span>
            Course Details
          </h2>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col sm:flex-row border-b border-gray-200 pb-3 gap-1 sm:gap-4">
              <span className="text-gray-600 w-full sm:w-40 font-medium sm:font-normal">Course Name</span>
              <span className="text-gray-800 font-medium">{profileData?.course}</span>
            </div>
            <div className="flex flex-col sm:flex-row border-b border-gray-200 pb-3 gap-1 sm:gap-4">
              <span className="text-gray-600 w-full sm:w-40 font-medium sm:font-normal">Branch</span>
              <span className="text-gray-800 font-medium">{profileData?.branch || 'N/A'}</span>
            </div>
            <div className="flex flex-col sm:flex-row border-b border-gray-200 pb-3 gap-1 sm:gap-4">
              <span className="text-gray-600 w-full sm:w-40 font-medium sm:font-normal">Registration No.</span>
              <span className="text-gray-800 font-medium">{profileData?.registrationNo}</span>
            </div>
            <div className="flex flex-col sm:flex-row border-b border-gray-200 pb-3 gap-1 sm:gap-4">
              <span className="text-gray-600 w-full sm:w-40 font-medium sm:font-normal">Joining Date</span>
              <span className="text-gray-800 font-medium">{profileData?.joiningDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Student Files */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-500 to-teal-500 px-6 py-4">
          <h2 className="text-white font-bold text-lg flex items-center">
            <span className="mr-2">📁</span>
            Student Files
          </h2>
        </div>

        <div className="p-6">
          <button
            onClick={() => setShowUploadModal(true)}
            className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors flex items-center justify-center mb-6"
          >
            <span className="mr-2">➕</span>
            Upload New File
          </button>

          {/* Uploaded Files List */}
          {filesLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-500 border-t-transparent mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading files...</p>
            </div>
          ) : uploadedFiles.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-gray-700 font-semibold mb-3">Uploaded Files ({uploadedFiles.length})</h3>
              <div className="grid gap-3">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors gap-3">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{getFileIcon(file.type)}</span>
                      <div>
                        <p className="font-medium text-gray-800">{file.original_name || file.filename}</p>
                        <p className="text-sm text-gray-500">
                          <span className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded text-xs mr-2">
                            {getFileTypeName(file.type)}
                          </span>
                          {file.uploaded_at && new Date(file.uploaded_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    <a
                      href={`${API_BASE_URL}${file.file_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center w-full sm:w-auto justify-center mt-2 sm:mt-0"
                    >
                      <span className="mr-1">👁️</span>
                      View
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <span className="text-4xl mb-2 block">📂</span>
              <p className="text-gray-500">No files uploaded yet</p>
              <p className="text-sm text-gray-400">Click "Upload New File" to add documents</p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl">
            <div className="bg-gradient-to-r from-cyan-500 to-teal-500 px-6 py-4 rounded-t-2xl">
              <h3 className="text-white font-bold text-lg flex items-center justify-between">
                <span className="flex items-center">
                  <span className="mr-2">📤</span>
                  Upload Files
                </span>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                    setUploadProgress(0);
                  }}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  ✕
                </button>
              </h3>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {/* File Type Selection */}
                <div>
                  <label className="block text-gray-700 font-medium mb-2">File Type</label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="document">📄 Document</option>
                    <option value="paper_answer">📝 Paper Answer Sheet</option>
                    <option value="assignment">📋 Assignment</option>
                    <option value="project">📂 Project Report</option>
                    <option value="id_proof">🪪 ID Proof</option>
                    <option value="photo">📷 Photo</option>
                    <option value="other">📁 Other</option>
                  </select>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Select File</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-teal-500 transition-colors">
                    <input
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files[0])}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <div className="text-4xl mb-2">📁</div>
                      <p className="text-gray-600 mb-1">
                        {selectedFile ? selectedFile.name : 'Click to browse or drag and drop'}
                      </p>
                      <p className="text-xs text-gray-400">PDF, DOC, DOCX, JPG, PNG (Max 10MB)</p>
                    </label>
                  </div>
                </div>

                {/* Upload Progress */}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-teal-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 text-center">{uploadProgress}%</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      setSelectedFile(null);
                      setUploadProgress(0);
                    }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors order-2 sm:order-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFileUpload}
                    disabled={!selectedFile}
                    className="flex-1 bg-teal-500 hover:bg-teal-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
                  >
                    Upload File
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ID Card Modal */}
      {showIdCardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl">
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-4 rounded-t-2xl">
              <h3 className="text-white font-bold text-lg flex items-center justify-between">
                <span className="flex items-center">
                  <span className="mr-2">🆔</span>
                  Student ID Card Preview
                </span>
                <button
                  onClick={() => setShowIdCardModal(false)}
                  className="text-white hover:text-gray-200 transition-colors text-2xl"
                >
                  ✕
                </button>
              </h3>
            </div>

            <div className="p-6">
              {/* ID Card Preview */}
              <div className="flex justify-center mb-6">
                {idCardLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mb-4"></div>
                    <p className="text-gray-600">Loading your ID card...</p>
                  </div>
                ) : hasRealIdCard && realIdCard?.id_card?.image_url ? (
                  /* Real Generated ID Card - Same as AdminIdCard.jsx preview */
                  <div className="bg-white rounded-lg shadow-2xl overflow-hidden w-full max-w-[90vw]" style={{ maxHeight: '70vh' }}>
                    <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-3 text-center">
                      <h3 className="text-white font-bold text-lg">🆔 Official Student ID Card</h3>
                      <p className="text-indigo-100 text-sm flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-3">
                        <span>Card Number: {realIdCard.id_card.card_number || 'N/A'}</span>
                        {realIdCard.id_card.issue_date && (
                          <span className="hidden sm:inline">•</span>
                        )}
                        {realIdCard.id_card.issue_date && (
                          <span>Issued: {new Date(realIdCard.id_card.issue_date).toLocaleDateString()}</span>
                        )}
                      </p>
                    </div>
                    <div className="p-4 flex justify-center overflow-auto">
                      <img
                        src={realIdCard.id_card.image_url.startsWith('data:') ? realIdCard.id_card.image_url : `${API_BASE_URL}${realIdCard.id_card.image_url}`}
                        alt="Student ID Card"
                        className="max-w-full h-auto rounded-lg shadow-lg object-contain"
                        style={{ maxHeight: '50vh' }}
                        onError={(e) => {
                          console.error('❌ [ID CARD] Failed to load real ID card image:', realIdCard.id_card.image_url?.substring(0, 100));
                          // Don't alert immediately to avoid spam
                          setHasRealIdCard(false);
                        }}
                        onLoad={() => {
                          console.log('✅ [ID CARD] Successfully loaded real ID card image');
                        }}
                      />
                    </div>
                    <div className="bg-orange-50 border-t border-orange-200 p-3 text-center">
                      <div className="flex items-center justify-center text-orange-700">
                        <span className="mr-2">✅</span>
                        <span className="text-sm font-medium">This is your official generated ID card</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* No ID Card State */
                  <div className="bg-white rounded-lg shadow-2xl overflow-hidden w-full p-8 text-center">
                    <div className="mb-4">
                      <span className="text-6xl">🪪</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">No ID Card Available</h3>
                    <p className="text-gray-600 mb-6">Your official ID card has not been generated yet.</p>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 inline-block max-w-md">
                      <div className="flex items-center text-orange-700">
                        <span className="mr-2 text-xl">ℹ️</span>
                        <span className="text-sm font-medium text-left">
                          Please contact your branch administrator to generate your official student ID card. Once generated, it will appear here automatically.
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {hasRealIdCard ? (
                  /* Real ID Card Actions */
                  <>
                    <button
                      onClick={() => {
                        // Download real ID card
                        const link = document.createElement('a');
                        const url = realIdCard.id_card.image_url;
                        link.href = url.startsWith('data:') ? url : `${API_BASE_URL}${url}`;
                        link.download = `ID_Card_${profileData?.registrationNo || 'Student'}.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center order-2 sm:order-1"
                    >
                      <span className="mr-2">⬇️</span>
                      Download Official ID Card
                    </button>
                    <button
                      onClick={() => {
                        // Print real ID card
                        const printWindow = window.open('', '_blank');
                        const url = realIdCard.id_card.image_url;
                        const finalUrl = url.startsWith('data:') ? url : `${API_BASE_URL}${url}`;

                        printWindow.document.write(`
                          <html>
                            <head><title>Student ID Card</title></head>
                            <body style="margin: 0; padding: 20px; text-align: center;">
                              <img src="${finalUrl}" style="max-width: 100%; height: auto;" />
                              <script>
                                window.onload = function() { setTimeout(function(){ window.print(); }, 500); }
                              </script>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center order-1 sm:order-2"
                    >
                      <span className="mr-2">🖨️</span>
                      Print Official ID Card
                    </button>
                  </>
                ) : (
                  /* Preview ID Card Actions */
                  <>
                    <button
                      onClick={handleDownloadCard}
                      className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center order-2 sm:order-1"
                    >
                      <span className="mr-2">⬇️</span>
                      Download ID Card
                    </button>
                    <button
                      onClick={handlePrintCard}
                      className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center order-1 sm:order-2"
                    >
                      <span className="mr-2">🖨️</span>
                      Print ID Card
                    </button>
                    <div className="text-center w-full order-3">
                      <p className="text-sm text-orange-600 mt-2">
                        📋 This is a preview only. Contact your administrator to generate an official ID card.
                      </p>
                    </div>
                  </>
                )}
                <button
                  onClick={() => setShowIdCardModal(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors w-full sm:w-auto order-4"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProfile;
