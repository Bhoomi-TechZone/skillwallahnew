import React, { useState, useEffect } from 'react';
import { 
  CurrencyDollarIcon, 
  ArrowTrendingUpIcon as TrendingUpIcon, 
  ClockIcon, 
  CreditCardIcon,
  ChartBarIcon,
  ArrowDownTrayIcon as DownloadIcon,
  EyeIcon,
  CalendarIcon,
  AdjustmentsHorizontalIcon as FilterIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

const InstructorEarnings = () => {
  const [earningsData, setEarningsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  const mockEarnings = {
    overview: {
      totalEarnings: 24650,
      thisMonth: 3200,
      pendingPayouts: 1450,
      availableBalance: 22150
    },
    transactions: [
      {
        id: 1,
        type: 'course_sale',
        courseName: 'React.js Complete Course',
        amount: 99.99,
        commission: 89.99,
        date: '2024-01-15',
        status: 'completed',
        studentName: 'Alex Johnson'
      },
      {
        id: 2,
        type: 'course_sale',
        courseName: 'JavaScript ES6+ Masterclass',
        amount: 79.99,
        commission: 71.99,
        date: '2024-01-14',
        status: 'completed',
        studentName: 'Sarah Wilson'
      },
      {
        id: 3,
        type: 'course_sale',
        courseName: 'Node.js Backend Development',
        amount: 129.99,
        commission: 116.99,
        date: '2024-01-13',
        status: 'pending',
        studentName: 'Mike Brown'
      },
      {
        id: 4,
        type: 'course_sale',
        courseName: 'Web Development Fundamentals',
        amount: 59.99,
        commission: 53.99,
        date: '2024-01-12',
        status: 'completed',
        studentName: 'Emily Davis'
      },
      {
        id: 5,
        type: 'payout',
        courseName: 'Monthly Payout',
        amount: -2500.00,
        commission: -2500.00,
        date: '2024-01-01',
        status: 'completed',
        studentName: 'Bank Transfer'
      }
    ],
    monthlyEarnings: [
      { month: 'Jan', earnings: 3200 },
      { month: 'Feb', earnings: 2800 },
      { month: 'Mar', earnings: 3600 },
      { month: 'Apr', earnings: 2900 },
      { month: 'May', earnings: 3400 },
      { month: 'Jun', earnings: 3100 },
      { month: 'Jul', earnings: 3700 },
      { month: 'Aug', earnings: 3300 },
      { month: 'Sep', earnings: 3800 },
      { month: 'Oct', earnings: 3500 },
      { month: 'Nov', earnings: 3900 },
      { month: 'Dec', earnings: 4200 }
    ],
    courseEarnings: [
      {
        id: 1,
        title: 'React.js Complete Course',
        totalSales: 1247,
        revenue: 12470,
        commission: 11223,
        avgRating: 4.9
      },
      {
        id: 2,
        title: 'JavaScript ES6+ Masterclass',
        totalSales: 895,
        revenue: 7160,
        commission: 6444,
        avgRating: 4.7
      },
      {
        id: 3,
        title: 'Node.js Backend Development',
        totalSales: 678,
        revenue: 8814,
        commission: 7933,
        avgRating: 4.8
      }
    ]
  };

  useEffect(() => {
    const fetchEarnings = async () => {
      setLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setEarningsData(mockEarnings);
      } catch (error) {
        console.error('Error fetching earnings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEarnings();
  }, [selectedPeriod]);

  const EarningsCard = ({ title, amount, subtitle, icon, iconColor, bgColor, trend }) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-2">{title}</p>
          <p className="text-2xl font-bold text-gray-900">${amount.toLocaleString()}</p>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          )}
          {trend && (
            <p className={`text-sm mt-1 ${trend > 0 ? 'text-orange-600' : 'text-red-600'}`}>
              {trend > 0 ? '+' : ''}{trend}% from last month
            </p>
          )}
        </div>
        <div className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center`}>
          <span className={`text-xl ${iconColor}`}>{icon}</span>
        </div>
      </div>
    </div>
  );

  const TransactionRow = ({ transaction }) => (
    <tr className="border-b border-gray-100">
      <td className="py-4 px-6">
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            transaction.type === 'payout' ? 'bg-blue-100' : 'bg-orange-100'
          }`}>
            <span className={`text-sm ${
              transaction.type === 'payout' ? 'text-blue-600' : 'text-orange-600'
            }`}>
              {transaction.type === 'payout' ? '💸' : '💰'}
            </span>
          </div>
          <div>
            <div className="font-medium text-gray-900">{transaction.courseName}</div>
            <div className="text-sm text-gray-500">{transaction.studentName}</div>
          </div>
        </div>
      </td>
      <td className="py-4 px-6">
        <div className="text-gray-900 font-medium">${Math.abs(transaction.amount)}</div>
        <div className="text-sm text-gray-500">
          Commission: ${Math.abs(transaction.commission)}
        </div>
      </td>
      <td className="py-4 px-6 text-gray-600">
        {new Date(transaction.date).toLocaleDateString()}
      </td>
      <td className="py-4 px-6">
        <span className={`inline-flex px-3 py-1 text-sm rounded-full font-medium ${
          transaction.status === 'completed' 
            ? 'bg-orange-100 text-orange-700' 
            : 'bg-yellow-100 text-yellow-700'
        }`}>
          {transaction.status}
        </span>
      </td>
      <td className="py-4 px-6">
        <button className="text-gray-400 hover:text-gray-600">
          <span className="text-xl">⋯</span>
        </button>
      </td>
    </tr>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading earnings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Earnings Dashboard</h1>
          <p className="text-gray-600">Track your revenue and manage payouts</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            Request Payout
          </button>
        </div>
      </div>

      {/* Earnings Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <EarningsCard
          title="Total Earnings"
          amount={earningsData.overview.totalEarnings}
          subtitle="All time revenue"
          icon="💰"
          iconColor="text-orange-600"
          bgColor="bg-orange-100"
          trend={15.3}
        />
        <EarningsCard
          title="This Month"
          amount={earningsData.overview.thisMonth}
          subtitle="Current month earnings"
          icon="📈"
          iconColor="text-blue-600"
          bgColor="bg-blue-100"
          trend={8.7}
        />
        <EarningsCard
          title="Pending Payouts"
          amount={earningsData.overview.pendingPayouts}
          subtitle="Awaiting transfer"
          icon="⏳"
          iconColor="text-yellow-600"
          bgColor="bg-yellow-100"
        />
        <EarningsCard
          title="Available Balance"
          amount={earningsData.overview.availableBalance}
          subtitle="Ready for payout"
          icon="💳"
          iconColor="text-purple-600"
          bgColor="bg-purple-100"
        />
      </div>

      {/* Charts and Course Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Earnings Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Earnings</h3>
          <div className="h-64 flex items-end space-x-1">
            {earningsData.monthlyEarnings.map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-blue-500 rounded-t"
                  style={{
                    height: `${(data.earnings / 5000) * 100}%`,
                    minHeight: '8px'
                  }}
                ></div>
                <span className="text-xs text-gray-500 mt-2">{data.month}</span>
                <span className="text-xs font-medium text-gray-700">${data.earnings}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Earning Courses */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Earning Courses</h3>
          <div className="space-y-4">
            {earningsData.courseEarnings.map((course, index) => (
              <div key={course.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{course.title}</h4>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <span>{course.totalSales} sales</span>
                      <span className="flex items-center">
                        <span className="text-yellow-400 mr-1">⭐</span>
                        {course.avgRating}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-orange-600">
                      ${course.commission.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      of ${course.revenue.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="mt-3 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full"
                    style={{ width: `${(course.commission / course.revenue) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
          <div className="flex items-center space-x-2">
            <button className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              Export
            </button>
            <button className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600">
              View All
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Transaction</th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Amount</th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Date</th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {earningsData.transactions.map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InstructorEarnings;
