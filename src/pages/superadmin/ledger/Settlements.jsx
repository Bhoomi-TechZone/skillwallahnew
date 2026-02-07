import { useState, useEffect } from 'react';
import {
  FaMoneyCheckAlt,
  FaCalendar,
  FaCheck,
  FaClock,
  FaTimes,
  FaDownload,
  FaSearch,
  FaFilter,
  FaBan,
  FaEye,
  FaExclamationTriangle
} from 'react-icons/fa';
import SuperAdminSidebar from '../SuperAdminSidebar';

// Simple notification system to replace react-toastify
const notify = {
  success: (message) => {
    console.log('✅ SUCCESS:', message);
    alert(`✅ Success: ${message}`);
  },
  error: (message) => {
    console.error('❌ ERROR:', message);
    alert(`❌ Error: ${message}`);
  },
  info: (message) => {
    console.log('ℹ️ INFO:', message);
    alert(`ℹ️ Info: ${message}`);
  }
};

const Settlements = () => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    return window.innerWidth >= 1024;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [settlements, setSettlements] = useState([]);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState({});

  // API configuration
  const API_BASE_URL = 'http://localhost:4000/api';

  // Fetch settlements from backend
  const fetchSettlements = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_BASE_URL}/ledger/settlements`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch settlements: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setSettlements(data.data || []);
      } else {
        throw new Error(data.message || 'Failed to fetch settlements');
      }
    } catch (error) {
      console.error('Error fetching settlements:', error);
      setError(error.message);
      notify.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Process settlements
  const processSettlements = async () => {
    try {
      setProcessing(prev => ({ ...prev, process: true }));

      const response = await fetch(`${API_BASE_URL}/ledger/process-settlements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to process settlements: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        notify.success(`Successfully processed ${data.processed} settlements totaling ₹${data.amount?.toLocaleString()}`);
        // Refresh settlements data
        fetchSettlements();
      } else {
        throw new Error(data.message || 'Failed to process settlements');
      }
    } catch (error) {
      console.error('Error processing settlements:', error);
      notify.error(error.message);
    } finally {
      setProcessing(prev => ({ ...prev, process: false }));
    }
  };

  // Export settlements report
  const exportSettlements = async () => {
    try {
      setProcessing(prev => ({ ...prev, export: true }));

      const response = await fetch(`${API_BASE_URL}/ledger/export-report?period=month`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to export report: ${response.statusText}`);
      }

      // Handle PDF download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `settlements_report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      notify.success('Settlements report exported successfully!');
    } catch (error) {
      console.error('Error exporting settlements:', error);
      notify.error(`Export failed: ${error.message}`);
    } finally {
      setProcessing(prev => ({ ...prev, export: false }));
    }
  };

  // Approve settlement
  const approveSettlement = async (settlementId) => {
    try {
      setProcessing(prev => ({ ...prev, [settlementId]: 'approving' }));

      const response = await fetch(`${API_BASE_URL}/ledger/settlements/${settlementId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to approve settlement: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        notify.success('Settlement approved successfully!');
        fetchSettlements(); // Refresh data
      } else {
        throw new Error(data.message || 'Failed to approve settlement');
      }
    } catch (error) {
      console.error('Error approving settlement:', error);
      notify.error(`Approval failed: ${error.message}`);
    } finally {
      setProcessing(prev => ({ ...prev, [settlementId]: false }));
    }
  };

  // Reject settlement
  const rejectSettlement = async (settlementId) => {
    try {
      setProcessing(prev => ({ ...prev, [settlementId]: 'rejecting' }));

      const response = await fetch(`${API_BASE_URL}/ledger/settlements/${settlementId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to reject settlement: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        notify.success('Settlement rejected successfully!');
        fetchSettlements(); // Refresh data
      } else {
        throw new Error(data.message || 'Failed to reject settlement');
      }
    } catch (error) {
      console.error('Error rejecting settlement:', error);
      notify.error(`Rejection failed: ${error.message}`);
    } finally {
      setProcessing(prev => ({ ...prev, [settlementId]: false }));
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-orange-100 text-orange-800';
      case 'Processing': return 'bg-blue-100 text-blue-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed': return <FaCheck className="text-orange-600" />;
      case 'Processing': return <FaClock className="text-blue-600" />;
      case 'Pending': return <FaClock className="text-yellow-600" />;
      case 'Failed': return <FaTimes className="text-red-600" />;
      default: return <FaClock className="text-gray-600" />;
    }
  };

  const filteredSettlements = settlements.filter(settlement => {
    const matchesSearch = (settlement.reference?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (settlement.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    if (statusFilter === 'All') return matchesSearch;
    return matchesSearch && settlement.status === statusFilter;
  });

  const handleAction = (settlementId, action) => {
    switch (action) {
      case 'approve':
        approveSettlement(settlementId);
        break;
      case 'reject':
        rejectSettlement(settlementId);
        break;
      case 'view':
        // Open settlement details modal or navigate to details page
        console.log(`Viewing settlement ${settlementId}`);
        notify.info('Settlement details feature coming soon!');
        break;
      default:
        console.log(`${action} settlement ${settlementId}`);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-emerald-50/50 via-teal-50/50 to-cyan-50/50">
      {/* Sidebar */}
      <SuperAdminSidebar
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        activeMenuItem="Settlements"
      />

      {/* Main Content */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarOpen ? 'sm:ml-80 md:ml-72 lg:ml-72' : ''}`}>
        {/* Header */}
        <header className="bg-white/90 backdrop-blur-sm border-b border-teal-200/50 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-teal-900">💳 Settlement Management</h1>
                <p className="text-sm text-teal-700/70">Process and track payment settlements</p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={processSettlements}
                  disabled={processing.process || loading}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${processing.process
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-orange-600 hover:bg-orange-700'
                    } text-white`}
                >
                  {processing.process ? <FaClock className="animate-spin" /> : <FaCheck />}
                  <span>{processing.process ? 'Processing...' : 'Process Settlements'}</span>
                </button>
                <button
                  onClick={exportSettlements}
                  disabled={processing.export || loading}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${processing.export
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-teal-600 hover:bg-teal-700'
                    } text-white`}
                >
                  {processing.export ? <FaClock className="animate-spin" /> : <FaDownload />}
                  <span>{processing.export ? 'Exporting...' : 'Export Report'}</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-8xl mx-auto space-y-6">

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center">
                  <FaExclamationTriangle className="text-red-500 mr-3" />
                  <div>
                    <h3 className="text-red-800 font-medium">Error Loading Settlements</h3>
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                  <button
                    onClick={fetchSettlements}
                    className="ml-auto px-3 py-1 bg-red-100 text-red-600 text-sm rounded hover:bg-red-200"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-teal-200/50 shadow-lg">
                <div className="flex items-center">
                  <FaMoneyCheckAlt className="text-2xl text-orange-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {settlements.filter(s => s.status === 'Completed').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-teal-200/50 shadow-lg">
                <div className="flex items-center">
                  <FaClock className="text-2xl text-blue-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Processing</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {settlements.filter(s => s.status === 'Processing').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-teal-200/50 shadow-lg">
                <div className="flex items-center">
                  <FaClock className="text-2xl text-yellow-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {settlements.filter(s => s.status === 'Pending').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-teal-200/50 shadow-lg">
                <div className="flex items-center">
                  <FaTimes className="text-2xl text-red-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Failed</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {settlements.filter(s => s.status === 'Failed').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-teal-200/50 shadow-lg">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search settlements..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 w-80"
                    />
                  </div>
                </div>

                <div className="flex space-x-4">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="All">All Status</option>
                    <option value="Completed">Completed</option>
                    <option value="Processing">Processing</option>
                    <option value="Pending">Pending</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Settlements Table */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-teal-200/50 shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-teal-50 to-cyan-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Settlement</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipients</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                          <FaClock className="animate-spin mx-auto h-8 w-8 text-gray-400 mb-4" />
                          <p>Loading settlements...</p>
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-red-500">
                          <FaExclamationTriangle className="mx-auto h-8 w-8 text-red-400 mb-4" />
                          <p>Failed to load settlements</p>
                          <button
                            onClick={fetchSettlements}
                            className="mt-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                          >
                            Try Again
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredSettlements.map((settlement) => (
                        <tr key={settlement.id} className="hover:bg-teal-50/50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{settlement.reference || 'N/A'}</div>
                              <div className="text-sm text-gray-500">{settlement.description || 'No description'}</div>
                              <div className="text-xs text-gray-400">{settlement.bank || 'Bank information not available'}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{settlement.type || 'Unknown'}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                            ₹{(settlement.amount || 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{settlement.recipients || 0} recipients</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(settlement.status)}
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(settlement.status)}`}>
                                {settlement.status || 'Unknown'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {settlement.date ? new Date(settlement.date).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleAction(settlement.id, 'view')}
                                disabled={processing[settlement.id]}
                                className="px-3 py-1 bg-blue-100 text-blue-600 text-xs rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
                                title="View Details"
                              >
                                <FaEye />
                              </button>
                              {settlement.status === 'Pending' && (
                                <>
                                  <button
                                    onClick={() => handleAction(settlement.id, 'approve')}
                                    disabled={processing[settlement.id]}
                                    className={`px-3 py-1 text-xs rounded-lg transition-colors disabled:opacity-50 ${processing[settlement.id] === 'approving'
                                      ? 'bg-gray-100 text-gray-600'
                                      : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                                      }`}
                                    title={processing[settlement.id] === 'approving' ? 'Approving...' : 'Approve'}
                                  >
                                    {processing[settlement.id] === 'approving' ? <FaClock className="animate-spin" /> : <FaCheck />}
                                  </button>
                                  <button
                                    onClick={() => handleAction(settlement.id, 'reject')}
                                    disabled={processing[settlement.id]}
                                    className={`px-3 py-1 text-xs rounded-lg transition-colors disabled:opacity-50 ${processing[settlement.id] === 'rejecting'
                                      ? 'bg-gray-100 text-gray-600'
                                      : 'bg-red-100 text-red-600 hover:bg-red-200'
                                      }`}
                                    title={processing[settlement.id] === 'rejecting' ? 'Rejecting...' : 'Reject'}
                                  >
                                    {processing[settlement.id] === 'rejecting' ? <FaClock className="animate-spin" /> : <FaBan />}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {filteredSettlements.length === 0 && !loading && (
                <div className="text-center py-12">
                  <FaMoneyCheckAlt className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No settlements found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Try adjusting your search or filter criteria.
                  </p>
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
};

export default Settlements;