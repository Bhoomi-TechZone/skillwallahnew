import { useState, useEffect } from 'react';
import { FaClipboard, FaSearch, FaEye, FaDownload, FaClock, FaQuestionCircle, FaCalendarAlt, FaFilter, FaFileAlt } from 'react-icons/fa';
import { paperSetService } from '../../../services/paperSetService';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import BranchLayout from '../BranchLayout';
import { getUserData } from '../../../utils/authUtils';

const BranchPaperSet = () => {
  const [paperSets, setPaperSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [memberTypeFilter, setMemberTypeFilter] = useState('');
  const [selectedPaperSet, setSelectedPaperSet] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Dynamic filter options
  const [courses, setCourses] = useState([]);
  const [courseCategories, setCourseCategories] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [memberTypeOptions, setMemberTypeOptions] = useState([]);
  const [filtersLoading, setFiltersLoading] = useState(true);

  // Get user context
  const userData = getUserData();
  const userContext = {
    role: userData?.role || 'N/A',
    is_branch_admin: userData?.is_branch_admin || false,
    franchise_code: userData?.franchise_code || localStorage.getItem('franchise_code') || 'N/A',
    branch_code: userData?.branch_code || localStorage.getItem('branch_code') || 'N/A',
  };

  // Get franchise/branch code from token
  const getBranchCode = () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.branchCode || 'BRANCH001';
      }
      return 'BRANCH001';
    } catch (error) {
      console.error('Error decoding token:', error);
      return 'BRANCH001';
    }
  };

  // Load filter options from backend
  const loadFilterOptions = async () => {
    try {
      setFiltersLoading(true);
      console.log('📋 [BranchPaperSet] Loading filter options...');

      // Fetch courses from branch courses API
      const response = await fetch('http://localhost:4000/api/branch-courses/courses', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const coursesData = await response.json();
        console.log('✅ [BranchPaperSet] Raw courses response:', coursesData);

        if (coursesData && coursesData.length > 0) {
          // Extract unique course names and categories
          const uniqueCourseNames = [...new Set(coursesData.map(course =>
            course.course_name || course.title || course.name
          ).filter(Boolean))];

          const uniqueCategories = [...new Set(coursesData.map(course =>
            course.category || course.course_category
          ).filter(Boolean))];

          setCourses(uniqueCourseNames);
          setCourseCategories(uniqueCategories);
          console.log('✅ [BranchPaperSet] Dynamic courses loaded:', uniqueCourseNames);
          console.log('✅ [BranchPaperSet] Categories loaded:', uniqueCategories);
        } else {
          console.log('ℹ️ [BranchPaperSet] No courses found, using defaults');
          setCourses([]);
          setCourseCategories(['Certificate Courses', 'PG Courses', 'Diploma Courses']);
        }
      } else {
        console.error('❌ [BranchPaperSet] Failed to fetch courses:', response.status);
        // Set default options on API error
        setCourses([]);
        setCourseCategories(['Certificate Courses', 'PG Courses', 'Diploma Courses']);
      }

      // Set status options (these are typically standard)
      setStatusOptions(['published', 'archived', 'draft']);

      // Set member type options (these are typically standard)
      setMemberTypeOptions(['Demo Test', 'Full Test', 'Practice Test']);

    } catch (error) {
      console.error('❌ [BranchPaperSet] Error loading filter options:', error);
      // Set default options on error
      setStatusOptions(['published', 'archived']);
      setMemberTypeOptions(['Demo Test', 'Full Test']);
      setCourses([]);
      setCourseCategories(['Certificate Courses', 'PG Courses', 'Diploma Courses']);
    } finally {
      setFiltersLoading(false);
    }
  };

  // Load paper sets from API
  const loadPaperSets = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📋 [BranchPaperSet] Loading paper sets...');
      const response = await paperSetService.getPaperSets();

      if (response.success && response.data) {
        console.log('✅ [BranchPaperSet] Paper sets loaded:', response.data);
        setPaperSets(response.data);
      } else {
        console.error('❌ [BranchPaperSet] Failed to load paper sets:', response.error);
        setError(response.error || 'Failed to load paper sets');
        toast.error(response.error || 'Failed to load paper sets');
        setPaperSets([]);
      }
    } catch (error) {
      console.error('❌ [BranchPaperSet] Error loading paper sets:', error);
      setError('Failed to load paper sets');
      toast.error('Failed to load paper sets');
      setPaperSets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([
        loadPaperSets(),
        loadFilterOptions()
      ]);
    };

    initializeData();
  }, []);

  // Filter paper sets
  const filteredPaperSets = paperSets.filter(set => {
    const matchesSearch = set.paperName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      set.courseName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === '' || set.status === statusFilter;
    const matchesCourse = courseFilter === '' || set.courseName === courseFilter;
    const matchesMemberType = memberTypeFilter === '' || set.memberType === memberTypeFilter;
    return matchesSearch && matchesStatus && matchesCourse && matchesMemberType;
  });

  // Handle preview paper set
  const handlePreview = (paperSet) => {
    setSelectedPaperSet(paperSet);
    setShowPreviewModal(true);
  };

  // Handle download paper set details
  const handleDownload = (paperSet) => {
    // Create downloadable content
    const content = `
Paper Set Details:
================
Paper Name: ${paperSet.paperName}
Course: ${paperSet.courseName}
Category: ${paperSet.courseCategory}
Number of Questions: ${paperSet.numberOfQuestions}
Per Question Mark: ${paperSet.perQuestionMark}
Total Marks: ${paperSet.totalMarks}
Time Limit: ${paperSet.timeLimit} minutes
Member Type: ${paperSet.memberType}
Available From: ${paperSet.availableFrom}
Available To: ${paperSet.availableTo}
Created By: ${paperSet.created_by}
Created On: ${new Date(paperSet.created_at).toLocaleDateString()}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${paperSet.paperName}_details.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'published':
        return 'bg-orange-100 text-orange-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get member type color
  const getMemberTypeColor = (type) => {
    return type === 'Full Test'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-orange-100 text-orange-800';
  };

  // Get availability status
  const getAvailabilityStatus = (availableFrom, availableTo) => {
    const now = new Date();
    const fromDate = new Date(availableFrom);
    const toDate = new Date(availableTo);

    if (now < fromDate) {
      return { status: 'upcoming', color: 'bg-yellow-100 text-yellow-800', text: 'Upcoming' };
    } else if (now > toDate) {
      return { status: 'expired', color: 'bg-red-100 text-red-800', text: 'Expired' };
    } else {
      return { status: 'active', color: 'bg-orange-100 text-orange-800', text: 'Active' };
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleDateString() : 'N/A';
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPaperSets.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPaperSets.length / itemsPerPage);

  return (
    <BranchLayout>
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-4 py-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-2 rounded-lg">
                  <FaClipboard className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Available Paper Sets</h1>
                  <p className="text-gray-600">View and access published paper sets for your branch</p>
                </div>
              </div>
              <div className="text-sm text-gray-500 bg-blue-50 px-4 py-2 rounded-lg self-start md:self-auto">
                <span className="font-medium">Branch Access:</span> View Only
              </div>
            </div>
          </div>
        </div>
        {/* Filters */}
        <div className="bg-white shadow-sm border border-gray-200 px-4 py-4 md:px-6 mt-6 rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Courses</option>
              {courses.map(course => (
                <option key={course} value={course}>
                  {course.length > 30 ? course.substring(0, 30) + '...' : course}
                </option>
              ))}
            </select>

            <select
              value={memberTypeFilter}
              onChange={(e) => setMemberTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              {memberTypeOptions.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              {statusOptions.map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>

            <div className="text-sm text-gray-600 flex items-center justify-end sm:col-span-2 lg:col-span-1">
              <FaFilter className="w-4 h-4 mr-2" />
              Total: {filteredPaperSets.length} sets
            </div>
          </div>

          {/* Content */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          S.NO.
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Course Name
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Paper Name
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Duration
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Questions
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentItems.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                            <FaClipboard className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                            <p className="text-lg font-medium text-gray-900 mb-2">No paper sets available</p>
                            <p className="text-gray-600">No published paper sets found for your branch.</p>
                          </td>
                        </tr>
                      ) : (
                        currentItems.map((paperSet, index) => {
                          const availability = getAvailabilityStatus(paperSet.availableFrom, paperSet.availableTo);
                          return (
                            <tr key={paperSet.id} className="hover:bg-gray-50 transition-colors duration-200">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {indexOfFirstItem + index + 1}.
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                <div className="max-w-xs">
                                  <p className="font-medium truncate" title={paperSet.courseName}>
                                    {paperSet.courseName}
                                  </p>
                                  <p className="text-xs text-gray-500">{paperSet.courseCategory}</p>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                <div className="max-w-xs">
                                  <p className="truncate" title={paperSet.paperName}>
                                    {paperSet.paperName}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Total Marks: {paperSet.totalMarks}
                                  </p>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                <div className="whitespace-pre-line text-xs">
                                  {paperSet.duration}
                                </div>
                                <div className="flex items-center mt-1">
                                  <FaClock className="w-3 h-3 text-gray-400 mr-1" />
                                  <span className="text-xs">{paperSet.timeLimit} min</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                <div className="flex items-center justify-center">
                                  <FaQuestionCircle className="w-4 h-4 text-blue-500 mr-1" />
                                  <span className="font-medium text-gray-900">{paperSet.numberOfQuestions}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  {paperSet.perQuestionMark} marks each
                                </p>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getMemberTypeColor(paperSet.memberType)}`}>
                                  {paperSet.memberType}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="space-y-1">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(paperSet.status)}`}>
                                    {paperSet.status}
                                  </span>
                                  <br />
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${availability.color}`}>
                                    {availability.text}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => handlePreview(paperSet)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="View Details"
                                  >
                                    <FaEye className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={() => handleDownload(paperSet)}
                                    className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition-colors"
                                    title="Download Details"
                                  >
                                    <FaDownload className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden">
                  {currentItems.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <FaClipboard className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                      <p className="text-lg font-medium text-gray-900 mb-2">No paper sets available</p>
                      <p className="text-gray-600">No published paper sets found for your branch.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {currentItems.map((paperSet) => {
                        const availability = getAvailabilityStatus(paperSet.availableFrom, paperSet.availableTo);
                        return (
                          <div key={paperSet.id} className="p-4 hover:bg-gray-50">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <FaClipboard className="w-5 h-5 text-orange-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h3 className="text-sm font-bold text-gray-900 line-clamp-2">
                                      {paperSet.paperName}
                                    </h3>
                                    <p className="text-xs text-blue-600 font-medium">{paperSet.courseName}</p>
                                  </div>
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ml-2 whitespace-nowrap ${getStatusColor(paperSet.status)}`}>
                                    {paperSet.status}
                                  </span>
                                </div>

                                <div className="mt-2 text-xs text-gray-600 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded-full ${getMemberTypeColor(paperSet.memberType)}`}>
                                      {paperSet.memberType}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full ${availability.color}`}>
                                      {availability.text}
                                    </span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-xs text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <FaQuestionCircle className="text-blue-500" />
                                    <span>{paperSet.numberOfQuestions} Qs ({paperSet.perQuestionMark} ea)</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <FaClock className="text-gray-400" />
                                    <span>{paperSet.timeLimit} min</span>
                                  </div>
                                </div>

                                <div className="mt-3 flex justify-end gap-2">
                                  <button
                                    onClick={() => handlePreview(paperSet)}
                                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium bg-blue-50 px-3 py-1.5 rounded"
                                  >
                                    <FaEye /> View
                                  </button>
                                  <button
                                    onClick={() => handleDownload(paperSet)}
                                    className="flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700 font-medium bg-orange-50 px-3 py-1.5 rounded"
                                  >
                                    <FaDownload /> Download
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-700 text-center sm:text-left">
                    Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to <span className="font-medium">{Math.min(indexOfLastItem, filteredPaperSets.length)}</span> of <span className="font-medium">{filteredPaperSets.length}</span> paper sets
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

        {/* Preview Modal */}
        {showPreviewModal && selectedPaperSet && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
            <div className="bg-white/95 backdrop-blur-sm rounded-t-xl sm:rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-white/20 transform transition-transform duration-300">
              <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">Paper Set Details</h3>
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="px-6 py-4">
                {/* Paper Set Overview */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-600 text-white p-3 rounded-lg">
                      <FaFileAlt className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedPaperSet.paperName}</h2>
                      <p className="text-blue-600 font-medium">{selectedPaperSet.courseName}</p>
                      <p className="text-gray-600">{selectedPaperSet.courseCategory}</p>
                    </div>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                    <FaQuestionCircle className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{selectedPaperSet.numberOfQuestions}</p>
                    <p className="text-sm text-gray-600">Questions</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                    <FaClock className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{selectedPaperSet.timeLimit}</p>
                    <p className="text-sm text-gray-600">Minutes</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                    <span className="text-2xl">🏆</span>
                    <p className="text-2xl font-bold text-gray-900">{selectedPaperSet.totalMarks}</p>
                    <p className="text-sm text-gray-600">Total Marks</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                    <span className="text-2xl">⚡</span>
                    <p className="text-2xl font-bold text-gray-900">{selectedPaperSet.perQuestionMark}</p>
                    <p className="text-sm text-gray-600">Per Question</p>
                  </div>
                </div>

                {/* Detailed Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Paper Configuration</h4>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Per Question Mark:</span>
                          <span className="font-medium">{selectedPaperSet.perQuestionMark}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Minus Marking:</span>
                          <span className="font-medium">{selectedPaperSet.minusMarking}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Member Type:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMemberTypeColor(selectedPaperSet.memberType)}`}>
                            {selectedPaperSet.memberType}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Availability</h4>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Available From:</span>
                          <span className="font-medium">{formatDate(selectedPaperSet.availableFrom)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Available To:</span>
                          <span className="font-medium">{formatDate(selectedPaperSet.availableTo)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Current Status:</span>
                          {(() => {
                            const availability = getAvailabilityStatus(selectedPaperSet.availableFrom, selectedPaperSet.availableTo);
                            return (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${availability.color}`}>
                                {availability.text}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Administrative Info</h4>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Created By:</span>
                          <span className="font-medium">{selectedPaperSet.created_by}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Created On:</span>
                          <span className="font-medium">{formatDate(selectedPaperSet.created_at)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedPaperSet.status)}`}>
                            {selectedPaperSet.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Test Instructions</h4>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <ul className="text-sm text-gray-700 space-y-2">
                          <li>• Read all questions carefully before answering</li>
                          <li>• Each question carries {selectedPaperSet.perQuestionMark} marks</li>
                          <li>• Wrong answers will result in {selectedPaperSet.minusMarking} mark deduction</li>
                          <li>• Total time limit: {selectedPaperSet.timeLimit} minutes</li>
                          <li>• Submit your test before time expires</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 sticky bottom-0">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => handleDownload(selectedPaperSet)}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
                >
                  <FaDownload className="w-4 h-4" />
                  <span>Download Details</span>
                </button>
                {/* You can add a button or content here if needed for 'active' status */}
              </div>
            </div>
          </div>
        )}
        {/* Toast Container */}
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </div>
    </BranchLayout>
  );
};

export default BranchPaperSet;
