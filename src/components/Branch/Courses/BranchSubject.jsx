import { useState, useEffect } from 'react';
import { FaClipboard, FaSearch, FaEye, FaBookOpen, FaGraduationCap, FaStar, FaClock, FaTrash } from 'react-icons/fa';
import BranchLayout from '../BranchLayout';
import { branchSubjectService } from '../../../services/branchSubjectService';

const BranchSubject = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Get franchise/branch code from token
  const getBranchCode = () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.franchise_code || payload.branch_code || 'DEFAULT';
      }
    } catch (error) {
      console.error('Error parsing token:', error);
    }
    return 'DEFAULT';
  };

  // Mock data for subjects posted by admin/franchise_admin
  const mockSubjects = [
    {
      id: 1,
      subject_name: 'Data Structures and Algorithms',
      subject_code: 'CS101',
      program_name: 'Computer Science',
      course_name: 'B.Tech CS',
      semester: 3,
      credits: 4,
      theory_marks: 100,
      practical_marks: 50,
      status: 'active',
      created_by: 'Admin',
      created_at: '2024-12-10',
      description: 'Fundamental concepts of data structures, algorithms, and their applications in programming.'
    },
    {
      id: 2,
      subject_name: 'Web Development Fundamentals',
      subject_code: 'WD201',
      program_name: 'Web Development',
      course_name: 'Full Stack Development',
      semester: 1,
      credits: 3,
      theory_marks: 80,
      practical_marks: 70,
      status: 'active',
      created_by: 'Franchise Admin',
      created_at: '2024-12-08',
      description: 'Introduction to HTML, CSS, JavaScript and responsive web design principles.'
    },
    {
      id: 3,
      subject_name: 'Database Management Systems',
      subject_code: 'DB301',
      program_name: 'Computer Science',
      course_name: 'BCA',
      semester: 5,
      credits: 4,
      theory_marks: 100,
      practical_marks: 50,
      status: 'active',
      created_by: 'Admin',
      created_at: '2024-12-05',
      description: 'Comprehensive study of database concepts, SQL, normalization, and database design.'
    },
    {
      id: 4,
      subject_name: 'Digital Marketing Strategy',
      subject_code: 'DM101',
      program_name: 'Digital Marketing',
      course_name: 'Digital Marketing Certificate',
      semester: 2,
      credits: 3,
      theory_marks: 80,
      practical_marks: 20,
      status: 'active',
      created_by: 'Franchise Admin',
      created_at: '2024-12-12',
      description: 'Learn SEO, SEM, social media marketing, and digital analytics strategies.'
    },
    {
      id: 5,
      subject_name: 'Machine Learning Basics',
      subject_code: 'ML401',
      program_name: 'Data Science',
      course_name: 'Data Science Diploma',
      semester: 4,
      credits: 5,
      theory_marks: 100,
      practical_marks: 100,
      status: 'inactive',
      created_by: 'Admin',
      created_at: '2024-12-15',
      description: 'Introduction to machine learning algorithms, supervised and unsupervised learning.'
    },
    {
      id: 6,
      subject_name: 'Mobile App Development',
      subject_code: 'MAD301',
      program_name: 'Mobile Development',
      course_name: 'Android Development',
      semester: 3,
      credits: 4,
      theory_marks: 80,
      practical_marks: 120,
      status: 'active',
      created_by: 'Franchise Admin',
      created_at: '2024-12-11',
      description: 'Build native Android applications using Java and Android Studio.'
    }
  ];

  const programs = ['Computer Science', 'Web Development', 'Digital Marketing', 'Data Science', 'Mobile Development'];
  const courses = ['B.Tech CS', 'BCA', 'Full Stack Development', 'Digital Marketing Certificate', 'Data Science Diploma', 'Android Development'];

  const loadSubjects = async () => {
    try {
      setLoading(true);
      setError(null);

      // In a real implementation, this would fetch subjects for the specific franchise
      const branchCode = getBranchCode();
      console.log('Loading subjects for branch:', branchCode);

      const response = await branchSubjectService.getSubjects();
      if (response.success) {
        setSubjects(response.data);
      } else {
        console.error('Error loading subjects:', response.error);
        setError('Failed to load subjects. Using mock data.');
        // Fallback to mock data
        setSubjects(mockSubjects);
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
      setError('Failed to load subjects. Using mock data.');
      // Fallback to mock data
      setSubjects(mockSubjects);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const filteredSubjects = Array.isArray(subjects) ? subjects.filter(subject => {
    const matchesSearch = subject.subject_name?.toLowerCase().includes(searchTerm.toLowerCase()) || '';
    const matchesProgram = selectedProgram === '' || subject.program_name === selectedProgram;
    const matchesCourse = selectedCourse === '' || subject.course_name === selectedCourse;
    return matchesSearch && matchesProgram && matchesCourse;
  }) : [];

  // Handle view subject details
  const handleViewDetails = (subject) => {
    setSelectedSubject(subject);
    setShowDetailsModal(true);
  };

  // Handle delete subject
  const handleDelete = async (subjectId) => {
    if (window.confirm('Are you sure you want to delete this subject? This action cannot be undone.')) {
      try {
        setLoading(true);
        console.log('🗑️ [DELETE SUBJECT] Deleting subject:', subjectId);

        const response = await branchSubjectService.deleteSubject(subjectId);

        console.log('🗑️ [DELETE SUBJECT] Response:', response);

        if (response.success) {
          alert('Subject deleted successfully!');
          await loadSubjects();
        } else {
          alert(response.error || 'Failed to delete subject. Please try again.');
        }
      } catch (error) {
        console.error('❌ [DELETE SUBJECT] Error deleting subject:', error);
        const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete subject.';
        alert(errorMessage);
      } finally {
        setLoading(false);
      }
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    return status === 'active'
      ? 'bg-orange-100 text-orange-800'
      : 'bg-red-100 text-red-800';
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

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSubjects.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredSubjects.length / itemsPerPage);

  return (
    <BranchLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white p-2 rounded-lg">
                  <FaClipboard className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-secondary-900">📋 Available Subjects</h1>
                  <p className="text-sm text-secondary-600 mt-1">View subjects offered by your franchise</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 md:gap-4">
                <div className="bg-teal-50 px-3 py-2 rounded-lg flex-1 md:flex-none text-center">
                  <span className="text-sm font-medium text-teal-700 whitespace-nowrap">
                    Total: {filteredSubjects.length}
                  </span>
                </div>
                <div className="bg-orange-50 px-3 py-2 rounded-lg flex-1 md:flex-none text-center">
                  <span className="text-sm font-medium text-orange-700 whitespace-nowrap">
                    Active: {filteredSubjects.filter(s => s.status === 'active').length}
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
                placeholder="Search subjects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full border border-secondary-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
              />
            </div>

            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="px-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
            >
              <option value="">--- All Programs ---</option>
              {programs.map((program, index) => (
                <option key={index} value={program}>{program}</option>
              ))}
            </select>

            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
            >
              <option value="">--- All Courses ---</option>
              {courses.map((course, index) => (
                <option key={index} value={course}>{course}</option>
              ))}
            </select>
          </div>

          {/* Subjects List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-teal-50 to-blue-50 border-b border-teal-200">
                    <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">S.No.</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">Subject Details</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">Program/Course</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Branch Code</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Semester</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Credits</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Theory</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Practical</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Status</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan="10" className="px-4 py-12 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                          <span className="text-sm text-gray-500">Loading subjects...</span>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan="10" className="px-4 py-12 text-center">
                        <div className="text-red-600 text-sm">{error}</div>
                        <button
                          onClick={loadSubjects}
                          className="mt-2 text-teal-600 hover:text-teal-700 text-sm"
                        >
                          Try again
                        </button>
                      </td>
                    </tr>
                  ) : currentItems.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="px-4 py-12 text-center text-sm text-gray-500">
                        No subjects found matching your criteria
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((subject, index) => (
                      <tr key={subject.id} className="hover:bg-teal-50 transition-colors">
                        <td className="px-4 py-4">
                          <span className="text-sm font-medium text-secondary-900">
                            {indexOfFirstItem + index + 1}.
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                              <FaClipboard className="w-5 h-5 text-teal-600" />
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-secondary-900 max-w-xs">
                                {subject.subject_name}
                              </h3>
                              <p className="text-xs text-teal-600 font-medium">{subject.subject_code}</p>
                              <p className="text-xs text-gray-500">By: {subject.created_by}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <FaBookOpen className="w-3 h-3 text-blue-600" />
                              <span className="text-sm font-medium text-blue-700">{subject.program_name}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <FaGraduationCap className="w-3 h-3 text-indigo-600" />
                              <span className="text-xs text-indigo-600">{subject.course_name}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {subject.branch_code || 'N/A'}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {subject.semester} SEM
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <FaStar className="w-3 h-3 text-yellow-500" />
                            <span className="text-sm font-medium text-yellow-700">{subject.credits || 0}</span>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            {subject.theory_marks || subject.theory || 0}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            {subject.practical_marks || subject.practical || 0}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(subject.status)}`}>
                            {subject.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => handleViewDetails(subject)}
                              className="p-1.5 text-teal-600 hover:bg-teal-50 rounded transition-colors"
                              title="View Details"
                            >
                              <FaEye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(subject.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete Subject"
                            >
                              <FaTrash className="w-3 h-3" />
                            </button>
                          </div>
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
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                </div>
              ) : error ? (
                <div className="p-8 text-center text-red-600">
                  <p>{error}</p>
                  <button onClick={loadSubjects} className="mt-2 text-teal-600 text-sm">Retry</button>
                </div>
              ) : currentItems.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No subjects found</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {currentItems.map((subject) => (
                    <div key={subject.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FaClipboard className="w-5 h-5 text-teal-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-sm font-bold text-gray-900 line-clamp-2">
                                {subject.subject_name}
                              </h3>
                              <p className="text-xs text-teal-600 font-medium">{subject.subject_code}</p>
                            </div>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ml-2 whitespace-nowrap ${getStatusColor(subject.status)}`}>
                              {subject.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </div>

                          <div className="mt-2 text-xs">
                            <div className="flex items-center gap-1 text-gray-700 font-medium">
                              <FaBookOpen className="text-blue-500" /> {subject.program_name}
                            </div>
                            <div className="flex items-center gap-1 text-gray-600 mt-1">
                              <FaGraduationCap className="text-indigo-500" /> {subject.course_name}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-xs text-gray-600">
                            <div className="flex items-center gap-1">
                              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{subject.semester} SEM</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FaStar className="text-yellow-500" />
                              <span>{subject.credits} Credits</span>
                            </div>
                            <div>Theory: <span className="font-semibold">{subject.theory_marks || subject.theory || 0}</span></div>
                            <div>Practical: <span className="font-semibold">{subject.practical_marks || subject.practical || 0}</span></div>
                          </div>

                          <div className="mt-3 flex justify-end gap-2">
                            <button
                              onClick={() => handleViewDetails(subject)}
                              className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 font-medium bg-teal-50 px-3 py-1.5 rounded"
                            >
                              <FaEye /> View Details
                            </button>
                            <button
                              onClick={() => handleDelete(subject.id)}
                              className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-medium bg-red-50 px-3 py-1.5 rounded"
                            >
                              <FaTrash /> Delete
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
                    Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to <span className="font-medium">{Math.min(indexOfLastItem, filteredSubjects.length)}</span> of <span className="font-medium">{filteredSubjects.length}</span> subjects
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-sm bg-teal-600 text-white rounded-md flex items-center">
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

        {/* Subject Details Modal */}
        {showDetailsModal && selectedSubject && (
          <div className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
            <div className="bg-white/95 backdrop-blur-sm rounded-t-xl sm:rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-transform duration-300">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">Subject Details</h3>
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
                  {/* Subject Header */}
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="w-16 h-16 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FaClipboard className="w-8 h-8 text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0 w-full">
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{selectedSubject.subject_name}</h2>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-teal-600 font-medium text-sm">Code: {selectedSubject.subject_code}</span>
                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          Semester {selectedSubject.semester}
                        </span>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedSubject.status)}`}>
                          {selectedSubject.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Subject Description */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Description</h4>
                    <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                      {selectedSubject.description || 'No description available.'}
                    </p>
                  </div>

                  {/* Subject Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Academic Information</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center bg-white p-2 rounded shadow-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <FaBookOpen className="w-4 h-4" />
                            <span className="text-sm">Program</span>
                          </div>
                          <span className="text-sm font-semibold text-gray-900 text-right">{selectedSubject.program_name}</span>
                        </div>
                        <div className="flex justify-between items-center bg-white p-2 rounded shadow-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <FaGraduationCap className="w-4 h-4" />
                            <span className="text-sm">Course</span>
                          </div>
                          <span className="text-sm font-semibold text-gray-900 text-right">{selectedSubject.course_name}</span>
                        </div>
                        <div className="flex justify-between items-center bg-white p-2 rounded shadow-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <FaStar className="w-4 h-4" />
                            <span className="text-sm">Credits</span>
                          </div>
                          <span className="text-sm font-bold text-yellow-600">{selectedSubject.credits}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Assessment Details</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center bg-white p-2 rounded shadow-sm">
                          <span className="text-sm text-gray-600">Theory Marks</span>
                          <span className="text-sm font-bold text-orange-600">{selectedSubject.theory_marks}</span>
                        </div>
                        <div className="flex justify-between items-center bg-white p-2 rounded shadow-sm">
                          <span className="text-sm text-gray-600">Practical Marks</span>
                          <span className="text-sm font-bold text-orange-600">{selectedSubject.practical_marks || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center bg-blue-50 p-2 rounded shadow-sm border border-blue-100">
                          <span className="text-sm text-gray-700 font-medium">Total Marks</span>
                          <span className="text-sm font-bold text-blue-700">
                            {selectedSubject.theory_marks + (selectedSubject.practical_marks || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subject Metadata */}
                  <div className="p-4 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Metadata</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between sm:justify-start sm:gap-2">
                        <span className="text-gray-500">Created By:</span>
                        <span className="font-medium text-gray-900">{selectedSubject.created_by}</span>
                      </div>
                      <div className="flex justify-between sm:justify-start sm:gap-2">
                        <span className="text-gray-500">Created On:</span>
                        <span className="font-medium text-gray-900">{formatDate(selectedSubject.created_at)}</span>
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

export default BranchSubject;