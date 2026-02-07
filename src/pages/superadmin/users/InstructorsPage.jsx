import React, { useState, useEffect } from 'react';
import { FaUserTie, FaPlus, FaEdit, FaTrash, FaEye, FaDollarSign, FaGraduationCap, FaUsers, FaBars } from 'react-icons/fa';
import SuperAdminSidebar from '../SuperAdminSidebar';
import { useNavigate } from 'react-router-dom';

const InstructorsPage = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [instructors, setInstructors] = useState([]);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  const [newInstructor, setNewInstructor] = useState({
    name: '',
    email: '',
    password: '',
    specialization: '',
    experience: '',
    bio: ''
  });
  const [editInstructor, setEditInstructor] = useState({
    name: '',
    email: '',
    specialization: '',
    experience: '',
    bio: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchInstructors(), fetchCourses(), fetchEnrollments(), fetchTransactions()]);
      setLoading(false);

      // Debug: Check localStorage for enrollment data
      console.log('🔍 Debugging enrollment data sources:');
      console.log('  - course_enrollments:', localStorage.getItem('course_enrollments'));
      console.log('  - enrollments:', localStorage.getItem('enrollments'));
      console.log('  - my-courses:', localStorage.getItem('my-courses'));
      console.log('  - enrolled_courses:', localStorage.getItem('enrolled_courses'));
      console.log('  - enrolledCourses:', localStorage.getItem('enrolledCourses'));
    };
    loadData();
  }, []);

  const fetchInstructors = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/users/instructors', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Instructors API response:', data);

        // Handle different response formats
        let instructorsArray = [];
        if (Array.isArray(data)) {
          instructorsArray = data;
        } else if (data.instructors && Array.isArray(data.instructors)) {
          instructorsArray = data.instructors;
        } else if (data.data && Array.isArray(data.data)) {
          instructorsArray = data.data;
        } else if (data.users && Array.isArray(data.users)) {
          instructorsArray = data.users;
        }

        console.log('Filtered instructors:', instructorsArray);
        setInstructors(instructorsArray);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch instructors:', response.status, errorData);
        setError('Failed to fetch instructors');
        setInstructors([]);
      }
    } catch (error) {
      console.error('Error fetching instructors:', error);
      setError('Network error. Please check your connection.');
      setInstructors([]);
    }
  };

  const fetchCourses = async () => {
    try {
      console.log('🔄 Fetching courses from API...');
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/api/branch-courses/courses', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📚 Courses API response:', data);

        // Handle different response formats
        let coursesArray = [];
        if (Array.isArray(data)) {
          coursesArray = data;
        } else if (data.courses && Array.isArray(data.courses)) {
          coursesArray = data.courses;
        } else if (data.data && Array.isArray(data.data)) {
          coursesArray = data.data;
        }

        console.log('✅ Courses fetched successfully:', coursesArray.length);
        setCourses(coursesArray);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to fetch courses:', response.status, errorData);
        setCourses([]);
      }
    } catch (error) {
      console.error('❌ Error fetching courses:', error);
      setCourses([]);
    }
  };

  const fetchEnrollments = async () => {
    try {
      console.log('🔄 Fetching enrollments from API...');
      const token = localStorage.getItem('token');

      // Try multiple endpoints for enrollment data
      const endpoints = [
        'http://localhost:4000/enrollment/all',
        'http://localhost:4000/enrollment/',
        'http://localhost:4000/enrollments'
      ];

      let enrollmentsArray = [];
      let fetchSuccess = false;

      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Trying endpoint: ${endpoint}`);
          const response = await fetch(endpoint, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`📚 Response from ${endpoint}:`, data);

            // Handle different response formats
            if (Array.isArray(data)) {
              enrollmentsArray = data;
            } else if (data.enrollments && Array.isArray(data.enrollments)) {
              enrollmentsArray = data.enrollments;
            } else if (data.data && Array.isArray(data.data)) {
              enrollmentsArray = data.data;
            } else if (data.results && Array.isArray(data.results)) {
              enrollmentsArray = data.results;
            }

            if (enrollmentsArray.length > 0) {
              console.log(`✅ Found ${enrollmentsArray.length} enrollments from ${endpoint}`);
              fetchSuccess = true;
              break;
            }
          } else {
            console.log(`❌ ${endpoint} failed with status:`, response.status);
          }
        } catch (endpointError) {
          console.log(`❌ Error with ${endpoint}:`, endpointError.message);
        }
      }

      if (!fetchSuccess) {
        // Check localStorage for any enrollment data
        const storedCourses = localStorage.getItem('course_enrollments');
        const storedEnrollments = localStorage.getItem('enrollments');
        const enrolledCourses = localStorage.getItem('enrolledCourses');

        if (storedCourses) {
          try {
            const parsed = JSON.parse(storedCourses);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log('📦 Found enrollment data in localStorage (course_enrollments)');
              enrollmentsArray = parsed.map(enrollment => ({
                enrollment_id: enrollment._id || enrollment.id || `local_${Date.now()}_${Math.random()}`,
                student_id: enrollment.student_id || 'unknown',
                student_name: enrollment.student_name || 'Student',
                student_email: enrollment.student_email || 'student@example.com',
                course_id: enrollment.course_id || enrollment._id || enrollment.id,
                course_title: enrollment.title || enrollment.course_title || 'Course',
                course_name: enrollment.title || enrollment.course_name || 'Course',
                instructor: enrollment.instructor?.name || enrollment.instructor || 'Unknown',
                enrollment_date: enrollment.enrollment_date || enrollment.enrolled_at || new Date().toISOString(),
                status: enrollment.status || 'active',
                progress: enrollment.progress || 0,
                completed: enrollment.completed || false
              }));
              fetchSuccess = true;
            }
          } catch (e) {
            console.warn('Failed to parse course_enrollments from localStorage:', e);
          }
        }

        if (!fetchSuccess && enrolledCourses) {
          try {
            const parsed = JSON.parse(enrolledCourses);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log('📦 Found enrollment data in localStorage (enrolledCourses)');
              enrollmentsArray = parsed.map((course, index) => ({
                enrollment_id: course._id || course.id || `enrolled_${Date.now()}_${index}`,
                student_id: course.student_id || 'unknown_student',
                student_name: course.student_name || 'Student',
                student_email: course.student_email || 'student@example.com',
                course_id: course._id || course.id,
                course_title: course.title || course.name,
                course_name: course.title || course.name,
                instructor: course.instructor?.name || course.instructor || 'Unknown',
                enrollment_date: course.enrollment_date || course.enrolled_at || course.enrolledAt || new Date().toISOString(),
                status: course.status || 'active',
                progress: course.progress || 0,
                completed: course.completed || false
              }));
              fetchSuccess = true;
            }
          } catch (e) {
            console.warn('Failed to parse enrolledCourses from localStorage:', e);
          }
        }

        if (!fetchSuccess && storedEnrollments) {
          try {
            const parsed = JSON.parse(storedEnrollments);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log('📦 Found enrollment data in localStorage (enrollments)');
              enrollmentsArray = parsed;
              fetchSuccess = true;
            }
          } catch (e) {
            console.warn('Failed to parse enrollments from localStorage:', e);
          }
        }
      }

      console.log(`📊 Final enrollment count: ${enrollmentsArray.length}`);
      setEnrollments(enrollmentsArray);

    } catch (error) {
      console.error('❌ Error fetching enrollments:', error);
      setEnrollments([]);
    }
  };

  const fetchTransactions = async () => {
    try {
      console.log('💰 Fetching transactions from API...');
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/payments/transaction', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('💳 Transactions API response:', data);

        // Handle different response formats
        let transactionsArray = [];
        if (Array.isArray(data)) {
          transactionsArray = data;
        } else if (data.transactions && Array.isArray(data.transactions)) {
          transactionsArray = data.transactions;
        } else if (data.data && Array.isArray(data.data)) {
          transactionsArray = data.data;
        }

        console.log('✅ Transactions fetched successfully:', transactionsArray.length);
        setTransactions(transactionsArray);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to fetch transactions:', response.status, errorData);

        // Check localStorage for payment data
        const lastPayment = localStorage.getItem('lastPayment');
        const pendingPayment = localStorage.getItem('pendingPayment');
        const localTransactions = [];

        if (lastPayment) {
          try {
            const payment = JSON.parse(lastPayment);
            localTransactions.push({
              id: payment.paymentId || 'local_payment',
              transaction_id: payment.paymentId || 'LOCAL001',
              student_name: payment.student_name || 'Student',
              course_name: payment.course?.title || 'Course',
              amount: payment.course?.price || payment.amount || 0,
              amount_paid: payment.course?.price || payment.amount || 0,
              date: new Date(payment.timestamp || Date.now()).toLocaleDateString(),
              enrollment_date: new Date(payment.timestamp || Date.now()).toISOString(),
              payment_status: 'completed',
              status: 'paid',
              payment_method: 'razorpay',
              payment_id: payment.paymentId || 'local'
            });
            console.log('📦 Found payment data in localStorage (lastPayment)');
          } catch (e) {
            console.warn('Failed to parse lastPayment:', e);
          }
        }

        setTransactions(localTransactions);
      }
    } catch (error) {
      console.error('❌ Error fetching transactions:', error);
      setTransactions([]);
    }
  };

  const handleViewInstructor = (instructor) => {
    setSelectedInstructor(instructor);
    setShowViewModal(true);
  };

  const handleEditInstructor = (instructor) => {
    setSelectedInstructor(instructor);
    setEditInstructor({
      name: instructor.name || '',
      email: instructor.email || '',
      specialization: instructor.specialization || '',
      experience: instructor.experience || '',
      bio: instructor.bio || ''
    });
    setShowEditModal(true);
  };

  const handleAddInstructor = async (e) => {
    e.preventDefault();

    if (!newInstructor.name.trim() || !newInstructor.email.trim() || !newInstructor.password.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    if (newInstructor.password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/users/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newInstructor.name,
          email: newInstructor.email,
          password: newInstructor.password,
          role: 'instructor',
          specialization: newInstructor.specialization,
          experience: newInstructor.experience,
          bio: newInstructor.bio
        })
      });

      if (response.ok) {
        await fetchInstructors();
        setShowAddModal(false);
        setNewInstructor({
          name: '',
          email: '',
          password: '',
          specialization: '',
          experience: '',
          bio: ''
        });
        alert('Instructor created successfully!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Create instructor failed:', response.status, errorData);
        alert(errorData.detail || errorData.message || 'Failed to create instructor.');
      }
    } catch (error) {
      console.error('Error creating instructor:', error);
      alert('Network error. Please check your connection.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateInstructor = async (e) => {
    e.preventDefault();

    if (!editInstructor.name.trim() || !editInstructor.email.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/users/${selectedInstructor.id || selectedInstructor._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editInstructor.name,
          email: editInstructor.email,
          specialization: editInstructor.specialization,
          experience: editInstructor.experience,
          bio: editInstructor.bio
        })
      });

      if (response.ok) {
        await fetchInstructors();
        setShowEditModal(false);
        alert('Instructor updated successfully!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Update instructor failed:', response.status, errorData);
        alert(errorData.detail || errorData.message || 'Failed to update instructor.');
      }
    } catch (error) {
      console.error('Error updating instructor:', error);
      alert('Network error. Please check your connection.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteInstructor = async (instructorId, instructorName) => {
    if (!window.confirm(`Are you sure you want to delete instructor "${instructorName}"?`)) {
      return;
    }

    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/users/${instructorId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await fetchInstructors();
        alert('Instructor deleted successfully!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Delete instructor failed:', response.status, errorData);
        alert(errorData.detail || errorData.message || 'Failed to delete instructor.');
      }
    } catch (error) {
      console.error('Error deleting instructor:', error);
      alert('Network error. Please check your connection.');
    } finally {
      setActionLoading(false);
    }
  };

  const calculateStats = () => {
    console.log('🧮 Calculating stats with:');
    console.log('  📚 Courses:', courses.length);
    console.log('  👨‍🏫 Instructors:', instructors.length);
    console.log('  🎓 Enrollments:', enrollments.length);
    console.log('  💰 Transactions:', transactions.length);

    // Use real course data from the API
    const totalCourses = courses.length;

    // Calculate instructor-specific course counts and student enrollments
    const instructorCourseCounts = instructors.map(instructor => {
      const instructorCourses = courses.filter(course =>
        course.instructor_id === instructor._id ||
        course.instructor_id === instructor.id ||
        course.instructor?.email === instructor.email ||
        course.instructor?.name === instructor.name ||
        course.instructor === instructor.name ||
        (course.instructor && typeof course.instructor === 'string' && course.instructor.toLowerCase().includes(instructor.name?.toLowerCase() || ''))
      );

      // Calculate enrolled students for this instructor's courses
      const instructorCourseIds = instructorCourses.map(course => course._id || course.id);
      const instructorEnrollments = enrollments.filter(enrollment =>
        instructorCourseIds.includes(enrollment.course_id) ||
        (enrollment.instructor && enrollment.instructor.toLowerCase() === instructor.name?.toLowerCase())
      );

      console.log(`👨‍🏫 ${instructor.name}: ${instructorCourses.length} courses, ${instructorEnrollments.length} students`);

      return {
        ...instructor,
        courses_count: instructorCourses.length,
        students_count: instructorEnrollments.length
      };
    });

    // Calculate totals from real data with better logic
    const uniqueStudents = new Set();
    enrollments.forEach(enrollment => {
      if (enrollment.student_id) {
        uniqueStudents.add(enrollment.student_id);
      } else if (enrollment.student_email) {
        uniqueStudents.add(enrollment.student_email);
      }
    });

    const totalStudents = uniqueStudents.size || enrollments.length; // Fallback to total enrollments if no unique IDs

    // Calculate REAL total earnings from actual transactions
    const totalEarnings = transactions.reduce((sum, transaction) => {
      const amount = parseFloat(transaction.amount_paid || transaction.amount || 0);
      // Only count completed/paid transactions
      if (transaction.status === 'paid' || transaction.payment_status === 'completed' || transaction.payment_status === 'captured') {
        return sum + amount;
      }
      return sum;
    }, 0);

    console.log('💰 Real total earnings calculated:', totalEarnings, 'from', transactions.length, 'transactions');

    const statsResult = {
      total: instructors.length,
      active: instructors.filter(i => i.status !== 'inactive' && i.status !== 'suspended').length,
      totalCourses,
      totalStudents,
      totalEarnings: totalEarnings > 100000 ? `₹${(totalEarnings / 100000).toFixed(1)}L` : `₹${totalEarnings.toLocaleString()}`,
      instructorCourseCounts
    };

    console.log('📊 Final stats:', statsResult);
    return statsResult;
  };

  const stats = calculateStats();

  // Debug logging
  console.log('📈 Stats calculated:', stats);
  console.log('👥 Total Students in stats:', stats.totalStudents);
  console.log('🔢 Enrollments data:', enrollments);
  console.log('💰 Transactions data:', transactions);
  console.log('💵 Total Earnings:', stats.totalEarnings);

  const filteredInstructors = (stats.instructorCourseCounts || instructors).filter(instructor =>
    instructor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    instructor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    instructor.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredInstructors.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentInstructors = filteredInstructors.slice(indexOfFirstItem, indexOfLastItem);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SuperAdminSidebar
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        activeMenuItem="Instructors"
        setActiveMenuItem={() => { }}
      />
      <div className={`flex-1 h-screen overflow-y-auto transition-all duration-300 ${sidebarOpen ? 'sm:ml-80 md:ml-72 lg:ml-72' : ''}`}>
        <div className="lg:hidden bg-white border-b p-4 flex items-center sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-gray-900 p-2">
            <FaBars className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold ml-4 bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent">Instructor Management</h1>
        </div>
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Instructor Management</h1>
            <p className="text-gray-600">Manage all platform instructors</p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <div className="text-red-600 mr-3">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-red-800">
                  <p className="font-medium">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100">Total Instructors</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <FaUserTie className="text-3xl text-orange-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100">Active Instructors</p>
                  <p className="text-2xl font-bold">{stats.active}</p>
                </div>
                <FaUsers className="text-3xl text-amber-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100">Total Courses</p>
                  <p className="text-2xl font-bold">{stats.totalCourses}</p>
                </div>
                <FaGraduationCap className="text-3xl text-purple-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100">Total Students</p>
                  <p className="text-2xl font-bold">{stats.totalStudents}</p>
                </div>
                <FaUsers className="text-3xl text-orange-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100">Total Earnings</p>
                  <p className="text-2xl font-bold">{stats.totalEarnings}</p>
                </div>
                <FaDollarSign className="text-3xl text-yellow-200" />
              </div>
            </div>
          </div>

          {/* Search and Add */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <input
                type="text"
                placeholder="Search instructors by name, email, or specialization..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <FaPlus /> Add Instructor
              </button>
            </div>
          </div>

          {/* Instructors Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Instructor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specialization</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Experience</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Courses</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Students</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                        Loading instructors...
                      </td>
                    </tr>
                  ) : filteredInstructors.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                        No instructors found
                      </td>
                    </tr>
                  ) : (
                    currentInstructors.map((instructor) => (
                      <tr key={instructor.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-orange-400 to-blue-500 flex items-center justify-center text-white font-medium">
                                {instructor.name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{instructor.name}</div>
                              <div className="text-sm text-gray-500">{instructor.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                            {instructor.specialization || 'General'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {instructor.experience || 'Not specified'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {instructor.courses_count || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {instructor.students_count || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                            Active
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              title="View Details"
                              onClick={() => handleViewInstructor(instructor)}
                              disabled={actionLoading}
                              className="text-amber-600 hover:text-amber-900 p-1 rounded transition-colors disabled:opacity-50"
                            >
                              <FaEye />
                            </button>
                            <button
                              title="Edit Instructor"
                              onClick={() => handleEditInstructor(instructor)}
                              disabled={actionLoading}
                              className="text-orange-600 hover:text-orange-900 p-1 rounded transition-colors disabled:opacity-50"
                            >
                              <FaEdit />
                            </button>
                            <button
                              title="Delete Instructor"
                              onClick={() => handleDeleteInstructor(instructor.id || instructor._id, instructor.name)}
                              disabled={actionLoading}
                              className="text-red-600 hover:text-red-900 p-1 rounded transition-colors disabled:opacity-50"
                            >
                              <FaTrash />
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
            {filteredInstructors.length > 0 && (
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-600">
                    Showing <span className="font-semibold text-orange-700">{indexOfFirstItem + 1}</span> to{' '}
                    <span className="font-semibold text-orange-700">{Math.min(indexOfLastItem, filteredInstructors.length)}</span> of{' '}
                    <span className="font-semibold text-orange-700">{filteredInstructors.length}</span> instructors
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={prevPage}
                      disabled={currentPage === 1}
                      className="px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
                    >
                      Previous
                    </button>
                    <div className="flex gap-1">
                      {[...Array(totalPages)].map((_, index) => {
                        const pageNumber = index + 1;
                        // Show first page, last page, current page, and pages around current
                        if (
                          pageNumber === 1 ||
                          pageNumber === totalPages ||
                          (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                        ) {
                          return (
                            <button
                              key={pageNumber}
                              onClick={() => paginate(pageNumber)}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${currentPage === pageNumber
                                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                                : 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-700'
                                }`}
                            >
                              {pageNumber}
                            </button>
                          );
                        } else if (
                          pageNumber === currentPage - 2 ||
                          pageNumber === currentPage + 2
                        ) {
                          return (
                            <span key={pageNumber} className="px-2 py-2 text-gray-400">
                              ...
                            </span>
                          );
                        }
                        return null;
                      })}
                    </div>
                    <button
                      onClick={nextPage}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Add Instructor Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Add New Instructor</h2>
                <form onSubmit={handleAddInstructor}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                    <input
                      type="text"
                      value={newInstructor.name}
                      onChange={(e) => setNewInstructor({ ...newInstructor, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input
                      type="email"
                      value={newInstructor.email}
                      onChange={(e) => setNewInstructor({ ...newInstructor, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                    <input
                      type="password"
                      value={newInstructor.password}
                      onChange={(e) => setNewInstructor({ ...newInstructor, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
                    <input
                      type="text"
                      value={newInstructor.specialization}
                      onChange={(e) => setNewInstructor({ ...newInstructor, specialization: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
                      placeholder="e.g., Web Development, Data Science"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Experience</label>
                    <input
                      type="text"
                      value={newInstructor.experience}
                      onChange={(e) => setNewInstructor({ ...newInstructor, experience: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
                      placeholder="e.g., 5 years"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                    <textarea
                      value={newInstructor.bio}
                      onChange={(e) => setNewInstructor({ ...newInstructor, bio: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
                      rows={3}
                      placeholder="Brief instructor bio..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50"
                    >
                      {actionLoading ? 'Creating...' : 'Add Instructor'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* View Instructor Modal */}
          {showViewModal && selectedInstructor && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Instructor Details</h2>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center mb-4">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-r from-orange-400 to-blue-500 flex items-center justify-center text-white font-bold text-xl mr-4">
                      {selectedInstructor.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{selectedInstructor.name}</h3>
                      <p className="text-gray-600">{selectedInstructor.email}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedInstructor.role || 'instructor'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Specialization</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedInstructor.specialization || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Experience</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedInstructor.experience || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${selectedInstructor.status === 'active' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
                      }`}>
                      {selectedInstructor.status || 'Active'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Courses</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedInstructor.courses_count || 0} courses</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Students</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedInstructor.students_count || 0} students</p>
                  </div>
                  {selectedInstructor.bio && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Bio</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedInstructor.bio}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Joined</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedInstructor.created_at ? new Date(selectedInstructor.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Edit Instructor Modal */}
          {showEditModal && selectedInstructor && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Edit Instructor</h2>
                <form onSubmit={handleUpdateInstructor}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                    <input
                      type="text"
                      value={editInstructor.name}
                      onChange={(e) => setEditInstructor({ ...editInstructor, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input
                      type="email"
                      value={editInstructor.email}
                      onChange={(e) => setEditInstructor({ ...editInstructor, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
                    <input
                      type="text"
                      value={editInstructor.specialization}
                      onChange={(e) => setEditInstructor({ ...editInstructor, specialization: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
                      placeholder="e.g., Web Development, Data Science"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Experience</label>
                    <input
                      type="text"
                      value={editInstructor.experience}
                      onChange={(e) => setEditInstructor({ ...editInstructor, experience: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
                      placeholder="e.g., 5 years"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                    <textarea
                      value={editInstructor.bio}
                      onChange={(e) => setEditInstructor({ ...editInstructor, bio: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
                      rows={3}
                      placeholder="Brief instructor bio..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50"
                    >
                      {actionLoading ? 'Updating...' : 'Update Instructor'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstructorsPage;