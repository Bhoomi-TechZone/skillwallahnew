import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaClock, FaStar, FaUser, FaUsers, FaPlay, FaArrowRight, FaGraduationCap, FaBookOpen, FaRupeeSign, FaCheck, FaVideo, FaDownload, FaLanguage, FaCalendar, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import VideoPlayer from '../components/VideoPlayer';
import RazorpayPayment from '../components/RazorpayPayment';
import { isVideoFile, isDataUrl, isRemoteUrl, getDefaultThumbnail } from '../utils/fileUtils';

const CourseDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSection, setExpandedSection] = useState('curriculum');
  const [enrolling, setEnrolling] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [studentData, setStudentData] = useState({});

  // Fetch course details
  useEffect(() => {
    const loadCourseDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔍 Fetching course details for ID:', id);

        // Use the new branch-courses API
        const response = await fetch(`http://localhost:4000/api/branch-courses/courses`);

        let courseData = null;

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Branch courses API response:', data);

          // Find the specific course by ID
          const coursesArray = Array.isArray(data) ? data : (data.courses || []);
          courseData = coursesArray.find(c =>
            String(c.id) === String(id) ||
            String(c._id) === String(id) ||
            String(c.course_id) === String(id)
          );

          console.log('🔍 Found course data:', courseData);
        } else {
          throw new Error(`API response error: ${response.status}`);
        }

        if (courseData) {
          // Transform backend data
          const thumbnailData = getCourseThumbnailUrl(courseData);
          const transformedCourse = {
            id: courseData.id || courseData._id || id,
            title: courseData.course_name || courseData.title || 'Course Title',
            subtitle: courseData.short_description || courseData.subtitle || 'Complete course description',
            description: courseData.long_description || courseData.description || 'Complete course description not available.',
            image: thumbnailData.url || getDefaultThumbnail(courseData.category),
            isVideoThumbnail: thumbnailData.isVideo,
            videoThumbnailUrl: thumbnailData.videoUrl,
            level: courseData.difficulty_level || courseData.level || courseData.difficulty || 'All Levels',
            duration: courseData.duration || `${courseData.estimated_duration || '8'} Weeks`,
            students: courseData.enrolled_count ? `${courseData.enrolled_count}+` : courseData.enrolled_students ? `${courseData.enrolled_students}+` : '5000+',
            rating: courseData.average_rating || courseData.rating || 4.8,
            reviews: courseData.total_reviews || courseData.reviews_count || 150,
            price: (() => {
              const fee = courseData.price || courseData.course_fee || courseData.fee || 0;
              return typeof fee === 'string' ? parseFloat(fee) : fee;
            })(),
            priceDisplay: (() => {
              const fee = courseData.price || courseData.course_fee || courseData.fee || 0;
              const numFee = typeof fee === 'string' ? parseFloat(fee) : fee;
              return numFee > 0 ? `₹${numFee}` : 'Free';
            })(),
            originalPrice: (() => {
              const fee = courseData.price || courseData.course_fee || courseData.fee || 0;
              const numFee = typeof fee === 'string' ? parseFloat(fee) : fee;
              return numFee > 0 ? `₹${Math.floor(numFee * 2)}` : '₹999';
            })(),
            features: courseData.features || courseData.what_you_learn || courseData.tags ||
              ["Certificate", "Live Projects", "Expert Support", "Lifetime Access"],
            category: courseData.category || courseData.program_name || 'Programming',
            instructor: courseData.instructor_name || courseData.instructor || courseData.created_by || 'Expert Instructor',
            instructorBio: courseData.instructor_bio || 'Experienced industry professional with years of teaching expertise.',
            instructorRating: courseData.instructor_rating || 4.9,
            // Detailed course content
            modules: courseData.curriculum || courseData.modules || [
              { title: 'Introduction', lessons: 5, duration: '2 hours' },
              { title: 'Core Concepts', lessons: 8, duration: '4 hours' },
              { title: 'Practical Projects', lessons: 6, duration: '3 hours' },
              { title: 'Advanced Topics', lessons: 4, duration: '2 hours' }
            ],
            requirements: courseData.prerequisites || courseData.requirements || [
              'Basic computer knowledge',
              'Internet connection',
              'Willingness to learn'
            ],
            whatYouLearn: courseData.learning_outcomes || courseData.what_you_learn || [
              'Master the fundamentals',
              'Build real-world projects',
              'Get industry-ready skills',
              'Earn a certificate'
            ],
            language: courseData.course_language || courseData.language || 'Hindi & English',
            certificateAvailable: courseData.certificate_available !== false,
            totalLessons: courseData.total_lessons || courseData.lesson_count || 23,
            totalDuration: courseData.total_duration || '12 hours',
            lastUpdated: courseData.updated_at || courseData.last_updated || courseData.updatedAt || '2024-01-01',
            instructorCourses: courseData.instructor_courses || 15,
            instructorStudents: courseData.instructor_students || 50000,
            // Additional branch course fields
            course_code: courseData.course_code,
            program_name: courseData.program_name,
            syllabus: courseData.syllabus,
            duration_months: courseData.duration_months
          };

          console.log('Transformed course:', transformedCourse);
          setCourse(transformedCourse);
        } else {
          setError('Course not found');
        }
      } catch (err) {
        console.error('Error loading course details:', err);
        setError(`Failed to load course: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadCourseDetails();
    }
  }, [id]);

  // Load student data from localStorage/session
  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      try {
        // Try to decode JWT or get user info from storage
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || sessionStorage.getItem('userInfo') || '{}');
        setStudentData({
          name: userInfo.name || userInfo.username || 'Student',
          email: userInfo.email || 'student@example.com',
          phone: userInfo.phone || '',
          student_id: userInfo.id || userInfo._id || 'temp_student_id'
        });
      } catch (error) {
        console.error('Failed to load student data:', error);
        setStudentData({
          name: 'Student',
          email: 'student@example.com',
          phone: '',
          student_id: 'temp_student_id'
        });
      }
    }
  }, []);

  // Helper functions
  const getCourseThumbnailUrl = (course) => {
    if (!course) return { url: null, isVideo: false, videoUrl: null };

    // Check for video-specific fields first
    if (course.thumbnail_is_video || course.has_video_thumbnail) {
      const videoUrl = course.thumbnail_video_url || course.original_thumbnail_path;
      if (videoUrl) {
        let processedVideoUrl = videoUrl;

        // Convert Windows path to proper URL
        if (videoUrl.includes(':/') && !videoUrl.startsWith('http')) {
          const filename = videoUrl.split(/[/\\]/).pop();
          processedVideoUrl = `http://localhost:4000/uploads/courses/${filename}`;
        } else if (!videoUrl.startsWith('http') && !videoUrl.startsWith('/')) {
          processedVideoUrl = `http://localhost:4000/${videoUrl}`;
        }

        console.log(`[DEBUG] Found video thumbnail for ${course.title}: ${processedVideoUrl}`);
        return { url: null, isVideo: true, videoUrl: processedVideoUrl };
      }
    }

    const imageField = course.thumbnail || course.course_image || course.image || course.cover_image || course.featured_image || course.course_thumbnail;

    if (!imageField || imageField === '') {
      console.log(`[DEBUG] No image field found for course: ${course.title}`);
      return { url: null, isVideo: false, videoUrl: null };
    }

    console.log(`[DEBUG] Processing image field for ${course.title}: ${imageField}`);

    // Handle base64 images
    if (typeof imageField === 'string' && isDataUrl(imageField)) {
      return { url: imageField, isVideo: false, videoUrl: null };
    }

    // Handle external URLs
    if (typeof imageField === 'string' && isRemoteUrl(imageField)) {
      return { url: imageField, isVideo: false, videoUrl: null };
    }

    // Check if it's a video file
    if (typeof imageField === 'string' && isVideoFile(imageField)) {
      console.log(`[DEBUG] Converting video file to video player: ${imageField}`);

      let videoUrl = imageField;

      // Handle Windows absolute paths - extract just filename
      if (imageField.includes(':')) {
        const filename = imageField.split(/[/\\]/).pop();
        if (filename) {
          videoUrl = `http://localhost:4000/uploads/courses/${filename}`;
        }
      } else if (!imageField.startsWith('http') && !imageField.startsWith('/')) {
        videoUrl = `http://localhost:4000/uploads/courses/${imageField}`;
      }

      return { url: null, isVideo: true, videoUrl };
    }

    // Handle Windows absolute paths - extract just filename for images
    if (typeof imageField === 'string' && imageField.includes(':')) {
      const filename = imageField.split(/[/\\]/).pop();
      if (filename) {
        const imageUrl = `http://localhost:4000/uploads/courses/${filename}`;
        console.log(`[DEBUG] Converted Windows path to: ${imageUrl}`);
        return { url: imageUrl, isVideo: false, videoUrl: null };
      }
      console.log(`[DEBUG] Invalid filename: ${filename}`);
      return { url: null, isVideo: false, videoUrl: null };
    }

    // Handle relative paths
    const cleanPath = imageField.replace(/^[\/\\]+/, '');

    let finalUrl;
    // If path starts with 'uploads/', use it directly
    if (cleanPath.startsWith('uploads/')) {
      finalUrl = `http://localhost:4000/${cleanPath}`;
    } else {
      // Otherwise assume it's in the courses folder
      finalUrl = `http://localhost:4000/uploads/courses/${cleanPath}`;
    }

    console.log(`[DEBUG] Final image URL: ${finalUrl}`);
    return { url: finalUrl, isVideo: false, videoUrl: null };
  };

  const calculateDiscount = () => {
    if (!course.originalPrice || !course.price || course.price === 0) return 0;
    const original = parseInt(course.originalPrice.replace('₹', ''));
    const current = course.price;
    return Math.round(((original - current) / original) * 100);
  };

  const handleEnroll = async () => {
    try {
      setEnrolling(true);

      // Check if user is logged in
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        // Store current URL to redirect back after login
        const currentUrl = `/course-details/${id}`;
        localStorage.setItem('redirectAfterLogin', currentUrl);
        // Redirect to student login page with redirect param
        navigate(`/student-login?redirect=${encodeURIComponent(currentUrl)}`);
        return;
      }

      // For free courses, enroll directly
      if (course.price === 0) {
        // API call to enroll in free course
        const response = await fetch(`http://localhost:4000/payments/enroll-free-course/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            course_id: course.id || course._id,
            student_id: studentData.student_id || 'temp_student_id'
          })
        });

        if (response.ok) {
          const result = await response.json();
          alert('🎉 Successfully enrolled in the course!');
          navigate(`/course-content/${id}`);
        } else {
          throw new Error('Enrollment failed');
        }
      } else {
        // For paid courses, show Razorpay payment
        setShowPayment(true);
      }
    } catch (err) {
      console.error('Enrollment error:', err);
      alert('❌ Enrollment failed. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  const handlePaymentSuccess = (result, enrollmentData) => {
    alert(`🎉 Payment successful! Welcome to ${enrollmentData.course_name}!`);
    setShowPayment(false);
    navigate(`/course-content/${enrollmentData.course_id}`);
  };

  const handlePaymentError = (error) => {
    alert(`❌ ${error}`);
    setShowPayment(false);
  };

  const handlePaymentClose = () => {
    setShowPayment(false);
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin inline-block w-20 h-20 border-4 border-amber-500 border-t-transparent rounded-full mb-6"></div>
          <p className="text-2xl font-medium text-gray-600">Loading course details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl mb-8">😞</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Course not found</h2>
          <p className="text-gray-600 mb-8">{error}</p>
          <button
            onClick={() => navigate('/courses')}
            className="bg-amber-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-amber-700 transition-colors"
          >
            View All Courses
          </button>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl mb-8">📚</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Course details not found</h2>
          <button
            onClick={() => navigate('/courses')}
            className="bg-amber-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-amber-700 transition-colors"
          >
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-gray-900">
              <div className="mb-6">
                <span className="bg-amber-500/30 text-amber-800 px-4 py-2 rounded-full text-sm font-medium">
                  {course.category}
                </span>
              </div>

              <h1 className="text-5xl font-bold mb-6 leading-tight text-gray-900">
                {course.title}
              </h1>

              <p className="text-xl mb-8 text-gray-700 leading-relaxed">
                {course.subtitle}
              </p>

              {/* Course Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-amber-600">{course.rating}</div>
                  <div className="text-sm text-gray-600">⭐ Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-amber-600">{course.students}</div>
                  <div className="text-sm text-gray-600">Students</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-amber-600">{course.totalLessons}</div>
                  <div className="text-sm text-gray-600">Lessons</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-amber-600">{course.totalDuration}</div>
                  <div className="text-sm text-gray-600">Duration</div>
                </div>
              </div>

              {/* Instructor Info */}
              <div className="flex items-center gap-4 mb-8 bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-amber-200">
                <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  {course.instructor.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-lg text-gray-900">{course.instructor}</div>
                  <div className="text-amber-700 text-sm">⭐ {course.instructorRating} • {course.instructorCourses} Courses • {course.instructorStudents}+ Students</div>
                </div>
              </div>

              {/* Price and Enroll */}
              <div className="flex items-center justify-between bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-amber-200">
                <div>
                  <div className="flex items-center gap-4 mb-2">
                    <span className="text-4xl font-bold text-amber-600">
                      {course.priceDisplay}
                    </span>
                    {course.originalPrice && course.price > 0 && (
                      <>
                        <span className="text-xl text-gray-500 line-through">
                          {course.originalPrice}
                        </span>
                        <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                          {calculateDiscount()}% OFF
                        </span>
                      </>
                    )}
                  </div>
                  {course.certificateAvailable && (
                    <div className="flex items-center gap-2 text-amber-700 text-sm">
                      <FaGraduationCap />
                      <span>Certificate of Completion included</span>
                    </div>
                  )}
                </div>
                {/* Enrollment Button */}
                {course.price === 0 ? (
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="bg-gradient-to-r from-orange-500 to-emerald-600 text-white px-8 py-4 rounded-xl font-bold hover:from-orange-600 hover:to-emerald-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 disabled:opacity-50 disabled:transform-none"
                  >
                    {enrolling ? 'Enrolling...' : 'Enroll Free'}
                  </button>
                ) : !showPayment ? (
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-8 py-4 rounded-xl font-bold hover:from-amber-600 hover:to-orange-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 disabled:opacity-50 disabled:transform-none"
                  >
                    {enrolling ? 'Processing...' : 'Enroll Now'}
                  </button>
                ) : (
                  <RazorpayPayment
                    course={course}
                    studentData={studentData}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    onClose={handlePaymentClose}
                  />
                )}
              </div>
            </div>

            {/* Right Content - Course Image */}
            <div className="relative">
              <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl p-4 shadow-2xl border border-amber-200">
                <div className="relative h-80 bg-gradient-to-br from-amber-50 to-orange-100 rounded-2xl overflow-hidden">
                  {(() => {
                    const thumbnailData = getCourseThumbnailUrl(course);

                    if (thumbnailData.isVideo && thumbnailData.videoUrl) {
                      return (
                        <VideoPlayer
                          src={thumbnailData.videoUrl}
                          alt={`${course.course_title || course.title} - Course Preview`}
                          className="w-full h-full object-cover rounded-2xl"
                          autoPlay={false}
                          muted={true}
                          controls={true}
                          fallbackImage={getDefaultThumbnail()}
                        />
                      );
                    } else if (thumbnailData.url) {
                      return (
                        <img
                          src={thumbnailData.url}
                          alt={course.course_title || course.title}
                          className="w-full h-full object-cover rounded-2xl"
                          onError={(e) => {
                            console.error('Course image failed to load:', thumbnailData.url);
                            e.target.src = getDefaultThumbnail();
                          }}
                        />
                      );
                    } else {
                      return (
                        <img
                          src={getDefaultThumbnail()}
                          alt={course.course_title || course.title}
                          className="w-full h-full object-cover rounded-2xl"
                        />
                      );
                    }
                  })()}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-2xl"></div>

                  {/* Play Button - only show if it's not already a video player with controls */}
                  {(() => {
                    const thumbnailData = getCourseThumbnailUrl(course);
                    if (!thumbnailData.isVideo) {
                      return (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-white/90 rounded-full p-6 shadow-xl cursor-pointer hover:scale-110 transition-transform duration-300">
                            <FaPlay className="text-amber-600 text-3xl" />
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()
                  }
                </div>
              </div>

              <div className="absolute -top-6 -right-6 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-4 py-2 rounded-full font-bold shadow-xl animate-bounce">
                <span className="text-sm">🆕 New Course!</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Course Details Section */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Course Description */}
              <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">About this Course</h2>
                <p className="text-gray-700 leading-relaxed text-lg">
                  {course.description}
                </p>
              </div>

              {/* What You'll Learn */}
              <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">What You'll Learn</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {course.whatYouLearn.map((item, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <FaCheck className="text-white text-sm" />
                      </div>
                      <span className="text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Course Curriculum */}
              <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Course Curriculum</h2>
                <div className="space-y-4">
                  {course.modules.map((module, index) => (
                    <div key={index} className="border border-gray-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleSection(`module-${index}`)}
                        className="w-full flex items-center justify-between p-6 bg-amber-50 hover:bg-amber-100 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <span className="bg-amber-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                            {index + 1}
                          </span>
                          <div className="text-left">
                            <h3 className="font-bold text-gray-900">{module.title}</h3>
                            <p className="text-gray-600 text-sm">{module.lessons} lessons • {module.duration}</p>
                          </div>
                        </div>
                        {expandedSection === `module-${index}` ? <FaChevronUp /> : <FaChevronDown />}
                      </button>
                      {expandedSection === `module-${index}` && (
                        <div className="p-6 bg-white">
                          <p className="text-gray-700">Module content details would be displayed here...</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Requirements */}
              <div className="bg-white rounded-3xl shadow-xl p-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Requirements</h2>
                <ul className="space-y-3">
                  {course.requirements.map((req, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-700">{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              {/* Course Features */}
              <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 sticky top-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">This course includes</h3>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <FaVideo className="text-amber-500" />
                    <span className="text-gray-700">{course.totalDuration} on-demand video</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <FaBookOpen className="text-orange-500" />
                    <span className="text-gray-700">{course.totalLessons} lessons</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <FaDownload className="text-amber-600" />
                    <span className="text-gray-700">Downloadable resources</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <FaGraduationCap className="text-yellow-600" />
                    <span className="text-gray-700">Certificate of completion</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <FaLanguage className="text-orange-600" />
                    <span className="text-gray-700">{course.language}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <FaCalendar className="text-amber-700" />
                    <span className="text-gray-700">Lifetime access</span>
                  </div>
                </div>

                <div className="border-t border-gray-200 my-6"></div>

                {/* Course Features List */}
                <h4 className="font-bold text-gray-900 mb-4">Additional Features</h4>
                <div className="space-y-2">
                  {course.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <FaCheck className="text-orange-500 text-sm" />
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 my-6"></div>

                {/* Enroll Button */}
                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white py-4 rounded-xl font-bold hover:from-amber-600 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:transform-none"
                >
                  {enrolling ? 'Enrolling...' : course.price === 0 ? '🆓 Enroll Free' : `💳 Enroll for ${course.priceDisplay}`}
                </button>

                <p className="text-center text-gray-500 text-sm mt-4">
                  30-day money-back guarantee
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CourseDetailsPage;