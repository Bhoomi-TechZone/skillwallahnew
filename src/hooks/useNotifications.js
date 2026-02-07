import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '../services/notificationService.js';

// Custom hook for managing notifications
export const useNotifications = (autoRefresh = true, refreshInterval = 30000) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async (skip = 0, limit = 50) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await notificationService.getUserNotifications(skip, limit);
      setNotifications(data);
      
      // Calculate unread count
      const unread = data.filter(notif => !notif.is_read).length;
      setUnreadCount(unread);
      
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await notificationService.markNotificationAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId || notif._id === notificationId
            ? { ...notif, is_read: true, read_at: new Date().toISOString() }
            : notif
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
      
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationAPI.markAllAsRead();
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
      
      setUnreadCount(0);
      
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  }, []);

  // Refresh notifications
  const refresh = useCallback(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Auto-refresh notifications
  useEffect(() => {
    fetchNotifications();
    
    if (autoRefresh) {
      const interval = setInterval(fetchNotifications, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchNotifications, autoRefresh, refreshInterval]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refresh,
    fetchNotifications
  };
};

// Hook for admin notifications
export const useAdminNotifications = (autoRefresh = true, refreshInterval = 60000) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch admin notifications
  const fetchNotifications = useCallback(async (skip = 0, limit = 50) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await notificationAPI.getAdminNotifications(skip, limit);
      setNotifications(data);
      
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch admin notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create admin notification
  const createNotification = useCallback(async (notificationData) => {
    try {
      setLoading(true);
      const result = await notificationAPI.createAdminNotification(notificationData);
      
      // Refresh the list
      await fetchNotifications();
      
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchNotifications]);

  // Auto-refresh
  useEffect(() => {
    fetchNotifications();
    
    if (autoRefresh) {
      const interval = setInterval(fetchNotifications, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchNotifications, autoRefresh, refreshInterval]);

  return {
    notifications,
    loading,
    error,
    createNotification,
    refresh: fetchNotifications,
    fetchNotifications
  };
};

// Hook for notification testing
export const useNotificationTesting = () => {
  const [testResults, setTestResults] = useState([]);
  const [testing, setTesting] = useState(false);

  const runTests = useCallback(async () => {
    setTesting(true);
    setTestResults([]);
    
    const tests = [
      {
        name: 'Create Sample Notifications',
        test: () => notificationAPI.createSampleNotifications()
      },
      {
        name: 'Test Email Functionality',
        test: () => notificationAPI.testEmail()
      },
      {
        name: 'Send Welcome Email',
        test: () => notificationAPI.sendWelcomeEmail({
          name: 'Test User',
          email: 'test@example.com'
        })
      }
    ];

    for (const test of tests) {
      try {
        const result = await test.test();
        setTestResults(prev => [...prev, {
          name: test.name,
          success: true,
          result
        }]);
      } catch (error) {
        setTestResults(prev => [...prev, {
          name: test.name,
          success: false,
          error: error.message
        }]);
      }
    }
    
    setTesting(false);
  }, []);

  return {
    testResults,
    testing,
    runTests
  };
};

// Utility functions for formatting notifications
export const formatNotificationDate = (dateString) => {
  if (!dateString) return 'Not set';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
};

export const getNotificationIcon = (type) => {
  const icons = {
    announcement: '📢',
    reminder: '⏰',
    alert: '⚠️',
    welcome: '👋',
    course_update: '📚',
    system: '⚙️'
  };
  return icons[type] || '📬';
};

export const getNotificationColor = (priority) => {
  const colors = {
    low: '#6B7280',
    medium: '#3B82F6',
    high: '#F59E0B',
    critical: '#EF4444'
  };
  return colors[priority] || colors.medium;
};

export const getPriorityLabel = (priority) => {
  const labels = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical'
  };
  return labels[priority] || 'Medium';
};

export const getStatusColor = (status) => {
  const colors = {
    draft: '#6B7280',
    scheduled: '#F59E0B',
    sent: '#10B981',
    failed: '#EF4444'
  };
  return colors[status] || colors.draft;
};

// Export utility functions for backward compatibility
export {
  formatNotificationDate as formatDate,
  getNotificationIcon as getIcon,
  getNotificationColor as getColor
};
