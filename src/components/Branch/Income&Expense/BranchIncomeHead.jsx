import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaEdit, FaPlus } from 'react-icons/fa';
import { getIncomeHeads, createIncomeHead, updateIncomeHead, toggleIncomeHeadStatus } from '../../../api/incomeApi';
import BranchLayout from '../BranchLayout';

const BranchIncomeHead = () => {
  const [incomeHeads, setIncomeHeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingHead, setEditingHead] = useState(null);
  const [formData, setFormData] = useState({
    head_name: '',
    status: true
  });

  // Load income heads on component mount
  useEffect(() => {
    loadIncomeHeads();
  }, []);

  const loadIncomeHeads = async () => {
    try {
      setLoading(true);
      const response = await getIncomeHeads();
      setIncomeHeads(response.income_heads || response.data || response || []);
    } catch (error) {
      console.error('Error loading income heads:', error);
      toast.error(error.message || 'Failed to load income heads');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (head = null) => {
    if (head) {
      setEditingHead(head);
      setFormData({
        head_name: head.headName || head.head_name || '',
        status: head.status !== undefined ? head.status : true
      });
    } else {
      setEditingHead(null);
      setFormData({
        head_name: '',
        status: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingHead(null);
    setFormData({
      head_name: '',
      status: true
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.head_name.trim()) {
      toast.error('Please enter head name');
      return;
    }

    try {
      setLoading(true);

      // Transform field name from head_name to headName for API
      const apiData = {
        headName: formData.head_name,
        status: formData.status
      };

      if (editingHead) {
        await updateIncomeHead(editingHead.id, apiData);
        toast.success('Income head updated successfully');
      } else {
        await createIncomeHead(apiData);
        toast.success('Income head created successfully');
      }

      handleCloseModal();
      loadIncomeHeads();
    } catch (error) {
      console.error('Error saving income head:', error);
      toast.error(error.message || 'Failed to save income head');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (head) => {
    try {
      await toggleIncomeHeadStatus(head.id);
      toast.success(`Income head ${head.status ? 'disabled' : 'enabled'} successfully`);
      loadIncomeHeads();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error(error.message || 'Failed to update status');
    }
  };

  return (
    <BranchLayout>
      <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">Manage Income Head</h1>
                <p className="text-sm text-gray-500">Create and manage income categories</p>
              </div>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="w-full md:w-auto flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg transition-colors duration-200 shadow-sm font-medium"
            >
              <FaPlus className="w-4 h-4" />
              <span>Add New Head</span>
            </button>
          </div>
        </div>

        {/* Table Container (Desktop) */}
        <div className="hidden md:block bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-orange-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">
                    S.No.
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">
                    Head Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-8 text-center text-gray-500">
                      <div className="flex justify-center items-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                        <span>Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : incomeHeads.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-8 text-center text-gray-500">
                      No income heads found. Click "Add New Head" to create one.
                    </td>
                  </tr>
                ) : (
                  incomeHeads.map((head, index) => (
                    <tr key={head.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {index + 1}.
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {head.headName || head.head_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleOpenModal(head)}
                            className="text-blue-600 hover:text-blue-800 transition-colors p-2 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <FaEdit className="text-lg" />
                          </button>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={head.status || false}
                              onChange={() => handleToggleStatus(head)}
                              className="sr-only peer"
                            />
                            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                            <span className="ml-3 text-sm font-medium text-gray-900">
                              {head.status ? 'On' : 'Off'}
                            </span>
                          </label>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading...</p>
            </div>
          ) : incomeHeads.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-500">
              No income heads found. Tap "Add New Head" to create one.
            </div>
          ) : (
            incomeHeads.map((head, index) => (
              <div key={head.id} className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600 text-sm font-bold">
                      {index + 1}
                    </span>
                    <h3 className="text-gray-900 font-semibold">{head.headName || head.head_name}</h3>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={head.status || false}
                      onChange={() => handleToggleStatus(head)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex justify-end pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleOpenModal(head)}
                    className="flex items-center space-x-1 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                  >
                    <FaEdit />
                    <span>Edit Head</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={handleCloseModal}>
            <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl w-full max-w-md transform transition-all" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">
                  {editingHead ? 'Edit Income Head' : 'Add New Income Head'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors text-2xl"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-4">
                  <div>
                    <label htmlFor="head_name" className="block text-sm font-medium text-gray-700 mb-2">
                      Head Name *
                    </label>
                    <input
                      type="text"
                      id="head_name"
                      name="head_name"
                      value={formData.head_name}
                      onChange={handleInputChange}
                      placeholder="Enter head name"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
                  >
                    {loading ? 'Saving...' : editingHead ? 'Update' : 'Create'}
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

export default BranchIncomeHead;
