import { useState, useEffect } from 'react';
import { FaBookOpen, FaPlus, FaEdit, FaTrash, FaSearch, FaToggleOn, FaToggleOff, FaRupeeSign, FaClock, FaEye, FaUpload, FaFileAlt, FaClipboardList, FaBook, FaTimes, FaDownload } from 'react-icons/fa';
import BranchLayout from '../BranchLayout';
import { branchCourseService } from '../../../services/branchCourseService';
import { branchProgramService } from '../../../services/branchProgramService';

const CoursesManagement = () => {
  const [courses, setCourses] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [courseDetails, setCourseDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('materials');
  const [subjects, setSubjects] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [tests, setTests] = useState([]);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [formData, setFormData] = useState({
    course_name: '',
    course_description: '',
    course_category: '',
    program_id: '',
    course_level: 'Beginner',
    instructor_name: '',
    duration_hours: '',
    course_fee: '',
    max_students: '',
    start_date: '',
    end_date: '',
    is_active: true
  });

  const durations = ['3 Month', '6 Month', '12 Month', '18 Month', '24 Month', '36 Month'];

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await branchCourseService.getCourses();
      if (response.success) {
        setCourses(response.data || []);
      } else {
        setError(response.error || 'Failed to load courses');
        setCourses([]);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
      setError('Failed to load courses. Please try again.');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPrograms = async () => {
    try {
      const response = await branchProgramService.getPrograms();
      if (response.success) {
        // Filter only active programs
        const activePrograms = response.data.filter(program => program.status === 'active');
        setPrograms(activePrograms);
      } else {
        console.error('Error loading programs:', response.error);
      }
    } catch (error) {
      console.error('Error loading programs:', error);
    }
  };

  useEffect(() => {
    loadCourses();
    loadPrograms();
  }, []);

  // Load course details with subjects, materials, and tests
  const loadCourseDetails = async (course) => {
    try {
      setDetailsLoading(true);
      setCourseDetails(course);
      setShowDetailsModal(true);
      setActiveTab('materials');

      const franchiseCode = localStorage.getItem('franchise_code') || 'default';
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      console.log('📚 Loading details for course:', course.id, course.course_name);

      // Load subjects for this course's program
      try {
        const subjectsRes = await fetch(`http://localhost:4000/api/branch-subjects/subjects?program_id=${course.program_id}&course_id=${course.id}`, { headers });
        if (subjectsRes.ok) {
          const subjectsData = await subjectsRes.json();
          console.log('✅ Subjects loaded:', subjectsData);
          setSubjects(Array.isArray(subjectsData) ? subjectsData : subjectsData.subjects || []);
        } else {
          console.log('⚠️ Subjects response not OK:', subjectsRes.status);
          setSubjects([]);
        }
      } catch (e) {
        console.error('Error loading subjects:', e);
        setSubjects([]);
      }

      // Load materials for this course
      try {
        const materialsRes = await fetch(`http://localhost:4000/api/branch-study-materials/materials?course_id=${course.id}`, { headers });
        if (materialsRes.ok) {
          const materialsData = await materialsRes.json();
          console.log('✅ Materials loaded:', materialsData);
          setMaterials(Array.isArray(materialsData) ? materialsData : materialsData.materials || []);
        } else {
          console.log('⚠️ Materials response not OK:', materialsRes.status);
          setMaterials([]);
        }
      } catch (e) {
        console.error('Error loading materials:', e);
        setMaterials([]);
      }

      // Load tests/paper sets for this course
      try {
        const testsRes = await fetch(`http://localhost:4000/api/branch-paper-sets/paper-sets?courseId=${course.id}`, { headers });
        if (testsRes.ok) {
          const testsData = await testsRes.json();
          console.log('✅ Tests loaded:', testsData);
          const testsArray = testsData.data || testsData.tests || (Array.isArray(testsData) ? testsData : []);
          setTests(testsArray);
        }
      } catch (e) {
        console.error('Error loading tests:', e);
        setTests([]);
      }

    } catch (error) {
      console.error('Error loading course details:', error);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Upload material for the course
  const handleMaterialUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !courseDetails) return;

    try {
      setUploadingMaterial(true);
      const franchiseCode = localStorage.getItem('franchise_code') || 'default';
      const token = localStorage.getItem('token');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('material_name', file.name.replace(/\.[^/.]+$/, '')); // Remove extension
      formData.append('course_id', courseDetails.id);
      formData.append('program_id', courseDetails.program_id || '');

      // Determine material type
      let materialType = 'document';
      if (file.type.includes('video')) materialType = 'video';
      else if (file.type.includes('audio')) materialType = 'audio';
      else if (file.type.includes('pdf')) materialType = 'document';
      else if (file.type.includes('image')) materialType = 'image';

      console.log('📤 Uploading material:', file.name, 'Type:', materialType);

      const response = await fetch(`http://localhost:4000/api/branch-study-materials/materials/upload?material_name=${encodeURIComponent(file.name)}&course_id=${courseDetails.id}&program_id=${courseDetails.program_id || ''}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        alert('Material uploaded successfully!');
        console.log('✅ Material uploaded successfully');
        // Reload materials
        const materialsRes = await fetch(`http://localhost:4000/api/branch-study-materials/materials?course_id=${courseDetails.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (materialsRes.ok) {
          const materialsData = await materialsRes.json();
          setMaterials(Array.isArray(materialsData) ? materialsData : materialsData.materials || []);
        }
      } else {
        const error = await response.json();
        console.error('❌ Upload failed:', error);
        alert(error.detail || 'Failed to upload material');
      }
    } catch (error) {
      console.error('Error uploading material:', error);
      alert('Failed to upload material');
    } finally {
      setUploadingMaterial(false);
    }
  };

  const filteredCourses = Array.isArray(courses) ? courses.filter(course => {
    const matchesSearch = course.course_name?.toLowerCase().includes(searchTerm.toLowerCase()) || '';
    const matchesProgram = selectedProgram === '' || course.program_id === selectedProgram || course.course_category === selectedProgram;
    return matchesSearch && matchesProgram;
  }) : [];

  const handleCreate = () => {
    setFormData({
      course_name: '',
      course_description: '',
      course_category: '',
      program_id: '',
      course_level: 'Beginner',
      instructor_name: '',
      duration_hours: '',
      course_fee: '',
      max_students: '',
      start_date: '',
      end_date: '',
      is_active: true
    });
    setSelectedCourse(null);
    setShowModal(true);
  };

  const handleEdit = (course) => {
    setFormData({
      course_name: course.course_name,
      course_description: course.course_description || '',
      course_category: course.course_category || '',
      program_id: course.program_id || '',
      course_level: course.course_level || 'Beginner',
      instructor_name: course.instructor_name || '',
      duration_hours: course.duration_hours?.toString() || '',
      course_fee: course.course_fee?.toString() || '',
      max_students: course.max_students?.toString() || '',
      start_date: course.start_date ? course.start_date.split('T')[0] : '',
      end_date: course.end_date ? course.end_date.split('T')[0] : '',
      is_active: course.is_active
    });
    setSelectedCourse(course);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const courseData = {
        ...formData,
        course_fee: parseFloat(formData.course_fee),
        duration_hours: parseInt(formData.duration_hours),
        max_students: parseInt(formData.max_students)
      };

      let response;
      if (selectedCourse) {
        response = await branchCourseService.updateCourse(selectedCourse.id, courseData);
      } else {
        response = await branchCourseService.createCourse(courseData);
      }

      if (response.success) {
        await loadCourses();
        setShowModal(false);
        alert(`Course ${selectedCourse ? 'updated' : 'created'} successfully!`);
      } else {
        setError(response.error || 'Failed to save course');
        alert(response.error || 'Failed to save course. Please try again.');
      }
    } catch (error) {
      console.error('Error saving course:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to save course. Please try again.';
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (courseId) => {
    try {
      setLoading(true);
      const course = courses.find(c => c.id === courseId);

      if (!course) {
        alert('Course not found');
        return;
      }

      // Determine new status (toggle current status)
      const currentStatus = course.is_active;
      const newStatus = !currentStatus;

      console.log('🔄 [CourseManagement] Toggling status for course:', course.course_name);
      console.log('🔄 [CourseManagement] Current status:', currentStatus);
      console.log('🔄 [CourseManagement] New status:', newStatus);

      // Prepare update data
      const updateData = {
        ...course,
        is_active: newStatus
      };

      console.log('📝 [CourseManagement] Sending update data:', updateData);

      const response = await branchCourseService.updateCourse(courseId, updateData);

      console.log('📬 [CourseManagement] Toggle status response:', response);

      if (response.success) {
        // Update local state immediately for better UX
        setCourses(prevCourses =>
          prevCourses.map(c =>
            c.id === courseId
              ? { ...c, is_active: newStatus }
              : c
          )
        );

        console.log('✅ [CourseManagement] Status updated successfully to:', newStatus);
        setError(null); // Clear any existing errors
      } else {
        console.error('❌ [CourseManagement] Failed to update status:', response.error);
        setError(response.error || 'Failed to update course status.');
        alert(`Failed to update course status: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ [CourseManagement] Error updating course status:', error);
      console.error('❌ [CourseManagement] Error details:', error.response);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to update course status.';
      setError(errorMessage);
      alert(`Failed to update course status: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (courseId) => {
    if (window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      try {
        setLoading(true);
        console.log('🗑️ [DELETE COURSE] Deleting course:', courseId);

        const response = await branchCourseService.deleteCourse(courseId);

        console.log('🗑️ [DELETE COURSE] Response:', response);

        if (response.success) {
          alert('Course deleted successfully!');
          await loadCourses();
        } else {
          alert(response.error || 'Failed to delete course. Please try again.');
        }
      } catch (error) {
        console.error('❌ [DELETE COURSE] Error deleting course:', error);
        const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete course.';
        alert(errorMessage);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <BranchLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="p-4 md:px-6 md:py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-2 rounded-lg">
                  <FaBookOpen className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-secondary-900">MANAGE COURSES</h1>
                  <p className="text-xs md:text-sm text-secondary-600 mt-0.5 md:mt-1">Create and manage course offerings</p>
                </div>
              </div>

              <button
                onClick={handleCreate}
                className="w-full md:w-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center justify-center space-x-2 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <FaPlus className="w-4 h-4" />
                <span>Add Course</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:px-6 md:py-6">
          {/* Filters */}
          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full border border-secondary-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="px-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="">--- SELECT Program ---</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>{program.program_name}</option>
              ))}
            </select>
          </div>

          {/* Courses Table */}
          {/* Mobile Card View */}
          <div className="block md:hidden space-y-4 mb-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <span className="text-gray-500">Loading courses...</span>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                No courses found
              </div>
            ) : (
              filteredCourses.map((course) => (
                <div key={course.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-base font-semibold text-secondary-900">{course.course_name}</h3>
                      <p className="text-xs text-blue-600 font-medium mt-1">{course.course_category}</p>
                    </div>
                    <button
                      onClick={() => toggleStatus(course.id)}
                      className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${course.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                    >
                      {course.is_active ? (
                        <>
                          <FaToggleOn className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <FaToggleOff className="w-3.5 h-3.5" />
                          <span>Inactive</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                    <div className="flex items-center space-x-2">
                      <FaRupeeSign className="text-orange-600" />
                      <span className="font-medium">Fee: {course.course_fee || 0}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FaClock className="text-blue-600" />
                      <span className="font-medium">{course.duration_hours ? `${course.duration_hours}h` : 'N/A'}</span>
                    </div>
                    <div className="flex items-center space-x-2 col-span-2">
                      <FaBookOpen className="text-purple-600" />
                      <span className="font-medium">{course.enrolled_students || 0} Students Enrolled</span>
                    </div>
                    <div className="flex items-center space-x-2 col-span-2">
                      <span className="text-gray-500">Max Students: {course.max_students || 'No limit'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <button
                      onClick={() => loadCourseDetails(course)}
                      className="flex items-center space-x-1 text-purple-600 bg-purple-50 px-3 py-1.5 rounded hover:bg-purple-100 transition-colors text-xs font-medium"
                    >
                      <FaEye className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(course)}
                        className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded"
                      >
                        <FaEdit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(course.id)}
                        className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* courses Table */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
                    <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">S.No.</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">Course Name</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Fee</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Duration</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Max Students</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-12 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          <span className="text-sm text-gray-500">Loading courses...</span>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-12 text-center">
                        <div className="text-red-600 text-sm">{error}</div>
                        <button
                          onClick={loadCourses}
                          className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
                        >
                          Try again
                        </button>
                      </td>
                    </tr>
                  ) : filteredCourses.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-12 text-center text-sm text-gray-500">
                        No courses found
                      </td>
                    </tr>
                  ) : (
                    filteredCourses.map((course, index) => (
                      <tr key={course.id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-4 py-4">
                          <span className="text-sm font-medium text-secondary-900">{index + 1}.</span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                              <FaBookOpen className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-secondary-900 max-w-xs">{course.course_name}</h3>
                              <p className="text-xs text-blue-600 font-medium">{course.course_category}</p>
                              <p className="text-xs text-gray-500">
                                {course.enrolled_students || 0} Students Enrolled
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <FaRupeeSign className="w-3 h-3 text-orange-600" />
                            <span className="text-sm font-medium text-orange-700">{course.course_fee || 0}</span>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <FaClock className="w-3 h-3 text-blue-600" />
                            <span className="text-sm font-medium text-blue-700">
                              {course.duration_hours ? `${course.duration_hours}h` : 'N/A'}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <span className="text-sm font-medium text-orange-700">
                              {course.max_students || 'No limit'}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => toggleStatus(course.id)}
                              disabled={loading}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${course.is_active
                                ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                                : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300'
                                }`}
                              title={`Toggle status (Currently ${course.is_active ? 'Active' : 'Inactive'})`}
                            >
                              {loading ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current inline mr-1"></div>
                                  {course.is_active ? 'Active' : 'Inactive'}
                                </>
                              ) : (
                                <>
                                  {course.is_active ? (
                                    <>
                                      <FaToggleOn className="w-3 h-3 inline mr-1" />
                                      Active
                                    </>
                                  ) : (
                                    <>
                                      <FaToggleOff className="w-3 h-3 inline mr-1" />
                                      Inactive
                                    </>
                                  )}
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => loadCourseDetails(course)}
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                              title="View Details & Materials"
                            >
                              <FaEye className="w-3 h-3" />
                            </button>

                            <button
                              onClick={() => handleEdit(course)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Edit"
                            >
                              <FaEdit className="w-3 h-3" />
                            </button>

                            <button
                              onClick={() => handleDelete(course.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <FaTrash className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-2xl w-full max-w-sm border border-white/20 overflow-y-auto max-h-[90vh]">
              <form onSubmit={handleSubmit}>
                {/* Modal Header */}
                <div className="px-4 py-3 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedCourse ? 'Edit Course' : 'Add New Course'}
                  </h3>
                </div>

                {/* Modal Body */}
                <div className="px-4 py-3 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Course Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.course_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, course_name: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter course name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Course Description
                    </label>
                    <textarea
                      value={formData.course_description}
                      onChange={(e) => setFormData(prev => ({ ...prev, course_description: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter course description"
                      rows="2"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Program *
                      </label>
                      <select
                        required
                        value={formData.program_id}
                        onChange={(e) => {
                          const selectedProgram = programs.find(p => p.id === e.target.value);
                          setFormData(prev => ({
                            ...prev,
                            program_id: e.target.value,
                            course_category: selectedProgram?.program_name || ''
                          }));
                        }}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Program</option>
                        {programs.map((program) => (
                          <option key={program.id} value={program.id}>{program.program_name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Instructor Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.instructor_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, instructor_name: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter instructor name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Course Fee *
                      </label>
                      <input
                        type="number"
                        required
                        value={formData.course_fee}
                        onChange={(e) => setFormData(prev => ({ ...prev, course_fee: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter fee amount"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Duration (hours) *
                      </label>
                      <input
                        type="number"
                        required
                        value={formData.duration_hours}
                        onChange={(e) => setFormData(prev => ({ ...prev, duration_hours: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter duration in hours"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Max Students
                    </label>
                    <input
                      type="number"
                      value={formData.max_students}
                      onChange={(e) => setFormData(prev => ({ ...prev, max_students: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter maximum students (optional)"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.is_active ? 'active' : 'inactive'}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.value === 'active' }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="px-4 py-3 border-t border-gray-200 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <span>{selectedCourse ? 'Update' : 'Create'} Course</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Course Details Modal */}
        {showDetailsModal && courseDetails && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-white/20">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700">
                <div>
                  <h3 className="text-xl font-semibold text-white">{courseDetails.course_name}</h3>
                  <p className="text-blue-100 text-sm">{courseDetails.course_category}</p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200">
                <div className="flex overflow-x-auto pb-2 md:pb-0">
                  <button
                    onClick={() => setActiveTab('materials')}
                    className={`flex items-center space-x-2 px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'materials'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    <FaFileAlt className="w-4 h-4" />
                    <span>Study Materials ({materials.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('subjects')}
                    className={`flex items-center space-x-2 px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'subjects'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    <FaBook className="w-4 h-4" />
                    <span>Subjects ({subjects.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('tests')}
                    className={`flex items-center space-x-2 px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'tests'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    <FaClipboardList className="w-4 h-4" />
                    <span>Online Tests ({tests.length})</span>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
                {detailsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-500">Loading...</span>
                  </div>
                ) : (
                  <>
                    {/* Materials Tab */}
                    {activeTab === 'materials' && (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-semibold text-gray-900">Study Materials</h4>
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.avi,.mkv"
                              onChange={handleMaterialUpload}
                              disabled={uploadingMaterial}
                            />
                            <span className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-white transition-colors ${uploadingMaterial
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                              }`}>
                              {uploadingMaterial ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  <span>Uploading...</span>
                                </>
                              ) : (
                                <>
                                  <FaUpload className="w-4 h-4" />
                                  <span>Upload Material</span>
                                </>
                              )}
                            </span>
                          </label>
                        </div>

                        {materials.length === 0 ? (
                          <div className="text-center py-12 bg-gray-50 rounded-lg">
                            <FaFileAlt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No materials uploaded yet</p>
                            <p className="text-gray-400 text-sm mt-1">Click "Upload Material" to add study materials</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {materials.map((material, index) => (
                              <div key={material.id || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <FaFileAlt className="w-5 h-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">{material.material_name || material.name || material.file_name}</p>
                                    <p className="text-sm text-gray-500">{material.material_type || material.type || 'Document'}</p>
                                  </div>
                                </div>
                                {(material.file_url || material.file_path || material.url) ? (
                                  <a
                                    href={`http://localhost:4000/${material.file_url || material.file_path || material.url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                  >
                                    <FaDownload className="w-3 h-3" />
                                    <span>Download</span>
                                  </a>
                                ) : material.external_link ? (
                                  <a
                                    href={material.external_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center space-x-1 px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                                  >
                                    <FaEye className="w-3 h-3" />
                                    <span>Open Link</span>
                                  </a>
                                ) : (
                                  <span className="text-gray-400 text-sm">No file</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Subjects Tab */}
                    {activeTab === 'subjects' && (
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Subjects</h4>
                        {subjects.length === 0 ? (
                          <div className="text-center py-12 bg-gray-50 rounded-lg">
                            <FaBook className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No subjects found for this program</p>
                            <p className="text-gray-400 text-sm mt-1">Go to Subject Management to add subjects</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {subjects.map((subject, index) => (
                              <div key={subject.id || index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                    <FaBook className="w-5 h-5 text-orange-600" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">{subject.subject_name || subject.name}</p>
                                    <p className="text-sm text-gray-500">{subject.subject_code || subject.code || 'No code'}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tests Tab */}
                    {activeTab === 'tests' && (
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Online Tests</h4>
                        {tests.length === 0 ? (
                          <div className="text-center py-12 bg-gray-50 rounded-lg">
                            <FaClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No online tests found for this course</p>
                            <p className="text-gray-400 text-sm mt-1">Go to Online Test Management to create tests</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {tests.map((test, index) => (
                              <div key={test.id || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <FaClipboardList className="w-5 h-5 text-purple-600" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">{test.paperName || test.test_name || test.name || test.title || 'Untitled Test'}</p>
                                    <p className="text-sm text-gray-500">
                                      {test.numberOfQuestions || test.total_questions || test.questions?.length || 0} Questions | {test.timeLimit || test.duration || test.time_limit || 30} mins
                                    </p>
                                  </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${test.status === 'active' || test.is_active
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-gray-100 text-gray-600'
                                  }`}>
                                  {test.status === 'active' || test.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BranchLayout>
  );
};

export default CoursesManagement;