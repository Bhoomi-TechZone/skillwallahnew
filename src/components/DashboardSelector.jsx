import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaDesktop, FaMagic } from 'react-icons/fa';

const DashboardSelector = ({ userRole }) => {
  const dashboardOptions = {
    student: {
      original: {
        path: '/students',
        title: 'Original Student Dashboard',
        description: 'Calendar-focused dashboard with live sessions and course scheduling'
      },
      improved: {
        path: '/students-improved',
        title: 'Improved Student Dashboard',
        description: 'Modern cards-based layout with progress tracking, quick actions, and better course overview'
      }
    },
    instructor: {
      original: {
        path: '/instructor',
        title: 'Original Instructor Dashboard',
        description: 'Calendar and session management focused dashboard'
      },
      improved: {
        path: '/instructor',
        title: 'Improved Instructor Dashboard',
        description: 'Enhanced instructor experience with student analytics, course management, and performance metrics'
      }
    },
    admin: {
      original: {
        path: '/branch/dashboard',
        title: 'Original Admin Dashboard',
        description: 'Basic admin dashboard with system overview'
      },
      improved: {
        path: '/admin-improved',
        title: 'Improved Admin Dashboard',
        description: 'Comprehensive system management with analytics, user management, and system health monitoring'
      }
    }
  };

  const options = dashboardOptions[userRole] || dashboardOptions.student;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Dashboard Experience
          </h1>
          <p className="text-lg text-gray-600">
            Select the dashboard version that best suits your needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Original Dashboard */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white">
              <div className="flex items-center mb-4">
                <FaDesktop className="w-8 h-8 mr-3" />
                <h2 className="text-2xl font-bold">Original Design</h2>
              </div>
              <p className="text-blue-100">
                Classic, calendar-focused interface
              </p>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {options.original.title}
              </h3>
              <p className="text-gray-600 mb-6">
                {options.original.description}
              </p>
              <div className="space-y-2 mb-6">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Calendar-based layout
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Live session management
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Basic navigation
                </div>
              </div>
              <Link
                to={options.original.path}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                Use Original <FaArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>

          {/* Improved Dashboard */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105 ring-2 ring-purple-500">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-6 text-white relative">
              <div className="absolute top-4 right-4">
                <span className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold">
                  RECOMMENDED
                </span>
              </div>
              <div className="flex items-center mb-4">
                <FaMagic className="w-8 h-8 mr-3" />
                <h2 className="text-2xl font-bold">Improved Design</h2>
              </div>
              <p className="text-purple-100">
                Modern, card-based interface with enhanced features
              </p>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {options.improved.title}
              </h3>
              <p className="text-gray-600 mb-6">
                {options.improved.description}
              </p>
              <div className="space-y-2 mb-6">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                  Modern card-based layout
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                  Enhanced statistics & analytics
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                  Better user experience
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                  Quick actions & shortcuts
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                  Progress tracking
                </div>
              </div>
              <Link
                to={options.improved.path}
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-3 px-6 rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center"
              >
                Use Improved <FaArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            You can always switch between dashboard versions from your settings
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardSelector;
