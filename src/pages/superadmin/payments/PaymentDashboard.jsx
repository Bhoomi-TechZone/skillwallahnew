import React, { useState, useEffect } from 'react';
import { FaDollarSign, FaCreditCard, FaUsers, FaChartLine, FaEye, FaDownload, FaSearch, FaFilter, FaReceipt, FaMoneyBillWave, FaSpinner, FaUndo, FaBars } from 'react-icons/fa';
import { MdTrendingUp, MdPayment } from 'react-icons/md';
import SuperAdminSidebar from '../SuperAdminSidebar';
import { useNavigate } from 'react-router-dom';
import { 
  getPaymentStats, 
  getTransactionDetails, 
  updateTransactionStatus, 
  generatePaymentReport, 
  getPaymentAnalytics, 
  processRefund 
} from '../../../api/paymentsApi';

const PaymentDashboard = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paymentStats, setPaymentStats] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalTransactions: 0,
    successfulPayments: 0
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState({ type: null, id: null });
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetchPaymentData();
    fetchAnalyticsData();
  }, []);

  const fetchPaymentData = async () => {
    setLoading(true);
    try {
      const data = await getPaymentStats();
      setPaymentStats(data.stats || {});
      setRecentTransactions(data.transactions || []);
      console.log('💰 Payment data loaded:', data);
    } catch (error) {
      console.error('Error fetching payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      const analyticsData = await getPaymentAnalytics('30d');
      setAnalytics(analyticsData);
      console.log('📊 Analytics data loaded:', analyticsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  // Handle transaction actions
  const handleViewTransaction = async (transaction) => {
    console.log('👁️ Viewing transaction:', transaction.id);
    setActionLoading({ type: 'view', id: transaction.id });
    
    try {
      const details = await getTransactionDetails(transaction.id);
      setSelectedTransaction({ ...transaction, ...details });
      setShowTransactionModal(true);
    } catch (error) {
      console.error('Error fetching transaction details:', error);
      // Show basic info if API fails
      setSelectedTransaction(transaction);
      setShowTransactionModal(true);
    } finally {
      setActionLoading({ type: null, id: null });
    }
  };

  const handleUpdateTransactionStatus = async (transactionId, newStatus) => {
    setActionLoading({ type: 'update', id: transactionId });
    
    try {
      await updateTransactionStatus(transactionId, newStatus);
      console.log(`✅ Transaction ${transactionId} status updated to ${newStatus}`);
      
      // Refresh data
      await fetchPaymentData();
      alert(`Transaction status updated to ${newStatus} successfully!`);
    } catch (error) {
      console.error('Error updating transaction status:', error);
      alert('Failed to update transaction status. Please try again.');
    } finally {
      setActionLoading({ type: null, id: null });
    }
  };

  const handleExportReport = async () => {
    setActionLoading({ type: 'export', id: 'report' });
    
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const reportBlob = await generatePaymentReport(startDate, endDate, 'csv');
      
      // Download the file
      const url = window.URL.createObjectURL(reportBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payment_report_${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log('📊 Payment report exported successfully');
      alert('Payment report exported successfully!');
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setActionLoading({ type: null, id: null });
    }
  };

  const handleProcessRefund = async (transactionId, amount) => {
    if (!window.confirm(`Are you sure you want to process a refund of ₹${amount}?`)) {
      return;
    }

    setActionLoading({ type: 'refund', id: transactionId });
    
    try {
      await processRefund(transactionId, amount, 'Admin initiated refund');
      console.log(`💰 Refund processed for transaction ${transactionId}`);
      
      // Refresh data
      await fetchPaymentData();
      alert('Refund processed successfully!');
    } catch (error) {
      console.error('Error processing refund:', error);
      alert('Failed to process refund. Please try again.');
    } finally {
      setActionLoading({ type: null, id: null });
    }
  };

  const openAnalytics = () => {
    console.log('📊 Opening analytics view');
    // Could navigate to detailed analytics page or open modal
    alert('Analytics View\n\nDetailed analytics dashboard would open here with:\n- Revenue trends\n- Payment method distribution\n- Geographic analysis\n- Time-based patterns');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-gradient-to-r from-emerald-100 to-orange-100 text-emerald-800 border border-emerald-200';
      case 'pending': return 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border border-yellow-200';
      case 'failed': return 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-200';
      default: return 'bg-gradient-to-r from-slate-100 to-gray-100 text-slate-800 border border-slate-200';
    }
  };

  const filteredTransactions = recentTransactions.filter(transaction => {
    const matchesSearch = (transaction.user_name || transaction.student_name || '')?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (transaction.course_title || transaction.course_name || '')?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (transaction.id || transaction.transaction_id || '')?.toString().includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-amber-50/30">
      <SuperAdminSidebar 
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        activeMenuItem="Payment Dashboard"
        setActiveMenuItem={() => {}}
      />
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'sm:ml-80 md:ml-72 lg:ml-72' : ''}`}>
        <div className="lg:hidden bg-white border-b p-4 flex items-center sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-gray-900 p-2">
            <FaBars className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold ml-4 bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent">Payment Dashboard</h1>
        </div>
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent mb-2">
                  Payment Dashboard
                </h1>
                <p className="text-slate-600">Monitor payments, revenue analytics and financial data</p>
              </div>
            <div className="flex gap-3">
              <button 
                onClick={handleExportReport}
                disabled={actionLoading.type === 'export'}
                className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading.type === 'export' ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <FaDownload />
                )}
                Export Report
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-emerald-500 to-orange-500 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Total Revenue</p>
                <p className="text-3xl font-bold">₹{(paymentStats.totalRevenue || 0).toLocaleString()}</p>
                <p className="text-emerald-200 text-xs mt-1">All time earnings</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <FaDollarSign className="text-2xl" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-medium">Monthly Revenue</p>
                <p className="text-3xl font-bold">₹{(paymentStats.monthlyRevenue || 0).toLocaleString()}</p>
                <p className="text-amber-200 text-xs mt-1">This month</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <MdTrendingUp className="text-2xl" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Transactions</p>
                <p className="text-3xl font-bold">{(paymentStats.totalTransactions || 0).toLocaleString()}</p>
                <p className="text-blue-200 text-xs mt-1">All transactions</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <FaCreditCard className="text-2xl" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Success Rate</p>
                <p className="text-3xl font-bold">{paymentStats.totalTransactions > 0 ? Math.round((paymentStats.successfulPayments / paymentStats.totalTransactions) * 100) : 0}%</p>
                <p className="text-purple-200 text-xs mt-1">Payment success</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <FaChartLine className="text-2xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-amber-100">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              <div className="relative flex-1 min-w-64">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-500" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-300"
                />
              </div>
              
              <div className="flex gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white min-w-40"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
          </div>
        </div>

       
        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl shadow-xl border border-amber-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent">Recent Transactions</h3>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-amber-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">Transaction ID</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">Course</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-amber-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4"><div className="h-4 bg-amber-200 rounded animate-pulse"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-amber-200 rounded animate-pulse"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-amber-200 rounded animate-pulse"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-amber-200 rounded animate-pulse"></div></td>
                      <td className="px-6 py-4"><div className="h-6 w-20 bg-amber-200 rounded-full animate-pulse"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-amber-200 rounded animate-pulse"></div></td>
                      <td className="px-6 py-4"><div className="h-8 w-8 bg-amber-200 rounded animate-pulse"></div></td>
                    </tr>
                  ))
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <FaReceipt className="text-6xl text-amber-300 mb-4 mx-auto" />
                      <h3 className="text-lg font-semibold text-slate-800 mb-2">No transactions found</h3>
                      <p className="text-slate-600">Payment transactions will appear here</p>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <tr key={transaction.id || transaction.transaction_id} className="hover:bg-amber-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-800">#{transaction.transaction_id || transaction.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-medium text-sm">
                            {(transaction.user_name || transaction.student_name)?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-slate-800">{transaction.user_name || transaction.student_name}</div>
                            <div className="text-sm text-slate-500">{transaction.user_email || transaction.student_email || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-800">{transaction.course_title || transaction.course_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-emerald-600">
                          {(() => {
                            const amount = transaction.amount || transaction.amount_paid || 0;
                            if (amount > 0) {
                              return `₹${amount.toLocaleString()}`;
                            } else if (transaction.status === 'free') {
                              return 'Free';
                            } else {
                              return '₹0';
                            }
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status || 'pending')}`}>
                          {transaction.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {transaction.date || new Date(transaction.created_at || transaction.enrollment_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleViewTransaction(transaction)}
                            disabled={actionLoading.type === 'view' && actionLoading.id === (transaction.id || transaction.transaction_id)}
                            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            title="View Details"
                          >
                            {actionLoading.type === 'view' && actionLoading.id === (transaction.id || transaction.transaction_id) ? (
                              <FaSpinner className="animate-spin" />
                            ) : (
                              <FaEye />
                            )}
                          </button>
                          
                          {transaction.status === 'pending' && (
                            <button 
                              onClick={() => handleUpdateTransactionStatus(transaction.id || transaction.transaction_id, 'completed')}
                              disabled={actionLoading.type === 'update' && actionLoading.id === (transaction.id || transaction.transaction_id)}
                              className="bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Mark as Completed"
                            >
                              {actionLoading.type === 'update' && actionLoading.id === (transaction.id || transaction.transaction_id) ? (
                                <FaSpinner className="animate-spin" />
                              ) : (
                                '✓'
                              )}
                            </button>
                          )}
                          
                          {transaction.status === 'completed' && (
                            <button 
                              onClick={() => handleProcessRefund(transaction.id || transaction.transaction_id, transaction.amount || transaction.amount_paid)}
                              disabled={actionLoading.type === 'refund' && actionLoading.id === (transaction.id || transaction.transaction_id)}
                              className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Process Refund"
                            >
                              {actionLoading.type === 'refund' && actionLoading.id === (transaction.id || transaction.transaction_id) ? (
                                <FaSpinner className="animate-spin" />
                              ) : (
                                <FaUndo />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Transaction Details Modal */}
        {showTransactionModal && selectedTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-2xl mx-4 shadow-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent">
                  Transaction Details
                </h3>
                <button
                  onClick={() => setShowTransactionModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Transaction ID</label>
                    <p className="text-lg font-bold text-gray-800">#{selectedTransaction.transaction_id || selectedTransaction.id}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Student Information</label>
                    <p className="text-lg text-gray-800">{selectedTransaction.user_name || selectedTransaction.student_name}</p>
                    <p className="text-sm text-gray-500">{selectedTransaction.user_email || selectedTransaction.student_email || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Course</label>
                    <p className="text-lg text-gray-800">{selectedTransaction.course_title || selectedTransaction.course_name}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Payment Method</label>
                    <p className="text-lg text-gray-800">{selectedTransaction.payment_method || 'Credit Card'}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Amount</label>
                    <p className="text-2xl font-bold text-emerald-600">
                      {(() => {
                        const amount = selectedTransaction.amount || selectedTransaction.amount_paid || 0;
                        if (amount > 0) {
                          return `₹${amount.toLocaleString()}`;
                        } else if (selectedTransaction.status === 'free') {
                          return 'Free Course';
                        } else {
                          return '₹0';
                        }
                      })()}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Status</label>
                    <p className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedTransaction.status)}`}>
                      {selectedTransaction.status}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Date</label>
                    <p className="text-lg text-gray-800">{selectedTransaction.date || new Date(selectedTransaction.created_at || selectedTransaction.enrollment_date).toLocaleDateString()}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Payment Gateway</label>
                    <p className="text-lg text-gray-800">{selectedTransaction.gateway || 'Razorpay'}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex gap-4">
                <button
                  onClick={() => setShowTransactionModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
                
                {selectedTransaction.status === 'pending' && (
                  <button
                    onClick={() => {
                      handleUpdateTransactionStatus(selectedTransaction.id || selectedTransaction.transaction_id, 'completed');
                      setShowTransactionModal(false);
                    }}
                    className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
                  >
                    Mark Completed
                  </button>
                )}
                
                {selectedTransaction.status === 'completed' && (
                  <button
                    onClick={() => {
                      handleProcessRefund(selectedTransaction.id || selectedTransaction.transaction_id, selectedTransaction.amount || selectedTransaction.amount_paid);
                      setShowTransactionModal(false);
                    }}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                  >
                    Process Refund
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default PaymentDashboard;