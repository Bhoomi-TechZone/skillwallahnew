import React, { useState, useEffect } from 'react';
import { FaUserShield, FaPlus, FaEdit, FaTrash, FaEye, FaKey, FaBars } from 'react-icons/fa';
import SuperAdminSidebar from '../SuperAdminSidebar';
import { useNavigate } from 'react-router-dom';

const AdminUsers = () => {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [editAdmin, setEditAdmin] = useState({
    name: '',
    email: ''
  });
  const [passwordReset, setPasswordReset] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/users/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('All users response:', data);

        // Handle different response formats
        let usersArray = [];
        if (Array.isArray(data)) {
          usersArray = data;
        } else if (data.users && Array.isArray(data.users)) {
          usersArray = data.users;
        } else if (data.data && Array.isArray(data.data)) {
          usersArray = data.data;
        }

        // Filter only admin users
        const adminUsers = usersArray.filter(user => user.role === 'admin');
        console.log('Filtered admin users:', adminUsers);
        setAdmins(adminUsers);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch users:', response.status, errorData);
        setError('Failed to fetch admin users');
        setAdmins([]);
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
      setError('Network error. Please check your connection.');
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();

    if (!newAdmin.name.trim() || !newAdmin.email.trim() || !newAdmin.password.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    if (newAdmin.password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/users/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newAdmin.name,
          email: newAdmin.email,
          password: newAdmin.password,
          role: 'admin'
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Create admin response:', data);

        await fetchAdmins(); // Refresh the admins list
        setShowAddForm(false);
        setNewAdmin({
          name: '',
          email: '',
          password: ''
        });
        alert('Admin created successfully!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Create admin failed:', response.status, errorData);
        alert(errorData.detail || errorData.message || 'Failed to create admin. Please try again.');
      }
    } catch (error) {
      console.error('Error creating admin:', error);
      alert('Network error. Please check your connection.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewAdmin = (admin) => {
    setSelectedAdmin(admin);
    setShowViewModal(true);
  };

  const handleEditAdmin = (admin) => {
    setSelectedAdmin(admin);
    setEditAdmin({
      name: admin.name || '',
      email: admin.email || ''
    });
    setShowEditModal(true);
  };

  const handlePasswordReset = (admin) => {
    setSelectedAdmin(admin);
    setPasswordReset({
      newPassword: '',
      confirmPassword: ''
    });
    setShowPasswordModal(true);
  };

  const handleUpdateAdmin = async (e) => {
    e.preventDefault();

    if (!editAdmin.name.trim() || !editAdmin.email.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/users/${selectedAdmin.id || selectedAdmin._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editAdmin.name,
          email: editAdmin.email
        })
      });

      if (response.ok) {
        await fetchAdmins(); // Refresh the admins list
        setShowEditModal(false);
        alert('Admin updated successfully!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Update admin failed:', response.status, errorData);
        alert(errorData.detail || errorData.message || 'Failed to update admin.');
      }
    } catch (error) {
      console.error('Error updating admin:', error);
      alert('Network error. Please check your connection.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();

    if (!passwordReset.newPassword.trim() || !passwordReset.confirmPassword.trim()) {
      alert('Please fill in all password fields');
      return;
    }

    if (passwordReset.newPassword !== passwordReset.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (passwordReset.newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/users/${selectedAdmin.id || selectedAdmin._id}/password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: passwordReset.newPassword
        })
      });

      if (response.ok) {
        setShowPasswordModal(false);
        alert('Password reset successfully!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Password reset failed:', response.status, errorData);
        alert(errorData.detail || errorData.message || 'Failed to reset password.');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Network error. Please check your connection.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAdmin = async (adminId, adminName) => {
    if (!window.confirm(`Are you sure you want to delete admin "${adminName}"?`)) {
      return;
    }

    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/users/${adminId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await fetchAdmins(); // Refresh the admins list
        alert('Admin deleted successfully!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Delete admin failed:', response.status, errorData);
        alert(errorData.detail || errorData.message || 'Failed to delete admin.');
      }
    } catch (error) {
      console.error('Error deleting admin:', error);
      alert('Network error. Please check your connection.');
    } finally {
      setActionLoading(false);
    }
  };

  const calculateStats = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const newThisMonth = admins.filter(admin => {
      if (!admin.created_at) return false;
      const createdDate = new Date(admin.created_at);
      return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;
    }).length;

    return {
      total: admins.length,
      active: admins.filter(a => a.status !== 'inactive' && a.status !== 'suspended').length,
      superAdmins: admins.filter(a =>
        a.permissions?.includes('super') ||
        a.permissions?.includes('full_access') ||
        (Array.isArray(a.permissions) && a.permissions.length > 5)
      ).length,
      newThisMonth
    };
  };

  const stats = calculateStats();

  const filteredAdmins = admins.filter(admin =>
    admin.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredAdmins.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAdmins = filteredAdmins.slice(indexOfFirstItem, indexOfLastItem);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SuperAdminSidebar
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        activeMenuItem="Admin Users"
        setActiveMenuItem={() => { }}
      />
      <div className={`flex-1 h-screen overflow-y-auto transition-all duration-300 ${sidebarOpen ? 'sm:ml-80 md:ml-72 lg:ml-72' : ''}`}>
        <div className="lg:hidden bg-white border-b p-4 flex items-center sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-gray-900 p-2">
            <FaBars className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold ml-4 bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent">Admin Management</h1>
        </div>
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Admin Management</h1>
            <p className="text-gray-600">Manage administrative users and permissions</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100">Total Admins</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <FaUserShield className="text-3xl text-amber-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100">Active Admins</p>
                  <p className="text-2xl font-bold">{stats.active}</p>
                </div>
                <FaUserShield className="text-3xl text-orange-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100">Super Admins</p>
                  <p className="text-2xl font-bold">{stats.superAdmins}</p>
                </div>
                <FaKey className="text-3xl text-yellow-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100">New This Month</p>
                  <p className="text-2xl font-bold">{stats.newThisMonth}</p>
                </div>
                <FaPlus className="text-3xl text-purple-200" />
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <div className="text-red-600 mr-3">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-red-800">
                  <p className="font-medium">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Search and Add */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <input
                type="text"
                placeholder="Search admins..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <FaPlus /> Add New Admin
              </button>
            </div>
          </div>

          {/* Admins Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                        Loading admins...
                      </td>
                    </tr>
                  ) : filteredAdmins.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                        No admins found
                      </td>
                    </tr>
                  ) : (
                    currentAdmins.map((admin) => (
                      <tr key={admin.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                                <FaUserShield />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{admin.name}</div>
                              <div className="text-sm text-gray-500">{admin.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {admin.permissions?.map((permission, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full"
                              >
                                {permission}
                              </span>
                            )) || (
                                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                                  Standard
                                </span>
                              )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {admin.last_login ? new Date(admin.last_login).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${admin.status === 'active' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
                            }`}>
                            {admin.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              title="View Details"
                              onClick={() => handleViewAdmin(admin)}
                              disabled={actionLoading}
                              className="text-amber-600 hover:text-amber-900 p-1 rounded transition-colors disabled:opacity-50"
                            >
                              <FaEye />
                            </button>
                            <button
                              title="Edit Admin"
                              onClick={() => handleEditAdmin(admin)}
                              disabled={actionLoading}
                              className="text-orange-600 hover:text-orange-900 p-1 rounded transition-colors disabled:opacity-50"
                            >
                              <FaEdit />
                            </button>
                            <button
                              title="Reset Password"
                              onClick={() => handlePasswordReset(admin)}
                              disabled={actionLoading}
                              className="text-orange-600 hover:text-orange-900 p-1 rounded transition-colors disabled:opacity-50"
                            >
                              <FaKey />
                            </button>
                            <button
                              title="Delete Admin"
                              onClick={() => handleDeleteAdmin(admin.id || admin._id, admin.name)}
                              disabled={actionLoading}
                              className="text-red-600 hover:text-red-900 p-1 rounded transition-colors disabled:opacity-50"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredAdmins.length > 0 && (
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-600">
                    Showing <span className="font-semibold text-amber-700">{indexOfFirstItem + 1}</span> to{' '}
                    <span className="font-semibold text-amber-700">{Math.min(indexOfLastItem, filteredAdmins.length)}</span> of{' '}
                    <span className="font-semibold text-amber-700">{filteredAdmins.length}</span> admins
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
                                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg'
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

          {/* Add Admin Modal */}
          {showAddForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Add New Admin</h2>
                <form onSubmit={handleAddAdmin}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      value={newAdmin.name}
                      onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={newAdmin.email}
                      onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <input
                      type="password"
                      value={newAdmin.password}
                      onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 disabled:opacity-50"
                    >
                      {actionLoading ? 'Creating...' : 'Add Admin'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* View Admin Modal */}
          {showViewModal && selectedAdmin && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Admin Details</h2>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedAdmin.name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedAdmin.email || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedAdmin.role || 'admin'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${selectedAdmin.status === 'active' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
                      }`}>
                      {selectedAdmin.status || 'Active'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Login</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedAdmin.last_login ? new Date(selectedAdmin.last_login).toLocaleString() : 'Never'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Permissions</label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedAdmin.permissions?.map((permission, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full"
                        >
                          {permission}
                        </span>
                      )) || (
                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                            Standard
                          </span>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Edit Admin Modal */}
          {showEditModal && selectedAdmin && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Edit Admin</h2>
                <form onSubmit={handleUpdateAdmin}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      value={editAdmin.name}
                      onChange={(e) => setEditAdmin({ ...editAdmin, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={editAdmin.email}
                      onChange={(e) => setEditAdmin({ ...editAdmin, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 disabled:opacity-50"
                    >
                      {actionLoading ? 'Updating...' : 'Update Admin'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Password Reset Modal */}
          {showPasswordModal && selectedAdmin && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Reset Password</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Reset password for: <strong>{selectedAdmin.name}</strong>
                </p>
                <form onSubmit={handlePasswordResetSubmit}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                    <input
                      type="password"
                      value={passwordReset.newPassword}
                      onChange={(e) => setPasswordReset({ ...passwordReset, newPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                    <input
                      type="password"
                      value={passwordReset.confirmPassword}
                      onChange={(e) => setPasswordReset({ ...passwordReset, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowPasswordModal(false)}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50"
                    >
                      {actionLoading ? 'Resetting...' : 'Reset Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;