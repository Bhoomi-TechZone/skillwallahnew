import React, { useState, useEffect } from 'react';
import { FaBook, FaPlus, FaEdit, FaTrash, FaEye, FaUsers, FaDollarSign, FaPlay, FaTags, FaFilter, FaSearch, FaUpload, FaStar, FaClock, FaChartBar, FaDownload, FaBars } from 'react-icons/fa';
import { MdClose, MdCategory, MdSchool } from 'react-icons/md';
import SuperAdminSidebar from '../SuperAdminSidebar';
import { useNavigate } from 'react-router-dom';

const AllCourses = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  
  // Add Course Form State
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    category: '',
    level: 'Beginner',
    price: '',
    duration: '',
    instructor_id: '',
    status: 'draft',
    thumbnail: null,
    tags: '',
    learning_outcomes: ''
  });

  // Add Category Form State
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    icon: ''
  });

  const courseCategories = [
    'Programming', 'Data Science', 'Web Development', 'Mobile Development', 
    'AI/ML', 'Cybersecurity', 'Cloud Computing', 'DevOps', 
    'Digital Marketing', 'Design', 'Business', 'Languages'
  ];

  const courseLevels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
  const courseStatuses = ['draft', 'published', 'archived', 'under_review'];

  useEffect(() => {
    fetchCourses();
    fetchCategories();
  }, []);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/course/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCourses(data.courses || []);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/course/categories/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleAddCourse = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      Object.keys(courseForm).forEach(key => {
        if (key === 'thumbnail' && courseForm[key]) {
          formData.append(key, courseForm[key]);
        } else if (key !== 'thumbnail') {
          formData.append(key, courseForm[key]);
        }
      });

      const response = await fetch('/course/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      if (response.ok) {
        await fetchCourses();
        setShowAddCourse(false);
        setCourseForm({
          title: '', description: '', category: '', level: 'Beginner',
          price: '', duration: '', instructor_id: '', status: 'draft',
          thumbnail: null, tags: '', learning_outcomes: ''
        });
        alert('Course added successfully!');
      } else {
        alert('Failed to add course');
      }
    } catch (error) {
      console.error('Error adding course:', error);
      alert('Error adding course');
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/course/categories/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(categoryForm)
      });

      if (response.ok) {
        await fetchCategories();
        setShowAddCategory(false);
        setCategoryForm({ name: '', description: '', icon: '' });
        alert('Category added successfully!');
      } else {
        alert('Failed to add category');
      }
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Error adding category');
    }
  };

  const deleteCourse = async (courseId) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/course/${courseId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        });

        if (response.ok) {
          await fetchCourses();
          alert('Course deleted successfully!');
        } else {
          alert('Failed to delete course');
        }
      } catch (error) {
        console.error('Error deleting course:', error);
        alert('Error deleting course');
      }
    }
  };

  const updateCourseStatus = async (courseId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/course/${courseId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        await fetchCourses();
        alert('Course status updated successfully!');
      }
    } catch (error) {
      console.error('Error updating course status:', error);
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.instructor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.tags?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || course.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || course.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getLevelColor = (level) => {
    switch (level) {
      case 'Beginner': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Intermediate': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Advanced': return 'bg-red-100 text-red-800 border-red-200';
      case 'Expert': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'published': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'draft': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'archived': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'under_review': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-amber-50/30">
      <SuperAdminSidebar 
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        activeMenuItem="Course Management"
        setActiveMenuItem={() => {}}
      />
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'sm:ml-80 md:ml-72 lg:ml-72' : ''}`}>
        <div className="lg:hidden bg-white border-b p-4 flex items-center sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-gray-900 p-2">
            <FaBars className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold ml-4 bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent">Course Management</h1>
        </div>
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent mb-2">
                  Course Management
                </h1>
                <p className="text-slate-600">Manage all platform courses and categories</p>
              </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowAddCategory(true)}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <MdCategory /> Add Category
              </button>
              <button 
                onClick={() => setShowAddCourse(true)}
                className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <FaPlus /> Add Course
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-medium">Total Courses</p>
                <p className="text-3xl font-bold">{courses.length}</p>
                <p className="text-amber-200 text-xs mt-1">+5 this week</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <FaBook className="text-2xl" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-orange-500 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Published</p>
                <p className="text-3xl font-bold">{courses.filter(c => c.status === 'published').length}</p>
                <p className="text-emerald-200 text-xs mt-1">Active courses</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <FaPlay className="text-2xl" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Students</p>
                <p className="text-3xl font-bold">{courses.reduce((sum, course) => sum + (course.enrolled_count || 0), 0)}</p>
                <p className="text-blue-200 text-xs mt-1">Enrolled learners</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <FaUsers className="text-2xl" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Categories</p>
                <p className="text-3xl font-bold">{categories.length}</p>
                <p className="text-purple-200 text-xs mt-1">Course categories</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <FaTags className="text-2xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-amber-100">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              <div className="relative flex-1 min-w-64">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-500" />
                <input
                  type="text"
                  placeholder="Search courses, instructors, tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-300"
                />
              </div>
              
              <div className="flex gap-3">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white min-w-48"
                >
                  <option value="all">All Categories</option>
                  {courseCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white min-w-40"
                >
                  <option value="all">All Status</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                  <option value="under_review">Under Review</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white px-4 py-3 rounded-xl flex items-center gap-2 transition-all duration-300">
                <FaDownload /> Export
              </button>
              <button className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-4 py-3 rounded-xl flex items-center gap-2 transition-all duration-300">
                <FaChartBar /> Analytics
              </button>
            </div>
          </div>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-lg border border-amber-100 animate-pulse">
                <div className="h-48 bg-amber-200 rounded-t-2xl"></div>
                <div className="p-6">
                  <div className="h-4 bg-amber-200 rounded mb-2"></div>
                  <div className="h-3 bg-amber-150 rounded mb-4"></div>
                  <div className="flex gap-2 mb-4">
                    <div className="h-6 w-16 bg-amber-200 rounded-full"></div>
                    <div className="h-6 w-20 bg-amber-200 rounded-full"></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-16 bg-amber-200 rounded"></div>
                    <div className="flex gap-2">
                      <div className="h-8 w-8 bg-amber-200 rounded"></div>
                      <div className="h-8 w-8 bg-amber-200 rounded"></div>
                      <div className="h-8 w-8 bg-amber-200 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : filteredCourses.length === 0 ? (
            <div className="col-span-full">
              <div className="bg-white rounded-2xl shadow-lg border border-amber-100 p-12 text-center">
                <FaBook className="text-6xl text-amber-300 mb-4 mx-auto" />
                <h3 className="text-xl font-semibold text-slate-800 mb-2">No courses found</h3>
                <p className="text-slate-600 mb-6">Get started by creating your first course</p>
                <button 
                  onClick={() => setShowAddCourse(true)}
                  className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white px-6 py-3 rounded-xl transition-all duration-300"
                >
                  <FaPlus className="inline mr-2" /> Create Course
                </button>
              </div>
            </div>
          ) : (
            filteredCourses.map((course) => (
              <div key={course.id} className="bg-white rounded-2xl shadow-lg border border-amber-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105 group">
                <div className="relative">
                  <img 
                    src={course.thumbnail || '/api/placeholder/400/200'} 
                    alt={course.title}
                    className="w-full h-48 object-cover rounded-t-2xl"
                  />
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(course.status || 'draft')}`}>
                      {course.status || 'draft'}
                    </span>
                  </div>
                  <div className="absolute top-4 right-4">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getLevelColor(course.level || 'Beginner')}`}>
                      {course.level || 'Beginner'}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-amber-700 transition-colors line-clamp-2">
                      {course.title}
                    </h3>
                  </div>

                  <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                    {course.description || 'No description available'}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-3 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                      {course.category}
                    </span>
                    <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {course.modules_count || 0} modules
                    </span>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm text-slate-600">
                      <span className="flex items-center gap-1">
                        <FaUsers className="text-amber-500" />
                        {course.enrolled_count || 0} students
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-800">
                      {course.instructor_name}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-xl font-bold text-amber-600">
                      ₹{course.price?.toLocaleString() || '0'}
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setSelectedCourse(course)}
                        className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <FaEye />
                      </button>
                      <button className="bg-amber-500 hover:bg-amber-600 text-white p-2 rounded-lg transition-colors" title="Edit">
                        <FaEdit />
                      </button>
                      <button 
                        onClick={() => deleteCourse(course.id)}
                        className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors" 
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Course Modal */}
      {showAddCourse && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-amber-200">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent">
                  Add New Course
                </h2>
                <button 
                  onClick={() => setShowAddCourse(false)}
                  className="text-slate-500 hover:text-slate-700 p-2"
                >
                  <MdClose size={24} />
                </button>
              </div>
            </div>

            <form onSubmit={handleAddCourse} className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Course Title *</label>
                  <input
                    type="text"
                    required
                    value={courseForm.title}
                    onChange={(e) => setCourseForm({...courseForm, title: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Enter course title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Category *</label>
                  <select
                    required
                    value={courseForm.category}
                    onChange={(e) => setCourseForm({...courseForm, category: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">Select Category</option>
                    {courseCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Description *</label>
                  <textarea
                    required
                    value={courseForm.description}
                    onChange={(e) => setCourseForm({...courseForm, description: e.target.value})}
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Enter course description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Level</label>
                  <select
                    value={courseForm.level}
                    onChange={(e) => setCourseForm({...courseForm, level: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    {courseLevels.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Price (₹)</label>
                  <input
                    type="number"
                    value={courseForm.price}
                    onChange={(e) => setCourseForm({...courseForm, price: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Duration (hours)</label>
                  <input
                    type="number"
                    value={courseForm.duration}
                    onChange={(e) => setCourseForm({...courseForm, duration: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                  <select
                    value={courseForm.status}
                    onChange={(e) => setCourseForm({...courseForm, status: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    {courseStatuses.map(status => (
                      <option key={status} value={status}>{status.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tags</label>
                  <input
                    type="text"
                    value={courseForm.tags}
                    onChange={(e) => setCourseForm({...courseForm, tags: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="react, javascript, frontend (comma separated)"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Thumbnail</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCourseForm({...courseForm, thumbnail: e.target.files[0]})}
                    className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-amber-200">
                <button
                  type="button"
                  onClick={() => setShowAddCourse(false)}
                  className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Create Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-amber-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent">
                  Add New Category
                </h2>
                <button 
                  onClick={() => setShowAddCategory(false)}
                  className="text-slate-500 hover:text-slate-700 p-2"
                >
                  <MdClose size={24} />
                </button>
              </div>
            </div>

            <form onSubmit={handleAddCategory} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Category Name *</label>
                  <input
                    type="text"
                    required
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Enter category name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                  <textarea
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Enter category description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Icon (Optional)</label>
                  <input
                    type="text"
                    value={categoryForm.icon}
                    onChange={(e) => setCategoryForm({...categoryForm, icon: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="fa-code, fa-design, etc."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-amber-200">
                <button
                  type="button"
                  onClick={() => setShowAddCategory(false)}
                  className="px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg transition-all duration-300"
                >
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default AllCourses;