import { useState, useEffect } from 'react';
import { FaBook, FaSearch, FaEye, FaGraduationCap, FaUsers, FaClock, FaRupeeSign, FaCalendarAlt } from 'react-icons/fa';
import BranchLayout from '../BranchLayout';
import { branchProgramService } from '../../../services/branchProgramService';

const BranchProgram = () => {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedProgram, setSelectedProgram] = useState(null);
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

  // Mock data for programs posted by admin/franchise_admin
  const mockPrograms = [
    {
      id: 1,
      program_name: 'Advanced Computer Science Program',
      description: 'Comprehensive program covering data structures, algorithms, software engineering, and modern development practices.',
      program_type: 'academic',
      duration_years: 2,
      total_semesters: 4,
      eligibility: 'Bachelor\'s degree in any field',
      program_fee: 75000,
      total_courses: 12,
      total_students: 45,
      status: 'active',
      created_by: 'Admin',
      created_at: '2024-12-10',
      enrollment_open: true
    },
    {
      id: 2,
      program_name: 'Digital Marketing Certificate',
      description: 'Industry-focused program on SEO, SEM, social media marketing, content strategy, and digital analytics.',
      program_type: 'certificate',
      duration_years: 0.5,
      total_semesters: 1,
      eligibility: '12th Pass or equivalent',
      program_fee: 25000,
      total_courses: 8,
      total_students: 78,
      status: 'active',
      created_by: 'Franchise Admin',
      created_at: '2024-12-08',
      enrollment_open: true
    },
    {
      id: 3,
      program_name: 'Full Stack Web Development',
      description: 'Complete web development program covering frontend, backend, databases, and deployment technologies.',
      program_type: 'professional',
      duration_years: 1,
      total_semesters: 2,
      eligibility: 'Basic computer knowledge',
      program_fee: 45000,
      total_courses: 10,
      total_students: 62,
      status: 'active',
      created_by: 'Admin',
      created_at: '2024-12-05',
      enrollment_open: true
    },
    {
      id: 4,
      program_name: 'Data Science & Analytics Diploma',
      description: 'Advanced program in data science, machine learning, statistical analysis, and big data technologies.',
      program_type: 'diploma',
      duration_years: 1.5,
      total_semesters: 3,
      eligibility: 'Graduation with Mathematics/Statistics',
      program_fee: 85000,
      total_courses: 15,
      total_students: 32,
      status: 'active',
      created_by: 'Franchise Admin',
      created_at: '2024-12-12',
      enrollment_open: false
    },
    {
      id: 5,
      program_name: 'Mobile App Development Certificate',
      description: 'Comprehensive mobile development program covering iOS, Android, and cross-platform development.',
      program_type: 'certificate',
      duration_years: 0.75,
      total_semesters: 2,
      eligibility: 'Basic programming knowledge',
      program_fee: 35000,
      total_courses: 6,
      total_students: 28,
      status: 'inactive',
      created_by: 'Admin',
      created_at: '2024-12-15',
      enrollment_open: false
    },
    {
      id: 6,
      program_name: 'Business Analytics Professional',
      description: 'Professional program focusing on business intelligence, data visualization, and strategic analytics.',
      program_type: 'professional',
      duration_years: 1,
      total_semesters: 2,
      eligibility: 'MBA or equivalent business degree',
      program_fee: 65000,
      total_courses: 8,
      total_students: 19,
      status: 'active',
      created_by: 'Franchise Admin',
      created_at: '2024-12-11',
      enrollment_open: true
    }
  ];

  const programTypes = ['academic', 'certificate', 'diploma', 'professional'];

  const loadPrograms = async () => {
    try {
      setLoading(true);
      setError(null);

      // In a real implementation, this would fetch programs for the specific franchise
      const branchCode = getBranchCode();
      console.log('Loading programs for branch:', branchCode);

      const result = await branchProgramService.getPrograms();
      if (result.success) {
        setPrograms(result.data);
      } else {
        console.error('Error loading programs:', result.error);
        setError('Failed to load programs. Using mock data.');
        // Fallback to mock data
        setPrograms(mockPrograms);
      }
    } catch (error) {
      console.error('Error loading programs:', error);
      setError('Failed to load programs. Using mock data.');
      // Fallback to mock data
      setPrograms(mockPrograms);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrograms();
  }, []);

  const filteredPrograms = Array.isArray(programs) ? programs.filter(program => {
    const matchesSearch = program.program_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      program.description?.toLowerCase().includes(searchTerm.toLowerCase()) || '';
    const matchesType = selectedType === '' || program.program_type === selectedType;
    const isActive = program.status === 'active'; // Only show active programs
    return matchesSearch && matchesType && isActive;
  }) : [];

  // Handle view program details
  const handleViewDetails = (program) => {
    setSelectedProgram(program);
    setShowDetailsModal(true);
  };

  // Get status color
  const getStatusColor = (status) => {
    return status === 'active'
      ? 'bg-orange-100 text-orange-800'
      : 'bg-red-100 text-red-800';
  };

  // Get program type color
  const getTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'certificate':
        return 'bg-blue-100 text-blue-800';
      case 'diploma':
        return 'bg-purple-100 text-purple-800';
      case 'academic':
        return 'bg-indigo-100 text-indigo-800';
      case 'professional':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
  const currentItems = filteredPrograms.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPrograms.length / itemsPerPage);

  return (
    <BranchLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-2 rounded-lg">
                  <FaBook className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-secondary-900">📚 Available Programs</h1>
                  <p className="text-sm text-secondary-600 mt-1">View academic programs offered by your franchise</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 md:gap-4">
                <div className="bg-indigo-50 px-3 py-2 rounded-lg flex-1 md:flex-none text-center">
                  <span className="text-sm font-medium text-indigo-700 whitespace-nowrap">
                    Total: {filteredPrograms.length}
                  </span>
                </div>
                <div className="bg-orange-50 px-3 py-2 rounded-lg flex-1 md:flex-none text-center">
                  <span className="text-sm font-medium text-orange-700 whitespace-nowrap">
                    Active: {filteredPrograms.filter(p => p.status === 'active').length}
                  </span>
                </div>
                <div className="bg-green-50 px-3 py-2 rounded-lg flex-1 md:flex-none text-center">
                  <span className="text-sm font-medium text-green-700 whitespace-nowrap">
                    Open: {filteredPrograms.filter(p => p.enrollment_open).length}
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
                placeholder="Search programs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full border border-secondary-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            >
              <option value="">--- All Types ---</option>
              {programTypes.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Programs List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
                    <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">S.No.</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">Program Details</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Type</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Duration</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Fee</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Courses</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Students</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Status</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-12 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                          <span className="text-sm text-gray-500">Loading programs...</span>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-12 text-center">
                        <div className="text-red-600 text-sm">{error}</div>
                        <button
                          onClick={loadPrograms}
                          className="mt-2 text-indigo-600 hover:text-indigo-700 text-sm"
                        >
                          Try again
                        </button>
                      </td>
                    </tr>
                  ) : currentItems.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-12 text-center text-sm text-gray-500">
                        No programs found matching your criteria
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((program, index) => (
                      <tr key={program.id} className="hover:bg-indigo-50 transition-colors">
                        <td className="px-4 py-4">
                          <span className="text-sm font-medium text-secondary-900">
                            {indexOfFirstItem + index + 1}.
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                              <FaBook className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-secondary-900 max-w-xs">
                                {program.program_name}
                              </h3>
                              <p className="text-xs text-gray-600 mt-1 max-w-xs">
                                {program.description?.substring(0, 80)}...
                              </p>
                              <p className="text-xs text-indigo-600 mt-1">By: {program.created_by}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                {program.enrollment_open && (
                                  <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                                    Enrolling
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(program.program_type)}`}>
                            {program.program_type?.charAt(0).toUpperCase() + program.program_type?.slice(1)}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <div className="flex flex-col items-center space-y-1">
                            <div className="flex items-center space-x-1">
                              <FaClock className="w-3 h-3 text-blue-600" />
                              <span className="text-sm font-medium text-blue-700">
                                {program.duration_years} {program.duration_years === 1 ? 'Year' : 'Years'}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {program.total_semesters} Sem{program.total_semesters > 1 ? 's' : ''}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <FaRupeeSign className="w-3 h-3 text-orange-600" />
                            <span className="text-sm font-medium text-amber-700">
                              {program.program_fee?.toLocaleString() || 0}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {program.total_courses || 0}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <FaUsers className="w-3 h-3 text-orange-600" />
                            <span className="text-sm font-medium text-orange-700">
                              {program.total_students || 0}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(program.status)}`}>
                            {program.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => handleViewDetails(program)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
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
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : error ? (
                <div className="p-8 text-center text-red-600">
                  <p>{error}</p>
                  <button onClick={loadPrograms} className="mt-2 text-indigo-600 text-sm">Retry</button>
                </div>
              ) : currentItems.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No programs found</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {currentItems.map((program, index) => (
                    <div key={program.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FaBook className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h3 className="text-sm font-bold text-gray-900 line-clamp-2">
                              {program.program_name}
                            </h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ml-2 whitespace-nowrap ${getStatusColor(program.status)}`}>
                              {program.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-2 text-xs">
                            <span className={`px-2 py-0.5 rounded-full ${getTypeColor(program.program_type)}`}>
                              {program.program_type}
                            </span>
                            {program.enrollment_open && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                                Enrolling
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-gray-600">
                            <div className="flex items-center gap-1">
                              <FaClock className="text-blue-500" />
                              <span>{program.duration_years} Years ({program.total_semesters} Sem)</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FaRupeeSign className="text-orange-500" />
                              <span>{program.program_fee?.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FaBook className="text-purple-500" />
                              <span>{program.total_courses} Courses</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FaUsers className="text-indigo-500" />
                              <span>{program.total_students} Students</span>
                            </div>
                          </div>

                          <div className="mt-3 flex justify-end">
                            <button
                              onClick={() => handleViewDetails(program)}
                              className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium bg-indigo-50 px-3 py-1.5 rounded"
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
                    Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to <span className="font-medium">{Math.min(indexOfLastItem, filteredPrograms.length)}</span> of <span className="font-medium">{filteredPrograms.length}</span> programs
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-md flex items-center">
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

        {/* Program Details Modal */}
        {showDetailsModal && selectedProgram && (
          <div className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
            <div className="bg-white/95 backdrop-blur-sm rounded-t-xl sm:rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform transition-transform duration-300">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">Program Details</h3>
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
                  {/* Program Header */}
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="w-16 h-16 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FaBook className="w-8 h-8 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0 w-full">
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{selectedProgram.program_name}</h2>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`px-3 py-1 text-xs sm:text-sm font-medium rounded-full ${getTypeColor(selectedProgram.program_type)}`}>
                          {selectedProgram.program_type?.charAt(0).toUpperCase() + selectedProgram.program_type?.slice(1)}
                        </span>
                        <span className={`px-3 py-1 text-xs sm:text-sm font-medium rounded-full ${getStatusColor(selectedProgram.status)}`}>
                          {selectedProgram.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                        {selectedProgram.enrollment_open && (
                          <span className="px-3 py-1 text-xs sm:text-sm font-medium rounded-full bg-orange-100 text-orange-800">
                            Enrollment Open
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Program Description */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Program Description</h4>
                    <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                      {selectedProgram.description || 'No description available.'}
                    </p>
                  </div>

                  {/* Program Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Academic Information</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center bg-white p-2 rounded shadow-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <FaClock className="w-4 h-4" />
                            <span className="text-sm">Duration</span>
                          </div>
                          <span className="text-sm font-semibold text-gray-900">
                            {selectedProgram.duration_years} {selectedProgram.duration_years === 1 ? 'Year' : 'Years'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center bg-white p-2 rounded shadow-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <FaGraduationCap className="w-4 h-4" />
                            <span className="text-sm">Semesters</span>
                          </div>
                          <span className="text-sm font-semibold text-gray-900">{selectedProgram.total_semesters}</span>
                        </div>
                        <div className="flex justify-between items-center bg-white p-2 rounded shadow-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <FaRupeeSign className="w-4 h-4" />
                            <span className="text-sm">Fee</span>
                          </div>
                          <span className="text-sm font-bold text-orange-600">₹{selectedProgram.program_fee?.toLocaleString() || 0}</span>
                        </div>
                        <div className="bg-white p-2 rounded shadow-sm">
                          <p className="text-xs text-gray-500 mb-1">Eligibility</p>
                          <p className="text-sm font-medium text-gray-900">{selectedProgram.eligibility || 'Not specified'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Statistics</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-3 rounded shadow-sm text-center">
                          <FaBook className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                          <p className="text-xs text-gray-500">Courses</p>
                          <p className="text-lg font-bold text-gray-900">{selectedProgram.total_courses || 0}</p>
                        </div>
                        <div className="bg-white p-3 rounded shadow-sm text-center">
                          <FaUsers className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                          <p className="text-xs text-gray-500">Students</p>
                          <p className="text-lg font-bold text-gray-900">{selectedProgram.total_students || 0}</p>
                        </div>
                      </div>
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between text-sm bg-white p-2 rounded shadow-sm">
                          <span className="text-gray-600">Created On</span>
                          <span className="font-medium text-gray-900">{formatDate(selectedProgram.created_at)}</span>
                        </div>
                        <div className="flex justify-between text-sm bg-white p-2 rounded shadow-sm">
                          <span className="text-gray-600">Created By</span>
                          <span className="font-medium text-gray-900 text-right truncate ml-2">{selectedProgram.created_by}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Enrollment Status */}
                  <div className={`p-4 rounded-lg border ${selectedProgram.enrollment_open ? 'bg-orange-50 border-orange-100' : 'bg-red-50 border-red-100'}`}>
                    <h4 className={`text-lg font-semibold mb-1 ${selectedProgram.enrollment_open ? 'text-orange-900' : 'text-red-900'}`}>
                      {selectedProgram.enrollment_open ? '✅ Enrollment Open' : '⛔ Enrollment Closed'}
                    </h4>
                    <p className={`text-sm ${selectedProgram.enrollment_open ? 'text-orange-700' : 'text-red-700'}`}>
                      {selectedProgram.enrollment_open
                        ? 'New students can enroll in this program'
                        : 'This program is not currently accepting new enrollments'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-white sticky bottom-0 flex flex-col sm:flex-row justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
                {selectedProgram.enrollment_open && (
                  <button className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-indigo-200">
                    View Enrollment Details
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </BranchLayout>
  );
};

export default BranchProgram