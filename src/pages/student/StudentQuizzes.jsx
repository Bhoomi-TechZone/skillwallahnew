import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import courseService from '../../services/courseService';
import branchStudentDashboardService from '../../services/branchStudentDashboardService';

// Add custom styles for the modal and enhanced animations
const modalStyles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }
  
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
  
  @keyframes bounce {
    0%, 20%, 53%, 80%, 100% {
      transform: translate3d(0, 0, 0);
    }
    40%, 43% {
      transform: translate3d(0, -10px, 0);
    }
    70% {
      transform: translate3d(0, -5px, 0);
    }
    90% {
      transform: translate3d(0, -2px, 0);
    }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out forwards;
  }
  
  .animate-slideUp {
    animation: slideUp 0.4s ease-out forwards;
  }
  
  .animate-pulse-custom {
    animation: pulse 2s ease-in-out infinite;
  }
  
  .animate-shimmer {
    animation: shimmer 2s linear infinite;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
    background-size: 200% 100%;
  }
  
  .animate-bounce-custom {
    animation: bounce 1s ease-in-out;
  }
  
  .quiz-card-hover {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .quiz-card-hover:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }
  
  .start-quiz-btn {
    background: linear-gradient(135deg, #3B82F6, #1E40AF);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }
  
  .start-quiz-btn:hover {
    background: linear-gradient(135deg, #2563EB, #1D4ED8);
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(59, 130, 246, 0.4);
  }
  
  .start-quiz-btn:active {
    transform: translateY(0);
  }
  
  .start-quiz-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    transition: left 0.6s;
  }
  
  .start-quiz-btn:hover::before {
    left: 100%;
  }
`;

const StudentQuizzes = () => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('all');
  const [showGuidelinesModal, setShowGuidelinesModal] = useState(false);
  const [showQuizStartModal, setShowQuizStartModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [startingQuiz, setStartingQuiz] = useState(false);

  useEffect(() => {
    fetchEnrolledCourses();
  }, []);

  // Update course filter options whenever quizzes change
  useEffect(() => {
    if (quizzes.length > 0) {
      const uniqueCourseNames = [...new Set(quizzes.map(quiz => quiz.course))].filter(Boolean);
      setCourses(uniqueCourseNames);
      console.log(`📚 Updated course filter options with ${uniqueCourseNames.length} courses:`, uniqueCourseNames);
    }
  }, [quizzes]);

  // Add refresh mechanism when returning from quiz
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refresh quiz list when page becomes visible (e.g., returning from quiz)
        console.log('Page became visible, refreshing quiz list...');
        fetchEnrolledCourses();
      }
    };

    // Listen for quiz completion events
    const handleQuizCompleted = (event) => {
      console.log('Quiz completed, refreshing quiz list...', event.detail);
      // Refresh the quiz list to update status
      fetchEnrolledCourses();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('quizCompleted', handleQuizCompleted);

    // Also refresh on window focus
    const handleFocus = () => {
      console.log('Window focused, refreshing quiz list...');
      fetchEnrolledCourses();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('quizCompleted', handleQuizCompleted);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Fetch enrolled courses first, then quizzes
  const fetchEnrolledCourses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      const response = await courseService.getEnrolledCourses();

      let enrolledCoursesData = [];

      // Handle different response structures
      if (response.courses && Array.isArray(response.courses)) {
        enrolledCoursesData = response.courses;
      } else if (Array.isArray(response)) {
        enrolledCoursesData = response;
      } else if (response.data && Array.isArray(response.data)) {
        enrolledCoursesData = response.data;
      } else {
        // Try to find any array in the response object
        for (const key in response) {
          if (Array.isArray(response[key])) {
            enrolledCoursesData = response[key];
            break;
          }
        }
      }

      // Extract course information with enhanced field mapping
      const coursesList = enrolledCoursesData.map(course => ({
        id: course.id || course._id,
        _id: course._id || course.id, // Keep both for better matching
        title: course.title || course.name || course.courseName || 'Untitled Course',
        instructor_name: course.instructor_name ||
          course.instructor ||
          course.instructorName ||
          course.instructor_id?.name ||
          course.created_by?.name ||
          'Instructor Name Not Available'
      }));

      setEnrolledCourses(coursesList);

      // Extract unique course names for the filter dropdown from enrolled courses
      const enrolledCourseNames = [...new Set(coursesList.map(course => course.title))];

      // Now fetch quizzes
      await fetchQuizzes(coursesList);

      // After fetching quizzes, get unique course names from all quizzes for better filtering
      // This will be updated after quiz fetch in the useEffect below

    } catch (error) {
      console.error('Error fetching enrolled courses:', error);

      // Try alternative API endpoints if the primary one fails
      try {
        // Try the courses API to get all courses (as a fallback)
        const allCoursesResponse = await courseService.getCourses({ published: true, limit: 100 });
        console.log('📚 Fetching all courses as fallback for course filter...');

        if (allCoursesResponse && (allCoursesResponse.courses || allCoursesResponse.data)) {
          const coursesData = allCoursesResponse.courses || allCoursesResponse.data || [];

          // Extract course information from all courses
          const coursesList = coursesData.map(course => ({
            id: course.id || course._id,
            _id: course._id || course.id,
            title: course.title || course.name || course.courseName || 'Untitled Course',
            instructor_name: course.instructor_name ||
              course.instructor ||
              course.instructorName ||
              course.instructor_id?.name ||
              course.created_by?.name ||
              'Instructor Name Not Available'
          }));

          setEnrolledCourses(coursesList);
          const uniqueCourseNames = [...new Set(coursesList.map(course => course.title))];
          setCourses(uniqueCourseNames);

          await fetchQuizzes(coursesList);
          return;
        }
      } catch (fallbackError) {
        console.error('Fallback API also failed:', fallbackError);
      }

      // If all API attempts fail, set empty arrays but continue
      setEnrolledCourses([]);
      setCourses([]);
      await fetchQuizzes([]);
    } finally {
      setLoading(false);
    }
  };



  const fetchQuizzes = async (enrolledCoursesList = []) => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔄 Fetching all quizzes...');

      // Check if this is a branch student
      const isBranchStudent = branchStudentDashboardService.isBranchStudent();
      console.log('🎓 [StudentQuizzes] Is branch student:', isBranchStudent);

      let quizzesArray = [];

      if (isBranchStudent) {
        console.log('🏢 [StudentQuizzes] Fetching branch student quizzes...');

        try {
          const branchData = await branchStudentDashboardService.getQuizzes();
          quizzesArray = branchData.quizzes || [];
          console.log('✅ [StudentQuizzes] Branch quizzes loaded:', quizzesArray);

          // Transform branch quiz data to match expected structure
          const transformedQuizzes = quizzesArray.map(quiz => ({
            id: quiz.id || quiz._id,
            title: quiz.title,
            description: quiz.description,
            course_name: quiz.course_name || 'Branch Course',
            instructor_name: quiz.instructor_name || 'Branch Instructor',
            total_questions: quiz.total_questions || 0,
            time_limit: quiz.time_limit || 0,
            status: quiz.status,
            score: quiz.score,
            completed_at: quiz.completed_at,
            due_date: quiz.due_date,
            branch_code: quiz.branch_code
          }));

          setQuizzes(transformedQuizzes);
          console.log(`📊 [StudentQuizzes] Processed ${transformedQuizzes.length} branch quizzes`);
          return;

        } catch (branchError) {
          console.error('❌ [StudentQuizzes] Failed to fetch branch quizzes:', branchError);
          // Fall back to regular quiz fetching
        }
      }

      // Regular student quiz fetching
      console.log('👤 [StudentQuizzes] Fetching regular student quizzes...');

      const response = await fetch('http://localhost:4000/quizzes/', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Raw API Response:', result);

        // Extract quizzes from the response
        if (result.success && Array.isArray(result.data)) {
          quizzesArray = result.data;
        } else if (Array.isArray(result)) {
          quizzesArray = result;
        } else {
          console.warn('Unexpected quiz response format:', result);
          quizzesArray = [];
        }

        console.log(`📊 Processing ${quizzesArray.length} quizzes from API...`);

        // Transform backend data to match frontend format
        const transformedQuizzes = quizzesArray.map(quiz => {
          // Find matching enrolled course to get proper course name and instructor
          const matchingCourse = enrolledCoursesList.find(course =>
            course.id === (quiz.course_id || quiz.course) ||
            course._id === (quiz.course_id || quiz.course)
          );

          // Enhanced course name resolution - use backend course_name directly or fallback
          const courseName = quiz.course_name ||
            matchingCourse?.title ||
            quiz.course_title ||
            quiz.courseName ||
            quiz.course?.title ||
            quiz.course?.name ||
            (typeof quiz.course === 'string' ? quiz.course : null) ||
            'Course Name Unavailable';

          // Enhanced instructor name resolution with multiple fallback options
          const instructorName = matchingCourse?.instructor_name ||
            quiz.instructor_name ||
            quiz.instructorName ||
            quiz.instructor ||
            quiz.course?.instructor ||
            quiz.course?.instructor_name ||
            'Instructor Name Unavailable';
          quiz.instructorName ||
            quiz.instructor ||
            quiz.course?.instructor ||
            quiz.course?.instructor_name ||
            'Instructor Name Unavailable';

          return {
            id: quiz._id || quiz.id,
            title: quiz.title || 'Untitled Quiz',
            description: quiz.description || 'No description available',
            course: courseName,
            courseId: quiz.course_id || quiz.course,
            instructor: instructorName,
            totalQuestions: quiz.questions_count || quiz.total_questions || quiz.questions?.length || 0,
            timeLimit: quiz.time_limit || 30,
            passingScore: quiz.passing_marks || quiz.passing_score || 70,
            points: quiz.total_marks || quiz.points || quiz.total_points || 50,
            difficulty: quiz.difficulty || 'Intermediate',
            status: quiz.status || 'available', // Backend now provides correct status
            attempts: quiz.user_attempts || 0,
            maxAttempts: quiz.attempts_allowed || quiz.max_attempts || 3,
            dueDate: quiz.due_date ? new Date(quiz.due_date).toISOString().split('T')[0] : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            topics: Array.isArray(quiz.topics) ? quiz.topics : [],
            estimatedTime: `${Math.ceil((quiz.time_limit || 30) * 0.8)}-${quiz.time_limit || 30} minutes`,
            // Add progress and last attempt data if available
            progress: quiz.progress || 0,
            questionsAnswered: quiz.questions_answered || 0,
            bestScore: quiz.best_score,
            lastAttempt: quiz.last_attempt ? {
              score: quiz.last_attempt.score,
              completedDate: new Date(quiz.last_attempt.completed_at).toISOString().split('T')[0],
              timeSpent: quiz.last_attempt.time_spent,
              passed: quiz.last_attempt.passed
            } : null
          };
        });

        console.log(`✅ Transformed ${transformedQuizzes.length} quizzes successfully`);

        // Show all quizzes instead of filtering by enrolled courses
        // This allows students to see all available quizzes across the platform
        setQuizzes(transformedQuizzes);

        // Optional: Log course coverage for debugging
        if (enrolledCoursesList.length > 0) {
          const enrolledCourseNames = enrolledCoursesList.map(course => course.title);
          const quizzesFromEnrolledCourses = transformedQuizzes.filter(quiz => {
            const matchByName = enrolledCourseNames.some(courseName =>
              courseName.toLowerCase().trim() === quiz.course.toLowerCase().trim()
            );
            return matchByName;
          });
          console.log(`📊 Found ${quizzesFromEnrolledCourses.length} quizzes from enrolled courses, showing all ${transformedQuizzes.length} quizzes`);
        }

      } else {
        console.error('Failed to fetch quizzes. Status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);

        // Fallback to mock data
        handleQuizzesFallback(enrolledCoursesList, 'API_ERROR');
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);

      // Fallback to mock data
      handleQuizzesFallback(enrolledCoursesList, 'NETWORK_ERROR');
    }
  };

  // Helper function to handle fallback with quiz data
  const handleQuizzesFallback = (enrolledCoursesList, errorType) => {
    console.log(`Using fallback mock quizzes due to ${errorType}`);

    // Show all mock quizzes regardless of enrollment
    setQuizzes(mockQuizzes);
  };

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesTab = activeTab === 'all' || quiz.status === activeTab;
    const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quiz.course.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = filterCourse === 'all' || quiz.course === filterCourse;

    return matchesTab && matchesSearch && matchesCourse;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-orange-100 text-orange-800';
      case 'missed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Beginner':
        return 'bg-orange-100 text-orange-800';
      case 'Intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'Advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysRemaining = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const quizCounts = {
    all: quizzes.length,
    available: quizzes.filter(q => q.status === 'available').length,
    'in-progress': quizzes.filter(q => q.status === 'in-progress').length,
    completed: quizzes.filter(q => q.status === 'completed').length
  };

  // Handle quiz start with enhanced confirmation
  const handleStartQuiz = (quiz) => {
    setSelectedQuiz(quiz);
    setShowQuizStartModal(true);
  };

  // Handle actual quiz navigation with loading state
  const handleConfirmStartQuiz = async () => {
    if (!selectedQuiz) return;

    setStartingQuiz(true);

    // Simulate preparation time (in real app, this might be API calls)
    setTimeout(() => {
      // Ensure scroll position is reset before navigating
      window.scrollTo(0, 0);
      navigate(`/student/quiz/${selectedQuiz.id || selectedQuiz._id}/take`);
      setStartingQuiz(false);
      setShowQuizStartModal(false);
      setSelectedQuiz(null);
    }, 2000);
  };

  // Handle ESC key press to close modal
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && showGuidelinesModal) {
        setShowGuidelinesModal(false);
      }
    };

    if (showGuidelinesModal) {
      document.addEventListener('keydown', handleEscKey);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [showGuidelinesModal]);

  // Enhanced Quiz Start Confirmation Modal Component
  const QuizStartModal = () => {
    if (!showQuizStartModal || !selectedQuiz) return null;

    const daysRemaining = getDaysRemaining(selectedQuiz.dueDate);
    const isUrgent = daysRemaining <= 3;
    const isOverdue = daysRemaining < 0;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => !startingQuiz && setShowQuizStartModal(false)}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col animate-fadeIn">
          {/* Header */}
          <div className="relative overflow-hidden rounded-t-3xl bg-gradient-to-r from-blue-600 to-indigo-700 p-8">
            <div className="absolute inset-0 bg-black opacity-10"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl flex items-center justify-center animate-pulse-custom">
                    <span className="text-3xl">🚀</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Ready to Start Quiz?</h2>
                    <p className="text-blue-100 text-sm">Let's make sure you're prepared</p>
                  </div>
                </div>
                {!startingQuiz && (
                  <button
                    onClick={() => setShowQuizStartModal(false)}
                    className="p-2 hover:bg-white hover:bg-opacity-20 rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                    aria-label="Close modal"
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8">
            {startingQuiz ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-custom">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Preparing Your Quiz...</h3>
                <p className="text-gray-600">Setting up questions and initializing timer</p>
                <div className="mt-6">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full animate-shimmer" style={{ width: '100%' }}></div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Quiz Details Card */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6 animate-slideUp">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xl font-bold">📝</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{selectedQuiz.title}</h3>
                      <p className="text-gray-600 mb-3">{selectedQuiz.description}</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-500">Course</div>
                          <div className="font-medium text-gray-900">{selectedQuiz.course}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Instructor</div>
                          <div className="font-medium text-gray-900">{selectedQuiz.instructor}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Time Alert */}
                {(isUrgent || isOverdue) && (
                  <div className={`p-4 rounded-xl mb-6 animate-slideUp ${isOverdue ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
                    }`} style={{ animationDelay: '0.1s' }}>
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isOverdue ? 'bg-red-100' : 'bg-amber-100'
                        }`}>
                        <span className="text-xl">{isOverdue ? '⚠️' : '⏰'}</span>
                      </div>
                      <div>
                        <div className={`font-semibold ${isOverdue ? 'text-red-900' : 'text-amber-900'}`}>
                          {isOverdue ? `${Math.abs(daysRemaining)} days overdue!` : `Only ${daysRemaining} days remaining`}
                        </div>
                        <div className={`text-sm ${isOverdue ? 'text-red-700' : 'text-amber-700'}`}>
                          {isOverdue ? 'This quiz is past due. Complete it as soon as possible.' : 'Don\'t forget to submit before the deadline.'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quiz Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white border border-gray-200 rounded-xl p-4 animate-slideUp" style={{ animationDelay: '0.2s' }}>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <span className="text-lg">❓</span>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Questions</div>
                        <div className="text-lg font-bold text-gray-900">{selectedQuiz.totalQuestions}</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-4 animate-slideUp" style={{ animationDelay: '0.3s' }}>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-lg">⏱️</span>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Time Limit</div>
                        <div className="text-lg font-bold text-gray-900">{selectedQuiz.timeLimit}min</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pre-Start Checklist */}
                <div className="bg-gray-50 rounded-2xl p-6 mb-6 animate-slideUp" style={{ animationDelay: '0.4s' }}>
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="text-lg mr-2">✅</span>
                    Pre-Quiz Checklist
                  </h4>
                  <div className="space-y-3">
                    {[
                      "Ensure stable internet connection",
                      "Find a quiet, distraction-free environment",
                      "Have necessary materials ready (if allowed)",
                      "Check that your device is charged or plugged in",
                      "Close unnecessary browser tabs and applications"
                    ].map((item, index) => (
                      <label key={index} className="flex items-center space-x-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 transition-all duration-200"
                        />
                        <span className="text-gray-700 group-hover:text-gray-900 transition-colors duration-200">{item}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Important Notice */}
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 animate-slideUp" style={{ animationDelay: '0.5s' }}>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">💡</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-2">Important Reminders</h4>
                      <ul className="text-blue-800 text-sm space-y-1">
                        <li>• Once started, the timer cannot be paused</li>
                        <li>• You have {selectedQuiz.maxAttempts - selectedQuiz.attempts} attempt(s) remaining</li>
                        <li>• Passing score: {selectedQuiz.passingScore}%</li>
                        <li>• Auto-save occurs every 30 seconds</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {!startingQuiz && (
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 rounded-b-3xl">
              <div className="text-sm text-gray-600">
                Estimated time: {selectedQuiz.estimatedTime}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowQuizStartModal(false)}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmStartQuiz}
                  className="start-quiz-btn px-8 py-3 text-white rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Start Quiz Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Quiz Guidelines Modal Component
  const QuizGuidelinesModal = () => {
    if (!showGuidelinesModal) return null;

    const guidelines = [
      {
        title: "Time Management",
        items: [
          "Each quiz has a specific time limit that will be clearly displayed before you start",
          "Once you begin, the timer cannot be paused or stopped",
          "You will receive warnings when 5 minutes and 1 minute remain",
          "The quiz will automatically submit when time expires"
        ]
      },
      {
        title: "Attempt Limits",
        items: [
          "Most quizzes allow a maximum of 3 attempts",
          "Your highest score will be recorded as your final grade",
          "Failed attempts still count toward your total attempt limit",
          "Some quizzes may have different attempt limits - check individual quiz details"
        ]
      },
      {
        title: "Academic Integrity",
        items: [
          "All work must be your own - no collaboration with others",
          "Do not use unauthorized resources, books, or notes unless specified",
          "Screen sharing, recording, or taking screenshots is prohibited",
          "Any form of cheating will result in automatic quiz failure and academic consequences"
        ]
      },
      {
        title: "Technical Requirements",
        items: [
          "Ensure you have a stable internet connection before starting",
          "Use an updated browser (Chrome, Firefox, Safari, or Edge recommended)",
          "Close unnecessary applications to ensure optimal performance",
          "Do not refresh the page or navigate away during the quiz"
        ]
      },
      {
        title: "Submission Guidelines",
        items: [
          "Review all answers before final submission",
          "Once submitted, answers cannot be changed",
          "Partial submissions are saved automatically every 30 seconds",
          "Always click 'Submit Quiz' when finished - don't rely on auto-submit"
        ]
      },
      {
        title: "Support & Troubleshooting",
        items: [
          "Contact your instructor immediately if you experience technical issues",
          "Document any problems with screenshots when possible",
          "Technical issues may qualify for additional attempts at instructor discretion",
          "Report suspected quiz errors or ambiguous questions promptly"
        ]
      }
    ];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setShowGuidelinesModal(false)}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-xl">📋</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Quiz Guidelines</h2>
                <p className="text-sm text-gray-600">Please read carefully before taking any quiz</p>
              </div>
            </div>
            <button
              onClick={() => setShowGuidelinesModal(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-8">
              {guidelines.map((section, index) => (
                <div key={index} className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                      {index + 1}
                    </span>
                    {section.title}
                  </h3>
                  <ul className="space-y-3">
                    {section.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-700 leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {/* Important Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">⚠️</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-amber-900 mb-2">Important Notice</h4>
                    <p className="text-amber-800 leading-relaxed">
                      By proceeding with any quiz, you acknowledge that you have read, understood, and agree to comply with all the guidelines listed above.
                      Violation of these guidelines may result in quiz invalidation, academic penalties, or other disciplinary actions as determined by your institution.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
            <div className="text-sm text-gray-600">
              Last updated: August 2025
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowGuidelinesModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowGuidelinesModal(false)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium"
              >
                I Understand & Agree
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Inject modal styles */}
      <style>{modalStyles}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Enrolled Course Quizzes</h1>
          <p className="text-sm text-gray-600 mt-1">
            Quizzes from your enrolled courses
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowGuidelinesModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Quiz Guidelines
          </button>
        </div>
      </div>

      {/* Quiz Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">❓</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Quizzes</p>
              <p className="text-2xl font-bold text-gray-900">{quizCounts.all}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">📋</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Available</p>
              <p className="text-2xl font-bold text-gray-900">{quizCounts.available}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">⏳</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{quizCounts['in-progress']}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{quizCounts.completed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Summary for Completed Quizzes */}
      {quizCounts.completed > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-blue-50 rounded-lg shadow-sm p-6 border border-orange-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <span className="text-2xl mr-2">🏆</span>
              Quiz Performance Summary
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {filteredQuizzes.filter(q => q.status === 'completed' && q.lastAttempt?.passed).length}
              </div>
              <div className="text-sm text-gray-600">Quizzes Passed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(
                  filteredQuizzes
                    .filter(q => q.status === 'completed' && q.lastAttempt?.score)
                    .reduce((acc, q) => acc + q.lastAttempt.score, 0) /
                  filteredQuizzes.filter(q => q.status === 'completed' && q.lastAttempt?.score).length
                ) || 0}%
              </div>
              <div className="text-sm text-gray-600">Average Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {filteredQuizzes
                  .filter(q => q.status === 'completed')
                  .reduce((acc, q) => acc + (q.points || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Points Earned</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Tabs */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {/* Tabs */}
        <div className="flex space-x-1 mb-6">
          {[
            { id: 'all', label: 'All', count: quizCounts.all },
            { id: 'available', label: 'Available', count: quizCounts.available },
            { id: 'in-progress', label: 'In Progress', count: quizCounts['in-progress'] },
            { id: 'completed', label: 'Completed', count: quizCounts.completed }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === tab.id
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Search and Filter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Quizzes</label>
            <input
              type="text"
              placeholder="Search by title or course..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Course</label>
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Courses</option>
              {courses.map((course, index) => (
                <option key={index} value={course}>
                  {course}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Quizzes List */}
      <div className="space-y-6">
        {filteredQuizzes.map((quiz) => (
          <div key={quiz.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="p-6">
              {/* Quiz Header */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{quiz.title}</h3>

                    {/* Quiz Status Badge */}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(quiz.status)}`}>
                      {quiz.status === 'completed' ? (
                        quiz.lastAttempt?.passed ? '✅ Completed - Passed' : '❌ Completed - Failed'
                      ) : (
                        quiz.status.replace('-', ' ')
                      )}
                    </span>

                    {/* Difficulty Badge */}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(quiz.difficulty)}`}>
                      {quiz.difficulty}
                    </span>

                    {/* Completion Score Badge */}
                    {quiz.status === 'completed' && quiz.lastAttempt?.score !== undefined && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${quiz.lastAttempt?.passed
                        ? 'bg-orange-100 text-orange-800 border border-orange-200'
                        : 'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                        📊 {quiz.lastAttempt.score}%
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 mb-2">{quiz.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>📚 {quiz.course}</span>
                    <span>👨‍🏫 {quiz.instructor}</span>
                    <span>⭐ {quiz.points} points</span>
                    {quiz.status === 'completed' && (
                      <span className="text-orange-600 font-medium">
                        🏆 Attempt {quiz.attempts}/{quiz.maxAttempts}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 lg:mt-0 lg:text-right">
                  <div className="text-sm text-gray-600">
                    Due: {quiz.dueDate}
                  </div>
                  {quiz.status !== 'completed' && (
                    <div className={`text-sm font-medium ${getDaysRemaining(quiz.dueDate) < 0 ? 'text-red-600' :
                      getDaysRemaining(quiz.dueDate) <= 3 ? 'text-yellow-600' : 'text-orange-600'
                      }`}>
                      {getDaysRemaining(quiz.dueDate) < 0
                        ? `${Math.abs(getDaysRemaining(quiz.dueDate))} days overdue`
                        : `${getDaysRemaining(quiz.dueDate)} days remaining`
                      }
                    </div>
                  )}
                </div>
              </div>

              {/* Quiz Details */}
              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Quiz Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Questions:</span>
                        <span className="font-medium">{quiz.totalQuestions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Time Limit:</span>
                        <span className="font-medium">{quiz.timeLimit} minutes</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Passing Score:</span>
                        <span className="font-medium">{quiz.passingScore}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Attempts:</span>
                        <span className="font-medium">{quiz.attempts}/{quiz.maxAttempts}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Estimated Time:</span>
                        <span className="font-medium">{quiz.estimatedTime}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Topics Covered</h4>
                    <div className="flex flex-wrap gap-2">
                      {quiz.topics.map((topic, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Progress for In-Progress Quiz */}
                {quiz.status === 'in-progress' && quiz.progress && (
                  <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">Progress</span>
                      <span className="text-sm text-gray-600">{quiz.questionsAnswered}/{quiz.totalQuestions} questions</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-500 h-2 rounded-full"
                        style={{ width: `${quiz.progress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">You can resume this quiz anytime before the deadline.</p>
                  </div>
                )}

                {/* Last Attempt Results */}
                {quiz.lastAttempt && (
                  <div className={`mt-4 p-4 rounded-lg ${quiz.lastAttempt.passed ? 'bg-orange-50' : 'bg-red-50'
                    }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">
                        {quiz.status === 'completed' ? 'Best Score' : 'Last Attempt'}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className={`font-medium ${quiz.lastAttempt.passed ? 'text-orange-600' : 'text-red-600'
                          }`}>
                          {quiz.bestScore || quiz.lastAttempt.score}/{quiz.points}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${quiz.lastAttempt.passed ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
                          }`}>
                          {quiz.lastAttempt.passed ? 'Passed' : 'Failed'}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Completed: </span>
                        <span className="font-medium">{quiz.lastAttempt.completedDate}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Time Spent: </span>
                        <span className="font-medium">{quiz.lastAttempt.timeSpent} minutes</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Completion Status Badge */}
                {quiz.status === 'completed' && (
                  <div className="mb-4">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${quiz.lastAttempt?.passed
                      ? 'bg-orange-100 text-orange-800 border border-orange-200'
                      : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                      {quiz.lastAttempt?.passed ? (
                        <>
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          ✅ Quiz Completed - Passed
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          ❌ Quiz Completed - Try Again
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 mt-4">
                  {quiz.status === 'available' && (
                    <button
                      onClick={() => {
                        window.scrollTo(0, 0);
                        navigate(`/student/quiz/${quiz.id || quiz._id}/take`);
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1M9 10h1m4 0h1M9 10V9a3 3 0 116 0v1m-7 4a3 3 0 006 0m-3 3V9" />
                      </svg>
                      🚀 Start Quiz
                    </button>
                  )}
                  {quiz.status === 'in-progress' && (
                    <button
                      onClick={() => {
                        window.scrollTo(0, 0);
                        navigate(`/student/quiz/${quiz.id || quiz._id}/take`);
                      }}
                      className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      ⏳ Resume Quiz
                    </button>
                  )}
                  {quiz.status === 'completed' && (
                    <>
                      <button
                        className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center"
                        onClick={() => {
                          // Add functionality to view results
                          console.log('View results for quiz:', quiz.id);
                        }}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        📊 View Results
                      </button>
                      {quiz.attempts < quiz.maxAttempts && !quiz.lastAttempt?.passed && (
                        <button
                          onClick={() => {
                            window.scrollTo(0, 0);
                            navigate(`/student/quiz/${quiz.id || quiz._id}/take`);
                          }}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          🔄 Retake Quiz
                        </button>
                      )}
                    </>
                  )}
                  {(quiz.lastAttempt?.passed || quiz.attempts >= quiz.maxAttempts) && quiz.status !== 'available' && (
                    <button
                      className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center"
                      onClick={() => {
                        // Add functionality to review answers
                        console.log('Review answers for quiz:', quiz.id);
                      }}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      ✅ Review Answers
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredQuizzes.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">❓</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No quizzes available</h3>
          {enrolledCourses.length === 0 ? (
            <div className="text-gray-600">
              <p className="mb-2">No enrolled courses found.</p>
              <p>Enroll in courses to access their quizzes.</p>
            </div>
          ) : (
            <div className="text-gray-600">
              <p className="mb-2">No quizzes found for your enrolled courses.</p>
              <p>Enrolled in: {enrolledCourses.map(course => course.title).join(', ')}</p>
            </div>
          )}
        </div>
      )}

      {/* Quiz Guidelines Modal */}
      <QuizGuidelinesModal />
    </div>
  );
};

export default StudentQuizzes;
