import React, { useState, useEffect } from 'react';
import BranchLayout from '../../components/Branch/BranchLayout';
import { FaPlus, FaTrash, FaSpinner } from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const IncomeReport = () => {
  // API helper function
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };
  const [incomes, setIncomes] = useState([]);
  const [heads, setHeads] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    selectedBranch: '',
    selectedHead: '',
    fromDate: '',
    toDate: ''
  });

  const [formData, setFormData] = useState({
    branch: '',
    headName: '',
    amount: '',
    date: '',
    paymentMode: 'Online Mode'
  });

  // Fetch income heads and incomes
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch branches from API
      try {
        const branchesResponse = await fetch(`${API_BASE_URL}/api/branch/branches`, {
          headers: getAuthHeaders(),
        });
        if (branchesResponse.ok) {
          const branchesData = await branchesResponse.json();
          console.log('Branches received:', branchesData);

          // Support different response shapes (array or { branches: [...] })
          let branchesList = [];
          if (Array.isArray(branchesData)) {
            branchesList = branchesData;
          } else if (Array.isArray(branchesData.branches)) {
            branchesList = branchesData.branches;
          } else if (branchesData && typeof branchesData === 'object') {
            branchesList = branchesData.data || branchesData.items || [];
            if (!Array.isArray(branchesList)) branchesList = [];
          }

          // Normalize branches to ensure each has id and name (coerce name to string to avoid [object Object])
          const getBranchName = (b) => {
            if (!b) return '';

            // Prefer explicit fields present in the API response
            const candidates = [
              b?.display_name,
              b?.branch_name,
              b?.centre_name,
              b?.centreName,
              b?.name,
              b?.branch,
              b?.branchName,
              b?.title,
              b?.label,
              b?.branch_title
            ];

            for (const c of candidates) {
              if (c !== undefined && c !== null) {
                if (typeof c === 'object') {
                  // If it's an object, try common nested fields else stringify a meaningful field
                  return String(c.name ?? c.title ?? c.value ?? JSON.stringify(c));
                }
                const s = String(c).trim();
                if (s) return s;
              }
            }

            // Try common snake_case keys if not caught above
            if (b.branch_name) return String(b.branch_name);
            if (b.display_name) return String(b.display_name);

            // Try to find any string property on the object
            for (const k in b) {
              if (typeof b[k] === 'string' && b[k].trim()) return b[k];
            }

            return 'Unknown Branch';
          };

          const normalized = branchesList.map((b, i) => ({
            id: b.id ?? b._id ?? b.branchId ?? i,
            name: getBranchName(b)
          }));

          console.log('Normalized branches:', normalized);
          setBranches(normalized.length ? normalized : [{ id: 1, name: 'Current Branch' }]);
        } else {
          console.error('Failed to fetch branches:', branchesResponse.status);
          setBranches([{ id: 1, name: 'Current Branch' }]);
        }
      } catch (error) {
        console.error('Error fetching branches:', error);
        setBranches([{ id: 1, name: 'Current Branch' }]);
      }

      // Fetch income heads from API
      try {
        console.log('Fetching income heads from:', `${API_BASE_URL}/api/branch/income-heads`);
        console.log('Auth headers:', getAuthHeaders());

        const headsResponse = await fetch(`${API_BASE_URL}/api/branch/income-heads`, {
          headers: getAuthHeaders(),
        });

        console.log('Income heads response status:', headsResponse.status);

        if (headsResponse.ok) {
          const headsData = await headsResponse.json();
          console.log('Income heads received:', headsData);
          console.log('Raw income_heads array:', headsData.income_heads);

          // Check all heads without filtering first
          const allHeads = headsData.income_heads || [];
          console.log('All heads before filtering:', allHeads);

          // Check status values
          allHeads.forEach((head, index) => {
            console.log(`Head ${index}:`, {
              name: head.name,
              status: head.status,
              statusType: typeof head.status
            });
          });

          // Try both 'on' and 'active' status
          const activeHeads = allHeads.filter(h => h.status === 'on' || h.status === 'active' || h.status === true);
          console.log('Active heads after filtering:', activeHeads);

          // If no active heads, use all heads
          if (activeHeads.length === 0) {
            console.log('No active heads found, using all heads');
            setHeads(allHeads);
          } else {
            setHeads(activeHeads);
          }
        } else {
          const errorText = await headsResponse.text();
          console.error('Failed to fetch income heads:', headsResponse.status, errorText);
          setError(`Failed to fetch income heads: ${headsResponse.status} - ${errorText}`);
          setHeads([]);
        }
      } catch (error) {
        console.error('Error fetching income heads:', error);
        setError(`Network error fetching income heads: ${error.message}`);
        setHeads([]);
      }

      // Fetch income records from API
      try {
        const incomesResponse = await fetch(`${API_BASE_URL}/api/branch/incomes`, {
          headers: getAuthHeaders(),
        });
        if (incomesResponse.ok) {
          const incomesData = await incomesResponse.json();
          console.log('Incomes received:', incomesData);
          setIncomes(incomesData.incomes || []);
        } else {
          console.error('Failed to fetch incomes:', incomesResponse.status, await incomesResponse.text());
          setIncomes([]);
        }
      } catch (error) {
        console.error('Error fetching incomes:', error);
        setIncomes([]);
      }
    } catch (error) {
      console.error('Error in fetchData:', error);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return incomes.reduce((sum, income) => sum + parseFloat(income.amount || 0), 0).toFixed(2);
  };

  const handleReset = () => {
    setFilters({
      selectedBranch: '',
      selectedHead: '',
      fromDate: '',
      toDate: ''
    });
    fetchData();
  };

  const handleSearch = () => {
    fetchData();
  };

  const handleAddIncome = () => {
    setFormData({
      branch: (branches[0] && (branches[0].id ?? branches[0]._id ?? branches[0].branchId)) || '',
      headName: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      paymentMode: 'Online Mode'
    });
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.headName || !formData.amount || !formData.date) {
      setError('Please fill all required fields');
      return;
    }

    try {
      const payload = {
        ...formData,
        branchName: (branches.find(b => String(b.id) === String(formData.branch))?.name) || formData.branch
      };
      const response = await fetch(`${API_BASE_URL}/api/branch/incomes`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        setIncomes([...incomes, result.income]);
        alert('Income record added successfully!');
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to add income record');
        return;
      }

      setIsAddModalOpen(false);
      setFormData({
        branch: '',
        headName: '',
        amount: '',
        date: '',
        paymentMode: 'Online Mode'
      });
      setError(null);
    } catch (error) {
      console.error('Error adding income:', error);
      setError('Failed to add income record');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this income record?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/branch/incomes/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setIncomes(incomes.filter(inc => inc.id !== id));
        alert('Income record deleted successfully!');
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to delete income record');
      }
    } catch (error) {
      console.error('Error deleting income:', error);
      setError('Failed to delete income record');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  if (loading) {
    return (
      <BranchLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </BranchLayout>
    );
  }

  return (
    <BranchLayout>
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-800">INCOME REPORT - CASHIN</h1>
          </div>

          <div className="p-6">
            {/* Error Display */}
            {error && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            {/* Filters Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 items-end">
              {/* Branch Dropdown */}
              <div className="w-full min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-1 lg:hidden">Branch</label>
                <select
                  value={filters.selectedBranch}
                  onChange={(e) => handleFilterChange('selectedBranch', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm bg-white truncate"
                >
                  <option value="">-- BRANCH --</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id} className="truncate">
                      {branch.name.length > 25 ? branch.name.substring(0, 25) + '...' : branch.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Choose Head Dropdown */}
              <div className="w-full min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-1 lg:hidden">Head</label>
                <select
                  value={filters.selectedHead}
                  onChange={(e) => handleFilterChange('selectedHead', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm bg-white truncate"
                >
                  <option value="">-- Choose Head --</option>
                  {heads.map(head => (
                    <option key={head.id} value={head.name || head.headName} className="truncate">
                      {(head.name || head.headName).length > 25 ? (head.name || head.headName).substring(0, 25) + '...' : (head.name || head.headName)}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                />
              </div>

              {/* To Date */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date :</label>
                <input
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => handleFilterChange('toDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                />
              </div>

              {/* Search Button */}
              <div className="w-full">
                <button
                  onClick={handleSearch}
                  className="w-full px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 transition-colors text-sm font-medium h-[38px] flex items-center justify-center whitespace-nowrap"
                >
                  Search
                </button>
              </div>
            </div>

            <div className="mb-4 p-3 bg-gray-100 rounded text-sm">
              <strong>Debug Info:</strong><br />
              Branches: {branches.length} | Heads: {heads.length} | Incomes: {incomes.length}
            </div>

            <div className="flex justify-start mb-4">
              <button
                onClick={handleAddIncome}
                className="px-5 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded border border-gray-300 transition-colors text-sm"
              >
                Add New Cashin
              </button>
            </div>

            {/* Mobile View - Cards */}
            <div className="md:hidden space-y-4 mb-6">
              {/* Total Summary Card for Mobile */}
              <div className="bg-amber-700 text-white rounded-lg p-4 shadow-md mb-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total(Rs.)</span>
                  <span className="text-xl font-bold">{calculateTotal()} /-</span>
                </div>
              </div>

              {incomes.length > 0 ? (
                incomes.map((income, index) => (
                  <div key={income.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3 border-b border-gray-100 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">#{index + 1}</span>
                        <span className="font-semibold text-gray-800">{income.headName}</span>
                      </div>
                      <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                        {income.paymentMode}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex justify-between">
                        <span>Amount:</span>
                        <span className="font-bold text-gray-900">{income.amount} /-</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Date:</span>
                        <span>{formatDate(income.date)}</span>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-gray-100">
                      <button
                        onClick={() => handleDelete(income.id)}
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
                  No income records found
                </div>
              )}
            </div>

            {/* Desktop View - Table */}
            <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gradient-to-r from-orange-600 to-amber-600 text-white">
                    <th className="px-6 py-4 text-left text-sm font-semibold border-r border-orange-500/30 first:rounded-tl-lg">S.No.</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold border-r border-orange-500/30">Head Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold border-r border-orange-500/30">Amount(Rs.)</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold border-r border-orange-500/30">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold border-r border-orange-500/30">Payment Mode</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold last:rounded-tr-lg">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {/* Total Row */}
                  <tr className="bg-amber-50">
                    <td className="px-6 py-3 text-sm font-bold text-amber-800 border-r border-gray-200">Total(Rs.)</td>
                    <td className="px-6 py-3 text-sm border-r border-gray-200"></td>
                    <td className="px-6 py-3 text-sm font-bold text-amber-800 border-r border-gray-200">{calculateTotal()} /-</td>
                    <td className="px-6 py-3 text-sm border-r border-gray-200"></td>
                    <td className="px-6 py-3 text-sm border-r border-gray-200"></td>
                    <td className="px-6 py-3 text-sm"></td>
                  </tr>

                  {incomes.length > 0 ? (
                    incomes.map((income, index) => (
                      <tr key={income.id} className="hover:bg-orange-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-100">{index + 1}.</td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium border-r border-gray-100">{income.headName}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-100">{income.amount} /-</td>
                        <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-100">{formatDate(income.date)}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-100">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {income.paymentMode}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleDelete(income.id)}
                            className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-all"
                            title="Delete"
                          >
                            <FaTrash className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div className="text-gray-400 text-4xl">📭</div>
                          <p>No income records found</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Add Cashin Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-start justify-center p-4 py-8">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md my-4">
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Cashin</h2>
                  <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Branch <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.branch}
                        onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">-- Select Branch --</option>
                        {branches.map(branch => (
                          <option key={branch.id} value={branch.id}>{branch.name}</option>
                        ))}
                      </select>
                    </div>

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
                          <option key={head.id} value={head.name || head.headName}>{head.name || head.headName}</option>
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
                            branch: '',
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
                        Add Cashin
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

export default IncomeReport;
