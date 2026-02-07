import { useState, useEffect } from 'react';
import { FaFileAlt, FaSearch, FaEye, FaDownload, FaPrint, FaGraduationCap, FaCalendarAlt, FaChartBar } from 'react-icons/fa';
import { certificatesAPI } from '../../../api/certificatesApi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


const BranchMarksheet = () => {
  const [marksheets, setMarksheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [selectedMarksheet, setSelectedMarksheet] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Preview states for marksheet file (image/pdf)
  const [previewFileUrl, setPreviewFileUrl] = useState(null);
  const [previewMime, setPreviewMime] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const cleanupPreview = () => {
    if (previewFileUrl) {
      try { URL.revokeObjectURL(previewFileUrl); } catch (e) {}
      setPreviewFileUrl(null);
    }
    setPreviewMime(null);
    setPreviewLoading(false);
  };


  const statusOptions = ['published', 'draft', 'withheld'];
  const resultOptions = ['pass', 'fail', 'compartment'];

  // Load marksheets
  const loadMarksheets = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await certificatesAPI.getMarksheets();

      // Normalize different possible response shapes
      let rawMarksheets = [];
      if (response && Array.isArray(response)) {
        rawMarksheets = response;
      } else if (response && Array.isArray(response.marksheets)) {
        rawMarksheets = response.marksheets;
      } else if (response && response.success && Array.isArray(response.data)) {
        rawMarksheets = response.data;
      } else if (response && response.success && Array.isArray(response.marksheets)) {
        rawMarksheets = response.marksheets;
      } else {
        throw new Error(response?.message || `Failed to load marksheets (unexpected response): ${JSON.stringify(response)}`);
      }

      // Normalize each marksheet to expected UI fields with safe defaults
      const normalize = (m) => {
        const safe = (v) => v === undefined || v === null ? '' : v;
        return {
          ...m,
          id: safe(m.id || m._id || (m._id && m._id.$oid) || ''),
          studentName: safe(m.student_name || m.studentName || m.name || ''),
          registrationNumber: safe(m.student_registration || m.registration_number || m.registrationNumber || ''),
          courseName: safe(m.course_name || m.courseName || ''),
          programName: safe(m.program_name || m.programName || ''),
          semester: safe(m.semester || ''),
          obtainedMarks: safe(m.obtained_marks || m.obtainedMarks || 0),
          totalMarks: safe(m.total_marks || m.totalMarks || 0),
          percentage: safe(m.percentage || (m.obtained_marks && m.total_marks ? ((m.obtained_marks / m.total_marks) * 100).toFixed(2) : m.percentage) || 0),
          grade: safe(m.grade || ''),
          result: safe(m.result || ''),
          status: safe(m.status || ''),
          examDate: safe(m.exam_date || m.examDate || ''),
          resultDate: safe(m.result_date || m.resultDate || ''),
          created_by: safe(m.created_by || m.createdBy || ''),
          file_path: safe(m.file_path || m.filePath || ''),
        };
      };

      const normalized = rawMarksheets.map(normalize);
      setMarksheets(normalized);
    } catch (error) {
      console.error('Error loading marksheets:', error);
      setError('Failed to load marksheets');
      toast.error('Failed to load marksheets');
      setMarksheets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarksheets();
  }, []);

  // Filter marksheets
  const filteredMarksheets = Array.isArray(marksheets) ? marksheets.filter(sheet => {
    const matchesSearch = sheet.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sheet.student_registration?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sheet.course_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === '' || sheet.status === statusFilter;
    const matchesSemester = semesterFilter === '' || sheet.semester === semesterFilter;
    const matchesResult = resultFilter === '' || sheet.result === resultFilter;
    return matchesSearch && matchesStatus && matchesSemester && matchesResult;
  }) : [];

  // Handle preview marksheet: fetch actual marksheet file (if available) and show it
  const handlePreview = async (marksheet) => {
    try {
      setSelectedMarksheet(marksheet);
      setShowPreviewModal(true);
      cleanupPreview();

      if (marksheet && (marksheet.file_path || marksheet.id)) {
        setPreviewLoading(true);
        try {
          const response = await certificatesAPI.downloadMarksheet(marksheet.id || marksheet._id);
          if (!response.ok) {
            console.warn('Preview file not available via download endpoint, showing template view');
            setPreviewLoading(false);
            return;
          }

          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setPreviewFileUrl(url);
          setPreviewMime(blob.type || null);
          setPreviewLoading(false);
        } catch (err) {
          console.error('Error fetching marksheet preview file:', err);
          setPreviewLoading(false);
        }
      }
    } catch (err) {
      console.error('Error preparing marksheet preview:', err);
      setShowPreviewModal(true);
    }
  };

  // Handle download marksheet
  const handleDownload = async (marksheet) => {
    try {
      const response = await certificatesAPI.downloadMarksheet(marksheet.id);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `marksheet-${marksheet.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        alert('Marksheet downloaded successfully!');
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Error downloading marksheet:', error);
      alert('Failed to download marksheet.');
    }
  };

  // Handle print marksheet
  const handlePrint = (marksheet) => {
    // In a real implementation, this would open print dialog
    console.log('Printing marksheet for:', marksheet.studentName);
    alert(`Printing marksheet for ${marksheet.studentName} (Feature not implemented yet)`);
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'published':
        return 'bg-orange-100 text-orange-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'withheld':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get grade color
  const getGradeColor = (grade) => {
    if (['A+', 'A'].includes(grade)) return 'text-orange-600 bg-orange-50';
    if (['B+', 'B'].includes(grade)) return 'text-blue-600 bg-blue-50';
    if (['C+', 'C'].includes(grade)) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  // Get result color
  const getResultColor = (result) => {
    switch (result) {
      case 'pass':
        return 'bg-orange-100 text-orange-800';
      case 'fail':
        return 'bg-red-100 text-red-800';
      case 'compartment':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Not published';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredMarksheets.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredMarksheets.length / itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-2 rounded-lg">
                  <FaFileAlt className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-secondary-900">📋 Available Marksheets</h1>
                  <p className="text-sm text-secondary-600 mt-1">View student marksheets created by your franchise</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="bg-blue-50 px-4 py-2 rounded-lg">
                  <span className="text-sm font-medium text-blue-700">
                    Total: {filteredMarksheets.length}
                  </span>
                </div>
                <div className="bg-orange-50 px-4 py-2 rounded-lg">
                  <span className="text-sm font-medium text-orange-700">
                    Published: {Array.isArray(filteredMarksheets) ? filteredMarksheets.filter(m => m.status === 'published').length : 0}
                  </span>
                </div>
                <div className="bg-purple-50 px-4 py-2 rounded-lg">
                  <span className="text-sm font-medium text-purple-700">
                    Pass Rate: {Array.isArray(filteredMarksheets) && filteredMarksheets.length > 0 ? Math.round((filteredMarksheets.filter(m => m.result === 'pass').length / filteredMarksheets.length) * 100) : 0}%
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
                placeholder="Search marksheets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full border border-secondary-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="">--- All Status ---</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="px-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="">--- All Semesters ---</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <option key={sem} value={sem}>Semester {sem}</option>
              ))}
            </select>

            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className="px-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="">--- All Results ---</option>
              {resultOptions.map((result) => (
                <option key={result} value={result}>
                  {result.charAt(0).toUpperCase() + result.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Marksheets Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
                    <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">S.No.</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">Student Details</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">Course Info</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Semester</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Academic Performance</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Result Details</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Status</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-12 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          <span className="text-sm text-gray-500">Loading marksheets...</span>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-12 text-center">
                        <div className="text-red-600 text-sm">{error}</div>
                        <button
                          onClick={loadMarksheets}
                          className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
                        >
                          Try again
                        </button>
                      </td>
                    </tr>
                  ) : currentItems.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-12 text-center text-sm text-gray-500">
                        No marksheets found matching your criteria
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((marksheet, index) => (
                      <tr key={marksheet.id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-4 py-4">
                          <span className="text-sm font-medium text-secondary-900">
                            {indexOfFirstItem + index + 1}.
                          </span>
                        </td>
                        
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <h3 className="text-sm font-semibold text-secondary-900">{marksheet.studentName}</h3>
                            <p className="text-xs text-blue-600 font-medium">{marksheet.registrationNumber}</p>
                          </div>
                        </td>
                        
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-secondary-900 max-w-xs">
                              {marksheet.courseName}
                            </div>
                            <div className="text-xs text-purple-600">{marksheet.programName}</div>
                            {marksheet.created_by ? (
                              <div className="text-xs text-gray-500">By: {marksheet.created_by}</div>
                            ) : null}
                          </div>
                        </td>
                        
                        <td className="px-4 py-4 text-center">
                          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                            <FaGraduationCap className="w-3 h-3 mr-1" />
                            Sem {marksheet.semester}
                          </div>
                        </td>
                        
                        <td className="px-4 py-4 text-center">
                          <div className="space-y-2">
                            <div className="text-sm font-semibold text-gray-900">
                              {marksheet.obtainedMarks}/{marksheet.totalMarks}
                            </div>
                            <div className="text-xs text-blue-600 font-medium">
                              {marksheet.percentage}%
                            </div>
                            <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getGradeColor(marksheet.grade)}`}>
                              Grade: {marksheet.grade}
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div 
                                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" 
                                style={{
                                  width: `${Math.min(marksheet.percentage, 100)}%`
                                }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-4 py-4 text-center">
                          <div className="space-y-2">
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getResultColor(marksheet.result)}`}>
                              {marksheet.result ? (marksheet.result.charAt(0).toUpperCase() + marksheet.result.slice(1)) : 'NA'}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-center space-x-1 text-xs text-orange-600">
                                <FaCalendarAlt className="w-3 h-3" />
                                <span>Exam: {formatDate(marksheet.examDate)}</span>
                              </div>
                              <div className="flex items-center justify-center space-x-1 text-xs text-blue-600">
                                <FaCalendarAlt className="w-3 h-3" />
                                <span>Result: {formatDate(marksheet.resultDate)}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-4 py-4 text-center">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(marksheet.status)}`}>
                            {marksheet.status ? (marksheet.status.charAt(0).toUpperCase() + marksheet.status.slice(1)) : 'Unknown'}
                          </span>
                        </td>
                        
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => handlePreview(marksheet)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="View Marksheet"
                            >
                              <FaEye className="w-4 h-4" />
                            </button>
                            
                            {marksheet.status === 'published' && (
                              <>
                                <button
                                  onClick={() => handleDownload(marksheet)}
                                  className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition-colors"
                                  title="Download Marksheet"
                                >
                                  <FaDownload className="w-4 h-4" />
                                </button>
                                
                                <button
                                  onClick={() => handlePrint(marksheet)}
                                  className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                  title="Print Marksheet"
                                >
                                  <FaPrint className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredMarksheets.length)} of {filteredMarksheets.length} marksheets
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md">
                      {currentPage} of {totalPages}
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

        {/* Marksheet Preview Modal */}
        {showPreviewModal && selectedMarksheet && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">Marksheet Preview</h3>
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Marksheet Preview: show template only when no generated file is available */}
              {!previewFileUrl && (
                <div className="px-6 py-8">
                  <div className="border-2 border-blue-500 rounded-lg p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
                    <div className="text-center space-y-4 mb-6">
                      <div className="flex justify-center">
                        <FaFileAlt className="w-16 h-16 text-blue-600" />
                      </div>
                      
                      <h1 className="text-3xl font-bold text-gray-900">MARKSHEET</h1>
                      
                      <div className="grid grid-cols-2 gap-4 text-left">
                        <div>
                          <p className="text-sm text-gray-600">Student Name:</p>
                          <p className="font-semibold text-lg">{selectedMarksheet.studentName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Registration No:</p>
                          <p className="font-mono font-medium">{selectedMarksheet.registrationNumber}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-left">
                        <div>
                          <p className="text-sm text-gray-600">Course:</p>
                          <p className="font-medium">{selectedMarksheet.courseName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Program:</p>
                          <p className="font-medium">{selectedMarksheet.programName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Semester:</p>
                          <p className="font-medium">{selectedMarksheet.semester}</p>
                        </div>
                      </div>
                    </div>

                    {/* Subjects Table */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-3">Subject-wise Marks</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border border-gray-300">
                          <thead>
                            <tr className="bg-blue-100">
                              <th className="border border-gray-300 px-4 py-2 text-left">Subject</th>
                              <th className="border border-gray-300 px-4 py-2 text-center">Full Marks</th>
                              <th className="border border-gray-300 px-4 py-2 text-center">Obtained</th>
                              <th className="border border-gray-300 px-4 py-2 text-center">Grade</th>
                              <th className="border border-gray-300 px-4 py-2 text-center">Percentage</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedMarksheet.subjects?.map((subject, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-4 py-2">{subject.name}</td>
                                <td className="border border-gray-300 px-4 py-2 text-center">{subject.fullMarks}</td>
                                <td className="border border-gray-300 px-4 py-2 text-center">{subject.obtainedMarks}</td>
                                <td className="border border-gray-300 px-4 py-2 text-center">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${getGradeColor(subject.grade)}`}>
                                    {subject.grade}
                                  </span>
                                </td>
                                <td className="border border-gray-300 px-4 py-2 text-center">
                                  {((subject.obtainedMarks / subject.fullMarks) * 100).toFixed(1)}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-4 gap-4 p-4 bg-white rounded-lg border-2 border-blue-200">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Total Marks</p>
                        <p className="text-xl font-bold text-blue-600">{selectedMarksheet.totalMarks}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Obtained Marks</p>
                        <p className="text-xl font-bold text-orange-600">{selectedMarksheet.obtainedMarks}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Percentage</p>
                        <p className="text-xl font-bold text-purple-600">{selectedMarksheet.percentage}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Grade</p>
                        <p className="text-xl font-bold text-orange-600">{selectedMarksheet.grade}</p>
                      </div>
                    </div>

                    {/* Result */}
                    <div className="text-center mt-6">
                      <div className={`inline-flex items-center px-6 py-2 rounded-full text-lg font-semibold ${getResultColor(selectedMarksheet.result)}`}>
                        {selectedMarksheet.result.toUpperCase()}
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-300 text-center text-sm text-gray-600">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p>Exam Date: {formatDate(selectedMarksheet.examDate)}</p>
                          <p>Result Date: {formatDate(selectedMarksheet.resultDate)}</p>
                        </div>
                        <div>
                          {selectedMarksheet.created_by && (
                          <p>Created By: {selectedMarksheet.created_by}</p>
                        )}
                          <p>Created On: {formatDate(selectedMarksheet.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* If a real marksheet file was fetched, show it prominently */}
              {previewLoading ? (
                <div className="px-6 py-8 text-center">Loading marksheet preview...</div>
              ) : previewFileUrl ? (
                <div className="px-6 py-8">
                  {previewMime && previewMime.startsWith('image') ? (
                    <img src={previewFileUrl} alt="Marksheet Preview" className="mx-auto max-w-full h-auto rounded-lg shadow" />
                  ) : previewMime === 'application/pdf' ? (
                    <object data={previewFileUrl} type="application/pdf" width="100%" height="600px">
                      <p>PDF preview not available. <a href={previewFileUrl} target="_blank" rel="noreferrer">Open file</a></p>
                    </object>
                  ) : (
                    <div className="text-center">Preview available. <a href={previewFileUrl} target="_blank" rel="noreferrer" className="text-blue-600">Open file</a></div>
                  )}
                </div>
              ) : null}

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => { cleanupPreview(); setShowPreviewModal(false); setSelectedMarksheet(null); }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
                {selectedMarksheet.status === 'published' && (
                  <>
                    <button 
                      onClick={() => handleDownload(selectedMarksheet)}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <FaDownload className="w-4 h-4 mr-2 inline" />
                      Download PDF
                    </button>
                    <button 
                      onClick={() => handlePrint(selectedMarksheet)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <FaPrint className="w-4 h-4 mr-2 inline" />
                      Print
                    </button>
                  </>
                )}
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
  );
};

export default BranchMarksheet;