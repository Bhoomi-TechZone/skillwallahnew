import { useState, useEffect } from 'react';
import { FaCertificate, FaCalendarAlt, FaExclamationTriangle, FaCheckCircle, FaClock, FaSearch, FaBell } from 'react-icons/fa';
import SuperAdminSidebar from '../../SuperAdminSidebar';

const AgreementValidity = () => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    return window.innerWidth >= 1024;
  });

  const [agreements, setAgreements] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('endDate');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgreements();
  }, []);

  const fetchAgreements = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:4000/api/agreement-validity/');
      if (response.ok) {
        const result = await response.json();
        setAgreements(Array.isArray(result.data) ? result.data : []);
      } else {
        console.error('Failed to fetch agreements');
      }
    } catch (error) {
      console.error('Error fetching agreements:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysRemaining = (endDate) => {
    const today = new Date();
    const end = new Date(endDate);
    const timeDiff = end.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  };

  const getStatusBadge = (status, daysRemaining) => {
    if (status === 'Expired' || daysRemaining < 0) {
      return { bg: 'bg-red-100', text: 'text-red-800', label: 'Expired' };
    } else if (daysRemaining <= 30) {
      return { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Expiring Soon' };
    } else if (daysRemaining <= 90) {
      return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Renewal Due' };
    } else {
      return { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Active' };
    }
  };

  const getDaysRemainingText = (days) => {
    if (days < 0) {
      return `Expired ${Math.abs(days)} days ago`;
    } else if (days === 0) {
      return 'Expires today';
    } else {
      return `${days} days remaining`;
    }
  };

  const filteredAndSortedAgreements = agreements
    .filter(agreement => {
      const matchesSearch = agreement.franchiseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agreement.agreementNumber?.toLowerCase().includes(searchTerm.toLowerCase());

      if (statusFilter === 'All') return matchesSearch;

      const daysRemaining = calculateDaysRemaining(agreement.endDate);
      const statusBadge = getStatusBadge(agreement.status, daysRemaining);
      return matchesSearch && statusBadge.label === statusFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'endDate') return new Date(a.endDate) - new Date(b.endDate);
      if (sortBy === 'daysRemaining') {
        const daysA = calculateDaysRemaining(a.endDate);
        const daysB = calculateDaysRemaining(b.endDate);
        return daysA - daysB;
      }
      if (sortBy === 'franchiseName') return a.franchiseName.localeCompare(b.franchiseName);
      return 0;
    });

  const handleRenewal = async (agreementId) => {
    try {
      const response = await fetch(`http://localhost:4000/api/agreement-validity/${agreementId}/renew`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ renewalPeriodYears: 2 })
      });

      if (response.ok) {
        await fetchAgreements();
        alert('Agreement renewed successfully for 2 years!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to renew agreement');
      }
    } catch (error) {
      console.error('Error renewing agreement:', error);
      alert(`Error renewing agreement: ${error.message}`);
    }
  };

  const toggleAutoRenewal = async (agreementId, currentStatus) => {
    try {
      const response = await fetch(`http://localhost:4000/api/agreement-validity/${agreementId}/auto-renewal`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ autoRenewal: !currentStatus })
      });

      if (response.ok) {
        await fetchAgreements();
        alert(`Auto-renewal ${!currentStatus ? 'enabled' : 'disabled'} successfully!`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update auto-renewal');
      }
    } catch (error) {
      console.error('Error updating auto-renewal:', error);
      alert(`Error updating auto-renewal: ${error.message}`);
    }
  };

  const viewAgreementDetails = async (agreementId) => {
    try {
      const response = await fetch(`http://localhost:4000/api/agreement-validity/${agreementId}`);
      if (response.ok) {
        const result = await response.json();
        const agreement = result.data;
        const daysRemaining = calculateDaysRemaining(agreement.endDate);
        alert(`Agreement Details:\n\nFranchise: ${agreement.franchiseName}\nAgreement #: ${agreement.agreementNumber}\nStart Date: ${new Date(agreement.startDate).toLocaleDateString()}\nEnd Date: ${new Date(agreement.endDate).toLocaleDateString()}\nDays Remaining: ${getDaysRemainingText(daysRemaining)}\nAuto Renewal: ${agreement.autoRenewal ? 'Enabled' : 'Disabled'}`);
      } else {
        alert('Error loading agreement details');
      }
    } catch (error) {
      console.error('Error viewing agreement:', error);
      alert('Error loading agreement details');
    }
  };

  const getStatistics = () => {
    const total = agreements.length;
    const active = agreements.filter(a => {
      const days = calculateDaysRemaining(a.endDate);
      return days > 30;
    }).length;
    const expiringSoon = agreements.filter(a => {
      const days = calculateDaysRemaining(a.endDate);
      return days <= 30 && days >= 0;
    }).length;
    const expired = agreements.filter(a => {
      const days = calculateDaysRemaining(a.endDate);
      return days < 0;
    }).length;

    return { total, active, expiringSoon, expired };
  };

  const stats = getStatistics();

  return (
    <div className="flex h-screen bg-gradient-to-br from-amber-50/50 via-yellow-50/50 to-orange-50/50">
      {/* Sidebar */}
      <SuperAdminSidebar
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        activeMenuItem="Agreement Validity"
      />

      {/* Main Content */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarOpen ? 'sm:ml-80 md:ml-72 lg:ml-72' : ''}`}>
        {/* Header */}
        <header className="bg-white/90 backdrop-blur-sm border-b border-amber-200/50 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-amber-900">Agreement Validity Tracker</h1>
                <p className="text-sm text-amber-700/70">Monitor franchise agreement expiration dates and renewals</p>
              </div>
              <div className="flex items-center space-x-4">
                <button className="flex items-center space-x-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors">
                  <FaBell />
                  <span>Notifications</span>
                  {stats.expiringSoon + stats.expired > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                      {stats.expiringSoon + stats.expired}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-amber-200/50 shadow-lg">
                <div className="flex items-center">
                  <FaCertificate className="text-2xl text-blue-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Agreements</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-amber-200/50 shadow-lg">
                <div className="flex items-center">
                  <FaCheckCircle className="text-2xl text-orange-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-amber-200/50 shadow-lg">
                <div className="flex items-center">
                  <FaClock className="text-2xl text-orange-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.expiringSoon}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-amber-200/50 shadow-lg">
                <div className="flex items-center">
                  <FaExclamationTriangle className="text-2xl text-red-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Expired</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.expired}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-amber-200/50 shadow-lg">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by franchise name or agreement number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 w-80"
                    />
                  </div>
                </div>

                <div className="flex space-x-4">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="All">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Renewal Due">Renewal Due</option>
                    <option value="Expiring Soon">Expiring Soon</option>
                    <option value="Expired">Expired</option>
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="endDate">Sort by End Date</option>
                    <option value="daysRemaining">Sort by Days Remaining</option>
                    <option value="franchiseName">Sort by Franchise Name</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Agreements Table */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-amber-200/50 shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-amber-50 to-orange-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Franchise</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agreement #</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Remaining</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auto Renewal</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                          Loading agreements...
                        </td>
                      </tr>
                    ) : (
                      filteredAndSortedAgreements.map((agreement) => {
                        const daysRemaining = calculateDaysRemaining(agreement.endDate);
                        const statusInfo = getStatusBadge(agreement.status, daysRemaining);
                        const renewalRequired = daysRemaining <= 90 || daysRemaining < 0;

                        return (
                          <tr key={agreement._id} className="hover:bg-amber-50/50">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{agreement.franchiseName}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{agreement.agreementNumber || `AGR-${agreement._id.slice(-6)}`}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{new Date(agreement.startDate).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{new Date(agreement.endDate).toLocaleDateString()}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.bg} ${statusInfo.text}`}>
                                {statusInfo.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <div className={`font-medium ${daysRemaining < 0 ? 'text-red-600' : daysRemaining <= 30 ? 'text-orange-600' : 'text-orange-600'}`}>
                                {getDaysRemainingText(daysRemaining)}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => toggleAutoRenewal(agreement._id, agreement.autoRenewal)}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${agreement.autoRenewal
                                  ? 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                              >
                                {agreement.autoRenewal ? 'Enabled' : 'Disabled'}
                              </button>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex space-x-2">
                                {renewalRequired && (
                                  <button
                                    onClick={() => handleRenewal(agreement._id)}
                                    className="px-3 py-1 bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-600 transition-colors"
                                  >
                                    Renew
                                  </button>
                                )}
                                <button
                                  onClick={() => viewAgreementDetails(agreement._id)}
                                  className="px-3 py-1 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 text-xs rounded-lg hover:from-amber-200 hover:to-orange-200 border border-amber-300 shadow-sm transition-all duration-200 hover:shadow-md font-medium"
                                >
                                  View
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredAndSortedAgreements.length === 0 && (
              <div className="text-center py-12">
                <FaCertificate className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No agreements found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Try adjusting your search or filter criteria.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AgreementValidity;