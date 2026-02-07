import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaClock, FaStar, FaUser, FaUsers, FaPlay, FaArrowRight, FaGraduationCap, FaFilter, FaSearch, FaTimes, FaChevronDown } from 'react-icons/fa';

const BrowseAllCourses = () => {
  const navigate = useNavigate();
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

        const response = await fetch('http://localhost:4000/api/branch-courses/courses');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Handle new branch API format
        const coursesArray = Array.isArray(data) ? data : (data.courses || []);

        if (coursesArray.length > 0) {
          // Transform backend data
          const transformedCourses = coursesArray.map((course, index) => ({
            id: course.id || course._id || index + 1,
            title: course.course_name || course.title || 'Course Title',
            subtitle: course.short_description || course.subtitle || course.description?.substring(0, 50) + '...' || 'Learn and Grow',
            description: course.long_description || course.description || 'Complete course description not available.',
            image: getCourseThumbnailUrl(course) || getDefaultImageForCategory(course.category || course.program_name, index),
            level: course.difficulty_level || course.level || course.difficulty || 'all levels',
            duration: course.duration || `${course.duration_months || course.estimated_duration || Math.floor(Math.random() * 12) + 4} ${course.duration_months ? 'Months' : 'Weeks'}`,
            students: course.enrolled_count ? `${course.enrolled_count}+` : course.enrolled_students ? `${course.enrolled_students}+` : `${Math.floor(Math.random() * 20000) + 5000}+`,
            rating: course.average_rating || course.rating || (4.5 + Math.random() * 0.5),
            price: course.course_fee || course.price || 0,
            priceDisplay: (course.course_fee || course.price) ?
              ((course.course_fee || course.price) === 0 ? 'Free' : `₹${course.course_fee || course.price}`) : 'Free',
            originalPrice: course.original_price ? `₹${course.original_price}` :
              (course.course_fee || course.price) ? `₹${Math.floor((course.course_fee || course.price) * 2)}` : '₹999',
            features: course.features || course.what_you_learn || course.tags || ["Certification", "Live Projects", "Expert Support", "Lifetime Access"],
            category: course.category || course.program_name || 'programming',
            instructor: course.instructor_name || course.instructor || course.created_by || 'Expert Instructor',
            instructorId: course.instructor_id || course.instructor,
            courseId: course.course_code || course.course_id || course.id,
            published: course.status === 'active' || course.published || course.status === 'published',
            createdDate: course.created_at || course.created_date || course.createdAt,
            lastUpdated: course.updated_at || course.last_updated || course.updatedAt,
          }));

          setCourses(transformedCourses);
          setFilteredCourses(transformedCourses);
        } else {
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
    if (!course) return null;

    const imageField = course.thumbnail || course.course_image || course.image || course.cover_image || course.featured_image || course.course_thumbnail;

    if (!imageField || imageField === '') return null;

    if (typeof imageField === 'string' && imageField.startsWith('data:image/')) {
      return imageField;
    }

    if (typeof imageField === 'string' && (imageField.startsWith('http') || imageField.startsWith('//'))) {
      return imageField;
    }

    const cleanPath = imageField.replace(/^\/+/, '');
    return `http://localhost:4000/${cleanPath}`;
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <section className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              All <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600">Courses</span>
            </h1>
            <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
              Discover our complete collection of courses and find the perfect learning path for your career goals
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative mb-8">
              <div className="relative">
                <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search courses, instructors, or topics..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-lg"
                />
              </div>
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="bg-white text-amber-600 px-6 py-3 rounded-xl font-bold border-2 border-amber-600 hover:bg-amber-600 hover:text-white transition-all duration-300 flex items-center gap-2 mx-auto"
            >
              <FaFilter />
              Filters
              <FaChevronDown className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      {/* Filters Section */}
      {showFilters && (
        <section className="bg-white border-b py-6 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
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
                <label className="block text-sm font-bold text-gray-700 mb-2">Price Range</label>
                <select
                  value={selectedPriceRange}
                  onChange={(e) => setSelectedPriceRange(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
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
                <label className="block text-sm font-bold text-gray-700 mb-2">Difficulty Level</label>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
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
                  className="w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <FaTimes />
                  Clear Filters
                </button>
              </div>
            </div>

            {/* Active Filters Display */}
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedCategory !== 'all' && (
                <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                  Category: {formatCategoryName(selectedCategory)}
                  <button onClick={() => setSelectedCategory('all')} className="hover:text-amber-900">
                    <FaTimes className="text-xs" />
                  </button>
                </span>
              )}
              {selectedPriceRange !== 'all' && (
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                  Price: {priceRanges.find(r => r.value === selectedPriceRange)?.label}
                  <button onClick={() => setSelectedPriceRange('all')} className="hover:text-blue-900">
                    <FaTimes className="text-xs" />
                  </button>
                </span>
              )}
              {selectedLevel !== 'all' && (
                <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                  Level: {formatCategoryName(selectedLevel)}
                  <button onClick={() => setSelectedLevel('all')} className="hover:text-orange-900">
                    <FaTimes className="text-xs" />
                  </button>
                </span>
              )}
              {searchTerm && (
                <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                  Search: "{searchTerm}"
                  <button onClick={() => setSearchTerm('')} className="hover:text-purple-900">
                    <FaTimes className="text-xs" />
                  </button>
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Courses Section */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Results Header */}
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              {loading ? 'Loading courses...' : `${filteredCourses.length} courses found`}
            </h2>
            {filteredCourses.length > 0 && (
              <div className="text-sm text-gray-600">
                Showing {filteredCourses.length} of {courses.length} total courses
              </div>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-16">
              <div className="animate-spin inline-block w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full mb-4"></div>
              <p className="text-xl font-medium text-gray-600">Loading courses...</p>
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

          {/* No Results State */}
          {!loading && !error && filteredCourses.length === 0 && courses.length > 0 && (
            <div className="text-center py-16">
              <div className="text-6xl mb-6">🔍</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">No courses found</h3>
              <p className="text-gray-600 mb-8">
                Try adjusting your filters or search terms to find more courses.
              </p>
              <button
                onClick={clearAllFilters}
                className="bg-amber-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-700 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          )}

          {/* No Courses State */}
          {!loading && !error && courses.length === 0 && (
            <div className="text-center py-16">
              <div className="text-6xl mb-6">📚</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">No courses available</h3>
              <p className="text-gray-600 mb-8">
                We're working on adding amazing courses for you. Check back soon!
              </p>
            </div>
          )}

          {/* Courses Grid */}
          {!loading && !error && filteredCourses.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCourses.map((course, index) => (
                <div key={course.id || index} className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group border border-gray-100">
                  {/* Course Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={course.image}
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
                        {formatCategoryName(course.level)}
                      </span>
                    </div>

                    {/* Price Badge */}
                    <div className="absolute top-4 right-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${course.price === 0 ? 'bg-orange-500 text-white' : 'bg-white text-gray-900'
                        }`}>
                        {course.priceDisplay}
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
                  <div className="p-6">
                    {/* Course Title */}
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-amber-600 transition-colors">
                      {course.title}
                    </h3>

                    {/* Course Category */}
                    <p className="text-xs font-medium text-amber-600 mb-2">
                      {formatCategoryName(course.category)}
                    </p>

                    {/* Course Description */}
                    <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-2">
                      {course.description}
                    </p>

                    {/* Course Stats */}
                    <div className="flex items-center justify-between mb-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <FaUser className="text-amber-500" />
                        <span className="font-medium">{course.instructor}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FaClock className="text-blue-500" />
                        <span>{course.duration}</span>
                      </div>
                    </div>

                    {/* Rating and Students */}
                    <div className="flex items-center justify-between mb-4 text-sm">
                      <div className="flex items-center gap-1">
                        <FaUsers className="text-orange-500" />
                        <span className="text-gray-600">{course.students} students</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FaStar className="text-yellow-500" />
                        <span className="font-medium text-gray-700">
                          {typeof course.rating === 'number' ? course.rating.toFixed(1) : course.rating}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/course-details/${course.id}`)}
                        className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-bold py-2 px-3 rounded-lg hover:shadow-lg hover:shadow-amber-500/25 transition-all duration-300 flex items-center justify-center gap-2 group text-sm"
                      >
                        <span>Enroll Now</span>
                        <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                      </button>
                      <button
                        onClick={() => navigate(`/course-details/${course.id}`)}
                        className="px-3 py-2 bg-gray-50 text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-100 transition-all duration-300 flex items-center justify-center"
                      >
                        <FaGraduationCap />
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

export default BrowseAllCourses;