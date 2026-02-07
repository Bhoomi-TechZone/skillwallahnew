import React, { useState, useEffect, useRef } from 'react';
import { FaPlus, FaEye, FaTrash, FaPrint, FaSearch, FaDownload } from 'react-icons/fa';
import BranchLayout from '../BranchLayout';
import { idCardApi } from '../../../api/certificatesApi';

const AdminAdmitCard = () => {
  // State management
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchFilters, setSearchFilters] = useState({
    searchByName: '',
    program: '',
    course: ''
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isIdCardModalOpen, setIsIdCardModalOpen] = useState(false);
  const [idCardData, setIdCardData] = useState(null);
  const canvasRef = useRef(null);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewStudentData, setViewStudentData] = useState(null);

  // Dropdown options
  const programOptions = [
    '--- SELECT Program ---',
    'ADVANCE DIPLOMA IN COMPUTER APPLICATION (ADCA)',
    'Computer Science Engineering (CSE)',
    'Web Development',
    'Software Development',
    'Mobile App Development'
  ];

  const courseOptions = [
    '--- SELECT COURSE ---',
    'React.js Development',
    'Python Programming',
    'Full Stack Development',
    'Data Science',
    'Machine Learning',
    'Cyber Security'
  ];

  // API Base URL
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

  // Test template availability on component mount
  const testTemplateAvailability = async () => {
    try {
      const templateUrl = `${API_BASE_URL}/uploads/id%20card/idcard.png`;
      const response = await fetch(templateUrl, { method: 'HEAD' });
      console.log('Template availability test:', response.status === 200 ? 'Available' : 'Not Available');
      console.log('Template URL tested:', templateUrl);
    } catch (error) {
      console.warn('Template availability test failed:', error);
    }
  };

  // Load existing ID cards for students
  const loadExistingIdCards = async () => {
    try {
      console.log('Loading existing ID cards...');
      const allIdCards = await idCardApi.getAllIdCards();

      // Update students with their existing ID card status
      setStudents(currentStudents =>
        currentStudents.map(student => {
          const hasIdCard = allIdCards.some(card => card.student_id === student.id);
          return { ...student, hasAdmitCard: hasIdCard };
        })
      );

      console.log(`Loaded ${allIdCards.length} existing ID cards`);
    } catch (error) {
      console.warn('Error loading existing ID cards:', error);
    }
  };

  // Test backend ID card API
  const testBackendApi = async () => {
    try {
      console.log('Testing backend ID card API...');

      // Test get all ID cards endpoint
      const idCards = await idCardApi.getAllIdCards();
      console.log('Backend ID card API is working. Found ID cards:', idCards.length);

      return true;
    } catch (error) {
      console.warn('Backend API test failed:', error);
      return false;
    }
  };

  // Fetch students from API
  const fetchStudentsFromAPI = async () => {
    try {
      const branchCode = localStorage.getItem('branchCode') || '6940014d3ef371c397594e18';
      const response = await fetch(`${API_BASE_URL}/api/branch-students/students?branch_code=${branchCode}&exclude_id_card=true`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken') || 'demo_token'}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched students from API:', data);

        // Transform API data to match our component structure with complete student information
        const transformedStudents = data.students?.map((student, index) => ({
          id: student._id || student.id || index + 1,
          sn: index + 1,
          regNo: student.reg_number || student.regNo || `SVGE${Date.now()}${index}`,
          studentName: student.full_name || student.name || student.studentName || 'Unknown Student',
          program: student.program || student.course || 'ADVANCE DIPLOMA IN COMPUTER APPLICATION (ADCA)',
          institute: student.institute || student.branch_name || 'SkillWallah EdTech',
          sem: student.semester || student.sem || 1,
          status: student.status || 'On',
          hasAdmitCard: true,
          email: student.email || '',
          phone: student.phone || student.mobile || '',
          dateOfBirth: student.date_of_birth || student.dob || '',
          address: student.address || '',
          fatherName: student.father_name || student.fatherName || '',
          motherName: student.mother_name || student.motherName || '',
          photoUrl: student.photo_url || student.photoUrl || '', // Student photo from backend
          course: student.course || student.program || 'ADCA', // Course information
          rollNumber: student.roll_number || student.rollNumber || '', // Roll number if different from reg number
          batch: student.batch || '', // Batch information
          session: student.session || student.academic_session || '2024-25' // Academic session
        })) || [];

        return transformedStudents;
      } else {
        console.warn('API call failed, using mock data');
        return mockStudents;
      }
    } catch (error) {
      console.error('Error fetching students from API:', error);
      return mockStudents;
    }
  };

  // Mock data for now - replace with actual API call
  const mockStudents = [
    {
      id: 1,
      sn: 1,
      regNo: 'SVGE2025225',
      studentName: 'ISHAN BANERJEE',
      program: 'ADVANCE DIPLOMA IN COMPUTER APPLICATION (ADCA)',
      institute: 'Bright education',
      sem: 1,
      status: 'On',
      hasAdmitCard: true
    },
    {
      id: 2,
      sn: 2,
      regNo: 'SVGE2025209',
      studentName: 'AMIT',
      program: 'ADVANCE DIPLOMA IN COMPUTER APPLICATION (ADCA)',
      institute: 'SSK ACADEMY',
      sem: 1,
      status: 'On',
      hasAdmitCard: true
    },
    {
      id: 3,
      sn: 3,
      regNo: 'SVGE2025212',
      studentName: 'Frhd',
      program: 'CSE',
      institute: 'Tech Institute',
      sem: 1,
      status: 'On',
      hasAdmitCard: true
    },
    {
      id: 4,
      sn: 4,
      regNo: 'SVGE2025213',
      studentName: 'Ankit',
      program: 'CSE',
      institute: 'Engineering College',
      sem: 1,
      status: 'On',
      hasAdmitCard: true
    }
  ];

  const [formData, setFormData] = useState({
    regNo: '',
    studentName: '',
    program: '',
    course: '',
    institute: '',
    sem: '',
    examDate: '',
    examTime: '',
    venue: '',
    instructions: ''
  });

  useEffect(() => {
    // Fetch students from API
    const loadStudents = async () => {
      setLoading(true);
      try {
        // Test template availability first
        await testTemplateAvailability();

        // Test backend API
        const apiWorking = await testBackendApi();

        const studentsData = await fetchStudentsFromAPI();
        setStudents(studentsData);
        console.log('Loaded', studentsData.length, 'students from backend');

        // Load existing ID cards if backend is working
        if (apiWorking) {
          await loadExistingIdCards();
        }
      } catch (error) {
        console.error('Error loading students:', error);
        // Fallback to mock data
        setStudents(mockStudents);
        console.log('Using mock data due to API error');
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
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
  };

  // Handle search
  const handleSearch = () => {
    console.log('Searching with filters:', searchFilters);
    // Implement search logic here
  };

  // Handle add new admit card
  const handleAddNew = () => {
    setFormData({
      regNo: '',
      studentName: '',
      program: '',
      course: '',
      institute: '',
      sem: '',
      examDate: '',
      examTime: '',
      venue: '',
      instructions: ''
    });
    setIsAddModalOpen(true);
  };

  // Handle save admit card
  const handleSaveAdmitCard = () => {
    console.log('Saving admit card:', formData);
    // Implement save logic here
    setIsAddModalOpen(false);
  };

  // Handle generate admit card
  const handleGenerateAdmitCard = async (student) => {
    console.log('Generating ID card for:', student);
    setIsGeneratingCard(true);

    try {
      // Generate the ID card data
      const cardData = await generateIdCard(student);
      setIdCardData(cardData);
      setSelectedStudent(student);
      setIsIdCardModalOpen(true);
    } catch (error) {
      console.error('Error generating ID card:', error);
      alert('Failed to generate ID card. Please try again.');
    } finally {
      setIsGeneratingCard(false);
    }
  };

  // Handle direct print (generate and print immediately)
  const handleDirectPrint = async (student) => {
    console.log('Direct printing ID card for:', student);
    setIsGeneratingCard(true);

    try {
      // Generate the ID card data
      const cardData = await generateIdCard(student);

      // Print immediately
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        alert('Please allow pop-ups to print the ID card');
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>ID Card - ${student.studentName}</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                margin: 0;
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background: white;
                font-family: Arial, sans-serif;
              }
              .container {
                text-align: center;
              }
              .id-card {
                max-width: 100%;
                height: auto;
                border: 2px solid #333;
                border-radius: 10px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
              }
              .print-info {
                margin-top: 20px;
                font-size: 14px;
                color: #666;
              }
              @media print {
                body {
                  padding: 0;
                  background: white;
                }
                .id-card {
                  border: 1px solid #000;
                  box-shadow: none;
                }
                .print-info {
                  display: none;
                }
              }
              @page {
                margin: 0.5in;
                size: auto;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <img src="${cardData.imageData}" alt="ID Card for ${student.studentName}" class="id-card" />
              <div class="print-info">
                <p><strong>Student:</strong> ${student.studentName}</p>
                <p><strong>Registration No:</strong> ${student.regNo}</p>
                <p><strong>Generated on:</strong> ${new Date().toLocaleString()}</p>
              </div>
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  setTimeout(function() {
                    window.close();
                  }, 1000);
                }, 1000);
              };
              
              window.onafterprint = function() {
                window.close();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();

    } catch (error) {
      console.error('Error in direct print:', error);
      alert('Failed to print ID card. Please try again.');
    } finally {
      setIsGeneratingCard(false);
    }
  };

  // Generate ID card using backend API
  const generateIdCard = async (student) => {
    console.log('Generating ID card for student using backend API:', student);

    try {
      // First check if student already has an ID card
      const existingCard = await idCardApi.getIdCardByStudentId(student.id);

      if (existingCard) {
        console.log('Found existing ID card:', existingCard);

        // Download existing card image
        const downloadResult = await idCardApi.downloadIdCard(existingCard.id);

        return {
          imageData: downloadResult.url,
          student: student,
          generatedAt: existingCard.created_at,
          cardId: existingCard.id,
          cardNumber: existingCard.card_number,
          isExisting: true
        };
      }

      // Generate new ID card if none exists
      console.log('Generating new ID card for student:', student.id);

      const cardData = {
        card_type: 'student',
        issue_date: new Date().toISOString().split('T')[0],
        expiry_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0], // 1 year validity
        status: 'active'
      };

      const result = await idCardApi.generateIdCard(student.id, cardData);
      console.log('ID card generated successfully:', result);

      // Download the generated image
      const downloadResult = await idCardApi.downloadIdCard(result.id);

      return {
        imageData: downloadResult.url,
        student: student,
        generatedAt: result.created_at,
        cardId: result.id,
        cardNumber: result.card_number,
        isExisting: false
      };

    } catch (error) {
      console.error('Error with backend ID card API:', error);

      // Fallback to client-side generation if backend fails
      console.log('Falling back to client-side generation...');
      return await generateIdCardClientSide(student);
    }
  };

  // Fallback client-side ID card generation 
  const generateIdCardClientSide = async (student) => {
    console.log('Generating ID card client-side for student:', student);
    console.log('Using template image from:', `${API_BASE_URL}/uploads/id%20card/idcard.png`);

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Load the ID card template
      const templateImage = new Image();
      templateImage.crossOrigin = 'anonymous';

      templateImage.onload = function () {
        console.log('Template image loaded successfully. Dimensions:', this.width, 'x', this.height);
        // Set canvas size to match template exactly
        canvas.width = this.width;
        canvas.height = this.height;

        // Draw the original template image as-is (keeping the design intact)
        ctx.drawImage(this, 0, 0);

        // Configure text styling for overlaying student details
        // Using anti-aliased text for better quality
        ctx.textBaseline = 'top';
        ctx.imageSmoothingEnabled = true;

        // Student Name - positioned to the right of photo area (like in template)
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 16px Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(student.studentName || 'Student Name', 220, 280);

        // Registration Number - below name
        ctx.font = '14px Arial, sans-serif';
        ctx.fillText(student.regNo || 'FR-SK-XXXX', 220, 310);

        // D.O.B - if available
        if (student.dob) {
          ctx.fillText(new Date(student.dob).toLocaleDateString('en-IN'), 220, 340);
        }

        // Course - below other details
        const courseText = student.course || student.program || 'Full Stack Development';
        ctx.fillText(courseText.length > 30 ? courseText.substring(0, 27) + '...' : courseText, 220, 370);

        // Duration - if available
        if (student.duration) {
          ctx.fillText(student.duration, 220, 400);
        }

        // Branch - if available
        if (student.branch) {
          ctx.fillText(student.branch, 220, 430);
        }

        // Address - if available
        if (student.address) {
          ctx.fillText(student.address.length > 25 ? student.address.substring(0, 22) + '...' : student.address, 220, 460);
        }

        // Contact - at bottom like in template
        ctx.fillText(student.mobile || student.phone || '9876543210', 220, 490);

        // Issue Date (small text at bottom)
        const currentDate = new Date().toLocaleDateString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        ctx.font = '10px Arial, sans-serif';
        ctx.fillText(`Issued: ${currentDate}`, canvas.width * 0.5, canvas.height * 0.92);

        // Convert canvas to data URL (keeping original template with overlaid text)
        const dataURL = canvas.toDataURL('image/png', 1.0);
        resolve({
          imageData: dataURL,
          student: student,
          generatedAt: new Date().toISOString()
        });
      };

      templateImage.onerror = function () {
        console.error('Failed to load ID card template from primary URL:', templateImage.src);

        // Try alternative URL without URL encoding
        const alternativeTemplate = new Image();
        alternativeTemplate.crossOrigin = 'anonymous';

        alternativeTemplate.onload = function () {
          console.log('Alternative template loaded successfully. Dimensions:', this.width, 'x', this.height);
          // Set canvas size to match template exactly
          canvas.width = this.width;
          canvas.height = this.height;

          // Draw the original template as-is (keeping the design intact)
          ctx.drawImage(this, 0, 0);

          // Apply same text overlay styling
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 20px Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.imageSmoothingEnabled = true;

          // Student information overlay - same positioning as primary template
          ctx.fillStyle = '#333333';
          ctx.font = 'bold 16px Arial, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(student.studentName || 'Student Name', 220, 280);

          ctx.font = '14px Arial, sans-serif';
          ctx.fillText(student.regNo || 'FR-SK-XXXX', 220, 310);

          if (student.dob) {
            ctx.fillText(new Date(student.dob).toLocaleDateString('en-IN'), 220, 340);
          }

          const courseText = student.course || student.program || 'Full Stack Development';
          ctx.fillText(courseText.length > 30 ? courseText.substring(0, 27) + '...' : courseText, 220, 370);

          if (student.duration) {
            ctx.fillText(student.duration, 220, 400);
          }

          if (student.branch) {
            ctx.fillText(student.branch, 220, 430);
          }

          if (student.address) {
            ctx.fillText(student.address.length > 25 ? student.address.substring(0, 22) + '...' : student.address, 220, 460);
          }

          ctx.fillText(student.mobile || student.phone || '9876543210', 220, 490);

          const currentDate = new Date().toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          ctx.font = '10px Arial, sans-serif';
          ctx.fillText(`Issued: ${currentDate}`, canvas.width * 0.5, canvas.height * 0.92);

          const dataURL = canvas.toDataURL('image/png', 1.0);
          resolve({
            imageData: dataURL,
            student: student,
            generatedAt: new Date().toISOString()
          });
        };

        alternativeTemplate.onerror = function () {
          console.error('Failed to load ID card template from alternative URL:', alternativeTemplate.src);
          reject(new Error('Failed to load ID card template from both URLs. Please check if the template file exists at london_lms/uploads/id card/idcard.png'));
        };

        alternativeTemplate.src = `${API_BASE_URL}/uploads/id%20card/idcard.png?t=${Date.now()}`;
        console.log('Trying alternative template URL:', alternativeTemplate.src);
      };

      // Load template from uploads folder (primary URL)
      templateImage.src = `${API_BASE_URL}/uploads/id%20card/idcard.png?t=${Date.now()}`;
    });
  };

  // Handle print ID card
  const handlePrintIdCard = () => {
    if (!idCardData) {
      alert('No ID card data available for printing');
      return;
    }

    try {
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        alert('Please allow pop-ups to print the ID card');
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>ID Card - ${selectedStudent.studentName}</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                margin: 0;
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background: white;
                font-family: Arial, sans-serif;
              }
              .container {
                text-align: center;
              }
              .id-card {
                max-width: 100%;
                height: auto;
                border: 2px solid #333;
                border-radius: 10px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
              }
              .print-info {
                margin-top: 20px;
                font-size: 14px;
                color: #666;
              }
              @media print {
                body {
                  padding: 0;
                  background: white;
                }
                .id-card {
                  border: 1px solid #000;
                  box-shadow: none;
                }
                .print-info {
                  display: none;
                }
              }
              @page {
                margin: 0.5in;
                size: auto;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <img src="${idCardData.imageData}" alt="ID Card for ${selectedStudent.studentName}" class="id-card" />
              <div class="print-info">
                <p><strong>Student:</strong> ${selectedStudent.studentName}</p>
                <p><strong>Registration No:</strong> ${selectedStudent.regNo}</p>
                <p><strong>Generated on:</strong> ${new Date().toLocaleString()}</p>
              </div>
            </div>
            <script>
              window.onload = function() {
                // Allow image to load completely
                setTimeout(function() {
                  window.print();
                  // Close window after print dialog
                  setTimeout(function() {
                    window.close();
                  }, 1000);
                }, 1000);
              };
              
              // Handle print dialog close
              window.onbeforeprint = function() {
                console.log('Print dialog opened');
              };
              
              window.onafterprint = function() {
                console.log('Print dialog closed');
                window.close();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error('Error opening print window:', error);
      alert('Failed to open print window. Please try again.');
    }
  };

  // Handle download ID card
  const handleDownloadIdCard = async () => {
    if (!idCardData) {
      alert('No ID card data available for download');
      return;
    }

    try {
      // If we have a cardId from backend, use backend download
      if (idCardData.cardId) {
        console.log('Downloading ID card from backend:', idCardData.cardId);

        const downloadResult = await idCardApi.downloadIdCard(idCardData.cardId);

        // Create download link
        const link = document.createElement('a');
        link.download = `ID_Card_${selectedStudent.regNo}_${selectedStudent.studentName.replace(/\s+/g, '_')}.png`;
        link.href = downloadResult.url;
        link.click();

        // Clean up blob URL
        setTimeout(() => URL.revokeObjectURL(downloadResult.url), 1000);
        return;
      }

      // Fallback to client-side download
      const link = document.createElement('a');
      link.download = `ID_Card_${selectedStudent.regNo}_${selectedStudent.studentName.replace(/\s+/g, '_')}.png`;
      link.href = idCardData.imageData;
      link.click();
    } catch (error) {
      console.error('Error downloading ID card:', error);
      alert('Error downloading ID card. Please try again.');

      // Fallback to client-side download
      const link = document.createElement('a');
      link.download = `ID_Card_${selectedStudent.regNo}_${selectedStudent.studentName.replace(/\s+/g, '_')}.png`;
      link.href = idCardData.imageData;
      link.click();
    }
  };

  // Handle delete student
  const handleDeleteStudent = (studentId) => {
    if (window.confirm('Are you sure you want to delete this student record?')) {
      console.log('Deleting student:', studentId);
      // Implement delete logic
    }
  };

  // Handle view student details
  const handleViewStudent = (student) => {
    setViewStudentData(student);
    setIsViewModalOpen(true);
    console.log('Viewing student details:', student);
  };

  // Filter students based on search
  const filteredStudents = students.filter(student => {
    const matchesName = !searchFilters.searchByName ||
      student.studentName.toLowerCase().includes(searchFilters.searchByName.toLowerCase()) ||
      student.regNo.toLowerCase().includes(searchFilters.searchByName.toLowerCase());
    const matchesProgram = !searchFilters.program || searchFilters.program === '--- SELECT Program ---' ||
      student.program.toLowerCase().includes(searchFilters.program.toLowerCase());
    const matchesCourse = !searchFilters.course || searchFilters.course === '--- SELECT COURSE ---';

    return matchesName && matchesProgram && matchesCourse;
  });

  return (
    <BranchLayout>
      <div className="p-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
              📋 MANAGE ADMIT CARD
            </h1>
            <button
              onClick={handleAddNew}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold"
            >
              Add new
            </button>
          </div>

          {/* Search Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-gray-700 font-medium whitespace-nowrap">Search By Name :</span>
              <input
                type="text"
                value={searchFilters.searchByName}
                onChange={(e) => handleSearchChange('searchByName', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter student name or reg no"
              />
            </div>
            <div>
              <select
                value={searchFilters.program}
                onChange={(e) => handleSearchChange('program', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {programOptions.map((option, index) => (
                  <option key={index} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={searchFilters.course}
                onChange={(e) => handleSearchChange('course', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {courseOptions.map((option, index) => (
                  <option key={index} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <button
                onClick={handleSearch}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
              >
                <FaSearch />
                Search
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Table Header */}
          <div className="bg-orange-700 text-white">
            <div className="grid grid-cols-6 gap-4 p-4 font-semibold text-center">
              <div>SN.</div>
              <div>REG. NO</div>
              <div>DETAILS</div>
              <div>SEM</div>
              <div>OPERATION</div>
              <div>ACTION</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading students...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No students found matching your search criteria.
              </div>
            ) : (
              filteredStudents.map((student, index) => (
                <div key={student.id} className="grid grid-cols-6 gap-4 p-4 hover:bg-gray-50 items-center">
                  <div className="text-center font-medium">{student.sn}</div>
                  <div className="text-center">
                    <div className="font-semibold text-gray-900">{student.regNo}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-blue-600">{student.studentName}</div>
                    <div className="text-sm text-gray-600">{student.program}</div>
                    <div className="text-xs text-gray-500">({student.institute})</div>
                  </div>
                  <div className="text-center">
                    <span className="font-semibold text-lg">{student.sem}</span>
                  </div>
                  <div className="text-center">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${student.status === 'On'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-red-100 text-red-800'
                      }`}>
                      {student.status}
                    </span>
                  </div>
                  <div className="flex justify-center gap-1">
                    <button
                      onClick={() => handleViewStudent(student)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                      title="View Student Details"
                    >
                      <FaEye />
                    </button>
                    {student.hasAdmitCard && (
                      <>
                        <button
                          onClick={() => handleGenerateAdmitCard(student)}
                          className="px-2 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm flex items-center gap-1"
                          disabled={isGeneratingCard}
                          title="Preview ID Card"
                        >
                          <FaEye />
                          <span className="hidden lg:inline">Preview</span>
                        </button>
                        <button
                          onClick={() => handleDirectPrint(student)}
                          className="px-2 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-sm flex items-center gap-1"
                          disabled={isGeneratingCard}
                          title="Print ID Card Directly"
                        >
                          {isGeneratingCard ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            <FaPrint />
                          )}
                          <span className="hidden lg:inline">Print</span>
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDeleteStudent(student.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                      title="Delete Student"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Add New Admit Card Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Add New Admit Card</h2>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSaveAdmitCard(); }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Registration Number *
                    </label>
                    <input
                      type="text"
                      value={formData.regNo}
                      onChange={(e) => handleFormChange('regNo', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Student Name *
                    </label>
                    <input
                      type="text"
                      value={formData.studentName}
                      onChange={(e) => handleFormChange('studentName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Program *
                    </label>
                    <select
                      value={formData.program}
                      onChange={(e) => handleFormChange('program', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      {programOptions.map((option, index) => (
                        <option key={index} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Course
                    </label>
                    <select
                      value={formData.course}
                      onChange={(e) => handleFormChange('course', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {courseOptions.map((option, index) => (
                        <option key={index} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Institute
                    </label>
                    <input
                      type="text"
                      value={formData.institute}
                      onChange={(e) => handleFormChange('institute', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Semester
                    </label>
                    <input
                      type="number"
                      value={formData.sem}
                      onChange={(e) => handleFormChange('sem', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                      max="8"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exam Date
                    </label>
                    <input
                      type="date"
                      value={formData.examDate}
                      onChange={(e) => handleFormChange('examDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exam Time
                    </label>
                    <input
                      type="time"
                      value={formData.examTime}
                      onChange={(e) => handleFormChange('examTime', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exam Venue
                  </label>
                  <input
                    type="text"
                    value={formData.venue}
                    onChange={(e) => handleFormChange('venue', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter exam venue"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Special Instructions
                  </label>
                  <textarea
                    value={formData.instructions}
                    onChange={(e) => handleFormChange('instructions', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="3"
                    placeholder="Enter any special instructions for the exam"
                  />
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
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Save Admit Card
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Student Details View Modal */}
        {isViewModalOpen && viewStudentData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">
                  Student Details - {viewStudentData.studentName}
                </h2>
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Student Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-4 text-blue-800 flex items-center">
                    👤 Basic Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <span className="font-medium text-gray-700">Full Name:</span>
                      <p className="text-gray-900 font-semibold">{viewStudentData.studentName}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Registration Number:</span>
                      <p className="text-gray-900 font-mono">{viewStudentData.regNo}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Student ID:</span>
                      <p className="text-gray-900">{viewStudentData.id}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-sm font-medium ${viewStudentData.status === 'On'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-red-100 text-red-800'
                        }`}>
                        {viewStudentData.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Academic Information */}
                <div className="bg-orange-50 rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-4 text-orange-800 flex items-center">
                    🎓 Academic Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <span className="font-medium text-gray-700">Program:</span>
                      <p className="text-gray-900">{viewStudentData.program}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Institute:</span>
                      <p className="text-gray-900">{viewStudentData.institute}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Current Semester:</span>
                      <p className="text-gray-900 font-semibold text-2xl">{viewStudentData.sem}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">ID Card Available:</span>
                      <span className={`px-2 py-1 rounded-full text-sm font-medium ${viewStudentData.hasAdmitCard
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                        }`}>
                        {viewStudentData.hasAdmitCard ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                {(viewStudentData.email || viewStudentData.phone) && (
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-4 text-yellow-800 flex items-center">
                      📞 Contact Information
                    </h3>
                    <div className="space-y-3">
                      {viewStudentData.email && (
                        <div>
                          <span className="font-medium text-gray-700">Email:</span>
                          <p className="text-gray-900">{viewStudentData.email}</p>
                        </div>
                      )}
                      {viewStudentData.phone && (
                        <div>
                          <span className="font-medium text-gray-700">Phone:</span>
                          <p className="text-gray-900">{viewStudentData.phone}</p>
                        </div>
                      )}
                      {viewStudentData.address && (
                        <div>
                          <span className="font-medium text-gray-700">Address:</span>
                          <p className="text-gray-900">{viewStudentData.address}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Family Information */}
                {(viewStudentData.fatherName || viewStudentData.motherName) && (
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-4 text-purple-800 flex items-center">
                      👨‍👩‍👧‍👦 Family Information
                    </h3>
                    <div className="space-y-3">
                      {viewStudentData.fatherName && (
                        <div>
                          <span className="font-medium text-gray-700">Father's Name:</span>
                          <p className="text-gray-900">{viewStudentData.fatherName}</p>
                        </div>
                      )}
                      {viewStudentData.motherName && (
                        <div>
                          <span className="font-medium text-gray-700">Mother's Name:</span>
                          <p className="text-gray-900">{viewStudentData.motherName}</p>
                        </div>
                      )}
                      {viewStudentData.dateOfBirth && (
                        <div>
                          <span className="font-medium text-gray-700">Date of Birth:</span>
                          <p className="text-gray-900">{viewStudentData.dateOfBirth}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-4 mt-6 pt-4 border-t">
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                {viewStudentData.hasAdmitCard && (
                  <button
                    onClick={() => {
                      setIsViewModalOpen(false);
                      handleGenerateAdmitCard(viewStudentData);
                    }}
                    className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors flex items-center gap-2"
                  >
                    <FaPrint />
                    Generate ID Card
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ID Card Preview Modal */}
        {isIdCardModalOpen && idCardData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">
                  ID Card Preview - {selectedStudent.studentName}
                </h2>
                <button
                  onClick={() => setIsIdCardModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* ID Card Preview */}
              <div className="flex justify-center mb-6">
                <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                  <img
                    src={idCardData.imageData}
                    alt={`ID Card for ${selectedStudent.studentName}`}
                    className="max-w-full h-auto rounded-lg shadow-lg"
                    style={{ maxHeight: '500px' }}
                  />
                </div>
              </div>

              {/* Student Details */}
              <div className="bg-gray-100 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-lg mb-3 text-gray-800">Student Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Name:</span>
                    <span className="ml-2 text-gray-900">{selectedStudent.studentName}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Registration No:</span>
                    <span className="ml-2 text-gray-900">{selectedStudent.regNo}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Program:</span>
                    <span className="ml-2 text-gray-900">{selectedStudent.program}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Institute:</span>
                    <span className="ml-2 text-gray-900">{selectedStudent.institute}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Semester:</span>
                    <span className="ml-2 text-gray-900">{selectedStudent.sem}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Card Status:</span>
                    <span className="ml-2">
                      {idCardData.isExisting ? (
                        <span className="text-orange-600 font-medium">✓ Existing Card</span>
                      ) : (
                        <span className="text-blue-600 font-medium">🆕 Newly Generated</span>
                      )}
                    </span>
                  </div>
                  {idCardData.cardNumber && (
                    <div>
                      <span className="font-medium text-gray-700">Card Number:</span>
                      <span className="ml-2 text-gray-900">{idCardData.cardNumber}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-gray-700">Generated:</span>
                    <span className="ml-2 text-gray-900">
                      {new Date(idCardData.generatedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setIsIdCardModalOpen(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <FaEye />
                  Close Preview
                </button>
                <button
                  onClick={handleDownloadIdCard}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <FaDownload />
                  Download
                </button>
                <button
                  onClick={handlePrintIdCard}
                  className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors flex items-center gap-2"
                >
                  <FaPrint />
                  Print ID Card
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{filteredStudents.length}</div>
              <div className="text-sm text-gray-600">Total Students</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {filteredStudents.filter(s => s.hasAdmitCard).length}
              </div>
              <div className="text-sm text-gray-600">Admit Cards Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {filteredStudents.filter(s => s.status === 'On').length}
              </div>
              <div className="text-sm text-gray-600">Active Students</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {new Set(filteredStudents.map(s => s.program)).size}
              </div>
              <div className="text-sm text-gray-600">Programs</div>
            </div>
          </div>
        </div>
      </div>
    </BranchLayout>
  );
};

export default AdminAdmitCard;