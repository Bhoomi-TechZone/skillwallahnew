import React, { useState, useEffect } from 'react';
import BranchLayout from '../../components/Branch/BranchLayout';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaUsers,
  FaUserTie,
  FaEye,
  FaEyeSlash,
  FaTimes,
  FaSearch,
  FaUserCheck,
  FaUserCog,
  FaSpinner
} from 'react-icons/fa';

const ManageUsers = () => {
  // State management
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPassword, setShowPassword] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Form data for add/edit
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    branch: '',
    password: '',
    permission: 'User',
    status: 'Active'
  });

  // Get franchise code from token or localStorage
  const getFranchiseCode = () => {
    const token = localStorage.getItem('token');
    console.log('🔍 Token exists:', !!token);

    if (token) {
      try {
        // Decode JWT token to get franchise_code
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('🔍 Token payload:', payload);
        console.log('🔍 Franchise code from token:', payload.franchise_code);
        return payload.franchise_code;
      } catch (err) {
        console.warn('Failed to decode token:', err);
      }
    }

    // Fallback to localStorage or default
    const fallbackCode = localStorage.getItem('franchise_code') || 'FR-IN-UTT-0A388';
    console.log('🔍 Using fallback franchise code:', fallbackCode);
    return fallbackCode;
  };

  // Fetch branches from API
  const fetchBranches = async () => {
    try {
      setBranchesLoading(true);

      const token = localStorage.getItem('token');
      const franchiseCode = getFranchiseCode();

      if (!token) {
        console.error('No authentication token found');
        setBranches([]);
        return;
      }

      const apiBaseUrl = 'http://localhost:4000';

      console.log('🏢 Fetching branches for franchise:', franchiseCode);
      console.log('🌐 API Base URL:', apiBaseUrl);
      console.log('🔗 Full URL:', `${apiBaseUrl}/api/branch/branches/${franchiseCode}`);
      console.log('🔑 Token length:', token.length);
      const response = await fetch(`${apiBaseUrl}/api/branch/branches/${franchiseCode}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      // Check if response is HTML (error page) instead of JSON
      const contentType = response.headers.get('content-type');
      console.log('📄 Content-Type:', contentType);

      if (!contentType || !contentType.includes('application/json')) {
        console.error('❌ API returned HTML instead of JSON');
        const textResponse = await response.text();
        console.error('📄 Response body preview:', textResponse.substring(0, 200));
        setBranches([]);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Failed to fetch branches:', errorData);
        setBranches([]);
        return;
      }

      const data = await response.json();
      console.log('🏢 Raw branches response:', data);
      console.log('📊 Response type:', typeof data);
      console.log('📋 Response keys:', Object.keys(data));

      if (data.branches && Array.isArray(data.branches)) {
        console.log('📦 Found branches array with', data.branches.length, 'items');
        console.log('🏢 First branch sample:', data.branches[0]);

        // Format branches for dropdown
        const formattedBranches = data.branches.map((branch, index) => {
          console.log(`🏢 Processing branch ${index + 1}:`, branch);
          return {
            id: branch.centre_info?.code || branch.id || `branch-${index}`,
            name: branch.centre_info?.centre_name || branch.name || 'Unknown Branch',
            code: branch.centre_info?.code || branch.code || `CODE-${index}`,
            centre_info: branch.centre_info
          };
        });

        console.log('✅ Formatted branches for dropdown:', formattedBranches);
        setBranches(formattedBranches);
        console.log('✅ Successfully loaded', formattedBranches.length, 'branches');
      } else if (Array.isArray(data)) {
        console.log('📦 Data is direct array with', data.length, 'items');
        setBranches(data);
      } else {
        console.warn('⚠️ Unexpected response format:', data);
        setBranches([]);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
      setBranches([]);
    } finally {
      setBranchesLoading(false);
    }
  };

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const apiBaseUrl = 'http://localhost:4000';

      console.log('🔄 Fetching branch users...');
      console.log('🌐 Users API URL:', `${apiBaseUrl}/api/branch/branch-users`);

      // Time-based caching for background updates
      const CACHE_KEY = 'branch_users_data';
      const CACHE_TIME_KEY = 'branch_users_timestamp';

      const response = await fetch(`${apiBaseUrl}/api/branch/branch-users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Check if response is HTML (error page) instead of JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Expected JSON but got:', contentType);
        console.error('Response body:', textResponse.substring(0, 200));
        throw new Error('Server returned HTML instead of JSON. Please check if the API endpoint exists.');
      }

      const data = await response.json();
      console.log('📥 Branch users response:', data);

      if (response.ok && (data.success || Array.isArray(data))) {
        const usersList = data.users || data || [];
        setUsers(usersList);

        // Cache the fresh data
        localStorage.setItem(CACHE_KEY, JSON.stringify(usersList));
        localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
      } else {
        throw new Error(data.detail || data.message || 'Failed to fetch users');
      }
    } catch (err) {
      console.error('❌ Error fetching users:', err);
      setError(err.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Add new user
  const addUser = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login first');
        return;
      }

      // Prepare user data with franchise code
      const franchiseCode = getFranchiseCode();
      const userData = {
        ...formData,
        franchise_code: franchiseCode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const apiBaseUrl = 'http://localhost:4000';

      console.log('➕ Adding new user:', userData);
      console.log('🌐 Add user API URL:', `${apiBaseUrl}/api/branch/branch-users`);

      const response = await fetch(`${apiBaseUrl}/api/branch/branch-users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      // Check if response is HTML (error page) instead of JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned HTML instead of JSON. API may be down.');
      }

      const data = await response.json();
      console.log('📤 Add user response:', data);

      if (response.ok && data.success) {
        setUsers(prevUsers => [...prevUsers, data.user]);
        setIsAddModalOpen(false);
        resetForm();
        console.log('✅ User added successfully');
      } else {
        throw new Error(data.detail || data.message || 'Failed to add user');
      }
    } catch (err) {
      console.error('❌ Error adding user:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Update user
  const updateUser = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login first');
        return;
      }

      console.log('📝 Updating user:', selectedUser.id, formData);

      const apiBaseUrl = 'http://localhost:4000';
      const response = await fetch(`${apiBaseUrl}/api/branch/branch-users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          permission: formData.permission,
          status: formData.status || 'Active'
        })
      });

      // Check if response is HTML (error page) instead of JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned HTML instead of JSON. API may be down.');
      }

      const data = await response.json();
      console.log('📝 Update user response:', data);

      if (response.ok && data.success) {
        setUsers(prevUsers =>
          prevUsers.map(user =>
            user.id === selectedUser.id
              ? { ...user, permission: formData.permission, status: formData.status || 'Active' }
              : user
          )
        );
        setIsEditModalOpen(false);
        setSelectedUser(null);
        resetForm();
        console.log('✅ User updated successfully');
      } else {
        throw new Error(data.detail || data.message || 'Failed to update user');
      }
    } catch (err) {
      console.error('❌ Error updating user:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete user
  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login first');
        return;
      }

      console.log('🗑️ Deleting user:', userId);

      const apiBaseUrl = 'http://localhost:4000';
      const response = await fetch(`${apiBaseUrl}/api/branch/branch-users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Check if response is HTML (error page) instead of JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned HTML instead of JSON. API may be down.');
      }

      const data = await response.json();
      console.log('🗑️ Delete user response:', data);

      if (response.ok && data.success) {
        setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
        console.log('✅ User deleted successfully');
      } else {
        throw new Error(data.detail || data.message || 'Failed to delete user');
      }
    } catch (err) {
      console.error('❌ Error deleting user:', err);
      setError(err.message);
    }
  };

  // Helper functions
  const resetForm = () => {
    setFormData({
      username: '',
      name: '',
      branch: '',
      password: '',
      permission: 'User',
      status: 'Active'
    });
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      name: user.name,
      branch: user.branch,
      password: user.password,
      permission: user.permission,
      status: user.status
    });
    setIsEditModalOpen(true);
  };

  const togglePasswordVisibility = (userId) => {
    setShowPassword(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.branch?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate stats
  const stats = {
    total: users.length,
    active: users.filter(user => user.status === 'Active').length,
    admins: users.filter(user => user.permission === 'Admin').length,
    branches: [...new Set(users.map(user => user.branch))].length
  };

  // Load data on component mount
  useEffect(() => {
    // 1. Try to load from cache immediately (Stale-While-Revalidate)
    const CACHE_KEY = 'branch_users_data';
    const cachedUsers = localStorage.getItem(CACHE_KEY);

    if (cachedUsers) {
      try {
        setUsers(JSON.parse(cachedUsers));
        setLoading(false); // Show cached data immediately
      } catch (e) {
        console.error('Error parsing cached users', e);
      }
    }

    // 2. Fetch fresh data in background
    fetchUsers();
    fetchBranches();
  }, []);

  if (loading && users.length === 0) {
    return (
      <BranchLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <FaSpinner className="text-4xl text-amber-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading users...</p>
          </div>
        </div>
      </BranchLayout>
    );
  }

  return (
    <BranchLayout>
      <div className="p-4 md:p-6 min-h-screen bg-gradient-to-br from-slate-50 to-amber-50">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">Manage Users</h1>
              <p className="text-gray-600">Manage your branch staff and users</p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setIsAddModalOpen(true);
              }}
              className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 w-full md:w-auto"
            >
              <FaPlus className="mr-2" />
              Add New User
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700">
            <p className="font-medium">Error:</p>
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-6 rounded-2xl text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-medium">Total Users</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <FaUsers className="text-4xl text-amber-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-2xl text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Active Users</p>
                <p className="text-3xl font-bold">{stats.active}</p>
              </div>
              <FaUserCheck className="text-4xl text-orange-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Admins</p>
                <p className="text-3xl font-bold">{stats.admins}</p>
              </div>
              <FaUserTie className="text-4xl text-purple-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-2xl text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Branches</p>
                <p className="text-3xl font-bold">{stats.branches}</p>
              </div>
              <FaUserCog className="text-4xl text-orange-200" />
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative w-full md:max-w-md">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>

        {/* Mobile Users View (Cards) */}
        <div className="md:hidden space-y-4">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white rounded-2xl shadow-sm">
              <FaUsers className="text-4xl mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No users found</p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.id} className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{user.name}</h3>
                    <p className="text-xs text-gray-500">@{user.username}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.status === 'Active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                    }`}>
                    {user.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center text-gray-600">
                    <span className="w-20 font-medium text-gray-500">Branch:</span>
                    <span>{user.branch}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <span className="w-20 font-medium text-gray-500">Role:</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${user.permission === 'Admin'
                      ? 'bg-purple-100 text-purple-800'
                      : user.permission === 'Staff'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-gray-100 text-gray-800'
                      }`}>
                      {user.permission}
                    </span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <span className="w-20 font-medium text-gray-500">Password:</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono">
                        {showPassword[user.id] ? user.password : '••••••••'}
                      </span>
                      <button
                        onClick={() => togglePasswordVisibility(user.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {showPassword[user.id] ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => openEditModal(user)}
                    className="flex items-center px-3 py-1.5 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors text-sm font-medium"
                  >
                    <FaEdit className="mr-1.5" /> Edit
                  </button>
                  <button
                    onClick={() => deleteUser(user.id)}
                    className="flex items-center px-3 py-1.5 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                  >
                    <FaTrash className="mr-1.5" /> Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Users Table */}
        <div className="hidden md:block bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-amber-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Username</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Branch</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Password</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Permission</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      <FaUsers className="text-4xl mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">No users found</p>
                      <p className="text-sm">
                        {searchTerm ? 'Try adjusting your search criteria' : 'Add your first user to get started'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">{user.username}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-700">{user.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-700">{user.branch}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm">
                            {showPassword[user.id] ? user.password : '••••••••'}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(user.id)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {showPassword[user.id] ? <FaEyeSlash /> : <FaEye />}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.permission === 'Admin'
                          ? 'bg-purple-100 text-purple-800'
                          : user.permission === 'Staff'
                            ? 'bg-amber-100 text-amber-800'
                            : user.permission === 'Instructor'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                          {user.permission}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.status === 'Active'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-red-100 text-red-800'
                          }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => openEditModal(user)}
                            className="text-amber-600 hover:text-amber-800 transition-colors"
                            title="Edit User"
                          >
                            <FaEdit className="text-lg" />
                          </button>
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Delete User"
                          >
                            <FaTrash className="text-lg" />
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

        {/* Add User Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-800">Add New User</h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Enter username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
                  {branches.length > 0 ? (
                    <select
                      value={formData.branch}
                      onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      <option value="">Select a branch</option>
                      {branches.map((branch) => (
                        <option key={branch.id || branch.code} value={branch.code}>
                          {branch.centre_info?.centre_name || branch.name} ({branch.centre_info?.code || branch.code})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData.branch}
                      onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder={branchesLoading ? "Loading branches..." : "Enter branch name"}
                      disabled={branchesLoading}
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Enter password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Permission</label>
                  <select
                    value={formData.permission}
                    onChange={(e) => setFormData({ ...formData, permission: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="User">User</option>
                    <option value="Staff">Staff</option>
                    <option value="Instructor">Instructor</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-3 mt-8">
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={addUser}
                  disabled={submitting || !formData.username || !formData.name}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-600 to-purple-600 text-white rounded-lg hover:from-amber-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {submitting ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Adding...
                    </>
                  ) : (
                    'Add User'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {isEditModalOpen && selectedUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-800">Edit User</h3>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedUser(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    disabled
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    disabled
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Permission</label>
                  <select
                    value={formData.permission}
                    onChange={(e) => setFormData({ ...formData, permission: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="User">User</option>
                    <option value="Staff">Staff</option>
                    <option value="Instructor">Instructor</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-3 mt-8">
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedUser(null);
                  }}
                  className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={updateUser}
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-600 to-purple-600 text-white rounded-lg hover:from-amber-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {submitting ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    'Update User'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BranchLayout>
  );
};

export default ManageUsers;