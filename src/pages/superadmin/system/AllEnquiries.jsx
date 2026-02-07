import React, { useState, useEffect } from 'react';
import { FaFilter, FaEye, FaCalendar, FaUser, FaBuilding, FaEnvelope, FaPhone, FaGraduationCap, FaBriefcase, FaHeart, FaSpinner, FaBars, FaSearch } from 'react-icons/fa';
import SuperAdminSidebar from '../SuperAdminSidebar';
import { useNavigate } from 'react-router-dom';
import { enquiriesApi } from '../../../api/enquiriesApi';

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Students', value: 'students' },
  { label: 'University', value: 'university' },
  { label: 'Corporation', value: 'corporation' },
  { label: 'NGO', value: 'ngo' },
  { label: 'Instructor', value: 'instructor' },
  { label: 'Job Seeker', value: 'jobseeker' },
];

const AllEnquiries = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : true));
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Fetch enquiries from API
  const fetchEnquiries = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('[AllEnquiries] Starting enquiry fetch...');
      const data = await enquiriesApi.getAllEnquiries();

      console.log('[AllEnquiries] ✅ Successfully fetched enquiries:', data);
      setEnquiries(data);

      // If no data, just log it - we'll show a friendly empty state in the UI
      if (data.length === 0) {
        console.log('[AllEnquiries] ℹ️ No enquiries in database yet');
      } else {
        console.log(`[AllEnquiries] ✅ Loaded ${data.length} enquiries successfully`);
      }

    } catch (error) {
      console.error('[AllEnquiries] ❌ Error fetching enquiries:', error);

      // Provide detailed error message
      let errorMessage = '❌ Unable to Load Enquiries\n\n';

      if (error.message.includes('No enquiry endpoints are working')) {
        errorMessage += '🔍 Issue: None of the enquiry API endpoints exist or are responding\n\n';
        errorMessage += '📋 This means:\n';
        errorMessage += '• The backend may not have implemented enquiry/partnership APIs yet\n';
        errorMessage += '• The API routes may be at different paths than expected\n';
        errorMessage += '• Check browser console (F12) to see which endpoints were attempted\n\n';
        errorMessage += '💡 Next Steps:\n';
        errorMessage += '• Verify the backend has /api/enquiry or /api/enquiries routes\n';
        errorMessage += '• Check the backend API documentation for correct endpoint paths\n';
        errorMessage += '• Ensure the backend server is running and accessible';
      } else if (error.message.includes('HTML page')) {
        errorMessage += '🔍 Issue: API endpoints are returning HTML pages instead of JSON\n\n';
        errorMessage += '📋 This usually means:\n';
        errorMessage += '• The endpoints do not exist (404 error page)\n';
        errorMessage += '• Authentication is required but token is invalid\n';
        errorMessage += '• Wrong base URL or API path\n\n';
        errorMessage += '💡 Solution:\n';
        errorMessage += '• Check browser console (F12) for the exact endpoints being called\n';
        errorMessage += '• Verify authentication token is valid\n';
        errorMessage += '• Confirm the backend API paths match what the frontend expects';
      } else {
        errorMessage += `🔍 Error Details: ${error.message}\n\n`;
        errorMessage += '📋 Possible causes:\n';
        errorMessage += '• Network connectivity issues\n';
        errorMessage += '• Backend server is not running\n';
        errorMessage += '• CORS or authentication problems\n';
        errorMessage += '• API endpoint paths have changed\n\n';
        errorMessage += '💡 Check browser console (F12) for detailed logs';
      }

      setError(errorMessage);
      // Set empty array so UI doesn't break
      setEnquiries([]);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchEnquiries();
  }, []);

  // Get safe value with multiple field options
  const getSafeValue = (obj, fieldOptions, defaultValue = 'N/A') => {
    for (const field of fieldOptions) {
      const value = obj[field];
      if (value && value !== null && value !== undefined && value !== '') {
        return value;
      }
    }
    return defaultValue;
  };

  // Get partnership type with fallback options
  const getPartnershipType = (enquiry) => {
    return getSafeValue(enquiry, [
      'organizationType',
      'partnership_type',
      'enquiry_type',
      'type',
      'category',
      'partner_type'
    ], 'General Enquiry');
  };

  // Get organization name with fallback options
  const getOrganizationName = (enquiry) => {
    return getSafeValue(enquiry, [
      'organizationName',
      'organization_name',
      'company_name',
      'institute_name',
      'university_name',
      'school_name',
      'business_name',
      'org_name'
    ], 'Individual');
  };

  // Get contact person with fallback options
  const getContactPerson = (enquiry) => {
    return getSafeValue(enquiry, [
      'contactName',
      'contact_person',
      'full_name',
      'name',
      'contact_name',
      'person_name',
      'first_name',
      'representative'
    ]);
  };

  // Get email with fallback options
  const getEmail = (enquiry) => {
    return getSafeValue(enquiry, [
      'email',
      'email_address',
      'contact_email',
      'work_email'
    ]);
  };

  // Get phone with fallback options
  const getPhone = (enquiry) => {
    return getSafeValue(enquiry, [
      'phone',
      'phone_number',
      'contact_number',
      'mobile',
      'mobile_number',
      'tel'
    ]);
  };

  // Get formatted date
  const getFormattedDate = (enquiry) => {
    const dateFields = [
      'created_at',
      'date_created',
      'submission_date',
      'enquiry_date',
      'timestamp',
      'date'
    ];

    for (const field of dateFields) {
      const dateValue = enquiry[field];
      if (dateValue) {
        try {
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'short',
              day: '2-digit'
            });
          }
        } catch (error) {
          console.log('Date parsing error:', error);
        }
      }
    }
    return 'Recent';
  };

  // Filter enquiries based on active filter and search term
  const filteredEnquiries = enquiries.filter(enquiry => {
    // Filter by type
    const matchesFilter = activeFilter === 'all' || (() => {
      const partnershipType = getPartnershipType(enquiry).toLowerCase();
      return partnershipType.includes(activeFilter.toLowerCase()) ||
        activeFilter.toLowerCase() === partnershipType;
    })();

    // Filter by search term
    const matchesSearch = searchTerm === '' || (() => {
      const searchLower = searchTerm.toLowerCase();
      return getPartnershipType(enquiry).toLowerCase().includes(searchLower) ||
        getOrganizationName(enquiry).toLowerCase().includes(searchLower) ||
        getContactPerson(enquiry).toLowerCase().includes(searchLower) ||
        getEmail(enquiry).toLowerCase().includes(searchLower) ||
        getPhone(enquiry).toLowerCase().includes(searchLower) ||
        getSafeValue(enquiry, ['designation', 'title', 'position', 'role']).toLowerCase().includes(searchLower);
    })();

    return matchesFilter && matchesSearch;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredEnquiries.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEnquiries = filteredEnquiries.slice(indexOfFirstItem, indexOfLastItem);

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchTerm]);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  // Get filter counts
  const getFilterCounts = () => {
    const counts = {};
    FILTERS.forEach(filter => {
      if (filter.value === 'all') {
        counts[filter.value] = enquiries.length;
      } else {
        counts[filter.value] = enquiries.filter(e => {
          const partnershipType = getPartnershipType(e).toLowerCase();
          return partnershipType.includes(filter.value.toLowerCase()) ||
            filter.value.toLowerCase() === partnershipType;
        }).length;
      }
    });
    return counts;
  };

  const filterCounts = getFilterCounts();

  // Handle view enquiry details
  const handleViewEnquiry = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setShowViewModal(true);
  };

  // Get icon for partnership type
  const getPartnershipIcon = (enquiry) => {
    const type = typeof enquiry === 'string' ? enquiry : getPartnershipType(enquiry);
    const lowerType = type.toLowerCase();

    if (lowerType.includes('student') || lowerType.includes('learner')) {
      return <FaGraduationCap className="text-blue-500" />;
    } else if (lowerType.includes('university') || lowerType.includes('college') || lowerType.includes('institute')) {
      return <FaBuilding className="text-purple-500" />;
    } else if (lowerType.includes('school') || lowerType.includes('education')) {
      return <FaGraduationCap className="text-indigo-500" />;
    } else if (lowerType.includes('corporation') || lowerType.includes('company') || lowerType.includes('business')) {
      return <FaBriefcase className="text-orange-500" />;
    } else if (lowerType.includes('ngo') || lowerType.includes('non-profit') || lowerType.includes('charity')) {
      return <FaHeart className="text-red-500" />;
    } else if (lowerType.includes('instructor') || lowerType.includes('teacher') || lowerType.includes('educator')) {
      return <FaUser className="text-orange-500" />;
    } else if (lowerType.includes('job') || lowerType.includes('career') || lowerType.includes('employment')) {
      return <FaBriefcase className="text-teal-500" />;
    } else {
      return <FaBuilding className="text-gray-500" />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <div className={`transition-all duration-300 relative z-50 ${showViewModal ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 pointer-events-auto scale-100'}`}>
        <SuperAdminSidebar
          isOpen={sidebarOpen}
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          activeMenuItem="All Enquiries"
          setActiveMenuItem={() => { }}
        />
      </div>
      <div className={`flex-1 h-screen overflow-y-auto transition-all duration-300 ${sidebarOpen && !showViewModal ? 'sm:ml-80 md:ml-72 lg:ml-72' : 'ml-0'}`}>
        <div className="lg:hidden bg-white border-b p-4 flex items-center sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-gray-900 p-2">
            <FaBars className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold ml-4 bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent">All Enquiries</h1>
        </div>
        <div className="py-8 px-4">
          <div className="max-w-8xl mx-auto bg-gradient-to-br from-amber-100/80 via-orange-100/70 to-yellow-100/80 rounded-3xl shadow-2xl border border-amber-200/60 p-8 relative overflow-hidden">
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-orange-400/10 to-yellow-400/10 pointer-events-none animate-gradient-x z-0" />
            <div className="relative z-10">
              <h1 className="text-3xl font-bold text-amber-700 mb-2 bg-gradient-to-r from-amber-700 via-orange-600 to-yellow-700 bg-clip-text text-transparent">All Enquiries</h1>
              <p className="text-amber-800/80 mb-6">View and filter all types of enquiries: Students, University, Corporation, NGO, Instructor, Job Seeker.</p>

              {/* Warning banner if there's an error but we have data to show */}
              {error && enquiries.length > 0 && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6 rounded-r-lg">
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-yellow-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-yellow-800 font-semibold">API Connection Issues</p>
                      <p className="text-yellow-700 text-sm mt-1">
                        Some API endpoints are not responding. Data may be incomplete.
                      </p>
                    </div>
                    <button
                      onClick={fetchEnquiries}
                      className="ml-4 px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}


              {/* Filter Buttons + Filter Action Button - Responsive Layout */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                {/* Filter Buttons - Wrap on Mobile */}
                <div className="w-full md:w-auto">
                  <div className="flex flex-wrap gap-2">
                    {FILTERS.map(f => (
                      <button
                        key={f.value}
                        onClick={() => setActiveFilter(f.value)}
                        className={`px-4 py-2 rounded-full font-semibold shadow-sm border transition-all duration-200 text-sm flex items-center gap-2 whitespace-nowrap
                        ${activeFilter === f.value
                            ? 'bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 text-white border-amber-400 shadow-md'
                            : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'}
                      `}
                      >
                        {f.label}
                        {!loading && (
                          <span className={`px-1.5 py-0.5 text-xs rounded-full ${activeFilter === f.value ? 'bg-white/30 text-white' : 'bg-amber-100 text-amber-700'
                            }`}>
                            {filterCounts[f.value] || 0}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search Input - Full width on mobile */}
                <div className="relative w-full md:w-auto">
                  <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600" />
                  <input
                    type="text"
                    placeholder="Search enquiries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-64 pl-12 pr-4 py-2 rounded-full border-2 border-amber-200 focus:border-amber-400 focus:outline-none bg-white/90 text-amber-900 placeholder-amber-500 font-medium shadow-sm transition-all focus:shadow-md"
                  />
                </div>
              </div>

              {/* Enquiries Data Table */}
              <div className="bg-white/80 rounded-xl border border-amber-100 shadow overflow-hidden">
                {loading ? (
                  <div className="p-12 flex items-center justify-center text-amber-600">
                    <FaSpinner className="animate-spin text-3xl mr-4" />
                    <span className="text-lg">Loading enquiries...</span>
                  </div>
                ) : error && filteredEnquiries.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="text-red-600 mb-4">
                      <svg className="mx-auto h-16 w-16 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xl font-bold mb-6 text-red-700">Unable to Load Enquiries</p>
                      <div className="text-left bg-red-50 p-6 rounded-xl mb-6 max-w-2xl mx-auto border border-red-200">
                        <pre className="text-sm text-red-800 whitespace-pre-wrap font-mono leading-relaxed">{error}</pre>
                      </div>

                      {/* Diagnostic Information */}
                      <div className="text-left bg-blue-50 p-6 rounded-xl mb-6 max-w-2xl mx-auto border border-blue-200">
                        <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Diagnostic Information
                        </h4>
                        <div className="space-y-2 text-sm text-blue-800">
                          <p><strong>Base API URL:</strong> <code className="bg-blue-100 px-2 py-1 rounded">http://localhost:4000</code></p>
                          <p><strong>Authentication Token:</strong> {localStorage.getItem('token') ? '✅ Present' : '❌ Missing'}</p>
                          <p><strong>User Role:</strong> {localStorage.getItem('userRole') || 'Not set'}</p>
                          <p className="mt-3 text-xs text-blue-600">💡 Open browser console (F12) to see detailed logs of all endpoint attempts</p>
                        </div>
                      </div>

                      <div className="flex justify-center gap-3">
                        <button
                          onClick={fetchEnquiries}
                          className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all shadow-lg font-semibold flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Retry Loading
                        </button>
                        <button
                          onClick={() => {
                            // Show console log instructions
                            const message = `
🔍 API ENDPOINT DIAGNOSTICS
==========================

The frontend is attempting to fetch enquiries from these endpoints:

PARTNERSHIP ENQUIRIES:
• http://localhost:4000/partnership_requests
• http://localhost:4000/api/partnership_requests
• http://localhost:4000/partnership-requests
• http://localhost:4000/api/partnership-requests
• http://localhost:4000/partnerships
• http://localhost:4000/api/partnerships

GENERAL ENQUIRIES:
• http://localhost:4000/enquiry/
• http://localhost:4000/api/enquiry/
• http://localhost:4000/enquiries/
• http://localhost:4000/api/enquiries/
• http://localhost:4000/contact-enquiries/
• http://localhost:4000/api/contact-enquiries/

Authorization Header: Bearer ${localStorage.getItem('token')?.substring(0, 20)}...

Check the console logs for detailed responses from each endpoint.
Look for messages starting with [ENQUIRIES] to see which endpoints were tried.
                        `;
                            console.log(message);
                            alert('📋 Endpoint diagnostics have been logged to the console.\n\nPress F12 to open Developer Tools and check the Console tab.');
                          }}
                          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg font-semibold flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z" />
                          </svg>
                          View Endpoint Details
                        </button>
                      </div>
                    </div>
                  </div>
                ) : filteredEnquiries.length === 0 && enquiries.length === 0 && !error ? (
                  <div className="p-12 text-center text-amber-700">
                    <div className="flex flex-col items-center">
                      <FaEnvelope className="text-6xl mb-6 text-amber-300" />
                      <h3 className="text-2xl font-bold mb-3">No Enquiries Yet</h3>
                      <p className="text-amber-600 mb-4 max-w-md">
                        There are currently no enquiries in the system. Enquiries will appear here once they are submitted through the website.
                      </p>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4 max-w-lg text-left">
                        <p className="text-sm text-amber-800 mb-2"><strong>✓ API Connection:</strong> Working properly</p>
                        <p className="text-sm text-amber-800 mb-2"><strong>✓ Database:</strong> Connected successfully</p>
                        <p className="text-sm text-amber-800"><strong>ℹ️ Status:</strong> Waiting for enquiry submissions</p>
                      </div>
                      <button
                        onClick={fetchEnquiries}
                        className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg font-semibold flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                      </button>
                    </div>
                  </div>
                ) : filteredEnquiries.length === 0 ? (
                  <div className="p-12 text-center text-amber-600">
                    <FaEnvelope className="text-4xl mb-4 mx-auto opacity-50" />
                    <p className="text-lg">No enquiries found for the selected filter.</p>
                    {activeFilter !== 'all' && (
                      <button
                        onClick={() => setActiveFilter('all')}
                        className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                      >
                        View All Enquiries
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gradient-to-r from-amber-100 to-orange-100 border-b border-amber-200">
                          <tr>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-amber-800">Type</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-amber-800">Organization</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-amber-800">Contact Person</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-amber-800">Designation</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-amber-800">Email</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-amber-800">Phone</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-amber-800">Date</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-amber-800">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-100">
                          {currentEnquiries.map((enquiry, index) => {
                            const partnershipType = getPartnershipType(enquiry);
                            const organizationName = getOrganizationName(enquiry);
                            const contactPerson = getContactPerson(enquiry);
                            const designation = getSafeValue(enquiry, ['designation', 'title', 'position', 'role']);
                            const email = getEmail(enquiry);
                            const phone = getPhone(enquiry);
                            const formattedDate = getFormattedDate(enquiry);

                            return (
                              <tr key={enquiry._id || enquiry.id || `enquiry-${index}`} className="hover:bg-amber-50/50 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    {getPartnershipIcon(enquiry)}
                                    <span className="font-medium text-gray-800 capitalize">
                                      {partnershipType}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 font-semibold text-gray-800">
                                  {organizationName}
                                </td>
                                <td className="px-6 py-4 text-gray-700">
                                  {contactPerson}
                                </td>
                                <td className="px-6 py-4 text-gray-600 text-sm">
                                  {designation}
                                </td>
                                <td className="px-6 py-4 text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <FaEnvelope className="text-xs text-gray-400" />
                                    <span className="truncate max-w-[150px]" title={email}>{email}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <FaPhone className="text-xs text-gray-400" />
                                    {phone}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <FaCalendar className="text-xs text-gray-400" />
                                    {formattedDate}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <button
                                    onClick={() => handleViewEnquiry(enquiry)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all shadow-md"
                                  >
                                    <FaEye className="text-xs" /> View
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden p-4 space-y-4 bg-gray-50">
                      {currentEnquiries.map((enquiry, index) => {
                        const partnershipType = getPartnershipType(enquiry);
                        const organizationName = getOrganizationName(enquiry);
                        const contactPerson = getContactPerson(enquiry);
                        const formattedDate = getFormattedDate(enquiry);

                        return (
                          <div key={enquiry._id || index} className="bg-white rounded-xl shadow-sm border border-amber-100 p-4 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-orange-500"></div>

                            <div className="flex justify-between items-start mb-3 pl-2">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600">
                                  {getPartnershipIcon(enquiry)}
                                </div>
                                <span className="font-bold text-gray-800 capitalize text-sm">{partnershipType}</span>
                              </div>
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full flex items-center gap-1">
                                <FaCalendar className="text-[10px]" /> {formattedDate}
                              </span>
                            </div>

                            <div className="pl-3 space-y-2 mb-4">
                              <h3 className="font-bold text-gray-900 text-lg leading-tight">{organizationName}</h3>
                              <p className="text-sm text-gray-600 flex items-center gap-2">
                                <FaUser className="text-amber-400 text-xs" /> {contactPerson}
                              </p>
                              <div className="flex flex-col gap-1 text-xs text-gray-500 mt-2">
                                <div className="flex items-center gap-2">
                                  <FaEnvelope className="text-gray-400" />
                                  <span className="truncate">{getEmail(enquiry)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <FaPhone className="text-gray-400" />
                                  <span>{getPhone(enquiry)}</span>
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => handleViewEnquiry(enquiry)}
                              className="w-full mt-2 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-lg shadow-sm active:scale-[0.98] transition-transform flex justify-center items-center gap-2"
                            >
                              <FaEye /> View Details
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination - Only show if more than 10 items */}
                    {filteredEnquiries.length > 10 && (
                      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-t border-amber-200 px-6 py-4">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="text-sm text-amber-800">
                            Showing <span className="font-semibold text-orange-700">{indexOfFirstItem + 1}</span> to{' '}
                            <span className="font-semibold text-orange-700">{Math.min(indexOfLastItem, filteredEnquiries.length)}</span> of{' '}
                            <span className="font-semibold text-orange-700">{filteredEnquiries.length}</span> enquiries
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={prevPage}
                              disabled={currentPage === 1}
                              className="px-3 py-2 rounded-lg border border-amber-300 bg-white hover:bg-amber-50 text-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
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
                                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${currentPage === pageNumber
                                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                                        : 'border border-amber-300 bg-white hover:bg-amber-50 text-amber-700'
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
                                    <span key={pageNumber} className="px-2 py-2 text-amber-400">
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
                              className="px-3 py-2 rounded-lg border border-amber-300 bg-white hover:bg-amber-50 text-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* View Enquiry Modal */}
              {showViewModal && selectedEnquiry && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setShowViewModal(false)}>
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col transform transition-all duration-300 scale-100" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 md:px-8 py-4 md:py-6 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-3">
                        {getPartnershipIcon(selectedEnquiry)}
                        <h2 className="text-2xl font-bold">Enquiry Details</h2>
                      </div>
                      <button onClick={() => setShowViewModal(false)} className="hover:bg-white/20 p-2 rounded-lg transition-colors text-2xl">
                        ×
                      </button>
                    </div>

                    {/* Body Scrollable */}
                    <div className="overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-6 flex-1">
                      {/* Basic Information */}
                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 md:p-6 border border-blue-200">
                        <h3 className="text-lg font-bold text-blue-800 mb-4">Basic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-blue-600 mb-1">Organization Type</p>
                            <p className="text-blue-900 font-semibold capitalize">{getPartnershipType(selectedEnquiry)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-blue-600 mb-1">Organization</p>
                            <p className="text-blue-900 font-semibold">{getOrganizationName(selectedEnquiry)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-blue-600 mb-1">Contact Person</p>
                            <p className="text-blue-900 font-semibold">{getContactPerson(selectedEnquiry)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-blue-600 mb-1">Designation</p>
                            <p className="text-blue-900 font-semibold">{getSafeValue(selectedEnquiry, ['designation', 'title', 'position', 'role'])}</p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-sm text-blue-600 mb-1">Website</p>
                            <p className="text-blue-900 font-semibold break-all">
                              {selectedEnquiry.website ? (
                                <a href={selectedEnquiry.website} target="_blank" rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 underline">
                                  {selectedEnquiry.website}
                                </a>
                              ) : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-blue-600 mb-1">Date Submitted</p>
                            <p className="text-blue-900 font-semibold">{getFormattedDate(selectedEnquiry)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Contact Information */}
                      <div className="bg-gradient-to-br from-orange-50 to-emerald-50 rounded-xl p-4 md:p-6 border border-orange-200">
                        <h3 className="text-lg font-bold text-orange-800 mb-4">Contact Information</h3>
                        <div className="space-y-3">
                          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 p-3 bg-white rounded-lg border border-orange-100">
                            <div className="flex items-center gap-2 text-orange-500">
                              <FaEnvelope />
                              <span className="md:hidden text-sm font-medium">Email</span>
                            </div>
                            <span className="text-orange-900 font-semibold break-all">{getEmail(selectedEnquiry)}</span>
                          </div>
                          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 p-3 bg-white rounded-lg border border-orange-100">
                            <div className="flex items-center gap-2 text-orange-500">
                              <FaPhone />
                              <span className="md:hidden text-sm font-medium">Phone</span>
                            </div>
                            <span className="text-orange-900 font-semibold">{getPhone(selectedEnquiry)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Collaboration Areas */}
                      {selectedEnquiry.collaborationAreas && selectedEnquiry.collaborationAreas.length > 0 && (
                        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-4 md:p-6 border border-yellow-200">
                          <h3 className="text-lg font-bold text-yellow-800 mb-4">Collaboration Areas</h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedEnquiry.collaborationAreas.map((area, index) => (
                              <span key={index} className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded-full text-sm font-medium">
                                {area}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Additional Details */}
                      {selectedEnquiry.message && (
                        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 md:p-6 border border-purple-200">
                          <h3 className="text-lg font-bold text-purple-800 mb-4">Message</h3>
                          <div className="bg-white rounded-lg p-4 border border-purple-100">
                            <p className="text-purple-900 whitespace-pre-wrap text-sm md:text-base">{selectedEnquiry.message}</p>
                          </div>
                        </div>
                      )}

                      {/* Agreement Status */}
                      <div className="bg-gradient-to-br from-emerald-50 to-orange-50 rounded-xl p-4 md:p-6 border border-emerald-200">
                        <h3 className="text-lg font-bold text-emerald-800 mb-4">Contact Agreement</h3>
                        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-emerald-100">
                          <div className={`w-3 h-3 rounded-full shrink-0 ${selectedEnquiry.agreedToContact ? 'bg-orange-500' : 'bg-red-500'
                            }`}></div>
                          <span className={`font-semibold text-sm md:text-base ${selectedEnquiry.agreedToContact ? 'text-orange-800' : 'text-red-800'
                            }`}>
                            {selectedEnquiry.agreedToContact ? 'Agreed to be contacted' : 'Did not agree to be contacted'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 px-4 md:px-8 py-4 flex flex-col-reverse md:flex-row justify-end gap-3 md:gap-4 border-t sticky bottom-0 shrink-0">
                      <div className="block md:hidden w-full">
                        <button
                          onClick={() => setShowViewModal(false)}
                          className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-semibold"
                        >
                          Close
                        </button>
                      </div>
                      <div className="hidden md:block">
                        <button
                          onClick={() => setShowViewModal(false)}
                          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-semibold"
                        >
                          Close
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          const contactName = selectedEnquiry.contactName || selectedEnquiry.contact_person || selectedEnquiry.full_name || 'Valued Partner';
                          const email = selectedEnquiry.email;
                          const organizationName = selectedEnquiry.organizationName || selectedEnquiry.organization_name || 'Your Organization';
                          const organizationType = selectedEnquiry.organizationType || selectedEnquiry.partnership_type || 'Partner';

                          if (!email) {
                            alert('No email address found for this contact.');
                            return;
                          }

                          const subject = 'Re: Partnership Enquiry - SkillWallah';
                          const body = `Dear ${contactName},

Thank you for your interest in partnering with SkillWallah. We have received your enquiry regarding collaboration opportunities.

Organization: ${organizationName}
Type: ${organizationType}
Areas of Interest: ${selectedEnquiry.collaborationAreas ? selectedEnquiry.collaborationAreas.join(', ') : 'General Partnership'}

We appreciate your time and would love to discuss potential collaboration opportunities with your organization. Our team will review your enquiry and get back to you within 2-3 business days.

If you have any immediate questions or would like to schedule a call, please feel free to reach out to us.

Best regards,
SkillWallah Partnership Team
Email: partnerships@skillwallah.com
Phone: +91-XXXXXXXXXX`;

                          const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                          window.open(mailtoLink);
                        }}
                        className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all font-semibold flex justify-center items-center gap-2"
                      >
                        <FaEnvelope /> <span>Reply via Email</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <style jsx>{`
        @keyframes gradient-x {
          0%, 100% { transform: translateX(0%); }
          50% { transform: translateX(100%); }
        }
        .animate-gradient-x {
          animation: gradient-x 15s ease infinite;
        }
      `}</style>
        </div>
      </div>
    </div>
  );
};

export default AllEnquiries;
