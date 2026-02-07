import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaEdit, FaTrash, FaPlus, FaMoneyBillWave, FaSearch } from 'react-icons/fa';
import { getCashouts, createCashout, updateCashout, deleteCashout } from '../../../api/expenseApi';
import { getExpenseHeads } from '../../../api/expenseApi';
import BranchLayout from '../BranchLayout';

const BranchExpenseReport = () => {
  const [cashouts, setCashouts] = useState([]);
  const [expenseHeads, setExpenseHeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCashout, setEditingCashout] = useState(null);

  // Filter states
  const [filters, setFilters] = useState({
    branchId: '',
    headId: '',
    fromDate: '',
    toDate: ''
  });

  // Form states
  const [formData, setFormData] = useState({
    head_id: '',
    amount: '',
    payment_mode: '',
    payment_mode_description: '',
    expense_date: new Date().toISOString().split('T')[0],
    expense_description: ''
  });

  const paymentModes = ['Cash', 'Online', 'Cheque', 'UPI', 'Card', 'Net Banking'];

  useEffect(() => {
    loadExpenseHeads();
    loadCashouts();
  }, []);

  const loadExpenseHeads = async () => {
    try {
      const response = await getExpenseHeads();
      console.log('🔴 Expense heads API response:', response);
      const heads = response.expense_heads || response.data || response || [];
      console.log('🔴 Extracted heads:', heads, 'isArray:', Array.isArray(heads));
      // Filter only active heads
      const filtered = Array.isArray(heads) ? heads.filter(head => head.status !== false) : [];
      console.log('🔴 Filtered expense heads:', filtered);
      setExpenseHeads(filtered);
    } catch (error) {
      console.error('Error loading expense heads:', error);
      toast.error('Failed to load expense heads');
      setExpenseHeads([]);
    }
  };

  const loadCashouts = async () => {
    try {
      setLoading(true);
      const response = await getCashouts(filters);
      setCashouts(response.data || response || []);
    } catch (error) {
      console.error('Error loading cashouts:', error);
      toast.error(error.message || 'Failed to load cashout records');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearch = () => {
    loadCashouts();
  };

  const handleOpenModal = (cashout = null) => {
    if (cashout) {
      setEditingCashout(cashout);
      setFormData({
        head_id: cashout.head_id || '',
        amount: cashout.amount || '',
        payment_mode: cashout.payment_mode || '',
        payment_mode_description: cashout.payment_mode_description || '',
        expense_date: cashout.expense_date || new Date().toISOString().split('T')[0],
        expense_description: cashout.expense_description || ''
      });
    } else {
      setEditingCashout(null);
      setFormData({
        head_id: '',
        amount: '',
        payment_mode: '',
        payment_mode_description: '',
        expense_date: new Date().toISOString().split('T')[0],
        expense_description: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCashout(null);
    setFormData({
      head_id: '',
      amount: '',
      payment_mode: '',
      payment_mode_description: '',
      expense_date: new Date().toISOString().split('T')[0],
      expense_description: ''
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

    if (!formData.head_id) {
      toast.error('Please select a head name');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!formData.payment_mode) {
      toast.error('Please select payment mode');
      return;
    }

    try {
      setLoading(true);

      const cashoutData = {
        ...formData,
        amount: parseFloat(formData.amount)
      };

      if (editingCashout) {
        await updateCashout(editingCashout.id, cashoutData);
        toast.success('Cashout updated successfully');
      } else {
        await createCashout(cashoutData);
        toast.success('Cashout added successfully');
      }

      handleCloseModal();
      loadCashouts();
    } catch (error) {
      console.error('Error saving cashout:', error);
      toast.error(error.message || 'Failed to save cashout');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this cashout record?')) {
      return;
    }

    try {
      await deleteCashout(id);
      toast.success('Cashout deleted successfully');
      loadCashouts();
    } catch (error) {
      console.error('Error deleting cashout:', error);
      toast.error(error.message || 'Failed to delete cashout');
    }
  };

  const calculateTotal = () => {
    return cashouts.reduce((sum, cashout) => sum + (parseFloat(cashout.amount) || 0), 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  const getHeadName = (headId) => {
    if (!Array.isArray(expenseHeads)) return 'N/A';
    const head = expenseHeads.find(h => h.id === headId);
    return head ? (head.headName || head.head_name) : 'N/A';
  };

  return (
    <BranchLayout>
      <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="bg-red-100 p-2 rounded-lg">
                <FaMoneyBillWave className="text-2xl text-red-600" />
              </div>
              <h1 className="text-xl md:text-3xl font-bold text-gray-900">Manage Cashout</h1>
            </div>

            {/* Add New Cashout Button */}
            <button
              onClick={() => handleOpenModal()}
              className="w-full md:w-auto flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg transition-colors duration-200 shadow-sm font-medium"
            >
              <FaPlus className="w-4 h-4" />
              <span>Add Cashout</span>
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="col-span-1 sm:col-span-2 lg:col-span-1">
              <select
                name="headId"
                value={filters.headId}
                onChange={handleFilterChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- Choose Head --</option>
                {Array.isArray(expenseHeads) && expenseHeads.map(head => (
                  <option key={head.id} value={head.id}>
                    {head.headName || head.head_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date :
              </label>
              <input
                type="date"
                name="fromDate"
                value={filters.fromDate}
                onChange={handleFilterChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date :
              </label>
              <input
                type="date"
                name="toDate"
                value={filters.toDate}
                onChange={handleFilterChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={handleSearch}
              className="flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors duration-200 col-span-1 sm:col-span-2 lg:col-span-1"
            >
              <FaSearch />
              <span>Search</span>
            </button>
          </div>
        </div>

        {/* Cashout Table (Desktop) */}
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
                    Amount(Rs.)
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">
                    Payment Mode
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      <div className="flex justify-center items-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                        <span>Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <>
                    <tr className="bg-gray-800 text-white">
                      <td colSpan="2" className="px-6 py-3 font-semibold">
                        Total(Rs.)
                      </td>
                      <td className="px-6 py-3 font-semibold">
                        {calculateTotal().toFixed(2)} /-
                      </td>
                      <td colSpan="3"></td>
                    </tr>
                    {cashouts.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                          No Record Found...
                        </td>
                      </tr>
                    ) : (
                      cashouts.map((cashout, index) => (
                        <tr key={cashout.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {index + 1}.
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {getHeadName(cashout.head_id)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {parseFloat(cashout.amount).toFixed(2)} /-
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(cashout.expense_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {cashout.payment_mode}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleOpenModal(cashout)}
                                className="text-blue-600 hover:text-blue-800 transition-colors p-2 hover:bg-blue-50 rounded"
                                title="Edit"
                              >
                                <FaEdit className="text-lg" />
                              </button>
                              <button
                                onClick={() => handleDelete(cashout.id)}
                                className="text-red-600 hover:text-red-800 transition-colors p-2 hover:bg-red-50 rounded"
                                title="Delete"
                              >
                                <FaTrash className="text-lg" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading...</p>
            </div>
          ) : (
            <>
              {/* Total Summary Card */}
              <div className="bg-gray-800 text-white rounded-lg p-4 shadow-sm mb-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-lg">Total Expense</span>
                  <span className="font-bold text-xl text-red-400">Rs. {calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              {cashouts.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
                  <FaMoneyBillWave className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p>No cashout records found.</p>
                </div>
              ) : (
                cashouts.map((cashout, index) => (
                  <div key={cashout.id} className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-red-50 text-red-600 text-sm font-bold">
                          {index + 1}
                        </span>
                        <div>
                          <h3 className="font-bold text-gray-900">{getHeadName(cashout.head_id)}</h3>
                          <p className="text-xs text-gray-500">{formatDate(cashout.expense_date)}</p>
                        </div>
                      </div>
                      <span className="text-red-600 font-bold text-lg">₹{parseFloat(cashout.amount).toFixed(2)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3 bg-gray-50 p-3 rounded-lg">
                      <div>
                        <span className="block text-xs text-gray-400">Payment Mode</span>
                        <span className="font-medium">{cashout.payment_mode || 'N/A'}</span>
                      </div>
                      {cashout.payment_mode_description && (
                        <div className="col-span-2 border-t border-gray-200 pt-2 mt-1">
                          <span className="block text-xs text-gray-400">Description</span>
                          <span className="text-xs">{cashout.payment_mode_description}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => handleOpenModal(cashout)}
                        className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-2 rounded text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                      >
                        <FaEdit className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(cashout.id)}
                        className="flex-1 bg-red-50 text-red-700 hover:bg-red-100 px-3 py-2 rounded text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                      >
                        <FaTrash className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={handleCloseModal}>
            <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                  <FaMoneyBillWave className="text-red-600" />
                  <span>{editingCashout ? 'EDIT CASHOUT' : 'CASHOUT ADD'}</span>
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors text-2xl"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <label htmlFor="head_id" className="text-sm font-medium text-gray-700">
                      Head Name :
                    </label>
                    <select
                      id="head_id"
                      name="head_id"
                      value={formData.head_id}
                      onChange={handleInputChange}
                      required
                      className="md:col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">----- Choose Head -----</option>
                      {Array.isArray(expenseHeads) && expenseHeads.map(head => (
                        <option key={head.id} value={head.id}>
                          {head.headName || head.head_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <label htmlFor="payment_mode" className="text-sm font-medium text-gray-700">
                      Payment Mode :
                    </label>
                    <select
                      id="payment_mode"
                      name="payment_mode"
                      value={formData.payment_mode}
                      onChange={handleInputChange}
                      required
                      className="md:col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">-- SELECT PAYMENT MODE --</option>
                      {paymentModes.map(mode => (
                        <option key={mode} value={mode}>
                          {mode}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <label htmlFor="amount" className="text-sm font-medium text-gray-700">
                      Expense Amount(Rs.) :
                    </label>
                    <input
                      type="number"
                      id="amount"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      placeholder="Enter amount"
                      step="0.01"
                      min="0"
                      required
                      className="md:col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                    <label htmlFor="payment_mode_description" className="text-sm font-medium text-gray-700 pt-2">
                      Payment Mode Description :
                    </label>
                    <textarea
                      id="payment_mode_description"
                      name="payment_mode_description"
                      value={formData.payment_mode_description}
                      onChange={handleInputChange}
                      placeholder="Enter payment mode description"
                      rows="3"
                      className="md:col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <label htmlFor="expense_date" className="text-sm font-medium text-gray-700">
                      Expense Date :
                    </label>
                    <input
                      type="date"
                      id="expense_date"
                      name="expense_date"
                      value={formData.expense_date}
                      onChange={handleInputChange}
                      required
                      className="md:col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                    <label htmlFor="expense_description" className="text-sm font-medium text-gray-700 pt-2">
                      Expense Description :
                    </label>
                    <textarea
                      id="expense_description"
                      name="expense_description"
                      value={formData.expense_description}
                      onChange={handleInputChange}
                      placeholder="Enter expense description"
                      rows="3"
                      className="md:col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex justify-center p-6 border-t border-gray-200 bg-gray-50">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
                  >
                    {loading ? 'Saving...' : 'Submit'}
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

export default BranchExpenseReport;
