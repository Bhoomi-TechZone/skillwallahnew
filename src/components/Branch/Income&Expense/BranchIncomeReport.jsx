import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaEdit, FaTrash, FaPlus, FaMoneyBillWave, FaSearch } from 'react-icons/fa';
import { getCashins, createCashin, updateCashin, deleteCashin } from '../../../api/incomeApi';
import { getIncomeHeads } from '../../../api/incomeApi';
import BranchLayout from '../BranchLayout';

const BranchIncomeReport = () => {
  const [cashins, setCashins] = useState([]);
  const [incomeHeads, setIncomeHeads] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCashin, setEditingCashin] = useState(null);

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
    income_date: new Date().toISOString().split('T')[0],
    income_description: ''
  });

  const paymentModes = ['Cash', 'Online', 'Cheque', 'UPI', 'Card', 'Net Banking'];

  useEffect(() => {
    loadBranches();
    loadIncomeHeads();
    loadCashins();
  }, []);

  const loadBranches = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/branch/branches/dropdown', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('branchToken') || localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Branches loaded:', data);
        setBranches(data.branches || []);
      }
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const loadIncomeHeads = async () => {
    try {
      console.log('🔄 Loading branch-specific income heads for branch_admin...');

      // Get branch-specific token (prioritize branch token over admin token)
      const branchToken = localStorage.getItem('branchToken') || localStorage.getItem('token');
      const adminToken = localStorage.getItem('adminToken');

      // Use branch token if available, otherwise use regular token
      const token = branchToken || adminToken;

      if (!token) {
        console.error('❌ No authentication token found');
        toast.error('Authentication required. Please login again.');
        return;
      }

      // Get current user info and force branch context
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const branchCode = currentUser.branch_code || localStorage.getItem('branch_code');
      const userEmail = currentUser.email;
      const userRole = currentUser.role;

      console.log('🏢 Branch admin context (should get BRANCH heads only):', {
        email: userEmail,
        role: userRole,
        branchCode: branchCode,
        franchiseCode: currentUser.franchise_code,
        tokenType: branchToken ? 'branch' : (adminToken ? 'admin' : 'unknown'),
        requestingBranchHeadsOnly: true
      });

      // FORCE branch-only context even for branch_admin users
      const requestHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Branch-Code': branchCode || '',
        'X-User-Role': 'branch_user', // Force branch_user role (not branch_admin)
        'X-User-Email': userEmail || '',
        'X-User-Type': 'branch_user', // Explicit branch user type
        'X-Context': 'branch', // Force branch context
        'X-Scope': 'branch-only', // Explicit scope
        'X-Exclude-Admin': 'true', // Explicit admin exclusion
        'X-Branch-Request': 'true', // Mark as branch request
        'X-Admin-Override': 'false', // Disable admin override
        'X-Force-Branch-Filter': 'true' // Force branch filtering
      };

      // For branch_admin users, be extra explicit about wanting branch heads only
      if (userRole === 'branch_admin') {
        console.warn('⚠️ User has branch_admin role - FORCING branch-only context');
        requestHeaders['X-Role-Context'] = 'branch';
        requestHeaders['X-Admin-Privileges'] = 'disabled';
        requestHeaders['X-Request-Type'] = 'branch-income-heads-only';
      }

      // Try multiple branch-specific endpoints with ultra-explicit parameters
      const branchEndpoints = [
        `http://localhost:4000/api/branch/income-heads?context=branch&admin=false&scope=branch&type=branch&exclude_admin=true&branch_code=${branchCode}`,
        `http://localhost:4000/api/branch-income/income-heads?user_type=branch&admin=false&scope=branch&branch_only=true`,
        `http://localhost:4000/api/income/branch-heads?exclude_admin=true&branch_code=${branchCode}&scope=local`
      ];

      for (const endpoint of branchEndpoints) {
        try {
          console.log(`🔄 Trying BRANCH-ONLY endpoint: ${endpoint}`);
          console.log('📤 Branch-only headers:', requestHeaders);

          const response = await fetch(endpoint, {
            method: 'GET',
            headers: requestHeaders
          });

          console.log(`📡 Response status: ${response.status}`);

          if (response.ok) {
            const data = await response.json();
            console.log(`✅ Endpoint response (should be BRANCH heads only):`, data);

            let heads = data.income_heads || data.data || data || [];

            // Ensure we have an array
            if (!Array.isArray(heads)) {
              heads = [];
            }

            console.log('📋 Raw heads received from API:', heads);

            // ULTRA-AGGRESSIVE filtering to exclude ALL admin heads
            const pureBranchHeads = heads.filter(head => {
              // Must be active
              const isActive = head.status !== false && head.status !== 'inactive' && head.status !== 0;

              // Must NOT be any type of admin/global/system head
              const isNotAdminHead = !head.is_admin_head &&
                !head.is_admin &&
                !head.admin_head &&
                !head.is_global &&
                !head.global &&
                !head.is_system_head &&
                !head.is_default &&
                !head.default_head &&
                !head.system_head &&
                !head.global_head;

              // Must NOT have admin-related properties
              const hasNoAdminProps = head.scope !== 'admin' &&
                head.scope !== 'global' &&
                head.scope !== 'system' &&
                head.type !== 'admin' &&
                head.type !== 'global' &&
                head.type !== 'system';

              // Must NOT be created by admin roles
              const notCreatedByAdmin = !head.created_by_role ||
                !['admin', 'super_admin', 'system', 'global', 'root'].includes(head.created_by_role.toLowerCase());

              // Must be for current branch or unassigned (but not admin)
              const belongsToCurrentBranch = !head.branch_code ||
                head.branch_code === branchCode ||
                (head.franchise_code === currentUser.franchise_code && !head.is_admin_head);

              // Check head name/title for admin indicators
              const headName = (head.headName || head.head_name || '').toLowerCase();
              const hasNoAdminInName = !headName.includes('admin') &&
                !headName.includes('global') &&
                !headName.includes('system') &&
                !headName.includes('default');

              const shouldInclude = isActive &&
                isNotAdminHead &&
                hasNoAdminProps &&
                notCreatedByAdmin &&
                belongsToCurrentBranch &&
                hasNoAdminInName;

              console.log('🔍 ULTRA-STRICT head filtering:', {
                headName: head.headName || head.head_name,
                id: head.id,
                isActive,
                isNotAdminHead,
                hasNoAdminProps,
                notCreatedByAdmin,
                belongsToCurrentBranch,
                hasNoAdminInName,
                headBranchCode: head.branch_code,
                userBranchCode: branchCode,
                createdByRole: head.created_by_role,
                scope: head.scope,
                type: head.type,
                INCLUDE: shouldInclude
              });

              return shouldInclude;
            });

            console.log('📋 FINAL BRANCH-ONLY heads (admin heads excluded):', pureBranchHeads);
            setIncomeHeads(pureBranchHeads);

            if (pureBranchHeads.length === 0) {
              console.warn('⚠️ No branch heads found - all heads were admin/global heads');
              toast.warning('No branch income heads found. All available heads appear to be admin heads. Create branch-specific income heads.');
            } else {
              console.log(`✅ SUCCESS: Loaded ${pureBranchHeads.length} BRANCH income heads (admin excluded)`);
              toast.success(`Loaded ${pureBranchHeads.length} branch income heads`);
            }

            return;
          } else {
            const errorText = await response.text();
            console.error(`❌ Branch endpoint failed: ${response.status} - ${errorText}`);
          }
        } catch (endpointError) {
          console.error(`❌ Branch endpoint error:`, endpointError);
        }
      }

      // If all endpoints fail
      console.error('❌ All branch-specific endpoints failed');
      toast.error('Unable to load branch income heads. All available heads appear to be admin heads.');
      setIncomeHeads([]);

    } catch (error) {
      console.error('❌ Critical error loading branch income heads:', error);
      toast.error(`Failed to load income heads: ${error.message}`);
      setIncomeHeads([]);
    }
  };

  const loadCashins = async () => {
    try {
      setLoading(true);
      const response = await getCashins(filters);
      setCashins(response.data || response || []);
    } catch (error) {
      console.error('Error loading cashins:', error);
      toast.error(error.message || 'Failed to load cashin records');
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
    loadCashins();
  };

  const handleOpenModal = (cashin = null) => {
    if (cashin) {
      setEditingCashin(cashin);
      setFormData({
        head_id: cashin.head_id || '',
        amount: cashin.amount || '',
        payment_mode: cashin.payment_mode || '',
        payment_mode_description: cashin.payment_mode_description || '',
        income_date: cashin.income_date || new Date().toISOString().split('T')[0],
        income_description: cashin.income_description || ''
      });
    } else {
      setEditingCashin(null);
      setFormData({
        head_id: '',
        amount: '',
        payment_mode: '',
        payment_mode_description: '',
        income_date: new Date().toISOString().split('T')[0],
        income_description: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCashin(null);
    setFormData({
      head_id: '',
      amount: '',
      payment_mode: '',
      payment_mode_description: '',
      income_date: new Date().toISOString().split('T')[0],
      income_description: ''
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

      const cashinData = {
        ...formData,
        amount: parseFloat(formData.amount)
      };

      if (editingCashin) {
        await updateCashin(editingCashin.id, cashinData);
        toast.success('Cashin updated successfully');
      } else {
        await createCashin(cashinData);
        toast.success('Cashin added successfully');
      }

      handleCloseModal();
      loadCashins();
    } catch (error) {
      console.error('Error saving cashin:', error);
      toast.error(error.message || 'Failed to save cashin');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this cashin record?')) {
      return;
    }

    try {
      await deleteCashin(id);
      toast.success('Cashin deleted successfully');
      loadCashins();
    } catch (error) {
      console.error('Error deleting cashin:', error);
      toast.error(error.message || 'Failed to delete cashin');
    }
  };

  const calculateTotal = () => {
    return cashins.reduce((sum, cashin) => sum + (parseFloat(cashin.amount) || 0), 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  const getHeadName = (headId) => {
    const head = incomeHeads.find(h => h.id === headId);
    return head ? (head.headName || head.head_name) : 'N/A';
  };

  return (
    <BranchLayout>
      <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="bg-orange-100 p-2 rounded-lg">
                <FaMoneyBillWave className="text-2xl text-orange-600" />
              </div>
              <h1 className="text-xl md:text-3xl font-bold text-gray-900">Manage Cashin</h1>
            </div>

            {/* Add New Cashin Button (Moved to Header for better layout) */}
            <button
              onClick={() => handleOpenModal()}
              className="w-full md:w-auto flex items-center justify-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-lg transition-colors duration-200 shadow-sm font-medium"
            >
              <FaPlus className="w-4 h-4" />
              <span>Add Cashin</span>
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div>
              <select
                name="branchId"
                value={filters.branchId}
                onChange={handleFilterChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- All Branches --</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.centre_name || branch.name || 'Branch'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                name="headId"
                value={filters.headId}
                onChange={handleFilterChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- Choose --</option>
                {incomeHeads.map(head => (
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
              className="flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors duration-200"
            >
              <FaSearch />
              <span>Search</span>
            </button>
          </div>
        </div>



        {/* Cashin Table (Desktop) */}
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
                    {cashins.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                          No Record Found...
                        </td>
                      </tr>
                    ) : (
                      cashins.map((cashin, index) => (
                        <tr key={cashin.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {index + 1}.
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {getHeadName(cashin.head_id)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {parseFloat(cashin.amount).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(cashin.income_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {cashin.payment_mode}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleOpenModal(cashin)}
                                className="text-blue-600 hover:text-blue-800 transition-colors p-2 hover:bg-blue-50 rounded"
                                title="Edit"
                              >
                                <FaEdit className="text-lg" />
                              </button>
                              <button
                                onClick={() => handleDelete(cashin.id)}
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading...</p>
            </div>
          ) : (
            <>
              {/* Total Summary Card */}
              <div className="bg-gray-800 text-white rounded-lg p-4 shadow-sm mb-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-lg">Total Income</span>
                  <span className="font-bold text-xl text-green-400">Rs. {calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              {cashins.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
                  <FaMoneyBillWave className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p>No cashin records found.</p>
                </div>
              ) : (
                cashins.map((cashin, index) => (
                  <div key={cashin.id} className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-50 text-orange-600 text-sm font-bold">
                          {index + 1}
                        </span>
                        <div>
                          <h3 className="font-bold text-gray-900">{getHeadName(cashin.head_id)}</h3>
                          <p className="text-xs text-gray-500">{formatDate(cashin.income_date)}</p>
                        </div>
                      </div>
                      <span className="text-green-600 font-bold text-lg">₹{parseFloat(cashin.amount).toFixed(2)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3 bg-gray-50 p-3 rounded-lg">
                      <div>
                        <span className="block text-xs text-gray-400">Payment Mode</span>
                        <span className="font-medium">{cashin.payment_mode || 'N/A'}</span>
                      </div>
                      {cashin.payment_mode_description && (
                        <div className="col-span-2 border-t border-gray-200 pt-2 mt-1">
                          <span className="block text-xs text-gray-400">Description</span>
                          <span className="text-xs">{cashin.payment_mode_description}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => handleOpenModal(cashin)}
                        className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-2 rounded text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                      >
                        <FaEdit className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(cashin.id)}
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
                  <FaMoneyBillWave className="text-orange-600" />
                  <span>{editingCashin ? 'EDIT CASHIN' : 'CASHIN ADD'}</span>
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
                    <div className="md:col-span-2 space-y-2">
                      <div className="flex gap-2">
                        <select
                          id="head_id"
                          name="head_id"
                          value={formData.head_id}
                          onChange={handleInputChange}
                          required
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">
                            {incomeHeads.length === 0
                              ? "----- Loading Branch Income Heads... -----"
                              : `----- Choose Branch Head (${incomeHeads.length} available) -----`}
                          </option>
                          {incomeHeads.length === 0 ? (
                            <option value="" disabled>
                              No branch income heads found. Please create branch-specific income heads first.
                            </option>
                          ) : (
                            incomeHeads.map(head => (
                              <option key={head.id} value={head.id}>
                                {head.headName || head.head_name || `Branch Head ID: ${head.id}`}
                              </option>
                            ))
                          )}
                        </select>
                        <button
                          type="button"
                          onClick={loadIncomeHeads}
                          className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                          title="Refresh income heads"
                        >
                          🔄
                        </button>
                      </div>
                      {incomeHeads.length === 0 && (
                        <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                          ⚠️ No branch-specific income heads available.
                          <a
                            href="/branch/income-expense/income-head"
                            className="text-blue-600 underline ml-1"
                            target="_blank"
                          >
                            Create branch income heads first
                          </a>
                          <div className="mt-1 text-xs text-gray-600">
                            Note: Only branch-specific heads are shown, not admin heads.
                          </div>
                        </div>
                      )}
                    </div>
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
                      Incomes Amount(Rs.) :
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
                    <label htmlFor="income_date" className="text-sm font-medium text-gray-700">
                      Incomes Date :
                    </label>
                    <input
                      type="date"
                      id="income_date"
                      name="income_date"
                      value={formData.income_date}
                      onChange={handleInputChange}
                      required
                      className="md:col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                    <label htmlFor="income_description" className="text-sm font-medium text-gray-700 pt-2">
                      Incomes Description :
                    </label>
                    <textarea
                      id="income_description"
                      name="income_description"
                      value={formData.income_description}
                      onChange={handleInputChange}
                      placeholder="Enter income description"
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

export default BranchIncomeReport;
