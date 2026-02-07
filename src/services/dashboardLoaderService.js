/**
 * Optimized Dashboard Loader Service
 * 
 * This service provides instant loading for all dashboard types (admin, instructor, student)
 * by serving cached/mock data immediately while fetching real data in the background.
 */

class DashboardLoaderService {
  constructor() {
    this.cache = new Map();
    this.apiCallsInProgress = new Set();
    this.defaultCacheTimeout = 15 * 60 * 1000; // 15 minutes
    this.backgroundFetchDelay = 500; // Delay before starting background fetches
  }

  /**
   * Get cache key for a specific dashboard type and user
   */
  getCacheKey(dashboardType, userId = null) {
    const user = userId || this.getCurrentUserId();
    return `dashboard_${dashboardType}_${user}`;
  }

  /**
   * Get current user ID from localStorage
   */
  getCurrentUserId() {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      return userData._id || userData.id || userData.user_id || 'anonymous';
    } catch {
      return 'anonymous';
    }
  }

  /**
   * Get cached dashboard data if available and fresh
   */
  getCachedData(dashboardType) {
    const cacheKey = this.getCacheKey(dashboardType);
    const cached = this.cache.get(cacheKey);

    if (!cached) {
      // Try sessionStorage as fallback
      try {
        const sessionCached = sessionStorage.getItem(cacheKey);
        if (sessionCached) {
          const parsedCache = JSON.parse(sessionCached);
          const age = Date.now() - parsedCache.timestamp;
          if (age < this.defaultCacheTimeout) {
            console.log(`⚡ Using session cached data for ${dashboardType} (${Math.round(age / 1000)}s old)`);
            return parsedCache.data;
          }
        }
      } catch (e) {
        console.warn('Session cache read error:', e);
      }
      return null;
    }

    const age = Date.now() - cached.timestamp;
    if (age < this.defaultCacheTimeout) {
      console.log(`⚡ Using memory cached data for ${dashboardType} (${Math.round(age / 1000)}s old)`);
      return cached.data;
    }

    // Cache expired
    this.cache.delete(cacheKey);
    return null;
  }

  /**
   * Store data in cache
   */
  setCachedData(dashboardType, data) {
    const cacheKey = this.getCacheKey(dashboardType);
    const cacheEntry = {
      data: data,
      timestamp: Date.now()
    };

    // Store in memory
    this.cache.set(cacheKey, cacheEntry);

    // Store in sessionStorage for persistence across refreshes
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
    } catch (e) {
      console.warn('Failed to store in session storage:', e);
    }
  }

  /**
   * Get mock data for instant loading
   */
  getMockData(dashboardType) {
    const mockData = {
      student: {
        stats: {
          enrolledCourses: 8,
          completedCourses: 3,
          totalPoints: 1250,
          avgProgress: 68,
          hoursLearned: 127,
          rank: 15,
          streak: 7,
          certificatesEarned: 3
        },
        recentCourses: [
          {
            id: 'mock_1',
            title: "React.js Complete Course",
            instructor: "Dr. Jane Smith",
            progress: 75,
            thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=150",
            lastAccessed: new Date().toISOString().split('T')[0],
            nextLesson: "State Management with Redux",
            duration: "2h 30m",
            difficulty: "Intermediate"
          },
          {
            id: 'mock_2',
            title: "JavaScript ES6+ Masterclass",
            instructor: "Prof. Michael Brown",
            progress: 45,
            thumbnail: "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=150",
            lastAccessed: new Date().toISOString().split('T')[0],
            nextLesson: "Async/Await Patterns",
            duration: "3h 15m",
            difficulty: "Advanced"
          }
        ],
        notifications: [
          {
            id: 'mock_notif_1',
            title: "Welcome to your dashboard!",
            message: "Your learning data is being loaded...",
            type: "general",
            read: false,
            timestamp: new Date().toISOString(),
            priority: "medium"
          }
        ]
      },

      instructor: {
        stats: {
          totalCourses: 12,
          totalStudents: 1547,
          avgRating: 4.8,
          totalEarnings: 24500,
          monthlyEarnings: 3200,
          coursesInProgress: 3,
          completedCourses: 9
        },
        recentStudents: [
          {
            id: 'mock_student_1',
            name: "Alex Johnson",
            course: "React Development",
            progress: 85,
            lastActive: "2 hours ago",
            avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
          }
        ],
        courses: [
          {
            id: 'mock_course_1',
            title: "React Development Bootcamp",
            enrolledStudents: 234,
            completionRate: 78,
            avgRating: 4.9,
            totalEarnings: 8900,
            status: "published"
          }
        ]
      },

      admin: {
        stats: {
          total_users: { value: 156, growth: "+12%", trend: "up" },
          total_courses: { value: 89, growth: "+8%", trend: "up" },
          total_instructors: { value: 34, growth: "+15%", trend: "up" },
          total_students: { value: 122, growth: "+18%", trend: "up" },
          revenue: { value: 45600, growth: "+22%", trend: "up" },
          active_students: { value: 89, growth: "+25%", trend: "up" }
        },
        popularInstructors: [
          {
            id: 'mock_instructor_1',
            name: "Dr. Sarah Wilson",
            courses: 8,
            students: 456,
            rating: 4.9,
            avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150"
          }
        ],
        recentTransactions: [
          {
            id: 'mock_transaction_1',
            student: "John Doe",
            course: "Web Development",
            amount: 299,
            date: new Date().toISOString(),
            status: "completed"
          }
        ]
      }
    };

    console.log(`⚡ Serving mock data for ${dashboardType} dashboard`);
    return mockData[dashboardType] || {};
  }

  /**
   * Get authentication headers for API calls
   */
  getAuthHeaders() {
    const token = localStorage.getItem('token') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('studentToken') ||
      localStorage.getItem('instructorToken') ||
      localStorage.getItem('adminToken');

    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  /**
   * Fetch real dashboard data in background
   */
  async fetchRealData(dashboardType, onUpdate) {
    const apiKey = `${dashboardType}_fetch`;

    // Prevent duplicate API calls
    if (this.apiCallsInProgress.has(apiKey)) {
      console.log(`API call already in progress for ${dashboardType}`);
      return;
    }

    this.apiCallsInProgress.add(apiKey);

    try {
      console.log(`🔄 Fetching real data for ${dashboardType} dashboard`);

      let realData = {};
      const headers = this.getAuthHeaders();

      switch (dashboardType) {
        case 'student':
          realData = await this.fetchStudentData(headers);
          break;
        case 'instructor':
          realData = await this.fetchInstructorData(headers);
          break;
        case 'admin':
          realData = await this.fetchAdminData(headers);
          break;
        default:
          console.warn(`Unknown dashboard type: ${dashboardType}`);
          return;
      }

      // Cache the real data
      this.setCachedData(dashboardType, realData);

      // Notify the component with updated data
      if (onUpdate && typeof onUpdate === 'function') {
        onUpdate(realData);
      }

      console.log(`✅ Real data loaded for ${dashboardType} dashboard`);

    } catch (error) {
      console.error(`❌ Failed to fetch real data for ${dashboardType}:`, error);
      // Don't throw error - just log it and continue with cached/mock data
    } finally {
      this.apiCallsInProgress.delete(apiKey);
    }
  }

  /**
   * Fetch student dashboard data
   */
  async fetchStudentData(headers) {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const studentId = userData._id || userData.id || userData.user_id;

    // Fetch enrollments
    let enrolledCourses = [];
    try {
      const enrollmentEndpoints = [
        'http://localhost:4000/enrollment/my-courses',
        'http://localhost:4000/api/enrollment/my-courses'
      ];

      for (const endpoint of enrollmentEndpoints) {
        try {
          const response = await fetch(endpoint, { headers, timeout: 10000 });
          if (response.ok) {
            const data = await response.json();
            enrolledCourses = Array.isArray(data) ? data : (data.courses || data.enrollments || []);
            break;
          }
        } catch (e) {
          continue;
        }
      }
    } catch (error) {
      console.warn('Failed to fetch enrollments:', error);
    }

    // Fetch notifications using notification service
    let notifications = [];
    try {
      console.log('📥 Using notification service for dashboard notifications...');

      // Import and use notificationService
      const { notificationService } = await import('./notificationService.js');
      notifications = await notificationService.getAllNotifications(0, 20);

    } catch (error) {
      console.warn('Failed to fetch notifications:', error);
      notifications = [];
    }

    // Calculate stats
    const completedCourses = enrolledCourses.filter(course =>
      (course.progress || 0) >= 100
    ).length;

    const totalProgress = enrolledCourses.reduce((sum, course) =>
      sum + (course.progress || 0), 0
    );

    const avgProgress = enrolledCourses.length > 0 ?
      Math.round(totalProgress / enrolledCourses.length) : 0;

    return {
      stats: {
        enrolledCourses: enrolledCourses.length,
        completedCourses,
        avgProgress,
        totalPoints: enrolledCourses.reduce((sum, course) => sum + (course.points || 0), 0),
        certificatesEarned: completedCourses,
        hoursLearned: enrolledCourses.reduce((sum, course) => sum + (course.hoursSpent || 0), 0),
        streak: 7, // Would need separate API
        rank: 15 // Would need separate API
      },
      recentCourses: enrolledCourses.slice(0, 3),
      notifications: notifications.filter(n => {
        const type = (n.recipient_type || '').toLowerCase();
        return type === 'student' || type === 'all' || type === '';
      })
    };
  }

  /**
   * Fetch instructor dashboard data
   */
  async fetchInstructorData(headers) {
    let courses = [];
    let students = [];

    try {
      // Get instructor ID from stored user data
      const storedUser = localStorage.getItem('user') || localStorage.getItem('instructorUser');
      let instructorId = null;

      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          instructorId = userData.user_id || userData.id || userData.instructor_id;
          console.log('📋 Retrieved instructor ID for dashboard:', instructorId);
        } catch (e) {
          console.error('❌ Error parsing user data:', e);
        }
      }

      if (!instructorId) {
        console.error('❌ No instructor ID found, cannot fetch courses');
        return {
          stats: {
            totalCourses: 0,
            totalStudents: 0,
            avgRating: 0,
            totalEarnings: 0,
            monthlyEarnings: 0,
            coursesInProgress: 0,
            completedCourses: 0
          },
          recentStudents: [],
          courses: [],
          coursePerformance: []
        };
      }

      // Fetch instructor courses using instructor-specific endpoint
      const courseResponse = await fetch(`http://localhost:4000/instructor/my-courses`, {
        headers,
        timeout: 10000
      });

      if (courseResponse.ok) {
        const courseData = await courseResponse.json();
        // Handle new API response structure
        if (courseData.success && courseData.data) {
          courses = courseData.data.courses || [];
        } else {
          courses = Array.isArray(courseData) ? courseData : (courseData.courses || []);
        }
        console.log(`✅ Fetched ${courses.length} courses for instructor ${instructorId}`);
      }
    } catch (error) {
      console.warn('Failed to fetch instructor courses:', error);
    }

    try {
      // Fetch enrolled students using instructor endpoint
      const studentResponse = await fetch('http://localhost:4000/instructor/students', {
        headers,
        timeout: 10000
      });

      if (studentResponse.ok) {
        const studentData = await studentResponse.json();
        students = Array.isArray(studentData) ? studentData : (studentData.students || []);
        console.log(`✅ Fetched ${students.length} enrolled students`);
      }
    } catch (error) {
      console.warn('Failed to fetch enrolled students:', error);
    }

    // Calculate stats
    const totalEnrolledStudents = courses.reduce((sum, course) =>
      sum + (course.enrolled_students || course.enrolled_count || course.enrolledStudents || 0), 0
    );

    const avgRating = courses.length > 0 ?
      courses.reduce((sum, course) => sum + (course.rating || 0), 0) / courses.length : 0;

    // Transform courses into coursePerformance format for the dashboard
    const coursePerformance = courses.map((course, index) => ({
      id: course.id || course._id || `course-${index}`,
      title: course.title || 'Untitled Course',
      students: course.enrolled_students || course.enrolled_count || course.enrolledStudents || 0,
      rating: course.rating || 0,
      revenue: course.revenue || 0,
      category: course.category || 'General',
      thumbnail: course.thumbnail || course.course_image || course.image || 'https://via.placeholder.com/400x300/667eea/ffffff?text=Course',
      status: course.status || 'active'
    }));

    return {
      stats: {
        totalCourses: courses.length,
        totalStudents: totalEnrolledStudents,
        avgRating: Math.round(avgRating * 10) / 10,
        totalEarnings: courses.reduce((sum, course) => sum + (course.earnings || 0), 0),
        monthlyEarnings: 0, // Would need separate calculation
        coursesInProgress: courses.filter(c => c.status === 'published').length,
        completedCourses: courses.filter(c => c.status === 'completed').length,
        completionRate: 0, // Would need separate calculation
        activeStudents: Math.floor(totalEnrolledStudents * 0.7) // Estimate 70% active
      },
      recentStudents: students.slice(0, 10),
      courses: courses,
      coursePerformance: coursePerformance
    };
  }

  /**
   * Fetch admin dashboard data
   */
  async fetchAdminData(headers) {
    let stats = {};
    let instructors = [];
    let transactions = [];

    try {
      // Fetch admin stats
      const statsResponse = await fetch('http://localhost:4000/api/admin/dashboard/stats', {
        headers,
        timeout: 10000
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        stats = statsData.stats || statsData;
      }
    } catch (error) {
      console.warn('Failed to fetch admin stats:', error);
    }

    try {
      // Fetch instructors
      const instructorResponse = await fetch('http://localhost:4000/api/admin/dashboard/popular-instructors', {
        headers,
        timeout: 10000
      });

      if (instructorResponse.ok) {
        const instructorData = await instructorResponse.json();
        instructors = Array.isArray(instructorData) ? instructorData : (instructorData.instructors || []);
      }
    } catch (error) {
      console.warn('Failed to fetch instructors:', error);
    }

    try {
      // Fetch transactions
      const transactionResponse = await fetch('http://localhost:4000/transaction', {
        headers,
        timeout: 10000
      });

      if (transactionResponse.ok) {
        const transactionData = await transactionResponse.json();
        transactions = Array.isArray(transactionData) ? transactionData : [];
      }
    } catch (error) {
      console.warn('Failed to fetch transactions:', error);
    }

    return {
      stats,
      popularInstructors: instructors.slice(0, 10),
      recentTransactions: transactions.slice(0, 10)
    };
  }

  /**
   * Main method to load dashboard data with instant display
   */
  async loadDashboard(dashboardType, onUpdate) {
    console.log(`⚡ Loading ${dashboardType} dashboard with instant display`);

    // First, check if we have cached data
    let cachedData = this.getCachedData(dashboardType);

    if (cachedData) {
      // Serve cached data immediately
      console.log(`✅ Serving cached data for ${dashboardType} dashboard`);
      if (onUpdate) onUpdate(cachedData);
    } else {
      // Serve mock data immediately for instant display
      const mockData = this.getMockData(dashboardType);
      console.log(`✅ Serving mock data for ${dashboardType} dashboard`);
      if (onUpdate) onUpdate(mockData);
    }

    // Start background fetch after a short delay (non-blocking)
    setTimeout(() => {
      this.fetchRealData(dashboardType, (realData) => {
        console.log(`🔄 Updating ${dashboardType} dashboard with real data`);
        if (onUpdate) onUpdate(realData);
      });
    }, this.backgroundFetchDelay);
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    this.cache.clear();

    // Clear sessionStorage cache
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith('dashboard_')) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.warn('Failed to clear session storage cache:', e);
    }

    console.log('🧹 Dashboard cache cleared');
  }

  /**
   * Preload dashboard data for faster subsequent loads
   */
  async preloadDashboard(dashboardType) {
    console.log(`🚀 Preloading ${dashboardType} dashboard data`);

    // Check if data is already cached
    const cached = this.getCachedData(dashboardType);
    if (cached) {
      console.log(`✅ ${dashboardType} dashboard data already cached`);
      return;
    }

    // Fetch and cache the data
    await this.fetchRealData(dashboardType, (data) => {
      console.log(`✅ ${dashboardType} dashboard data preloaded and cached`);
    });
  }
}

// Export singleton instance
const dashboardLoaderService = new DashboardLoaderService();
export default dashboardLoaderService;