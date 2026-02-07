import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ConnectWithUsModal from '../components/ConnectWithUsModal';
import { FaClock, FaStar, FaUser, FaUsers, FaPlay, FaArrowRight, FaGraduationCap, FaFilter, FaSearch, FaTimes, FaChevronDown } from 'react-icons/fa';

const WeCourseOffer = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch courses from backend
  useEffect(() => {
    const loadCourses = async () => {
      try {
        setCoursesLoading(true);
        setError(null);

        console.log('Fetching courses from backend...');
        // Use branch courses API which doesn't require authentication
        const response = await fetch('http://localhost:4000/api/branch-courses/courses');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Backend response:', data);

        // Branch API returns array directly
        const coursesData = Array.isArray(data) ? data : (data.courses || []);

        if (coursesData.length > 0) {
          // Transform backend data to match frontend format
          const transformedCourses = coursesData.map((course, index) => ({
            id: course.id || course._id || index + 1,
            title: course.course_name || course.title || 'Course Title',
            subtitle: course.description?.substring(0, 50) + '...' || 'Learn and Grow',
            description: course.description || course.syllabus_outline || 'Complete course description not available.',
            image: getCourseThumbnailUrl(course) || getDefaultImageForCategory(course.category || course.program_name, index),
            level: course.level || 'All Levels',
            duration: `${course.duration_months || course.duration || 0} Months`,
            students: `${course.enrolled_students || 0}+`,
            rating: course.rating || 4.5,
            price: (() => {
              const fee = course.fee || course.course_fee || course.price || 0;
              const numFee = typeof fee === 'string' ? parseFloat(fee) : fee;
              return numFee > 0 ? `₹${numFee}` : 'Free';
            })(),
            originalPrice: (() => {
              const fee = course.fee || course.course_fee || course.price || 0;
              const numFee = typeof fee === 'string' ? parseFloat(fee) : fee;
              return numFee > 0 ? `₹${Math.floor(numFee * 1.2)}` : '₹0';
            })(),
            actualPrice: course.fee || course.course_fee || course.price || 0,
            features: course.features || ["Certification", "Live Projects", "Expert Support", "Lifetime Access"],
            category: course.category || course.program_name || 'General',
            instructor: course.instructor || 'Expert Instructor',
            instructorId: course.instructor_id,
            courseId: course.course_code || course.id,
            published: course.status === 'active',
            createdDate: course.created_at,
            lastUpdated: course.updated_at,
          }));

          console.log('Transformed courses:', transformedCourses);
          setCourses(transformedCourses);
        } else {
          console.log('No courses found in backend response');
          setCourses([]);
        }
      } catch (err) {
        console.error('Error loading courses:', err);
        setError(`Failed to load courses: ${err.message}`);
        setCourses([]);
      } finally {
        setCoursesLoading(false);
      }
    };

    loadCourses();
  }, []);

  // Function to get course thumbnail URL from backend
  const getCourseThumbnailUrl = (course) => {
    if (!course) return null;

    // Check multiple possible field names for images
    const imageField = course.thumbnail ||
      course.course_image ||
      course.image ||
      course.cover_image ||
      course.featured_image ||
      course.course_thumbnail;

    if (!imageField || imageField === '') return null;

    // If it's a base64 data URL, return it directly
    if (typeof imageField === 'string' && imageField.startsWith('data:image/')) {
      return imageField;
    }

    // If it's already a full HTTP URL, return it
    if (typeof imageField === 'string' && (imageField.startsWith('http') || imageField.startsWith('//'))) {
      return imageField;
    }

    // Construct full URL with backend server for file paths
    const cleanPath = imageField.replace(/^\/+/, '');
    return `http://localhost:4000/${cleanPath}`;
  };

  // Function to get default image based on category
  const getDefaultImageForCategory = (category, index) => {
    const categoryImages = {
      'web development': 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?auto=format&fit=crop&w=800&q=80',
      'data science': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
      'machine learning': 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=800&q=80',
      'design': 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=800&q=80',
      'mobile development': 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=800&q=80',
      'cloud computing': 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?auto=format&fit=crop&w=800&q=80',
      'digital marketing': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
      'programming': 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=800&q=80'
    };

    const categoryKey = category ? category.toLowerCase() : 'programming';
    return categoryImages[categoryKey] || categoryImages['programming'];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-orange-500/10"></div>
        <div className="absolute top-10 left-10 w-32 h-32 bg-amber-200/30 rounded-full blur-xl"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-orange-200/30 rounded-full blur-xl"></div>

        <div className="relative max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              <div className="mb-6">
                <span className="inline-block bg-amber-100 text-amber-800 text-sm font-bold px-4 py-2 rounded-full mb-4 border border-amber-200">
                  🎓 Professional Learning Platform
                </span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Explore Our <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600">
                  Premium Courses
                </span>
              </h1>
              <p className="text-xl text-gray-700 mb-8 leading-relaxed max-w-lg mx-auto lg:mx-0">
                Transform your career with our expertly crafted courses. Learn from industry professionals and gain skills that matter in today's competitive market.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button
                  onClick={() => document.querySelector('#courses-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-8 py-4 rounded-xl font-bold hover:from-amber-700 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  Browse Courses 📚
                </button>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="border-2 border-amber-600 text-amber-600 px-8 py-4 rounded-xl font-bold hover:bg-amber-600 hover:text-white transition-all duration-300 shadow-lg"
                >
                  Get Consultation 💬
                </button>
              </div>
            </div>

            {/* Right Content - Hero Image */}
            <div className="relative">
              <div className="relative z-10">
                <div className="relative bg-white rounded-3xl shadow-2xl p-4 transform hover:scale-105 transition-all duration-500">
                  <div className="relative h-80 bg-gradient-to-br from-amber-50 to-orange-100 rounded-2xl overflow-hidden">
                    <div className="absolute inset-0">
                      <img
                        src="/hero1.jpg"
                        alt="Students Learning"
                        className="w-full h-full object-cover rounded-2xl opacity-75"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/40 to-orange-500/40 rounded-2xl"></div>
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-white">
                        <div className="text-6xl mb-4 animate-pulse">🎓</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="absolute -top-6 -right-6 bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-4 py-2 rounded-full font-bold shadow-xl animate-bounce transform rotate-12">
                  <span className="text-sm">🆕 New Courses!</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/50">
              <div className="text-3xl font-bold text-amber-600 mb-2">500+</div>
              <div className="text-gray-700 font-medium">Happy Students</div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/50">
              <div className="text-3xl font-bold text-amber-600 mb-2">50+</div>
              <div className="text-gray-700 font-medium">Expert Instructors</div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/50">
              <div className="text-3xl font-bold text-amber-600 mb-2">25+</div>
              <div className="text-gray-700 font-medium">Course Categories</div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/50">
              <div className="text-3xl font-bold text-amber-600 mb-2">95%</div>
              <div className="text-gray-700 font-medium">Success Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Course Grid Section */}
      <section id="courses-section" className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Our <span className="text-amber-600">Premium</span> Courses
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Choose from our carefully curated selection of courses designed to advance your career
            </p>
          </div>

          {/* Loading State */}
          {coursesLoading && (
            <div className="text-center py-16">
              <div className="animate-spin inline-block w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full mb-4"></div>
              <p className="text-xl font-medium text-gray-600">Loading Courses...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-16">
              <div className="text-6xl mb-6">⚠️</div>
              <h3 className="text-2xl font-bold text-red-600 mb-4">Error Loading Courses</h3>
              <p className="text-gray-600 mb-8">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-amber-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* No Courses State */}
          {!coursesLoading && !error && courses.length === 0 && (
            <div className="text-center py-16">
              <div className="text-6xl mb-6">📚</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">No Courses Available</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                We're working on adding amazing courses for you. Check back soon or get in touch to learn about upcoming courses!
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-amber-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-amber-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Get Notified 🔔
              </button>
            </div>
          )}

          {/* Courses Grid */}
          {!coursesLoading && !error && courses.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {courses.map((course, index) => (
                <div key={course.id || index} className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group border border-gray-100 flex flex-col h-full">
                  {/* Course Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={course.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80'}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>

                    {/* Course Level Badge */}
                    <div className="absolute top-4 left-4">
                      <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        {course.level || 'All Levels'}
                      </span>
                    </div>

                    {/* Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-white/90 rounded-full p-4 transform group-hover:scale-110 transition-transform duration-300 cursor-pointer">
                        <FaPlay className="text-amber-600 text-xl" />
                      </div>
                    </div>
                  </div>

                  {/* Course Content */}
                  <div className="p-6 flex flex-col flex-1">
                    {/* Course Title */}
                    <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-amber-600 transition-colors">
                      {course.title || 'Course Title'}
                    </h3>

                    {/* Course Subtitle */}
                    <p className="text-sm font-medium text-amber-600 mb-3">
                      {course.subtitle || course.short_description || 'Learn and Grow'}
                    </p>

                    {/* Course Description */}
                    <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">
                      {course.description || 'Complete course description not available.'}
                    </p>

                    {/* Course Stats */}
                    <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <FaUser className="text-amber-500" />
                        <span className="font-medium">{course.instructor || 'Expert Instructor'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FaClock className="text-blue-500" />
                        <span>{course.duration || '6 Weeks'}</span>
                      </div>
                    </div>

                    {/* Rating and Students */}
                    <div className="flex items-center justify-between mb-4 text-sm">
                      <div className="flex items-center gap-1">
                        <FaUsers className="text-orange-500" />
                        <span className="text-gray-600">{course.students || '100+'} students</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FaStar className="text-yellow-500" />
                        <span className="font-medium text-gray-700">
                          {typeof course.rating === 'number' ? course.rating.toFixed(1) : (course.rating || '4.8')}
                        </span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-orange-600">
                          {course.price || 'Free'}
                        </span>
                        {course.originalPrice && course.originalPrice !== course.price && (
                          <span className="text-sm text-gray-400 line-through">
                            {course.originalPrice}
                          </span>
                        )}
                      </div>
                      {course.price && course.price !== 'Free' && course.originalPrice && (
                        <div className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-medium">
                          Save {Math.round(((parseFloat(course.originalPrice.replace('₹', '')) - parseFloat(course.price.replace('₹', ''))) / parseFloat(course.originalPrice.replace('₹', ''))) * 100)}%
                        </div>
                      )}
                    </div>

                    {/* Course Features */}
                    {course.features && course.features.length > 0 && (
                      <div className="mb-6">
                        <div className="flex flex-wrap gap-2">
                          {course.features.slice(0, 2).map((feature, idx) => (
                            <span key={idx} className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs border border-amber-200">
                              {feature}
                            </span>
                          ))}
                          {course.features.length > 2 && (
                            <span className="text-xs text-amber-600 font-medium px-2 py-1">
                              +{course.features.length - 2} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-auto">
                      <button
                        onClick={() => navigate(`/course-details/${course.id}`)}
                        className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-bold py-3 px-4 rounded-lg hover:shadow-lg hover:shadow-amber-500/25 transition-all duration-300 flex items-center justify-center gap-2 group"
                      >
                        <span>Enroll Now</span>
                        <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Show All Courses Button */}
          {!coursesLoading && courses.length > 0 && (
            <div className="text-center mt-12">
              <Link to="/courses">
                <button className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-8 py-4 rounded-xl font-bold hover:from-amber-700 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                  View All Courses
                </button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-amber-600 via-yellow-600 to-orange-600 py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="max-w-4xl mx-auto text-center text-white relative z-10">
          <div className="mb-6">
            <span className="inline-block text-5xl mb-4">🚀</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to <span className="text-yellow-200">Transform</span> Your Career?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto leading-relaxed">
            Join thousands of students who are advancing their careers with our expertly designed courses
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-white text-amber-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
            >
              Get Course Consultation 💬
            </button>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold hover:bg-white hover:text-amber-600 transition-all duration-300 transform hover:scale-105"
            >
              Browse Courses Again 📚
            </button>
          </div>
        </div>
      </section>

      <ConnectWithUsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default WeCourseOffer;