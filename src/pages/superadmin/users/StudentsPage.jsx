import React, { useState, useEffect } from 'react';
import { FaUserGraduate, FaPlus, FaEdit, FaTrash, FaEye, FaBook, FaCertificate, FaChartLine, FaTimes, FaBars } from 'react-icons/fa';
import { fetchStudents, createStudent, updateStudent, deleteStudent, getStudentById, getStudentStats } from '../../../api/studentsApi';
import { fetchEnrollments } from '../../../api/coursesApi';
import { setupAuth, isAuthenticated } from '../../../utils/authSetup';
import SuperAdminSidebar from '../SuperAdminSidebar';
import { useNavigate } from 'react-router-dom';

const StudentsPage = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    courseCompletions: 0,
    certificatesIssued: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'active'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    // Force clear old tokens and setup fresh authentication
    console.log('🔧 Setting up fresh authentication for Students Page...');
    
    // Clear any old tokens that might be causing issues
    const keysToRemove = ['token', 'adminToken', 'authToken', 'instructorToken', 'studentToken'];
    keysToRemove.forEach(key => {
      const oldToken = localStorage.getItem(key);
      if (oldToken && !oldToken.includes('eyJ')) { // If it's not a JWT format
        localStorage.removeItem(key);
        console.log(`🗑️ Removed old token: ${key}`);
      }
    });
    
    // Setup authentication only if no user is logged in
    // This will preserve existing user sessions and not overwrite them with super admin
    setupAuth();
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [studentsResponse, enrollmentsData, statsData] = await Promise.all([
        fetchStudents(),
        fetchEnrollments().catch(() => []),
        getStudentStats().catch(() => null)
      ]);
      
      console.log('📊 Students API Response:', studentsResponse);
      console.log('📚 Enrollments API Response:', enrollmentsData);
      
      // Handle the API response structure {success, message, users}
      const studentsData = Array.isArray(studentsResponse) 
        ? studentsResponse 
        : (studentsResponse?.users || studentsResponse?.data || []);
      
      console.log('📊 Processed Students Data:', studentsData);
      
      // Debug: Show sample student IDs
      if (studentsData.length > 0) {
        console.log('🔍 Sample student ID formats:', studentsData.slice(0, 2).map(s => ({
          id: s.id,
          _id: s._id,
          name: s.name
        })));
      }
      
      // Debug: Show sample enrollment student IDs
      if (Array.isArray(enrollmentsData) && enrollmentsData.length > 0) {
        console.log('🔍 Sample enrollment student_id formats:', enrollmentsData.slice(0, 2).map(e => ({
          student_id: e.student_id,
          student_name: e.student_name,
          course_title: e.course_title
        })));
      }
      
      // Create enrollment map for each student (by ID and email)
      const enrollmentsByStudent = {};
      const enrollmentsByEmail = {};
      const progressByStudent = {};
      
      if (Array.isArray(enrollmentsData)) {
        console.log(`📦 Processing ${enrollmentsData.length} enrollments...`);
        
        enrollmentsData.forEach((enrollment, index) => {
          // Handle MongoDB ObjectId format {$oid: "..."} or plain string
          let studentId = enrollment.student_id || enrollment.user_id;
          if (studentId && typeof studentId === 'object' && studentId.$oid) {
            studentId = studentId.$oid;
          }
          studentId = String(studentId || '');
          
          // Map by student ID
          if (studentId) {
            if (!enrollmentsByStudent[studentId]) {
              enrollmentsByStudent[studentId] = [];
            }
            enrollmentsByStudent[studentId].push(enrollment);
          }
          
          // Also map by email for fallback matching
          const studentEmail = (enrollment.student_email || '').toLowerCase();
          if (studentEmail) {
            if (!enrollmentsByEmail[studentEmail]) {
              enrollmentsByEmail[studentEmail] = [];
            }
            enrollmentsByEmail[studentEmail].push(enrollment);
          }
          
          // Calculate average progress
          if (enrollment.progress !== undefined && enrollment.progress !== null) {
            if (!progressByStudent[studentId]) {
              progressByStudent[studentId] = { total: 0, count: 0 };
            }
            progressByStudent[studentId].total += Number(enrollment.progress || 0);
            progressByStudent[studentId].count += 1;
          }
        });
      }
      
      console.log('📈 Enrollments by Student ID:', Object.keys(enrollmentsByStudent).length, 'students');
      console.log('📧 Enrollments by Email:', Object.keys(enrollmentsByEmail).length, 'emails');
      console.log('📊 Progress by Student:', Object.keys(progressByStudent).length, 'students');
      
      // Normalize student data with actual enrollment data
      const normalizedStudents = studentsData.map(student => {
        // Try to match using multiple ID variations
        let studentId = student.id || student._id || student.user_id;
        if (studentId && typeof studentId === 'object' && studentId.$oid) {
          studentId = studentId.$oid;
        }
        studentId = String(studentId || '');
        
        // Try to find enrollments by ID first
        let studentEnrollments = enrollmentsByStudent[studentId] || [];
        
        // If no enrollments found by ID, try matching by email
        if (studentEnrollments.length === 0 && student.email) {
          const studentEmail = student.email.toLowerCase();
          studentEnrollments = enrollmentsByEmail[studentEmail] || [];
        }
        
        console.log(`🔍 Student: ${student.name} (ID: ${studentId}, Email: ${student.email})`);
        console.log(`   📚 Enrollments found: ${studentEnrollments.length}`);
        if (studentEnrollments.length > 0) {
          console.log(`   📖 Courses:`, studentEnrollments.map(e => e.course_title || e.course_name).join(', '));
        }
        
        const studentProgressData = progressByStudent[studentId];
        
        // Calculate average progress from enrollments
        const avgProgress = studentProgressData 
          ? Math.round(studentProgressData.total / studentProgressData.count)
          : (student.progress || student.course_progress || 0);
        
        // Count completed courses (where progress >= 100 or status is completed)
        const completedCourses = studentEnrollments.filter(e => 
          (e.progress >= 100) || (e.status === 'completed')
        ).length;
        
        return {
          ...student,
          // Use actual enrollment count from enrollments collection
          enrolled_courses: studentEnrollments.length,
          // Use calculated average progress
          progress: avgProgress,
          // Count of completed courses
          completed_courses: completedCourses,
          // Ensure last_login is properly formatted
          last_login: student.last_login || student.last_activity || student.updated_at || null,
          // Ensure status is lowercase
          status: (student.status || 'active').toLowerCase()
        };
      });
      
      console.log('✅ Normalized Students with Enrollments:', normalizedStudents);
      
      setStudents(normalizedStudents);
      
      // Calculate dynamic stats from actual student data
      const totalStudents = normalizedStudents?.length || 0;
      const activeStudents = normalizedStudents?.filter(s => s.status === 'active').length || 0;
      const courseCompletions = normalizedStudents?.reduce((total, student) => {
        return total + (student.completed_courses || 0);
      }, 0) || 0;
      const certificatesIssued = normalizedStudents?.reduce((total, student) => {
        return total + (student.certificates || 0);
      }, 0) || 0;
      
      // Use API stats if available, otherwise use calculated stats
      setStats(statsData || {
        totalStudents,
        activeStudents,
        courseCompletions,
        certificatesIssued
      });
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load students data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      setError('');
      await createStudent(formData);
      setSuccess('Student added successfully!');
      setShowAddModal(false);
      setFormData({ name: '', email: '', phone: '', status: 'active' });
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to add student: ' + error.message);
    }
  };

  const handleEditStudent = async (e) => {
    e.preventDefault();
    try {
      setError('');
      await updateStudent(selectedStudent.id, formData);
      setSuccess('Student updated successfully!');
      setShowEditModal(false);
      setSelectedStudent(null);
      setFormData({ name: '', email: '', phone: '', status: 'active' });
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to update student: ' + error.message);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        setError('');
        await deleteStudent(studentId);
        setSuccess('Student deleted successfully!');
        loadData();
        setTimeout(() => setSuccess(''), 3000);
      } catch (error) {
        setError('Failed to delete student: ' + error.message);
      }
    }
  };

  const handleViewStudent = async (student) => {
    try {
      const studentDetails = await getStudentById(student.id);
      setSelectedStudent(studentDetails);
      setShowViewModal(true);
    } catch (error) {
      setSelectedStudent(student);
      setShowViewModal(true);
    }
  };

  const openEditModal = (student) => {
    setSelectedStudent(student);
    setFormData({
      name: student.name || '',
      email: student.email || '',
      phone: student.phone || '',
      status: student.status || 'active'
    });
    setShowEditModal(true);
  };

  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowViewModal(false);
    setSelectedStudent(null);
    setFormData({ name: '', email: '', phone: '', status: 'active' });
    setError('');
  };

  const filteredStudents = Array.isArray(students) ? students.filter(student => 
    student.role === 'student' && (
      student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  ) : [];

  // Pagination calculations
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentStudents = filteredStudents.slice(indexOfFirstItem, indexOfLastItem);

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
        activeMenuItem="Students"
        setActiveMenuItem={() => {}}
      />
      <div className={`flex-1 h-screen overflow-y-auto transition-all duration-300 ${sidebarOpen ? 'sm:ml-80 md:ml-72 lg:ml-72' : ''}`}>
        <div className="lg:hidden bg-white border-b p-4 flex items-center sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-gray-900 p-2">
            <FaBars className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold ml-4 bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent">Student Management</h1>
        </div>
        <div className="p-6">
          {/* Success/Error Messages */}
          {success && (
            <div className="mb-4 p-4 bg-orange-100 border border-orange-400 text-orange-700 rounded-lg">
              {success}
            </div>
          )}
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Student Management</h1>
            <p className="text-gray-600">Manage all enrolled students</p>
          </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100">Total Students</p>
              <p className="text-2xl font-bold">
                {loading ? (
                  <span className="inline-block w-8 h-6 bg-purple-300 rounded animate-pulse"></span>
                ) : (
                  stats.totalStudents
                )}
              </p>
            </div>
            <FaUserGraduate className="text-3xl text-purple-200" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100">Active Students</p>
              <p className="text-2xl font-bold">
                {loading ? (
                  <span className="inline-block w-8 h-6 bg-amber-300 rounded animate-pulse"></span>
                ) : (
                  stats.activeStudents
                )}
              </p>
            </div>
            <FaChartLine className="text-3xl text-amber-200" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100">Course Completions</p>
              <p className="text-2xl font-bold">
                {loading ? (
                  <span className="inline-block w-8 h-6 bg-orange-300 rounded animate-pulse"></span>
                ) : (
                  stats.courseCompletions
                )}
              </p>
            </div>
            <FaBook className="text-3xl text-orange-200" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100">Certificates Issued</p>
              <p className="text-2xl font-bold">
                {loading ? (
                  <span className="inline-block w-8 h-6 bg-yellow-300 rounded animate-pulse"></span>
                ) : (
                  stats.certificatesIssued
                )}
              </p>
            </div>
            <FaCertificate className="text-3xl text-yellow-200" />
          </div>
        </div>
      </div>

      {/* Search and Add */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <input
            type="text"
            placeholder="Search students by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <FaPlus /> Add Student
          </button>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrolled Courses</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    Loading students...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No students found
                  </td>
                </tr>
              ) : (
                currentStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center text-white font-medium">
                            {student.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{student.name}</div>
                          <div className="text-sm text-gray-500">{student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {typeof student.enrolled_courses === 'number' ? student.enrolled_courses : 0} courses
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full" 
                            style={{width: `${student.progress || 0}%`}}
                          ></div>
                        </div>
                        <span className="ml-2 text-sm text-gray-500">{student.progress || 0}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.last_login ? new Date(student.last_login).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        student.status === 'active' 
                          ? 'bg-orange-100 text-orange-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {student.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleViewStudent(student)}
                          className="text-amber-600 hover:text-amber-900 p-1 rounded transition-colors"
                          title="View Details"
                        >
                          <FaEye />
                        </button>
                        <button 
                          onClick={() => openEditModal(student)}
                          className="text-orange-600 hover:text-orange-900 p-1 rounded transition-colors"
                          title="Edit Student"
                        >
                          <FaEdit />
                        </button>
                        <button 
                          onClick={() => handleDeleteStudent(student.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                          title="Delete Student"
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
        {filteredStudents.length > 0 && (
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-600">
                Showing <span className="font-semibold text-purple-700">{indexOfFirstItem + 1}</span> to{' '}
                <span className="font-semibold text-purple-700">{Math.min(indexOfLastItem, filteredStudents.length)}</span> of{' '}
                <span className="font-semibold text-purple-700">{filteredStudents.length}</span> students
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
                    if (
                      pageNumber === 1 ||
                      pageNumber === totalPages ||
                      (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => paginate(pageNumber)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            currentPage === pageNumber
                              ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
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

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add New Student</h3>
              <button onClick={closeModals} className="text-gray-500 hover:text-gray-700">
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleAddStudent}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModals}
                  className="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
                >
                  Add Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Edit Student</h3>
              <button onClick={closeModals} className="text-gray-500 hover:text-gray-700">
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleEditStudent}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModals}
                  className="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
                >
                  Update Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Student Modal */}
      {showViewModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Student Details</h3>
              <button onClick={closeModals} className="text-gray-500 hover:text-gray-700">
                <FaTimes />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold text-xl">
                  {selectedStudent.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="text-gray-900">{selectedStudent.name || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="text-gray-900">{selectedStudent.email || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <p className="text-gray-900">{selectedStudent.phone || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  selectedStudent.status === 'active' 
                    ? 'bg-orange-100 text-orange-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {selectedStudent.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Enrolled Courses</label>
                <p className="text-gray-900">{typeof selectedStudent.enrolled_courses === 'number' ? selectedStudent.enrolled_courses : 0} courses</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Progress</label>
                <div className="flex items-center">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full" 
                      style={{width: `${selectedStudent.progress || 0}%`}}
                    ></div>
                  </div>
                  <span className="ml-2 text-sm text-gray-500">{selectedStudent.progress || 0}%</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Login</label>
                <p className="text-gray-900">
                  {selectedStudent.last_login ? new Date(selectedStudent.last_login).toLocaleDateString() : 'Never'}
                </p>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={closeModals}
                className="px-4 py-2 bg-gray-200 text-gray-600 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default StudentsPage;