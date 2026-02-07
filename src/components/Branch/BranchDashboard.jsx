import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BranchLayout from './BranchLayout';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { branchDashboardApi } from '../../api/branchDashboardApi';
import authService from '../../services/authService';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const BranchDashboard = () => {
  const navigate = useNavigate();
  const [dashboardStats, setDashboardStats] = useState({
    programs: 0,
    courses: 0,
    subjects: 0,
    studyMaterials: 0,
    students: 0,
    instructors: 0,
    staff: 0,
    batches: 0,
    users: 0,
    walletBalance: 0
  });
  const [rawData, setRawData] = useState({
    programs: [],
    courses: [],
    subjects: [],
    students: [],
    staff: [],
    studyMaterials: [],
    batches: [],
    users: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Generate dynamic chart data from raw data
  const generateChartData = () => {
    const performance = {
      labels: ['Programs', 'Courses', 'Students', 'Staff', 'Materials'],
      datasets: [{
        label: 'Count',
        data: [
          dashboardStats.programs,
          dashboardStats.courses,
          dashboardStats.students,
          dashboardStats.staff,
          dashboardStats.studyMaterials
        ],
        backgroundColor: [
          'rgba(245, 158, 11, 0.9)',
          'rgba(251, 146, 60, 0.85)',
          'rgba(250, 204, 21, 0.85)',
          'rgba(245, 158, 11, 0.85)',
          'rgba(251, 146, 60, 0.75)'
        ],
        borderColor: [
          '#f59e0b',
          '#fb923c',
          '#facc15',
          '#f59e0b',
          '#fb923c'
        ],
        borderWidth: 2,
      }]
    };

    if (dashboardStats.charts) {
      const { monthlyStudents, monthlyBatches, courseDistribution } = dashboardStats.charts;
      const months = [];
      const studentData = [];
      const batchData = [];

      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        months.push(d.toLocaleString('default', { month: 'short' }));
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const key = `${year}-${month}`;
        studentData.push(monthlyStudents?.[key] || 0);
        batchData.push(monthlyBatches?.[key] || 0);
      }

      const monthlyProgress = {
        labels: months,
        datasets: [
          {
            label: 'Students Enrolled',
            data: studentData,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            tension: 0.4,
          },
          {
            label: 'Active Batches',
            data: batchData,
            borderColor: '#fb923c',
            backgroundColor: 'rgba(251, 146, 60, 0.08)',
            tension: 0.4,
          }
        ]
      };

      const distLabels = Object.keys(courseDistribution || {}).slice(0, 5);
      const distData = Object.values(courseDistribution || {}).slice(0, 5);

      const courseDistributionChart = {
        labels: distLabels.length ? distLabels : ['No Data'],
        datasets: [{
          data: distData.length ? distData : [0],
          backgroundColor: [
            '#f59e0b', '#fb923c', '#facc15', '#f97316', '#f59e0b'
          ],
          borderWidth: 0,
        }]
      };

      return { monthlyProgress, courseDistribution: courseDistributionChart, performance };
    }

    const monthlyProgress = {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          label: 'Students Enrolled',
          data: [0,0,0,0,0,0],
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          tension: 0.4,
        }
      ]
    };
    return { monthlyProgress, performance };
  };

  const chartData = generateChartData();

  const metricsCards = [
    { title: 'PROGRAMS', value: dashboardStats.programs || 0, trend: 'up', bgColor: 'bg-gradient-to-br from-orange-400 to-amber-500', icon: '🚀', textColor: 'text-white', category: 'academic' },
    { title: 'COURSES', value: dashboardStats.courses || 0, trend: 'up', bgColor: 'bg-gradient-to-br from-amber-500 to-yellow-400', icon: '📚', textColor: 'text-white', category: 'academic' },
    { title: 'SUBJECTS', value: dashboardStats.subjects || 0, trend: 'up', bgColor: 'bg-gradient-to-br from-amber-400 to-orange-500', icon: '📖', textColor: 'text-white', category: 'content' },
    { title: 'STUDENTS', value: dashboardStats.students || 0, change: `Total: ${dashboardStats.students || 0}`, trend: 'up', bgColor: 'bg-gradient-to-br from-amber-500 to-orange-600', icon: '👨‍🎓', textColor: 'text-white', category: 'users' },
    { title: 'INSTRUCTORS', value: dashboardStats.instructors || 0, change: `Total: ${dashboardStats.instructors || 0}`, trend: 'up', bgColor: 'bg-gradient-to-br from-orange-400 to-amber-500', icon: '👨‍🏫', textColor: 'text-white', category: 'users' },
    { title: 'BATCHES', value: dashboardStats.batches || 0, change: `Total: ${dashboardStats.batches || 0}`, trend: 'up', bgColor: 'bg-gradient-to-br from-amber-400 to-yellow-400', icon: '👥', textColor: 'text-white', category: 'academic' },
    { title: 'STUDY MATERIALS', value: dashboardStats.studyMaterials || 0, trend: 'up', bgColor: 'bg-gradient-to-br from-amber-400 to-orange-400', icon: '📚', textColor: 'text-white', category: 'content' },
    { title: 'WALLET', value: `₹${(dashboardStats.walletBalance || 0).toLocaleString()}`, change: 'Available Balance', trend: 'up', bgColor: 'bg-gradient-to-br from-amber-500 to-orange-500', icon: '💰', textColor: 'text-white', category: 'financial' }
  ];

  useEffect(() => {
    const fetchDashboardStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await branchDashboardApi.getDashboardStats();
        setDashboardStats(result.stats || {});
        setRawData(result.rawData || {});
      } catch (error) {
        setError(error.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardStats();
  }, []);

  const handleCardClick = (cardType) => {
    const normalizedType = cardType.toLowerCase().replace(/\s+/g, '-');
    switch (normalizedType) {
      case 'programs': navigate('/branch/programs'); break;
      case 'courses': navigate('/branch/courses'); break;
      case 'subjects': navigate('/branch/subjects'); break;
      case 'students': navigate('/branch/students'); break;
      case 'staff': navigate('/branch/staff'); break;
      case 'batches': navigate('/branch/batches'); break;
      case 'study-materials': navigate('/branch/study-materials'); break;
      case 'users': navigate('/branch/users'); break;
      default: console.log(`Maps to ${normalizedType}`);
    }
  };

  return (
    <BranchLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
        <div className="p-4 md:p-6"> {/* Slightly reduced padding for mobile */}
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                  Branch Control Panel
                </h1>
                <div className="flex items-center text-sm text-gray-500 mt-2">
                  <span className="mx-2 hidden sm:inline">›</span>
                  <span className="text-indigo-600 font-medium">Dashboard</span>
                </div>
              </div>
              <div className="flex items-center">
                <div className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl border border-indigo-100 shadow-sm">
                  <span className="text-sm text-gray-600">Last Updated:</span>
                  <span className="ml-2 text-sm font-semibold text-indigo-600">
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mb-4"></div>
                <p className="text-lg text-gray-600">Loading dashboard data...</p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center">
                <div className="flex-shrink-0 mb-4 sm:mb-0">
                  <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-red-800">Error loading dashboard</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 sm:mt-0 sm:ml-auto px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Metrics Cards Grid - Stacks 1, 2, or 4 based on screen */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {metricsCards.map((card, index) => (
                  <div
                    key={index}
                    className={`${card.bgColor} rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:scale-105 relative overflow-hidden group`}
                    onClick={() => handleCardClick(card.title)}
                  >
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute -right-4 -top-4 w-16 h-16 bg-white rounded-full"></div>
                      <div className="absolute -right-2 -bottom-2 w-10 h-10 bg-white/50 rounded-full"></div>
                    </div>
                    <div className="relative z-10 p-4">
                      <div className={`text-2xl font-bold ${card.textColor} mb-1 group-hover:scale-110 transition-transform duration-300`}>
                        {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                      </div>
                      <div className={`text-xs font-medium ${card.textColor} opacity-90 uppercase tracking-wider mb-3`}>
                        {card.title}
                      </div>
                      <div className="h-1 bg-white/20 rounded-full overflow-hidden mb-2">
                        <div
                          className="h-full bg-white/60 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${Math.min(((typeof card.value === 'number' ? card.value : 0) / 200) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <div className={`text-xs ${card.textColor} opacity-80 flex items-center justify-between`}>
                        <span>View Details</span>
                        <svg className="w-3 h-3 transform transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Performance Chart - Full width on all screens */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-indigo-100 p-4 md:p-6 mb-8 overflow-hidden">
                <h3 className="text-xl font-bold text-gray-800 mb-6">Performance Overview</h3>
                <div className="h-64 sm:h-80 w-full">
                  <Bar
                    data={chartData.performance}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                        x: { grid: { display: false } }
                      }
                    }}
                  />
                </div>
              </div>

              {/* Bottom Row - Stacks on mobile/tablet */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
                {/* Recent Activity */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-indigo-100 p-6">
                  <div className="flex items-center mb-4">
                    <div className="p-2 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-lg mr-3">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">Recent Activity</h3>
                  </div>
                  <div className="space-y-4">
                    {[
                      { icon: '👨‍🎓', text: 'Student registered', time: '2 min ago', color: 'bg-orange-100 text-orange-600' },
                      { icon: '📚', text: 'New course added', time: '1 hour ago', color: 'bg-amber-100 text-amber-600' },
                      { icon: '📝', text: 'Study material uploaded', time: '3 hours ago', color: 'bg-orange-100 text-orange-600' },
                      { icon: '🎓', text: 'Certificate generated', time: '5 hours ago', color: 'bg-purple-100 text-purple-600' }
                    ].map((activity, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <span className="text-lg">{activity.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{activity.text}</p>
                          <p className="text-xs text-gray-500">{activity.time}</p>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${activity.color.split(' ')[0]} flex-shrink-0`}></div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-indigo-100 p-6">
                  <div className="flex items-center mb-4">
                    <div className="p-2 bg-gradient-to-br from-indigo-400 to-indigo-500 rounded-lg mr-3">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">Quick Actions</h3>
                  </div>
                  <div className="space-y-3">
                    {[
                      { icon: '👨‍🎓', text: 'Manage Students', color: 'from-blue-500 to-blue-600', path: '/branch/students/registration' },
                      { icon: '📚', text: 'Manage Courses', color: 'from-emerald-500 to-emerald-600', path: '/branch/courses/courses' },
                      { icon: '📝', text: 'Study Materials', color: 'from-purple-500 to-purple-600', path: '/branch/study-materials/materials' },
                      { icon: '🎓', text: 'Certificates', color: 'from-amber-500 to-amber-600', path: '/branch/certificates-marksheets' }
                    ].map((action, index) => (
                      <button
                        key={index}
                        onClick={() => navigate(action.path)}
                        className={`w-full flex items-center space-x-3 p-3 bg-gradient-to-r ${action.color} text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200`}
                      >
                        <span className="text-lg flex-shrink-0">{action.icon}</span>
                        <span className="font-medium text-sm sm:text-base">{action.text}</span>
                        <svg className="w-4 h-4 ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </BranchLayout>
  );
};

export default BranchDashboard;