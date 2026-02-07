import React, { useState, useEffect } from 'react';
import { FaUsers, FaUserShield, FaUserTie, FaUserGraduate, FaPlus, FaEdit, FaTrash, FaEye, FaSearch, FaFilter, FaDownload, FaSave, FaTimes, FaBars } from 'react-icons/fa';
import { MdClose } from 'react-icons/md';
import SuperAdminSidebar from '../SuperAdminSidebar';
import { useNavigate } from 'react-router-dom';

const AllUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student'
  });
  const [userCounts, setUserCounts] = useState({
    total: 0,
    admin: 0,
    instructor: 0,
    student: 0
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch('http://localhost:4000/users/', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Users API Response:', data);

        let usersArray = [];
        // Handle different response formats
        if (Array.isArray(data)) {
          usersArray = data;
        } else if (data.data && Array.isArray(data.data)) {
          usersArray = data.data;
        } else if (data.users && Array.isArray(data.users)) {
          usersArray = data.users;
        }

        setUsers(usersArray);

        // Calculate role-based counts
        const counts = {
          total: usersArray.length,
          admin: usersArray.filter(user => user.role === 'admin').length,
          instructor: usersArray.filter(user => user.role === 'instructor').length,
          student: usersArray.filter(user => user.role === 'student').length
        };

        setUserCounts(counts);
        console.log('User counts:', counts);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch users:', response.status, errorData);
        setUsers([]);
        setUserCounts({ total: 0, admin: 0, instructor: 0, student: 0 });

        if (response.status === 401) {
          alert('Session expired. Please login again.');
          // Redirect to login if needed
        } else {
          alert(errorData.detail || 'Failed to fetch users');
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
      setUserCounts({ total: 0, admin: 0, instructor: 0, student: 0 });
      alert('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesFilter = filter === 'all' || user.role === filter;
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm]);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <FaUserShield className="text-amber-600" />;
      case 'instructor': return <FaUserTie className="text-orange-600" />;
      case 'student': return <FaUserGraduate className="text-yellow-600" />;
      default: return <FaUsers className="text-slate-500" />;
    }
  };

  const getRoleBadge = (role) => {
    const colors = {
      admin: 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border border-amber-200',
      instructor: 'bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-800 border border-orange-200',
      student: 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border border-yellow-200'
    };
    return colors[role] || 'bg-gradient-to-r from-slate-100 to-gray-100 text-slate-800 border border-slate-200';
  };

  // User action handlers
  const handleViewUser = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser({ ...user });
    setShowEditModal(true);
  };

  const handleDeleteUser = (user) => {
    setDeletingUser(user);
    setShowDeleteModal(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editingUser.name,
          role: editingUser.role
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Update response:', data);

        await fetchUsers(); // Refresh the users list
        setShowEditModal(false);
        setEditingUser(null);
        alert(data.message || 'User updated successfully!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Update failed:', response.status, errorData);
        alert(errorData.detail || 'Failed to update user. Please try again.');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Network error. Please check your connection.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;

    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/users/${deletingUser.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Delete response:', data);

        await fetchUsers(); // Refresh the users list
        setShowDeleteModal(false);
        setDeletingUser(null);
        alert(data.message || 'User deleted successfully!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Delete failed:', response.status, errorData);
        alert(errorData.detail || 'Failed to delete user. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Network error. Please check your connection.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();

    // Validate form
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      alert('Please fill in all fields');
      return;
    }

    if (newUser.password.length < 6) {
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
        body: JSON.stringify(newUser)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Create user response:', data);

        await fetchUsers(); // Refresh the users list
        setShowAddUser(false);
        setNewUser({ name: '', email: '', password: '', role: 'student' });
        alert(data.message || 'User created successfully!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Create user failed:', response.status, errorData);
        alert(errorData.detail || 'Failed to create user. Please try again.');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Network error. Please check your connection.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportUsers = () => {
    // Create CSV content
    const headers = ['ID', 'Name', 'Email', 'Role', 'Created At'];
    const csvContent = [
      headers.join(','),
      ...filteredUsers.map(user => [
        user.id,
        `"${user.name}"`,
        user.email,
        user.role,
        new Date(user.created_at).toLocaleDateString()
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-amber-50/30">
      {/* Sidebar */}
      <SuperAdminSidebar
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        activeMenuItem="User Management"
        setActiveMenuItem={() => { }}
      />

      {/* Main Content */}
      <div className={`flex-1 h-screen overflow-y-auto transition-all duration-300 ${sidebarOpen ? 'sm:ml-80 md:ml-72 lg:ml-72' : ''}`}>
        {/* Mobile Header with Menu Button */}
        <div className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-600 hover:text-gray-900 p-2"
          >
            <FaBars className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent">
            User Management
          </h1>
          <div className="w-10"></div>
        </div>

        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent mb-2">
                  User Management
                </h1>
                <p className="text-slate-600">Manage all platform users across different roles</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddUser(true)}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <FaPlus /> Add User
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm font-medium">Total Users</p>
                  <p className="text-3xl font-bold">{loading ? '...' : userCounts.total}</p>
                  <p className="text-amber-200 text-xs mt-1">All platform users</p>
                </div>
                <div className="bg-white/20 p-3 rounded-xl">
                  <FaUsers className="text-2xl" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Admins</p>
                  <p className="text-3xl font-bold">{loading ? '...' : userCounts.admin}</p>
                  <p className="text-orange-200 text-xs mt-1">System administrators</p>
                </div>
                <div className="bg-white/20 p-3 rounded-xl">
                  <FaUserShield className="text-2xl" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm font-medium">Instructors</p>
                  <p className="text-3xl font-bold">{loading ? '...' : userCounts.instructor}</p>
                  <p className="text-yellow-200 text-xs mt-1">Course instructors</p>
                </div>
                <div className="bg-white/20 p-3 rounded-xl">
                  <FaUserTie className="text-2xl" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-600 to-yellow-600 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm font-medium">Students</p>
                  <p className="text-3xl font-bold">{loading ? '...' : userCounts.student}</p>
                  <p className="text-amber-200 text-xs mt-1">Active learners</p>
                </div>
                <div className="bg-white/20 p-3 rounded-xl">
                  <FaUserGraduate className="text-2xl" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-amber-100">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${filter === 'all'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                    }`}
                >
                  All Users ({users.length})
                </button>
                <button
                  onClick={() => setFilter('admin')}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${filter === 'admin'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                    : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
                    }`}
                >
                  Admins ({users.filter(u => u.role === 'admin').length})
                </button>
                <button
                  onClick={() => setFilter('instructor')}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${filter === 'instructor'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                    : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'
                    }`}
                >
                  Instructors ({users.filter(u => u.role === 'instructor').length})
                </button>
                <button
                  onClick={() => setFilter('student')}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${filter === 'student'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                    }`}
                >
                  Students ({users.filter(u => u.role === 'student').length})
                </button>
              </div>

              <div className="flex gap-3">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-500" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-300 min-w-64"
                  />
                </div>
                <button
                  onClick={handleExportUsers}
                  className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white px-4 py-3 rounded-xl flex items-center gap-2 transition-all duration-300"
                >
                  <FaDownload /> Export
                </button>
              </div>
            </div>
          </div>

          {/* Users Table/Cards - Transaction History Style */}
          <div className="bg-white rounded-2xl shadow-xl border border-amber-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent">
                  User Management
                </h3>
                <div className="text-sm text-slate-600">
                  Sort by: <span className="font-semibold text-amber-700">Recent ↓</span>
                </div>
              </div>
            </div>

            {/* Table Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 hidden md:block">
              <div className="grid grid-cols-12 gap-4 items-center text-sm font-semibold text-slate-600">
                <div className="col-span-4">User</div>
                <div className="col-span-2">Role</div>
                <div className="col-span-2">Join Date</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2 text-right">Action</div>
              </div>
            </div>

            {/* Users List */}
            <div className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="px-6 py-4 animate-pulse">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-4 flex items-center space-x-3">
                        <div className="h-12 w-12 bg-amber-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-amber-200 rounded mb-1"></div>
                          <div className="h-3 bg-amber-150 rounded w-3/4"></div>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="h-6 w-20 bg-amber-200 rounded-full"></div>
                      </div>
                      <div className="col-span-2">
                        <div className="h-4 bg-amber-200 rounded w-24"></div>
                      </div>
                      <div className="col-span-2">
                        <div className="h-6 w-16 bg-amber-200 rounded-full"></div>
                      </div>
                      <div className="col-span-2 flex justify-end gap-1">
                        <div className="h-8 w-8 bg-amber-200 rounded"></div>
                        <div className="h-8 w-8 bg-amber-200 rounded"></div>
                        <div className="h-8 w-8 bg-amber-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (users.length === 0) ? (
                <div className="px-6 py-12 text-center">
                  <FaUsers className="text-6xl text-amber-300 mb-4 mx-auto" />
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">No users found in database</h3>
                  <p className="text-slate-600 mb-6">No users have been registered yet or failed to load from backend</p>
                  <button
                    onClick={() => setShowAddUser(true)}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-6 py-3 rounded-xl transition-all duration-300"
                  >
                    <FaPlus className="inline mr-2" /> Add User
                  </button>
                </div>
              ) : (filteredUsers.length === 0) ? (
                <div className="px-6 py-12 text-center">
                  <FaUsers className="text-6xl text-amber-300 mb-4 mx-auto" />
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">No users match your filters</h3>
                  <p className="text-slate-600 mb-6">Try adjusting your search term or role filters</p>
                  <button
                    onClick={() => { setFilter('all'); setSearchTerm(''); }}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-6 py-3 rounded-xl transition-all duration-300"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                currentUsers.map((user, index) => (
                  <div key={user.id} className="px-6 py-4 hover:bg-amber-50/50 transition-all duration-200 group border-l-4 border-transparent hover:border-amber-400">
                    {/* Desktop Layout */}
                    <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                      {/* User Info */}
                      <div className="col-span-4 flex items-center space-x-3">
                        <div className="relative">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                            {user.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="absolute -bottom-1 -right-1 text-xs">
                            {getRoleIcon(user.role)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-800 group-hover:text-amber-700 transition-colors truncate">
                            {user.name}
                          </div>
                          <div className="text-sm text-slate-600 truncate">
                            ID: {user.id}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {user.email}
                          </div>
                        </div>
                      </div>

                      {/* Role */}
                      <div className="col-span-2">
                        <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${getRoleBadge(user.role)}`}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </div>

                      {/* Join Date */}
                      <div className="col-span-2">
                        <div className="text-sm font-medium text-slate-800">
                          {new Date(user.created_at).toLocaleDateString('en-US', {
                            month: 'numeric',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(user.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="col-span-2">
                        <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-emerald-100 to-orange-100 text-emerald-800 border border-emerald-200">
                          Completed
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="col-span-2 flex justify-end items-center gap-1">
                        <button
                          onClick={() => handleViewUser(user)}
                          className="p-2 rounded-lg hover:bg-amber-100 text-amber-600 hover:text-amber-700 transition-colors"
                          title="View Details"
                        >
                          <FaEye className="text-sm" />
                        </button>
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-2 rounded-lg hover:bg-amber-100 text-amber-600 hover:text-amber-700 transition-colors"
                          title="Edit"
                        >
                          <FaEdit className="text-sm" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="p-2 rounded-lg hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors"
                          title="Delete"
                        >
                          <FaTrash className="text-sm" />
                        </button>
                        <div className="text-slate-400 ml-2">
                          <span className="text-xl">⋯</span>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Layout */}
                    <div className="md:hidden">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                              {user.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="absolute -bottom-1 -right-1 text-xs">
                              {getRoleIcon(user.role)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-800 truncate">
                              {user.name}
                            </div>
                            <div className="text-sm text-slate-600 truncate">
                              {user.email}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadge(user.role)}`}>
                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                              </span>
                              <span className="text-xs text-slate-500">
                                {new Date(user.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleViewUser(user)}
                            className="p-2 rounded-lg hover:bg-amber-100 text-amber-600 hover:text-amber-700 transition-colors"
                            title="View Details"
                          >
                            <FaEye className="text-sm" />
                          </button>
                          <button
                            onClick={() => handleEditUser(user)}
                            className="p-2 rounded-lg hover:bg-amber-100 text-amber-600 hover:text-amber-700 transition-colors"
                            title="Edit"
                          >
                            <FaEdit className="text-sm" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="p-2 rounded-lg hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors"
                            title="Delete"
                          >
                            <FaTrash className="text-sm" />
                          </button>
                          <div className="text-slate-400 ml-1">
                            <span className="text-xl">⋯</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {filteredUsers.length > 0 && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-t border-amber-200 px-6 py-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-slate-600">
                    Showing <span className="font-semibold text-amber-700">{indexOfFirstItem + 1}</span> to{' '}
                    <span className="font-semibold text-amber-700">{Math.min(indexOfLastItem, filteredUsers.length)}</span> of{' '}
                    <span className="font-semibold text-amber-700">{filteredUsers.length}</span> users
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
                        // Show first page, last page, current page, and pages around current
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
                            <span key={pageNumber} className="px-2 py-2 text-slate-400">
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
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">Add New User</h2>
                <button
                  onClick={() => {
                    setShowAddUser(false);
                    setNewUser({ name: '', email: '', password: '', role: 'student' });
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <MdClose className="text-2xl" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    placeholder="Enter email address"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    placeholder="Enter password (min 6 characters)"
                    minLength={6}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    required
                  >
                    <option value="student">Student</option>
                    <option value="instructor">Instructor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddUser(false);
                      setNewUser({ name: '', email: '', password: '', role: 'student' });
                    }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg transition-colors"
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white py-3 rounded-lg transition-all duration-300 disabled:opacity-50"
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating...
                      </span>
                    ) : (
                      'Create User'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">User Details</h2>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <MdClose className="text-2xl" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                  {selectedUser.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{selectedUser.name}</h3>
                  <p className="text-slate-600">{selectedUser.email}</p>
                  <span className={`inline-block mt-2 px-3 py-1 text-xs font-semibold rounded-full ${getRoleBadge(selectedUser.role)}`}>
                    {selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">User Information</h4>
                  <p className="text-sm text-gray-600"><strong>ID:</strong> {selectedUser.id}</p>
                  <p className="text-sm text-gray-600"><strong>Name:</strong> {selectedUser.name}</p>
                  <p className="text-sm text-gray-600"><strong>Email:</strong> {selectedUser.email}</p>
                  <p className="text-sm text-gray-600"><strong>Role:</strong> {selectedUser.role}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Account Details</h4>
                  <p className="text-sm text-gray-600"><strong>Created:</strong> {new Date(selectedUser.created_at).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-600"><strong>Last Login:</strong> {selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleDateString() : 'Never'}</p>
                  <p className="text-sm text-gray-600"><strong>Status:</strong> <span className="text-orange-600">Active</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">Edit User</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={actionLoading}
                >
                  <MdClose className="text-2xl" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    disabled={actionLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    disabled={actionLoading}
                  >
                    <option value="student">Student</option>
                    <option value="instructor">Instructor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100"
                    disabled={true}
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg transition-colors"
                  disabled={actionLoading}
                >
                  <FaTimes className="inline mr-2" />Cancel
                </button>
                <button
                  onClick={handleUpdateUser}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white py-3 rounded-lg transition-colors disabled:opacity-50"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </span>
                  ) : (
                    <><FaSave className="inline mr-2" />Save Changes</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">Delete User</h2>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={actionLoading}
                >
                  <MdClose className="text-2xl" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <FaTrash className="text-2xl text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Are you sure?</h3>
                <p className="text-gray-600">
                  You are about to delete <strong>{deletingUser.name}</strong> ({deletingUser.email}). This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg transition-colors"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg transition-colors disabled:opacity-50"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </span>
                  ) : (
                    'Delete User'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllUsers;