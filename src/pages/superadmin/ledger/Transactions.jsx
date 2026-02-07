import { useState, useEffect } from 'react';
import {
  FaExchangeAlt,
  FaCreditCard,
  FaReceipt,
  FaDownload,
  FaSearch,
  FaFilter,
  FaEye,
  FaChartLine,
  FaMoneyBillWave,
  FaBars,
  FaTimes
} from 'react-icons/fa';
import SuperAdminSidebar from '../SuperAdminSidebar';

const Transactions = () => {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateRange, setDateRange] = useState('month');
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    total: 0, successful: 0, pending: 0, processing: 0, failed: 0
  });
  const [error, setError] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Auto-handle sidebar on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        search: searchTerm,
        type_filter: typeFilter,
        status_filter: statusFilter,
        date_range: dateRange,
        limit: '100'
      });
      const response = await fetch(`http://localhost:4000/api/ledger/transactions?${params}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (result.success) {
        setTransactions(result.data.transactions || []);
        setSummary(result.data.summary || summary);
      } else {
        throw new Error(result.message || 'Failed to fetch');
      }
    } catch (error) {
      setError(error.message);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(fetchTransactions, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, typeFilter, statusFilter, dateRange]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Success': return 'bg-emerald-100 text-emerald-800';
      case 'Pending': return 'bg-amber-100 text-amber-800';
      case 'Processing': return 'bg-blue-100 text-blue-800';
      case 'Failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAmountColor = (amount) => amount >= 0 ? 'text-emerald-600' : 'text-red-600';

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Course Enrollment': return <FaReceipt className="text-blue-500" />;
      case 'Instructor Payout': return <FaMoneyBillWave className="text-purple-500" />;
      case 'Franchise Fee': return <FaCreditCard className="text-orange-500" />;
      case 'Refund': return <FaExchangeAlt className="text-red-500" />;
      default: return <FaChartLine className="text-indigo-500" />;
    }
  };

  // Client-side filtering logic
  const filteredTransactions = transactions.filter(t => {
    // 1. Search Filter (Case-insensitive check on multiple fields)
    const matchesSearch =
      searchTerm === '' ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()));

    // 2. Type Filter
    const matchesType = typeFilter === 'All' || t.type === typeFilter;

    // 3. Status Filter
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;

    // 4. Date Filter (Client-side fallback/enforcement)
    let matchesDate = true;
    const tDate = new Date(t.date);
    const now = new Date();

    // Reset time components for accurate day comparison
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tDateStart = new Date(tDate.getFullYear(), tDate.getMonth(), tDate.getDate());

    switch (dateRange) {
      case 'today':
        matchesDate = tDateStart.getTime() === todayStart.getTime();
        break;
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        matchesDate = tDate >= weekAgo;
        break;
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        matchesDate = tDate >= monthStart;
        break;
      case 'year':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        matchesDate = tDate >= yearStart;
        break;
      default:
        matchesDate = true;
    }

    return matchesSearch && matchesType && matchesStatus && matchesDate;
  });

  const handleExportData = () => {
    try {
      setIsExporting(true);
      const exportData = [['ID', 'Type', 'User', 'Amount', 'Status', 'Date']];
      // Export filtered data instead of all transactions
      filteredTransactions.forEach(t => exportData.push([t.id, t.type, t.user, t.amount, t.status, t.date]));
      const csv = exportData.map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (e) {
      alert('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <SuperAdminSidebar
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        activeMenuItem="Transactions"
      />

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarOpen ? 'lg:ml-72' : ''}`}>

        {/* Responsive Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
          <div className="px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
                >
                  {sidebarOpen ? <FaTimes /> : <FaBars />}
                </button>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Transactions</h1>
                  <p className="text-xs sm:text-sm text-slate-500">Manage your financial logs</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="flex-1 sm:flex-none px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="today">Today</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
                <button
                  onClick={handleExportData}
                  disabled={isExporting || transactions.length === 0}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
                >
                  <FaDownload />
                  <span className="hidden xs:inline">Export</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* Summary Widgets - 2x2 on Mobile, 4x1 on Desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {[
              { label: 'Successful', val: summary.successful, icon: FaReceipt, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Pending', val: summary.pending, icon: FaExchangeAlt, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Processing', val: summary.processing, icon: FaChartLine, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Failed', val: summary.failed, icon: FaCreditCard, color: 'text-red-600', bg: 'bg-red-50' },
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${item.bg} ${item.color} hidden sm:block`}>
                    <item.icon size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">{item.label}</p>
                    <p className="text-lg sm:text-2xl font-black text-slate-900">{item.val}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Search & Advanced Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search description, ID, or user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="flex-1 min-w-[140px] px-3 py-2 border rounded-lg text-sm"
              >
                <option value="All">All Types</option>
                <option value="Course Enrollment">Enrollment</option>
                <option value="Instructor Payout">Payout</option>
                <option value="Franchise Fee">Franchise</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 min-w-[140px] px-3 py-2 border rounded-lg text-sm"
              >
                <option value="All">All Status</option>
                <option value="Success">Success</option>
                <option value="Pending">Pending</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
          </div>

          {/* Transactions List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase font-bold tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Transaction Details</th>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan="6" className="py-20 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div></td></tr>
                  ) : filteredTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {getTypeIcon(t.type)}
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{t.id}</p>
                            <p className="text-xs text-slate-500 truncate max-w-[180px]">{t.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-700 font-medium">{t.user}</p>
                        <p className="text-[10px] text-slate-400">{t.userId}</p>
                      </td>
                      <td className={`px-6 py-4 font-bold text-sm ${getAmountColor(t.amount)}`}>
                        {t.amount >= 0 ? '+' : ''}₹{Math.abs(t.amount).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusColor(t.status)}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(t.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => handleViewDetails(t)} className="text-purple-600 hover:text-purple-800"><FaEye /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {loading ? (
                <div className="py-20 text-center text-slate-400 italic">Loading logs...</div>
              ) : filteredTransactions.map((t) => (
                <div key={t.id} className="p-4 active:bg-slate-50 transition-colors" onClick={() => handleViewDetails(t)}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-50 rounded-lg">{getTypeIcon(t.type)}</div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate max-w-[150px]">{t.id}</p>
                        <p className="text-[10px] text-slate-500">{new Date(t.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusColor(t.status)}`}>
                      {t.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-end mt-4">
                    <div className="text-[11px] text-slate-500">
                      <p className="font-bold text-slate-700">{t.user}</p>
                      <p className="truncate max-w-[200px]">{t.description}</p>
                    </div>
                    <p className={`font-black text-sm ${getAmountColor(t.amount)}`}>
                      {t.amount >= 0 ? '+' : ''}₹{Math.abs(t.amount).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {filteredTransactions.length === 0 && !loading && (
              <div className="py-16 text-center text-slate-400">No transactions found matching your filters</div>
            )}
          </div>
        </main>

        {/* Responsive Modal */}
        {showDetailsModal && selectedTransaction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeDetailsModal}></div>
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-4 sm:p-6 border-b flex justify-between items-center bg-slate-50">
                <h2 className="text-lg font-bold text-slate-900">Detail View</h2>
                <button onClick={closeDetailsModal} className="text-slate-400 hover:text-slate-600"><FaTimes /></button>
              </div>
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
                <DetailRow label="ID" value={selectedTransaction.id} />
                <DetailRow label="User" value={selectedTransaction.user} />
                <DetailRow label="Amount" value={`₹${selectedTransaction.amount}`} isAmount />
                <DetailRow label="Method" value={selectedTransaction.paymentMethod} />
                <DetailRow label="Status" value={selectedTransaction.status} isStatus />
                <div className="pt-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Description</p>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                    {selectedTransaction.description}
                  </p>
                </div>
              </div>
              <div className="p-4 border-t bg-slate-50 text-right">
                <button
                  onClick={closeDetailsModal}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-purple-700 transition-all"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Sub-components
const DetailRow = ({ label, value, isAmount, isStatus }) => (
  <div className="flex justify-between items-center py-2 border-b border-slate-50">
    <span className="text-xs font-bold text-slate-400 uppercase">{label}</span>
    <span className={`text-sm font-bold ${isAmount ? 'text-emerald-600' : 'text-slate-700'}`}>
      {value}
    </span>
  </div>
);

export default Transactions;