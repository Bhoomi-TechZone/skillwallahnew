import { useState, useEffect } from 'react';
import { FaUsers, FaSearch, FaEye, FaUserGraduate, FaCalendarAlt, FaChalkboardTeacher, FaClock, FaGraduationCap } from 'react-icons/fa';
import BranchLayout from '../BranchLayout';
import { branchBatchService } from '../../../services/branchBatchService';
import { branchProgramService } from '../../../services/branchProgramService';
import { branchCourseService } from '../../../services/branchCourseService';

const BranchBatch = () => {
  const [batches, setBatches] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Helper functions to get names from IDs
  const getProgramName = (programId) => {
    console.log('🔍 [getProgramName] programId:', programId, 'programs.length:', programs.length);
    if (!programId) return 'N/A';
    const program = programs.find(p => p.id === programId);
    console.log('🔍 [getProgramName] found program:', program);
    return program ? (program.program_name || program.name) : 'N/A';
  };

  const getCourseName = (courseId) => {
    console.log('🔍 [getCourseName] courseId:', courseId, 'courses.length:', courses.length);
    if (!courseId) return 'N/A';
    const course = courses.find(c => c.id === courseId);
    console.log('🔍 [getCourseName] found course:', course);
    return course ? (course.course_name || course.name) : 'N/A';
  };

  // Get branch code from token
  const getBranchCode = () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('🔍 Token payload:', payload);
        // Force return branch code as FR-SK-0940 for now
        return 'FR-SK-0940';
      }
    } catch (error) {
      console.error('Error parsing token:', error);
    }
    return 'DEFAULT';
  };


  const statusOptions = ['active', 'inactive', 'completed'];

  const loadPrograms = async () => {
    try {
      console.log('🔍 [BranchBatch] Loading programs...');
      const response = await branchProgramService.getPrograms();
      console.log('🔍 [BranchBatch] Programs response:', response);
      if (response.success && response.data) {
        // Filter only active programs
        const activePrograms = response.data.filter(program => program.status === 'active');
        setPrograms(activePrograms);
        console.log('✅ [BranchBatch] Loaded active programs:', activePrograms.length);
        console.log('🔍 [BranchBatch] Active programs data:', activePrograms);
      } else {
        console.error('❌ Error loading programs:', response.error);
        setPrograms([]);
      }
    } catch (error) {
      console.error('❌ Error loading programs:', error);
      setPrograms([]);
    }
  };

  const loadCourses = async () => {
    try {
      console.log('🔍 [BranchBatch] Loading courses...');
      const response = await branchCourseService.getCourses();
      console.log('🔍 [BranchBatch] Courses response:', response);
      if (response.success && response.data) {
        setCourses(response.data);
        console.log('✅ [BranchBatch] Loaded courses:', response.data.length);
        console.log('🔍 [BranchBatch] Courses data:', response.data);
      } else {
        console.error('❌ Error loading courses:', response.error);
        setCourses([]);
      }
    } catch (error) {
      console.error('❌ Error loading courses:', error);
      setCourses([]);
    }
  };

  const loadBatches = async () => {
    try {
      setLoading(true);
      setError(null);

      // In a real implementation, this would fetch batches for the specific franchise
      const branchCode = getBranchCode();
      console.log('Loading batches for branch:', branchCode);

      const response = await branchBatchService.getBatches();
      console.log('🔍 [BranchBatch] Full API Response:', response);
      console.log('🔍 [BranchBatch] Response Success:', response?.success);
      console.log('🔍 [BranchBatch] Response Data:', response?.data);
      console.log('🔍 [BranchBatch] Is Array:', Array.isArray(response?.data));

      if (response.success && response.data && Array.isArray(response.data)) {
        setBatches(response.data);
        console.log('✅ [BranchBatch] Successfully loaded batches:', response.data.length);
        if (response.data.length > 0) {
          console.log('📋 [BranchBatch] Sample batch data:', response.data[0]);
          console.log('🔍 [BranchBatch] Batch fields - program_id:', response.data[0].program_id, 'course_id:', response.data[0].course_id);
          console.log('🔍 [BranchBatch] Batch fields - program_name:', response.data[0].program_name, 'course_name:', response.data[0].course_name);
        } else {
          console.log('⚠️ [BranchBatch] No batches found in response');
        }
      } else {
        console.error('❌ Error loading batches: Invalid data format', response);
        console.log('🔍 [DEBUG] Response details - success:', response?.success, 'data:', response?.data, 'isArray:', Array.isArray(response?.data));
        setError('Failed to load batches from server.');
        setBatches([]);
      }
    } catch (error) {
      console.error('❌ Error loading batches:', error);
      console.error('🔍 [DEBUG] Error details:', error.message, error.response?.data);
      setError('Failed to load batches.');
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadAllData = async () => {
      await Promise.all([
        loadPrograms(),
        loadCourses(),
        loadBatches()
      ]);
    };
    loadAllData();
  }, []);

  const filteredBatches = Array.isArray(batches) ? batches.filter(batch => {
    const matchesSearch = batch.batch_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.course_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.instructor_name?.toLowerCase().includes(searchTerm.toLowerCase()) || '';
    const matchesStatus = statusFilter === '' || batch.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) : [];

  // Handle view batch details
  const handleViewDetails = (batch) => {
    setSelectedBatch(batch);
    setShowDetailsModal(true);
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-orange-100 text-orange-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get capacity color
  const getCapacityColor = (current, max) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return 'bg-red-100 text-red-700';
    if (percentage >= 70) return 'bg-yellow-100 text-yellow-700';
    return 'bg-orange-100 text-orange-700';
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

  // Calculate batch duration
  const calculateDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return 'N/A';
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end - start);
      const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
      return `${diffMonths} months`;
    } catch (error) {
      return 'N/A';
    }
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredBatches.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredBatches.length / itemsPerPage);

  return (
    <BranchLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-2 rounded-lg">
                  <FaUsers className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-secondary-900">👥 Available Batches</h1>
                  <p className="text-sm text-secondary-600 mt-1">View student batches created by your franchise</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 md:gap-4">
                <div className="bg-purple-50 px-3 py-1.5 md:px-4 md:py-2 rounded-lg">
                  <span className="text-xs md:text-sm font-medium text-purple-700 whitespace-nowrap">
                    Total: {filteredBatches.length}
                  </span>
                </div>
                <div className="bg-orange-50 px-3 py-1.5 md:px-4 md:py-2 rounded-lg">
                  <span className="text-xs md:text-sm font-medium text-orange-700 whitespace-nowrap">
                    Active: {filteredBatches.filter(b => b.status === 'active').length}
                  </span>
                </div>
                <div className="bg-blue-50 px-3 py-1.5 md:px-4 md:py-2 rounded-lg">
                  <span className="text-xs md:text-sm font-medium text-blue-700 whitespace-nowrap">
                    Completed: {filteredBatches.filter(b => b.status === 'completed').length}
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
                placeholder="Search batches..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full border border-secondary-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
            >
              <option value="">--- All Status ---</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Batches Table - Desktop */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-200">
                    <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">S.No.</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">Branch Code</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">Batch Details</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">Course Info</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Instructor</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Duration</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Capacity</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Status</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-12 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                          <span className="text-sm text-gray-500">Loading batches...</span>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-12 text-center">
                        <div className="text-red-600 text-sm">{error}</div>
                        <button
                          onClick={loadBatches}
                          className="mt-2 text-purple-600 hover:text-purple-700 text-sm"
                        >
                          Try again
                        </button>
                      </td>
                    </tr>
                  ) : currentItems.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-12 text-center text-sm text-gray-500">
                        No batches found matching your criteria
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((batch, index) => (
                      <tr key={batch.id} className="hover:bg-purple-50 transition-colors">
                        <td className="px-4 py-4">
                          <span className="text-sm font-medium text-secondary-900">
                            {indexOfFirstItem + index + 1}.
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                            {batch.branch_code || getBranchCode()}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <h3 className="text-sm font-semibold text-secondary-900 max-w-xs">
                              {batch.batch_name}
                            </h3>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="bg-purple-100 px-2 py-1 rounded text-xs font-mono font-semibold text-purple-700">
                                {batch.batch_code || 'N/A'}
                              </span>
                              <span className="bg-blue-100 px-2 py-1 rounded text-xs font-mono font-semibold text-blue-700">
                                {batch.branch_code || 'N/A'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">
                              Created: {formatDate(batch.created_at)}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-secondary-900">{batch.program_name || getProgramName(batch.program_id)}</div>
                            <div className="text-xs text-blue-600 font-medium">{batch.course_name || getCourseName(batch.course_id)}</div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <FaChalkboardTeacher className="w-3 h-3 text-orange-600" />
                            <span className="text-sm font-medium text-orange-700">
                              {batch.instructor_name}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="text-center space-y-1">
                            <div className="flex items-center justify-center space-x-1 text-xs text-orange-600">
                              <FaCalendarAlt className="w-3 h-3" />
                              <span>{formatDate(batch.start_date)}</span>
                            </div>
                            <div className="flex items-center justify-center space-x-1 text-xs text-red-600">
                              <FaCalendarAlt className="w-3 h-3" />
                              <span>{formatDate(batch.end_date)}</span>
                            </div>
                            <div className="text-xs text-purple-600 font-medium">
                              {calculateDuration(batch.start_date, batch.end_date)}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="text-center">
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getCapacityColor(batch.total_students, batch.max_capacity)}`}>
                              <FaUserGraduate className="w-3 h-3 mr-1" />
                              {batch.total_students}/{batch.max_capacity}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {Math.round((batch.total_students / batch.max_capacity) * 100)}% Full
                            </div>
                            {/* Progress bar */}
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                              <div
                                className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.min((batch.total_students / batch.max_capacity) * 100, 100)}%`
                                }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(batch.status)}`}>
                            {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => handleViewDetails(batch)}
                            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
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
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-600">
                <p>{error}</p>
                <button onClick={loadBatches} className="mt-2 text-purple-600 text-sm">Retry</button>
              </div>
            ) : currentItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500 bg-white rounded-lg shadow-sm">
                No batches found matching your criteria
              </div>
            ) : (
              currentItems.map((batch) => (
                <div key={batch.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{batch.batch_name}</h3>
                      <p className="text-xs text-purple-600 font-medium mt-0.5">{batch.course_name || getCourseName(batch.course_id)}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(batch.status)}`}>
                      {batch.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs font-mono">
                      {batch.batch_code || 'N/A'}
                    </span>
                    <span className="bg-yellow-50 text-yellow-800 px-2 py-0.5 rounded text-xs font-mono">
                      {batch.branch_code || getBranchCode()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 mb-3">
                    <div className="flex items-center gap-1.5">
                      <FaChalkboardTeacher className="text-orange-500" />
                      <span className="truncate">{batch.instructor_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FaUserGraduate className="text-purple-500" />
                      <span>{batch.total_students}/{batch.max_capacity} Students</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FaCalendarAlt className="text-blue-500" />
                      <span>{formatDate(batch.start_date)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FaClock className="text-gray-400" />
                      <span>{calculateDuration(batch.start_date, batch.end_date)}</span>
                    </div>
                  </div>

                  <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
                    <div
                      className="bg-purple-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min((batch.total_students / batch.max_capacity) * 100, 100)}%` }}
                    ></div>
                  </div>

                  <button
                    onClick={() => handleViewDetails(batch)}
                    className="w-full flex items-center justify-center gap-2 text-sm text-purple-600 bg-purple-50 py-2 rounded-lg font-medium hover:bg-purple-100 transition-colors"
                  >
                    <FaEye /> View Details
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-700 text-center sm:text-left">
                  Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to <span className="font-medium">{Math.min(indexOfLastItem, filteredBatches.length)}</span> of <span className="font-medium">{filteredBatches.length}</span> batches
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm bg-purple-600 text-white rounded-md flex items-center">
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

      {/* Batch Details Modal */}
      {showDetailsModal && selectedBatch && (
        <div className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white/95 backdrop-blur-sm rounded-t-xl sm:rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform transition-transform duration-300">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Batch Details</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4">
              <div className="space-y-6">
                {/* Batch Header */}
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center">
                    <FaUsers className="w-8 h-8 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900">{selectedBatch.batch_name}</h2>
                    <p className="text-purple-600 font-medium">{selectedBatch.program_name || getProgramName(selectedBatch.program_id)} - {selectedBatch.course_name || getCourseName(selectedBatch.course_id)}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedBatch.status)}`}>
                        {selectedBatch.status.charAt(0).toUpperCase() + selectedBatch.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Batch Description */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-600 leading-relaxed">
                    {selectedBatch.description || 'No description available.'}
                  </p>
                </div>

                {/* Batch Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Academic Information</h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <FaChalkboardTeacher className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="text-sm text-gray-600">Instructor:</span>
                        <span className="text-sm font-medium text-gray-900 truncate">{selectedBatch.instructor_name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FaCalendarAlt className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="text-sm text-gray-600">Start Date:</span>
                        <span className="text-sm font-medium text-gray-900">{formatDate(selectedBatch.start_date)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FaCalendarAlt className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="text-sm text-gray-600">End Date:</span>
                        <span className="text-sm font-medium text-gray-900">{formatDate(selectedBatch.end_date)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FaClock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="text-sm text-gray-600">Duration:</span>
                        <span className="text-sm font-medium text-purple-600">
                          {calculateDuration(selectedBatch.start_date, selectedBatch.end_date)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Enrollment Details</h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <FaUsers className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="text-sm text-gray-600">Max Capacity:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedBatch.max_capacity} students</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FaUserGraduate className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="text-sm text-gray-600">Enrolled:</span>
                        <span className="text-sm font-medium text-orange-600">{selectedBatch.total_students} students</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Available Seats:</span>
                        <span className="text-sm font-medium text-orange-600">
                          {selectedBatch.max_capacity - selectedBatch.total_students} seats
                        </span>
                      </div>
                      <div className="w-full">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Enrollment Progress</span>
                          <span>{Math.round((selectedBatch.total_students / selectedBatch.max_capacity) * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min((selectedBatch.total_students / selectedBatch.max_capacity) * 100, 100)}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Schedule Information */}
                {(selectedBatch.timing || selectedBatch.days_of_week) && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Class Schedule</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <FaClock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-900">
                          {selectedBatch.days_of_week && `${selectedBatch.days_of_week}`}
                          {selectedBatch.days_of_week && selectedBatch.timing && ', '}
                          {selectedBatch.timing && `${selectedBatch.timing}`}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Batch Metadata */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Additional Information</h4>
                  <div className="grid grid-cols-1 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Created On:</span>
                      <span className="font-medium text-gray-900 ml-2">{formatDate(selectedBatch.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white z-10">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
                {selectedBatch.status === 'active' && (
                  <button className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors">
                    View Students
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </BranchLayout >
  );
};

export default BranchBatch;