import React, { useState, useEffect } from 'react';
import BranchLayout from '../../components/Branch/BranchLayout';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaBuilding,
  FaTimes,
  FaSpinner,
  FaToggleOn,
  FaToggleOff
} from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const EmployeeDepartments = () => {
  // State management
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form data for add/edit
  const [formData, setFormData] = useState({
    name: '',
    totalEmployees: 0,
    description: '',
    head: '',
    status: 'Active'
  });

  // API helper function
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };
  // Fetch departments from API
  const fetchDepartments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/branch/departments`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Departments fetched:', data);

      if (data.success) {
        const depts = data.departments || [];
        setDepartments(depts);
        // Cache fresh data
        localStorage.setItem('branch_departments', JSON.stringify(depts));
      } else {
        throw new Error(data.message || 'Failed to fetch departments');
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      setError(error.message);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  // Add new department
  const handleAddDepartment = async () => {
    try {
      setSubmitting(true);

      const response = await fetch(`${API_BASE_URL}/api/branch/departments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        await fetchDepartments(); // Refresh the list
        setIsAddModalOpen(false);
        resetForm();
        alert('Department added successfully!');
      } else {
        alert(data.message || 'Failed to add department');
      }
    } catch (error) {
      console.error('Error adding department:', error);
      alert('Failed to add department');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit department
  const handleEditDepartment = async () => {
    try {
      setSubmitting(true);

      const response = await fetch(`${API_BASE_URL}/api/branch/departments/${selectedDepartment.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        await fetchDepartments(); // Refresh the list
        setIsEditModalOpen(false);
        setSelectedDepartment(null);
        resetForm();
        alert('Department updated successfully!');
      } else {
        alert(data.message || 'Failed to update department');
      }
    } catch (error) {
      console.error('Error updating department:', error);
      alert('Failed to update department');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete department
  const handleDeleteDepartment = async (dept) => {
    if (!confirm(`Are you sure you want to delete department "${dept.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/branch/departments/${dept.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (data.success) {
        await fetchDepartments(); // Refresh the list
        alert('Department deleted successfully!');
      } else {
        alert(data.message || 'Failed to delete department');
      }
    } catch (error) {
      console.error('Error deleting department:', error);
      alert('Failed to delete department');
    }
  };

  // Toggle department status
  const handleToggleStatus = async (dept) => {
    try {
      const newStatus = dept.status === 'Active' ? 'Inactive' : 'Active';

      const response = await fetch(`${API_BASE_URL}/api/branch/departments/${dept.id}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchDepartments(); // Refresh the list
        alert(`Department status changed to ${newStatus}`);
      } else {
        alert(data.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Failed to update status');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      totalEmployees: 0,
      description: '',
      head: '',
      status: 'Active'
    });
  };

  // Open add modal
  const openAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (dept) => {
    setSelectedDepartment(dept);
    setFormData({
      name: dept.name || '',
      totalEmployees: dept.totalEmployees || 0,
      description: dept.description || '',
      head: dept.head || '',
      status: dept.status || 'Active'
    });
    setIsEditModalOpen(true);
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'totalEmployees' ? parseInt(value) || 0 : value
    }));
  };

  useEffect(() => {
    // 1. Try to load from cache immediately (Stale-While-Revalidate)
    const CACHE_KEY = 'branch_departments';
    const cachedData = localStorage.getItem(CACHE_KEY);

    if (cachedData) {
      try {
        setDepartments(JSON.parse(cachedData));
        setLoading(false); // Show cached data immediately
      } catch (e) { console.error('Error parsing cached data', e); }
    }

    // 2. Fetch fresh data
    const loadData = async () => {
      // Don't set loading true if we already showed cached data
      if (!cachedData) setLoading(true);
      await fetchDepartments();
    };

    loadData();
  }, []);



  if (loading && departments.length === 0) {
    return (
      <BranchLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <FaSpinner className="text-4xl text-amber-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading departments...</p>
          </div>
        </div>
      </BranchLayout>
    );
  }

  return (
    <BranchLayout>
      <div className="p-4 md:p-6 min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <FaBuilding className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-1">MANAGE DEPARTMENTS</h1>
                <p className="text-gray-600">Manage employee departments and their status</p>
              </div>
            </div>
            <button
              onClick={() => {
                resetForm();
                setIsAddModalOpen(true);
              }}
              className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 w-full md:w-auto"
            >
              <FaPlus className="mr-2" />
              Add New Department
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

        {/* Mobile View (Cards) */}
        <div className="md:hidden space-y-4">
          {departments.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white rounded-2xl shadow-sm">
              <FaBuilding className="text-4xl mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No departments found</p>
            </div>
          ) : (
            departments.map((department, index) => (
              <div key={department.id} className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{department.name}</h3>
                    {department.head && (
                      <p className="text-sm text-gray-500">Head: {department.head}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${department.status === 'Active'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-red-100 text-red-800'
                    }`}>
                    {department.status}
                  </span>
                </div>

                <div className="flex items-center justify-between mb-4 border-t border-b border-gray-50 py-3">
                  <span className="text-gray-600 text-sm">Total Employees:</span>
                  <span className="bg-amber-100 text-amber-800 text-sm font-semibold px-3 py-1 rounded-full">
                    {department.totalEmployees || 0}
                  </span>
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => openEditModal(department)}
                    className="p-2 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100"
                    title="Edit"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(department)}
                    className={`p-2 rounded-lg ${department.status === 'Active'
                      ? 'text-orange-600 bg-orange-50 hover:bg-orange-100'
                      : 'text-green-600 bg-green-50 hover:bg-green-100'
                      }`}
                    title="Toggle Status"
                  >
                    {department.status === 'Active' ? <FaToggleOn /> : <FaToggleOff />}
                  </button>
                  <button
                    onClick={() => handleDeleteDepartment(department)}
                    className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                    title="Delete"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Departments Table */}
        <div className="hidden md:block bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">S.No.</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Department Name</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Total Employees</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Status</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {departments.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      <FaBuilding className="text-4xl mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">No departments found</p>
                      <p className="text-sm">Add your first department to get started</p>
                    </td>
                  </tr>
                ) : (
                  departments.map((department, index) => (
                    <tr key={department.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">{index + 1}.</span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <span className="text-gray-900 font-semibold">{department.name}</span>
                          {department.head && (
                            <p className="text-sm text-gray-500">Head: {department.head}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center">
                          <span className="bg-amber-100 text-amber-800 text-sm font-semibold px-3 py-1 rounded-full">
                            {department.totalEmployees || 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${department.status === 'Active'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-red-100 text-red-800'
                          }`}>
                          {department.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => openEditModal(department)}
                            className="text-amber-600 hover:text-amber-800 transition-colors p-2 hover:bg-amber-100 rounded-lg"
                            title="Edit Department"
                          >
                            <FaEdit className="text-base" />
                          </button>

                          <button
                            onClick={() => handleToggleStatus(department)}
                            className={`transition-colors p-2 rounded-lg ${department.status === 'Active'
                              ? 'text-orange-600 hover:text-orange-800 hover:bg-orange-100'
                              : 'text-red-600 hover:text-red-800 hover:bg-red-100'
                              }`}
                            title={`Toggle Status: ${department.status}`}
                          >
                            {department.status === 'Active' ? (
                              <FaToggleOn className="text-xl" />
                            ) : (
                              <FaToggleOff className="text-xl" />
                            )}
                          </button>

                          <button
                            onClick={() => handleDeleteDepartment(department)}
                            className="text-red-600 hover:text-red-800 transition-colors p-2 hover:bg-red-100 rounded-lg"
                            title="Delete Department"
                          >
                            <FaTrash className="text-base" />
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

        {/* Add Department Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-800">Add New Department</h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleAddDepartment(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter department name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department Head</label>
                  <input
                    type="text"
                    name="head"
                    value={formData.head}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter department head"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Employees</label>
                  <input
                    type="number"
                    name="totalEmployees"
                    value={formData.totalEmployees}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter number of employees"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter department description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex space-x-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !formData.name.trim()}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {submitting ? (
                      <>
                        <FaSpinner className="animate-spin mr-2" />
                        Adding...
                      </>
                    ) : (
                      'Add Department'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Department Modal */}
        {isEditModalOpen && selectedDepartment && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-800">Edit Department</h3>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedDepartment(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleEditDepartment(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter department name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department Head</label>
                  <input
                    type="text"
                    name="head"
                    value={formData.head}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter department head"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Employees</label>
                  <input
                    type="number"
                    name="totalEmployees"
                    value={formData.totalEmployees}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter number of employees"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter department description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex space-x-3 mt-8">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setSelectedDepartment(null);
                    }}
                    className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !formData.name.trim()}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {submitting ? (
                      <>
                        <FaSpinner className="animate-spin mr-2" />
                        Updating...
                      </>
                    ) : (
                      'Update Department'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </BranchLayout>
  );
};

export default EmployeeDepartments;