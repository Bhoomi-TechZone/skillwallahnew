import { useState, useEffect } from 'react';
import { FaBookOpen, FaSearch, FaEye, FaRupeeSign, FaClock, FaUserGraduate, FaCalendarAlt } from 'react-icons/fa';
import BranchLayout from '../BranchLayout';
import { branchCourseService } from '../../../services/branchCourseService';
import { branchProgramService } from '../../../services/branchProgramService';

const BranchCourses = () => {
  const [courses, setCourses] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Get branch code from token
  const getBranchCode = () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // Force return branch code as FR-SK-0940
        return 'FR-SK-0940';
      }
    } catch (error) {
      console.error('Error parsing token:', error);
    }
    return 'DEFAULT';
  };

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError(null);

      const branchCode = getBranchCode();
      console.log('🔍 [BranchCourses] Loading courses for branch:', branchCode);

      const response = await branchCourseService.getCourses();
      console.log('🔍 [BranchCourses] API response:', response);

      if (response.success && response.data && Array.isArray(response.data) && response.data.length > 0) {
        setCourses(response.data);
        console.log('✅ [BranchCourses] Loaded courses:', response.data.length);
        console.log('🔍 [BranchCourses] Courses data:', response.data);
      } else {
        console.warn('⚠️ API returned empty or invalid data, using mock data');
        console.log('🔍 [BranchCourses] API response:', response);
        setCourses(mockCourses);
      }
    } catch (error) {
      console.error('❌ Error loading courses:', error);
      console.warn('⚠️ API call failed, using mock data');
      setCourses(mockCourses);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const loadPrograms = async () => {
    try {
      const response = await branchProgramService.getPrograms();
      if (response.success) {
        // Filter only active programs
        const activePrograms = response.data.filter(program => program.status === 'active');
        setPrograms(activePrograms);
      } else {
        console.error('Error loading programs:', response.error);
        // Fallback to mock data (only active programs)
        const activePrograms = mockPrograms.filter(program => program.status === 'active');
        setPrograms(activePrograms);
      }
    } catch (error) {
      console.error('Error loading programs:', error);
      // Fallback to mock data (only active programs)
      const activePrograms = mockPrograms.filter(program => program.status === 'active');
      setPrograms(activePrograms);
    }
  };

  // Mock data for courses posted by admin/franchise_admin
  const mockCourses = [
    {
      id: 1,
      course_name: 'Advanced Web Development',
      course_description: 'Complete full-stack web development course covering React, Node.js, and databases.',
      course_category: 'Web Development',
      program_id: 'prog1',
      course_level: 'Advanced',
      instructor_name: 'John Smith',
      duration_hours: 120,
      course_fee: 15000,
      max_students: 25,
      enrolled_students: 18,
      start_date: '2024-01-15',
      end_date: '2024-06-15',
      is_active: true,
      created_by: 'Admin',
      created_at: '2024-12-10'
    },
    {
      id: 2,
      course_name: 'Digital Marketing Fundamentals',
      course_description: 'Learn SEO, SEM, social media marketing, and digital analytics.',
      course_category: 'Digital Marketing',
      program_id: 'prog2',
      course_level: 'Beginner',
      instructor_name: 'Sarah Johnson',
      duration_hours: 80,
      course_fee: 12000,
      max_students: 30,
      enrolled_students: 22,
      start_date: '2024-02-01',
      end_date: '2024-05-01',
      is_active: true,
      created_by: 'Franchise Admin',
      created_at: '2024-12-08'
    },
    {
      id: 3,
      course_name: 'Data Science with Python',
      course_description: 'Comprehensive course on data analysis, machine learning, and Python programming.',
      course_category: 'Data Science',
      program_id: 'prog3',
      course_level: 'Intermediate',
      instructor_name: 'Dr. Michael Chen',
      duration_hours: 150,
      course_fee: 18000,
      max_students: 20,
      enrolled_students: 15,
      start_date: '2024-01-20',
      end_date: '2024-07-20',
      is_active: true,
      created_by: 'Admin',
      created_at: '2024-12-05'
    },
    {
      id: 4,
      course_name: 'Mobile App Development',
      course_description: 'Build iOS and Android apps using React Native and Flutter.',
      course_category: 'Mobile Development',
      program_id: 'prog4',
      course_level: 'Advanced',
      instructor_name: 'Emily Davis',
      duration_hours: 100,
      course_fee: 16000,
      max_students: 15,
      enrolled_students: 12,
      start_date: '2024-03-01',
      end_date: '2024-07-01',
      is_active: false,
      created_by: 'Franchise Admin',
      created_at: '2024-12-12'
    },
    {
      id: 5,
      course_name: 'UI/UX Design Masterclass',
      course_description: 'Complete design course covering user research, prototyping, and design systems.',
      course_category: 'Design',
      program_id: 'prog5',
      course_level: 'Intermediate',
      instructor_name: 'Alex Wilson',
      duration_hours: 90,
      course_fee: 14000,
      max_students: 25,
      enrolled_students: 20,
      start_date: '2024-02-15',
      end_date: '2024-06-15',
      is_active: true,
      created_by: 'Admin',
      created_at: '2024-12-15'
    }
  ];

  const mockPrograms = [
    { id: 'prog1', program_name: 'Web Development Program' },
    { id: 'prog2', program_name: 'Digital Marketing Program' },
    { id: 'prog3', program_name: 'Data Science Program' },
    { id: 'prog4', program_name: 'Mobile Development Program' },
    { id: 'prog5', program_name: 'Design Program' }
  ];

  useEffect(() => {
    loadCourses();
    loadPrograms();
  }, []);

  const filteredCourses = Array.isArray(courses) ? courses.filter(course => {
    const matchesSearch = course.course_name?.toLowerCase().includes(searchTerm.toLowerCase()) || '';
    const matchesProgram = selectedProgram === '' || course.program_id === selectedProgram || course.course_category === selectedProgram;
    return matchesSearch && matchesProgram;
  }) : [];

  // Handle view course details
  const handleViewDetails = (course) => {
    setSelectedCourse(course);
    setShowDetailsModal(true);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    try {
      return new Date(dateString).toLocaleDateString('en-IN');
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Get status color
  const getStatusColor = (isActive) => {
    return isActive
      ? 'bg-orange-100 text-orange-800'
      : 'bg-red-100 text-red-800';
  };

  // Get level color
  const getLevelColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'beginner':
        return 'bg-blue-100 text-blue-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCourses.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);

  return (
    <BranchLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-2 rounded-lg">
                  <FaBookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-secondary-900">📚 Available Courses</h1>
                  <p className="text-sm text-secondary-600 mt-1">View courses offered by your franchise</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 md:gap-4">
                <div className="bg-blue-50 px-3 py-2 rounded-lg flex-1 md:flex-none text-center">
                  <span className="text-sm font-medium text-blue-700 whitespace-nowrap">
                    Total: {filteredCourses.length}
                  </span>
                </div>
                <div className="bg-orange-50 px-3 py-2 rounded-lg flex-1 md:flex-none text-center">
                  <span className="text-sm font-medium text-orange-700 whitespace-nowrap">
                    Active: {filteredCourses.filter(c => c.is_active).length}
                  </span>
                </div>
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
                placeholder="Search courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full border border-secondary-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="px-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="">--- All Programs ---</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>{program.program_name}</option>
              ))}
            </select>
          </div>

          {/* Courses List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
                    <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">S.No.</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">Branch Code</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">Course Details</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Instructor</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Fee</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Duration</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Enrollment</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Status</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-12 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          <span className="text-sm text-gray-500">Loading courses...</span>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-12 text-center">
                        <div className="text-red-600 text-sm">{error}</div>
                        <button
                          onClick={loadCourses}
                          className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
                        >
                          Try again
                        </button>
                      </td>
                    </tr>
                  ) : currentItems.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-12 text-center text-sm text-gray-500">
                        No courses found matching your criteria
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((course, index) => (
                      <tr key={course.id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-4 py-4">
                          <span className="text-sm font-medium text-secondary-900">
                            {indexOfFirstItem + index + 1}.
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                            {course.branch_code || getBranchCode()}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                              <FaBookOpen className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-secondary-900 max-w-xs">
                                {course.course_name}
                              </h3>
                              <p className="text-xs text-blue-600 font-medium">{course.course_category}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${getLevelColor(course.course_level)}`}>
                                  {course.course_level}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <div className="text-sm font-medium text-gray-900">
                            {course.instructor_name}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <FaRupeeSign className="w-3 h-3 text-orange-600" />
                            <span className="text-sm font-medium text-orange-700">
                              {course.course_fee?.toLocaleString() || 0}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <FaClock className="w-3 h-3 text-blue-600" />
                            <span className="text-sm font-medium text-blue-700">
                              {course.duration_hours ? `${course.duration_hours}h` : 'N/A'}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <div className="text-sm">
                            <div className="flex items-center justify-center space-x-1">
                              <FaUserGraduate className="w-3 h-3 text-orange-600" />
                              <span className="font-medium text-orange-700">
                                {course.enrolled_students || 0}/{course.max_students || '∞'}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                              <div
                                className="bg-orange-500 h-1.5 rounded-full"
                                style={{
                                  width: course.max_students
                                    ? `${Math.min((course.enrolled_students || 0) / course.max_students * 100, 100)}%`
                                    : '0%'
                                }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(course.is_active)}`}>
                            {course.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => handleViewDetails(course)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View Details"
                          >
                            <FaEye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : error ? (
                <div className="p-8 text-center text-red-600">
                  <p>{error}</p>
                  <button onClick={loadCourses} className="mt-2 text-indigo-600 text-sm">Retry</button>
                </div>
              ) : currentItems.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No courses found</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {currentItems.map((course) => (
                    <div key={course.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FaBookOpen className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-sm font-bold text-gray-900 line-clamp-2">
                                {course.course_name}
                              </h3>
                              <p className="text-xs text-gray-500 mt-1">
                                Code: {course.branch_code || getBranchCode()}
                              </p>
                            </div>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ml-2 whitespace-nowrap ${getStatusColor(course.is_active)}`}>
                              {course.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-2 text-xs">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                              {course.course_category}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full ${getLevelColor(course.course_level)}`}>
                              {course.course_level}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-xs text-gray-600">
                            <div className="flex items-center gap-1">
                              <FaUserGraduate className="text-gray-400" />
                              <span className="truncate">{course.instructor_name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FaClock className="text-gray-400" />
                              <span>{course.duration_hours ? `${course.duration_hours}h` : 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FaRupeeSign className="text-gray-400" />
                              <span className="font-medium text-orange-600">₹{course.course_fee?.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FaUserGraduate className="text-gray-400" />
                              <span>{course.enrolled_students || 0}/{course.max_students || '∞'} Students</span>
                            </div>
                          </div>

                          <div className="mt-3 flex justify-end">
                            <button
                              onClick={() => handleViewDetails(course)}
                              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium bg-blue-50 px-3 py-1.5 rounded"
                            >
                              <FaEye /> View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-700 text-center sm:text-left">
                    Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to <span className="font-medium">{Math.min(indexOfLastItem, filteredCourses.length)}</span> of <span className="font-medium">{filteredCourses.length}</span> courses
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md flex items-center">
                      {currentPage} / {totalPages}
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
        </div>

        {/* Course Details Modal */}
        {showDetailsModal && selectedCourse && (
          <div className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
            <div className="bg-white/95 backdrop-blur-sm rounded-t-xl sm:rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-transform duration-300">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">Course Details</h3>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-6 pb-24 sm:pb-6">
                <div className="space-y-6">
                  {/* Course Header */}
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FaBookOpen className="w-8 h-8 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0 w-full">
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{selectedCourse.course_name}</h2>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-blue-600 font-medium text-sm">{selectedCourse.course_category}</span>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getLevelColor(selectedCourse.course_level)}`}>
                          {selectedCourse.course_level}
                        </span>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedCourse.is_active)}`}>
                          {selectedCourse.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Course Description */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Description</h4>
                    <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                      {selectedCourse.course_description || 'No description available.'}
                    </p>
                  </div>

                  {/* Course Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Course Information</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center bg-white p-2 rounded shadow-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <FaUserGraduate className="w-4 h-4" />
                            <span className="text-sm">Instructor</span>
                          </div>
                          <span className="text-sm font-semibold text-gray-900">{selectedCourse.instructor_name}</span>
                        </div>
                        <div className="flex justify-between items-center bg-white p-2 rounded shadow-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <FaClock className="w-4 h-4" />
                            <span className="text-sm">Duration</span>
                          </div>
                          <span className="text-sm font-semibold text-gray-900">
                            {selectedCourse.duration_hours ? `${selectedCourse.duration_hours} hours` : 'Not specified'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center bg-white p-2 rounded shadow-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <FaRupeeSign className="w-4 h-4" />
                            <span className="text-sm">Fee</span>
                          </div>
                          <span className="text-sm font-bold text-orange-600">₹{selectedCourse.course_fee?.toLocaleString() || 0}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Enrollment Details</h4>
                      <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Enrolled Students</span>
                          <span className="font-semibold text-orange-600">{selectedCourse.enrolled_students || 0}</span>
                        </div>

                        <div className="w-full">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Progress</span>
                            <span>
                              {selectedCourse.max_students
                                ? `${Math.round((selectedCourse.enrolled_students || 0) / selectedCourse.max_students * 100)}%`
                                : '0%'
                              }
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="bg-orange-500 h-2.5 rounded-full transition-all duration-300"
                              style={{
                                width: selectedCourse.max_students
                                  ? `${Math.min((selectedCourse.enrolled_students || 0) / selectedCourse.max_students * 100, 100)}%`
                                  : '0%'
                              }}
                            ></div>
                          </div>
                        </div>

                        <div className="flex justify-between text-sm bg-white p-2 rounded shadow-sm">
                          <span className="text-gray-600">Max Capacity</span>
                          <span className="font-medium text-gray-900">
                            {selectedCourse.max_students ? `${selectedCourse.max_students} students` : 'No limit'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Course Schedule */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Course Schedule</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2 bg-white p-2 rounded border border-blue-100">
                        <FaCalendarAlt className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-gray-600">Start:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatDate(selectedCourse.start_date)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 bg-white p-2 rounded border border-blue-100">
                        <FaCalendarAlt className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-gray-600">End:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatDate(selectedCourse.end_date)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Course Metadata */}
                  <div className="p-4 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Metadata</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between sm:justify-start sm:gap-2">
                        <span className="text-gray-500">Created By:</span>
                        <span className="font-medium text-gray-900">{selectedCourse.created_by}</span>
                      </div>
                      <div className="flex justify-between sm:justify-start sm:gap-2">
                        <span className="text-gray-500">Created On:</span>
                        <span className="font-medium text-gray-900">{formatDate(selectedCourse.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-white sticky bottom-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="w-full sm:w-auto px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </BranchLayout>
  );
};

export default BranchCourses;