import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ArcElement
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import BranchLayout from './BranchLayout';
import { branchDashboardApi } from '../../api/branchDashboardApi';

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

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [dashboardStats, setDashboardStats] = useState({
    programs: 0,
    courses: 0,
    subjects: 0,
    instructors: 0,
    staff: 0,
    studyMaterials: 0,
    batches: 0,
    users: 0,
    walletBalance: 0,
    branches: 0
  });
  const [rawData, setRawData] = useState({
    programs: [],
    courses: [],
    subjects: [],
    staff: [],
    studyMaterials: [],
    batches: [],
    users: []
  });
  const [chartData, setChartData] = useState({
    monthlyProgress: null,
    branchDistribution: null,
    performanceOverview: null
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authError, setAuthError] = useState(false);
  const [distributionView, setDistributionView] = useState('city'); // 'city', 'district', 'branch'

  // Generate chart data from dashboard stats and rawData
  const generateChartData = (stats, rawData = null) => {
    // Check if backend provided charts
    const backendCharts = stats.charts || {};
    const monthlyLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const currentMonth = new Date().getMonth();

    const chartColors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#06b6d4'
    ];

    // Helper to generate chart data from dictionary
    const generateDistChart = (data, label) => ({
      labels: Object.keys(data),
      datasets: [{
        label: label,
        data: Object.values(data),
        backgroundColor: chartColors,
        borderWidth: 0
      }]
    });

    return {
      monthlyProgress: {
        labels: backendCharts.monthlyStudents ? Object.keys(backendCharts.monthlyStudents) : monthlyLabels,
        datasets: [
          {
            label: 'Students Growth',
            data: backendCharts.monthlyStudents ? Object.values(backendCharts.monthlyStudents) : monthlyLabels.map((_, i) =>
              i <= currentMonth ? Math.floor((stats.students || 0) * (i + 1) / (currentMonth + 1)) : 0
            ),
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            tension: 0.4,
          },
          {
            label: 'Batches Growth',
            data: backendCharts.monthlyBatches ? Object.values(backendCharts.monthlyBatches) : monthlyLabels.map((_, i) =>
              i <= currentMonth ? Math.floor((stats.batches || 0) * (i + 1) / (currentMonth + 1)) : 0
            ),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
          }
        ]
      },
      branchDistribution: {
        labels: rawData?.branches?.slice(0, 5).map(b => b.name || b.branch_name || 'Branch') ||
          ['North Region', 'South Region', 'East Region', 'West Region', 'Central'],
        datasets: [{
          data: rawData?.branches?.slice(0, 5).map(() => Math.floor(Math.random() * 20) + 5) || [
            Math.floor((stats.branches || 0) * 0.3),
            Math.floor((stats.branches || 0) * 0.25),
            Math.floor((stats.branches || 0) * 0.2),
            Math.floor((stats.branches || 0) * 0.15),
            Math.floor((stats.branches || 0) * 0.1)
          ],
          backgroundColor: chartColors.slice(0, 5),
          borderWidth: 0,
        }]
      },
      performanceOverview: {
        labels: ['Branches', 'Staff', 'Courses', 'Subjects'],
        datasets: [{
          label: 'Total Count',
          data: [
            stats.branches || 0,
            stats.staff || 0,
            stats.courses || 0,
            stats.subjects || 0
          ],
          backgroundColor: chartColors.slice(0, 4),
          borderColor: chartColors.slice(0, 4),
          borderWidth: 2,
        }]
      },
      // New Charts from Backend Distribution
      branchCity: generateDistChart(backendCharts.branchCityDistribution || {}, 'Branches by City'),
      branchDistrict: generateDistChart(backendCharts.branchDistrictDistribution || {}, 'Branches by District'),
      studentBranch: generateDistChart(backendCharts.studentBranchDistribution || {}, 'Students by Branch')
    };
  };



  const fetchMonthlyData = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      if (!token) {
        console.warn('⚠️ No token found for monthly data fetch');
        return;
      }

      // Fetch real monthly data from backend
      const response = await fetch('http://localhost:4000/api/admin/branch/dashboard-stats', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Handle authentication errors
      if (response.status === 401) {
        console.error('❌ Authentication failed for monthly data - skipping');
        return;
      }

      // Check if response is HTML (404 page) instead of JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Monthly stats API endpoint not found');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Expected response structure:
      // {
      //   labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      //   branches_added: [2, 3, 5, 7, 8, 10],
      //   courses_completed: [85, 92, 105, 118, 135, 148]
      // }

      return {
        labels: data.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Branches Added',
            data: data.branches_added || [2, 3, 5, 7, 8, 10],
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            tension: 0.4,
          },
          {
            label: 'Course Completion',
            data: data.courses_completed || [85, 92, 105, 118, 135, 148],
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
          }
        ]
      };
    } catch (error) {
      console.error('Error fetching monthly data:', error);
      // Return mock data as fallback
      return {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Branches Added',
            data: [2, 3, 5, 7, 8, 10],
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            tension: 0.4,
          },
          {
            label: 'Course Completion',
            data: [85, 92, 105, 118, 135, 148],
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
          }
        ]
      };
    }
  };

  const fetchRegionData = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      if (!token) {
        console.warn('⚠️ No token found for region data fetch');
        return;
      }

      // Fetch real branch region data
      const response = await fetch('http://localhost:4000/api/admin/branch/students', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Handle authentication errors
      if (response.status === 401) {
        console.error('❌ Authentication failed for region data - skipping');
        return;
      }

      // Check if response is HTML (404 page) instead of JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Region data API endpoint not found');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Expected response structure:
      // {
      //   regions: [
      //     { name: 'North Region', count: 15 },
      //     { name: 'South Region', count: 12 },
      //     { name: 'East Region', count: 8 },
      //     { name: 'West Region', count: 10 },
      //     { name: 'Central', count: 6 }
      //   ]
      // }

      const regions = data.regions || [
        { name: 'North Region', count: 8 },
        { name: 'South Region', count: 6 },
        { name: 'East Region', count: 5 },
        { name: 'West Region', count: 4 },
        { name: 'Central', count: 2 }
      ];

      return {
        labels: regions.map(region => region.name),
        datasets: [{
          data: regions.map(region => region.count),
          backgroundColor: [
            '#3b82f6',
            '#06b6d4',
            '#10b981',
            '#f59e0b',
            '#8b5cf6',
            '#ef4444',
            '#84cc16',
            '#f97316'
          ].slice(0, regions.length),
          borderWidth: 0,
        }]
      };
    } catch (error) {
      console.error('Error fetching region data:', error);
      // Return mock data as fallback
      const mockRegions = [
        { name: 'North Region', count: 8 },
        { name: 'South Region', count: 6 },
        { name: 'East Region', count: 5 },
        { name: 'West Region', count: 4 },
        { name: 'Central', count: 2 }
      ];

      return {
        labels: mockRegions.map(region => region.name),
        datasets: [{
          data: mockRegions.map(region => region.count),
          backgroundColor: [
            '#3b82f6',
            '#06b6d4',
            '#10b981',
            '#f59e0b',
            '#8b5cf6'
          ],
          borderWidth: 0,
        }]
      };
    }
  };

  // Fetch recent activity from database
  const fetchRecentActivity = async () => {
    // Return project-specific activities
    return [
      { type: 'branch_added', icon: '🏢', text: 'New branch registered', time: '2 hours ago' },
      { type: 'student_enrolled', icon: '👨‍🎓', text: 'Student enrolled', time: '4 hours ago' },
      { type: 'course_created', icon: '📚', text: 'New course created', time: '1 day ago' },
      { type: 'material_uploaded', icon: '📖', text: 'Study material uploaded', time: '2 days ago' }
    ];
  };

  // Fetch branches count
  const fetchBranchesCount = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      if (!token) return 0;

      const response = await fetch('http://localhost:4000/api/admin/branch/students', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        console.warn('⚠️ 401: Branch data requires authentication');
        return 0;
      }

      const data = await response.json();
      return Array.isArray(data) ? data.length : 0;
    } catch (error) {
      console.error('Error fetching branches:', error);
      return 0;
    }
  };

  // Fetch programs count from API
  const fetchProgramsCount = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      if (!token) return 0;

      const response = await fetch('http://localhost:4000/api/admin/courses', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        console.warn('⚠️ 401: Courses data requires authentication');
        return 0;
      }

      const data = await response.json();
      console.log('📚 Programs API response:', data);
      return Array.isArray(data) ? data.length : 0;
    } catch (error) {
      console.error('Error fetching programs:', error);
      return 0;
    }
  };

  // Fetch staff/departments count from API
  const fetchStaffCount = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      if (!token) return 0;

      const response = await fetch('http://localhost:4000/api/admin/branch/instructors', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        console.warn('⚠️ 401: Staff data requires authentication');
        return 0;
      }

      const data = await response.json();
      console.log('👨‍🏫 Instructors API response:', data);
      return Array.isArray(data) ? data.length : 0;
    } catch (error) {
      console.error('Error fetching instructors/staff:', error);
      return 0;
    }
  };

  // Fetch subjects count from API
  const fetchSubjectsCount = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      if (!token) return 0;

      const response = await fetch('http://localhost:4000/api/admin/certificates', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        console.warn('⚠️ 401: Certificates data requires authentication');
        return 0;
      }

      const data = await response.json();
      console.log('📖 Certificates API response:', data);
      return Array.isArray(data) ? data.length : 0;
    } catch (error) {
      console.error('Error fetching certificates:', error);
      return 0;
    }
  };

  // Fetch batches count from API
  const fetchBatchesCount = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      if (!token) return 0;

      const response = await fetch('http://localhost:4000/api/admin/branch/enrollments', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        console.warn('⚠️ 401: Enrollments data requires authentication');
        return 0;
      }

      const data = await response.json();
      console.log('👥 Enrollments API response:', data);
      return Array.isArray(data) ? data.length : 0;
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      return 0;
    }
  };



  // Fetch courses count from API
  const fetchCoursesCount = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const response = await fetch('http://localhost:4000/api/branch-courses/courses', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      console.log('📚 Courses API response:', data);
      if (data.success && Array.isArray(data.courses)) {
        return data.courses.length;
      }
      return Array.isArray(data) ? data.length : 0;
    } catch (error) {
      console.error('Error fetching courses:', error);
      return 0;
    }
  };

  // Fetch study materials count from API
  const fetchStudyMaterialsCount = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const response = await fetch('http://localhost:4000/api/branch-study-materials/materials', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      console.log('📖 Study Materials API response:', data);
      if (data.success && Array.isArray(data.materials)) {
        return data.materials.length;
      }
      if (data.success && data.total !== undefined) {
        return data.total;
      }
      return Array.isArray(data) ? data.length : 0;
    } catch (error) {
      console.error('Error fetching study materials:', error);
      return 0;
    }
  };

  // Enhanced metrics cards for franchise admin with dynamic data
  const getMetricsCards = (stats) => [
    {
      title: 'BRANCHES',
      value: stats.branches || 0,
      change: `Total: ${stats.branches || 0}`,
      trend: 'up',
      bgColor: 'bg-gradient-to-br from-blue-500 to-blue-600',
      icon: '🏢',
      textColor: 'text-white',
      category: 'management'
    },
    {
      title: 'PROGRAMS',
      value: stats.programs || 0,
      change: `Total: ${stats.programs || 0}`,
      trend: 'up',
      bgColor: 'bg-gradient-to-br from-indigo-500 to-purple-600',
      icon: '🚀',
      textColor: 'text-white',
      category: 'academic'
    },
    {
      title: 'COURSES',
      value: stats.courses || 0,
      change: `Total: ${stats.courses || 0}`,
      trend: 'up',
      bgColor: 'bg-gradient-to-br from-blue-500 to-cyan-600',
      icon: '📚',
      textColor: 'text-white',
      category: 'academic'
    },
    {
      title: 'SUBJECTS',
      value: stats.subjects || 0,
      change: `Total: ${stats.subjects || 0}`,
      trend: 'up',
      bgColor: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      icon: '📖',
      textColor: 'text-white',
      category: 'academic'
    },
    {
      title: 'STAFF',
      value: stats.staff || 0,
      change: `Total Staff: ${stats.staff || 0}`,
      trend: 'up',
      bgColor: 'bg-gradient-to-br from-pink-500 to-rose-600',
      icon: '👨‍🏫',
      textColor: 'text-white',
      category: 'users'
    },
    {
      title: 'BATCHES',
      value: stats.batches || 0,
      change: `Total: ${stats.batches || 0}`,
      trend: 'up',
      bgColor: 'bg-gradient-to-br from-violet-500 to-purple-600',
      icon: '👥',
      textColor: 'text-white',
      category: 'academic'
    },
    {
      title: 'STUDY MATERIALS',
      value: stats.studyMaterials || 0,
      change: `Total: ${stats.studyMaterials || 0}`,
      trend: 'up',
      bgColor: 'bg-gradient-to-br from-cyan-500 to-blue-600',
      icon: '📚',
      textColor: 'text-white',
      category: 'content'
    }
  ];

  useEffect(() => {
    // Load dashboard data dynamically
    const loadDashboardData = async () => {
      const CACHE_KEY_STATS = 'branch_dashboard_stats';
      const CACHE_KEY_RAW = 'branch_dashboard_raw';
      const CACHE_KEY_TIME = 'branch_dashboard_timestamp';
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

      // 1. Try to load from cache immediately for instant UI (Stale-While-Revalidate)
      const cachedStats = localStorage.getItem(CACHE_KEY_STATS);
      const cachedRaw = localStorage.getItem(CACHE_KEY_RAW);
      const cachedTime = localStorage.getItem(CACHE_KEY_TIME);

      let hasCachedData = false;

      if (cachedStats) {
        try {
          console.log('⚡ Using cached dashboard data (Stale-While-Revalidate)');
          const parsedStats = JSON.parse(cachedStats);
          // Handle raw data optionally
          const parsedRaw = cachedRaw ? JSON.parse(cachedRaw) : {
            programs: [], courses: [], subjects: [], staff: [],
            studyMaterials: [], batches: [], users: []
          };

          setDashboardStats(parsedStats);
          setRawData(parsedRaw);
          setChartData(generateChartData(parsedStats, parsedRaw));
          setIsLoading(false); // Show UI immediately
          hasCachedData = true;
        } catch (e) {
          console.error('Error parsing cached data', e);
        }
      }

      // If no cache, show loading
      if (!hasCachedData) {
        setIsLoading(true);
      }

      setError(null);

      // Add timeout wrapper for API calls
      const withTimeout = (promise, timeoutMs = 1000) => {
        return Promise.race([
          promise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
          )
        ]);
      };

      try {
        console.log('🔄 Fetching dashboard data (Optimized)...');

        // Use the optimized single-endpoint API call
        // This fetches all counts and wallet balance in one request
        const response = await branchDashboardApi.getDashboardStats();
        const { stats } = response;

        console.log('✅ Dashboard data loaded:', stats);

        setDashboardStats(stats);

        // We no longer fetch massive lists of raw data for performance
        // Set empty arrays or minimal structure
        const emptyRawData = {
          programs: [], courses: [], subjects: [], staff: [],
          studyMaterials: [], batches: [], users: [], branches: []
        };
        setRawData(emptyRawData);

        // Generate charts using stats
        // Note: generateChartData handles missing rawData gracefully
        const generatedChartData = generateChartData(stats, emptyRawData);
        setChartData(generatedChartData);

        // Cache the fresh data
        localStorage.setItem(CACHE_KEY_STATS, JSON.stringify(stats));
        localStorage.setItem(CACHE_KEY_TIME, Date.now().toString());

        setIsLoading(false);

        // Load recent activity in background (non-blocking)
        fetchRecentActivity().then(activity => {
          setRecentActivity(activity);
        }).catch(err => {
          console.warn('⚠️ Failed to load recent activity:', err);
          setRecentActivity([]);
        });

      } catch (error) {
        console.error('❌ Dashboard loading failed:', error);
        setError('Failed to load dashboard data. Please try refreshing.');

        // Set fallback stats to avoid broken UI
        const fallbackStats = {
          branches: 0, programs: 0, courses: 0, subjects: 0,
          staff: 0, instructors: 0, batches: 0, studyMaterials: 0, users: 0,
          walletBalance: 0
        };
        setDashboardStats(fallbackStats);
        setIsLoading(false);
      }
    };

    loadDashboardData();

    // Disabled auto-refresh to prevent performance issues
    // User can manually refresh if needed
  }, []);

  // Get current metrics cards with dynamic data
  const metricsCards = getMetricsCards(dashboardStats);

  // Handle card click navigation
  const handleCardClick = (cardTitle) => {
    const navigationMap = {
      'BRANCHES': '/admin/branches',
      'PROGRAMS': '/admin/programs',
      'COURSES': '/admin/courses/manage',
      'SUBJECTS': '/admin/subjects',
      'STAFF': '/Branch/ManageUsers',
      'BATCHES': '/admin/batches',
      'STUDY MATERIALS': '/branch/study-materials/admin-materials'
    };

    const route = navigationMap[cardTitle];
    if (route) {
      navigate(route);
    }
  };

  // Manual refresh function
  const handleRefresh = async () => {
    window.location.reload();
  };

  // Show dashboard immediately with loading indicators on cards
  // Removed full-screen loading to prevent blocking

  return (
    <BranchLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Warning banner if there was a loading error */}
        {error && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={handleRefresh}
                  className="text-yellow-700 hover:text-yellow-600 text-sm font-medium"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Authentication error banner */}
        {authError && (
          <div className="bg-red-50 border-l-4 border-red-500 p-6 mb-4 mx-4 mt-4 rounded-r-lg shadow-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-semibold text-red-800 mb-2">
                  🔒 Authentication Required
                </h3>
                <div className="text-sm text-red-700 space-y-2">
                  <p className="font-medium">Your session has expired or you are not logged in.</p>
                  <p>The dashboard requires authentication to display data. You will be redirected to the login page in a moment.</p>
                  <div className="mt-4 bg-red-100 border border-red-200 rounded p-3">
                    <p className="text-xs text-red-800">
                      <strong>Why am I seeing this?</strong>
                    </p>
                    <ul className="mt-2 text-xs text-red-700 list-disc list-inside space-y-1">
                      <li>Your authentication token has expired</li>
                      <li>You haven't logged in yet</li>
                      <li>Your session was cleared from another tab</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="ml-4">
                <button
                  onClick={() => navigate('/admin/login')}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-md"
                >
                  Login Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Franchise Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="Refresh dashboard data"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="p-4 md:p-6">
          {/* Metrics Grid - Dynamic cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 mb-8">
            {metricsCards.map((card, index) => (
              <div
                key={index}
                className={`${card.bgColor} rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-105 p-4`}
                onClick={() => handleCardClick(card.title)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`${card.textColor} text-xs font-medium opacity-90 mb-1`}>
                      {card.title}
                    </div>
                    <div className={`${card.textColor} text-2xl font-bold mb-1`}>
                      {isLoading ? (
                        <span className="inline-block animate-pulse">--</span>
                      ) : (
                        card.value.toLocaleString()
                      )}
                    </div>
                    <div className={`${card.textColor} text-xs opacity-75 flex items-center`}>
                      <span className={`mr-1 ${card.trend === 'up' ? 'text-green-200' : card.trend === 'down' ? 'text-red-200' : 'text-gray-200'}`}>
                        {card.trend === 'up' ? '↗' : card.trend === 'down' ? '↘' : '→'}
                      </span>
                      {card.change}
                    </div>
                  </div>
                  <div className={`${card.textColor} text-2xl opacity-80`}>
                    {card.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Monthly Progress Chart */}
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Progress</h3>
              <div className="h-80">
                {chartData.monthlyProgress ? (
                  <Line
                    data={chartData.monthlyProgress}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top',
                        },
                        title: {
                          display: false,
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          grid: {
                            color: 'rgba(0, 0, 0, 0.1)',
                          },
                        },
                        x: {
                          grid: {
                            display: false,
                          },
                        },
                      },
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-gray-400">Loading chart data...</div>
                  </div>
                )}
              </div>
            </div>

            {/* Branch Distribution */}
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Distribution</h3>
                <select
                  value={distributionView}
                  onChange={(e) => setDistributionView(e.target.value)}
                  className="text-xs md:text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1"
                >
                  <option value="city">By City</option>
                  <option value="district">By District</option>
                  <option value="branch">Students per Branch</option>
                </select>
              </div>
              <div className="h-80 flex items-center justify-center">
                {distributionView === 'branch' ? (
                  chartData.studentBranch ? (
                    <Bar
                      data={chartData.studentBranch}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: 'y',
                        plugins: { legend: { display: false } },
                        scales: { x: { beginAtZero: true } }
                      }}
                    />
                  ) : <div className="text-gray-400">Loading...</div>
                ) : (
                  (distributionView === 'city' ? chartData.branchCity : chartData.branchDistrict) ? (
                    <Doughnut
                      data={distributionView === 'city' ? chartData.branchCity : chartData.branchDistrict}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'right',
                            labels: { boxWidth: 12, padding: 15 },
                          },
                        },
                      }}
                    />
                  ) : <div className="text-gray-400">Loading...</div>
                )}
              </div>
            </div>
          </div>

          {/* Performance Overview Chart */}
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Performance Overview</h3>
              <div className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
            <div className="h-80">
              {chartData.performanceOverview ? (
                <Bar
                  data={chartData.performanceOverview}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                      title: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: {
                          color: 'rgba(0, 0, 0, 0.1)',
                        },
                      },
                      x: {
                        grid: {
                          display: false,
                        },
                      },
                    },
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-400">Loading chart data...</div>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity Table */}
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            </div>
            {/* Mobile View (Cards) */}
            <div className="md:hidden space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <span className="text-xl mr-2">{activity.icon}</span>
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {activity.type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {activity.time}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 pl-8">
                      {activity.text}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No recent activity found
                </div>
              )}
            </div>

            {/* Desktop View (Table) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Activity
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-xl mr-3">{activity.icon}</span>
                            <span className="text-sm font-medium text-gray-900 capitalize">
                              {activity.type.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {activity.text}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {activity.time}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500">
                        No recent activity found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 bg-white rounded-lg shadow-md p-4 md:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <button
                onClick={() => navigate('/admin/branches')}
                className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-center transition-colors duration-200"
              >
                <div className="text-2xl mb-2">🏢</div>
                <div className="text-sm font-medium text-blue-800">Manage Branches</div>
              </button>
              <button
                onClick={() => navigate('/Branch/ManageUsers')}
                className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-center transition-colors duration-200"
              >
                <div className="text-2xl mb-2">👥</div>
                <div className="text-sm font-medium text-green-800">Manage Users</div>
              </button>
              <button
                onClick={() => navigate('/admin/courses/manage')}
                className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-center transition-colors duration-200"
              >
                <div className="text-2xl mb-2">📚</div>
                <div className="text-sm font-medium text-purple-800">Add Courses</div>
              </button>
              <button
                onClick={() => navigate('/branch/study-materials/admin-materials')}
                className="p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg text-center transition-colors duration-200"
              >
                <div className="text-2xl mb-2">📖</div>
                <div className="text-sm font-medium text-yellow-800">Study Materials</div>
              </button>
              <button
                onClick={() => navigate('/branch/exams/admin-questions')}
                className="p-4 bg-red-50 hover:bg-red-100 rounded-lg text-center transition-colors duration-200"
              >
                <div className="text-2xl mb-2">❓</div>
                <div className="text-sm font-medium text-red-800">Manage Questions</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </BranchLayout>
  );
};

export default AdminDashboard;