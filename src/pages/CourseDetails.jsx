import {
  AcademicCapIcon,
  ArrowLeftIcon,
  BookOpenIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  DocumentIcon,
  GlobeAltIcon,
  PlayIcon,
  StarIcon,
  UserGroupIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchLiveSessions } from '../api/liveClassesApi';

const CourseDetails = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [courseContent, setCourseContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [liveSessions, setLiveSessions] = useState([]);
  const [loadingLiveSessions, setLoadingLiveSessions] = useState(false);

  useEffect(() => {
    fetchCourseDetails();
    fetchLiveSessionsForCourse();
  }, [courseId]);

  const fetchCourseDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Fetch course details
      const response = await axios.get(`http://localhost:4000/course/${courseId}`, { headers });
      console.log('Course details:', response.data);
      setCourse(response.data);

      // Fetch course content for additional stats
      try {
        const contentResponse = await axios.get(`http://localhost:4000/course/${courseId}/content`, { headers });
        console.log('Course content:', contentResponse.data);
        setCourseContent(contentResponse.data);
      } catch (contentError) {
        console.log('Could not fetch course content:', contentError);
      }
    } catch (error) {
      console.error('Error fetching course details:', error);
      if (error.response?.status === 404) {
        setError('Course not found. It may have been removed or the link is invalid.');
      } else {
        setError('Failed to load course details. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveSessionsForCourse = async () => {
    setLoadingLiveSessions(true);
    try {
      const allLiveSessions = await fetchLiveSessions();
      // Filter sessions that belong to this specific course
      const courseLiveSessions = allLiveSessions.filter(session => 
        session.course_id === courseId
      );
      setLiveSessions(courseLiveSessions);
      console.log('Live sessions for course:', courseLiveSessions);
    } catch (error) {
      console.error('Error fetching live sessions for course:', error);
      setLiveSessions([]);
    } finally {
      setLoadingLiveSessions(false);
    }
  };

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.post(
        `http://localhost:4000/course/${courseId}/enroll`,
        {},
        { headers }
      );

      console.log('Enrollment successful:', response.data);
      setEnrolled(true);

      // Show success message
      const message = document.createElement('div');
      message.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 12px 20px; border-radius: 8px; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          ✓ Successfully enrolled in the course!
        </div>
      `;
      document.body.appendChild(message);
      setTimeout(() => document.body.removeChild(message), 4000);

    } catch (error) {
      console.error('Enrollment failed:', error);
      let errorMessage = 'Failed to enroll in course';

      if (error.response?.status === 401) {
        errorMessage = 'Please log in to enroll in this course';
        // Store current URL to redirect back after login
        const currentUrl = window.location.pathname + window.location.search;
        localStorage.setItem('redirectAfterLogin', currentUrl);
        // Redirect to login page with return URL
        setTimeout(() => navigate(`/login?redirect=${encodeURIComponent(currentUrl)}`), 1500);
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }

      alert(`Enrollment failed: ${errorMessage}`);
    } finally {
      setEnrolling(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDuration = (duration) => {
    if (!duration) return 'N/A';
    // Handle various duration formats
    if (duration.includes('hour')) return duration;
    if (duration.includes('week')) return duration;
    if (duration.includes('month')) return duration;
    // If it's just a number, assume hours
    const num = parseFloat(duration);
    if (!isNaN(num)) {
      return `${num} hour${num !== 1 ? 's' : ''}`;
    }
    return duration;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="h-64 bg-gray-300"></div>
              <div className="p-8">
                <div className="h-8 bg-gray-300 rounded mb-4"></div>
                <div className="h-4 bg-gray-300 rounded mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-2/3 mb-6"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="h-20 bg-gray-300 rounded"></div>
                  <div className="h-20 bg-gray-300 rounded"></div>
                  <div className="h-20 bg-gray-300 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-rose-50 flex items-center justify-center">
        <div className="text-center p-8">
          <XCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Course Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#988913] to-[#887a11] text-white font-medium rounded-lg hover:from-[#887a11] hover:to-[#776a0f] transition-all duration-300"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#988913] to-[#887a11] text-white">
        <div className="container mx-auto px-4 py-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Back
          </button>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <span className="px-3 py-1 bg-white/20 text-white text-sm font-medium rounded-full">
                  {course.category || 'Course'}
                </span>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${course.published
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-yellow-100 text-yellow-800'
                  }`}>
                  {course.published ? 'Published' : 'Draft'}
                </span>
              </div>

              <h1 className="text-4xl font-bold mb-4">{course.title}</h1>
              <p className="text-lg text-white/90 mb-6">{course.description}</p>

              <div className="flex items-center space-x-6 text-white/80">
                <div className="flex items-center space-x-2">
                  <StarIcon className="w-5 h-5 text-yellow-400" />
                  <span>{course.rating || '4.5'}/5</span>
                </div>
                <div className="flex items-center space-x-2">
                  <UserGroupIcon className="w-5 h-5" />
                  <span>{course.enrolled_students || course.total_enrollments || '0'} students</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ClockIcon className="w-5 h-5" />
                  <span>{course.duration_months ? `${course.duration_months} months` : formatDuration(course.duration)}</span>
                </div>
                {courseContent?.total_content > 0 && (
                  <div className="flex items-center space-x-2">
                    <BookOpenIcon className="w-5 h-5" />
                    <span>{courseContent.total_content} materials</span>
                  </div>
                )}
              </div>
            </div>

            <div className="text-center">
              <img
                src={course.thumbnail || 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600'}
                alt={course.title}
                className="w-full max-w-md mx-auto rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Course Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Course Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-lg border border-[#988913]/20">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CurrencyDollarIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Fee</p>
                    <p className="text-xl font-bold text-gray-900">₹{course.fee || course.price || '0'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-[#988913]/20">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <AcademicCapIcon className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Program</p>
                    <p className="text-lg font-bold text-gray-900">{course.program_name || course.level || 'General'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-[#988913]/20">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <ClockIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Duration</p>
                    <p className="text-lg font-bold text-gray-900">{course.duration_months ? `${course.duration_months} months` : (course.duration || 'N/A')}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-[#988913]/20">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <BookOpenIcon className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Study Materials</p>
                    <p className="text-xl font-bold text-gray-900">{courseContent?.total_content || course.lessons || '0'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Course Information */}
            <div className="bg-white rounded-2xl shadow-lg border border-[#988913]/20 p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Course Information</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-600">Course Name:</span>
                    <span className="font-medium text-gray-900">{course.course_name || course.title}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-600">Course Code:</span>
                    <span className="font-medium text-gray-900">{course.course_code || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-600">Program:</span>
                    <span className="font-medium text-gray-900">{course.program_name || course.category || 'General'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium text-gray-900">{course.duration_months ? `${course.duration_months} months` : formatDuration(course.duration)}</span>
                  </div>
                  {course.branch_code && (
                    <div className="flex justify-between border-b border-gray-100 pb-2">
                      <span className="text-gray-600">Branch:</span>
                      <span className="font-medium text-gray-900">{course.branch_name || course.branch_code}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-600">Fee:</span>
                    <span className="font-medium text-gray-900">₹{course.fee || course.price || '0'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-600">Students Enrolled:</span>
                    <span className="font-medium text-gray-900">{course.enrolled_students || course.total_enrollments || '0'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-600">Study Materials:</span>
                    <span className="font-medium text-gray-900">{courseContent?.total_content || '0'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-600">Quizzes/Tests:</span>
                    <span className="font-medium text-gray-900">{courseContent?.total_quizzes || '0'}</span>
                  </div>
                  {courseContent?.total_questions > 0 && (
                    <div className="flex justify-between border-b border-gray-100 pb-2">
                      <span className="text-gray-600">Practice Questions:</span>
                      <span className="font-medium text-gray-900">{courseContent?.total_questions || '0'}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium ${course.status === 'active' || course.published ? 'text-orange-600' : 'text-yellow-600'}`}>
                      {course.status === 'active' || course.published ? 'Active' : 'Coming Soon'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tags */}
            {course.tags && course.tags.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-[#988913]/20 p-8 mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {course.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gradient-to-r from-[#988913]/20 to-amber-100 text-[#887a11] text-sm font-medium rounded-full border border-[#988913]/30"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Course Content Preview */}
            <div className="bg-white rounded-2xl shadow-lg border border-[#988913]/20 p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">What You'll Learn</h2>
              <div className="grid gap-4">
                <div className="flex items-start space-x-3">
                  <CheckCircleIcon className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-gray-900">Complete {course.course_name || course.title} curriculum</p>
                  </div>
                </div>
                {course.program_name && (
                  <div className="flex items-start space-x-3">
                    <CheckCircleIcon className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-gray-900">{course.program_name} program certification</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start space-x-3">
                  <CheckCircleIcon className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-gray-900">{courseContent?.total_content || 'Multiple'} study materials and resources</p>
                  </div>
                </div>
                {courseContent?.total_quizzes > 0 && (
                  <div className="flex items-start space-x-3">
                    <CheckCircleIcon className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-gray-900">{courseContent.total_quizzes} practice tests and quizzes</p>
                    </div>
                  </div>
                )}
                {courseContent?.total_questions > 0 && (
                  <div className="flex items-start space-x-3">
                    <CheckCircleIcon className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-gray-900">{courseContent.total_questions} practice questions for preparation</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start space-x-3">
                  <CheckCircleIcon className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-gray-900">Certificate of completion</p>
                  </div>
                </div>
                {course.duration_months && (
                  <div className="flex items-start space-x-3">
                    <CheckCircleIcon className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-gray-900">{course.duration_months} months comprehensive training</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Course Modules Preview */}
            {courseContent?.modules && courseContent.modules.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-[#988913]/20 p-8 mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Course Content</h2>
                <div className="space-y-3">
                  {courseContent.modules.map((module, index) => (
                    <div key={module.id || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-[#988913] text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{module.title || module.name}</p>
                          <p className="text-sm text-gray-500">{module.content?.length || 0} items</p>
                        </div>
                      </div>
                      <BookOpenIcon className="w-5 h-5 text-gray-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Now Section for this course */}
            {liveSessions.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-2xl shadow-lg p-6 mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-ping"></div>
                  <h2 className="text-xl font-bold text-red-700">Live Classes Now</h2>
                </div>
                <div className="space-y-4">
                  {liveSessions.map(session => (
                    <div key={session.session_id} className="bg-white p-4 rounded-xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between border border-red-100">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{session.course_title}</h3>
                      </div>
                      <button
                        onClick={() => navigate(`/student/live-class/${session.session_id}`)}
                        className="mt-3 md:mt-0 bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700 transition shadow-md flex items-center gap-2"
                      >
                        <span>Join Now</span> 🎥
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-[#988913]/20 p-8 sticky top-8">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <span className="text-4xl font-bold text-[#988913]">₹{course.fee || course.price || '0'}</span>
                </div>

                {enrolled ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center space-x-2 text-orange-600 mb-4">
                      <CheckCircleIcon className="w-6 h-6" />
                      <span className="font-medium">Already Enrolled</span>
                    </div>
                    <button
                      onClick={() => navigate(`/course-content/${courseId}`)}
                      className="w-full py-4 px-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      Continue Learning
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="w-full py-4 px-6 bg-gradient-to-r from-[#988913] to-[#887a11] text-white font-bold rounded-xl hover:from-[#887a11] hover:to-[#776a0f] transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {enrolling ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        <span>Enrolling...</span>
                      </div>
                    ) : (
                      'Enroll Now'
                    )}
                  </button>
                )}
              </div>

              <div className="space-y-4 text-sm text-gray-600">
                {course.duration_months && (
                  <div className="flex items-center space-x-3">
                    <ClockIcon className="w-5 h-5 text-blue-500" />
                    <span>{course.duration_months} months duration</span>
                  </div>
                )}
                {courseContent?.total_content > 0 && (
                  <div className="flex items-center space-x-3">
                    <BookOpenIcon className="w-5 h-5 text-purple-500" />
                    <span>{courseContent.total_content} study materials</span>
                  </div>
                )}
                {courseContent?.total_quizzes > 0 && (
                  <div className="flex items-center space-x-3">
                    <DocumentIcon className="w-5 h-5 text-orange-500" />
                    <span>{courseContent.total_quizzes} tests & quizzes</span>
                  </div>
                )}
                {courseContent?.total_questions > 0 && (
                  <div className="flex items-center space-x-3">
                    <PlayIcon className="w-5 h-5 text-orange-500" />
                    <span>{courseContent.total_questions} practice questions</span>
                  </div>
                )}
                <div className="flex items-center space-x-3">
                  <AcademicCapIcon className="w-5 h-5 text-yellow-500" />
                  <span>Certificate of completion</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CalendarIcon className="w-5 h-5 text-red-500" />
                  <span>Lifetime access</span>
                </div>
              </div>

              {course.program_name && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="text-center">
                    <span className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 text-sm font-medium rounded-full">
                      🎓 {course.program_name}
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500 text-center">
                  Quality education guaranteed
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetails;