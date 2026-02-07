import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  ArrowTrendingUpIcon as TrendingUpIcon, 
  UsersIcon, 
  CurrencyDollarIcon,
  EyeIcon,
  StarIcon,
  ClockIcon,
  GlobeAltIcon as GlobeIcon,
  DevicePhoneMobileIcon as DeviceMobileIcon,
  ComputerDesktopIcon as DesktopComputerIcon,
  CalendarIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';

const InstructorAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');

  const mockAnalytics = {
    overview: {
      totalViews: 12450,
      totalEnrollments: 3847,
      totalRevenue: 24650,
      conversionRate: 30.9
    },
    chartData: {
      enrollment: [
        { date: '2024-01-01', enrollments: 45 },
        { date: '2024-01-02', enrollments: 52 },
        { date: '2024-01-03', enrollments: 38 },
        { date: '2024-01-04', enrollments: 61 },
        { date: '2024-01-05', enrollments: 47 },
        { date: '2024-01-06', enrollments: 55 },
        { date: '2024-01-07', enrollments: 42 }
      ],
      revenue: [
        { date: '2024-01-01', revenue: 1250 },
        { date: '2024-01-02', revenue: 1450 },
        { date: '2024-01-03', revenue: 1100 },
        { date: '2024-01-04', revenue: 1800 },
        { date: '2024-01-05', revenue: 1350 },
        { date: '2024-01-06', revenue: 1600 },
        { date: '2024-01-07', revenue: 1200 }
      ]
    },
    topCourses: [
      { id: 1, title: "React.js Complete Course", enrollments: 1247, revenue: 12470, rating: 4.9 },
      { id: 2, title: "JavaScript ES6+ Masterclass", enrollments: 895, revenue: 8950, rating: 4.7 },
      { id: 3, title: "Node.js Backend Development", enrollments: 678, revenue: 6780, rating: 4.8 }
    ],
    demographics: {
      countries: [
        { name: 'United States', percentage: 35 },
        { name: 'India', percentage: 18 },
        { name: 'United Kingdom', percentage: 12 },
        { name: 'Canada', percentage: 8 },
        { name: 'Germany', percentage: 7 },
        { name: 'Others', percentage: 20 }
      ],
      devices: [
        { name: 'Desktop', percentage: 65 },
        { name: 'Mobile', percentage: 28 },
        { name: 'Tablet', percentage: 7 }
      ]
    }
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setAnalyticsData(mockAnalytics);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [selectedPeriod]);

  const StatCard = ({ title, value, change, icon: Icon, iconColor, bgColor, prefix = '', suffix = '' }) => (
    <div className="bg-gradient-to-br from-white via-yellow-50 to-amber-50 rounded-2xl p-6 shadow-lg border border-[#988913]/20 hover:shadow-xl transition-all duration-300 hover:border-[#988913]/40 relative overflow-hidden">
      {/* Golden accent corner */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-[#988913]/10 to-transparent rounded-bl-full"></div>
      
      <div className="flex items-center justify-between relative z-10">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mb-2" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
          </p>
          {change && (
            <div className={`flex items-center text-sm ${change > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {change > 0 ? <ArrowUpIcon className="w-4 h-4 mr-1" /> : <ArrowDownIcon className="w-4 h-4 mr-1" />}
              <span className="font-medium">{Math.abs(change)}%</span>
              <span className="text-gray-500 ml-1">vs last period</span>
            </div>
          )}
        </div>
        <div className="w-14 h-14 bg-gradient-to-br from-[#988913] to-[#887a11] rounded-xl flex items-center justify-center shadow-md">
          <Icon className="w-7 h-7 text-white drop-shadow-sm" />
        </div>
      </div>
      
      {/* Subtle golden glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#988913]/0 to-[#988913]/5 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
    </div>
  );

  const ChartCard = ({ title, children, className = "" }) => (
    <div className={`bg-gradient-to-br from-white via-yellow-50 to-amber-50 rounded-2xl p-6 shadow-lg border border-[#988913]/20 hover:shadow-xl transition-all duration-300 relative overflow-hidden ${className}`}>
      {/* Golden accent corner */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-[#988913]/10 to-transparent rounded-bl-full"></div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-4 relative z-10" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>{title}</h3>
      <div className="relative z-10">{children}</div>
    </div>
  );

  const SimpleBarChart = ({ data, dataKey, color = "golden" }) => (
    <div className="space-y-3">
      {data.slice(0, 7).map((item, index) => (
        <div key={index} className="flex items-center justify-between">
          <span className="text-sm text-gray-600">{item.date}</span>
          <div className="flex items-center space-x-3 flex-1 ml-4">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="h-2 rounded-full transition-all duration-500 bg-gradient-to-r from-[#988913] to-[#887a11]"
                style={{ width: `${(item[dataKey] / Math.max(...data.map(d => d[dataKey]))) * 100}%` }}
              ></div>
            </div>
            <span className="text-sm font-medium text-gray-900 w-12 text-right">
              {dataKey === 'revenue' ? `$${item[dataKey]}` : item[dataKey]}
            </span>
          </div>
        </div>
      ))}
    </div>
  );

  const ProgressRing = ({ percentage, size = 120, strokeWidth = 8, color = "blue" }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = `${circumference} ${circumference}`;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-gray-200"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className={`text-${color}-500 transition-all duration-1000 ease-out`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{percentage}%</span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 text-lg">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Enhanced Header with Golden Theme */}
      <div className="bg-gradient-to-r from-white via-yellow-50 to-amber-50 rounded-2xl p-6 shadow-lg border border-[#988913]/20 relative overflow-hidden">
        {/* Golden accent background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#988913]/10 to-transparent rounded-bl-full"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-[#988913]/10 to-transparent rounded-tr-full"></div>
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#988913] to-[#887a11] bg-clip-text text-transparent" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              Analytics Dashboard
            </h1>
            <div className="flex items-center mt-1">
              <div className="w-8 h-0.5 bg-gradient-to-r from-[#988913] to-transparent rounded"></div>
              <p className="text-gray-600 ml-2">Track your course performance and student engagement</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 border border-[#988913]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#988913] focus:border-[#988913] bg-white/70 backdrop-blur-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#988913] to-[#887a11] text-white rounded-xl hover:from-[#887a11] hover:to-[#776a0f] transition-all duration-300 shadow-lg hover:shadow-xl" style={{ boxShadow: '0 4px 15px rgba(152, 137, 19, 0.3)' }}>
              <CalendarIcon className="w-5 h-5" />
              <span>Export Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Views"
          value={analyticsData.overview.totalViews}
          change={15.2}
          icon={EyeIcon}
          iconColor="text-blue-600"
          bgColor="bg-blue-100"
        />
        <StatCard
          title="Enrollments"
          value={analyticsData.overview.totalEnrollments}
          change={8.4}
          icon={UsersIcon}
          iconColor="text-orange-600"
          bgColor="bg-orange-100"
        />
        <StatCard
          title="Revenue"
          value={analyticsData.overview.totalRevenue}
          change={12.8}
          icon={CurrencyDollarIcon}
          iconColor="text-yellow-600"
          bgColor="bg-yellow-100"
          prefix="$"
        />
        <StatCard
          title="Conversion Rate"
          value={analyticsData.overview.conversionRate}
          change={2.3}
          icon={TrendingUpIcon}
          iconColor="text-purple-600"
          bgColor="bg-purple-100"
          suffix="%"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollment Trends */}
        <ChartCard title="Enrollment Trends" className="lg:col-span-1">
          <SimpleBarChart 
            data={analyticsData.chartData.enrollment} 
            dataKey="enrollments" 
            color="blue" 
          />
        </ChartCard>

        {/* Revenue Trends */}
        <ChartCard title="Revenue Trends" className="lg:col-span-1">
          <SimpleBarChart 
            data={analyticsData.chartData.revenue} 
            dataKey="revenue" 
            color="orange" 
          />
        </ChartCard>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Courses */}
        <ChartCard title="Top Performing Courses" className="lg:col-span-2">
          <div className="space-y-4">
            {analyticsData.topCourses.map((course, index) => (
              <div key={course.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full text-sm font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{course.title}</h4>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                    <span className="flex items-center">
                      <UsersIcon className="w-4 h-4 mr-1" />
                      {course.enrollments} students
                    </span>
                    <span className="flex items-center">
                      <CurrencyDollarIcon className="w-4 h-4 mr-1" />
                      ${course.revenue.toLocaleString()}
                    </span>
                    <span className="flex items-center">
                      <StarIcon className="w-4 h-4 mr-1 text-yellow-400" />
                      {course.rating}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Completion Rate */}
        <ChartCard title="Overall Completion Rate" className="lg:col-span-1">
          <div className="text-center">
            <ProgressRing percentage={87} color="orange" />
            <div className="mt-4">
              <p className="text-sm text-gray-600">Students completing courses</p>
              <p className="text-xs text-gray-500 mt-1">Industry average: 65%</p>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Demographics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Geographic Distribution */}
        <ChartCard title="Student Demographics - Countries">
          <div className="space-y-3">
            {analyticsData.demographics.countries.map((country, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <GlobeIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">{country.name}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${country.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-8 text-right">{country.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Device Usage */}
        <ChartCard title="Device Usage">
          <div className="space-y-4">
            {analyticsData.demographics.devices.map((device, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center space-x-3">
                  {device.name === 'Desktop' ? (
                    <DesktopComputerIcon className="w-6 h-6 text-blue-500" />
                  ) : device.name === 'Mobile' ? (
                    <DeviceMobileIcon className="w-6 h-6 text-orange-500" />
                  ) : (
                    <div className="w-6 h-6 bg-purple-500 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">T</span>
                    </div>
                  )}
                  <span className="font-medium text-gray-900">{device.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">{device.percentage}%</div>
                  <div className="text-xs text-gray-500">of users</div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Insights and Recommendations */}
      <ChartCard title="Insights & Recommendations">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUpIcon className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-blue-900">Growth Opportunity</h4>
            </div>
            <p className="text-sm text-blue-800">
              Your mobile traffic increased by 23%. Consider optimizing course videos for mobile viewing.
            </p>
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-2">
              <StarIcon className="w-5 h-5 text-orange-600" />
              <h4 className="font-semibold text-orange-900">High Performance</h4>
            </div>
            <p className="text-sm text-orange-800">
              Your completion rate is 22% above average. Students love your engaging content!
            </p>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-2">
              <ClockIcon className="w-5 h-5 text-yellow-600" />
              <h4 className="font-semibold text-yellow-900">Optimization Tip</h4>
            </div>
            <p className="text-sm text-yellow-800">
              Peak enrollment time is 7-9 PM. Schedule your live sessions during this window.
            </p>
          </div>
        </div>
      </ChartCard>
    </div>
  );
};

export default InstructorAnalytics;
