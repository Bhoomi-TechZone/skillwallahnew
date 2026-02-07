import React, { useState, useEffect } from 'react';
import { useNotifications, formatNotificationDate, getNotificationIcon, getNotificationColor } from '../../hooks/useNotifications';

const StudentNotifications = () => {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    error, 
    markAsRead, 
    markAllAsRead, 
    refresh 
  } = useNotifications(true, 30000); // Auto-refresh every 30 seconds

  const [filter, setFilter] = useState('all');
  const [showTestPanel, setShowTestPanel] = useState(false);

  // Filter notifications based on selected filter
  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read;
      case 'read':
        return notification.read;
      case 'assignments':
        return notification.type === 'assignment' || notification.type === 'reminder';
      case 'grades':
        return notification.type === 'grade' || notification.type === 'completion';
      case 'announcements':
        return notification.type === 'announcement' || notification.type === 'system';
      default:
        return true;
    }
  });

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification._id);
    }
    
    // Handle action URL if available
    if (notification.metadata?.action_url) {
      window.open(notification.metadata.action_url, '_blank');
    }
  };

  const getNotificationTypeInfo = (type) => {
    const types = {
      assignment: { label: 'Assignment', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
      grade: { label: 'Grade', bgColor: 'bg-orange-100', textColor: 'text-orange-800' },
      course: { label: 'Course', bgColor: 'bg-purple-100', textColor: 'text-purple-800' },
      quiz: { label: 'Quiz', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
      live_session: { label: 'Live Session', bgColor: 'bg-red-100', textColor: 'text-red-800' },
      announcement: { label: 'Announcement', bgColor: 'bg-indigo-100', textColor: 'text-indigo-800' },
      reminder: { label: 'Reminder', bgColor: 'bg-orange-100', textColor: 'text-orange-800' },
      welcome: { label: 'Welcome', bgColor: 'bg-pink-100', textColor: 'text-pink-800' },
      completion: { label: 'Completion', bgColor: 'bg-emerald-100', textColor: 'text-emerald-800' },
      alert: { label: 'Alert', bgColor: 'bg-red-100', textColor: 'text-red-800' },
      system: { label: 'System', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
      info: { label: 'Info', bgColor: 'bg-blue-100', textColor: 'text-blue-800' }
    };
    
    return types[type] || { label: 'General', bgColor: 'bg-gray-100', textColor: 'text-gray-800' };
  };

  const NotificationCard = ({ notification }) => {
    const typeInfo = getNotificationTypeInfo(notification.type);
    const isUnread = !notification.read;
    
    return (
      <div 
        className={`p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer ${
          isUnread ? 'bg-blue-50 border-blue-200' : 'bg-white'
        }`}
        onClick={() => handleNotificationClick(notification)}
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <span className="text-2xl" role="img" aria-label={notification.type}>
              {getNotificationIcon(notification.type)}
            </span>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeInfo.bgColor} ${typeInfo.textColor}`}>
                {typeInfo.label}
              </span>
              <span className="text-sm text-gray-500">
                {formatNotificationDate(notification.created_at)}
              </span>
            </div>
            
            <h3 className={`text-sm font-medium ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
              {notification.title}
            </h3>
            
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {notification.message}
            </p>
            
            {notification.metadata?.course_name && (
              <p className="text-xs text-blue-600 mt-2">
                📚 {notification.metadata.course_name}
              </p>
            )}
            
            {notification.metadata?.action_text && (
              <div className="mt-2">
                <span className="text-xs text-blue-600 hover:text-blue-800">
                  {notification.metadata.action_text} →
                </span>
              </div>
            )}
            
            {isUnread && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full"></div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error Loading Notifications
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-3">
                  <button
                    onClick={refresh}
                    className="bg-red-100 px-3 py-1 rounded text-red-800 text-sm hover:bg-red-200"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading notifications...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                You have {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Mark All Read
              </button>
            )}
            <button 
              onClick={refresh}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All', count: notifications.length },
              { id: 'unread', label: 'Unread', count: unreadCount },
              { id: 'assignments', label: 'Assignments', count: filteredNotifications.filter(n => n.type === 'assignment' || n.type === 'reminder').length },
              { id: 'grades', label: 'Grades', count: filteredNotifications.filter(n => n.type === 'grade' || n.type === 'completion').length },
              { id: 'announcements', label: 'Announcements', count: filteredNotifications.filter(n => n.type === 'announcement' || n.type === 'system').length }
            ].map(filterOption => (
              <button
                key={filterOption.id}
                onClick={() => setFilter(filterOption.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === filterOption.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {filterOption.label} ({filterOption.count})
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <NotificationCard key={notification._id} notification={notification} />
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-lg">
              <div className="text-6xl mb-4">🔔</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications found</h3>
              <p className="text-gray-600">
                {filter === 'unread' 
                  ? "You're all caught up! No unread notifications."
                  : "No notifications match your current filter."
                }
              </p>
            </div>
          )}
        </div>

        {/* Notification Settings Info */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Notification Preferences</h3>
          <p className="text-sm text-gray-600 mb-4">
            You can customize which notifications you receive and how you receive them in your settings.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Email Notifications</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• New assignments and quizzes</li>
                <li>• Grade updates</li>
                <li>• Live session reminders</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">In-App Notifications</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Course updates</li>
                <li>• Achievement unlocks</li>
                <li>• System announcements</li>
              </ul>
            </div>
          </div>
          <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Manage Preferences
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentNotifications;
