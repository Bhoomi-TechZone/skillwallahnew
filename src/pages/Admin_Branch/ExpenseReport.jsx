import React, { useState, useEffect } from 'react';
import BranchLayout from '../../components/Branch/BranchLayout';
import { FaPlus, FaTrash, FaSpinner } from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const ExpenseReport = () => {
  const [expenses, setExpenses] = useState([]);
  const [originalExpenses, setOriginalExpenses] = useState([]);
  const [heads, setHeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // API helper function
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Filter states
  const [filters, setFilters] = useState({
    selectedHead: '',
    fromDate: '',
    toDate: ''
  });

  const [formData, setFormData] = useState({
    headName: '',
    amount: '',
    date: '',
    paymentMode: 'Online Mode'
  });

  // Fetch expense heads and expenses
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch expense heads from API
      try {
        console.log('Fetching expense heads from:', `${API_BASE_URL}/api/branch/expense-heads`);
        const headsResponse = await fetch(`${API_BASE_URL}/api/branch/expense-heads`, {
          headers: getAuthHeaders()
        });

        console.log('Expense heads response status:', headsResponse.status);

        if (headsResponse.ok) {
          const headsData = await headsResponse.json();
          console.log('Expense heads received:', headsData);
          const activeHeads = (headsData.expense_heads || []).filter(h => h.status === 'on');
          console.log('Active expense heads:', activeHeads);
          setHeads(activeHeads);
        } else {
          const errorText = await headsResponse.text();
          console.error('Failed to fetch expense heads:', headsResponse.status, errorText);
          setError(`Failed to fetch expense heads: ${headsResponse.status}`);
          setHeads([]);
        }
      } catch (error) {
        console.error('Error fetching expense heads:', error);
        setError(`Network error fetching expense heads: ${error.message}`);
        setHeads([]);
      }

      // Fetch expenses from API
      try {
        console.log('Fetching expenses from:', `${API_BASE_URL}/api/branch/expenses`);
        const expensesResponse = await fetch(`${API_BASE_URL}/api/branch/expenses`, {
          headers: getAuthHeaders()
        });

        console.log('Expenses response status:', expensesResponse.status);

        if (expensesResponse.ok) {
          const expensesData = await expensesResponse.json();
          console.log('Expenses received:', expensesData);
          const expenseList = expensesData.expenses || [];
          setOriginalExpenses(expenseList);
          setExpenses(expenseList);
        } else {
          const errorText = await expensesResponse.text();
          console.error('Failed to fetch expenses:', expensesResponse.status, errorText);
          setOriginalExpenses([]);
          setExpenses([]);
        }
      } catch (error) {
        console.error('Error fetching expenses:', error);
        setOriginalExpenses([]);
        setExpenses([]);
      }
    } catch (error) {
      console.error('Error in fetchData:', error);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    console.log('Searching with filters:', filters);
    // Filter expenses based on selected criteria
    let filtered = [...originalExpenses];

    if (filters.selectedHead) {
      filtered = filtered.filter(exp => exp.headName === filters.selectedHead);
    }

    if (filters.fromDate) {
      filtered = filtered.filter(exp => new Date(exp.date) >= new Date(filters.fromDate));
    }

    if (filters.toDate) {
      filtered = filtered.filter(exp => new Date(exp.date) <= new Date(filters.toDate));
    }

    console.log(`Filtered ${originalExpenses.length} expenses to ${filtered.length}`);
    setExpenses(filtered);
  };

  const handleReset = () => {
    console.log('Resetting filters');
    setFilters({
      selectedHead: '',
      fromDate: '',
      toDate: ''
    });
    setExpenses(originalExpenses);
  };

  const handleAddExpense = () => {
    setFormData({
      headName: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      paymentMode: 'Online Mode'
    });
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      console.log('Adding new expense:', formData);

      const response = await fetch(`${API_BASE_URL}/api/branch/expenses`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });

      console.log('Add expense response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Add expense response:', result);
        fetchData(); // Refresh the list
        alert('Expense added successfully!');
      } else {
        const errorData = await response.text();
        setError(`Failed to add expense: ${response.status} - ${errorData}`);
      }

      setIsAddModalOpen(false);
      setFormData({
        headName: '',
        amount: '',
        date: '',
        paymentMode: 'Online Mode'
      });
    } catch (error) {
      console.error('Error adding expense:', error);
      setError(`Network error: ${error.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      setError(null);
      console.log('Deleting expense:', id);

      const response = await fetch(`${API_BASE_URL}/api/branch/expenses/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      console.log('Delete expense response status:', response.status);

      if (response.ok) {
        fetchData(); // Refresh the list
        alert('Expense deleted successfully!');
      } else {
        const errorData = await response.text();
        setError(`Failed to delete expense: ${response.status} - ${errorData}`);
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      setError(`Network error: ${error.message}`);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const calculateTotal = () => {
    return expenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0).toFixed(2);
  };

  if (loading) {
    return (
      <BranchLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <FaSpinner className="text-4xl text-amber-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading expenses...</p>
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
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📋</span>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-800">MANAGE CASHOUT</h1>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 items-end">
              {/* Choose Head Dropdown */}
              <div className="w-full min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-1 lg:hidden">Head</label>
                <select
                  value={filters.selectedHead}
                  onChange={(e) => handleFilterChange('selectedHead', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent truncate"
                >
                  <option value="">-- Choose Head --</option>
                  {heads.map(head => (
                    <option key={head.id} value={head.headName} className="truncate">
                      {head.headName.length > 25 ? head.headName.substring(0, 25) + '...' : head.headName}
                    </option>
                  ))}
                </select>
              </div>

              {/* From Date */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date :</label>
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* To Date */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date :</label>
                <input
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => handleFilterChange('toDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Search Button */}
              <div className="w-full">
                <button
                  onClick={handleSearch}
                  className="w-full px-6 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded transition-colors h-[42px] flex items-center justify-center whitespace-nowrap"
                >
                  Search
                </button>
              </div>

              {/* Reset Button */}
              <div className="w-full">
                <button
                  onClick={handleReset}
                  className="w-full px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors h-[42px] flex items-center justify-center whitespace-nowrap"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="flex justify-start mb-6">
              <button
                onClick={handleAddExpense}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded transition-colors w-full sm:w-auto"
              >
                Add New Cashout
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

        {/* Mobile View - Cards */}
        <div className="md:hidden space-y-4 mb-6">
          {/* Total Summary Card for Mobile */}
          <div className="bg-amber-700 text-white rounded-lg p-4 shadow-md mb-4">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total(Rs.)</span>
              <span className="text-xl font-bold">{calculateTotal()} /-</span>
            </div>
          </div>

          {expenses.length > 0 ? (
            expenses.map((expense, index) => (
              <div key={expense.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3 border-b border-gray-100 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">#{index + 1}</span>
                    <span className="font-semibold text-gray-800">{expense.headName}</span>
                  </div>
                  <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                    {expense.paymentMode}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex justify-between">
                    <span>Amount:</span>
                    <span className="font-bold text-gray-900">{expense.amount} /-</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{formatDate(expense.date)}</span>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-gray-100">
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="flex items-center space-x-1 text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded transition-colors text-sm font-medium"
                  >
                    <FaTrash className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              No expenses found. Click "Add New Cashout" to add one.
            </div>
          )}
        </div>

        {/* Desktop View - Table */}
        <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-orange-700 text-white">
                  <th className="px-6 py-4 text-left text-sm font-semibold">S.No.</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Head Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Amount(Rs.)</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Payment Mode</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {/* Total Row */}
                <tr className="bg-amber-700 text-white">
                  <td className="px-6 py-3 text-sm font-semibold border-r border-amber-600">Total(Rs.)</td>
                  <td className="px-6 py-3 text-sm border-r border-amber-600"></td>
                  <td className="px-6 py-3 text-sm font-semibold border-r border-amber-600">{calculateTotal()} /-</td>
                  <td className="px-6 py-3 text-sm border-r border-amber-600"></td>
                  <td className="px-6 py-3 text-sm border-r border-amber-600"></td>
                  <td className="px-6 py-3 text-sm"></td>
                </tr>

                {expenses.length > 0 ? (
                  expenses.map((expense, index) => (
                    <tr key={expense.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 text-sm text-gray-700">{index + 1}.</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{expense.headName}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{expense.amount} /-</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{formatDate(expense.date)}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{expense.paymentMode}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="bg-amber-500 hover:bg-amber-600 text-white p-2 rounded transition-colors"
                          title="Delete"
                        >
                          <FaTrash className="text-sm" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      No expenses found. Click "Add New Cashout" to add one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Expense Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-md z-50 overflow-y-auto">
            <div className="flex min-h-screen items-start justify-center p-4 py-8">
              <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-xl w-full max-w-md my-4 border border-white/20">
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Cashout</h2>
                  <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Head Name <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.headName}
                        onChange={(e) => setFormData({ ...formData, headName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">-- Select Head --</option>
                        {heads.map(head => (
                          <option key={head.id} value={head.headName}>{head.headName}</option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount (Rs.) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter amount"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Mode <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.paymentMode}
                        onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="Online Mode">Online Mode</option>
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Card">Card</option>
                      </select>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddModalOpen(false);
                          setFormData({
                            headName: '',
                            amount: '',
                            date: '',
                            paymentMode: 'Online Mode'
                          });
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                      >
                        Add Expense
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

export default ExpenseReport;
