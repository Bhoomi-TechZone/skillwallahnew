import axios from 'axios';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dashboardLoaderService from '../../services/dashboardLoaderService';
import studentAssignmentService from '../../services/studentAssignmentService';
import studentQuizService from '../../services/studentQuizService';
import certificateService from '../../services/certificateService';
import branchStudentDashboardService from '../../services/branchStudentDashboardService';
import '../../styles/scrollbar.css';
import { getUserData } from '../../utils/authUtils';
import { setupAuth } from '../../utils/authSetup';
import {
  clearAuthCache,
  getUserData as getEnhancedUserData,
  hasRole,
  isValidSession,
  logout
} from '../../utils/enhancedAuthUtils';

// Lazy load all child components for better performance
// Using original StudentCourses with updated API integration
const StudentCourses = lazy(() => import('./StudentCourses'));
const BrowseCourses = lazy(() => import('./BrowseCourses'));
const StudentProgress = lazy(() => import('./StudentProgress'));
const StudentAssignments = lazy(() => import('./StudentAssignments'));
const StudentQuizzes = lazy(() => import('./StudentQuizzes'));
const StudentCertificates = lazy(() => import('./StudentCertificates'));
const StudentSettings = lazy(() => import('./StudentSettings'));
const StudentNotifications = lazy(() => import('./StudentNotifications'));
const StudentFeedback = lazy(() => import('./StudentFeedback'));
const StudentAnalytics = lazy(() => import('./StudentAnalytics'));
// Lazy load CertificateTemplate
const CertificateTemplate = lazy(() => import('../../components/CertificateTemplate'));

// Add inline styles for animations
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-20px); }
    to { opacity: 1; transform: translateX(0); }
  }
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  
  .animate-fadeIn { animation: fadeIn 0.6s ease-out; }
  .animate-slideIn { animation: slideIn 0.5s ease-out; }
  .animate-pulse-slow { animation: pulse 2s infinite; }
  
  .glass-effect {
    backdrop-filter: blur(10px);
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}

const StudentDashboard = () => {
  const navigate = useNavigate();

  // Utility function for safe object-to-string conversion
  const getString = (val) => {
    if (val == null) return '';
    if (typeof val === 'string' || typeof val === 'number') return val;
    if (typeof val === 'object') {
      if ('name' in val) return val.name;
      if ('title' in val) return val.title;
      if ('program_name' in val) return val.program_name;
      return JSON.stringify(val);
    }
    return String(val);
  };

  // INSTANT LOAD: Initialize with null to trigger optimized loading
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false); // Start false for instant display
  const [dataLoaded, setDataLoaded] = useState(false); // Track if real data has loaded
  const [error, setError] = useState(null);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [activeMenuItem, setActiveMenuItem] = useState('Dashboard');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showUpdateProfileModal, setShowUpdateProfileModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userAuthenticated, setUserAuthenticated] = useState(false);
  const [welcomeAnimationComplete, setWelcomeAnimationComplete] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [preloadedComponents, setPreloadedComponents] = useState(new Set());
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [selectedCourseForCertificate, setSelectedCourseForCertificate] = useState(null);

  // Achievement modal state
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [allAchievements, setAllAchievements] = useState([]);

  const [studentProfile, setStudentProfile] = useState({
    name: 'Alex Johnson',
    email: 'student@lmssy.com',
    role: 'Premium Student',
    phone: '+1 234 567 8902',
    joinDate: '2023-03-20',
    level: 'Intermediate',
    points: 1250,
    studentId: null, // ObjectId for backend operations
    user_id: 'STU001', // Display ID for user (human-readable)
    department: 'Computer Science',
    semester: '6th Semester'
  });
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);

  // Helper function to fetch course progress from API with caching and retry logic
  const progressCache = useRef({});

  // Clear progress cache on unmount to ensure fresh data on next visit
  useEffect(() => {
    return () => {
      console.log('🧹 Clearing progress cache on dashboard unmount');
      progressCache.current = {};
    };
  }, []);
  const fetchCourseProgress = async (courseId, token, retryCount = 0) => {
    // Validate courseId
    if (!courseId) {
      console.warn('⚠️ Invalid courseId provided to fetchCourseProgress');
      return 0;
    }

    // Check cache first
    if (progressCache.current[courseId]) {
      console.log(`📦 Using cached progress for course: ${courseId}`);
      return progressCache.current[courseId];
    }

    try {
      console.log(`🔄 Fetching progress for course: ${courseId} (attempt ${retryCount + 1})`);
      const response = await axios.get(
        `http://localhost:4000/api/progress/course/${courseId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000 // Increased to 15 second timeout
        }
      );

      // Extract progress percentage from response
      let progress = 0;
      if (response.data) {
        // Handle different response structures
        if (response.data.stats?.completion_percentage !== undefined) {
          progress = response.data.stats.completion_percentage;
        } else if (response.data.progress !== undefined) {
          progress = response.data.progress;
        } else if (response.data.percentage !== undefined) {
          progress = response.data.percentage;
        } else if (response.data.completion !== undefined) {
          progress = response.data.completion;
        } else if (response.data.completionPercentage !== undefined) {
          progress = response.data.completionPercentage;
        } else if (response.data.data?.stats?.completion_percentage !== undefined) {
          progress = response.data.data.stats.completion_percentage;
        } else if (response.data.data?.progress !== undefined) {
          progress = response.data.data.progress;
        }

        // Ensure progress is between 0-100
        progress = Math.max(0, Math.min(100, progress));
      }

      // Cache the result
      progressCache.current[courseId] = progress;
      console.log(`✅ Progress for course ${courseId}: ${progress}%`);
      return progress;
    } catch (error) {
      const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout');

      // Retry logic with exponential backoff for timeouts
      if (isTimeout && retryCount < 2) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s
        console.warn(`⏳ Timeout for course ${courseId}, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchCourseProgress(courseId, token, retryCount + 1);
      }

      console.error(`❌ Error fetching progress for course ${courseId}:`, error.message);
      // Cache 0 to prevent repeated failed requests
      progressCache.current[courseId] = 0;
      return 0; // Return 0 on error
    }
  };

  // Fetch enrolled courses and update their progress using the correct API
  const fetchStudentEnrollments = async (studentId, token) => {
    try {
      console.log('🔄 Fetching student enrollments with fresh progress data...');

      // Try the main enrolled courses endpoint first
      let response;
      try {
        response = await fetch(`http://localhost:4000/api/students/enrolled-courses`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (primaryError) {
        console.log('Primary endpoint failed, trying fallback...');
        // Fallback to enrollment endpoint
        response = await fetch(`http://localhost:4000/enrollment/enrolled-courses/${studentId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      console.log('📊 Raw enrollment data:', data);

      let courses = [];
      if (data.success && data.courses) {
        courses = data.courses;
      } else if (data.data) {
        courses = data.data;
      } else if (Array.isArray(data)) {
        courses = data;
      } else {
        console.warn('No courses found in response:', data);
        return [];
      }

      // Fetch progress for each course using the updated API
      const updatedCourses = await Promise.all(
        courses.map(async (course) => {
          try {
            const courseId = course.id || course._id;

            // Safety check: ensure courseId is present
            if (!courseId) {
              return { ...course, progress: 0 };
            }

            console.log('📈 Fetching progress for course:', courseId);

            // Get fresh progress using our updated function
            const progress = await fetchCourseProgress(courseId, token);

            console.log(`✅ Course ${courseId} progress: ${progress}%`);

            // Transform the course data
            return {
              id: courseId,
              _id: courseId,
              title: course.title || course.course_name || course.name || 'Untitled Course',
              description: course.description || 'No description available',
              instructor: course.instructor || course.instructor_name || 'Instructor',
              category: course.category || 'General',
              level: course.level || 'Beginner',
              duration: course.duration || course.duration_months || '0 months',
              rating: course.rating || 4.5,
              reviewCount: course.review_count || 0,
              enrollmentDate: course.enrollment_date || course.created_at || new Date().toISOString(),
              lastAccessed: course.last_accessed || course.updated_at || new Date().toISOString(),
              progress: Math.round(progress),
              status: progress >= 100 ? 'completed' : (progress > 0 ? 'in-progress' : 'not-started'),
              completionDate: progress >= 100 ? (course.completion_date || new Date().toISOString()) : null,
              thumbnail: course.thumbnail || course.image_url || '/api/placeholder/400/300',
              lessons: course.total_lessons || course.lessons_count || 0,
              completedLessons: course.completed_lessons || Math.floor(progress / 100 * (course.total_lessons || 10)),
              skills: course.skills || [],
              certificate: course.certificate_awarded || false,
              points: course.points || 0,
              hoursSpent: course.hours_spent || Math.floor(progress / 10),
              branch_code: course.branch_code,
              branch_name: course.branch_name,
              batch_name: course.batch_name
            };
          } catch (err) {
            console.error('❌ Error fetching progress for course:', course.id || course._id, err);
            // If progress fetch fails, use fallback progress from course data
            const fallbackProgress = course.progress || course.completion_percentage || 0;
            return {
              ...course,
              progress: Math.round(fallbackProgress),
              status: fallbackProgress >= 100 ? 'completed' : (fallbackProgress > 0 ? 'in-progress' : 'not-started')
            };
          }
        })
      );

      console.log(`✅ Fetched ${updatedCourses.length} courses with fresh progress`);
      return updatedCourses;
    } catch (error) {
      console.error('❌ Error fetching enrolled courses:', error);
      return [];
    }
  };

  // Helper function to fetch notifications from API with timeout and retry
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return [];

      const response = await fetch(`${API_BASE_URL}/api/notifications/student`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000  // 5 second timeout
      });

      if (!response.ok) return [];

      const data = await response.json();
      return data.notifications || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  };



  // Helper function to calculate student statistics
  const calculateStudentStats = (enrolledCourses, assignments = [], quizzes = []) => {
    console.log('📊 Calculating student stats from enrolled courses:', enrolledCourses.length);

    // Filter completed courses (100% progress)
    const completedCourses = enrolledCourses.filter(course => course.progress >= 100).length;

    // Calculate total progress from all enrolled courses
    const totalProgress = enrolledCourses.reduce((sum, course) => {
      const progress = Number(course.progress) || 0;
      console.log(`  Course: ${getString(course.title) || getString(course.name)} - Progress: ${progress}%`);
      return sum + progress;
    }, 0);

    // Calculate average progress (weighted by number of courses)
    const avgProgress = enrolledCourses.length > 0
      ? Math.round(totalProgress / enrolledCourses.length)
      : 0;

    console.log(`✅ Stats Calculated:
      - Total Courses: ${enrolledCourses.length}
      - Completed Courses: ${completedCourses}
      - Total Progress: ${totalProgress}
      - Average Progress: ${avgProgress}%`);

    // Calculate assignment stats
    const completedAssignments = assignments.filter(a => a.status === 'submitted' || a.status === 'completed' || a.status === 'graded');

    // Calculate quiz stats
    const completedQuizzes = quizzes.filter(q => q.status === 'completed' || q.score !== undefined || q.score !== null);

    return {
      enrolledCourses: enrolledCourses.length,
      completedCourses,
      avgProgress,
      totalPoints: enrolledCourses.reduce((sum, course) => sum + (course.points || 0), 0),
      certificatesEarned: completedCourses,
      hoursLearned: enrolledCourses.reduce((sum, course) => sum + (course.hoursSpent || 0), 0),
      streak: 7, // This would need to come from a separate API
      rank: 15, // This would need to come from a separate API
      // Add quiz and assignment completion stats
      totalAssignments: assignments.length,
      completedAssignments: completedAssignments.length,
      totalQuizzes: quizzes.length,
      completedQuizzes: completedQuizzes.length
    };
  };

  // Function to fetch and generate real student achievements
  const fetchStudentAchievements = async (studentId) => {
    try {
      console.log('🏆 Fetching student achievements for:', studentId);
      const achievements = [];

      // Fetch completed assignments
      try {
        const assignments = await studentAssignmentService.getAllAssignments(studentId);
        const completedAssignments = assignments.filter(a => a.status === 'submitted' || a.status === 'completed');

        if (completedAssignments.length > 0) {
          achievements.push({
            id: 'assignment_master',
            icon: '📝',
            title: 'Assignment Master',
            description: `Completed ${completedAssignments.length} assignments`,
            rarity: completedAssignments.length >= 10 ? 'epic' : completedAssignments.length >= 5 ? 'rare' : 'common',
            earnedDate: new Date(Math.max(...completedAssignments.map(a => new Date(a.submitted_at || a.updated_at)))).toLocaleDateString()
          });
        }

        // High scorer achievement
        const highScoreAssignments = completedAssignments.filter(a => a.score >= 90);
        if (highScoreAssignments.length >= 3) {
          achievements.push({
            id: 'high_scorer',
            icon: '🎯',
            title: 'High Scorer',
            description: `Achieved 90+ score in ${highScoreAssignments.length} assignments`,
            rarity: 'rare',
            earnedDate: new Date(Math.max(...highScoreAssignments.map(a => new Date(a.submitted_at || a.updated_at)))).toLocaleDateString()
          });
        }
      } catch (err) {
        console.warn('Failed to fetch assignment achievements:', err);
      }

      // Fetch quiz achievements
      try {
        const quizzes = await studentQuizService.getAllQuizzes(studentId);
        const completedQuizzes = quizzes.filter(q => q.status === 'completed' || q.score !== undefined);

        if (completedQuizzes.length > 0) {
          achievements.push({
            id: 'quiz_champion',
            icon: '🧠',
            title: 'Quiz Champion',
            description: `Completed ${completedQuizzes.length} quizzes`,
            rarity: completedQuizzes.length >= 10 ? 'epic' : completedQuizzes.length >= 5 ? 'rare' : 'common',
            earnedDate: new Date(Math.max(...completedQuizzes.map(q => new Date(q.completed_at || q.updated_at)))).toLocaleDateString()
          });
        }

        // Perfect score achievement
        const perfectQuizzes = completedQuizzes.filter(q => q.score === 100 || q.percentage >= 100);
        if (perfectQuizzes.length > 0) {
          achievements.push({
            id: 'perfectionist',
            icon: '💯',
            title: 'Perfectionist',
            description: `Perfect scores in ${perfectQuizzes.length} quizzes`,
            rarity: 'epic',
            earnedDate: new Date(Math.max(...perfectQuizzes.map(q => new Date(q.completed_at || q.updated_at)))).toLocaleDateString()
          });
        }
      } catch (err) {
        console.warn('Failed to fetch quiz achievements:', err);
      }

      // Fetch certificate achievements
      try {
        // Note: Authentication is handled by existing tokens in localStorage
        // await setupAuth(); // REMOVED: This was overwriting logged-in users with super admin
        const certificates = await certificateService.getMyCertificates();
        if (certificates && certificates.length > 0) {
          achievements.push({
            id: 'certified_learner',
            icon: '🎓',
            title: 'Certified Learner',
            description: `Earned ${certificates.length} certificates`,
            rarity: certificates.length >= 5 ? 'epic' : certificates.length >= 3 ? 'rare' : 'common',
            earnedDate: new Date(Math.max(...certificates.map(c => new Date(c.issued_on || c.created_at)))).toLocaleDateString()
          });

          // Recent certificate achievement
          const recentCerts = certificates.filter(c => {
            const issueDate = new Date(c.issued_on || c.created_at);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return issueDate > thirtyDaysAgo;
          });

          if (recentCerts.length > 0) {
            achievements.push({
              id: 'rising_star',
              icon: '⭐',
              title: 'Rising Star',
              description: `Earned ${recentCerts.length} certificate${recentCerts.length > 1 ? 's' : ''} this month`,
              rarity: 'rare',
              earnedDate: new Date(Math.max(...recentCerts.map(c => new Date(c.issued_on || c.created_at)))).toLocaleDateString()
            });
          }
        }
      } catch (err) {
        console.warn('Failed to fetch certificate achievements:', err);
      }

      // Course progress achievements (from enrolled courses)
      const enrolledCourses = dashboardData?.recentCourses || [];
      const completedCourses = enrolledCourses.filter(c => c.progress >= 100);

      if (completedCourses.length > 0) {
        achievements.push({
          id: 'course_completer',
          icon: '📚',
          title: 'Course Completer',
          description: `Completed ${completedCourses.length} course${completedCourses.length > 1 ? 's' : ''}`,
          rarity: completedCourses.length >= 5 ? 'epic' : completedCourses.length >= 3 ? 'rare' : 'common',
          earnedDate: new Date().toLocaleDateString()
        });
      }

      // Learning streak achievement (simulated)
      const today = new Date();
      const thisWeek = new Date();
      thisWeek.setDate(thisWeek.getDate() - 7);

      achievements.push({
        id: 'consistent_learner',
        icon: '🔥',
        title: 'Consistent Learner',
        description: 'Active learning for 7 days',
        rarity: 'common',
        earnedDate: today.toLocaleDateString()
      });

      // Sort by rarity and date
      const rarityOrder = { epic: 3, rare: 2, common: 1 };
      achievements.sort((a, b) => {
        const rarityDiff = rarityOrder[b.rarity] - rarityOrder[a.rarity];
        if (rarityDiff !== 0) return rarityDiff;
        return new Date(b.earnedDate) - new Date(a.earnedDate);
      });

      console.log('🏆 Generated achievements:', achievements);

      // Store all achievements for modal
      setAllAchievements(achievements);

      return achievements.slice(0, 6); // Return top 6 for dashboard display

    } catch (error) {
      console.error('❌ Failed to fetch student achievements:', error);
      return [];
    }
  };

  // Function to refresh dashboard data after quiz/assignment completion
  const refreshDashboardStats = async () => {
    console.log('🔄 Refreshing dashboard stats after completion');
    try {
      const token = localStorage.getItem('token');
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const studentId = userData._id || userData.id || userData.user_id;

      if (!studentId || !token) {
        console.warn('⚠️ No student ID or token available for dashboard refresh');
        return;
      }

      // Fetch latest data
      const enrolledCourses = await fetchStudentEnrollments(studentId, token);

      let assignments = [];
      let quizzes = [];

      try {
        assignments = await studentAssignmentService.getAllAssignments(studentId);
        quizzes = await studentQuizService.getAllQuizzes(studentId);
      } catch (err) {
        console.warn('Could not fetch assignments/quizzes for dashboard refresh:', err);
      }

      // Calculate fresh stats
      const stats = calculateStudentStats(enrolledCourses, assignments, quizzes);

      // Fetch achievements
      const achievements = await fetchStudentAchievements(studentId);

      // Update dashboard data
      setDashboardData(prevData => ({
        ...prevData,
        stats,
        upcomingAssignments: assignments,
        upcomingQuizzes: quizzes,
        achievements,
        recentCourses: enrolledCourses
      }));

      console.log('✅ Dashboard stats refreshed successfully');

    } catch (error) {
      console.error('❌ Error refreshing dashboard stats:', error);
    }
  };

  // Function to refresh enrollment data
  const refreshEnrollmentData = async () => {
    setEnrollmentLoading(true);
    try {
      console.log('🔄 Refreshing enrollment data with progress');

      const token = localStorage.getItem('token');
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const studentId = userData._id || userData.id || userData.user_id;

      if (!studentId || !token) {
        console.warn('⚠️ No student ID or token available for enrollment refresh');
        return;
      }

      // Fetch fresh enrollment data with progress
      const enrolledCourses = await fetchStudentEnrollments(studentId, token);
      console.log('📋 REFRESHED ENROLLMENT WITH PROGRESS:', enrolledCourses);

      // Fetch current assignments and quizzes for accurate stats
      let assignments = [];
      let quizzes = [];

      try {
        assignments = await studentAssignmentService.getAllAssignments(studentId);
        quizzes = await studentQuizService.getAllQuizzes(studentId);
      } catch (err) {
        console.warn('Could not fetch assignments/quizzes for stats update:', err);
      }

      // Calculate fresh stats with all data
      const stats = calculateStudentStats(enrolledCourses, assignments, quizzes);

      // Fetch updated achievements
      const achievements = await fetchStudentAchievements(studentId);

      // Update dashboard data
      setDashboardData(prevData => ({
        ...prevData,
        stats: stats,
        recentCourses: enrolledCourses,
        achievements: achievements
      }));

      setDataLoaded(true);
      console.log('✅ Enrollment data refreshed with real progress');
    } catch (error) {
      console.error('❌ Failed to refresh enrollment data:', error);
    } finally {
      setEnrollmentLoading(false);
    }
  };

  // Function to refresh notifications
  const refreshNotifications = async () => {
    try {
      console.log('🔄 Refreshing notifications only');
      setLoading(true);

      // Get fresh notifications without overriding course data
      const freshNotifications = await fetchNotifications();
      setNotifications(freshNotifications);
      console.log(`✅ Notifications refreshed: ${freshNotifications.length} notifications loaded`);

    } catch (error) {
      console.error('❌ Failed to refresh notifications:', error);
      alert('Failed to refresh notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to load/refresh dashboard data
  const loadDashboardData = async () => {
    try {
      console.log('🔄 Loading dashboard data with progress...');

      const token = localStorage.getItem('token');
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const studentId = userData._id || userData.id || userData.user_id;

      if (!studentId || !token) {
        console.warn('⚠️ No student ID or token available for dashboard refresh');
        return;
      }

      // Check if this is a branch student
      const isBranchStudent = branchStudentDashboardService.isBranchStudent();
      console.log('🎓 [StudentDashboard] Is branch student:', isBranchStudent);

      if (isBranchStudent) {
        console.log('🏢 [StudentDashboard] Loading branch student dashboard data...');

        try {
          // Use branch-specific service for branch students
          const branchData = await branchStudentDashboardService.getDashboardData();
          console.log('✅ [StudentDashboard] Branch dashboard data loaded:', branchData);

          // Transform branch data to match expected structure
          const enrolledCourses = (branchData.data.enrolled_courses || []).map(course => ({
            id: course.id,
            _id: course.id,
            title: course.title,
            name: course.title,
            description: course.description,
            progress: course.progress || 0,
            status: course.status,
            instructor: course.instructor || 'Unknown',
            thumbnail: course.thumbnail || '',
            duration: course.duration || 'N/A',
            lastAccessed: course.enrolled_at ? new Date(course.enrolled_at).toLocaleDateString() : 'Recently'
          }));

          const assignments = (branchData.data.assignments || []).map(assignment => ({
            id: assignment.id,
            _id: assignment.id,
            title: assignment.title,
            description: assignment.description,
            due_date: assignment.due_date,
            status: assignment.status === 'Submitted' ? 'submitted' : assignment.status.toLowerCase(),
            score: assignment.score,
            course_id: assignment.course_id,
            submitted_at: assignment.submitted_at
          }));

          const quizzes = (branchData.data.quizzes || []).map(quiz => ({
            id: quiz.id,
            _id: quiz.id,
            title: quiz.title,
            description: quiz.description,
            time_limit: quiz.time_limit,
            total_questions: quiz.total_questions,
            status: quiz.status === 'Completed' ? 'completed' : quiz.status.toLowerCase(),
            score: quiz.score,
            course_id: quiz.course_id,
            completed_at: quiz.completed_at
          }));

          // Calculate fresh stats with branch data
          const stats = calculateStudentStats(enrolledCourses, assignments, quizzes);

          console.log('📊 [StudentDashboard] Branch stats calculated:', stats);

          // Update dashboard data with branch information
          setDashboardData({
            stats,
            recentCourses: enrolledCourses,
            upcomingAssignments: assignments,
            upcomingQuizzes: quizzes,
            achievements: [], // Will be populated by fetchStudentAchievements
            upcomingLiveSessions: [],
            studyMaterials: branchData.data.study_materials || [],
            videoClasses: branchData.data.video_classes || []
          });

          // Fetch achievements separately (existing logic works for both types)
          try {
            const achievements = await fetchStudentAchievements(studentId);
            setDashboardData(prevData => ({
              ...prevData,
              achievements: achievements
            }));
          } catch (achErr) {
            console.warn('⚠️ Failed to load achievements:', achErr);
          }

          setDataLoaded(true);
          console.log('✅ Branch student dashboard data loaded successfully');
          return;

        } catch (branchError) {
          console.error('❌ [StudentDashboard] Failed to load branch data:', branchError);
          // Set error state but don't fall through - show user-friendly error
          setError('Failed to load dashboard data. Please refresh the page.');
          setDataLoaded(true);
          return;
        }
      }

      // Fetch fresh enrollment data with progress (for regular students)
      const enrolledCourses = await fetchStudentEnrollments(studentId, token);
      console.log('📋 REFRESHED ENROLLED COURSES WITH PROGRESS:', enrolledCourses);

      // Fetch fresh assignments and quizzes
      let assignments = [];
      let quizzes = [];

      try {
        assignments = await studentAssignmentService.getAllAssignments(studentId);
      } catch (err) {
        console.error('Error loading assignments:', err);
      }

      try {
        quizzes = await studentQuizService.getAllQuizzes(studentId);
      } catch (err) {
        console.error('Error loading quizzes:', err);
      }

      // Calculate fresh stats with quiz and assignment data
      const stats = calculateStudentStats(enrolledCourses, assignments, quizzes);

      // Fetch achievements
      const achievements = await fetchStudentAchievements(studentId);

      // Update dashboard data with fresh progress
      setDashboardData({
        stats,
        recentCourses: enrolledCourses,
        upcomingAssignments: assignments,
        upcomingQuizzes: quizzes,
        achievements: achievements,
        upcomingLiveSessions: []
      });

      setDataLoaded(true);
      console.log('✅ Dashboard data refreshed with real progress');

    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
    }
  };



  useEffect(() => {
    const initializeDashboard = async () => {
      console.log('⚡ Starting optimized student dashboard initialization');
      try {
        // INSTANT AUTH CHECK - Fast, non-blocking authentication validation
        if (!isValidSession() || !hasRole('student')) {
          console.log('🚫 Invalid session or wrong role, redirecting to student login');
          logout(navigate);
          return;
        }

        console.log('✅ Authentication validated instantly');

        // INSTANT PROFILE SETUP - Get cached user data immediately
        const userData = getEnhancedUserData();
        let studentId = null;
        if (userData && Object.keys(userData).length > 0) {
          console.log('⚡ Setting up student profile from cached data');
          setStudentProfile(prevProfile => ({
            ...prevProfile,
            name: userData.name || userData.full_name || prevProfile.name,
            email: userData.email || prevProfile.email,
            role: userData.role || prevProfile.role,
            phone: userData.phone || prevProfile.phone,
            department: userData.department || prevProfile.department,
            level: userData.level || prevProfile.level,
            semester: userData.semester || prevProfile.semester,
            studentId: userData._id || userData.id || prevProfile.studentId,
            user_id: userData.user_id || userData.student_id || prevProfile.user_id
          }));
          studentId = userData._id || userData.id;
        }

        // Set as authenticated immediately
        setUserAuthenticated(true);

        // Add navigation event listener for SimpleStudentCourses
        const handleNavigateToSection = (event) => {
          console.log('🧭 Navigation event received:', event.detail);
          setActiveMenuItem(event.detail);
        };
        window.addEventListener('navigateToSection', handleNavigateToSection);

        // Start welcome animation immediately
        setTimeout(() => setWelcomeAnimationComplete(true), 300);

        // Preload commonly used components for instant navigation
        setTimeout(() => {
          preloadComponent('Courses');
          preloadComponent('BrowseCourses');
          preloadComponent('Assignments');
        }, 1000);

        // Fetch enrolled courses and update dashboardData
        if (studentId) {
          const token = localStorage.getItem('token');
          const enrolledCourses = await fetchStudentEnrollments(studentId, token);
          console.log('📋 ENROLLED COURSES WITH PROGRESS:', enrolledCourses);

          // Log each course's progress before setting dashboard data
          enrolledCourses.forEach((course, index) => {
            console.log(`📚 Course ${index + 1}: ${getString(course.title) || getString(course.name)} - Progress: ${course.progress}%`);
          });

          // Calculate stats with updated progress
          const stats = calculateStudentStats(enrolledCourses);
          // Fetch assignments for this student
          let assignments = [];
          try {
            assignments = await studentAssignmentService.getAllAssignments(studentId);
          } catch (err) {
            console.error('Error loading assignments for dashboard:', err);
          }
          // Fetch quizzes for this student
          let quizzes = [];
          try {
            quizzes = await studentQuizService.getAllQuizzes(studentId);
          } catch (err) {
            console.error('Error loading quizzes for dashboard:', err);
          }

          // Fetch achievements for this student
          const achievements = await fetchStudentAchievements(studentId);

          setDashboardData({
            stats,
            recentCourses: enrolledCourses,
            upcomingAssignments: assignments,
            upcomingQuizzes: quizzes,
            achievements: achievements,
            upcomingLiveSessions: []
          });
          setDataLoaded(true);

          console.log('✅ Dashboard data set with real enrollment progress');
        }

      } catch (error) {
        console.error('❌ Dashboard initialization error:', error);
        setError('Failed to load dashboard. Please refresh the page.');
        // Fallback to mock data
        console.log('🔄 Loading fallback mock data');
        const fallbackData = dashboardLoaderService.getMockData('student');
        setDashboardData({
          stats: fallbackData.stats || {},
          recentCourses: fallbackData.recentCourses || [],
          upcomingAssignments: mockData.upcomingAssignments,
          achievements: mockData.achievements,
          upcomingLiveSessions: mockData.upcomingLiveSessions
        });
        setNotifications(fallbackData.notifications || []);
        setUserAuthenticated(true);
      }
    };
    initializeDashboard();
  }, [navigate]);

  // Listen for quiz completion events and course progress updates to refresh dashboard stats
  useEffect(() => {
    const handleQuizCompletion = (event) => {
      console.log('🎯 Quiz completion detected, refreshing dashboard stats', event.detail);
      // Auto-refresh dashboard stats when quiz is completed
      refreshDashboardStats();

      // Also refresh course progress if course ID is provided
      if (event.detail?.courseId) {
        refreshCourseProgress(event.detail.courseId);
      }
    };

    const handleAssignmentSubmission = (event) => {
      console.log('📝 Assignment submission detected, refreshing dashboard stats', event.detail);
      // Auto-refresh dashboard stats when assignment is submitted
      refreshDashboardStats();

      // Also refresh course progress if course ID is provided
      if (event.detail?.courseId) {
        refreshCourseProgress(event.detail.courseId);
      }
    };

    const handleCourseProgress = (event) => {
      console.log('📈 Course progress update detected', event.detail);
      const { courseId, progress, contentId, completed } = event.detail || {};

      if (courseId) {
        // Clear cache and refresh progress immediately
        if (progressCache.current[courseId]) {
          delete progressCache.current[courseId];
        }

        // Force refresh the specific course progress
        refreshCourseProgress(courseId);

        // Also refresh overall dashboard stats after a short delay
        setTimeout(() => {
          refreshDashboardStats();
        }, 1000);
      }
    };

    const handleEnrolledCoursesRefresh = () => {
      console.log('🔄 Enrolled courses refresh requested');
      // Reload dashboard data to show updated progress
      loadDashboardData();
    };

    // Add event listeners for quiz completion, assignment submission, and course progress
    window.addEventListener('quizCompleted', handleQuizCompletion);
    window.addEventListener('assignmentSubmitted', handleAssignmentSubmission);
    window.addEventListener('courseProgressUpdate', handleCourseProgress);
    window.addEventListener('refreshEnrolledCourses', handleEnrolledCoursesRefresh);

    // Set up periodic progress refresh for dynamic updates
    const progressRefreshInterval = setInterval(() => {
      console.log('🔄 Periodic progress refresh...');
      if (dashboardData?.recentCourses?.length > 0) {
        // Refresh progress for all enrolled courses
        dashboardData.recentCourses.forEach(course => {
          if (course.progress < 100) { // Only refresh incomplete courses
            const courseId = course.id || course._id;
            if (courseId) {
              refreshCourseProgress(courseId);
            }
          }
        });
      }
    }, 60000); // Refresh every minute

    // Cleanup event listeners and intervals
    return () => {
      window.removeEventListener('quizCompleted', handleQuizCompletion);
      window.removeEventListener('assignmentSubmitted', handleAssignmentSubmission);
      window.removeEventListener('courseProgressUpdate', handleCourseProgress);
      window.removeEventListener('refreshEnrolledCourses', handleEnrolledCoursesRefresh);
      clearInterval(progressRefreshInterval);
    };
  }, []); // Empty dependency array since we want this to persist

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotificationModal(false);
      }
    };

    const handleNavigateToBrowseCourses = () => {
      setActiveMenuItem('BrowseCourses');
    };

    const handleNavigateToSection = (event) => {
      const sectionId = event.detail;
      if (sectionId && menuItems.some(item => item.id === sectionId)) {
        setActiveMenuItem(sectionId);
        // Show a brief highlight animation for the section
        setSidebarOpen(false); // Close mobile sidebar if open
      }
    };

    const handleRefreshDashboard = () => {
      if (activeMenuItem === 'Dashboard') {
        // Refresh dashboard data
        console.log('🔄 Refreshing dashboard after course enrollment');
        loadDashboardData();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('navigateToBrowseCourses', handleNavigateToBrowseCourses);
    window.addEventListener('navigateToSection', handleNavigateToSection);
    window.addEventListener('refreshDashboard', handleRefreshDashboard);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('navigateToBrowseCourses', handleNavigateToBrowseCourses);
      window.removeEventListener('navigateToSection', handleNavigateToSection);
      window.removeEventListener('refreshDashboard', handleRefreshDashboard);
    };
  }, []);

  // Clean up when update profile modal closes
  useEffect(() => {
    if (!showUpdateProfileModal) {
      // Modal closed - cleanup if needed
    }
  }, [showUpdateProfileModal]);

  // Keyboard support for achievements modal
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && showAchievementsModal) {
        setShowAchievementsModal(false);
      }
    };

    if (showAchievementsModal) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent background scroll
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [showAchievementsModal]);

  const menuItems = [
    { id: 'Dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'Courses', label: 'Enrolled Courses', icon: '📚' },
    { id: 'BrowseCourses', label: 'Find Courses', icon: '🔍' },
    // { id: 'Progress', label: 'Progress', icon: '📈' },
    { id: 'Assignments', label: 'Assignments', icon: '📝' },
    { id: 'Quizzes', label: 'Quizzes', icon: '❓' },
    // { id: 'Live Sessions', label: 'Live Sessions', icon: '🎥' },
    // { id: 'Certificates', label: 'Certificates', icon: '🏆' },
    // { id: 'Analytics', label: 'Analytics', icon: '📊' },
    // { id: 'Notifications', label: 'Notifications', icon: '🔔' },
    { id: 'Feedback', label: 'Feedback', icon: '💭' },
    // { id: 'Settings', label: 'Settings', icon: '⚙️' }
  ];

  // Enhanced preload component on hover for faster loading
  const preloadComponent = (componentId) => {
    if (preloadedComponents.has(componentId)) return;

    let componentToLoad;
    switch (componentId) {
      case 'Courses':
        componentToLoad = import('./StudentCourses');
        break;
      case 'BrowseCourses':
        componentToLoad = import('./BrowseCourses');
        break;
      case 'Progress':
        componentToLoad = import('./StudentProgress');
        break;
      case 'Assignments':
        componentToLoad = import('./StudentAssignments');
        break;
      case 'Quizzes':
        componentToLoad = import('./StudentQuizzes');
        break;

      case 'Certificates':
        componentToLoad = import('./StudentCertificates');
        break;
      case 'Settings':
        componentToLoad = import('./StudentSettings');
        break;
      case 'Notifications':
        componentToLoad = import('./StudentNotifications');
        break;
      case 'Feedback':
        componentToLoad = import('./StudentFeedback');
        break;
      case 'Analytics':
        componentToLoad = import('./StudentAnalytics');
        break;
      default:
        return;
    }

    console.log(`🚀 Preloading ${componentId} component for faster navigation`);
    componentToLoad.then(() => {
      setPreloadedComponents(prev => new Set([...prev, componentId]));
      console.log(`✅ ${componentId} component preloaded successfully`);
    }).catch(err => {
      console.log(`⚠️ Preload error for ${componentId} (non-critical):`, err);
    });
  };

  // Handle menu item click with smooth transition
  const handleMenuItemClick = (itemId) => {
    if (activeMenuItem === itemId) return;

    // Show immediate visual feedback
    setIsTransitioning(true);

    // Change the active menu item immediately for instant UI feedback
    setActiveMenuItem(itemId);
    setSidebarOpen(false);

    // Reset transition state after a short delay
    setTimeout(() => {
      setIsTransitioning(false);
    }, 150);
  };

  // Function to handle course navigation based on progress
  const handleCourseNavigation = (course) => {
    const courseId = course.id || course._id;
    const courseProgress = course.progress || 0;

    // Clear progress cache for this course to ensure fresh data on return
    if (progressCache.current[courseId]) {
      delete progressCache.current[courseId];
    }

    console.log(`🎯 Navigating to course ${courseId} with progress ${courseProgress}%`);

    // Navigate to course content viewer
    const contentUrl = `/course-content/${courseId}`;

    if (courseProgress > 0) {
      // Continue from where they left off
      navigate(contentUrl + '?continue=true');
    } else {
      // Start fresh
      navigate(contentUrl);
    }
  };

  // Function to refresh progress for a specific course
  const refreshCourseProgress = async (courseId) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      if (!token || !courseId) {
        console.warn('⚠️ No token or courseId provided for progress refresh');
        return null;
      }

      console.log(`🔄 Force refreshing progress for course: ${courseId}`);

      // Clear cache to force fresh fetch
      if (progressCache.current[courseId]) {
        delete progressCache.current[courseId];
      }

      // Fetch fresh progress
      const newProgress = await fetchCourseProgress(courseId, token);
      console.log(`📈 Refreshed progress for course ${courseId}: ${newProgress}%`);

      // Update the course in dashboard data immediately
      setDashboardData(prev => {
        if (!prev?.recentCourses) return prev;

        const updatedCourses = prev.recentCourses.map(course => {
          if ((course.id === courseId || course._id === courseId)) {
            const updatedCourse = {
              ...course,
              progress: newProgress,
              status: newProgress >= 100 ? 'completed' : (newProgress > 0 ? 'in-progress' : 'not-started'),
              completionDate: newProgress >= 100 ? new Date().toISOString() : null
            };
            console.log(`📊 Updated course progress in dashboard:`, updatedCourse);
            return updatedCourse;
          }
          return course;
        });

        // Recalculate stats with updated progress
        const updatedStats = calculateStudentStats(updatedCourses, prev.upcomingAssignments || [], prev.upcomingQuizzes || []);

        return {
          ...prev,
          recentCourses: updatedCourses,
          stats: updatedStats
        };
      });

      return newProgress;
    } catch (error) {
      console.error('❌ Error refreshing course progress:', error);
      return null;
    }
  };

  // Function to handle opening certificate modal
  const handleViewCertificate = async (course) => {
    console.log('Opening certificate for course:', course);

    try {
      // Fetch the actual certificate data from the API
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:4000/certificates/course/${course._id || course.id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data && response.data.certificate) {
        // Merge certificate data with course data
        const certificateData = {
          ...course,
          certificateNumber: response.data.certificate.certificate_number || response.data.certificate.certificateNumber,
          certificateId: response.data.certificate.certificate_id || response.data.certificate.certificateId || response.data.certificate.id,
          completionDate: response.data.certificate.completion_date || response.data.certificate.completionDate,
          instructorName: response.data.certificate.instructor_name || response.data.certificate.instructorName || course.instructor
        };
        setSelectedCourseForCertificate(certificateData);
      } else {
        // If no certificate found, use course data as fallback
        setSelectedCourseForCertificate(course);
      }
    } catch (error) {
      console.error('Error fetching certificate:', error);
      // Fall back to course data if API call fails
      setSelectedCourseForCertificate(course);
    }

    setShowCertificateModal(true);
  };

  // Function to close certificate modal
  const handleCloseCertificateModal = () => {
    setShowCertificateModal(false);
    setSelectedCourseForCertificate(null);
  };

  // Helper functions for notifications
  const markNotificationAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      console.log('Marking notification as read:', notificationId);

      // Call backend API to mark as read
      const response = await axios.post(
        `http://localhost:4000/notifications/mark-read/${notificationId}`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Mark as read API response:', response.data);

      // Update local state only if API call succeeds
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId || notif.notification_id === notificationId
            ? { ...notif, read: true }
            : notif
        )
      );

      return true;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);

      // Fallback: update local state anyway for better UX
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId || notif.notification_id === notificationId
            ? { ...notif, read: true }
            : notif
        )
      );

      return false;
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Marking all notifications as read...');

      // Mark all unread notifications one by one
      const unreadNotifications = notifications.filter(n => !n.read);
      const promises = unreadNotifications.map(notification =>
        axios.post(
          `http://localhost:4000/notifications/mark-read/${notification.id || notification.notification_id}`,
          {},
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        ).catch(error => {
          console.error(`Failed to mark notification ${notification.id} as read:`, error);
          return null;
        })
      );

      await Promise.all(promises);

      // Update local state
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );

      console.log('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);

      // Fallback: update local state anyway for better UX
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      console.log('Deleting notification:', notificationId);

      // Call backend API to delete notification
      const response = await axios.delete(
        `http://localhost:4000/notifications/${notificationId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Delete notification API response:', response.data);

      // Update local state only if API call succeeds
      setNotifications(prev =>
        prev.filter(notif => notif.id !== notificationId && notif.notification_id !== notificationId)
      );

      return true;
    } catch (error) {
      console.error('Failed to delete notification:', error);

      // For now, still remove from local state for better UX
      // In production, you might want to show an error message instead
      setNotifications(prev =>
        prev.filter(notif => notif.id !== notificationId && notif.notification_id !== notificationId)
      );

      return false;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'assignment': return '📝';
      case 'course_update': return '📚';
      case 'quiz': return '❓';
      case 'live_session': return '🎥';
      case 'certificate': return '🏆';
      default: return '📢';
    }
  };

  const getNotificationColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-orange-200 bg-orange-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const formatNotificationTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const handleLogout = () => {
    // Clear dashboard cache for fresh login
    dashboardLoaderService.clearCache();
    clearAuthCache();

    // Use enhanced logout function - it handles redirect automatically
    logout();
  };

  const handleUpdateProfile = async (updatedData) => {
    try {
      const token = localStorage.getItem('token');
      const userData = getUserData();
      // Use MongoDB ObjectId for API operations (backend expects this)
      const userId = userData?.studentId || userData?._id || userData?.id || userData?.user_id || userData?.student_id;

      console.log('Profile Update - User Data:', {
        token: token ? 'Present' : 'Missing',
        userId: userId,
        userData: userData
      });

      if (!token || !userId) {
        console.error('Missing token or user ID', {
          hasToken: !!token,
          userId: userId,
          userData: userData
        });
        alert('Missing authentication data. Please login again.');
        return;
      }

      // Create FormData for profile update
      const formData = new FormData();

      // Add profile data
      Object.keys(updatedData).forEach(key => {
        if (updatedData[key] !== undefined && updatedData[key] !== null) {
          formData.append(key, updatedData[key]);
          console.log(`Added to FormData - ${key}:`, updatedData[key]);
        }
      });

      console.log('Sending profile update request to:', `http://localhost:4000/profile/${userId}`);

      // Send update request to backend with multipart/form-data
      const response = await axios.put(
        `http://localhost:4000/profile/${userId}`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      console.log('Profile update response:', response.data);

      // Update local state with new profile data
      setStudentProfile(prev => ({
        ...prev,
        ...response.data,
        // Keep ObjectId for backend operations, display user_id to user
        studentId: response.data._id || response.data.id || prev.studentId,
        user_id: response.data.user_id || response.data.student_id || prev.user_id
      }));

      // Update localStorage with new profile data
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...currentUser, ...response.data }));

      setShowUpdateProfileModal(false);
      console.log('Profile updated successfully');
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Profile update failed:', error);
      // Show detailed error message
      const errorMessage = error.response?.data?.detail || error.message || 'Unknown error occurred';
      alert(`Failed to update profile: ${errorMessage}`);
    }
  };

  const renderActiveComponent = () => {
    // Optimized loading fallback component
    const ComponentLoader = () => (
      <div className="flex items-center justify-center h-32">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-[#FFF8E1]"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 bg-[#FFF8E1] rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );

    // Wrapper with smooth transition
    const ComponentWrapper = ({ children }) => (
      <div className={`transition-opacity duration-150 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        {children}
      </div>
    );

    switch (activeMenuItem) {
      case 'Courses':
        return (
          <ComponentWrapper>
            <Suspense fallback={<ComponentLoader />}>
              <StudentCourses />
            </Suspense>
          </ComponentWrapper>
        );
      case 'BrowseCourses':
        return (
          <ComponentWrapper>
            <Suspense fallback={<ComponentLoader />}>
              <BrowseCourses />
            </Suspense>
          </ComponentWrapper>
        );
      case 'Progress':
        return (
          <ComponentWrapper>
            <Suspense fallback={<ComponentLoader />}>
              <StudentProgress />
            </Suspense>
          </ComponentWrapper>
        );
      case 'Assignments':
        return (
          <ComponentWrapper>
            <Suspense fallback={<ComponentLoader />}>
              <StudentAssignments />
            </Suspense>
          </ComponentWrapper>
        );
      case 'Quizzes':
        return (
          <ComponentWrapper>
            <Suspense fallback={<ComponentLoader />}>
              <StudentQuizzes />
            </Suspense>
          </ComponentWrapper>
        );

      case 'Certificates':
        return (
          <ComponentWrapper>
            <Suspense fallback={<ComponentLoader />}>
              <StudentCertificates />
            </Suspense>
          </ComponentWrapper>
        );
      case 'Analytics':
        return (
          <ComponentWrapper>
            <Suspense fallback={<ComponentLoader />}>
              <StudentAnalytics />
            </Suspense>
          </ComponentWrapper>
        );
      case 'Notifications':
        return (
          <ComponentWrapper>
            <Suspense fallback={<ComponentLoader />}>
              <StudentNotifications />
            </Suspense>
          </ComponentWrapper>
        );
      case 'Feedback':
        return (
          <ComponentWrapper>
            <Suspense fallback={<ComponentLoader />}>
              <StudentFeedback />
            </Suspense>
          </ComponentWrapper>
        );
      case 'Settings':
        return (
          <ComponentWrapper>
            <Suspense fallback={<ComponentLoader />}>
              <StudentSettings onUpdateProfile={handleUpdateProfile} profile={studentProfile} />
            </Suspense>
          </ComponentWrapper>
        );
      default:
        return (
          <ComponentWrapper>
            <div className="space-y-6">
              {/* Welcome Banner with Animation */}
              <div className={`bg-gradient-to-r from-[#FFF8E1] via-[#FFF8E1] to-[#FFF8E1] rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-1000 h-[100px] border-2 border-[#FFF8E1] ${welcomeAnimationComplete ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                }`}>
                <div className="relative p-4 h-full">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#FFF8E1]/20 to-[#FFF8E1]/20 backdrop-blur-sm"></div>
                  <div className="relative flex items-center justify-between h-full">
                    <div className="text-gray-800">
                      <h1 className="text-xl font-bold mb-2 bg-gradient-to-r from-gray-800 to-gray-700 bg-clip-text text-transparent">
                        Welcome back, {studentProfile.name}!
                      </h1>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm rounded-lg px-2 py-1 border border-gray-300 shadow-lg">
                          <span className="text-base">🎓</span>
                          <div>
                            <p className="text-xs text-gray-600 font-medium">Student ID</p>
                            <p className="font-bold text-gray-800 text-xs tracking-wide">{studentProfile.user_id || 'STU001'}</p>
                          </div>
                          {dataLoaded && (
                            <div className="ml-2 bg-orange-500 w-2 h-2 rounded-full animate-pulse" title="Real-time data loaded"></div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm rounded-lg px-2 py-1 border border-gray-300 shadow-lg">
                          <span className="text-base">📚</span>
                          <div>
                            <p className="text-xs text-gray-600 font-medium">Department</p>
                            <p className="font-semibold text-gray-800 text-xs">{studentProfile.department}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm rounded-lg px-2 py-1 border border-gray-300 shadow-lg">
                          <span className="text-base">📅</span>
                          <div>
                            <p className="text-xs text-gray-600 font-medium">Semester</p>
                            <p className="font-semibold text-gray-800 text-xs">{studentProfile.semester}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="hidden lg:block">
                      <div className="relative">
                        <img
                          src={studentProfile.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}
                          alt={studentProfile.name}
                          className="w-16 h-16 rounded-full border-4 border-white/30 shadow-2xl object-cover"
                        />
                        <div className="absolute -bottom-1 -right-1 bg-orange-500 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-lg">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>


              <div className="bg-white rounded-xl shadow-lg p-6">

                {error ? (
                  <div className="text-red-600 bg-red-50 p-6 rounded-xl border border-red-200">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">❌</span>
                      <div>
                        <h3 className="font-semibold">Error Loading Dashboard</h3>
                        <p>{error}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Enhanced Stats Grid - 3 Cards per Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="bg-gradient-to-br from-[#FFF8E1] to-[#FFF8E1] rounded-xl p-6 text-gray-800 transform hover:scale-105 transition-transform duration-200 shadow-lg border-2 border-[#FFF8E1]">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-600 text-sm font-medium">My Enrolled Courses</p>
                            <div className="flex items-center space-x-2">
                              <p className="text-3xl font-bold">
                                {enrollmentLoading ? '...' : (dashboardData?.stats?.enrolledCourses || 0)}
                              </p>
                              {enrollmentLoading && (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-800 border-t-transparent"></div>
                              )}
                            </div>
                            <p className="text-gray-700 text-xs mt-1">Active enrollments</p>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="text-3xl opacity-80 mb-2">📚</div>
                            <button
                              onClick={refreshEnrollmentData}
                              disabled={enrollmentLoading}
                              className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded-full transition-colors disabled:opacity-50"
                            >
                              🔄
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-[#FFF8E1] to-[#FFF8E1] rounded-xl p-6 text-gray-800 transform hover:scale-105 transition-transform duration-200 shadow-lg border-2 border-[#FFF8E1]">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-600 text-sm font-medium">Completed</p>
                            <p className="text-3xl font-bold">{dashboardData?.stats?.completedCourses || 0}</p>
                            <p className="text-gray-700 text-xs mt-1">+1 this week</p>
                          </div>
                          <div className="text-3xl opacity-80">✅</div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-[#FFF8E1] to-[#FFF8E1] rounded-xl p-6 text-gray-800 transform hover:scale-105 transition-transform duration-200 shadow-lg border-2 border-[#FFF8E1]">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-600 text-sm font-medium">My Certificate</p>
                            <p className="text-3xl font-bold">{dashboardData?.stats?.totalPoints || 0}</p>
                            <p className="text-gray-700 text-xs mt-1">Rank #{dashboardData?.stats?.rank || 0}</p>
                          </div>
                          <div className="text-3xl opacity-80">🏆</div>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Recent Courses and Assignments */}
                    <div className=" grid-cols-1 xl:grid-cols-3 gap-8">
                      {/* Recent Courses - Enhanced */}
                      <div className="xl:col-span-2 bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 shadow-lg border border-gray-100">
                        <div className="flex items-center mb-6">
                          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                            <span className="mr-2">📚</span>
                            My Enrolled Courses
                          </h3>
                        </div>
                        <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                          {dashboardData?.recentCourses && dashboardData.recentCourses.length > 0 ? (
                            dashboardData.recentCourses.map((course) => {
                              console.log(`🎯 COURSE OBJECT FROM /my-courses:`, course);

                              // The progress should now come correctly from the backend
                              const courseProgress = course.progress || 0;

                              console.log(`🎯 COURSE: ${getString(course.title)} - Progress: ${courseProgress}%`);
                              const isCompleted = courseProgress >= 100;
                              const isInProgress = courseProgress > 0 && courseProgress < 100;
                              const isNew = courseProgress === 0;

                              // Get progress color based on percentage
                              const getProgressColor = (progress) => {
                                if (progress >= 100) return 'bg-orange-500';
                                if (progress >= 75) return 'bg-blue-500';
                                if (progress >= 50) return 'bg-yellow-500';
                                if (progress >= 25) return 'bg-orange-500';
                                return 'bg-gray-400';
                              };

                              // Robust fallback for all fields that may be objects
                              const getString = (val) => {
                                if (val == null) return '';
                                if (typeof val === 'string' || typeof val === 'number') return val;
                                if (typeof val === 'object') {
                                  if ('name' in val) return val.name;
                                  if ('title' in val) return val.title;
                                  return JSON.stringify(val);
                                }
                                return String(val);
                              };
                              return (
                                <div key={course.id || course._id} className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 hover:border-[#988913]">
                                  <div className="flex items-start space-x-4">
                                    <div className="relative flex-shrink-0">
                                      <img
                                        src={getString(course.thumbnail)}
                                        alt={getString(course.title)}
                                        className="w-24 h-24 rounded-lg object-cover"
                                        onError={(e) => {
                                          e.target.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=150';
                                        }}
                                      />
                                      {isCompleted && (
                                        <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full border-2 border-white shadow-lg flex items-center animate-pulse">
                                          <span className="mr-1">✓</span>
                                          100%
                                        </div>
                                      )}
                                      {isInProgress && (
                                        <div className={`absolute -top-2 -right-2 ${getProgressColor(courseProgress)} text-white text-xs px-2 py-1 rounded-full border-2 border-white shadow-lg flex items-center`}>
                                          <span className="mr-1">⏳</span>
                                          {Math.round(courseProgress)}%
                                        </div>
                                      )}
                                      {isNew && (
                                        <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full border-2 border-white shadow-lg flex items-center">
                                          <span className="mr-1">🆕</span>
                                          Start
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between mb-2">
                                        <h4 className="font-semibold text-gray-900 text-base leading-tight">{getString(course.title)}</h4>
                                        {isCompleted && (
                                          <span className="flex items-center text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-semibold ml-2 whitespace-nowrap">
                                            <span className="mr-1">🏆</span>
                                            Certificate
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-600 flex items-center mb-2">
                                        <span className="mr-1">👨‍🏫</span>
                                        {getString(course.instructor)}
                                      </p>
                                      <div className="flex items-center space-x-3 mb-3 text-xs text-gray-500">
                                        <span className="flex items-center">
                                          <span className="mr-1">⏱️</span>
                                          {getString(course.duration)}
                                        </span>
                                        <span className="flex items-center">
                                          <span className="mr-1">📅</span>
                                          {getString(course.lastAccessed)}
                                        </span>
                                      </div>
                                      <div>
                                        <div className="flex items-center justify-between text-xs mb-1">
                                          <span className="text-gray-600 font-medium">Progress</span>
                                          <span className={`font-semibold transition-colors duration-300 ${isCompleted ? 'text-orange-600' :
                                            isInProgress ? 'text-blue-600' : 'text-gray-800'
                                            }`}>
                                            {Math.round(courseProgress)}%
                                            {isCompleted && <span className="ml-1">🎉</span>}
                                            {isInProgress && <span className="ml-1">🚀</span>}
                                          </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                                          <div
                                            className={`h-full rounded-full transition-all duration-1000 ease-in-out relative ${isCompleted
                                              ? 'bg-gradient-to-r from-orange-400 to-orange-500 animate-pulse'
                                              : isInProgress
                                                ? `${getProgressColor(courseProgress).replace('bg-', 'bg-gradient-to-r from-')} to-blue-500`
                                                : 'bg-gradient-to-r from-gray-400 to-gray-500'
                                              }`}
                                            style={{ width: `${Math.max(2, Math.round(courseProgress))}%` }}
                                          >
                                            {isInProgress && (
                                              <div className="absolute top-0 right-0 w-2 h-full bg-white bg-opacity-30 animate-pulse"></div>
                                            )}
                                          </div>
                                        </div>
                                        {/* Progress status text */}
                                        <div className="text-xs text-gray-500 mt-1">
                                          {isCompleted ? '✅ Course Completed!' :
                                            isInProgress ? `🔄 ${Math.round(100 - courseProgress)}% remaining` :
                                              '⭐ Ready to start'}
                                        </div>
                                      </div>

                                      {/* Course Action Button */}
                                      <div className="mt-3">
                                        <button
                                          onClick={() => handleCourseNavigation(course)}
                                          className={`w-full px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center space-x-2 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 ${isCompleted
                                            ? 'bg-gradient-to-r from-orange-500 to-emerald-600 hover:from-orange-600 hover:to-emerald-700 text-white'
                                            : isInProgress
                                              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white'
                                              : 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white'
                                            }`}
                                        >
                                          <span>
                                            {isCompleted ? '🎓' : isInProgress ? '📖' : '🚀'}
                                          </span>
                                          <span>
                                            {isCompleted ? 'Review Course' : isInProgress ? 'Continue Learning' : 'Start Course'}
                                          </span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-gray-500 text-center py-8">No enrolled courses found.</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Upcoming Assignments and Quizzes Section */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                      {/* Upcoming Assignments */}
                      <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-6 shadow-lg border border-blue-100">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                            <span className="mr-2">📝</span>
                            Recent Assignments
                            <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                              {dashboardData?.upcomingAssignments?.length || 0}
                            </span>
                          </h3>
                          <button
                            onClick={() => handleMenuItemClick('Assignments')}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
                          >
                            View All →
                          </button>
                        </div>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                          {dashboardData?.upcomingAssignments && dashboardData.upcomingAssignments.length > 0 ? (
                            dashboardData.upcomingAssignments.slice(0, 5).map((assignment, index) => {
                              const isSubmitted = assignment.status === 'submitted' || assignment.status === 'completed' || assignment.status === 'graded';
                              const isPending = assignment.status === 'pending' || assignment.status === 'available';
                              const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
                              const isOverdue = dueDate && new Date() > dueDate && !isSubmitted;

                              return (
                                <div key={assignment.id || assignment._id || index}
                                  className={`bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 hover:border-blue-300 ${isOverdue ? 'border-red-200 bg-red-50' : ''
                                    }`}>
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-gray-900 text-sm leading-tight mb-1">
                                        {assignment.title || 'Untitled Assignment'}
                                      </h4>
                                      <p className="text-xs text-gray-600 flex items-center mb-2">
                                        <span className="mr-1">📚</span>
                                        {assignment.course || assignment.courseName || 'Unknown Course'}
                                      </p>
                                    </div>
                                    <div className="flex-shrink-0 ml-3">
                                      {isSubmitted && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                          <span className="mr-1">✓</span>
                                          Submitted
                                        </span>
                                      )}
                                      {isPending && (
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${isOverdue ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                          }`}>
                                          <span className="mr-1">{isOverdue ? '⚠️' : '⏳'}</span>
                                          {isOverdue ? 'Overdue' : 'Pending'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span className="flex items-center">
                                      <span className="mr-1">📅</span>
                                      Due: {dueDate ? dueDate.toLocaleDateString() : 'No due date'}
                                    </span>
                                    {assignment.maxMarks && (
                                      <span className="flex items-center">
                                        <span className="mr-1">🎯</span>
                                        {assignment.maxMarks} marks
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-8">
                              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-blue-500 text-2xl">📝</span>
                              </div>
                              <p className="text-sm text-gray-500 mb-2">No assignments yet</p>
                              <p className="text-xs text-gray-400">Check back later for new assignments</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Upcoming Quizzes */}
                      <div className="bg-gradient-to-br from-orange-50 to-white rounded-xl p-6 shadow-lg border border-orange-100">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                            <span className="mr-2">❓</span>
                            Recent Quizzes
                            <span className="ml-2 bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                              {dashboardData?.upcomingQuizzes?.length || 0}
                            </span>
                          </h3>
                          <button
                            onClick={() => handleMenuItemClick('Quizzes')}
                            className="text-orange-600 hover:text-orange-800 font-medium text-sm transition-colors"
                          >
                            View All →
                          </button>
                        </div>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                          {dashboardData?.upcomingQuizzes && dashboardData.upcomingQuizzes.length > 0 ? (
                            dashboardData.upcomingQuizzes.slice(0, 5).map((quiz, index) => {
                              const isCompleted = quiz.status === 'completed';
                              const isAvailable = quiz.status === 'available';
                              const isAttempted = quiz.status === 'attempted';
                              const dueDate = quiz.dueDate ? new Date(quiz.dueDate) : null;

                              const handleQuizClick = () => {
                                console.log('Quiz clicked:', quiz);
                                // Navigate to quiz based on status
                                if (isCompleted) {
                                  // Show quiz results
                                  handleMenuItemClick('Quizzes');
                                } else if (isAvailable || isAttempted) {
                                  // Start or continue quiz
                                  handleMenuItemClick('Quizzes');
                                }
                              };

                              return (
                                <div key={quiz.id || quiz._id || index}
                                  onClick={handleQuizClick}
                                  className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 hover:border-orange-300 cursor-pointer group">
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-gray-900 text-sm leading-tight mb-1 group-hover:text-orange-600 transition-colors">
                                        {quiz.title || 'Untitled Quiz'}
                                      </h4>
                                      <p className="text-xs text-gray-600 flex items-center mb-2">
                                        <span className="mr-1">📚</span>
                                        {quiz.course || quiz.courseName || 'Unknown Course'}
                                      </p>
                                    </div>
                                    <div className="flex-shrink-0 ml-3">
                                      {isCompleted && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                          <span className="mr-1">✓</span>
                                          Completed
                                        </span>
                                      )}
                                      {isAttempted && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                          <span className="mr-1">🔄</span>
                                          In Progress
                                        </span>
                                      )}
                                      {isAvailable && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                          <span className="mr-1">▶️</span>
                                          Available
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                                    <span className="flex items-center">
                                      <span className="mr-1">❓</span>
                                      {quiz.totalQuestions || quiz.questions_count || 0} questions
                                    </span>
                                    <span className="flex items-center">
                                      <span className="mr-1">⏱️</span>
                                      {quiz.timeLimit || quiz.time_limit || 30} min
                                    </span>
                                  </div>
                                  {quiz.score !== undefined && quiz.score !== null && (
                                    <div className="mt-2 pt-2 border-t border-gray-100">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-600">Your Score:</span>
                                        <span className={`font-semibold ${quiz.score >= 80 ? 'text-orange-600' : quiz.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                          {quiz.score}%
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Action Button */}
                                  <div className="mt-3 pt-2 border-t border-gray-100">
                                    <button className="w-full text-center text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors group-hover:underline">
                                      {isCompleted ? '👁️ View Results' : isAttempted ? '▶️ Continue Quiz' : '🚀 Start Quiz'}
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-8">
                              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-orange-500 text-2xl">❓</span>
                              </div>
                              <p className="text-sm text-gray-500 mb-2">No quizzes yet</p>
                              <p className="text-xs text-gray-400">Check back later for new quizzes</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Achievements - Comprehensive Layout */}
                    <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl p-6 shadow-lg border border-purple-100">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                          <span className="mr-2">🏆</span>
                          Recent Achievements
                        </h3>
                        <button
                          onClick={() => setShowAchievementsModal(true)}
                          className="text-purple-600 hover:text-purple-800 font-medium text-sm transition-colors"
                        >
                          View All →
                        </button>
                      </div>

                      {dashboardData?.achievements && dashboardData.achievements.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          {/* Left Side - Progress Summary */}
                          <div className="space-y-6">
                            <div>
                              <h4 className="text-lg font-semibold text-gray-800 mb-4">Progress Summary</h4>

                              {/* Overall Progress Circle */}
                              <div className="flex items-center justify-between mb-6">
                                <div className="relative">
                                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                                    <circle
                                      cx="50"
                                      cy="50"
                                      r="40"
                                      stroke="#e5e7eb"
                                      strokeWidth="8"
                                      fill="transparent"
                                    />
                                    <circle
                                      cx="50"
                                      cy="50"
                                      r="40"
                                      stroke="url(#gradient)"
                                      strokeWidth="8"
                                      fill="transparent"
                                      strokeDasharray={`${(dashboardData.stats?.avgProgress || 0) * 2.51} 251`}
                                      className="transition-all duration-1000 ease-out"
                                    />
                                    <defs>
                                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#3b82f6" />
                                        <stop offset="100%" stopColor="#10b981" />
                                      </linearGradient>
                                    </defs>
                                  </svg>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center">
                                      <div className="text-2xl font-bold text-gray-900">{dashboardData.stats?.avgProgress || 0}%</div>
                                      <div className="text-xs text-gray-500">Overall Progress</div>
                                    </div>
                                  </div>
                                </div>

                                {/* Summary Stats */}
                                <div className="space-y-3">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                                      <span className="text-yellow-600">🏆</span>
                                    </div>
                                    <div>
                                      <div className="text-lg font-semibold text-gray-900">
                                        {dashboardData.stats?.avgProgress || 0}%
                                      </div>
                                      <div className="text-xs text-gray-500">Avg. Progress</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                                      <span className="text-orange-600">🎓</span>
                                    </div>
                                    <div>
                                      <div className="text-lg font-semibold text-gray-900">
                                        {dashboardData.stats?.completedCourses || 0}
                                      </div>
                                      <div className="text-xs text-gray-500">Courses Completed</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                      <span className="text-purple-600">⭐</span>
                                    </div>
                                    <div>
                                      <div className="text-lg font-semibold text-gray-900">
                                        {dashboardData.stats?.certificatesEarned || 0}
                                      </div>
                                      <div className="text-xs text-gray-500">Certificates Earned</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Detailed Activity Feed */}
                            <div>
                              <h4 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h4>
                              <div className="space-y-3">
                                {dashboardData.achievements && dashboardData.achievements.length > 0 ? (
                                  dashboardData.achievements.slice(0, 4).map((achievement, index) => (
                                    <div key={achievement.id || index} className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-gray-100">
                                      <div className="flex-shrink-0">
                                        {achievement.type === 'assignment' ? (
                                          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                                            <span className="text-orange-600">📝</span>
                                          </div>
                                        ) : achievement.type === 'quiz' ? (
                                          <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                                            <span className="text-yellow-600">🧠</span>
                                          </div>
                                        ) : achievement.type === 'certificate' ? (
                                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <span className="text-blue-600">🎓</span>
                                          </div>
                                        ) : (
                                          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                            <span className="text-purple-600">{achievement.icon || '🏆'}</span>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900">
                                          {achievement.title || achievement.courseName || achievement.assignmentTitle || 'Achievement Unlocked'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {achievement.description ||
                                            (achievement.type === 'assignment' ? 'Assignment completed' :
                                              achievement.type === 'quiz' ? 'Quiz completed' :
                                                achievement.type === 'certificate' ? 'Certificate earned' : 'Achievement earned')}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                          {achievement.earnedDate || achievement.submittedAt || achievement.completedAt ||
                                            (achievement.date ? new Date(achievement.date).toLocaleDateString() : 'Recently')}
                                        </p>
                                      </div>
                                      {achievement.score && (
                                        <div className="text-sm font-medium text-orange-600">
                                          {achievement.score}%
                                        </div>
                                      )}
                                      {achievement.type === 'certificate' && (
                                        <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                                          View
                                        </button>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                      <span className="text-gray-400 text-2xl">🎯</span>
                                    </div>
                                    <p className="text-sm text-gray-500 mb-2">No recent activity yet</p>
                                    <p className="text-xs text-gray-400">Complete assignments and quizzes to see your activity here</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right Side - Badges and Milestones */}
                          <div className="space-y-6">
                            {/* Your Badges */}
                            <div>
                              <h4 className="text-lg font-semibold text-gray-800 mb-4">Your Badges</h4>
                              <div className="grid grid-cols-3 gap-3">
                                {dashboardData.achievements && dashboardData.achievements.length > 0 ? (
                                  dashboardData.achievements.slice(0, 6).map((achievement, index) => (
                                    <div key={`badge-${achievement.id || index}`} className="relative group">
                                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl cursor-pointer transition-all duration-200 hover:scale-110 ${achievement.type === 'certificate' ? 'bg-gradient-to-br from-blue-400 to-blue-600 text-white' :
                                        achievement.type === 'quiz' ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' :
                                          achievement.type === 'assignment' ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' :
                                            achievement.rarity === 'epic' ? 'bg-gradient-to-br from-purple-400 to-purple-600 text-white' :
                                              achievement.rarity === 'rare' ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' :
                                                index % 3 === 0 ? 'bg-gradient-to-br from-red-400 to-red-600 text-white' :
                                                  index % 3 === 1 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' :
                                                    'bg-gradient-to-br from-blue-400 to-blue-600 text-white'
                                        } shadow-lg`}>
                                        {achievement.icon ||
                                          (achievement.type === 'certificate' ? '🎓' :
                                            achievement.type === 'quiz' ? '🧠' :
                                              achievement.type === 'assignment' ? '📝' : '🏆')}
                                      </div>
                                      {/* Tooltip */}
                                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                        {achievement.title || achievement.courseName || 'Badge'}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  // Show placeholder badges when no achievements
                                  [1, 2, 3, 4, 5, 6].map((_, index) => (
                                    <div key={`placeholder-${index}`} className="relative group">
                                      <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl bg-gray-100 text-gray-400 shadow-sm">
                                        🔒
                                      </div>
                                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                        Badge locked
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Next Milestone */}
                            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-4 border border-orange-200">
                              <div className="flex items-center mb-3">
                                <span className="text-orange-500 text-lg mr-2">⚡</span>
                                <h4 className="font-semibold text-gray-800">Next Milestone</h4>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm text-gray-700">
                                  Complete {Math.max(1, 5 - (dashboardData.achievements?.length || 0))} more assignments to earn the
                                  <strong className="text-orange-600"> "Coding Pro"</strong> badge!
                                </p>
                                <div className="w-full bg-orange-200 rounded-full h-2">
                                  <div
                                    className="bg-gradient-to-r from-orange-400 to-orange-600 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, ((dashboardData.achievements?.length || 0) / 5) * 100)}%` }}
                                  ></div>
                                </div>
                                <p className="text-xs text-orange-600 font-medium">
                                  {dashboardData.achievements?.length || 0}/5 achievements unlocked
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="text-6xl mb-4">🏆</div>
                          <h4 className="text-lg font-medium text-gray-700 mb-2">Start Your Achievement Journey!</h4>
                          <p className="text-gray-500 mb-4">Complete assignments, take quizzes, and finish courses to earn achievements</p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                              <div className="text-2xl mb-2">📝</div>
                              <p className="text-sm text-gray-600">Complete assignments to earn <strong>Assignment Master</strong></p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                              <div className="text-2xl mb-2">🧠</div>
                              <p className="text-sm text-gray-600">Take quizzes to become a <strong>Quiz Champion</strong></p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                              <div className="text-2xl mb-2">🎓</div>
                              <p className="text-sm text-gray-600">Finish courses to earn <strong>Certificates</strong></p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                      <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                        <span className="mr-2">⚡</span>
                        Quick Actions
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <button
                          onClick={() => handleMenuItemClick('BrowseCourses')}
                          onMouseEnter={() => preloadComponent('BrowseCourses')}
                          className={`flex flex-col items-center p-4 rounded-xl transition-colors border ${activeMenuItem === 'BrowseCourses' ? 'bg-gradient-to-r from-[#FFF8E1] to-[#FFF8E1] text-gray-800 border-gray-300' : 'bg-white text-gray-700 border-gray-200 hover:bg-[#FFF8E1] hover:border-gray-300'}`}
                        >
                          <span className="text-2xl mb-2">🔍</span>
                          <span className="text-sm font-medium">Browse Courses</span>
                        </button>
                        <button
                          onClick={() => handleMenuItemClick('Assignments')}
                          onMouseEnter={() => preloadComponent('Assignments')}
                          className={`flex flex-col items-center p-4 rounded-xl transition-colors border ${activeMenuItem === 'Assignments' ? 'bg-gradient-to-r from-[#FFF8E1] to-[#FFF8E1] text-gray-800 border-gray-300' : 'bg-white text-gray-700 border-gray-200 hover:bg-[#FFF8E1] hover:border-gray-300'}`}
                        >
                          <span className="text-2xl mb-2">📝</span>
                          <span className="text-sm font-medium">View Assignments</span>
                        </button>
                        <button
                          onClick={() => handleMenuItemClick('Quizzes')}
                          onMouseEnter={() => preloadComponent('Quizzes')}
                          className={`flex flex-col items-center p-4 rounded-xl transition-colors border ${activeMenuItem === 'Quizzes' ? 'bg-gradient-to-r from-[#FFF8E1] to-[#FFF8E1] text-gray-800 border-gray-300' : 'bg-white text-gray-700 border-gray-200 hover:bg-[#FFF8E1] hover:border-gray-300'}`}
                        >
                          <span className="text-2xl mb-2">❓</span>
                          <span className="text-sm font-medium">Take Quiz</span>
                        </button>
                        <button
                          onClick={() => handleMenuItemClick('Live Sessions')}
                          onMouseEnter={() => preloadComponent('Live Sessions')}
                          className={`flex flex-col items-center p-4 rounded-xl transition-colors border ${activeMenuItem === 'Live Sessions' ? 'bg-gradient-to-r from-[#FFF8E1] to-[#FFF8E1] text-gray-800 border-gray-300' : 'bg-white text-gray-700 border-gray-200 hover:bg-[#FFF8E1] hover:border-gray-300'}`}
                        >
                          <span className="text-2xl mb-2">🎥</span>
                          <span className="text-sm font-medium">Join Session</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ComponentWrapper>
        );
    }
  };

  // Show minimal loading only during critical auth failure
  if (loading && !userAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFF8E1] via-[#FFF8E1] to-[#FFF8E1] flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-gray-200 border-t-gray-800 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 bg-gradient-to-r from-[#FFF8E1] to-[#FFF8E1] rounded-full animate-pulse border border-gray-300"></div>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            <h3 className="text-xl font-semibold text-gray-700">Verifying Access</h3>
            <p className="text-gray-500">Please wait a moment...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!userAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Access Denied</h3>
          <p className="text-gray-500">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar with independent scroll */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-white to-gray-50 shadow-2xl transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out lg:translate-x-0 z-50 border-r border-gray-200 flex flex-col`}>
        <div className="flex-shrink-0">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#FFF8E1] to-[#FFF8E1] border-2 border-gray-300">
            <div className="text-gray-800">
              <h1 className="text-xl font-bold">

              </h1>
              <p className="text-gray-700 text-sm">Learning Dashboard</p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-800 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
        <nav className="mt-6 px-3 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleMenuItemClick(item.id)}
              onMouseEnter={() => preloadComponent(item.id)}
              className={`w-full flex items-center px-4 py-3 mb-2 rounded-xl text-left transition-all duration-150 transform hover:scale-105 ${activeMenuItem === item.id
                ? 'bg-gradient-to-r from-[#FFF8E1] to-[#FFF8E1] text-gray-800 shadow-lg border border-gray-300'
                : 'bg-white text-gray-700 hover:bg-[#FFF8E1] hover:shadow-md border border-gray-100'
                }`}
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
              {activeMenuItem === item.id && (
                <span className="ml-auto text-gray-800">◆</span>
              )}
            </button>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="px-3 pb-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 mb-2 rounded-xl text-left transition-all duration-150 transform hover:scale-105 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 hover:border-red-300"
          >
            <span className="mr-3 text-lg">🚪</span>
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Main content with independent scroll */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Enhanced Top navbar with better gradient and styling */}
        <div className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-500 hover:text-gray-700 mr-4 p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 transform hover:scale-105"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-700 bg-clip-text text-transparent">
                  {activeMenuItem}
                </h2>
                <p className="text-sm text-gray-600 font-medium">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Enhanced Search Bar */}
              <div className="hidden md:block relative">
                <input
                  type="text"
                  placeholder="Search courses, assignments..."
                  className="pl-12 pr-4 py-3 w-80 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-gray-50 transition-all duration-200 placeholder-gray-500"
                />
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              {/* Profile dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <img
                    src={studentProfile.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}
                    alt={studentProfile.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                  />
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-700">{studentProfile.name}</p>
                    <p className="text-xs text-gray-500">{studentProfile.role}</p>
                  </div>
                  <span className="text-gray-400 transition-transform duration-200">
                    {showProfileDropdown ? '▲' : '▼'}
                  </span>
                </button>
                {showProfileDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-10">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{studentProfile.name}</p>
                      <p className="text-xs text-gray-600">{studentProfile.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowProfileModal(true);
                        setShowProfileDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <span className="mr-2">👤</span>
                      View Profile
                    </button>
                    <button
                      onClick={() => {
                        setShowUpdateProfileModal(true);
                        setShowProfileDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <span className="mr-2">✏️</span>
                      Edit Profile
                    </button>
                    <button
                      onClick={() => handleMenuItemClick('Settings')}
                      onMouseEnter={() => preloadComponent('Settings')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <span className="mr-2">⚙️</span>
                      Settings
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Page content with independent scroll */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-gray-50 to-white scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {renderActiveComponent()}
        </div>
      </div>

      {/* Enhanced Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] overflow-y-auto shadow-2xl transform transition-all duration-300 scale-100 relative">
            {/* Close Button */}
            <button
              onClick={() => setShowProfileModal(false)}
              className="absolute top-4 right-4 z-10 bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-800 rounded-full p-2 shadow-lg transition-all duration-200 border border-gray-300"
              title="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="p-8">
              <div className="text-center mb-8">
                <h3 className="text-4xl font-bold mb-6 text-gray-900 bg-gradient-to-r from-gray-800 to-gray-700 bg-clip-text text-transparent">
                  Student Profile
                </h3>
                <div className="relative inline-block mb-6">
                  <img
                    src={studentProfile.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}
                    alt={studentProfile.name}
                    className="w-32 h-32 rounded-full object-cover border-4 border-[#FFF8E1] shadow-xl"
                  />
                  <div className="absolute -top-2 -right-2 bg-orange-500 w-8 h-8 rounded-full border-3 border-white flex items-center justify-center">
                    <span className="text-white text-sm">✓</span>
                  </div>
                </div>
                <h4 className="text-3xl font-bold text-gray-900 mb-2">{studentProfile.name}</h4>
                <p className="text-gray-800 font-medium mb-6 bg-[#FFF8E1] px-6 py-3 rounded-full inline-block border border-gray-300 text-lg">
                  {studentProfile.role}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                <div className="space-y-5 bg-gradient-to-br from-gray-50 to-[#FFF8E1] rounded-xl p-6 border border-gray-100">
                  <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <span className="mr-2">👤</span> Personal Information
                  </h4>
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <span className="text-gray-600 font-medium flex items-center">
                      <span className="mr-2">📧</span> Email:
                    </span>
                    <span className="text-gray-900 font-semibold">{studentProfile.email}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <span className="text-gray-600 font-medium flex items-center">
                      <span className="mr-2">📱</span> Phone:
                    </span>
                    <span className="text-gray-900 font-semibold">{studentProfile.phone}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <span className="text-gray-600 font-medium flex items-center">
                      <span className="mr-2">📅</span> Joined:
                    </span>
                    <span className="text-gray-900 font-semibold">{studentProfile.joinDate}</span>
                  </div>
                </div>

                <div className="space-y-5 bg-gradient-to-br from-gray-50 to-[#FFF8E1] rounded-xl p-6 border border-gray-100">
                  <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <span className="mr-2">🎓</span> Academic Information
                  </h4>
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <span className="text-gray-600 font-medium flex items-center">
                      <span className="mr-2">🎓</span> Student ID:
                    </span>
                    <span className="text-gray-900 font-bold bg-blue-100 text-blue-800 px-4 py-2 rounded-lg text-lg">
                      {studentProfile.user_id || 'STU001'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <span className="text-gray-600 font-medium flex items-center">
                      <span className="mr-2">🏢</span> Department:
                    </span>
                    <span className="text-gray-900 font-semibold">{studentProfile.department}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <span className="text-gray-600 font-medium flex items-center">
                      <span className="mr-2">�</span> Semester:
                    </span>
                    <span className="text-gray-900 font-semibold">{studentProfile.semester}</span>
                  </div>
                </div>

                <div className="space-y-5 bg-gradient-to-br from-gray-50 to-[#FFF8E1] rounded-xl p-6 border border-gray-100">
                  <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <span className="mr-2">📊</span> Learning Progress
                  </h4>
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <span className="text-gray-600 font-medium flex items-center">
                      <span className="mr-2">📊</span> Level:
                    </span>
                    <span className="bg-gradient-to-r from-[#FFF8E1] to-[#FFF8E1] text-gray-800 px-4 py-2 rounded-full text-sm font-bold shadow-lg border border-gray-300">
                      {studentProfile.level}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <span className="text-gray-600 font-medium flex items-center">
                      <span className="mr-2">⭐</span> Points:
                    </span>
                    <span className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                      {studentProfile.points}
                    </span>
                  </div>
                </div>

                <div className="space-y-5 bg-gradient-to-br from-gray-50 to-[#FFF8E1] rounded-xl p-6 border border-gray-100">
                  <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <span className="mr-2">📈</span> Quick Stats
                  </h4>
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <span className="text-gray-600 font-medium flex items-center">
                      <span className="mr-2">📚</span> Enrolled Courses:
                    </span>
                    <span className="text-gray-900 font-bold text-xl">{dashboardData?.stats?.enrolledCourses || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <span className="text-gray-600 font-medium flex items-center">
                      <span className="mr-2">✅</span> Completed:
                    </span>
                    <span className="text-gray-900 font-bold text-xl">{dashboardData?.stats?.completedCourses || 0}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center space-x-4 mt-8">
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="px-8 py-3 text-gray-600 hover:text-gray-800 transition-colors font-medium rounded-lg hover:bg-gray-100 border border-gray-300"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowProfileModal(false);
                    setShowUpdateProfileModal(true);
                  }}
                  className="px-8 py-3 bg-gradient-to-r from-[#FFF8E1] to-[#FFF8E1] text-gray-800 rounded-lg hover:from-gray-100 hover:to-gray-100 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 border border-gray-300"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Enhanced Update Profile Modal */}
      {showUpdateProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
            {/* Close Button */}
            <button
              onClick={() => {
                setShowUpdateProfileModal(false);
              }}
              className="absolute top-4 right-4 z-10 bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-800 rounded-full p-2 shadow-lg transition-all duration-200 border border-gray-300"
              title="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="p-8">
              <h3 className="text-3xl font-bold mb-8 text-gray-900 text-center bg-gradient-to-r from-gray-800 to-gray-700 bg-clip-text text-transparent">
                Update Profile
              </h3>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                handleUpdateProfile({
                  name: formData.get('name'),
                  email: formData.get('email'),
                  phone: formData.get('phone'),
                  level: formData.get('level'),
                  department: formData.get('department')
                });
              }}>
                <div className="space-y-6 max-w-2xl mx-auto">
                  {/* Profile Details */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📝 Full Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        defaultValue={studentProfile.name}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFF8E1] focus:border-transparent transition-colors"
                        placeholder="Enter your full name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📧 Email Address
                      </label>
                      <input
                        type="email"
                        name="email"
                        defaultValue={studentProfile.email}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFF8E1] focus:border-transparent transition-colors"
                        placeholder="Enter your email"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📱 Phone Number
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        defaultValue={studentProfile.phone}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFF8E1] focus:border-transparent transition-colors"
                        placeholder="Enter your phone number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        🏢 Department
                      </label>
                      <input
                        type="text"
                        name="department"
                        defaultValue={studentProfile.department}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFF8E1] focus:border-transparent transition-colors"
                        placeholder="Enter your department"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📊 Learning Level
                      </label>
                      <select
                        name="level"
                        defaultValue={studentProfile.level}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFF8E1] focus:border-transparent transition-colors"
                      >
                        <option value="Beginner">🌱 Beginner</option>
                        <option value="Intermediate">🌿 Intermediate</option>
                        <option value="Advanced">🌳 Advanced</option>
                        <option value="Expert">🏆 Expert</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center space-x-4 mt-8">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUpdateProfileModal(false);
                    }}
                    className="px-8 py-3 text-gray-600 hover:text-gray-800 transition-colors font-medium rounded-lg hover:bg-gray-100 border border-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-gradient-to-r from-[#FFF8E1] to-[#FFF8E1] text-gray-800 rounded-lg hover:from-gray-100 hover:to-gray-100 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 border border-gray-300"
                  >
                    💾 Update Profile
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Modal */}
      {showCertificateModal && selectedCourseForCertificate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleCloseCertificateModal}>
          <div className="relative max-w-[95vw] max-h-[95vh] overflow-auto bg-white rounded-lg" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              onClick={handleCloseCertificateModal}
              className="absolute top-4 right-4 z-50 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-all duration-200"
              title="Close Certificate"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Certificate Template */}
            <Suspense fallback={
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3f51b5] mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading certificate...</p>
                </div>
              </div>
            }>
              <CertificateTemplate
                studentName={studentProfile.name || 'Student Name'}
                courseName={selectedCourseForCertificate.title || 'Course Name'}
                instructorName={selectedCourseForCertificate.instructorName || selectedCourseForCertificate.instructor || 'Instructor'}
                courseDuration={selectedCourseForCertificate.duration || 'N/A'}
                completionDate={selectedCourseForCertificate.completionDate || selectedCourseForCertificate.lastAccessed || new Date().toISOString().split('T')[0]}
                certificateId={selectedCourseForCertificate.certificateId || selectedCourseForCertificate.id || selectedCourseForCertificate._id || 'CERT-' + Date.now()}
                certificateNumber={selectedCourseForCertificate.certificateNumber || ''}
                logoUrl="/logo.png"
                londonLogoUrl="/LondonLogo.png"
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* All Achievements Modal */}
      {showAchievementsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-6 flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-3xl mr-3">🏆</span>
                <div>
                  <h2 className="text-2xl font-bold">All Achievements</h2>
                  <p className="text-purple-100">Your learning journey milestones</p>
                </div>
              </div>
              <button
                onClick={() => setShowAchievementsModal(false)}
                className="text-white hover:text-purple-200 text-2xl font-bold transition-colors"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {allAchievements && allAchievements.length > 0 ? (
                <>
                  {/* Achievement Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center">
                      <div className="text-2xl mb-2">🏆</div>
                      <div className="text-2xl font-bold text-purple-600">{allAchievements.length}</div>
                      <div className="text-sm text-purple-700">Total Achievements</div>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 text-center">
                      <div className="text-2xl mb-2">⭐</div>
                      <div className="text-2xl font-bold text-yellow-600">{allAchievements.filter(a => a.rarity === 'epic').length}</div>
                      <div className="text-sm text-yellow-700">Epic Achievements</div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 text-center">
                      <div className="text-2xl mb-2">🎯</div>
                      <div className="text-2xl font-bold text-orange-600">{allAchievements.filter(a => a.rarity === 'rare').length}</div>
                      <div className="text-sm text-orange-700">Rare Achievements</div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 text-center">
                      <div className="text-2xl mb-2">🎓</div>
                      <div className="text-2xl font-bold text-orange-600">{allAchievements.filter(a => a.id === 'certified_learner' || a.id === 'rising_star').length}</div>
                      <div className="text-sm text-orange-700">Certificates</div>
                    </div>
                  </div>

                  {/* All Achievements Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allAchievements.map((achievement) => (
                      <div key={achievement.id} className={`bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border-2 transform hover:scale-105 ${achievement.rarity === 'epic' ? 'border-purple-300 bg-gradient-to-br from-purple-50 to-white' :
                        achievement.rarity === 'rare' ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-white' :
                          'border-gray-200'
                        }`}>
                        <div className="text-center">
                          <div className="text-5xl mb-4">{achievement.icon}</div>
                          <h4 className="font-bold text-gray-900 mb-3 text-lg">{achievement.title}</h4>
                          <p className="text-sm text-gray-600 mb-4 leading-relaxed">{achievement.description}</p>
                          <div className="flex items-center justify-between">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide ${achievement.rarity === 'epic' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                              achievement.rarity === 'rare' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                'bg-gray-100 text-gray-800 border border-gray-200'
                              }`}>
                              {achievement.rarity}
                            </span>
                            <p className="text-xs text-gray-500 font-medium">Earned: {achievement.earnedDate}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-16">
                  <div className="text-8xl mb-6">🏆</div>
                  <h3 className="text-2xl font-bold text-gray-700 mb-4">Start Your Achievement Journey!</h3>
                  <p className="text-gray-500 text-lg mb-8 max-w-2xl mx-auto">
                    Complete assignments, take quizzes, earn certificates, and finish courses to unlock amazing achievements
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                      <div className="text-3xl mb-3">📝</div>
                      <h4 className="font-semibold text-blue-800 mb-2">Assignment Master</h4>
                      <p className="text-sm text-blue-600">Complete assignments to show your dedication</p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
                      <div className="text-3xl mb-3">🧠</div>
                      <h4 className="font-semibold text-orange-800 mb-2">Quiz Champion</h4>
                      <p className="text-sm text-orange-600">Test your knowledge with quizzes</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
                      <div className="text-3xl mb-3">🎓</div>
                      <h4 className="font-semibold text-purple-800 mb-2">Certified Learner</h4>
                      <p className="text-sm text-purple-600">Earn certificates by completing courses</p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
                      <div className="text-3xl mb-3">⭐</div>
                      <h4 className="font-semibold text-orange-800 mb-2">Rising Star</h4>
                      <p className="text-sm text-orange-600">Excel in your studies consistently</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end border-t">
              <button
                onClick={() => setShowAchievementsModal(false)}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
