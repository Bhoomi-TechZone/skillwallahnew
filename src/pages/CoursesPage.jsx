import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaClock, FaStar, FaUser, FaUsers, FaPlay, FaArrowRight, FaGraduationCap, FaFilter, FaSearch, FaTimes, FaChevronDown, FaBookOpen, FaRupeeSign } from 'react-icons/fa';
import VideoPlayer from '../components/VideoPlayer';
import { isVideoFile, isDataUrl, isRemoteUrl, getDefaultThumbnail } from '../utils/fileUtils';

const CoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Available filter options
  const categories = ['all', 'web development', 'data science', 'machine learning', 'design', 'mobile development', 'cloud computing', 'digital marketing', 'programming'];
  const priceRanges = [
    { value: 'all', label: 'All Prices' },
    { value: 'free', label: 'Free' },
    { value: '0-999', label: '₹0 - ₹999' },
    { value: '1000-4999', label: '₹1,000 - ₹4,999' },
    { value: '5000-9999', label: '₹5,000 - ₹9,999' },
    { value: '10000+', label: '₹10,000+' }
  ];
  const levels = ['all', 'beginner', 'intermediate', 'advanced', 'all levels'];

  // Fetch courses from backend
  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Fetching courses from backend...');
        const response = await fetch('http://localhost:4000/api/branch-courses/courses');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Backend response:', data);

        // Branch API returns array directly
        const coursesData = Array.isArray(data) ? data : (data.courses || []);

        if (coursesData.length > 0) {
          // Transform backend data
          const transformedCourses = coursesData.map((course, index) => {
            const thumbnailData = getCourseThumbnailUrl(course);
            const finalImage = thumbnailData.url || getDefaultImageForCategory(course.category || course.program_name, index);

            console.log(`[DEBUG] Transforming course: ${course.course_name || course.title}`);
            console.log(`[DEBUG] Original image field:`, course.thumbnail || course.course_image || course.image);
            console.log(`[DEBUG] Thumbnail data:`, thumbnailData);
            console.log(`[DEBUG] Final image URL: ${finalImage}`);

            return {
              id: course.id || course._id || index + 1,
              title: course.course_name || course.title || 'Course Title',
              subtitle: course.description?.substring(0, 100) + '...' || 'Complete course to enhance your skills',
              description: course.description || course.syllabus_outline || 'Complete course description not available.',
              image: finalImage,
              isVideoThumbnail: thumbnailData.isVideo,
              videoThumbnailUrl: thumbnailData.videoUrl,
              level: course.level || 'All Levels',
              duration: `${course.duration_months} Months`,
              students: `${course.enrolled_students || 0}+`,
              rating: course.rating || 4.5,
              price: course.fee || 0,
              priceDisplay: course.fee ? (course.fee === 0 ? 'Free' : `₹${course.fee}`) : 'Free',
              originalPrice: course.fee ? `₹${Math.floor(course.fee * 1.2)}` : '₹0',
              features: course.features || ["Certificate", "Live Projects", "Expert Support", "Lifetime Access"],
              category: course.category || course.program_name || 'programming',
              instructor: course.instructor || 'Expert Instructor',
              instructorId: course.instructor_id,
              courseId: course.course_code || course.id,
              published: course.status === 'active',
              createdDate: course.created_date || course.createdAt,
              lastUpdated: course.last_updated || course.updatedAt,
              // Additional details for course page
              modules: course.modules || course.curriculum || [],
              requirements: course.requirements || course.prerequisites || [],
              whatYouLearn: course.what_you_learn || course.learning_outcomes || [],
              language: course.course_language || course.language || 'Hindi & English',
              certificateAvailable: course.certificate_available !== false
            };
          });

          console.log('Transformed courses:', transformedCourses);
          setCourses(transformedCourses);
          setFilteredCourses(transformedCourses);
        } else {
          console.log('No courses found in backend response');
          setCourses([]);
          setFilteredCourses([]);
        }
      } catch (err) {
        console.error('Error loading courses:', err);
        setError(`Failed to load courses: ${err.message}`);
        setCourses([]);
        setFilteredCourses([]);
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, []);

  // Apply filters whenever filter criteria changes
  useEffect(() => {
    let filtered = [...courses];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.instructor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(course =>
        course.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Price range filter
    if (selectedPriceRange !== 'all') {
      if (selectedPriceRange === 'free') {
        filtered = filtered.filter(course => course.price === 0);
      } else if (selectedPriceRange === '0-999') {
        filtered = filtered.filter(course => course.price >= 0 && course.price <= 999);
      } else if (selectedPriceRange === '1000-4999') {
        filtered = filtered.filter(course => course.price >= 1000 && course.price <= 4999);
      } else if (selectedPriceRange === '5000-9999') {
        filtered = filtered.filter(course => course.price >= 5000 && course.price <= 9999);
      } else if (selectedPriceRange === '10000+') {
        filtered = filtered.filter(course => course.price >= 10000);
      }
    }

    // Level filter
    if (selectedLevel !== 'all') {
      filtered = filtered.filter(course =>
        course.level.toLowerCase().includes(selectedLevel.toLowerCase())
      );
    }

    setFilteredCourses(filtered);
  }, [courses, selectedCategory, selectedPriceRange, selectedLevel, searchTerm]);

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

  const clearAllFilters = () => {
    setSelectedCategory('all');
    setSelectedPriceRange('all');
    setSelectedLevel('all');
    setSearchTerm('');
  };

  const formatCategoryName = (category) => {
    return category.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const calculateDiscount = (original, current) => {
    if (!original || !current || original <= current) return 0;
    return Math.round(((original - current) / original) * 100);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <section className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 py-10 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-orange-500/10"></div>
        <div className="absolute top-20 left-10 w-32 h-32 bg-amber-400/20 rounded-full blur-xl"></div>
        <div className="absolute bottom-10 right-20 w-40 h-40 bg-orange-400/20 rounded-full blur-xl"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center text-gray-900">
            <h1 className="text-6xl font-bold mb-6">
              All <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600">Courses</span>
            </h1>
            <p className="text-xl mb-8 max-w-3xl mx-auto text-gray-700">
              Discover our complete collection of courses and find the perfect learning path for your career goals
            </p>

            {/* Search Bar */}
            <div className="max-w-3xl mx-auto relative mb-8">
              <div className="relative">
                <FaSearch className="absolute left-6 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl" />
                <input
                  type="text"
                  placeholder="Search courses, instructors, or topics..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-16 pr-6 py-5 rounded-2xl border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 outline-none text-lg text-gray-800 shadow-lg"
                />
              </div>
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 py-4 rounded-2xl font-bold border-2 border-amber-600 hover:from-amber-600 hover:to-orange-600 transition-all duration-300 flex items-center gap-3 mx-auto shadow-xl"
            >
              <FaFilter />
              Filters
              <FaChevronDown className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-amber-200 shadow-lg">
                <div className="text-3xl font-bold text-amber-600 mb-2">{courses.length}+</div>
                <div className="text-navy-900 font-medium">Courses Available</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-amber-200 shadow-lg">
                <div className="text-3xl font-bold text-amber-600 mb-2">50+</div>
                <div className="text-navy-900 font-medium">Expert Instructors</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-amber-200 shadow-lg">
                <div className="text-3xl font-bold text-amber-600 mb-2">25+</div>
                <div className="text-navy-900 font-medium">Categories</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-amber-200 shadow-lg">
                <div className="text-3xl font-bold text-amber-600 mb-2">95%</div>
                <div className="text-navy-900 font-medium">Success Rate</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters Section */}
      {showFilters && (
        <section className="bg-white border-b py-8 px-4 shadow-lg">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-4 border-2 border-amber-300 rounded-xl focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 outline-none text-gray-700"
                >
                  <option value="all">All Categories</option>
                  {categories.slice(1).map(category => (
                    <option key={category} value={category}>
                      {formatCategoryName(category)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Range Filter */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Price Range</label>
                <select
                  value={selectedPriceRange}
                  onChange={(e) => setSelectedPriceRange(e.target.value)}
                  className="w-full p-4 border-2 border-amber-300 rounded-xl focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 outline-none text-gray-700"
                >
                  {priceRanges.map(range => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Level Filter */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Difficulty Level</label>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="w-full p-4 border-2 border-amber-300 rounded-xl focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 outline-none text-gray-700"
                >
                  <option value="all">All Levels</option>
                  {levels.slice(1).map(level => (
                    <option key={level} value={level}>
                      {formatCategoryName(level)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  onClick={clearAllFilters}
                  className="w-full bg-amber-100 hover:bg-amber-200 text-amber-700 px-6 py-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 border-2 border-amber-300"
                >
                  <FaTimes />
                  Clear Filters
                </button>
              </div>
            </div>

            {/* Active Filters Display */}
            {(selectedCategory !== 'all' || selectedPriceRange !== 'all' || selectedLevel !== 'all' || searchTerm) && (
              <div className="mt-6 flex flex-wrap gap-3">
                {selectedCategory !== 'all' && (
                  <span className="bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm flex items-center gap-2 font-medium">
                    Category: {formatCategoryName(selectedCategory)}
                    <button onClick={() => setSelectedCategory('all')} className="hover:text-amber-900">
                      <FaTimes className="text-xs" />
                    </button>
                  </span>
                )}
                {selectedPriceRange !== 'all' && (
                  <span className="bg-orange-100 text-orange-800 px-4 py-2 rounded-full text-sm flex items-center gap-2 font-medium">
                    Price: {priceRanges.find(r => r.value === selectedPriceRange)?.label}
                    <button onClick={() => setSelectedPriceRange('all')} className="hover:text-orange-900">
                      <FaTimes className="text-xs" />
                    </button>
                  </span>
                )}
                {selectedLevel !== 'all' && (
                  <span className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full text-sm flex items-center gap-2 font-medium">
                    Level: {formatCategoryName(selectedLevel)}
                    <button onClick={() => setSelectedLevel('all')} className="hover:text-yellow-900">
                      <FaTimes className="text-xs" />
                    </button>
                  </span>
                )}
                {searchTerm && (
                  <span className="bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm flex items-center gap-2 font-medium">
                    Search: "{searchTerm}"
                    <button onClick={() => setSearchTerm('')} className="hover:text-amber-900">
                      <FaTimes className="text-xs" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Courses Section */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Results Header */}
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              {loading ? 'Loading courses...' : `${filteredCourses.length} courses found`}
            </h2>
            {filteredCourses.length > 0 && (
              <div className="text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-full">
                Showing {filteredCourses.length} of {courses.length} total courses
              </div>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-20">
              <div className="animate-spin inline-block w-20 h-20 border-4 border-amber-500 border-t-transparent rounded-full mb-6"></div>
              <p className="text-2xl font-medium text-gray-600">Loading courses...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-20">
              <div className="text-8xl mb-8">⚠️</div>
              <h3 className="text-3xl font-bold text-red-600 mb-6">Error Loading Courses</h3>
              <p className="text-gray-600 mb-10">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-amber-600 text-white px-8 py-4 rounded-xl font-medium hover:bg-amber-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* No Results State */}
          {!loading && !error && filteredCourses.length === 0 && courses.length > 0 && (
            <div className="text-center py-20">
              <div className="text-8xl mb-8">🔍</div>
              <h3 className="text-3xl font-bold text-gray-800 mb-6">No courses found</h3>
              <p className="text-gray-600 mb-10 max-w-md mx-auto">
                Try adjusting your filters or search terms to find more courses.
              </p>
              <button
                onClick={clearAllFilters}
                className="bg-amber-600 text-white px-8 py-4 rounded-xl font-medium hover:bg-amber-700 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          )}

          {/* No Courses State */}
          {!loading && !error && courses.length === 0 && (
            <div className="text-center py-20">
              <div className="text-8xl mb-8">📚</div>
              <h3 className="text-3xl font-bold text-gray-800 mb-6">No courses available</h3>
              <p className="text-gray-600 mb-10">
                We're working on adding amazing courses for you. Check back soon!
              </p>
            </div>
          )}

          {/* Courses Grid */}
          {!loading && !error && filteredCourses.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course, index) => (
                <div key={course.id || index} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group border border-gray-100 hover:scale-105 h-full flex flex-col">
                  {/* Course Image/Video */}
                  <div className="relative h-40 overflow-hidden flex-shrink-0">
                    {course.isVideoThumbnail && course.videoThumbnailUrl ? (
                      <VideoPlayer
                        src={course.videoThumbnailUrl}
                        alt={course.title}
                        className="w-full h-full"
                        width="100%"
                        height="160px"
                        controls={false}
                        autoPlay={false}
                        muted={true}
                        loop={true}
                        fallbackImage={getDefaultImageForCategory(course.category, index)}
                        onError={(e) => {
                          console.warn(`Failed to load video for ${course.title}: ${course.videoThumbnailUrl}`);
                        }}
                      />
                    ) : (
                      <img
                        src={course.image}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          console.warn(`Failed to load image for ${course.title}: ${e.target.src}`);
                          const fallbackImage = getDefaultImageForCategory(course.category, index);
                          console.log(`Using fallback image: ${fallbackImage}`);
                          e.target.src = fallbackImage;
                        }}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-amber-500/60 to-transparent"></div>

                    {/* Course Level Badge */}
                    <div className="absolute top-4 left-4">
                      <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                        {formatCategoryName(course.level)}
                      </span>
                    </div>

                    {/* Price Badge */}
                    <div className="absolute top-4 right-4">
                      <span className={`px-3 py-2 rounded-full text-sm font-bold shadow-lg ${course.price === 0 ? 'bg-orange-500 text-white' : 'bg-white text-gray-900'
                        }`}>
                        {course.priceDisplay}
                      </span>
                    </div>

                    {/* Discount Badge */}
                    {course.originalPrice && course.price > 0 && (
                      <div className="absolute bottom-4 left-4">
                        <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                          {calculateDiscount(parseInt(course.originalPrice.replace('₹', '')), course.price)}% OFF
                        </span>
                      </div>
                    )}

                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-white/90 rounded-full p-4 transform group-hover:scale-110 transition-transform duration-300 cursor-pointer shadow-xl">
                        <FaPlay className="text-amber-600 text-xl" />
                      </div>
                    </div>
                  </div>

                  {/* Course Content */}
                  <div className="p-5 flex-grow flex flex-col">
                    {/* Course Title */}
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-amber-600 transition-colors h-[3.5rem] flex items-start">
                      {course.title}
                    </h3>

                    {/* Course Category */}
                    <p className="text-xs font-medium text-amber-600 mb-2 uppercase tracking-wide">
                      {formatCategoryName(course.category)}
                    </p>

                    {/* Course Subtitle/Description */}
                    <p className="text-gray-600 text-sm leading-relaxed mb-3 line-clamp-2 h-[2.5rem] flex items-start">
                      {course.subtitle}
                    </p>

                    {/* Course Stats */}
                    <div className="grid grid-cols-2 gap-2 mb-3 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <FaUser className="text-amber-500 flex-shrink-0" />
                        <span className="font-medium truncate">{course.instructor}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FaClock className="text-orange-500 flex-shrink-0" />
                        <span>{course.duration}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FaUsers className="text-amber-600 flex-shrink-0" />
                        <span>{course.students}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FaStar className="text-yellow-500 flex-shrink-0" />
                        <span className="font-medium">
                          {typeof course.rating === 'number' ? course.rating.toFixed(1) : course.rating}
                        </span>
                      </div>
                    </div>

                    {/* Price Section */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-orange-600">
                          {course.priceDisplay}
                        </span>
                        {course.originalPrice && course.originalPrice !== course.priceDisplay && (
                          <span className="text-sm text-gray-400 line-through">
                            {course.originalPrice}
                          </span>
                        )}
                      </div>
                      {course.certificateAvailable && (
                        <div className="flex items-center gap-1 text-xs text-amber-600">
                          <FaGraduationCap />
                          <span>Certificate</span>
                        </div>
                      )}
                    </div>

                    {/* Features */}
                    {course.features && course.features.length > 0 && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-1">
                          {course.features.slice(0, 2).map((feature, idx) => (
                            <span key={idx} className="bg-amber-50 text-amber-700 px-2 py-1 rounded-full text-xs border border-amber-200">
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
                    <div className="flex gap-2 mt-auto">
                      <Link to={`/course-details/${course.id}`} className="flex-1">
                        <button className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold py-2.5 px-3 rounded-lg hover:shadow-lg hover:shadow-amber-500/25 transition-all duration-300 flex items-center justify-center gap-2 group text-sm">
                          <span>View Details</span>
                          <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                        </button>
                      </Link>
                      <button className="px-3 py-2.5 bg-amber-50 text-amber-700 rounded-lg border border-amber-200 hover:bg-amber-100 transition-all duration-300 flex items-center justify-center">
                        <FaBookOpen />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default CoursesPage;