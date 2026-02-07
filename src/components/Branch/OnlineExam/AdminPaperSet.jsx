import { useState, useEffect } from 'react';
import { FaClipboard, FaPlus, FaEdit, FaTrash, FaSearch, FaEye, FaUpload, FaClock, FaQuestionCircle, FaCalendarAlt, FaFileAlt, FaChevronRight, FaTimes } from 'react-icons/fa';
import BranchLayout from '../BranchLayout';
import { branchCourseService } from '../../../services/branchCourseService';
import { paperSetService } from '../../../services/paperSetService';
import { getUserData } from '../../../utils/authUtils';
import UploadQuestionPaperModal from './UploadQuestionPaperModal';

const AdminPaperSet = () => {
  const [paperSets, setPaperSets] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedPaperSet, setSelectedPaperSet] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [paperSetForUpload, setPaperSetForUpload] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [branchCode, setBranchCode] = useState('');
  const [franchiseCode, setFranchiseCode] = useState('');
  const [userData, setUserData] = useState(null);

  // Form state for paper set creation/editing
  const [formData, setFormData] = useState({
    courseCategory: '',
    courseId: '',
    courseName: '',
    paperName: '',
    numberOfQuestions: '',
    perQuestionMark: '',
    minusMarking: '',
    timeLimit: '',
    availableFrom: '',
    availableTo: '',
    memberType: 'Demo Test',
    status: 'draft'
  });

  // Get branch context from authentication
  useEffect(() => {
    const userInfo = getUserData();
    console.log('📋 [AdminPaperSet] User data:', userInfo);

    if (userInfo) {
      setUserData(userInfo);
      setBranchCode(userInfo.branch_code || userInfo.franchise_code || '');
      setFranchiseCode(userInfo.franchise_code || '');
    }
  }, []);

  // Load courses dynamically from API
  const loadCourses = async () => {
    try {
      setCoursesLoading(true);
      setError(null);

      console.log('📚 [AdminPaperSet] Loading courses...');

      const response = await branchCourseService.getCourses();
      console.log('📚 [AdminPaperSet] Courses response:', response);

      if (response.success && response.data) {
        setCourses(response.data);
        console.log('✅ [AdminPaperSet] Loaded courses:', response.data.length);
      } else {
        console.error('❌ [AdminPaperSet] Error loading courses:', response.error);
        setCourses([]);
        setError('Failed to load courses');
      }
    } catch (error) {
      console.error('❌ [AdminPaperSet] Error loading courses:', error);
      setCourses([]);
      setError('Failed to load courses');
    } finally {
      setCoursesLoading(false);
    }
  };

  // Load paper sets from API
  const loadPaperSets = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📋 [AdminPaperSet] Loading paper sets...');

      const response = await paperSetService.getPaperSets();
      console.log('📋 [AdminPaperSet] Paper sets response:', response);

      if (response && response.success && response.data) {
        // Ensure data is always an array - handle nested response structure
        let paperSetsData = response.data;

        // If response.data has a 'data' property, use that instead
        if (response.data.data && Array.isArray(response.data.data)) {
          paperSetsData = response.data.data;
        } else if (!Array.isArray(paperSetsData)) {
          paperSetsData = [];
        }

        console.log('✅ [AdminPaperSet] Final paper sets data:', paperSetsData);
        setPaperSets(paperSetsData);
        console.log('✅ [AdminPaperSet] Loaded paper sets:', paperSetsData.length);
      } else {
        console.error('❌ [AdminPaperSet] Error loading paper sets:', response?.error);
        setPaperSets([]);
        // Don't set error for empty state - it's normal
        if (response?.error !== 'Failed to fetch paper sets') {
          setError('Failed to load paper sets: ' + (response?.error || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('❌ [AdminPaperSet] Error loading paper sets:', error);
      setPaperSets([]);
      setError('Failed to load paper sets');
    } finally {
      setLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    loadCourses();
    loadPaperSets();
  }, [branchCode, franchiseCode]);

  const statusOptions = ['draft', 'published', 'archived'];
  const memberTypeOptions = ['Demo Test', 'Full Test'];
  const courseCategoryOptions = [
    'Engineering',
    'Medical',
    'Banking',
    'SSC',
    'Railways',
    'Defence',
    'Civil Services',
    'State Exams',
    'IT & Software',
    'Management',
    'Other'
  ];

  // Handle course selection change
  const handleCourseChange = (courseId) => {
    const selectedCourse = courses.find(course => course.id === courseId);
    setFormData(prev => ({
      ...prev,
      courseId: courseId,
      courseName: selectedCourse ? selectedCourse.course_name : ''
    }));
  };

  // Filter paper sets - ensure paperSets is always an array
  const filteredPaperSets = Array.isArray(paperSets) ? paperSets.filter(set => {
    const matchesSearch = set.paperName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      set.courseName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === '' || set.status === statusFilter;
    const matchesCourse = courseFilter === '' || set.courseName === courseFilter;
    return matchesSearch && matchesStatus && matchesCourse;
  }) : [];

  // Handle create new paper set
  const handleCreate = () => {
    setFormData({
      courseCategory: '',
      courseId: '',
      courseName: '',
      paperName: '',
      numberOfQuestions: '',
      perQuestionMark: '',
      minusMarking: '',
      timeLimit: '',
      availableFrom: '',
      availableTo: '',
      memberType: 'Demo Test',
      status: 'draft'
    });
    setSelectedPaperSet(null);
    setShowModal(true);
  };

  // Handle edit paper set
  const handleEdit = (paperSet) => {
    setFormData({
      courseCategory: paperSet.courseCategory || '',
      courseId: paperSet.courseId || '',
      courseName: paperSet.courseName || '',
      paperName: paperSet.paperName || '',
      numberOfQuestions: paperSet.numberOfQuestions || '',
      perQuestionMark: paperSet.perQuestionMark || '',
      minusMarking: paperSet.minusMarking || '',
      timeLimit: paperSet.timeLimit || '',
      availableFrom: paperSet.availableFrom || '',
      availableTo: paperSet.availableTo || '',
      memberType: paperSet.memberType || 'Demo Test',
      status: paperSet.status || 'draft'
    });
    setSelectedPaperSet(paperSet);
    setShowModal(true);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Validate required fields
      if (!formData.courseId || !formData.paperName || !formData.numberOfQuestions) {
        alert('Please fill in all required fields');
        return;
      }

      const paperSetData = {
        ...formData,
        branchCode: branchCode,
        franchiseCode: franchiseCode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: userData?.name || userData?.email || 'Admin'
      };

      let response;
      if (selectedPaperSet) {
        // Update existing paper set
        response = await paperSetService.updatePaperSet(selectedPaperSet.id, paperSetData);
      } else {
        // Create new paper set
        response = await paperSetService.createPaperSet(paperSetData);
      }

      if (response.success) {
        setShowModal(false);
        // Reload paper sets to get updated data
        await loadPaperSets();
      } else {
        alert('Failed to save paper set: ' + response.error);
      }
    } catch (error) {
      console.error('Error saving paper set:', error);
      alert('Failed to save paper set. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete paper set
  const handleDelete = async (paperSetId) => {
    if (window.confirm('Are you sure you want to delete this paper set?')) {
      try {
        const response = await paperSetService.deletePaperSet(paperSetId);

        if (response.success) {
          // Reload paper sets to get updated data
          await loadPaperSets();
        } else {
          alert('Failed to delete paper set: ' + response.error);
        }
      } catch (error) {
        console.error('Error deleting paper set:', error);
        alert('Failed to delete paper set. Please try again.');
      }
    }
  };

  // Handle preview paper set
  const handlePreview = (paperSet) => {
    setSelectedPaperSet(paperSet);
    setShowPreviewModal(true);
  };

  // Handle upload questions
  const handleUpload = (paperSet) => {
    setPaperSetForUpload(paperSet);
    setShowUploadModal(true);
  };

  const handleUploadSuccess = () => {
    setShowUploadModal(false);
    setPaperSetForUpload(null);
    loadPaperSets(); // Refresh the list
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get member type color
  const getMemberTypeColor = (type) => {
    return type === 'Full Test'
      ? 'bg-purple-100 text-purple-800'
      : 'bg-indigo-100 text-indigo-800';
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
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 sm:px-6 py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start space-x-3">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-2.5 rounded-lg flex-shrink-0 shadow-md">
                  <FaClipboard className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900">Paper Set Management</h1>
                  <p className="text-sm md:text-base text-gray-600 mt-1">
                    Create and manage online exam paper sets
                  </p>
                  {/* Mobile only info */}
                  <div className="sm:hidden text-xs text-gray-500 mt-1 space-x-2">
                    {branchCode && <span>Branch: {branchCode}</span>}
                  </div>
                </div>
              </div>
              <button
                onClick={handleCreate}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg flex items-center justify-center space-x-2 transition-all duration-200 shadow-md hover:shadow-lg w-full md:w-auto font-medium"
              >
                <FaPlus className="w-4 h-4" />
                <span>Create New Paper</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 py-4 sticky top-0 z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search papers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="">All Status</option>
              {statusOptions.map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="">All Courses</option>
              {courses.map(course => (
                <option key={course.id} value={course.course_name}>
                  {course.course_name}
                </option>
              ))}
            </select>

            <div className="text-sm text-gray-600 flex items-center justify-center sm:justify-start font-medium bg-gray-50 py-2 rounded-lg border border-dashed border-gray-300">
              Total: {filteredPaperSets.length} paper sets
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 bg-gray-50 min-h-[calc(100vh-200px)]">
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm">
              <div className="flex items-center">
                <div className="text-red-500 mr-3">
                  <FaFileAlt className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-red-800 font-bold">Error</p>
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {coursesLoading && (
            <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg shadow-sm animate-pulse">
              <div className="flex items-center">
                <div className="mr-3">
                  <FaClock className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-blue-800 font-medium">Loading courses from server...</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-500 font-medium">Loading paper sets...</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                <div className="overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-700">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">S.NO.</th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Course Name</th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Paper Name</th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Duration</th>
                        <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">Questions</th>
                        <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {currentItems.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="px-6 py-16 text-center text-gray-500">
                            <div className="flex flex-col items-center justify-center">
                              <div className="bg-gray-100 p-4 rounded-full mb-4">
                                <FaClipboard className="w-8 h-8 text-gray-400" />
                              </div>
                              <p className="text-lg font-bold text-gray-900 mb-1">No paper sets found</p>
                              <p className="text-gray-500 text-sm">Try adjusting your search or filters, or create a new paper set.</p>
                              <button
                                onClick={handleCreate}
                                className="mt-4 text-blue-600 font-medium hover:text-blue-800 hover:underline"
                              >
                                Create your first paper set
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        currentItems.map((paperSet, index) => (
                          <tr key={paperSet.id} className="hover:bg-blue-50/50 transition-colors duration-200 group">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">
                              {indexOfFirstItem + index + 1}.
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <div className="max-w-xs">
                                <p className="font-semibold text-gray-900 text-base">{paperSet.courseName}</p>
                                <p className="text-xs text-gray-500 mt-0.5 inline-block px-2 py-0.5 bg-gray-100 rounded-full">{paperSet.courseCategory}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 group-hover:text-blue-700">
                              {paperSet.paperName}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              <div className="flex items-center">
                                <FaClock className="text-gray-400 mr-2 w-3.5 h-3.5" />
                                {paperSet.timeLimit ? `${paperSet.timeLimit} min` : 'Not set'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                              <div className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-gray-100 text-gray-800">
                                <FaQuestionCircle className="mr-1.5 w-3.5 h-3.5 text-gray-500" />
                                {paperSet.numberOfQuestions}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex flex-col items-center gap-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(paperSet.status)}`}>
                                  {paperSet.status}
                                </span>
                                <button
                                  onClick={() => handleUpload(paperSet)}
                                  className="text-xs font-semibold text-orange-600 hover:text-orange-800 hover:underline flex items-center"
                                >
                                  <FaUpload className="mr-1 w-3 h-3" />
                                  Upload Qs
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <button
                                  onClick={() => handlePreview(paperSet)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                                  title="Preview Details"
                                >
                                  <FaEye className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => handleEdit(paperSet)}
                                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-200"
                                  title="Edit Paper"
                                >
                                  <FaEdit className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => handleDelete(paperSet.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                                  title="Delete"
                                >
                                  <FaTrash className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card View (visible only on small screens) */}
              <div className="md:hidden grid grid-cols-1 gap-4">
                {currentItems.length === 0 ? (
                  <div className="bg-white p-8 rounded-xl shadow-sm text-center border border-gray-200">
                    <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FaClipboard className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">No paper sets found</h3>
                    <p className="text-gray-500 text-sm mb-4">Create your first paper set to get started.</p>
                    <button
                      onClick={handleCreate}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium w-full"
                    >
                      Create Paper Set
                    </button>
                  </div>
                ) : (
                  currentItems.map((paperSet, index) => (
                    <div key={paperSet.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
                      {/* Status Stripe */}
                      <div className={`absolute top-0 left-0 w-1 h-full ${paperSet.status === 'published' ? 'bg-green-500' :
                        paperSet.status === 'draft' ? 'bg-yellow-400' : 'bg-gray-400'
                        }`}></div>

                      <div className="p-4 pl-5">
                        {/* Header: Name and Status */}
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-base font-bold text-gray-900 leading-tight mb-1">{paperSet.paperName}</h3>
                            <p className="text-sm text-gray-600 font-medium">{paperSet.courseName}</p>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold uppercase ${getStatusColor(paperSet.status)}`}>
                            {paperSet.status}
                          </span>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="bg-gray-50 p-2 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase font-semibold mb-0.5">Category</p>
                            <p className="text-sm font-medium text-gray-800 truncate">{paperSet.courseCategory}</p>
                          </div>
                          <div className="bg-gray-50 p-2 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase font-semibold mb-0.5">Duration</p>
                            <p className="text-sm font-medium text-gray-800 flex items-center">
                              <FaClock className="w-3 h-3 text-gray-400 mr-1.5" />
                              {paperSet.timeLimit ? `${paperSet.timeLimit} m` : '-'}
                            </p>
                          </div>
                          <div className="bg-gray-50 p-2 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase font-semibold mb-0.5">Questions</p>
                            <p className="text-sm font-medium text-gray-800 flex items-center">
                              <FaQuestionCircle className="w-3 h-3 text-gray-400 mr-1.5" />
                              {paperSet.numberOfQuestions}
                            </p>
                          </div>
                          <div className="bg-gray-50 p-2 rounded-lg">
                            <button
                              onClick={() => handleUpload(paperSet)}
                              className="w-full h-full flex items-center justify-center text-sm font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors border border-orange-100"
                            >
                              <FaUpload className="mr-1.5 w-3 h-3" />
                              Upload Qs
                            </button>
                          </div>
                        </div>

                        {/* Actions Footer */}
                        <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-3">
                          <div className="text-xs text-gray-400 font-medium">
                            #{indexOfFirstItem + index + 1}
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handlePreview(paperSet)}
                              className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                            >
                              <FaEye className="mr-1.5" /> Details
                            </button>
                            <button
                              onClick={() => handleEdit(paperSet)}
                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
                              title="Edit"
                            >
                              <FaEdit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(paperSet.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                              title="Delete"
                            >
                              <FaTrash className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                  <div className="text-sm text-gray-600 font-medium order-2 sm:order-1">
                    Showing <span className="text-gray-900 font-bold">{indexOfFirstItem + 1}</span> to <span className="text-gray-900 font-bold">{Math.min(indexOfLastItem, filteredPaperSets.length)}</span> of <span className="text-gray-900 font-bold">{filteredPaperSets.length}</span>
                  </div>
                  <div className="flex items-center space-x-2 order-1 sm:order-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <div className="hidden sm:flex items-center space-x-1">
                      {[...Array(totalPages)].map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${currentPage === i + 1
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                    <span className="sm:hidden text-sm font-medium text-gray-900 bg-gray-100 px-3 py-2 rounded-lg">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <form onSubmit={handleSubmit} className="flex flex-col h-full">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10 flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {selectedPaperSet ? 'Edit Paper Set' : 'Create New Paper Set'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Fill in the details below to configure your exam paper.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                  >
                    <FaTimes className="w-5 h-5" />
                    {/* Create a hidden FaTimes component or import it if missing. The code block has FaTimes used in UploadModal but not imported here possibly? Checking imports... FaTimes IS NOT imported in AdminPaperSet. Adding it. */}
                  </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
                    <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center">
                      <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-3 text-sm font-bold">1</span>
                      Course Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Course Category <span className="text-red-500">*</span>
                        </label>
                        <select
                          required
                          value={formData.courseCategory}
                          onChange={(e) => setFormData({ ...formData, courseCategory: e.target.value })}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                        >
                          <option value="">Select Category</option>
                          {courseCategoryOptions.map((category) => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Course Name <span className="text-red-500">*</span>
                        </label>
                        <select
                          required
                          value={formData.courseId}
                          onChange={(e) => handleCourseChange(e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                          disabled={coursesLoading}
                        >
                          <option value="">
                            {coursesLoading ? 'Loading...' : 'Select Course'}
                          </option>
                          {courses.map((course) => (
                            <option key={course.id} value={course.id}>
                              {course.course_code} - {course.course_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
                    <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center">
                      <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mr-3 text-sm font-bold">2</span>
                      Paper Details
                    </h4>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Paper Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.paperName}
                        onChange={(e) => setFormData(prev => ({ ...prev, paperName: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                        placeholder="e.g. Full Syllabus Mock Test 1"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Total Questions
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={formData.numberOfQuestions}
                            onChange={(e) => setFormData(prev => ({ ...prev, numberOfQuestions: e.target.value }))}
                            className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            placeholder="0"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400 text-xs">Qs</div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Marks / Question
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            value={formData.perQuestionMark}
                            onChange={(e) => setFormData(prev => ({ ...prev, perQuestionMark: e.target.value }))}
                            className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            placeholder="0"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400 text-xs">Pts</div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Negative Marks
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            value={formData.minusMarking}
                            onChange={(e) => setFormData(prev => ({ ...prev, minusMarking: e.target.value }))}
                            className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-red-600"
                            placeholder="0"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-red-400 text-xs">Pts</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Time Limit (Minutes)
                      </label>
                      <div className="relative max-w-xs">
                        <FaClock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="number"
                          value={formData.timeLimit}
                          onChange={(e) => setFormData(prev => ({ ...prev, timeLimit: e.target.value }))}
                          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="e.g. 120"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center">
                      <span className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mr-3 text-sm font-bold">3</span>
                      Settings & Availability
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Available From
                        </label>
                        <input
                          type="date"
                          value={formData.availableFrom}
                          onChange={(e) => setFormData(prev => ({ ...prev, availableFrom: e.target.value }))}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Available To
                        </label>
                        <input
                          type="date"
                          value={formData.availableTo}
                          onChange={(e) => setFormData(prev => ({ ...prev, availableTo: e.target.value }))}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Test Type
                        </label>
                        <div className="flex gap-4">
                          <label className={`flex-1 flex items-center justify-center px-4 py-3 rounded-lg border cursor-pointer transition-all ${formData.memberType === 'Demo Test' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                            <input
                              type="radio"
                              name="memberType"
                              value="Demo Test"
                              checked={formData.memberType === 'Demo Test'}
                              onChange={(e) => setFormData(prev => ({ ...prev, memberType: e.target.value }))}
                              className="hidden"
                            />
                            <span className="text-sm font-bold">Demo Test</span>
                          </label>
                          <label className={`flex-1 flex items-center justify-center px-4 py-3 rounded-lg border cursor-pointer transition-all ${formData.memberType === 'Full Test' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                            <input
                              type="radio"
                              name="memberType"
                              value="Full Test"
                              checked={formData.memberType === 'Full Test'}
                              onChange={(e) => setFormData(prev => ({ ...prev, memberType: e.target.value }))}
                              className="hidden"
                            />
                            <span className="text-sm font-bold">Full Test</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Status
                        </label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-white sticky bottom-0 z-10 flex gap-3 justify-end shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {loading ? (
                      <>Saving...</>
                    ) : (
                      <>{selectedPaperSet ? 'Update Paper' : 'Create Paper'}</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreviewModal && selectedPaperSet && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10 shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Paper Details</h3>
                </div>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="bg-blue-50 rounded-xl p-5 mb-6 text-center">
                  <h2 className="text-xl font-bold text-blue-900 mb-1">{selectedPaperSet.paperName}</h2>
                  <p className="text-blue-600 font-medium">{selectedPaperSet.courseName}</p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor(selectedPaperSet.status)}`}>
                      {selectedPaperSet.status}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getMemberTypeColor(selectedPaperSet.memberType)}`}>
                      {selectedPaperSet.memberType}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border border-gray-100 bg-gray-50/50">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Questions</p>
                    <p className="text-lg font-bold text-gray-900">{selectedPaperSet.numberOfQuestions}</p>
                  </div>
                  <div className="p-4 rounded-lg border border-gray-100 bg-gray-50/50">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Duration</p>
                    <p className="text-lg font-bold text-gray-900">{selectedPaperSet.timeLimit} mins</p>
                  </div>
                  <div className="p-4 rounded-lg border border-gray-100 bg-gray-50/50">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Marks / Q</p>
                    <p className="text-lg font-bold text-green-600">+{selectedPaperSet.perQuestionMark}</p>
                  </div>
                  <div className="p-4 rounded-lg border border-gray-100 bg-gray-50/50">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Negative Marking</p>
                    <p className="text-lg font-bold text-red-500">-{selectedPaperSet.minusMarking}</p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="text-sm font-medium text-gray-600">Available From</span>
                    <span className="text-sm font-bold text-gray-900">{formatDate(selectedPaperSet.availableFrom)}</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="text-sm font-medium text-gray-600">Available To</span>
                    <span className="text-sm font-bold text-gray-900">{formatDate(selectedPaperSet.availableTo)}</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="text-sm font-medium text-gray-600">Created By</span>
                    <span className="text-sm font-bold text-gray-900">{selectedPaperSet.created_by || 'Admin'}</span>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 sticky bottom-0 z-10 flex justify-end shrink-0">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm shadow-md"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Questions Modal */}
        <UploadQuestionPaperModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          paperSet={paperSetForUpload}
          onUploadSuccess={handleUploadSuccess}
        />
      </div>
    </BranchLayout>
  );
};



export default AdminPaperSet;
