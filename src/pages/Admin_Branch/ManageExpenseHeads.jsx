import React, { useState, useEffect } from 'react';
import BranchLayout from '../../components/Branch/BranchLayout';
import { FaPlus, FaEdit, FaSpinner } from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const ManageExpenseHeads = () => {
  const [heads, setHeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHead, setEditingHead] = useState(null);
  const [formData, setFormData] = useState({
    headName: '',
    status: 'off'
  });

  // API helper function
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Fetch expense heads
  useEffect(() => {
    fetchExpenseHeads();
  }, []);

  const fetchExpenseHeads = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching expense heads from:', `${API_BASE_URL}/api/branch/expense-heads`);

      const response = await fetch(`${API_BASE_URL}/api/branch/expense-heads`, {
        headers: getAuthHeaders()
      });

      console.log('Expense heads response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Expense heads received:', data);
        setHeads(data.expense_heads || []);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch expense heads:', response.status, errorText);
        setError(`Failed to fetch expense heads: ${response.status} - ${errorText}`);
        setHeads([]);
      }
    } catch (error) {
      console.error('Error fetching expense heads:', error);
      setError(`Network error: ${error.message}`);
      setHeads([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddHead = () => {
    setFormData({ headName: '', status: 'off' });
    setEditingHead(null);
    setIsAddModalOpen(true);
  };

  const handleEditHead = (head) => {
    setFormData({ headName: head.headName, status: head.status });
    setEditingHead(head);
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);

      if (editingHead) {
        // Update existing head
        console.log('Updating expense head:', editingHead.id, formData);
        const response = await fetch(`${API_BASE_URL}/api/branch/expense-heads/${editingHead.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Update response:', result);
          fetchExpenseHeads(); // Refresh the list
          alert('Expense head updated successfully!');
        } else {
          const errorData = await response.text();
          setError(`Failed to update expense head: ${response.status} - ${errorData}`);
        }
      } else {
        // Add new head
        console.log('Adding new expense head:', formData);
        const response = await fetch(`${API_BASE_URL}/api/branch/expense-heads`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Add response:', result);
          fetchExpenseHeads(); // Refresh the list
          alert('Expense head added successfully!');
        } else {
          const errorData = await response.text();
          setError(`Failed to add expense head: ${response.status} - ${errorData}`);
        }
      }

      setIsAddModalOpen(false);
      setFormData({ headName: '', status: 'off' });
      setEditingHead(null);
    } catch (error) {
      console.error('Error saving expense head:', error);
      setError(`Network error: ${error.message}`);
    }
  };

  const toggleStatus = async (head) => {
    const newStatus = head.status === 'on' ? 'off' : 'on';
    try {
      console.log('Toggling status for head:', head.id, 'from', head.status, 'to', newStatus);
      const response = await fetch(`${API_BASE_URL}/api/branch/expense-heads/${head.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ headName: head.headName, status: newStatus })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Toggle response:', result);
        fetchExpenseHeads(); // Refresh the list
        alert(`Expense head ${newStatus === 'on' ? 'activated' : 'deactivated'} successfully!`);
      } else {
        const errorData = await response.text();
        setError(`Failed to toggle status: ${response.status} - ${errorData}`);
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      setError(`Network error: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <BranchLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <FaSpinner className="text-4xl text-amber-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading expense heads...</p>
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
                <h1 className="text-2xl font-bold text-gray-800">MANAGE HEAD</h1>
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
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
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
                    {editingHead ? 'Edit Expense Head' : 'Add New Expense Head'}
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="off">Off</option>
                        <option value="on">On</option>
                      </select>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddModalOpen(false);
                          setFormData({ headName: '', status: 'off' });
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

export default ManageExpenseHeads;
