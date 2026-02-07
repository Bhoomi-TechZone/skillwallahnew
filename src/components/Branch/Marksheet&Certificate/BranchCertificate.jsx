import { useState, useEffect, useMemo } from 'react';
import { FaCertificate, FaSearch, FaEye, FaDownload, FaPrint, FaGraduationCap, FaCalendarAlt, FaFilter, FaSpinner } from 'react-icons/fa';
import { certificatesAPI } from '../../../api/certificatesApi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


const BranchCertificate = ({ onStatsUpdate }) => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [certificateTypeFilter, setCertificateTypeFilter] = useState('');
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [lastFetched, setLastFetched] = useState(null);

  const statusOptions = ['issued', 'generated', 'cancelled'];
  const certificateTypes = ['completion', 'achievement', 'participation'];

  // Load certificates from API with caching
  const loadCertificates = async (forceRefresh = false) => {
    // Prevent loading if data was recently fetched (within 2 minutes)
    const now = Date.now();
    if (!forceRefresh && lastFetched && (now - lastFetched) < 120000) {
      console.log('📜 Using cached certificate data');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('📜 Fetching certificates from API...');
      const response = await certificatesAPI.getCertificates();
      console.log('📜 Certificates API response:', response);
      
      // Normalize different possible response shapes into an array
      let rawCertificates = [];
      if (response && Array.isArray(response)) {
        rawCertificates = response;
      } else if (response && Array.isArray(response.certificates)) {
        rawCertificates = response.certificates;
      } else if (response && response.success && Array.isArray(response.data)) {
        rawCertificates = response.data;
      } else if (response && response.success && Array.isArray(response.certificates)) {
        rawCertificates = response.certificates;
      } else {
        console.warn('📜 No certificates found or unexpected response format:', response);
        rawCertificates = []; // Set empty array instead of throwing error
      }
      
      // Map and normalize fields to stable camelCase keys and safe defaults
      const normalize = (raw) => {
        const safe = (v) => v === undefined || v === null ? '' : v;
        const id = safe(raw.id || raw._id || (raw._id && raw._id.$oid) || '');
        const statusVal = safe(raw.status || raw.state || raw.certificate_status || '');
        const certificateNumberVal = safe(raw.certificate_number || raw.certificateNumber || raw.certificateNumber || raw.certificateNumber || '');
        const studentNameVal = safe(raw.student_name || raw.studentName || raw.name || '');
        const courseNameVal = safe(raw.course_name || raw.courseName || raw.course || '');
        const templateVal = safe(raw.template || raw.template_name || raw.certificate_type || '');
        return {
          ...raw,
          id,
          student_name: studentNameVal,
          student_registration: safe(raw.student_registration || raw.registration_number || raw.registrationNumber),
          course_name: courseNameVal,
          certificateNumber: certificateNumberVal,
          certificate_number: certificateNumberVal,
          status: statusVal,
          template: templateVal,
          grade: safe(raw.grade || raw.cgpa || ''),
          completionDate: safe(raw.completion_date || raw.completionDate || raw.completed_on),
          issueDate: safe(raw.issue_date || raw.issueDate || raw.issued_on),
          created_by: safe(raw.created_by || raw.createdBy || raw.creator),
        };
      };
      
      const normalized = rawCertificates.map(normalize);
      setCertificates(normalized);
      setLastFetched(now);
      console.log(`✅ Loaded ${normalized.length} certificates successfully`);
    } catch (error) {
      console.error('❌ Error loading certificates:', error);
      setError('Failed to load certificates. Please try again.');
      // Only show toast error on manual refresh to avoid spam
      if (forceRefresh) {
        toast.error('Failed to load certificates');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCertificates();
  }, []);

  // Filter certificates with memoization for better performance
  const filteredCertificates = useMemo(() => {
    if (!Array.isArray(certificates)) return [];
    
    return certificates.filter(cert => {
      const matchesSearch = cert.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           cert.course_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           cert.certificate_number?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === '' || cert.status === statusFilter;
      const matchesCertificateType = certificateTypeFilter === '' || cert.certificate_type === certificateTypeFilter;
      return matchesSearch && matchesStatus && matchesCertificateType;
    });
  }, [certificates, searchTerm, statusFilter, certificateTypeFilter]);

  // Preview certificate: fetch actual file when available and display it (image/pdf)
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

  const handlePreview = async (certificate) => {
    try {
      setSelectedCertificate(certificate);
      setShowPreviewModal(true);
      cleanupPreview();

      // If the certificate has an accessible file (file_path or an id), try to fetch it via API
      if (certificate && (certificate.file_path || certificate.id)) {
        setPreviewLoading(true);
        try {
          const response = await certificatesAPI.downloadCertificate(certificate.id || certificate._id);
          if (!response.ok) {
            console.warn('Preview file not available via download endpoint, falling back to template view');
            setPreviewLoading(false);
            return;
          }

          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setPreviewFileUrl(url);
          setPreviewMime(blob.type || null);
          setPreviewLoading(false);
        } catch (err) {
          console.error('Error fetching preview file:', err);
          setPreviewLoading(false);
        }
      }
    } catch (err) {
      console.error('Error preparing certificate preview:', err);
      setShowPreviewModal(true);
    }
  };

  // Handle download certificate
  const handleDownload = async (certificate) => {
    try {
      const response = await certificatesAPI.downloadCertificate(certificate.id);
      
      if (!response.ok) {
        throw new Error('Failed to download certificate');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${certificate.certificate_number || 'certificate'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Certificate downloaded successfully');
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast.error('Failed to download certificate');
    }
  };

  // Handle print certificate
  const handlePrint = (certificate) => {
    // For now, trigger download as print functionality
    handleDownload(certificate);
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'issued':
        return 'bg-orange-100 text-orange-800';
      case 'generated':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
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

  // Get template color
  const getTemplateColor = (template) => {
    switch (template) {
      case 'premium':
        return 'bg-purple-100 text-purple-800';
      case 'custom':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Not issued';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = Array.isArray(filteredCertificates) ? filteredCertificates.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = Math.ceil((Array.isArray(filteredCertificates) ? filteredCertificates.length : 0) / itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white p-2 rounded-lg">
                  <FaCertificate className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-secondary-900">🏆 Available Certificates</h1>
                  <p className="text-sm text-secondary-600 mt-1">View student certificates created by your franchise</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="bg-yellow-50 px-4 py-2 rounded-lg">
                  <span className="text-sm font-medium text-yellow-700">
                    Total: {filteredCertificates.length}
                  </span>
                </div>
                <div className="bg-orange-50 px-4 py-2 rounded-lg">
                  <span className="text-sm font-medium text-orange-700">
                    Issued: {Array.isArray(filteredCertificates) ? filteredCertificates.filter(c => c.status === 'issued').length : 0}
                  </span>
                </div>
                <div className="bg-purple-50 px-4 py-2 rounded-lg">
                  <span className="text-sm font-medium text-purple-700">
                    Premium: {Array.isArray(filteredCertificates) ? filteredCertificates.filter(c => c.template === 'premium').length : 0}
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
                placeholder="Search by student name, course name, or certificate no..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full border border-secondary-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors"
            >
              <option value="">--- All Status ---</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={certificateTypeFilter}
              onChange={(e) => setCertificateTypeFilter(e.target.value)}
              className="px-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors"
            >
              <option value="">--- All Types ---</option>
              {certificateTypes.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Certificates Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-yellow-200">
                    <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">S.No.</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">Student Details</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">Course Info</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Certificate No.</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Academic Info</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Issue Details</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Status & Template</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-12 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600"></div>
                          <span className="text-sm text-gray-500">Loading certificates...</span>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-12 text-center">
                        <div className="text-red-600 text-sm">{error}</div>
                        <button
                          onClick={loadCertificates}
                          className="mt-2 text-yellow-600 hover:text-yellow-700 text-sm"
                        >
                          Try again
                        </button>
                      </td>
                    </tr>
                  ) : currentItems.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-12 text-center text-sm text-gray-500">
                        No certificates found matching your criteria
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((certificate, index) => (
                      <tr key={certificate.id} className="hover:bg-yellow-50 transition-colors">
                        <td className="px-4 py-4">
                          <span className="text-sm font-medium text-secondary-900">
                            {indexOfFirstItem + index + 1}.
                          </span>
                        </td>
                        
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <h3 className="text-sm font-semibold text-secondary-900">{certificate.student_name}</h3>
                            <p className="text-xs text-blue-600 font-medium">{certificate.student_registration}</p>
                          </div>
                        </td>
                        
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-secondary-900 max-w-xs">
                              {certificate.course_name}
                            </div>
                            <div className="text-xs text-purple-600">{certificate.programName}</div>
                            <div className="text-xs text-gray-500">Duration: {certificate.duration}</div>
                          </div>
                        </td>
                        
                        <td className="px-4 py-4 text-center">
                          <div className="text-sm font-mono text-orange-600 bg-orange-50 px-2 py-1 rounded">
                            {certificate.certificateNumber}
                          </div>
                        </td>
                        
                        <td className="px-4 py-4 text-center">
                          <div className="space-y-2">
                            <div className={`inline-flex items-center px-3 py-1 rounded text-xs font-medium ${getGradeColor(certificate.grade || certificate.overall_grade || certificate.final_grade || 'F')}`}>
                              <FaGraduationCap className="w-3 h-3 mr-1" />
                              Grade: {certificate.grade || certificate.overall_grade || certificate.final_grade || 'F'}
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-4 py-4 text-center">
                          <div className="space-y-1">
                            <div className="flex items-center justify-center space-x-1 text-xs text-orange-600">
                              <FaCalendarAlt className="w-3 h-3" />
                              <span>Completed: {formatDate(certificate.completionDate)}</span>
                            </div>
                            <div className="flex items-center justify-center space-x-1 text-xs text-blue-600">
                              <FaCalendarAlt className="w-3 h-3" />
                              <span>Issued: {formatDate(certificate.issueDate)}</span>
                            </div>
                            <div className="text-xs text-gray-500">By: {certificate.created_by}</div>
                          </div>
                        </td>
                        
                        <td className="px-4 py-4 text-center">
                          <div className="space-y-2">
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(certificate.status)}`}>
                              {certificate.status ? certificate.status.charAt(0).toUpperCase() + certificate.status.slice(1) : 'Unknown'}
                            </span>
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getTemplateColor(certificate.template)}`}>
                              {certificate.template}
                            </span>
                          </div>
                        </td>
                        
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => handlePreview(certificate)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="View Certificate"
                            >
                              <FaEye className="w-4 h-4" />
                            </button>
                            
                            {certificate.status === 'issued' && (
                              <>
                                <button
                                  onClick={() => handleDownload(certificate)}
                                  className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition-colors"
                                  title="Download Certificate"
                                >
                                  <FaDownload className="w-4 h-4" />
                                </button>
                                
                                <button
                                  onClick={() => handlePrint(certificate)}
                                  className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                  title="Print Certificate"
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
                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredCertificates.length)} of {filteredCertificates.length} certificates
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-sm bg-yellow-600 text-white rounded-md">
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

        {/* Certificate Preview Modal */}
        {showPreviewModal && selectedCertificate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">Certificate Preview</h3>
                  <button
                    onClick={() => { cleanupPreview(); setShowPreviewModal(false); setSelectedCertificate(null); }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Certificate Preview: prefer actual generated file (image/pdf) when available, otherwise show HTML template */}
              {previewLoading ? (
                <div className="px-6 py-8 text-center">Loading certificate preview...</div>
              ) : previewFileUrl ? (
                <div className="px-6 py-8">
                  {previewMime && previewMime.startsWith('image') ? (
                    <img src={previewFileUrl} alt="Certificate Preview" className="mx-auto max-w-full h-auto rounded-lg shadow" />
                  ) : previewMime === 'application/pdf' ? (
                    <object data={previewFileUrl} type="application/pdf" width="100%" height="600px">
                      <p>PDF preview not available. <a href={previewFileUrl} target="_blank" rel="noreferrer">Open file</a></p>
                    </object>
                  ) : (
                    <div className="text-center">Preview available. <a href={previewFileUrl} target="_blank" rel="noreferrer" className="text-blue-600">Open file</a></div>
                  )}
                </div>
              ) : (
                <div className="px-6 py-8">
                  <div className="border-4 border-yellow-500 rounded-lg p-8 bg-gradient-to-br from-yellow-50 to-orange-50">
                    <div className="text-center space-y-4">
                      <div className="flex justify-center">
                        <FaCertificate className="w-16 h-16 text-yellow-600" />
                      </div>
                      
                      <h1 className="text-3xl font-bold text-gray-900">CERTIFICATE OF COMPLETION</h1>
                      
                      <div className="space-y-2">
                        <p className="text-lg text-gray-700">This is to certify that</p>
                        <h2 className="text-2xl font-bold text-blue-600">{selectedCertificate.student_name}</h2>
                        <p className="text-lg text-gray-700">Registration No: <span className="font-mono font-medium">{selectedCertificate.student_registration}</span></p>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-lg text-gray-700">has successfully completed the course</p>
                        <h3 className="text-xl font-bold text-purple-600">{selectedCertificate.course_name}</h3>
                        <p className="text-gray-600">Under the program: <span className="font-medium">{selectedCertificate.programName}</span></p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-8 mt-6">
                        <div>
                          <p className="text-gray-600">Grade Achieved</p>
                          <p className="text-2xl font-bold text-orange-600">{selectedCertificate.grade || selectedCertificate.overall_grade || selectedCertificate.final_grade || 'N/A'}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-8 mt-4">
                        <div>
                          <p className="text-gray-600">Course Duration</p>
                          <p className="font-medium">{selectedCertificate.duration}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Completion Date</p>
                          <p className="font-medium">{formatDate(selectedCertificate.completionDate)}</p>
                        </div>
                      </div>
                      
                      <div className="mt-8 pt-4 border-t border-gray-300">
                        <p className="text-sm text-gray-600">Certificate No: <span className="font-mono">{selectedCertificate.certificateNumber}</span></p>
                        <p className="text-sm text-gray-600">Issue Date: {formatDate(selectedCertificate.issueDate)}</p>
                        <p className="text-sm text-gray-600">Issued By: {selectedCertificate.issuedBy}</p>
                        <p className="text-sm text-gray-600">Template: {selectedCertificate.template ? (selectedCertificate.template.charAt(0).toUpperCase() + selectedCertificate.template.slice(1)) : 'Default'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
                {selectedCertificate.status === 'issued' && (
                  <>
                    <button 
                      onClick={() => handleDownload(selectedCertificate)}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <FaDownload className="w-4 h-4 mr-2 inline" />
                      Download PDF
                    </button>
                    <button 
                      onClick={() => handlePrint(selectedCertificate)}
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

export default BranchCertificate;