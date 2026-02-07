import React, { useState, useEffect } from 'react';
import {
  FaUsers,
  FaUserShield,
  FaUserTie,
  FaUserGraduate,
  FaBook,
  FaDollarSign,
  FaChartLine,
  FaGlobe,
  FaBars,
  FaTachometerAlt,
  FaStore,
  FaMoneyCheckAlt,
  FaClipboardList,
  FaCrown,
  FaGraduationCap
} from 'react-icons/fa';
import { MdDashboard, MdSchool, MdBusiness, MdAttachMoney } from 'react-icons/md';
import SuperAdminSidebar from './SuperAdminSidebar';
import { useNavigate } from 'react-router-dom';
import { superAdminProfileApi } from '../../api/superAdminApi';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  // Initialize based on screen width
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Dashboard state - initialized with zeroes (no static/dummy data)
  const [dashboardStats, setDashboardStats] = useState({
    totalFranchises: 0,
    activeFranchises: 0,
    pendingFranchises: 0,
    rejectedFranchises: 0,
    totalFranchiseAdmins: 0,
    totalEnquiries: 0,
    franchiseEnquiries: 0,
    pendingEnquiries: 0,
    resolvedEnquiries: 0,
    totalRevenue: 0,
    pendingSettlements: 0,
    monthlyRevenue: 0,
    totalAgreements: 0,
    pendingAgreements: 0,
    expiringSoonAgreements: 0,
    expiredAgreements: 0,
    renewalDueAgreements: 0,
    activeAgreements: 0
  });

  const [superAdminProfile, setSuperAdminProfile] = useState({
    name: '',
    email: '',
    role: '',
    access_level: '',
    avatar: null,
    joined_date: null
  });

  const [recentActivities, setRecentActivities] = useState([]);
  const [quickActions] = useState([
    // === TOP 4 MOST IMPORTANT QUICK ACTIONS ===
    {
      title: 'Generate Agreement',
      description: 'Create new franchise agreements',
      icon: FaStore,
      path: '/superadmin/franchise-agreements/generate',
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Financial Dashboard',
      description: 'Monitor ledger and settlements',
      icon: FaDollarSign,
      path: '/superadmin/ledger/dashboard',
      color: 'from-yellow-500 to-yellow-600'
    },
    {
      title: 'All Enquiries',
      description: 'Handle all system enquiries',
      icon: FaClipboardList,
      path: '/superadmin/system/all-enquiries',
      color: 'from-indigo-500 to-indigo-600'
    }
  ]);

  // Handle screen resize to auto-adjust sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // TOKEN PROTECTION: Initialize dashboard with token preservation
    const initializeDashboard = async () => {
      // Check token integrity first
      const token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('adminToken');
      const isAuthenticated = localStorage.getItem('isAuthenticated');

      console.log('🔐 Dashboard initialization - Token check:', {
        hasToken: !!token,
        isAuthenticated: isAuthenticated,
        tokenSources: {
          token: !!localStorage.getItem('token'),
          authToken: !!localStorage.getItem('authToken'),
          adminToken: !!localStorage.getItem('adminToken')
        }
      });

      // If no authentication, redirect immediately
      if (!token && !isAuthenticated) {
        console.log('❌ No authentication found - redirecting to login');
        setLoading(false);
        return;
      }

      // Ensure token persistence
      if (!localStorage.getItem('token') && token) {
        localStorage.setItem('token', token);
        console.log('🔄 Token restored to primary location');
      }

      // Fetch fresh data
      await Promise.all([
        fetchDashboardData(),
        fetchSuperAdminProfile()
      ]);
    };

    initializeDashboard();
  }, []);

  // Add real-time timestamp update
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(timeInterval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('adminToken');

      if (!token) {
        console.warn('⚠️ No authentication found');
        setError('Please login to view dashboard data');
        setLoading(false);
        return;
      }

      console.log('✅ Fetching dashboard stats from backend...');
      const response = await fetch('http://localhost:4000/api/dashboard/super-admin-stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Dashboard data received:', data);

        // Update stats
        setDashboardStats(data);

        // Process recent activities if available
        if (data.recentActivities && Array.isArray(data.recentActivities)) {
          const mapIcon = (iconType) => {
            switch (iconType) {
              case 'user': return FaUserTie;
              case 'store': return FaStore;
              case 'agreement': return FaClipboardList;
              default: return FaChartLine;
            }
          };

          const processedActivities = data.recentActivities.map(activity => ({
            ...activity,
            timestamp: new Date(activity.timestamp),
            icon: mapIcon(activity.icon_type)
          }));
          setRecentActivities(processedActivities);
        }

        setError(null);
      } else {
        throw new Error('Failed to fetch dashboard data');
      }

    } catch (error) {
      console.error('❌ FETCH DASHBOARD DATA ERROR:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuperAdminProfile = async () => {
    try {
      const profileData = await superAdminProfileApi.getProfile();

      if (profileData) {
        setSuperAdminProfile({
          name: profileData.name || profileData.full_name || '',
          email: profileData.email || '',
          role: profileData.role || '',
          access_level: profileData.access_level || '',
          avatar: profileData.avatar || profileData.profile_picture || null,
          joined_date: profileData.joined_date || profileData.created_at || null
        });
      }
    } catch (error) {
      console.error('[ERROR] Failed to fetch super admin profile:', error);
    }
  };

  const formatCurrency = (amount) => {
    const numAmount = parseFloat(amount) || 0;
    if (numAmount === 0) {
      return '₹0.00';
    }
    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
      }).format(numAmount);
    } catch (error) {
      console.error('Currency formatting error:', error);
      return `₹${numAmount.toLocaleString()}`;
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    return timestamp.toLocaleDateString();
  };

  const StatCard = ({ title, value, icon: Icon, color, change, isLoading }) => (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-gray-600 text-xs sm:text-sm font-medium uppercase tracking-wider truncate">{title}</p>
          {isLoading ? (
            <div className="mt-2 space-y-2">
              <div className="h-6 sm:h-8 bg-gray-200 rounded animate-pulse w-3/4"></div>
              <div className="h-3 sm:h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
            </div>
          ) : (
            <>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2 truncate">{value || '0'}</p>
              {change && (
                <p className={`text-xs sm:text-sm mt-1 ${change >= 0 ? 'text-orange-600' : 'text-red-600'}`}>
                  {change >= 0 ? '+' : ''}{change}% <span className="hidden sm:inline">from last month</span>
                </p>
              )}
            </>
          )}
        </div>
        <div className={`p-3 sm:p-4 rounded-full ${color} ${isLoading ? 'animate-pulse' : ''} ml-3`}>
          <Icon className="text-xl sm:text-2xl text-white" />
        </div>
      </div>
    </div>
  );

  const QuickActionCard = ({ title, description, icon: Icon, path, color }) => {
    const handleClick = () => {
      try {
        navigate(path);
      } catch (error) {
        console.error('Navigation error:', error);
      }
    };

    return (
      <div
        onClick={handleClick}
        className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group h-full flex flex-col active:scale-95"
      >
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-r ${color} flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-200`}>
          <Icon className="text-lg sm:text-xl text-white" />
        </div>
        <h3 className="font-semibold text-gray-900 text-base sm:text-lg mb-1 sm:mb-2">{title}</h3>
        <p className="text-gray-600 text-xs sm:text-sm flex-1">{description}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar */}
      <SuperAdminSidebar
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        closeOnNavigate={window.innerWidth < 1024} // Close on navigation only on mobile
      />

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 w-full flex flex-col h-screen overflow-hidden ${sidebarOpen ? 'lg:ml-72' : ''}`}>
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Toggle Sidebar"
              >
                <FaBars className="text-xl" />
              </button>
              <button
                onClick={() => {
                  setLoading(true);
                  fetchDashboardData();
                  fetchSuperAdminProfile();
                }}
                disabled={loading}
                className="p-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 hidden sm:block"
                title="Refresh Dashboard"
              >
                <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3 truncate">
                  <MdDashboard className="text-primary-600 shrink-0" />
                  <span className="truncate">Super Admin</span>
                </h1>
                <p className="text-gray-600 mt-0.5 text-xs sm:text-sm hidden sm:block truncate">Welcome back! Here's what's happening with your platform.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">{superAdminProfile.name}</p>
                <p className="text-xs text-gray-500">{superAdminProfile.access_level}</p>
                {superAdminProfile.email && (
                  <p className="text-xs text-gray-400 truncate max-w-[150px]">{superAdminProfile.email}</p>
                )}
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center overflow-hidden border border-gray-200">
                {superAdminProfile.avatar ? (
                  <img
                    src={superAdminProfileApi.getAvatarUrl(superAdminProfile.avatar)}
                    alt="Super Admin"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={`w-full h-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center ${superAdminProfile.avatar ? 'hidden' : ''}`}>
                  <FaCrown className="text-white text-xs sm:text-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Content - Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="mt-4 text-gray-600 text-sm sm:text-base">Loading dashboard data...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center px-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <p className="text-red-600 font-medium mb-4">{error}</p>
                <button
                  onClick={() => fetchDashboardData()}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm sm:text-base"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
              {/* Live Status Banner */}
              <div className="bg-gradient-to-r from-orange-500 to-blue-600 rounded-xl shadow-lg p-3 sm:p-4 text-white">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-full animate-pulse shadow-lg"></div>
                    <span className="font-semibold text-sm sm:text-base">Live Dashboard</span>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div className="hidden sm:block text-xs opacity-90">Last Updated</div>
                    <div className="font-semibold font-mono text-sm sm:text-base">{currentTime.toLocaleTimeString()}</div>
                  </div>
                </div>
              </div>

              {/* First Row - Franchise Statistics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6">
                <StatCard
                  title="Total Franchises"
                  value={dashboardStats.totalFranchises?.toLocaleString?.() || '0'}
                  icon={FaStore}
                  color="bg-gradient-to-r from-blue-500 to-blue-600"
                  isLoading={loading}
                />
                <StatCard
                  title="Active Franchises"
                  value={dashboardStats.activeFranchises?.toLocaleString?.() || '0'}
                  icon={FaGlobe}
                  color="bg-gradient-to-r from-green-500 to-green-600"
                  isLoading={loading}
                />
                <StatCard
                  title="Pending Franchises"
                  value={dashboardStats.pendingFranchises?.toLocaleString?.() || '0'}
                  icon={FaClipboardList}
                  color="bg-gradient-to-r from-orange-500 to-orange-600"
                  isLoading={loading}
                />
              </div>

              {/* Second Row - Operations & Analytics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6">
                <StatCard
                  title="Franchise Admins"
                  value={dashboardStats.totalFranchiseAdmins?.toLocaleString?.() || '0'}
                  icon={FaUserTie}
                  color="bg-gradient-to-r from-purple-500 to-purple-600"
                  isLoading={loading}
                />
                <StatCard
                  title="Total Enquiries"
                  value={dashboardStats.totalEnquiries?.toLocaleString?.() || '0'}
                  icon={FaClipboardList}
                  color="bg-gradient-to-r from-teal-500 to-teal-600"
                  isLoading={loading}
                />
                <StatCard
                  title="Pending Settlements"
                  value={dashboardStats.pendingSettlements?.toLocaleString?.() || '0'}
                  icon={FaMoneyCheckAlt}
                  color="bg-gradient-to-r from-red-500 to-red-600"
                  isLoading={loading}
                />
              </div>

              {/* Layout Split: Quick Actions & Recent Activities */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                {/* Quick Actions */}
                <div className="lg:col-span-2 flex flex-col h-full">
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 flex-1 flex flex-col">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-3">
                      <FaTachometerAlt className="text-primary-600" />
                      Quick Actions
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                      {quickActions.map((action, index) => (
                        <QuickActionCard key={index} {...action} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recent Activities */}
                <div className="lg:col-span-1 flex flex-col h-full">
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 flex-1 flex flex-col h-[400px] lg:h-auto">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-3">
                      <FaClipboardList className="text-primary-600" />
                      Recent Activities
                    </h2>
                    <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                      {recentActivities.length > 0 ? (
                        recentActivities.map((activity, index) => (
                          <div key={activity.id || index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border-l-2 border-transparent hover:border-primary-500">
                            <div className={`p-2 rounded-full bg-gray-100 shrink-0`}>
                              {activity.icon ? <activity.icon className="text-sm text-blue-600" /> : <FaChartLine className="text-sm text-gray-600" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 break-words">{activity.message || 'New activity logged'}</p>
                              <p className="text-xs text-gray-500 mt-1">{formatTime(activity.timestamp)}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center py-8">
                          <div className="p-3 bg-gray-100 rounded-full mb-3">
                            <FaClipboardList className="text-gray-400 text-xl" />
                          </div>
                          <p className="text-gray-500 text-sm">No recent activities found</p>
                        </div>
                      )}
                    </div>
                    {recentActivities.length > 0 && (
                      <button className="w-full mt-4 py-2 text-sm text-primary-600 hover:text-primary-700 font-medium hover:bg-primary-50 rounded-lg transition-colors">
                        View All Activity
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;