import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Simple inline Badge component
const Badge = ({ children, className = '' }) => (
  <span className={className}>{children}</span>
);

const styles = `
  .course-card {
    transition: all 0.3s ease;
    border: 1px solid #e5e7eb;
    background-color: white;
  }
  .course-card:hover {
    transform: translateY(-2px);
    border-color: #7a6f10;
    box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.08);
    background-color: #f9fafb;
  }
  .btn-primary {
    background-color: #988913;
    color: white;
    transition: all 0.2s ease;
  }
  .btn-primary:hover {
    background-color: #7a6f10;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
  }
  .btn-secondary {
    background-color: #ffffff;
    color: #1f2937;
    border: 1px solid #e5e7eb;
    transition: all 0.2s ease;
  }
  .btn-secondary:hover {
    background-color: #e5e7eb;
    border-color: #7a6f10;
    transform: translateY(-1px);
  }
  .btn-continue {
    background: linear-gradient(to right, #988913, #7a6f10);
    color: white;
    transition: all 0.2s ease;
  }
  .btn-continue:hover {
    background: linear-gradient(to right, #7a6f10, #6b6f10);
    transform: scale(1.05);
    box-shadow: 0 4px 8px -2px rgba(0, 0, 0, 0.15);
  }
  .progress-bar {
    background: linear-gradient(to right, #988913, #7a6f10);
  }
  .badge-enrolled {
    background-color: #988913;
    color: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  .badge-completed {
    background-color: #10b981;
    color: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }
  .badge-level {
    background-color: rgba(229, 231, 235, 0.95);
    color: #1f2937;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  .badge-category {
    background-color: #f3f4f6;
    color: #6b7280;
  }
  .course-image-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, transparent 30%);
    height: 50%;
    pointer-events: none;
  }
  .badge-container {
    position: absolute;
    top: 8px;
    left: 8px;
    right: 8px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    z-index: 10;
  }
  @media (max-width: 640px) {
    .badge-container {
      top: 6px;
      left: 6px;
      right: 6px;
    }
  }
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #7a6f10 #f3f4f6;
  }
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f3f4f6;
    border-radius: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #7a6f10;
    border-radius: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #6b7280;
  }
`;

// Inject styles only once
if (typeof document !== 'undefined' && !document.getElementById('my-enroll-course-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'my-enroll-course-styles';
  styleSheet.type = 'text/css';
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}

const MyEnrollCourse = () => {
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [viewMode, setViewMode] = useState('grid');
  const [categories, setCategories] = useState([]);
  const [levels, setLevels] = useState(['Beginner', 'Intermediate', 'Advanced', 'Expert']);
  const [error, setError] = useState(null);
  const [categoriesFetched, setCategoriesFetched] = useState(false);

  useEffect(() => {
    fetchEnrolledCourses();

    // Listen for course progress updates
    const handleProgressUpdate = (event) => {
      console.log('📈 MyEnrollCourse: Progress update detected', event.detail);
      const { courseId, progress } = event.detail || {};

      if (courseId && progress !== undefined) {
        setEnrolledCourses(prev => prev.map(course => {
          if (course.id === courseId || course._id === courseId) {
            const updatedProgress = Math.round(progress);
            return {
              ...course,
              progress: updatedProgress,
              status: updatedProgress >= 100 ? 'completed' : (updatedProgress > 0 ? 'in-progress' : 'not-started'),
              completionDate: updatedProgress >= 100 ? new Date().toISOString() : null
            };
          }
          return course;
        }));
      }
    };

    const handleEnrolledCoursesRefresh = () => {
      console.log('🔄 MyEnrollCourse: Refresh requested');
      fetchEnrolledCourses();
    };

    // Add event listeners
    window.addEventListener('courseProgressUpdate', handleProgressUpdate);
    window.addEventListener('refreshEnrolledCourses', handleEnrolledCoursesRefresh);

    return () => {
      window.removeEventListener('courseProgressUpdate', handleProgressUpdate);
      window.removeEventListener('refreshEnrolledCourses', handleEnrolledCoursesRefresh);
    };
  }, []);

  useEffect(() => {
    if (enrolledCourses.length > 0 && !categoriesFetched) {
      fetchCategories();
    }
  }, [enrolledCourses.length, categoriesFetched]);

  const fetchEnrolledCourses = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      if (!token) {
        setError('No authentication token found');
        setEnrolledCourses([]);
        setLoading(false);
        return;
      }

      console.log(`🔄 Fetching enrolled courses ${forceRefresh ? '(force refresh)' : ''}...`);

      // Fetch enrolled courses from API
      const response = await axios.get('http://localhost:4000/api/students/enrolled-courses', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: forceRefresh ? { refresh: 'true' } : {}
      });

      if (response.data && response.data.success) {
        const courses = response.data.courses || response.data.data || [];
        // Transform API data to match component structure with fresh progress
        const transformedCourses = await Promise.all(courses.map(async (course) => {
          // Parse duration properly - handle both "X months" and number formats
          let durationStr = course.duration || course.duration_months || '0';
          if (typeof durationStr === 'number') {
            durationStr = `${durationStr} months`;
          } else if (!durationStr.includes('month') && !durationStr.includes('hour')) {
            durationStr = `${durationStr} months`;
          }

          // Get fresh progress if force refresh is enabled
          let progressPercent = course.progress || course.completion_percentage || 0;

          if (forceRefresh && (course.id || course._id)) {
            try {
              // Fetch fresh progress from API
              const progressResponse = await axios.get(`http://localhost:4000/api/course-progress/${course.id || course._id}`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });

              if (progressResponse.data) {
                progressPercent = progressResponse.data.progress ||
                  progressResponse.data.completion_percentage ||
                  progressResponse.data.data?.progress ||
                  progressPercent;
              }
            } catch (progressError) {
              console.warn(`Could not fetch fresh progress for course ${course.id || course._id}:`, progressError.message);
              // Use existing progress
            }
          }

          // Calculate estimated time left based on progress
          const totalLessons = course.total_lessons || course.lessons_count || 0;
          const completedLessons = course.completed_lessons || Math.floor(progressPercent / 100 * totalLessons);
          const remainingLessons = Math.max(0, totalLessons - completedLessons);
          const estimatedTime = remainingLessons > 0 ? `${remainingLessons} lessons left` : 'Completed';

          return {
            id: course.id || course._id,
            title: course.title || course.course_name || course.name,
            description: course.description || 'Course description not available',
            instructor: course.instructor || course.instructor_name || 'Course Instructor',
            category: course.category || course.course_category || 'General',
            level: course.level || course.difficulty_level || 'Beginner',
            duration: durationStr,
            rating: course.rating || 4.5,
            reviewCount: course.review_count || course.reviews || 0,
            enrollmentDate: course.enrollment_date || course.enrolled_at || new Date().toISOString(),
            lastAccessed: course.last_accessed || course.updated_at || new Date().toISOString(),
            progress: Math.round(progressPercent),
            status: course.status || (progressPercent >= 100 ? 'completed' : (progressPercent > 0 ? 'in-progress' : 'not-started')),
            completionDate: course.completion_date || (progressPercent >= 100 ? new Date().toISOString() : null),
            thumbnail: course.thumbnail || course.image_url || '/api/placeholder/400/300',
            lessons: totalLessons,
            completedLessons: completedLessons,
            estimatedTimeLeft: estimatedTime,
            skills: course.skills || course.learning_outcomes || [],
            certificate: course.certificate_awarded || course.has_certificate || false,
            nextLesson: course.next_lesson || null,
            grade: course.grade || null,
            finalScore: course.final_score || null,
            branch_code: course.branch_code || null,
            branch_name: course.branch_name || course.branch_code || null,
            batch_name: course.batch_name || course.batch || null,
            program_name: course.program_name || null
          };
        }));

        setEnrolledCourses(transformedCourses);
        console.log(`✅ Loaded ${transformedCourses.length} courses with ${forceRefresh ? 'fresh' : 'cached'} progress`);
      } else {
        setEnrolledCourses([]);
      }
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
      setError(error.message || 'Failed to fetch enrolled courses');
      setEnrolledCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      if (!token || enrolledCourses.length === 0 || categoriesFetched) {
        return;
      }

      // Fetch categories from API or extract from enrolled courses
      try {
        const response = await axios.get('http://localhost:4000/api/courses/categories', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.data && response.data.categories) {
          setCategories(response.data.categories);
        } else {
          // Fallback: extract from enrolled courses
          const uniqueCategories = [...new Set(enrolledCourses.map(course => course.category).filter(Boolean))];
          setCategories(uniqueCategories);
        }
      } catch (apiError) {
        // Fallback: extract from enrolled courses
        const uniqueCategories = [...new Set(enrolledCourses.map(course => course.category).filter(Boolean))];
        setCategories(uniqueCategories);
      }
      setCategoriesFetched(true);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
      setCategoriesFetched(true);
    }
  };

  const showCourseDetails = (course) => {
    setSelectedCourse(course);
    setShowDetailsModal(true);
  };

  const handleContinueCourse = (courseId) => {
    // Navigate to course content page
    console.log('Continue course:', courseId);
    navigate(`/course-content/${courseId}`);
  };

  const filteredCourses = enrolledCourses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.instructor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || course.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || course.category === filterCategory;
    const matchesLevel = filterLevel === 'all' || course.level === filterLevel;

    return matchesSearch && matchesStatus && matchesCategory && matchesLevel;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageCourses = filteredCourses.slice(startIndex, endIndex);

  // Calculate stats
  const stats = {
    total: enrolledCourses.length,
    inProgress: enrolledCourses.filter(c => c.status === 'in-progress').length,
    completed: enrolledCourses.filter(c => c.status === 'completed').length,
    certificates: enrolledCourses.filter(c => c.certificate).length
  };

  const CourseCard = ({ course }) => {
    const getStatusColor = (status) => {
      switch (status) {
        case 'completed':
          return 'bg-orange-100 text-orange-800';
        case 'in-progress':
          return 'bg-blue-100 text-blue-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    };

    const getStatusLabel = (status) => {
      switch (status) {
        case 'completed':
          return 'Completed';
        case 'in-progress':
          return 'In Progress';
        default:
          return 'Not Started';
      }
    };

    return (
      <div className="course-card rounded-lg shadow-sm overflow-hidden">
        {/* Course Image */}
        <div className="relative h-48 bg-gradient-to-r from-blue-500 to-purple-600">
          <div className="course-image-overlay"></div>
          <div className="badge-container">
            <Badge className={`badge-enrolled px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(course.status)}`}>
              {getStatusLabel(course.status)}
            </Badge>
            {course.certificate && (
              <Badge className="badge-completed px-2 py-1 text-xs font-medium rounded-full">
                🏆 Certified
              </Badge>
            )}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl text-white opacity-80">📚</span>
          </div>
        </div>

        {/* Course Content */}
        <div className="p-6">
          {/* Course Header */}
          <div className="mb-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 pr-2">
                {course.title}
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">by {course.instructor}</p>
            <div className="flex items-center flex-wrap gap-2 text-sm text-gray-500 mb-2">
              <span>⭐ {course.rating} ({course.reviewCount})</span>
              <span>⏱️ {course.duration}</span>
              <span>📊 {course.level}</span>
            </div>
            {/* Branch & Batch Info */}
            <div className="flex items-center flex-wrap gap-2 text-xs">
              {course.branch_code && (
                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                  🏢 {course.branch_code}
                </span>
              )}
              {course.batch_name && (
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  📚 {course.batch_name}
                </span>
              )}
              {course.program_name && (
                <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                  🎓 {course.program_name}
                </span>
              )}
            </div>
          </div>

          {/* Progress Section */}
          {course.status === 'in-progress' && (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">Progress</span>
                <span className="text-gray-700">{course.progress}% complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="progress-bar h-2 rounded-full"
                  style={{ width: `${course.progress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{course.completedLessons}/{course.lessons} lessons</span>
                <span>{course.estimatedTimeLeft} left</span>
              </div>
            </div>
          )}

          {/* Completion Info */}
          {course.status === 'completed' && (
            <div className="mb-4 p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-orange-800">
                    Completed on {new Date(course.completionDate).toLocaleDateString()}
                  </div>
                  {course.finalScore && (
                    <div className="text-sm text-orange-600">
                      Final Score: {course.finalScore}% ({course.grade})
                    </div>
                  )}
                </div>
                {course.certificate && (
                  <div className="text-2xl">🏆</div>
                )}
              </div>
            </div>
          )}

          {/* Next Lesson */}
          {course.status === 'in-progress' && course.nextLesson && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-blue-800 mb-1">Next Lesson</div>
              <div className="text-sm text-blue-600">{course.nextLesson.title}</div>
              <div className="text-xs text-blue-500">{course.nextLesson.duration}</div>
            </div>
          )}

          {/* Skills */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {course.skills.slice(0, 3).map((skill, index) => (
                <Badge
                  key={index}
                  className="badge-category px-2 py-1 text-xs rounded-full"
                >
                  {skill}
                </Badge>
              ))}
              {course.skills.length > 3 && (
                <Badge className="badge-category px-2 py-1 text-xs rounded-full">
                  +{course.skills.length - 3} more
                </Badge>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            {course.status === 'in-progress' && (
              <button
                onClick={() => handleContinueCourse(course.id)}
                className="btn-continue flex-1 px-4 py-2 rounded-lg font-medium text-sm"
              >
                Continue Learning
              </button>
            )}
            {course.status === 'completed' && (
              <>
                <button
                  onClick={() => handleContinueCourse(course.id)}
                  className="btn-secondary flex-1 px-4 py-2 rounded-lg font-medium text-sm"
                >
                  Review Course
                </button>
                {course.certificate && (
                  <button className="btn-primary px-4 py-2 rounded-lg font-medium text-sm">
                    Certificate
                  </button>
                )}
              </>
            )}
            <button
              onClick={() => showCourseDetails(course)}
              className="btn-secondary px-4 py-2 rounded-lg font-medium text-sm"
            >
              Details
            </button>
          </div>

          {/* Last Accessed */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              Last accessed: {new Date(course.lastAccessed).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your enrolled courses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Courses</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => {
              setError(null);
              fetchEnrolledCourses();
            }}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Enrolled Courses</h1>
          <p className="text-gray-600 mt-1">Track your learning progress and continue your courses</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => fetchEnrolledCourses(true)}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 transform hover:scale-105 ${loading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl'
              }`}
            title="Refresh progress data"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500 inline" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Refreshing...
              </>
            ) : (
              <>
                🔄 Refresh Progress
              </>
            )}
          </button>
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {viewMode === 'grid' ? '📋 List' : '⊞ Grid'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">📚</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Enrolled</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">📖</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
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
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-2xl">🏆</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Certificates</p>
              <p className="text-2xl font-bold text-gray-900">{stats.certificates}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Courses</label>
            <input
              type="text"
              placeholder="Search by title or instructor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Level</label>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Levels</option>
              {levels.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
        {currentPageCourses.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>

      {/* Empty State */}
      {filteredCourses.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || filterStatus !== 'all' || filterCategory !== 'all' || filterLevel !== 'all'
              ? 'No courses match your filters'
              : 'No enrolled courses found'
            }
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || filterStatus !== 'all' || filterCategory !== 'all' || filterLevel !== 'all'
              ? 'Try adjusting your search criteria or filters'
              : 'You have not enrolled in any courses yet'
            }
          </p>
          {(searchTerm || filterStatus !== 'all' || filterCategory !== 'all' || filterLevel !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
                setFilterCategory('all');
                setFilterLevel('all');
              }}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
          >
            Previous
          </button>
          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index + 1}
              onClick={() => setCurrentPage(index + 1)}
              className={`px-4 py-2 rounded-lg ${currentPage === index + 1
                ? 'bg-blue-600 text-white'
                : 'border border-gray-300 hover:bg-gray-50'
                }`}
            >
              {index + 1}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Course Details Modal */}
      {showDetailsModal && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{selectedCourse.title}</h2>
                  <p className="text-gray-600">by {selectedCourse.instructor}</p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Course Info */}
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Course Description</h3>
                  <p className="text-gray-600">{selectedCourse.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900">Duration</h4>
                    <p className="text-gray-600">{selectedCourse.duration}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Level</h4>
                    <p className="text-gray-600">{selectedCourse.level}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Category</h4>
                    <p className="text-gray-600">{selectedCourse.category}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Rating</h4>
                    <p className="text-gray-600">⭐ {selectedCourse.rating} ({selectedCourse.reviewCount} reviews)</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Skills You'll Learn</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCourse.skills.map((skill, index) => (
                      <Badge
                        key={index}
                        className="badge-category px-3 py-1 text-sm rounded-full"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                {selectedCourse.status === 'in-progress' && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Progress</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Completion</span>
                        <span>{selectedCourse.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="progress-bar h-2 rounded-full"
                          style={{ width: `${selectedCourse.progress}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>{selectedCourse.completedLessons}/{selectedCourse.lessons} lessons completed</span>
                        <span>{selectedCourse.estimatedTimeLeft} remaining</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex space-x-3 pt-4">
                  {selectedCourse.status === 'in-progress' && (
                    <button
                      onClick={() => {
                        handleContinueCourse(selectedCourse.id);
                        setShowDetailsModal(false);
                      }}
                      className="btn-continue px-6 py-2 rounded-lg font-medium"
                    >
                      Continue Learning
                    </button>
                  )}
                  {selectedCourse.status === 'completed' && selectedCourse.certificate && (
                    <button className="btn-primary px-6 py-2 rounded-lg font-medium">
                      View Certificate
                    </button>
                  )}
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="btn-secondary px-6 py-2 rounded-lg font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Learning Tips */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 Learning Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Stay Consistent</h4>
            <p>Set aside dedicated time each day for learning. Even 30 minutes daily can make a big difference.</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Practice Regularly</h4>
            <p>Apply what you learn through hands-on projects and exercises to reinforce your knowledge.</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Track Progress</h4>
            <p>Monitor your completion percentage and celebrate small wins to stay motivated.</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Engage with Community</h4>
            <p>Join discussions, ask questions, and connect with fellow learners for better understanding.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyEnrollCourse;
