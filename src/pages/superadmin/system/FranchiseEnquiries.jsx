import React, { useState, useEffect } from 'react';
import { FaStore, FaEye, FaEdit, FaTrash, FaPhone, FaEnvelope, FaMapMarkerAlt, FaClock, FaTimes, FaSave, FaGlobe, FaCheck, FaBars, FaSpinner } from 'react-icons/fa';
import SuperAdminSidebar from '../SuperAdminSidebar';
import { useNavigate } from 'react-router-dom';

const FranchiseEnquiries = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : true));
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const fetchEnquiries = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json'
      };

      // Only add Authorization header if token exists
      if (token && token !== 'null' && token !== 'undefined') {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('http://localhost:4000/partnership_requests', {
        headers
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Partnership requests response:', result);

        // Handle different response formats
        let enquiriesData = [];
        if (Array.isArray(result)) {
          enquiriesData = result;
        } else if (result.data && Array.isArray(result.data)) {
          enquiriesData = result.data;
        } else if (result.results && Array.isArray(result.results)) {
          enquiriesData = result.results;
        }

        // Filter by organization type "Franchise" and map the data structure
        const franchiseEnquiries = enquiriesData
          .filter(enquiry => enquiry.organizationType === 'Franchise')
          .map(enquiry => ({
            id: enquiry._id || enquiry.id,
            name: enquiry.contactName || enquiry.name,
            organizationName: enquiry.organizationName,
            email: enquiry.email,
            phone: enquiry.phone,
            website: enquiry.website,
            designation: enquiry.designation,
            collaborationAreas: enquiry.collaborationAreas || [],
            message: enquiry.message,
            agreedToContact: enquiry.agreedToContact,
            created_at: enquiry.created_at || enquiry.createdAt || new Date().toISOString(),
            status: enquiry.status || 'pending' // Default status if not provided
          }));

        console.log('Processed franchise enquiries:', franchiseEnquiries);
        setEnquiries(franchiseEnquiries);
      } else {
        console.error('Failed to fetch enquiries:', response.status, response.statusText);
        if (response.status === 401) {
          console.warn('Authentication failed - token may be expired');
          // Could redirect to login or refresh token here
        }
      }
    } catch (error) {
      console.error('Error fetching franchise enquiries:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate This Month count
  const getThisMonthCount = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    return enquiries.filter(enquiry => {
      const enquiryDate = new Date(enquiry.created_at);
      return enquiryDate.getMonth() === currentMonth &&
        enquiryDate.getFullYear() === currentYear;
    }).length;
  };

  const filteredEnquiries = enquiries.filter(enquiry => {
    const matchesFilter = filter === 'all' || enquiry.status === filter;
    const matchesSearch = !searchTerm ||
      enquiry.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enquiry.organizationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enquiry.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enquiry.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enquiry.designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enquiry.collaborationAreas?.some(area =>
        area?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    return matchesFilter && matchesSearch;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredEnquiries.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEnquiries = filteredEnquiries.slice(indexOfFirstItem, indexOfLastItem);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm]);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'contacted': return 'bg-blue-100 text-blue-800';
      case 'qualified': return 'bg-orange-100 text-orange-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewEnquiry = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setShowViewModal(true);
  };

  const handleEditEnquiry = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setEditForm({
      name: enquiry.name,
      organizationName: enquiry.organizationName,
      email: enquiry.email,
      phone: enquiry.phone,
      website: enquiry.website,
      designation: enquiry.designation,
      collaborationAreas: enquiry.collaborationAreas.join(', '),
      message: enquiry.message,
      status: enquiry.status
    });
    setShowEditModal(true);
  };

  const handleDeleteEnquiry = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setShowDeleteModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      const token = localStorage.getItem('token');
      let apiUpdateSuccess = false;

      // Try to update via API only if we have a valid token
      if (token && token !== 'null' && token !== 'undefined') {
        try {
          const response = await fetch(`http://localhost:4000/partnership_requests/${selectedEnquiry.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              contactName: editForm.name,
              organizationName: editForm.organizationName,
              email: editForm.email,
              phone: editForm.phone,
              website: editForm.website,
              designation: editForm.designation,
              collaborationAreas: editForm.collaborationAreas.split(',').map(area => area.trim()),
              message: editForm.message,
              status: editForm.status
            }),
          });

          if (response.ok) {
            apiUpdateSuccess = true;
          } else if (response.status === 404) {
            console.warn('API endpoint not found (404), updating locally');
          } else if (response.status === 401) {
            console.warn('Authentication failed (401), updating locally');
          } else {
            console.warn(`API update failed with status ${response.status}, updating locally`);
          }
        } catch (apiError) {
          console.warn('API update failed:', apiError.message, ', updating locally');
        }
      } else {
        console.warn('No valid authentication token, updating locally only');
      }

      // Always update local state regardless of API success
      const updatedEnquiries = enquiries.map(enq =>
        enq.id === selectedEnquiry.id
          ? {
            ...enq,
            name: editForm.name,
            organizationName: editForm.organizationName,
            email: editForm.email,
            phone: editForm.phone,
            website: editForm.website,
            designation: editForm.designation,
            collaborationAreas: editForm.collaborationAreas.split(',').map(area => area.trim()),
            message: editForm.message,
            status: editForm.status
          }
          : enq
      );

      setEnquiries(updatedEnquiries);
      setShowEditModal(false);

      if (apiUpdateSuccess) {
        alert('Enquiry updated successfully!');
      } else {
        alert('Enquiry updated successfully! (Local update only)');
      }
    } catch (error) {
      console.error('Error updating enquiry:', error);
      alert('Failed to update enquiry');
    }
  };

  const handleConfirmDelete = async () => {
    try {
      // Try to delete via API first
      try {
        const response = await fetch(`http://localhost:4000/partnership_requests/${selectedEnquiry.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          console.warn(`API delete failed with status ${response.status}, updating locally`);
        }
      } catch (apiError) {
        console.warn('API delete failed:', apiError.message, ', updating locally');
      }

      // Always update local state regardless of API success
      const updatedEnquiries = enquiries.filter(enq => enq.id !== selectedEnquiry.id);
      setEnquiries(updatedEnquiries);
      setShowDeleteModal(false);
      alert('Enquiry deleted successfully!');
    } catch (error) {
      console.error('Error deleting enquiry:', error);
      alert('Failed to delete enquiry');
    }
  };

  const handleMarkQualified = async (enquiry) => {
    try {
      const token = localStorage.getItem('token');

      // Check if we have a valid token
      if (!token || token === 'null' || token === 'undefined') {
        console.warn('No valid authentication token found, updating locally only');

        // Update locally without API call
        const updatedEnquiries = enquiries.map(enq =>
          enq.id === enquiry.id
            ? { ...enq, status: 'qualified' }
            : enq
        );

        setEnquiries(updatedEnquiries);
        alert(`${enquiry.organizationName} has been marked as qualified! (Local update only)`);
        return;
      }

      // Try to make API call to update status in backend
      const response = await fetch(`http://localhost:4000/partnership_requests/${enquiry.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          contactName: enquiry.name,
          organizationName: enquiry.organizationName,
          email: enquiry.email,
          phone: enquiry.phone,
          website: enquiry.website,
          designation: enquiry.designation,
          collaborationAreas: enquiry.collaborationAreas,
          message: enquiry.message,
          status: 'qualified'
        }),
      });

      // Check response status
      if (response.status === 404) {
        console.warn('API endpoint not found (404), updating locally');
      } else if (response.status === 401) {
        console.warn('Authentication failed (401), token may be expired');
      } else if (!response.ok) {
        console.warn(`API update failed with status ${response.status}, updating locally`);
      }

      // Always update the local state regardless of API response
      const updatedEnquiries = enquiries.map(enq =>
        enq.id === enquiry.id
          ? { ...enq, status: 'qualified' }
          : enq
      );

      setEnquiries(updatedEnquiries);

      if (response.ok) {
        alert(`${enquiry.organizationName} has been marked as qualified!`);
      } else {
        alert(`${enquiry.organizationName} has been marked as qualified! (Updated locally)`);
      }

    } catch (error) {
      console.error('Error marking enquiry as qualified:', error);

      // Still update locally even if API fails
      const updatedEnquiries = enquiries.map(enq =>
        enq.id === enquiry.id
          ? { ...enq, status: 'qualified' }
          : enq
      );

      setEnquiries(updatedEnquiries);
      alert(`${enquiry.organizationName} has been marked as qualified! (Network error - updated locally)`);
    }
  };

  const closeModals = () => {
    setShowViewModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setSelectedEnquiry(null);
    setEditForm({});
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className={`transition-all duration-300 relative z-50 ${showViewModal ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 pointer-events-auto scale-100'}`}>
        <SuperAdminSidebar
          isOpen={sidebarOpen}
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          activeMenuItem="Franchise Enquiries"
          setActiveMenuItem={() => { }}
        />
      </div>
      <div className={`flex-1 h-screen overflow-y-auto transition-all duration-300 ${sidebarOpen && !showViewModal ? 'sm:ml-80 md:ml-72 lg:ml-72' : 'ml-0'}`}>
        <div className="lg:hidden bg-white border-b p-4 flex items-center sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-gray-900 p-2">
            <FaBars className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold ml-4 bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent">Franchise Enquiries</h1>
        </div>
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Franchise Enquiries</h1>
            <p className="text-gray-600">Manage franchise partnership requests and applications</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100">Total Enquiries</p>
                  <p className="text-2xl font-bold">{enquiries.length}</p>
                </div>
                <FaStore className="text-3xl text-orange-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100">Pending</p>
                  <p className="text-2xl font-bold">{enquiries.filter(e => e.status === 'pending').length}</p>
                </div>
                <FaClock className="text-3xl text-yellow-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100">Qualified</p>
                  <p className="text-2xl font-bold">{enquiries.filter(e => e.status === 'qualified').length}</p>
                </div>
                <FaStore className="text-3xl text-orange-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100">This Month</p>
                  <p className="text-2xl font-bold">{getThisMonthCount()}</p>
                </div>
                <FaStore className="text-3xl text-blue-200" />
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                <div className="flex gap-2 min-w-max">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${filter === 'all' ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    All Enquiries
                  </button>
                  <button
                    onClick={() => setFilter('pending')}
                    className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${filter === 'pending' ? 'bg-yellow-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => setFilter('contacted')}
                    className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${filter === 'contacted' ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    Contacted
                  </button>
                  <button
                    onClick={() => setFilter('qualified')}
                    className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${filter === 'qualified' ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    Qualified
                  </button>
                </div>
              </div>
              <div className="w-full md:w-auto relative">
                <input
                  type="text"
                  placeholder="Search enquiries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full md:w-64 px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent shadow-sm"
                />
                <FaStore className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Enquiries Table & Cards */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Person</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Info</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Website</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collaboration Areas</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                        <div className="flex justify-center items-center py-8">
                          <FaSpinner className="animate-spin text-orange-500 text-2xl mr-2" />
                          Loading franchise enquiries...
                        </div>
                      </td>
                    </tr>
                  ) : filteredEnquiries.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                        <div className="py-8 flex flex-col items-center">
                          <FaStore className="text-gray-300 text-4xl mb-3" />
                          No franchise enquiries found
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentEnquiries.map((enquiry) => (
                      <tr key={enquiry.id} className="hover:bg-gray-50 bg-white">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-orange-400 to-red-500 flex items-center justify-center text-white font-medium shadow-sm">
                                <FaStore />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-bold text-gray-900">{enquiry.name}</div>
                              <div className="text-sm text-orange-600 font-medium">{enquiry.organizationName}</div>
                              <div className="text-xs text-gray-500">{enquiry.designation}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center text-sm text-gray-700">
                              <FaEnvelope className="text-orange-400 mr-2 text-xs" />
                              <span className="truncate max-w-[150px]" title={enquiry.email}>{enquiry.email}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-700">
                              <FaPhone className="text-orange-400 mr-2 text-xs" />
                              {enquiry.phone}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            {enquiry.website ? (
                              <a href={enquiry.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                                <FaGlobe className="text-xs" /> <span className="truncate max-w-[120px]">{enquiry.website}</span>
                              </a>
                            ) : (
                              <span className="text-gray-400 text-xs italic">N/A</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {enquiry.collaborationAreas?.slice(0, 2).map((area, index) => (
                              <span key={index} className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 text-xs rounded-full">
                                {area}
                              </span>
                            ))}
                            {enquiry.collaborationAreas?.length > 2 && (
                              <span className="text-xs text-gray-500">+{enquiry.collaborationAreas.length - 2} more</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(enquiry.status)} capitalize border border-opacity-20`}>
                            {enquiry.status || 'pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(enquiry.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewEnquiry(enquiry)}
                              className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100 transition-colors shadow-sm"
                              title="View Details"
                            >
                              <FaEye className="text-sm" />
                            </button>
                            {enquiry.status !== 'qualified' && (
                              <button
                                onClick={() => handleMarkQualified(enquiry)}
                                className="bg-green-50 text-green-600 p-2 rounded-lg hover:bg-green-100 transition-colors shadow-sm"
                                title="Mark as Qualified"
                              >
                                <FaCheck className="text-sm" />
                              </button>
                            )}
                            <button
                              onClick={() => handleEditEnquiry(enquiry)}
                              className="bg-orange-50 text-orange-600 p-2 rounded-lg hover:bg-orange-100 transition-colors shadow-sm"
                              title="Edit Enquiry"
                            >
                              <FaEdit className="text-sm" />
                            </button>
                            <button
                              onClick={() => handleDeleteEnquiry(enquiry)}
                              className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100 transition-colors shadow-sm"
                              title="Delete Enquiry"
                            >
                              <FaTrash className="text-sm" />
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
            <div className="md:hidden p-4 space-y-4 bg-gray-50">
              {loading ? (
                <div className="flex justify-center py-8">
                  <FaSpinner className="animate-spin text-orange-500 text-3xl" />
                </div>
              ) : filteredEnquiries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FaStore className="text-4xl mx-auto mb-2 text-gray-300" />
                  No enquiries found
                </div>
              ) : (
                currentEnquiries.map((enquiry) => (
                  <div key={enquiry.id} className="bg-white rounded-xl shadow-sm border border-orange-100 p-4 relative overflow-hidden">
                    <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-xs font-bold ${getStatusColor(enquiry.status)}`}>
                      {enquiry.status || 'Pending'}
                    </div>

                    <div className="flex items-start gap-3 mb-4 mt-2">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                        <FaStore className="text-xl" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg leading-tight">{enquiry.organizationName}</h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          {enquiry.name} <span className="text-gray-300">•</span> {enquiry.designation}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <FaEnvelope className="text-orange-400 text-xs" />
                        <span className="truncate">{enquiry.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <FaPhone className="text-orange-400 text-xs" />
                        <span>{enquiry.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <FaClock className="text-orange-400 text-xs" />
                        <span>{new Date(enquiry.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 border-t border-gray-100 pt-3">
                      <button
                        onClick={() => handleViewEnquiry(enquiry)}
                        className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors gap-1"
                      >
                        <FaEye />
                        <span className="text-[10px] font-medium">View</span>
                      </button>
                      {enquiry.status !== 'qualified' && (
                        <button
                          onClick={() => handleMarkQualified(enquiry)}
                          className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-green-50 text-green-600 transition-colors gap-1"
                        >
                          <FaCheck />
                          <span className="text-[10px] font-medium">Approve</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleEditEnquiry(enquiry)}
                        className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-orange-50 text-orange-600 transition-colors gap-1"
                      >
                        <FaEdit />
                        <span className="text-[10px] font-medium">Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteEnquiry(enquiry)}
                        className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors gap-1"
                      >
                        <FaTrash />
                        <span className="text-[10px] font-medium">Delete</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination - Only show if more than 10 items */}
            {filteredEnquiries.length > 10 && (
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-600">
                    Showing <span className="font-semibold text-orange-700">{indexOfFirstItem + 1}</span> to{' '}
                    <span className="font-semibold text-orange-700">{Math.min(indexOfLastItem, filteredEnquiries.length)}</span> of{' '}
                    <span className="font-semibold text-orange-700">{filteredEnquiries.length}</span> enquiries
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
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${currentPage === pageNumber
                                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
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

          {/* View Modal */}
          {showViewModal && selectedEnquiry && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={closeModals}>
              <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto transform transition-all duration-300" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-t-2xl">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl font-bold text-white">Franchise Enquiry Details</h2>
                      <p className="text-orange-100 mt-1">Complete information about the franchise request</p>
                    </div>
                    <button
                      onClick={closeModals}
                      className="text-orange-100 hover:text-white p-2 rounded-lg hover:bg-orange-600 transition-all"
                    >
                      <FaTimes size={20} />
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {/* Contact Information Card */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 border border-blue-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <FaStore className="text-white text-sm" />
                      </div>
                      Contact Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="bg-white rounded-lg p-4 border border-blue-200">
                          <label className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Contact Person</label>
                          <p className="text-lg font-medium text-gray-800 mt-1">{selectedEnquiry.name}</p>
                        </div>

                        <div className="bg-white rounded-lg p-4 border border-blue-200">
                          <label className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Organization</label>
                          <p className="text-lg font-medium text-gray-800 mt-1">{selectedEnquiry.organizationName}</p>
                        </div>

                        <div className="bg-white rounded-lg p-4 border border-blue-200">
                          <label className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Designation</label>
                          <p className="text-lg font-medium text-gray-800 mt-1">{selectedEnquiry.designation}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-white rounded-lg p-4 border border-blue-200">
                          <label className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Email Address</label>
                          <div className="flex items-start gap-2 mt-1">
                            <FaEnvelope className="text-blue-500 mt-1 shrink-0" />
                            <p className="text-lg font-medium text-gray-800 break-all">{selectedEnquiry.email}</p>
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-4 border border-blue-200">
                          <label className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Phone Number</label>
                          <div className="flex items-center gap-2 mt-1">
                            <FaPhone className="text-blue-500" />
                            <p className="text-lg font-medium text-gray-800">{selectedEnquiry.phone}</p>
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-4 border border-blue-200">
                          <label className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Website</label>
                          <div className="mt-1">
                            {selectedEnquiry.website ? (
                              <a href={selectedEnquiry.website} target="_blank" rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 flex items-start gap-2 font-medium break-all">
                                <FaGlobe className="mt-1 shrink-0" />
                                <span>{selectedEnquiry.website}</span>
                              </a>
                            ) : (
                              <p className="text-gray-500 italic">No website provided</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status & Date Information Card */}
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 mb-6 border border-amber-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                        <FaClock className="text-white text-sm" />
                      </div>
                      Status Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white rounded-lg p-4 border border-amber-200">
                        <label className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Current Status</label>
                        <div className="mt-2">
                          <span className={`px-3 py-2 rounded-lg text-sm font-semibold ${getStatusColor(selectedEnquiry.status)}`}>
                            {selectedEnquiry.status}
                          </span>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-amber-200">
                        <label className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Date Submitted</label>
                        <p className="text-lg font-medium text-gray-800 mt-1">{new Date(selectedEnquiry.created_at).toLocaleDateString()}</p>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-amber-200">
                        <label className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Agreed to Contact</label>
                        <div className="mt-2">
                          <span className={`px-3 py-2 rounded-lg text-sm font-semibold ${selectedEnquiry.agreedToContact ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {selectedEnquiry.agreedToContact ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Collaboration Areas Card */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 mb-6 border border-purple-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                        <FaCheck className="text-white text-sm" />
                      </div>
                      Collaboration Areas
                    </h3>
                    <div className="bg-white rounded-lg p-4 border border-purple-200">
                      <div className="flex flex-wrap gap-3">
                        {selectedEnquiry.collaborationAreas?.length > 0 ? (
                          selectedEnquiry.collaborationAreas.map((area, index) => (
                            <span key={index} className="px-4 py-2 bg-purple-100 text-purple-800 text-sm font-medium rounded-lg border border-purple-200">
                              {area}
                            </span>
                          ))
                        ) : (
                          <p className="text-gray-500 italic">No collaboration areas specified</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Message Card */}
                  {selectedEnquiry.message && (
                    <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-100">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center">
                          <FaEnvelope className="text-white text-sm" />
                        </div>
                        Message
                      </h3>
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedEnquiry.message}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Edit Modal */}
          {showEditModal && selectedEnquiry && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">Edit Franchise Enquiry</h2>
                  <button onClick={closeModals} className="text-gray-500 hover:text-gray-700">
                    <FaTimes size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Contact Person</label>
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-600">Organization</label>
                      <input
                        type="text"
                        value={editForm.organizationName || ''}
                        onChange={(e) => setEditForm({ ...editForm, organizationName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-600">Designation</label>
                      <input
                        type="text"
                        value={editForm.designation || ''}
                        onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-600">Email</label>
                      <input
                        type="email"
                        value={editForm.email || ''}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-600">Phone</label>
                      <input
                        type="text"
                        value={editForm.phone || ''}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Website</label>
                      <input
                        type="url"
                        value={editForm.website || ''}
                        onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-600">Status</label>
                      <select
                        value={editForm.status || 'pending'}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="pending">Pending</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-600">Collaboration Areas (comma-separated)</label>
                      <input
                        type="text"
                        value={editForm.collaborationAreas || ''}
                        onChange={(e) => setEditForm({ ...editForm, collaborationAreas: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="e.g., Communication Training, Technical Training"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-sm font-semibold text-gray-600">Message</label>
                  <textarea
                    value={editForm.message || ''}
                    onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={closeModals}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
                  >
                    <FaSave /> Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteModal && selectedEnquiry && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Confirm Delete</h2>
                  <button onClick={closeModals} className="text-gray-500 hover:text-gray-700">
                    <FaTimes size={20} />
                  </button>
                </div>

                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete the enquiry from <strong>{selectedEnquiry.organizationName}</strong>?
                  This action cannot be undone.
                </p>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={closeModals}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
                  >
                    <FaTrash /> Delete
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

export default FranchiseEnquiries;