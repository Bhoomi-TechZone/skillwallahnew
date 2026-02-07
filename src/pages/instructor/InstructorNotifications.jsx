import { useEffect, useState } from 'react';

const InstructorNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filter, setFilter] = useState('all');

  // Authentication utility functions (inline to avoid import issues)
  const getAuthToken = () => {
    const tokenKeys = ['token', 'authToken', 'instructorToken', 'adminToken', 'studentToken'];
    for (const key of tokenKeys) {
      const token = localStorage.getItem(key);
      if (token) return token;
    }
    return null;
  };

  const isTokenExpired = (token) => {
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Date.now() >= payload.exp * 1000;
    } catch (error) {
      return true;
    }
  };

  const isAuthenticated = () => {
    const token = getAuthToken();
    return token && !isTokenExpired(token);
  };

  const clearAuthData = () => {
    const authKeys = ['token', 'authToken', 'instructorToken', 'adminToken', 'studentToken',
      'user', 'userInfo', 'currentUser', 'authUser', 'userData'];
    authKeys.forEach(key => localStorage.removeItem(key));
    console.log('🧹 Authentication data cleared');
  };

  const handleAuthError = (error) => {
    console.error('🚫 Authentication Error:', error);
    clearAuthData();
    alert('Your session has expired. Please login again.');
    window.location.href = '/instructor-login';
  };

  // Enhanced API request function
  const makeAuthenticatedRequest = async (url, options = {}) => {
    const token = getAuthToken();

    if (!token || isTokenExpired(token)) {
      throw new Error('Authentication required');
    }

    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    const requestOptions = {
      method: 'GET',
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, requestOptions);

      if (response.status === 401) {
        handleAuthError(new Error('Unauthorized'));
        return null;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        handleAuthError(error);
        return null;
      }
      throw error;
    }
  };

  // Helper function to format relative time
  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'Unknown time';

    try {
      const notificationDate = new Date(dateString);
      const now = new Date();
      const diffInMs = now - notificationDate;
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      if (diffInMinutes < 1) {
        return 'Just now';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
      } else if (diffInDays < 7) {
        return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
      } else {
        return notificationDate.toLocaleDateString();
      }
    } catch (error) {
      return 'Unknown time';
    }
  };

  // Helper function to map notification types - Updated to match dashboard
  const mapNotificationType = (apiType) => {
    const typeMap = {
      'course_approval': 'approval',
      'course_approved': 'approval',
      'approval': 'approval',
      'course_rejection': 'rejection',
      'course_rejected': 'rejection',
      'rejection': 'rejection',
      'course_enrolled': 'enrollment',
      'enrollment': 'enrollment',
      'assignment_submitted': 'assignment',
      'assignment': 'assignment',
      'review_received': 'review',
      'review': 'review',
      'course_completed': 'completion',
      'completion': 'completion',
      'quiz_completed': 'quiz',
      'quiz': 'quiz',
      'announcement': 'announcement',
      'reminder': 'reminder',
      'welcome': 'welcome',
      'system': 'notification',
      'admin': 'notification',
      'admin_message': 'message',
      'message': 'message',
      // Commission related notifications - Match dashboard
      'commission_update': 'commission',
      'commission': 'commission',
      'commission_updated': 'commission',
      'commission_negotiated': 'commission',
      'commission_changed': 'commission',
      'commission_split_updated': 'commission',
      'earnings_updated': 'commission'
    };

    return typeMap[apiType] || 'notification';
  };

  // Fetch notifications from API using same logic as dashboard
  const fetchNotifications = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      console.log('🔔 Fetching notifications for instructor from backend...');

      // Try multiple notification endpoints
      const notificationEndpoints = [
        'http://localhost:4000/notifications/user',
        'http://localhost:4000/api/notifications/user',
        'http://localhost:4000/notifications',
        'http://localhost:4000/api/notifications'
      ];

      let response = null;
      let workingEndpoint = null;

      for (const endpoint of notificationEndpoints) {
        try {
          console.log(`🔄 Trying notification endpoint: ${endpoint}`);
          response = await makeAuthenticatedRequest(endpoint);
          if (response) {
            workingEndpoint = endpoint;
            console.log(`✅ Successfully fetched from: ${endpoint}`);
            break;
          }
        } catch (endpointError) {
          console.log(`⚠️ Failed to fetch from ${endpoint}:`, endpointError.message);
          continue;
        }
      }

      if (!response) {
        throw new Error('All notification endpoints failed');
      }

      console.log('📥 Raw notification response:', response);

      // Handle direct array response (backend may return array directly)
      if (Array.isArray(response)) {
        const formattedNotifications = response.map(notification => {
          console.log('🔍 Processing individual notification:', notification);

          // Special handling for commission notifications
          if (notification.type === 'commission_update' || notification.type === 'admin_message') {
            console.log('💰 Commission notification detected:', {
              type: notification.type,
              message: notification.message,
              commission_data: notification.commission_data,
              course_data: notification.course_data
            });
          }

          return {
            id: notification.id || notification._id || notification.notification_id,
            title: notification.title || 'Notification',
            message: notification.message || 'You have a new notification',
            time: formatRelativeTime(notification.created_at || notification.sent_date),
            type: mapNotificationType(notification.type),
            isRead: notification.is_read || notification.isRead || notification.read || false,
            course_id: notification.course_id,
            priority: notification.priority || 'medium',
            author: notification.author || 'Admin',
            created_at: notification.created_at || notification.sent_date, // Preserve original timestamp for sorting
            // Preserve commission and course data
            commissionData: notification.commission_data || null,
            courseData: notification.course_data || null,
            rawNotification: notification
          };
        });

        // Sort notifications by creation date (newest first)
        formattedNotifications.sort((a, b) => {
          const dateA = new Date(a.created_at || 0);
          const dateB = new Date(b.created_at || 0);
          return dateB - dateA; // Descending order (newest first)
        });

        console.log(`✅ Retrieved ${formattedNotifications.length} notifications from backend (sorted by date)`);

        // Log timing information for debugging
        formattedNotifications.forEach(notification => {
          console.log('⏰ Notification timing:', {
            title: notification.title,
            created_at: notification.created_at || notification.sent_date,
            formatted_time: notification.time,
            type: notification.type
          });
        });

        setNotifications(formattedNotifications);
        return formattedNotifications;
      }
      // Handle wrapped response format
      else if (response && response.success && Array.isArray(response.data)) {
        const formattedNotifications = response.data.map(notification => {
          console.log('🔍 Processing wrapped notification:', notification);

          // Debug the read status
          const readStatus = notification.is_read || notification.isRead || notification.read || false;

          // Temporary fix: Mark old commission notifications as read by default
          // (notifications older than 1 day)
          const notificationDate = new Date(notification.created_at || notification.sent_date);
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const shouldMarkAsRead = notificationDate < oneDayAgo &&
            (notification.type === 'admin_message' ||
              notification.type === 'commission_update');

          const finalReadStatus = readStatus || shouldMarkAsRead;

          console.log('📖 Read status debug:', {
            id: notification.id || notification._id,
            is_read: notification.is_read,
            isRead: notification.isRead,
            read: notification.read,
            created_at: notification.created_at,
            isOld: notificationDate < oneDayAgo,
            shouldMarkAsRead: shouldMarkAsRead,
            final_isRead: finalReadStatus
          });

          // Special handling for commission notifications
          if (notification.type === 'commission_update' || notification.type === 'admin_message') {
            console.log('💰 Commission notification detected in wrapped format:', {
              type: notification.type,
              message: notification.message,
              commission_data: notification.commission_data,
              course_data: notification.course_data
            });
          }

          return {
            id: notification.id || notification._id || notification.notification_id,
            title: notification.title || 'Notification',
            message: notification.message || 'You have a new notification',
            time: formatRelativeTime(notification.created_at || notification.sent_date),
            type: mapNotificationType(notification.type),
            isRead: finalReadStatus,
            course_id: notification.course_id,
            priority: notification.priority || 'medium',
            author: notification.author || 'Admin',
            created_at: notification.created_at || notification.sent_date, // Preserve original timestamp for sorting
            // Preserve commission and course data
            commissionData: notification.commission_data || null,
            courseData: notification.course_data || null,
            rawNotification: notification
          };
        });

        // Sort notifications by creation date (newest first)
        formattedNotifications.sort((a, b) => {
          const dateA = new Date(a.created_at || 0);
          const dateB = new Date(b.created_at || 0);
          return dateB - dateA; // Descending order (newest first)
        });

        // Debug final notification counts
        const totalCount = formattedNotifications.length;
        const unreadCount = formattedNotifications.filter(n => !n.isRead).length;
        const readCount = formattedNotifications.filter(n => n.isRead).length;

        console.log(`✅ Retrieved ${totalCount} notifications from backend (sorted by date)`);
        console.log(`📊 Final counts - Total: ${totalCount}, Unread: ${unreadCount}, Read: ${readCount}`);
        console.log('📋 Unread notifications:', formattedNotifications.filter(n => !n.isRead).map(n => ({
          id: n.id,
          title: n.title,
          isRead: n.isRead
        })));

        setNotifications(formattedNotifications);
        return formattedNotifications;
      } else {
        console.log('⚠️ No notifications data received from API, showing empty state');
        setNotifications([]);
        return [];
      }
    } catch (error) {
      console.error('❌ Error fetching notifications from backend:', error);
      console.log('📭 Setting empty notifications array');
      setNotifications([]);
      return [];
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  // Get action URL based on notification type
  const getActionUrl = (notification) => {
    const type = notification.type;
    const courseId = notification.course_id;

    switch (type) {
      case 'assignment_submitted':
        return '/assignments';
      case 'course_enrolled':
      case 'course_approval':
      case 'course_rejection':
        return courseId ? `/courses/${courseId}` : '/courses';
      case 'course_completed':
        return '/certificates';
      case 'review_received':
        return courseId ? `/courses/${courseId}/reviews` : '/courses';
      case 'quiz_completed':
        return '/quizzes';
      default:
        return '#';
    }
  };

  // Fetch notifications on component mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'assignment_submitted':
        return '📝';
      case 'course_enrolled':
        return '🎓';
      case 'course_completed':
        return '✅';
      case 'review_received':
        return '⭐';
      case 'quiz_completed':
        return '📊';
      case 'course_approval':
        return '✅';
      case 'course_rejection':
        return '❌';
      case 'announcement':
        return '📢';
      default:
        return '🔔';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'assignment_submitted':
        return 'bg-blue-100 text-blue-700';
      case 'course_enrolled':
        return 'bg-orange-100 text-orange-700';
      case 'course_completed':
        return 'bg-purple-100 text-purple-700';
      case 'review_received':
        return 'bg-yellow-100 text-yellow-700';
      case 'quiz_completed':
        return 'bg-indigo-100 text-indigo-700';
      case 'course_approval':
        return 'bg-emerald-100 text-emerald-700';
      case 'course_rejection':
        return 'bg-red-100 text-red-700';
      case 'announcement':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Function to mark a single notification as read (matches dashboard behavior)
  const markAsRead = async (notificationId) => {
    try {
      console.log('📖 Marking notification as read:', notificationId);

      // Update local state immediately for instant UI feedback
      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );

      console.log('✅ Notification marked as read in UI');

      // Update on server in background
      try {
        const response = await makeAuthenticatedRequest(
          `http://localhost:4000/notifications/mark-read/${notificationId}`,
          { method: 'POST' }
        );

        if (response && response.success) {
          console.log('✅ Notification marked as read on server');
        } else {
          console.warn('⚠️ Server response:', response);
        }
      } catch (apiError) {
        console.error('❌ Error marking notification as read on server:', apiError);
        // UI already updated, so user sees the change even if API fails
      }
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
    }
  };

  // Function to mark all notifications as read (matches dashboard behavior)
  const markAllAsRead = async () => {
    try {
      console.log('� STARTING: Mark all notifications as read');
      console.log('📊 Current notifications state:', notifications);
      console.log('📊 Current notifications count:', notifications.length);

      const unreadNotifications = notifications.filter(n => !n.isRead && !n.read);
      console.log('📊 Unread notifications:', unreadNotifications.length);
      console.log('📊 Unread notifications data:', unreadNotifications);

      if (unreadNotifications.length === 0) {
        console.log('ℹ️ No unread notifications to mark as read');
        return;
      }

      console.log('🔄 Updating UI state immediately...');
      // Update local state immediately for instant UI feedback
      setNotifications(prevNotifications => {
        const updatedNotifications = prevNotifications.map(notification => ({ ...notification, isRead: true }));
        console.log('✅ UI State updated! New state:', updatedNotifications);
        return updatedNotifications;
      });

      console.log('✅ All notifications marked as read in UI');

      // Mark all unread notifications as read via API in background
      console.log('🌐 Starting API calls...');
      try {
        const markReadPromises = unreadNotifications.map(notification =>
          makeAuthenticatedRequest(
            `http://localhost:4000/notifications/mark-read/${notification.id}`,
            { method: 'POST' }
          ).catch(err => {
            console.warn(`⚠️ Failed to mark notification ${notification.id} as read:`, err);
            return null; // Continue with other requests even if one fails
          })
        );

        await Promise.all(markReadPromises);
        console.log('✅ All notifications marked as read on server');
      } catch (apiError) {
        console.error('❌ Error marking notifications as read on server:', apiError);
        // UI already updated, so user sees the change even if API fails
      }
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      console.error('❌ Error stack:', error.stack);
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    const isReadFlag = notification.isRead !== undefined ? notification.isRead : notification.read;
    if (filter === 'unread') return !isReadFlag;
    if (filter === 'read') return isReadFlag;
    return true;
  });

  const unreadCount = notifications.filter(n => {
    const isReadFlag = n.isRead !== undefined ? n.isRead : n.read;
    return !isReadFlag;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-800 bg-clip-text text-transparent">Notifications</h1>
          <p className="text-slate-600 font-medium">Stay updated with your course activities</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={markAllAsRead}
            className="px-6 py-3 text-sm font-semibold border border-slate-300 text-slate-700 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl hover:from-slate-100 hover:to-blue-100 hover:border-slate-400 transition-all duration-300 shadow-sm hover:shadow-md"
          >
            Mark All as Read
          </button>
          <div className="flex items-center space-x-3">
            <span className="text-sm font-semibold text-slate-700">Filter:</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 text-sm font-semibold border border-slate-300 bg-gradient-to-r from-white to-slate-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            >
              <option value="all">All ({notifications.length})</option>
              <option value="unread">Unread ({unreadCount})</option>
              <option value="read">Read ({notifications.length - unreadCount})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notification Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 rounded-2xl p-6 shadow-xl border border-blue-200/50 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-blue-700">Total Notifications</p>
              <p className="text-3xl font-black bg-gradient-to-r from-blue-800 to-indigo-800 bg-clip-text text-transparent">{notifications.length}</p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-2xl text-white">🔔</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 via-orange-50 to-teal-100 rounded-2xl p-6 shadow-xl border border-emerald-200/50 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-emerald-700">Unread</p>
              <p className="text-3xl font-black bg-gradient-to-r from-emerald-800 to-teal-800 bg-clip-text text-transparent">{unreadCount}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <span className="text-xl text-red-600">🔴</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">New Enrollments</p>
              <p className="text-2xl font-bold text-gray-900">
                {notifications.filter(n => n.type === 'course_enrolled').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <span className="text-xl text-orange-600">🎓</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">New Reviews</p>
              <p className="text-2xl font-bold text-gray-900">
                {notifications.filter(n => n.type === 'review_received').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <span className="text-xl text-yellow-600">⭐</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>

        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600">Loading notifications...</span>
            </div>
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-6 hover:bg-gray-50 transition-colors cursor-pointer ${!(notification.isRead !== undefined ? notification.isRead : notification.read) ? 'bg-blue-50' : ''
                  }`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex items-start space-x-4">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getTypeColor(notification.type)}`}>
                    <span className="text-lg">{getIcon(notification.type)}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className={`text-sm font-medium ${!(notification.isRead !== undefined ? notification.isRead : notification.read) ? 'text-gray-900' : 'text-gray-700'}`}>
                          {notification.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(notification.timestamp).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        {!(notification.isRead !== undefined ? notification.isRead : notification.read) && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
              <p className="text-gray-500">
                {filter === 'unread'
                  ? "You're all caught up! No unread notifications."
                  : filter === 'read'
                    ? "No read notifications to show."
                    : "You don't have any notifications yet."
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Email Notifications</h3>
              <p className="text-xs text-gray-500">Receive notifications via email</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Assignment Submissions</h3>
              <p className="text-xs text-gray-500">Get notified when students submit assignments</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">New Enrollments</h3>
              <p className="text-xs text-gray-500">Get notified when new students enroll</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Course Reviews</h3>
              <p className="text-xs text-gray-500">Get notified when students leave reviews</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructorNotifications;
