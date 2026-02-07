import React, { useState, useEffect } from 'react';
import { 
  FaUsers, 
  FaChartLine, 
  FaDollarSign, 
  FaGraduationCap, 
  FaArrowUp, 
  FaArrowDown,
  FaEye,
  FaDownload,
  FaChartBar
} from 'react-icons/fa';
import { MdAnalytics, MdInsights, MdTrendingUp } from 'react-icons/md';

const AdminDashboardAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState({
    userStats: {
      totalUsers: 0,
      newUsers: 0,
      activeUsers: 0,
      userGrowth: 0
    },
    revenueStats: {
      totalRevenue: 0,
      monthlyRevenue: 0,
      revenueGrowth: 0
    },
    courseStats: {
      totalCourses: 0,
      activeCourses: 0,
      completionRate: 0
    },
    enrollmentStats: {
      totalEnrollments: 0,
      monthlyEnrollments: 0,
      enrollmentGrowth: 0
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/analytics', {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-amber-50/30">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent mb-2">
                Analytics Dashboard
              </h1>
              <p className="text-slate-600">Comprehensive platform analytics and insights</p>
            </div>
            <div className="flex gap-3">
              <button className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl">
                <FaDownload /> Export Report
              </button>
              <button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl">
                <MdInsights /> Detailed View
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Users</p>
                <p className="text-3xl font-bold">
                  {loading ? '...' : analyticsData.userStats.totalUsers.toLocaleString()}
                </p>
                {analyticsData.userStats.userGrowth !== undefined && (
                  <div className="flex items-center mt-2">
                    {analyticsData.userStats.userGrowth >= 0 ? (
                      <FaArrowUp className="text-emerald-300 text-sm mr-1" />
                    ) : (
                      <FaArrowDown className="text-red-300 text-sm mr-1" />
                    )}
                    <span className="text-blue-200 text-sm font-medium">
                      {Math.abs(analyticsData.userStats.userGrowth)}% vs last month
                    </span>
                  </div>
                )}
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <FaUsers className="text-2xl" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-orange-500 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Monthly Revenue</p>
                <p className="text-3xl font-bold">
                  ₹{loading ? '...' : analyticsData.revenueStats.monthlyRevenue.toLocaleString()}
                </p>
                {analyticsData.revenueStats.revenueGrowth !== undefined && (
                  <div className="flex items-center mt-2">
                    {analyticsData.revenueStats.revenueGrowth >= 0 ? (
                      <FaArrowUp className="text-emerald-200 text-sm mr-1" />
                    ) : (
                      <FaArrowDown className="text-red-300 text-sm mr-1" />
                    )}
                    <span className="text-emerald-200 text-sm font-medium">
                      {Math.abs(analyticsData.revenueStats.revenueGrowth)}% vs last month
                    </span>
                  </div>
                )}
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <FaDollarSign className="text-2xl" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-medium">Active Courses</p>
                <p className="text-3xl font-bold">
                  {loading ? '...' : analyticsData.courseStats.activeCourses.toLocaleString()}
                </p>
                <p className="text-amber-200 text-xs mt-1">
                  {analyticsData.courseStats.completionRate}% completion rate
                </p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <FaGraduationCap className="text-2xl" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Monthly Enrollments</p>
                <p className="text-3xl font-bold">
                  {loading ? '...' : analyticsData.enrollmentStats.monthlyEnrollments.toLocaleString()}
                </p>
                {analyticsData.enrollmentStats.enrollmentGrowth !== undefined && (
                  <div className="flex items-center mt-2">
                    {analyticsData.enrollmentStats.enrollmentGrowth >= 0 ? (
                      <FaArrowUp className="text-purple-200 text-sm mr-1" />
                    ) : (
                      <FaArrowDown className="text-red-300 text-sm mr-1" />
                    )}
                    <span className="text-purple-200 text-sm font-medium">
                      {Math.abs(analyticsData.enrollmentStats.enrollmentGrowth)}% vs last month
                    </span>
                  </div>
                )}
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <FaChartLine className="text-2xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-2xl shadow-xl border border-amber-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent">User Growth Trend</h3>
              <button className="text-amber-600 hover:text-amber-700 text-sm font-medium">View Details</button>
            </div>
            <div className="h-80 flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200">
              <div className="text-center">
                <MdTrendingUp className="text-4xl text-amber-400 mx-auto mb-3" />
                <p className="text-amber-600 font-medium">User Growth Chart</p>
                <p className="text-amber-500 text-sm">Interactive chart will be displayed here</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl border border-amber-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent">Revenue Analytics</h3>
              <button className="text-amber-600 hover:text-amber-700 text-sm font-medium">View Details</button>
            </div>
            <div className="h-80 flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200">
              <div className="text-center">
                <FaChartBar className="text-4xl text-amber-400 mx-auto mb-3" />
                <p className="text-amber-600 font-medium">Revenue Chart</p>
                <p className="text-amber-500 text-sm">Interactive chart will be displayed here</p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-xl border border-amber-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent">Top Performing Courses</h3>
              <button className="text-amber-600 hover:text-amber-700 text-sm font-medium">View All</button>
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="flex items-center">
                    <div className="h-10 w-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                      {item}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-slate-800">Course Title {item}</p>
                      <p className="text-xs text-slate-600">Enrollments: {1000 - (item * 100)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600">₹{(50000 - (item * 5000)).toLocaleString()}</p>
                    <p className="text-xs text-slate-500">Revenue</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-amber-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent">Recent Activity</h3>
              <button className="text-amber-600 hover:text-amber-700 text-sm font-medium">View All</button>
            </div>
            <div className="space-y-4">
              {[
                { action: 'New User Registration', user: 'John Doe', time: '2 minutes ago', type: 'user' },
                { action: 'Course Purchase', user: 'Jane Smith', time: '5 minutes ago', type: 'purchase' },
                { action: 'Assignment Submitted', user: 'Mike Johnson', time: '10 minutes ago', type: 'assignment' },
                { action: 'Live Session Started', user: 'Dr. Wilson', time: '15 minutes ago', type: 'session' },
                { action: 'Course Completed', user: 'Sarah Davis', time: '20 minutes ago', type: 'completion' }
              ].map((activity, index) => (
                <div key={index} className="flex items-center p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="h-8 w-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white">
                    {activity.type === 'user' && <FaUsers className="text-xs" />}
                    {activity.type === 'purchase' && <FaDollarSign className="text-xs" />}
                    {activity.type === 'assignment' && <FaGraduationCap className="text-xs" />}
                    {activity.type === 'session' && <FaChartLine className="text-xs" />}
                    {activity.type === 'completion' && <FaArrowUp className="text-xs" />}
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-slate-800">{activity.action}</p>
                    <p className="text-xs text-slate-600">{activity.user} • {activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardAnalytics;