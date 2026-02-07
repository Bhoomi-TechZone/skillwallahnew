import React, { useState, useEffect } from 'react';
import BranchLayout from '../../components/Branch/BranchLayout';
import { FaPlus, FaEdit, FaSpinner, FaTimes } from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const ManageIncomeHeads = () => {
  // API helper function
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };
  const [heads, setHeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHead, setEditingHead] = useState(null);
  const [formData, setFormData] = useState({
    headName: '',
    status: 'on'
  });

  // Fetch income heads
  useEffect(() => {
    fetchIncomeHeads();
  }, []);

  const fetchIncomeHeads = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/branch/income-heads`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Income heads received:', data);
        setHeads(data.income_heads || []);
      } else {
        console.error('Failed to fetch income heads:', response.status);
        setError('Failed to fetch income heads');
      }
    } catch (error) {
      console.error('Error fetching income heads:', error);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleAddHead = () => {
    setFormData({ headName: '', status: 'on' });
    setEditingHead(null);
    setIsAddModalOpen(true);
  };

  const handleEditHead = (head) => {
    setFormData({
      headName: head.headName,
      status: head.status
    });
    setEditingHead(head);
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Comprehensive validation
    const validationErrors = [];

    // Head name validation
    if (!formData.headName.trim()) {
      validationErrors.push('Head name is required');
    } else if (formData.headName.trim().length < 3) {
      validationErrors.push('Head name must be at least 3 characters long');
    } else if (!/^[a-zA-Z\s]+$/.test(formData.headName)) {
      validationErrors.push('Head name should contain only letters and spaces');
    }

    // Show validation errors
    if (validationErrors.length > 0) {
      setError(validationErrors.join('\n'));
      return;
    }

    try {
      if (editingHead) {
        // Update existing head
        const response = await fetch(`${API_BASE_URL}/api/branch/income-heads/${editingHead.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          const result = await response.json();
          setHeads(heads.map(h => h.id === editingHead.id ? result.income_head : h));
          setSuccessMessage('✅ Income head updated successfully!');
          setError(null);
          setTimeout(() => setSuccessMessage(null), 4000);
        } else {
          const errorData = await response.json();
          setError(errorData.detail || 'Failed to update income head');
          return;
        }
      } else {
        // Add new head
        const response = await fetch(`${API_BASE_URL}/api/branch/income-heads`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          const result = await response.json();
          setHeads([...heads, result.income_head]);
          setSuccessMessage('✅ Income head added successfully!');
          setError(null);
          setTimeout(() => setSuccessMessage(null), 4000);
        } else {
          const errorData = await response.json();
          setError(errorData.detail || 'Failed to add income head');
          return;
        }
      }

      setIsAddModalOpen(false);
      setFormData({ headName: '', status: 'on' });
      setEditingHead(null);
      setError(null);
    } catch (error) {
      console.error('Error saving income head:', error);
      setError('Failed to save income head');
    }
  };

  const toggleStatus = async (head) => {
    const newStatus = head.status === 'on' ? 'off' : 'on';
    try {
      const response = await fetch(`${API_BASE_URL}/api/branch/income-heads/${head.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ headName: head.headName, status: newStatus })
      });

      if (response.ok) {
        const result = await response.json();
        setHeads(heads.map(h => h.id === head.id ? result.income_head : h));
        setSuccessMessage(`✅ Income head status changed to ${newStatus}`);
        setError(null);
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      setError('Failed to update status');
    }
  };

  if (loading) {
    return (
      <BranchLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <FaSpinner className="text-4xl text-amber-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading income heads...</p>
          </div>
        </div>
      </BranchLayout>
    );
  }

  return (
    <BranchLayout>
      <div className="p-6 min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📋</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-800">MANAGE INCOME HEAD</h1>
              </div>
              <button
                onClick={handleAddHead}
                className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-md flex items-center space-x-2 transition-colors shadow-sm"
              >
                <FaPlus className="text-sm" />
                <span className="font-medium">Add New Head</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg z-50">
            <div className="flex items-center">
              <FaTimes className="mr-2" />
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-3 text-red-600 hover:text-red-800"
              >
                <FaTimes />
              </button>
            </div>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-lg z-50 animate-pulse">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {successMessage}
              <button
                onClick={() => setSuccessMessage(null)}
                className="ml-3 text-green-600 hover:text-green-800"
              >
                <FaTimes />
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className="bg-orange-700 text-white">
                <th className="px-6 py-4 text-left text-sm font-semibold">S.No.</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Head Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {heads.map((head, index) => (
                <tr key={head.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-700">{index + 1}.</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{head.headName}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      {/* Edit Button */}
                      <button
                        onClick={() => handleEditHead(head)}
                        className="text-gray-600 hover:text-gray-800 transition-colors"
                        title="Edit"
                      >
                        <FaEdit className="text-lg" />
                      </button>

                      {/* Toggle Button */}
                      <button
                        onClick={() => toggleStatus(head)}
                        className={`px-4 py-1 rounded text-sm font-medium transition-colors ${head.status === 'on'
                          ? 'bg-amber-500 text-white hover:bg-amber-600'
                          : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                          }`}
                      >
                        {head.status === 'on' ? 'On' : 'Off'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add/Edit Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-md z-50 overflow-y-auto">
            <div className="flex min-h-screen items-start justify-center p-4 py-8">
              <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-xl w-full max-w-md my-4 border border-white/20">
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">
                    {editingHead ? 'Edit Income Head' : 'Add New Income Head'}
                  </h2>
                  <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Head Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.headName}
                        onChange={(e) => setFormData({ ...formData, headName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="Enter head name"
                        required
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      >
                        <option value="on">On</option>
                        <option value="off">Off</option>
                      </select>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddModalOpen(false);
                          setFormData({ headName: '', status: 'on' });
                          setEditingHead(null);
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                      >
                        {editingHead ? 'Update' : 'Add'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </BranchLayout>
  );
};

export default ManageIncomeHeads;
