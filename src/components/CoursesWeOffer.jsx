import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { FaArrowRight, FaChartBar, FaClock, FaCode, FaDatabase, FaGraduationCap, FaPalette, FaPlay, FaRocket, FaStar, FaUser, FaUsers } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import { getCourseCategories } from '../api/coursesApi';

const CoursesWeOffer = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState(0);
  const [featuredCourses, setFeaturedCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [enrolling, setEnrolling] = useState(false);

  // Fetch courses from backend
  useEffect(() => {
    const loadCourses = async () => {
      try {
        setCoursesLoading(true);
        // Use the branch courses API that doesn't require authentication
        const response = await fetch('http://localhost:4000/api/branch-courses/courses');

        console.log('🔍 Response status:', response.status);
        console.log('🔍 Response ok:', response.ok);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('🔍 Raw data received:', data);
        console.log('🔍 Data type:', typeof data);
        console.log('🔍 Data is array?', Array.isArray(data));

        // Branch API returns array directly
        const coursesData = Array.isArray(data) ? data : (data.courses || []);
        console.log('🔍 Courses data:', coursesData);
        console.log('🔍 Courses data length:', coursesData.length);

        if (coursesData.length > 0) {
          console.log('✅ Courses loaded from backend:', coursesData);
          console.log('✅ First course:', coursesData[0]);
          // Transform backend data to match frontend format
          const transformedCourses = coursesData.slice(0, 6).map((course, index) => ({
            id: course.id || course._id || index + 1,
            title: course.course_name || course.title || 'Course Title',
            subtitle: course.description?.substring(0, 50) || 'Learn and Grow',
            description: course.description || course.syllabus_outline || 'Complete course description not available.',
            icon: getIconForCategory(course.category || course.program_name),
            image: getCourseThumbnailUrl(course) || `https://images.unsplash.com/photo-${1627398242454 + index}?auto=format&fit=crop&w=800&q=80`,
            level: course.level || 'All Levels',
            duration: `${course.duration_months} Months`,
            students: `${course.enrolled_students || 0}+`,
            rating: course.rating || 4.5,
            price: course.fee ? `₹${course.fee}` : 'Free',
            originalPrice: course.fee ? `₹${Math.floor(course.fee * 1.2)}` : '₹0',
            features: course.features || ["Certification", "Live Projects", "Expert Support", "Lifetime Access"],
            color: getColorGradient(index),
            bgColor: getBgColorGradient(index),
            category: course.category || course.program_name || 'General',
            instructor: course.instructor || 'Expert Instructor'
          }));

          setFeaturedCourses(transformedCourses);
        } else {
          console.log('No courses found in backend');
          setFeaturedCourses([]);
        }
      } catch (err) {
        console.error('Error loading courses:', err);
        setError('Failed to load courses');
        setFeaturedCourses([]);
      } finally {
        setCoursesLoading(false);
      }
    };

    loadCourses();
  }, []);

  // Handle enrollment click
  const handleEnrollClick = async (course) => {
    try {
      setEnrolling(true);
      console.log('Enroll clicked for course:', course.id, course.title);

      // Check if user is logged in
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        // Redirect to login page
        navigate('/login', { state: { returnTo: `/course-details/${course.id}` } });
        return;
      }

      // Check if course is free
      const coursePrice = typeof course.price === 'string' ?
        parseFloat(course.price.replace(/[$₹]/, '')) || 0 :
        course.price || 0;

      if (coursePrice === 0 || course.price === 'Free') {
        // Free course - enroll directly
        await handleFreeEnrollment(course);
      } else {
        // Paid course - show payment modal
        setSelectedCourse(course);
        setShowPaymentModal(true);
      }
    } catch (error) {
      console.error('Enrollment error:', error);
      alert('❌ Enrollment failed. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  // Handle free course enrollment
  const handleFreeEnrollment = async (course) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || sessionStorage.getItem('userInfo') || '{}');

      const response = await fetch('http://localhost:4000/payments/enroll-free-course/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          course_id: course.id,
          student_id: userInfo.id || userInfo._id || 'temp_student_id',
          student_name: userInfo.name || userInfo.username || 'Student',
          student_email: userInfo.email || 'student@example.com'
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert('🎉 Successfully enrolled in the course!');
        navigate(`/course-content/${course.id}`);
      } else {
        throw new Error('Free enrollment failed');
      }
    } catch (error) {
      console.error('Free enrollment error:', error);
      alert('❌ Free enrollment failed. Please try again.');
    }
  };

  // Handle Razorpay payment
  const handlePayment = async () => {
    try {
      if (!selectedCourse) return;

      setEnrolling(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || sessionStorage.getItem('userInfo') || '{}');

      const coursePrice = typeof selectedCourse.price === 'string' ?
        parseFloat(selectedCourse.price.replace(/[$₹]/, '')) || 0 :
        selectedCourse.price || 0;

      // Create enrollment order
      const response = await fetch('http://localhost:4000/payments/enroll-course/init', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          student_name: userInfo.name || userInfo.username || 'Student',
          student_email: userInfo.email || 'student@example.com',
          student_phone: userInfo.phone || '',
          amount: Math.round(coursePrice * 82), // Convert to INR approximately
          course_id: selectedCourse.id,
          currency: 'INR',
          provider: 'razorpay'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create payment order');
      }

      const orderData = await response.json();

      // Load Razorpay script if not already loaded
      if (!window.Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        document.body.appendChild(script);
        await new Promise(resolve => script.onload = resolve);
      }

      // Razorpay payment options
      const options = {
        key: orderData.razorpay_key_id,
        amount: orderData.amount * 100, // Convert to paise
        currency: orderData.currency,
        name: "SkillWallah EdTech",
        description: `Enrollment in ${selectedCourse.title}`,
        order_id: orderData.razorpay_order_id,
        handler: async function (paymentResponse) {
          await handlePaymentSuccess(paymentResponse, orderData.enrollment_id);
        },
        prefill: {
          name: userInfo.name || userInfo.username || 'Student',
          email: userInfo.email || 'student@example.com',
          contact: userInfo.phone || ''
        },
        theme: {
          color: "#f59e0b" // Pale Olivecolor
        },
        modal: {
          ondismiss: function () {
            setShowPaymentModal(false);
            setEnrolling(false);
          }
        }
      };

      // Open Razorpay checkout
      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error('Payment error:', error);
      alert('❌ Payment failed. Please try again.');
      setShowPaymentModal(false);
      setEnrolling(false);
    }
  };

  // Handle payment success
  const handlePaymentSuccess = async (paymentResponse, enrollmentId) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');

      // Verify payment
      const verifyResponse = await fetch('http://localhost:4000/payments/enroll-course/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          enrollment_id: enrollmentId,
          order_id: paymentResponse.razorpay_order_id,
          payment_id: paymentResponse.razorpay_payment_id,
          signature: paymentResponse.razorpay_signature
        })
      });

      if (verifyResponse.ok) {
        const result = await verifyResponse.json();
        alert(`🎉 Payment successful! Welcome to ${selectedCourse.title}!`);
        setShowPaymentModal(false);
        navigate(`/course-content/${selectedCourse.id}`);
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      alert('❌ Payment completed but verification failed. Please contact support.');
    } finally {
      setEnrolling(false);
    }
  };

  // Helper function to get icon based on category
  const getIconForCategory = (category) => {
    if (!category) return FaCode;

    const cat = category.toLowerCase();
    if (cat.includes('web') || cat.includes('development') || cat.includes('programming')) return FaCode;
    if (cat.includes('data') || cat.includes('analytics') || cat.includes('science')) return FaChartBar;
    if (cat.includes('design') || cat.includes('ui') || cat.includes('ux')) return FaPalette;
    if (cat.includes('mobile') || cat.includes('app') || cat.includes('android') || cat.includes('ios')) return FaDatabase;
    if (cat.includes('cloud') || cat.includes('devops') || cat.includes('aws')) return FaRocket;
    return FaCode; // default
  };

  // Helper function to get color gradient based on index
  const getColorGradient = (index) => {
    const gradients = [
      "from-amber-500 to-yellow-600",
      "from-blue-500 to-indigo-600",
      "from-pink-500 to-purple-600",
      "from-emerald-500 to-teal-600",
      "from-violet-500 to-purple-600",
      "from-orange-500 to-red-600"
    ];
    return gradients[index % gradients.length];
  };

  // Helper function to get background color gradient
  const getBgColorGradient = (index) => {
    const bgGradients = [
      "from-amber-50 to-yellow-50",
      "from-blue-50 to-indigo-50",
      "from-pink-50 to-purple-50",
      "from-emerald-50 to-teal-50",
      "from-violet-50 to-purple-50",
      "from-orange-50 to-red-50"
    ];
    return bgGradients[index % bgGradients.length];
  };

  // Fetch course categories on component mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        const categoryData = await getCourseCategories();
        setCategories(categoryData);
      } catch (err) {
        setError(err.message);
        console.error('Error loading course categories:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  // Auto-rotate featured courses
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCategory((prev) => (prev + 1) % featuredCourses.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [featuredCourses.length]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  // Get category icon based on category name
  const getCategoryIcon = (categoryName) => {
    const category = categoryName.toLowerCase();

    if (category.includes('doctorate') || category.includes('phd') || category.includes('doctoral')) {
      return '🎓';
    } else if (category.includes('management') || category.includes('mba') || category.includes('business')) {
      return '📈';
    } else if (category.includes('engineering') || category.includes('technology')) {
      return '⚙️';
    } else if (category.includes('medical') || category.includes('health')) {
      return '🏥';
    } else if (category.includes('education') || category.includes('teaching')) {
      return '📚';
    } else if (category.includes('finance') || category.includes('accounting')) {
      return '💰';
    } else if (category.includes('design') || category.includes('art')) {
      return '🎨';
    } else if (category.includes('language') || category.includes('english')) {
      return '🌍';
    } else {
      return '📋';
    }
  };

  // Function to get course thumbnail URL
  const getCourseThumbnailUrl = (course) => {
    if (!course) return null;

    // Check multiple possible field names
    const imageField = course.thumbnail || course.course_image || course.image || course.cover_image;

    if (!imageField || imageField === '') return null;

    // If it's a base64 data URL, return it directly
    if (typeof imageField === 'string' && imageField.startsWith('data:image/')) {
      return imageField;
    }

    // If it's already a full HTTP URL, return it
    if (typeof imageField === 'string' && imageField.startsWith('http')) {
      return imageField;
    }

    // Construct full URL with backend server for file paths
    const cleanPath = imageField.replace(/^\/+/, '');
    return `http://localhost:4000/uploads/courses/${cleanPath}`;
  };

  // Get representative thumbnail for category (from first course with image)
  const getCategoryThumbnail = (category) => {
    if (!category.courses || category.courses.length === 0) return null;

    // Try to find a course with a valid thumbnail
    for (const course of category.courses) {
      const thumbnailUrl = getCourseThumbnailUrl(course);
      if (thumbnailUrl) {
        return thumbnailUrl;
      }
    }
    return null;
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-white to-yellow-50 overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-amber-400/10 to-orange-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-20 -left-20 w-32 h-32 bg-gradient-to-tr from-yellow-400/10 to-amber-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-br from-amber-300/8 to-yellow-300/8 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>

      <div className="relative flex-1 flex flex-col w-full mx-auto px-6 sm:px-8 lg:px-12 py-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl mb-4 shadow-lg"
          >
            <FaGraduationCap className="text-white text-xl" />
          </motion.div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3">
            <span className="bg-gradient-to-r from-slate-800 to-slate-700 bg-clip-text text-transparent">
              Best Courses We Offer
            </span>
          </h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-base text-slate-600 max-w-lg mx-auto leading-relaxed"
          >
            Transform your career with our industry-leading courses and expert mentorship.
          </motion.p>

          {/* Course Category Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-wrap justify-center gap-2 mt-6 max-w-3xl mx-auto"
          >
            {featuredCourses.map((course, index) => (
              <button
                key={index}
                onClick={() => setActiveCategory(index)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${activeCategory === index
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-lg scale-105'
                  : 'bg-white/80 text-slate-600 hover:bg-amber-50 hover:text-amber-700 border border-amber-200'
                  }`}
              >
                {course.title.split(' ')[0]} {course.title.split(' ')[1]}
              </button>
            ))}
          </motion.div>
        </motion.div>

        {/* Featured Course Cards Grid */}
        {coursesLoading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex items-center justify-center"
          >
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Loading courses...</p>
            </div>
          </motion.div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex items-center justify-center"
          >
            <div className="text-center bg-red-50 border border-red-200 rounded-lg p-8 max-w-md">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaChartBar className="text-red-500 text-xl" />
              </div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to Load Courses</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
              >
                Retry
              </button>
            </div>
          </motion.div>
        ) : featuredCourses.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex items-center justify-center"
          >
            <div className="text-center bg-amber-50 border border-amber-200 rounded-lg p-8 max-w-md">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaGraduationCap className="text-amber-500 text-xl" />
              </div>
              <h3 className="text-lg font-semibold text-amber-800 mb-2">No Courses Available</h3>
              <p className="text-amber-600 mb-4">There are currently no courses to display. Please check back later!</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 content-center justify-items-center px-4 lg:px-8"
          >
            {featuredCourses.map((course, index) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -5, scale: 1.01 }}
                className={`relative bg-white rounded-2xl shadow-lg overflow-hidden border-2 ${activeCategory === index
                  ? 'border-amber-400 shadow-xl shadow-amber-500/20'
                  : 'border-gray-100 hover:border-amber-200'
                  } transition-all duration-500 group cursor-pointer h-full flex flex-col w-full max-w-sm mx-auto`}
              >
                {/* Course Image */}
                <div className="relative h-32 lg:h-40 overflow-hidden flex-shrink-0">
                  <div className={`absolute inset-0 bg-gradient-to-br ${course.bgColor} opacity-80`}></div>
                  <img
                    src={course.image}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/400x300/f59e0b/ffffff?text=' + course.title.charAt(0);
                    }}
                  />

                  {/* Overlay Content */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  <div className="absolute top-4 left-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${course.color} rounded-xl flex items-center justify-center shadow-lg`}>
                      <course.icon className="text-white text-xl" />
                    </div>
                  </div>

                  {/* Price Badge */}
                  <div className="absolute top-4 right-4">
                    <div className="bg-white/95 backdrop-blur-sm rounded-full px-3 py-1 shadow-lg">
                      <span className="text-xs text-slate-500 line-through mr-2">{course.originalPrice}</span>
                      <span className="text-lg font-bold text-amber-600">{course.price}</span>
                    </div>
                  </div>

                  {/* Level Badge */}
                  <div className="absolute bottom-4 left-4">
                    <span className="bg-white/90 backdrop-blur-sm text-slate-800 text-xs font-semibold px-3 py-1 rounded-full">
                      {course.level}
                    </span>
                  </div>

                  {/* Play Button */}
                  <div className="absolute bottom-4 right-4">
                    <button className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-amber-500 hover:text-white transition-all duration-300 group">
                      <FaPlay className="text-slate-700 group-hover:text-white ml-1" />
                    </button>
                  </div>
                </div>

                {/* Course Content */}
                <div className="p-4 flex-1 flex flex-col">
                  <div className="mb-3 flex-1">
                    <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-amber-600 transition-colors duration-300 line-clamp-2">
                      {course.title}
                    </h3>
                    <p className="text-xs font-medium text-amber-600 mb-2">
                      {course.subtitle}
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {course.description}
                    </p>
                  </div>

                  {/* Course Stats */}
                  <div className="flex items-center gap-3 mb-3 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <FaUser />
                      <span className="font-medium text-slate-700">{course.instructor}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FaClock />
                      <span>{course.duration}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FaStar className="text-amber-400" />
                      <span className="text-slate-700 font-medium">{typeof course.rating === 'number' ? course.rating.toFixed(1) : course.rating}</span>
                    </div>
                  </div>

                  {/* Students and Price Info */}
                  <div className="flex items-center justify-between mb-3 text-xs">
                    <div className="flex items-center gap-1 text-slate-500">
                      <FaUsers />
                      <span>{course.students} students</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-orange-600">{course.price}</span>
                      {course.originalPrice && course.originalPrice !== course.price && (
                        <span className="text-sm text-slate-400 line-through">{course.originalPrice}</span>
                      )}
                    </div>
                  </div>

                  {/* Course Features */}
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {course.features.slice(0, 2).map((feature, idx) => (
                        <span key={idx} className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full border border-amber-200">
                          {feature}
                        </span>
                      ))}
                      {course.features.length > 2 && (
                        <span className="text-xs text-amber-600 font-medium">
                          +{course.features.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-auto">
                    <button
                      onClick={() => navigate(`/course-details/${course.id}`)}
                      className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-semibold py-2 px-3 rounded-lg hover:shadow-lg hover:shadow-amber-500/25 transition-all duration-300 flex items-center justify-center gap-2 group text-sm"
                    >
                      <span>View Details</span>
                      <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>

                {/* Active Course Highlight */}
                {activeCategory === index && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute -top-2 -right-2"
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
                      <FaStar className="text-white text-sm" />
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* View All Courses CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-6 flex-shrink-0"
        >
          <Link to="/courses-offer">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-3 bg-gradient-to-r from-amber-600 to-yellow-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl hover:shadow-amber-500/25 transition-all duration-300"
            >
              <FaGraduationCap className="text-lg" />
              <span>Explore All Courses</span>
              <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </Link>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 1 }}
            className="text-xs text-slate-500 mt-2"
          >
            Join 50,000+ students who transformed their careers with SkillWallah
          </motion.p>
        </motion.div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaGraduationCap className="text-white text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Enroll in {selectedCourse.title}
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Complete your payment to get lifetime access to this course
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <div className="text-2xl font-bold text-amber-600 mb-1">
                  ₹{Math.round(parseFloat(selectedCourse.price.replace(/[$₹]/, '')) * 82) || 2999}
                </div>
                <div className="text-sm text-gray-500">
                  One-time payment • Lifetime access
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedCourse(null);
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={enrolling}
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={enrolling}
                className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-600 text-white py-3 px-4 rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enrolling ? 'Processing...' : 'Pay Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursesWeOffer;
