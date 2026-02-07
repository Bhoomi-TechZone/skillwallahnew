import React, { useState, useEffect } from 'react';
import BranchLayout from '../../components/Branch/BranchLayout';
import { branchesApi } from '../../api/branchesApi';
import {
  FaPlus,
  FaTrash,
  FaSearch,
  FaWallet,
  FaCalendarAlt,
  FaBuilding,
  FaTimes,
  FaDollarSign,
  FaSpinner
} from 'react-icons/fa';

const BranchWallet = () => {
  const [payments, setPayments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [branchCode, setBranchCode] = useState('');

  const [filters, setFilters] = useState({
    selectedBranch: '',
    fromDate: '',
    toDate: ''
  });

  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [newPayment, setNewPayment] = useState({
    branch: '',
    amount: '',
    date: '',
    description: '',
    paymentMode: 'Cash'
  });

  // API Base URL for branch payments
  const API_BASE_URL = 'http://localhost:4000';

  // Fetch branches from API
  const fetchBranches = async () => {
    try {
      console.log('🔍 Fetching branches from API...');
      const franchiseCode = localStorage.getItem('franchiseCode') || 'FR-IN-UTT-0A388';

      // Use the exact API endpoint from backend
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');

      const response = await fetch(`${API_BASE_URL}/api/branch/branches/${franchiseCode}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ API Response:', data);

        if (data.total && Array.isArray(data.branches)) {
          // Extract branch names from centre_info.centre_name based on backend structure
          const branchNames = data.branches
            .filter(branch => branch.status === 'ACTIVE' || !branch.status) // Filter active branches
            .map(branch => {
              // Handle both possible structures
              return branch.centre_info?.centre_name ||
                branch.branch_name ||
                branch.name ||
                'Unknown Branch';
            });

          setBranches(branchNames);
          console.log('✅ Branches loaded:', branchNames);
          // Cache branches
          localStorage.setItem('branch_wallet_branches', JSON.stringify(branchNames));
        } else {
          console.warn('⚠️ Invalid response format:', data);
          setBranches([]);
        }
      } else {
        console.error('❌ API Error:', response.status, response.statusText);
        // Fallback to branchesApi
        try {
          const fallbackResponse = await branchesApi.getBranches(franchiseCode);
          if (fallbackResponse.success && Array.isArray(fallbackResponse.branches)) {
            const branchNames = fallbackResponse.branches
              .filter(branch => branch.status === 'active')
              .map(branch => branch.branch_name || branch.name);
            setBranches(branchNames);
            console.log('✅ Fallback branches loaded:', branchNames);
          }
        } catch (fallbackError) {
          console.error('❌ Fallback failed:', fallbackError);
          setBranches([]);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching branches:', error);
      // Set some default branches for testing
      setBranches([
        'Bright education',
        'SHIVA INSTITUTE OF TECHNOLOGY-BHARCHAKIA',
        'Test Branch'
      ]);
    }
  };

  // Fetch payments from API
  const fetchPayments = async () => {
    try {
      console.log('🔍 Fetching payments from API...');
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');

      console.log('🚀 [Frontend] Calling GET /api/branch/branch-payments');
      console.log('🔑 [Frontend] Using token:', token ? 'Present' : 'Missing');

      const response = await fetch(`${API_BASE_URL}/api/branch/branch-payments`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 [Frontend] GET Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [Frontend] GET Response data:', data);
        if (data.success && Array.isArray(data.payments)) {
          setPayments(data.payments);
          console.log('✅ Payments loaded:', data.payments);
          // Cache payments
          localStorage.setItem('branch_wallet_payments', JSON.stringify(data.payments));
        }
      } else {
        const errorText = await response.text();
        console.error('❌ [Frontend] GET API Error:', response.status, errorText);
        setPayments([]);
      }
    } catch (error) {
      console.error('❌ Error fetching payments:', error);
      setPayments([]);
    }
  };

  // Add new payment via API
  const addPaymentToAPI = async (paymentData) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');

      console.log('🚀 [Frontend] Calling POST /api/branch/branch-payments');
      console.log('📤 [Frontend] Sending data:', paymentData);
      console.log('🔑 [Frontend] Using token:', token ? 'Present' : 'Missing');

      const response = await fetch(`${API_BASE_URL}/api/branch/branch-payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
      });

      console.log('📡 [Frontend] Response status:', response.status);
      console.log('📡 [Frontend] Response headers:', response.headers);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [Frontend] Response data:', data);
        if (data.success) {
          console.log('✅ Payment added successfully');
          return data.payment;
        }
      } else {
        // Log error details
        const errorText = await response.text();
        console.error('❌ [Frontend] API Error:', response.status, errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }
      throw new Error('Failed to add payment');
    } catch (error) {
      console.error('❌ Error adding payment:', error);
      throw error;
    }
  };

  // Delete payment via API
  const deletePaymentFromAPI = async (paymentId) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');

      const response = await fetch(`${API_BASE_URL}/api/branch/branch-payments/${paymentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('✅ Payment deleted successfully');
          return true;
        }
      }
      throw new Error('Failed to delete payment');
    } catch (error) {
      console.error('❌ Error deleting payment:', error);
      throw error;
    }
  };

  // Test API connectivity
  const testAPI = async () => {
    try {
      console.log('🧪 Testing API connectivity...');
      const response = await fetch(`${API_BASE_URL}/api/branch/test-branch-payments`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ API Test successful:', data);
      } else {
        console.error('❌ API Test failed:', response.status);
      }
    } catch (error) {
      console.error('❌ API Test error:', error);
    }
  };

  // Load data on component mount
  // Load data on component mount
  useEffect(() => {
    // Get user role from token
    const token = localStorage.getItem('token') || localStorage.getItem('adminToken') || localStorage.getItem('branchToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role || '');
        setBranchCode(payload.branch_code || payload.franchise_code || '');
        console.log('👤 User role:', payload.role, 'Branch code:', payload.branch_code);
      } catch (e) {
        console.error('Error parsing token:', e);
      }
    }

    // 1. Try to load from cache immediately (Stale-While-Revalidate)
    const CACHE_KEY_PAYMENTS = 'branch_wallet_payments';
    const CACHE_KEY_BRANCHES = 'branch_wallet_branches';

    const cachedPayments = localStorage.getItem(CACHE_KEY_PAYMENTS);
    const cachedBranches = localStorage.getItem(CACHE_KEY_BRANCHES);

    if (cachedPayments) {
      try {
        setPayments(JSON.parse(cachedPayments));
        setLoading(false); // Show cached data immediately
      } catch (e) { console.error('Error parsing cached payments', e); }
    }

    if (cachedBranches) {
      try {
        setBranches(JSON.parse(cachedBranches));
      } catch (e) { console.error('Error parsing cached branches', e); }
    }

    const loadData = async () => {
      // Don't set loading true if we already showed cached data
      if (!cachedPayments) setLoading(true);

      try {
        // Parallel fetch for speed
        await Promise.all([fetchBranches(), fetchPayments()]);
      } catch (error) {
        console.error('❌ Error loading data:', error);
        if (!cachedPayments) setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Calculate net payment
  const calculateNetPayment = () => {
    let filtered = payments;

    if (filters.selectedBranch) {
      filtered = filtered.filter(payment => payment.branch === filters.selectedBranch);
    }

    if (filters.fromDate) {
      filtered = filtered.filter(payment => new Date(payment.date.split('-').reverse().join('-')) >= new Date(filters.fromDate));
    }

    if (filters.toDate) {
      filtered = filtered.filter(payment => new Date(payment.date.split('-').reverse().join('-')) <= new Date(filters.toDate));
    }

    return filtered.reduce((total, payment) => total + payment.amount, 0);
  };

  const filteredPayments = () => {
    let filtered = payments;

    if (filters.selectedBranch) {
      filtered = filtered.filter(payment => payment.branch === filters.selectedBranch);
    }

    if (filters.fromDate) {
      filtered = filtered.filter(payment => new Date(payment.date.split('-').reverse().join('-')) >= new Date(filters.fromDate));
    }

    if (filters.toDate) {
      filtered = filtered.filter(payment => new Date(payment.date.split('-').reverse().join('-')) <= new Date(filters.toDate));
    }

    return filtered;
  };

  const handleAddPayment = async () => {
    if (!newPayment.branch || !newPayment.amount || !newPayment.date) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setLoading(true);

      const paymentData = {
        branch_name: newPayment.branch,
        amount: parseFloat(newPayment.amount),
        date: new Date(newPayment.date).toISOString().split('T')[0],
        description: newPayment.description,
        payment_mode: newPayment.paymentMode,
        created_by: localStorage.getItem('userId') || 'admin'
      };

      const addedPayment = await addPaymentToAPI(paymentData);

      // If API call successful, add to local state
      if (addedPayment) {
        setPayments(prevPayments => [...prevPayments, addedPayment]);
      } else {
        // Fallback: add to local state with generated ID
        const payment = {
          id: Date.now(),
          branch: newPayment.branch,
          amount: parseFloat(newPayment.amount),
          date: new Date(newPayment.date).toLocaleDateString('en-GB').replace(/\//g, '-'),
          description: newPayment.description,
          paymentMode: newPayment.paymentMode
        };
        setPayments(prevPayments => [...prevPayments, payment]);
      }

      // Reset form
      setNewPayment({
        branch: '',
        amount: '',
        date: '',
        description: '',
        paymentMode: 'Cash'
      });
      setShowAddPaymentModal(false);

      alert('Payment added successfully!');
    } catch (error) {
      console.error('❌ Error adding payment:', error);
      alert('Failed to add payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (id) => {
    if (!window.confirm('Are you sure you want to delete this payment?')) {
      return;
    }

    try {
      setLoading(true);

      const success = await deletePaymentFromAPI(id);

      if (success) {
        setPayments(prevPayments => prevPayments.filter(payment => payment.id !== id));
        alert('Payment deleted successfully!');
      } else {
        // Fallback: remove from local state
        setPayments(prevPayments => prevPayments.filter(payment => payment.id !== id));
      }
    } catch (error) {
      console.error('❌ Error deleting payment:', error);
      alert('Failed to delete payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters({
      ...filters,
      [field]: value
    });
  };

  const resetFilters = () => {
    setFilters({
      selectedBranch: '',
      fromDate: '',
      toDate: ''
    });
  };
  // Show loading spinner only if we have no data
  if (loading && payments.length === 0) {
    return (
      <BranchLayout>
        <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <FaSpinner className="animate-spin text-4xl text-amber-600 mb-4 mx-auto" />
            <p className="text-gray-600">Loading branch wallet data...</p>
          </div>
        </div>
      </BranchLayout>
    );
  }

  // Show error state
  if (error) {
    return (
      <BranchLayout>
        <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <p className="text-red-600 text-xl mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600"
            >
              Retry
            </button>
          </div>
        </div>
      </BranchLayout>
    );
  }
  return (
    <BranchLayout>
      <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <FaWallet className="text-amber-600 text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  MANAGE BRANCH PAYMENT : ( NET PAYMENT: {calculateNetPayment().toLocaleString()} )
                </h1>
                <p className="text-gray-600">Manage and track branch payments</p>
              </div>
            </div>
            {userRole !== 'branch_admin' && (
              <button
                onClick={() => setShowAddPaymentModal(true)}
                disabled={loading}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${loading
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
                  }`}
              >
                {loading ? <FaSpinner className="animate-spin text-sm" /> : <FaPlus className="text-sm" />}
                <span>{loading ? 'Loading...' : 'Add Payment'}</span>
              </button>
            )}
          </div>
        </div>



        {/* Mobile View (Cards) */}
        <div className="md:hidden space-y-4">
          {filteredPayments().length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow-sm">
              <FaWallet className="text-4xl mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No payments found</p>
            </div>
          ) : (
            filteredPayments().map((payment, index) => (
              <div key={payment.id} className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{payment.branch}</h3>
                    <div className="text-xs text-gray-500 flex items-center mt-1">
                      <FaCalendarAlt className="mr-1" />
                      {payment.date}
                    </div>
                  </div>
                  <span className="font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">
                    ₹{payment.amount.toLocaleString()}
                  </span>
                </div>

                <div className="space-y-2 mb-3 text-sm border-t border-gray-50 pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Mode:</span>
                    <span className="font-medium text-gray-800">{payment.paymentMode}</span>
                  </div>
                  {payment.description && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Desc:</span>
                      <span className="text-gray-800 text-right max-w-[60%]">{payment.description}</span>
                    </div>
                  )}
                </div>

                {/* Delete button (only visual for now as logic handled elsewhere, removed to keep simple or add if needed) */}
              </div>
            ))
          )}
        </div>

        {/* Desktop Payments Table */}
        <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-amber-700 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">SN.</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">BRANCH</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">AMT</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">DATE</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">DESCR</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">PAYMENT MODE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPayments().map((payment, index) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{payment.branch}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{payment.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{payment.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{payment.description || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{payment.paymentMode}</td>
                  </tr>
                ))}
                {filteredPayments().length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                      No payments found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Payment Modal */}
        {showAddPaymentModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-800">Add New Payment</h3>
                <button
                  onClick={() => setShowAddPaymentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Branch Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newPayment.branch}
                    onChange={(e) => setNewPayment({ ...newPayment, branch: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Branch</option>
                    {branches.length > 0 ? branches.map((branch, index) => (
                      <option key={index} value={branch}>{branch}</option>
                    )) : (
                      <option disabled>Loading branches...</option>
                    )}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Enter amount"
                    required
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newPayment.date}
                    onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newPayment.description}
                    onChange={(e) => setNewPayment({ ...newPayment, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    rows="3"
                    placeholder="Enter description (optional)"
                  />
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Mode <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newPayment.paymentMode}
                    onChange={(e) => setNewPayment({ ...newPayment, paymentMode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  >
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Online">Online</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 p-6 border-t">
                <button
                  onClick={() => setShowAddPaymentModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPayment}
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${loading
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-amber-500 text-white hover:bg-amber-600'
                    }`}
                >
                  {loading && <FaSpinner className="animate-spin text-sm" />}
                  <span>{loading ? 'Adding...' : 'Add Payment'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BranchLayout>
  );
};

export default BranchWallet;