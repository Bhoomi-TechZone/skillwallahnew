import { useState, useEffect } from 'react';
import { FaBars, FaCalendar, FaCheckCircle, FaCreditCard, FaDownload, FaEye, FaFileAlt, FaFilter, FaMoneyCheckAlt, FaSearch, FaTimes, FaUser } from 'react-icons/fa';
import { MdPayment } from 'react-icons/md';
import SuperAdminSidebar from './SuperAdminSidebar';

const TransactionHistory = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalTransactions: { value: '0', trend: '+0%' },
    transactionVolume: { value: '₹0', trend: '+0%' },
    successfulRate: { value: '0%', trend: '+0%' },
    pendingReview: { value: '0', trend: '0' }
  });

  // Modal States
  const [showExportModal, setShowExportModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Form States
  const [exportForm, setExportForm] = useState({
    format: 'PDF',
    dateFrom: '',
    dateTo: '',
    status: 'all',
    includeFields: {
      transactionId: true,
      user: true,
      amount: true,
      type: true,
      method: true,
      status: true,
      date: true
    }
  });

  // API fetch function
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('http://localhost:4000/payments/transaction', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response:', data);

      // Handle response structure: {success: true, transactions: [...]}
      const transactionsData = data.transactions && Array.isArray(data.transactions)
        ? data.transactions
        : (Array.isArray(data) ? data : []);

      setTransactions(transactionsData);

      // Calculate real stats from transaction data
      const totalTransactions = transactionsData.length;
      const totalVolume = transactionsData.reduce((sum, txn) => sum + (txn.amount_paid || txn.amount || 0), 0);
      const successfulTransactions = transactionsData.filter(txn =>
        (txn.payment_status === 'captured' || txn.payment_status === 'completed' || txn.status === 'paid')
      ).length;
      const pendingTransactions = transactionsData.filter(txn =>
        (txn.payment_status === 'pending' || txn.status === 'unpaid')
      ).length;
      const successRate = totalTransactions > 0 ? ((successfulTransactions / totalTransactions) * 100).toFixed(1) : 0;

      setStats({
        totalTransactions: {
          value: totalTransactions.toLocaleString(),
          trend: totalTransactions > 0 ? `+${totalTransactions}` : '+0'
        },
        transactionVolume: {
          value: `₹${totalVolume.toLocaleString()}`,
          trend: totalVolume > 0 ? '+' + ((totalVolume / 1000).toFixed(1)) + 'K' : '+0%'
        },
        successfulRate: {
          value: `${successRate}%`,
          trend: successRate > 90 ? '+' + (successRate - 90).toFixed(1) + '%' : '+0%'
        },
        pendingReview: {
          value: pendingTransactions.toString(),
          trend: pendingTransactions > 0 ? '+' + pendingTransactions : '0'
        }
      });

    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Failed to fetch transaction data');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchTransactions();
  }, []);

  // Handlers
  const handleExportClick = () => {
    setShowExportModal(true);
  };

  const handleViewClick = (transaction) => {
    setSelectedTransaction(transaction);
    setShowViewModal(true);
  };

  const handleExport = () => {
    console.log('Exporting transactions:', exportForm);
    setShowExportModal(false);
  };

  const statsArray = [
    { icon: MdPayment, label: 'Total Transactions', value: stats.totalTransactions.value, trend: stats.totalTransactions.trend, color: 'from-amber-400 to-orange-500' },
    { icon: FaMoneyCheckAlt, label: 'Transaction Volume', value: stats.transactionVolume.value, trend: stats.transactionVolume.trend, color: 'from-orange-400 to-red-500' },
    { icon: FaMoneyCheckAlt, label: 'Successful', value: stats.successfulRate.value, trend: stats.successfulRate.trend, color: 'from-yellow-400 to-amber-500' },
    { icon: FaMoneyCheckAlt, label: 'Pending Review', value: stats.pendingReview.value, trend: stats.pendingReview.trend, color: 'from-amber-500 to-orange-600' }
  ];

  // Format transaction data for display
  const formatTransactionData = (transaction) => {
    return {
      id: transaction.transaction_id || transaction.id,
      user: transaction.student_name || 'Unknown User',
      amount: transaction.amount_paid || transaction.amount || 0,
      type: transaction.course_name ? 'Course Purchase' : 'Course Enrollment',
      method: transaction.payment_method === 'razorpay' ? 'Razorpay' :
        transaction.payment_method === 'stripe' ? 'Stripe' :
          transaction.payment_method === 'netbanking' ? 'Net Banking' :
            transaction.payment_method === 'test' ? 'Test Payment' :
              transaction.payment_method || 'N/A',
      status: transaction.payment_status === 'captured' || transaction.payment_status === 'completed' || transaction.status === 'paid' ? 'Success' :
        transaction.payment_status === 'pending' || transaction.status === 'unpaid' ? 'Pending' :
          'Failed',
      date: transaction.enrollment_date ? new Date(transaction.enrollment_date).toLocaleString() :
        transaction.date || 'N/A',
      // Additional fields for detailed view
      course_name: transaction.course_name || 'N/A',
      payment_id: transaction.payment_id || 'N/A',
      session_id: transaction.session_id || 'N/A',
      invoice_number: transaction.invoice_number || 'N/A',
      invoice_date: transaction.invoice_date ? new Date(transaction.invoice_date).toLocaleDateString() : 'N/A',
      payment_status: transaction.payment_status || 'N/A',
      enrollment_date: transaction.enrollment_date ? new Date(transaction.enrollment_date).toLocaleDateString() : 'N/A',
      instructor_name: transaction.instructor?.name || 'N/A',
      instructor_avatar: transaction.instructor?.avatar || null,
      // Raw transaction for full details
      rawTransaction: transaction
    };
  };

  const formattedTransactions = transactions.map(formatTransactionData);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Success': return 'bg-orange-100 text-orange-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-amber-50/50 via-yellow-50/50 to-orange-50/50">
      <SuperAdminSidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarOpen ? 'sm:ml-80 md:ml-72 lg:ml-72' : ''}`}>
        <header className="bg-white/80 backdrop-blur-sm border-b border-amber-200 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-amber-100 rounded-lg transition-colors">
                <FaBars className="text-gray-600 text-xl" />
              </button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">Transaction History</h1>
                <p className="text-sm text-gray-600 mt-1">Complete transaction records and payment tracking</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchTransactions}
                disabled={loading}
                className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                <FaSearch className={loading ? 'animate-spin' : ''} /> {loading ? 'Loading...' : 'Refresh'}
              </button>
              <button
                onClick={handleExportClick}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all shadow-md flex items-center gap-2"
              >
                <FaDownload /> Export
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statsArray.map((stat, index) => (
              <div key={index} className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-amber-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${stat.color} shadow-md`}>
                    <stat.icon className="text-white text-2xl" />
                  </div>
                  <span className="text-orange-600 text-sm font-semibold bg-orange-50 px-2 py-1 rounded">{stat.trend}</span>
                </div>
                <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
                <h3 className="text-3xl font-bold text-gray-800">{stat.value}</h3>
              </div>
            ))}
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 mb-6 border border-amber-100 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search by transaction ID, user, or amount..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500" />
              </div>
              <select className="px-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white">
                <option value="all">All Status</option>
                <option value="success">Success</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <button className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all flex items-center gap-2">
                <FaFilter /> Filter
              </button>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl overflow-hidden border border-amber-100 shadow-sm">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Transaction ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">User</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Amount</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Method</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date & Time</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                        <span className="ml-2 text-gray-600">Loading transactions...</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <div className="text-red-600">
                        <p className="font-semibold">Error: {error}</p>
                        <button
                          onClick={fetchTransactions}
                          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Retry
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : formattedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  formattedTransactions.map((txn) => (
                    <tr key={txn.id} className="hover:bg-amber-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-sm text-gray-700">{txn.id}</td>
                      <td className="px-6 py-4 font-semibold text-gray-800">{txn.user}</td>
                      <td className="px-6 py-4 text-gray-700">{txn.type}</td>
                      <td className="px-6 py-4 font-bold text-gray-800">₹{txn.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-gray-700">{txn.method}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(txn.status)}`}>
                          {txn.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{txn.date}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleViewClick(txn)}
                          className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all flex items-center gap-1"
                        >
                          <FaEye /> View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowExportModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-amber-600 to-orange-600 text-white px-8 py-6 flex items-center justify-between z-10">
              <div className="flex items-center space-x-3">
                <FaDownload className="text-2xl" />
                <h2 className="text-2xl font-bold">Export Transaction History</h2>
              </div>
              <button onClick={() => setShowExportModal(false)} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
                <FaTimes className="text-xl" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-8 space-y-6">
              {/* Export Format */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
                <h3 className="text-lg font-bold text-amber-800 mb-4 flex items-center">
                  <FaFileAlt className="mr-2" /> Export Format
                </h3>
                <div className="space-y-3">
                  {['PDF', 'Excel', 'CSV'].map(format => (
                    <label key={format} className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-amber-100 transition-colors">
                      <input
                        type="radio"
                        name="format"
                        checked={exportForm.format === format}
                        onChange={() => setExportForm({ ...exportForm, format })}
                        className="w-5 h-5 text-amber-600 focus:ring-2 focus:ring-amber-500"
                      />
                      <div className="flex-1">
                        <span className="text-amber-900 font-semibold">{format}</span>
                        <p className="text-sm text-amber-600">
                          {format === 'PDF' && 'Professional report format with formatted tables'}
                          {format === 'Excel' && 'Spreadsheet with sortable and filterable data'}
                          {format === 'CSV' && 'Raw data export for custom analysis'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-6 border border-amber-200">
                <h3 className="text-lg font-bold text-amber-800 mb-4 flex items-center">
                  <FaCalendar className="mr-2" /> Date Range
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-amber-700 mb-2">From Date</label>
                    <input
                      type="date"
                      value={exportForm.dateFrom}
                      onChange={(e) => setExportForm({ ...exportForm, dateFrom: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-amber-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-amber-700 mb-2">To Date</label>
                    <input
                      type="date"
                      value={exportForm.dateTo}
                      onChange={(e) => setExportForm({ ...exportForm, dateTo: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-amber-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-amber-600">
                    Leave dates empty to export all transactions
                  </p>
                </div>
              </div>

              {/* Status Filter */}
              <div className="bg-gradient-to-br from-orange-50 to-emerald-50 rounded-xl p-6 border border-orange-200">
                <h3 className="text-lg font-bold text-orange-800 mb-4">Transaction Status</h3>
                <select
                  value={exportForm.status}
                  onChange={(e) => setExportForm({ ...exportForm, status: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-orange-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="success">Success Only</option>
                  <option value="pending">Pending Only</option>
                  <option value="failed">Failed Only</option>
                </select>
              </div>

              {/* Include Fields */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
                <h3 className="text-lg font-bold text-purple-800 mb-4 flex items-center">
                  <FaCheckCircle className="mr-2" /> Include Fields
                </h3>
                <div className="space-y-3">
                  {[
                    { key: 'transactionId', label: 'Transaction ID' },
                    { key: 'user', label: 'User Name' },
                    { key: 'amount', label: 'Amount' },
                    { key: 'type', label: 'Transaction Type' },
                    { key: 'method', label: 'Payment Method' },
                    { key: 'status', label: 'Status' },
                    { key: 'date', label: 'Date & Time' }
                  ].map(field => (
                    <label key={field.key} className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-purple-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={exportForm.includeFields[field.key]}
                        onChange={(e) => setExportForm({
                          ...exportForm,
                          includeFields: {
                            ...exportForm.includeFields,
                            [field.key]: e.target.checked
                          }
                        })}
                        className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="text-purple-900 font-semibold">{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Export Summary */}
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-6 border border-cyan-200">
                <div className="flex items-start space-x-3">
                  <FaCheckCircle className="text-cyan-500 text-xl mt-1" />
                  <div>
                    <h3 className="text-lg font-bold text-cyan-800 mb-2">Export Summary</h3>
                    <div className="space-y-1 text-sm text-cyan-700">
                      <p><span className="font-semibold">Format:</span> {exportForm.format}</p>
                      <p><span className="font-semibold">Status Filter:</span> {exportForm.status === 'all' ? 'All Transactions' : exportForm.status.charAt(0).toUpperCase() + exportForm.status.slice(1)}</p>
                      <p><span className="font-semibold">Fields:</span> {Object.values(exportForm.includeFields).filter(Boolean).length} of 7 selected</p>
                      {exportForm.dateFrom && exportForm.dateTo && (
                        <p><span className="font-semibold">Date Range:</span> {exportForm.dateFrom} to {exportForm.dateTo}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 px-8 py-4 flex justify-end space-x-4 border-t">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl hover:from-amber-700 hover:to-orange-700 transition-all font-semibold flex items-center space-x-2"
              >
                <FaDownload /> <span>Export Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Transaction Details Modal */}
      {showViewModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowViewModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-amber-600 to-orange-600 text-white px-8 py-6 flex items-center justify-between z-10">
              <div className="flex items-center space-x-3">
                <FaEye className="text-2xl" />
                <h2 className="text-2xl font-bold">Transaction Details</h2>
              </div>
              <button onClick={() => setShowViewModal(false)} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
                <FaTimes className="text-xl" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-8 space-y-6">
              {/* Transaction ID & Status */}
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-6 border border-amber-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-amber-600 mb-1">Transaction ID</p>
                    <h3 className="text-2xl font-bold text-amber-900 font-mono">{selectedTransaction.id}</h3>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusColor(selectedTransaction.status)}`}>
                    {selectedTransaction.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-amber-600 mb-1">Date & Time</p>
                    <p className="text-amber-900 font-semibold">{selectedTransaction.date}</p>
                  </div>
                  <div>
                    <p className="text-amber-600 mb-1">Type</p>
                    <p className="text-amber-900 font-semibold">{selectedTransaction.type}</p>
                  </div>
                </div>
              </div>

              {/* User Information */}
              <div className="bg-gradient-to-br from-orange-50 to-emerald-50 rounded-xl p-6 border border-orange-200">
                <h3 className="text-lg font-bold text-orange-800 mb-4 flex items-center">
                  <FaUser className="mr-2" /> User Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-100">
                    <span className="text-sm text-orange-600 font-semibold">User Name:</span>
                    <span className="text-orange-900 font-bold">{selectedTransaction.user}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-100">
                    <span className="text-sm text-orange-600 font-semibold">User ID:</span>
                    <span className="text-orange-900 font-mono">USR-{selectedTransaction.id.slice(-6)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
                <h3 className="text-lg font-bold text-purple-800 mb-4 flex items-center">
                  <FaCreditCard className="mr-2" /> Payment Details
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-100">
                    <span className="text-sm text-purple-600 font-semibold">Amount:</span>
                    <span className="text-2xl text-purple-900 font-bold">₹{selectedTransaction.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-100">
                    <span className="text-sm text-purple-600 font-semibold">Payment Method:</span>
                    <span className="text-purple-900 font-bold">{selectedTransaction.method}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-100">
                    <span className="text-sm text-purple-600 font-semibold">Payment ID:</span>
                    <span className="text-purple-900 font-mono">{selectedTransaction.payment_id}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-100">
                    <span className="text-sm text-purple-600 font-semibold">Payment Status:</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedTransaction.status)}`}>
                      {selectedTransaction.payment_status}
                    </span>
                  </div>
                  {selectedTransaction.session_id !== 'N/A' && (
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-100">
                      <span className="text-sm text-purple-600 font-semibold">Session ID:</span>
                      <span className="text-purple-900 font-mono text-xs">{selectedTransaction.session_id}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Course Information */}
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-6 border border-cyan-200">
                <h3 className="text-lg font-bold text-cyan-800 mb-4 flex items-center">
                  <FaFileAlt className="mr-2" /> Course Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-cyan-100">
                    <span className="text-sm text-cyan-600 font-semibold">Course Name:</span>
                    <span className="text-cyan-900 font-bold">{selectedTransaction.course_name}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-cyan-100">
                    <span className="text-sm text-cyan-600 font-semibold">Transaction Type:</span>
                    <span className="text-cyan-900 font-bold">{selectedTransaction.type}</span>
                  </div>
                  {selectedTransaction.instructor_name !== 'N/A' && (
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-cyan-100">
                      <span className="text-sm text-cyan-600 font-semibold">Instructor:</span>
                      <div className="flex items-center gap-2">
                        {selectedTransaction.instructor_avatar && (
                          <img src={selectedTransaction.instructor_avatar} alt="Instructor" className="w-6 h-6 rounded-full" />
                        )}
                        <span className="text-cyan-900 font-bold">{selectedTransaction.instructor_name}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-cyan-100">
                    <span className="text-sm text-cyan-600 font-semibold">Enrollment Date:</span>
                    <span className="text-cyan-900 font-bold">{selectedTransaction.enrollment_date}</span>
                  </div>
                </div>
              </div>

              {/* Invoice Information */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
                <h3 className="text-lg font-bold text-amber-800 mb-4 flex items-center">
                  <FaFileAlt className="mr-2" /> Invoice Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-100">
                    <span className="text-sm text-amber-600 font-semibold">Invoice Number:</span>
                    <span className="text-amber-900 font-mono">{selectedTransaction.invoice_number}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-100">
                    <span className="text-sm text-amber-600 font-semibold">Invoice Date:</span>
                    <span className="text-amber-900 font-bold">{selectedTransaction.invoice_date}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-100">
                    <span className="text-sm text-amber-600 font-semibold">Transaction Date:</span>
                    <span className="text-amber-900 font-bold">{selectedTransaction.date}</span>
                  </div>
                </div>
              </div>

              {/* Raw Transaction Data */}
              <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <FaEye className="mr-2" /> Complete Transaction Details
                </h3>
                <div className="bg-white rounded-lg border p-4 max-h-64 overflow-y-auto">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                    {JSON.stringify(selectedTransaction.rawTransaction, null, 2)}
                  </pre>
                </div>
                <div className="mt-4 text-xs text-gray-500">
                  <p>This shows the complete raw data from the API response for debugging and detailed analysis.</p>
                </div>
              </div>

              {/* Transaction Timeline */}
              <div className="bg-gradient-to-br from-orange-50 to-emerald-50 rounded-xl p-6 border border-orange-200">
                <h3 className="text-lg font-bold text-orange-800 mb-4">Transaction Timeline</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-orange-100">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-orange-900">Transaction Created</p>
                      <p className="text-xs text-orange-600">{selectedTransaction.date}</p>
                    </div>
                  </div>
                  {selectedTransaction.status === 'Success' && (
                    <>
                      <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-orange-100">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-orange-900">Payment Completed</p>
                          <p className="text-xs text-orange-600">Status: {selectedTransaction.payment_status}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-orange-100">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-orange-900">Course Access Granted</p>
                          <p className="text-xs text-orange-600">Student enrolled successfully</p>
                        </div>
                      </div>
                    </>
                  )}
                  {selectedTransaction.status === 'Pending' && (
                    <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-orange-100">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-orange-900">Payment Processing</p>
                        <p className="text-xs text-orange-600">Awaiting payment confirmation</p>
                      </div>
                    </div>
                  )}
                  {selectedTransaction.status === 'Failed' && (
                    <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-orange-100">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-orange-900">Payment Failed</p>
                        <p className="text-xs text-orange-600">Transaction could not be completed</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 px-8 py-4 flex justify-end space-x-4 border-t">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const dataStr = JSON.stringify(selectedTransaction.rawTransaction, null, 2);
                  const dataBlob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(dataBlob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `transaction-${selectedTransaction.id}.json`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-6 py-3 bg-gradient-to-r from-orange-600 to-emerald-600 text-white rounded-xl hover:from-orange-700 hover:to-emerald-700 transition-all font-semibold flex items-center space-x-2"
              >
                <FaDownload /> <span>Download JSON</span>
              </button>
              <button
                onClick={() => {
                  const printContent = `
                    Transaction Details - ${selectedTransaction.id}
                    =============================================
                    
                    User: ${selectedTransaction.user}
                    Course: ${selectedTransaction.course_name}
                    Amount: ₹${selectedTransaction.amount.toLocaleString()}
                    Payment Method: ${selectedTransaction.method}
                    Status: ${selectedTransaction.status}
                    Date: ${selectedTransaction.date}
                    Payment ID: ${selectedTransaction.payment_id}
                    Invoice Number: ${selectedTransaction.invoice_number}
                    Invoice Date: ${selectedTransaction.invoice_date}
                    
                    Raw Data:
                    ${JSON.stringify(selectedTransaction.rawTransaction, null, 2)}
                  `;
                  const printWindow = window.open('', '', 'height=600,width=800');
                  printWindow.document.write('<pre>' + printContent + '</pre>');
                  printWindow.document.close();
                  printWindow.print();
                }}
                className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl hover:from-amber-700 hover:to-orange-700 transition-all font-semibold flex items-center space-x-2"
              >
                <FaDownload /> <span>Print Details</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
