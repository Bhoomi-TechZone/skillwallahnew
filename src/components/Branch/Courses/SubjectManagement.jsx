import { useState, useEffect } from 'react';
import { FaClipboard, FaPlus, FaEdit, FaTrash, FaSearch, FaToggleOn, FaToggleOff, FaBook, FaGraduationCap, FaBookOpen, FaEye } from 'react-icons/fa';
import BranchLayout from '../BranchLayout';
import { branchSubjectService } from '../../../services/branchSubjectService';
import { branchProgramService } from '../../../services/branchProgramService';
import { branchCourseService } from '../../../services/branchCourseService';

const SubjectManagement = () => {
  const [subjects, setSubjects] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState({ show: false, subject: null });
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, subject: null });
  const [formData, setFormData] = useState({
    subject_name: '',
    subject_code: '',
    branch_code: '',
    program_id: '',
    course_id: '',
    semester: '',
    credits: '',
    theory_marks: '',
    practical_marks: '',
    description: '',
    is_active: true
  });

  const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

  // Helper functions to manage deleted subjects in session storage
  const getDeletedSubjects = () => {
    try {
      const deleted = sessionStorage.getItem('deletedSubjects');
      return deleted ? JSON.parse(deleted) : [];
    } catch {
      return [];
    }
  };

  const addDeletedSubject = (subjectId) => {
    const deleted = getDeletedSubjects();
    if (!deleted.includes(subjectId)) {
      deleted.push(subjectId);
      sessionStorage.setItem('deletedSubjects', JSON.stringify(deleted));
    }
  };

  const removeDeletedSubject = (subjectId) => {
    const deleted = getDeletedSubjects().filter(id => id !== subjectId);
    sessionStorage.setItem('deletedSubjects', JSON.stringify(deleted));
  };

  // Helper function to get course name by course_id
  const getCourseName = (courseId) => {
    if (!courseId) return 'N/A';
    const course = courses.find(c => c.id === courseId);
    return course ? (course.course_name || course.name) : 'N/A';
  };

  // Helper function to get program name by program_id  
  const getProgramName = (programId) => {
    if (!programId) return 'N/A';
    const program = programs.find(p => p.id === programId);
    return program ? (program.program_name || program.name) : 'N/A';
  };

  // Get branch code from token
  const getBranchCode = () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('🔍 Token payload:', payload);
        console.log('🔍 branch_code in token:', payload.branch_code);
        console.log('🔍 franchise_code in token:', payload.franchise_code);

        // Use branch_code from token if available, otherwise use franchise_code or default
        return payload.branch_code || payload.franchise_code || 'FR-SK-0940';
      }
    } catch (error) {
      console.error('Error parsing token:', error);
    }
    return 'DEFAULT';
  };

  const loadPrograms = async () => {
    try {
      const response = await branchProgramService.getPrograms();
      if (response.success && response.data) {
        setPrograms(response.data);
        console.log('✅ [SubjectManagement] Loaded programs:', response.data.length);
      } else {
        console.error('❌ Error loading programs:', response.error);
      }
    } catch (error) {
      console.error('❌ Error loading programs:', error);
    }
  };

  const loadCourses = async () => {
    try {
      const response = await branchCourseService.getCourses();
      console.log('🔍 [DEBUG] Courses API response:', response);
      if (response.success && response.data) {
        console.log('🔍 [DEBUG] Courses data:', response.data);
        console.log('🔍 [DEBUG] First course:', response.data[0]);
        setCourses(response.data);
        console.log('✅ [SubjectManagement] Loaded courses:', response.data.length);
      } else {
        console.error('❌ Error loading courses:', response.error);
        setCourses([]);
      }
    } catch (error) {
      console.error('❌ Error loading courses:', error);
      setCourses([]);
    }
  };

  const loadSubjects = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 [SubjectManagement] Loading subjects...');
      const response = await branchSubjectService.getSubjects();
      if (response.success) {
        console.log('🔍 [DEBUG] Raw subjects data:', response.data);
        console.log('🔍 [DEBUG] Subjects count:', response.data?.length || 0);
        console.log('🔍 [DEBUG] First subject:', response.data?.[0]);
        console.log('🔍 [DEBUG] First subject theory_marks:', response.data?.[0]?.theory_marks);
        console.log('🔍 [DEBUG] First subject all keys:', response.data?.[0] ? Object.keys(response.data[0]) : 'No data');

        // Filter out subjects that were deleted in this session
        const deletedSubjects = getDeletedSubjects();
        const filteredSubjects = (response.data || []).filter(subject =>
          !deletedSubjects.includes(subject.id)
        );

        console.log('🔍 [DEBUG] Deleted subjects in session:', deletedSubjects);
        console.log('🔍 [DEBUG] Filtered subjects count:', filteredSubjects.length);

        setSubjects(filteredSubjects);
        console.log('✅ [SubjectManagement] Loaded subjects (after filtering deleted):', filteredSubjects.length);
      } else {
        console.error('❌ [SubjectManagement] Failed to load subjects:', response.error);
        setError(response.error);
        setSubjects([]); // Clear subjects on error
      }
    } catch (error) {
      console.error('❌ [SubjectManagement] Error loading subjects:', error);
      setError('Failed to load subjects. Please try again.');
      setSubjects([]); // Clear subjects on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadAllData = async () => {
      await Promise.all([
        loadPrograms(),
        loadCourses(),
        loadSubjects()
      ]);

      // Log current deleted subjects for debugging
      const deletedSubjects = getDeletedSubjects();
      if (deletedSubjects.length > 0) {
        console.log('📝 [SubjectManagement] Currently deleted subjects:', deletedSubjects);
      }
    };
    loadAllData();
  }, []);

  const filteredSubjects = Array.isArray(subjects) ? subjects.filter(subject => {
    const matchesSearch = subject.subject_name?.toLowerCase().includes(searchTerm.toLowerCase()) || '';
    const matchesProgram = selectedProgram === '' || subject.program_id === selectedProgram || subject.program_name === selectedProgram;
    const matchesCourse = selectedCourse === '' || subject.course_id === selectedCourse || subject.course_name === selectedCourse;
    return matchesSearch && matchesProgram && matchesCourse;
  }) : [];

  const handleCreate = () => {
    setFormData({
      subject_name: '',
      subject_code: '',
      branch_code: getBranchCode(),
      program_id: '',
      course_id: '',
      semester: '',
      credits: '',
      theory_marks: '',
      practical_marks: '',
      description: '',
      is_active: true
    });
    setSelectedSubject(null);
    setShowModal(true);
  };

  const handleEdit = (subject) => {
    setFormData({
      subject_name: subject.subject_name || '',
      subject_code: subject.subject_code || '',
      branch_code: subject.branch_code || getBranchCode(),
      program_id: subject.program_id || '',
      course_id: subject.course_id || '',
      semester: subject.semester?.toString() || '',
      credits: subject.credits?.toString() || '',
      theory_marks: subject.theory_marks?.toString() || '',
      practical_marks: subject.practical_marks?.toString() || '',
      description: subject.description || '',
      is_active: subject.status === 'active'
    });
    setSelectedSubject(subject);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      // Ensure branch_code is set from current user context
      const currentBranchCode = getBranchCode();

      const subjectData = {
        ...formData,
        branch_code: currentBranchCode, // Ensure branch code is always set
        semester: parseInt(formData.semester),
        credits: parseInt(formData.credits),
        theory_marks: formData.theory_marks ? parseInt(formData.theory_marks) : null,
        practical_marks: formData.practical_marks ? parseInt(formData.practical_marks) : null,
        description: formData.description || "",
        subject_type: "theory", // Default type
        status: formData.is_active ? "active" : "inactive"
      };

      console.log('📝 [SubjectManagement] Submitting subject data:', subjectData);

      let response;
      if (selectedSubject) {
        response = await branchSubjectService.updateSubject(selectedSubject.id, subjectData);
      } else {
        response = await branchSubjectService.createSubject(subjectData);
      }

      if (response.success) {
        // Immediately update local state for better UX
        if (selectedSubject) {
          // Update existing subject
          setSubjects(prevSubjects =>
            prevSubjects.map(subject =>
              subject.id === selectedSubject.id
                ? { ...selectedSubject, ...subjectData, id: selectedSubject.id }
                : subject
            )
          );
          // Clear any specific deleted subject from session if it was re-added
          removeDeletedSubject(selectedSubject.id);
        } else {
          // Add new subject to the list
          if (response.data) {
            setSubjects(prevSubjects => [...prevSubjects, response.data]);
          } else {
            // Fallback: reload subjects if response doesn't contain the new subject data
            await loadSubjects();
          }
        }
        setShowModal(false);
        setError(null); // Clear any existing errors
      } else {
        setError(response.error);
        alert(`Failed to ${selectedSubject ? 'update' : 'create'} subject: ${response.error}`);
      }
    } catch (error) {
      console.error('Error saving subject:', error);
      alert('Failed to save subject. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (subjectId) => {
    try {
      setLoading(true);
      const subject = subjects.find(s => s.id === subjectId);

      if (!subject) {
        alert('Subject not found');
        return;
      }

      // Determine new status (toggle current status)
      const currentStatus = subject.status || 'inactive';
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

      console.log('🔄 [SubjectManagement] Toggling status for subject:', subject.subject_name);
      console.log('🔄 [SubjectManagement] Current status:', currentStatus);
      console.log('🔄 [SubjectManagement] New status:', newStatus);

      // Prepare update data with correct field names for API
      const updateData = {
        ...subject,
        status: newStatus,
        is_active: newStatus === 'active'
      };

      console.log('📝 [SubjectManagement] Sending update data:', updateData);

      const response = await branchSubjectService.updateSubject(subjectId, updateData);

      console.log('📬 [SubjectManagement] Toggle status response:', response);

      if (response.success) {
        // Update local state immediately for better UX
        setSubjects(prevSubjects =>
          prevSubjects.map(s =>
            s.id === subjectId
              ? { ...s, status: newStatus, is_active: newStatus === 'active' }
              : s
          )
        );

        console.log('✅ [SubjectManagement] Status updated successfully to:', newStatus);
        setError(null); // Clear any existing errors
      } else {
        console.error('❌ [SubjectManagement] Failed to update status:', response.error);
        setError(response.error || 'Failed to update subject status.');
        alert(`Failed to update subject status: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ [SubjectManagement] Error updating subject status:', error);
      console.error('❌ [SubjectManagement] Error details:', error.response);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to update subject status.';
      setError(errorMessage);
      alert(`Failed to update subject status: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (subject) => {
    setViewModal({ show: true, subject });
  };

  const confirmDelete = (subject) => {
    setDeleteConfirm({ show: true, subject });
  };

  const handleDelete = async () => {
    const { subject } = deleteConfirm;
    if (!subject) return;

    const subjectName = subject.subject_name || 'this subject';

    try {
      setLoading(true);
      console.log('🗑️ [SubjectManagement] Starting delete for subject ID:', subject.id);
      console.log('🗑️ [SubjectManagement] Subject details:', subject);
      console.log('🗑️ [SubjectManagement] Current subjects count before delete:', subjects.length);

      const response = await branchSubjectService.deleteSubject(subject.id);

      console.log('📬 [SubjectManagement] Delete response:', response);
      console.log('📬 [SubjectManagement] Response success:', response.success);
      console.log('📬 [SubjectManagement] Response data:', response.data);

      if (response.success) {
        console.log('✅ [SubjectManagement] Subject deleted successfully');
        console.log('✅ [SubjectManagement] API Response:', response);

        // Add to deleted subjects in session storage
        addDeletedSubject(subject.id);
        console.log('💾 [SubjectManagement] Added to deleted subjects:', subject.id);

        // Immediately remove from local state for instant UI update
        const updatedSubjects = subjects.filter(s => s.id !== subject.id);
        console.log('🔄 [SubjectManagement] Updated subjects count after filter:', updatedSubjects.length);
        setSubjects(updatedSubjects);

        // Close the delete confirmation modal
        setDeleteConfirm({ show: false, subject: null });

        // Show success message
        setError(null); // Clear any existing errors
        alert(`Subject "${subjectName}" has been deleted successfully!`);

        console.log('🔄 [SubjectManagement] Subject will stay deleted even after refresh');
      } else {
        console.error('❌ [SubjectManagement] Delete failed:', response.error);
        setError(`Failed to delete subject: ${response.error}`);
        alert(`Failed to delete subject: ${response.error}`);
        // Close modal even on failure
        setDeleteConfirm({ show: false, subject: null });
      }
    } catch (error) {
      console.error('❌ [SubjectManagement] Error deleting subject:', error);
      console.error('❌ [SubjectManagement] Error details:', error.response);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete subject. Please try again.';
      setError(errorMessage);
      alert(errorMessage);
      // Close modal even on error
      setDeleteConfirm({ show: false, subject: null });
    } finally {
      setLoading(false);
      console.log('🔄 [SubjectManagement] Delete operation completed');
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
                <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white p-2 rounded-lg">
                  <FaClipboard className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-secondary-900">MANAGE SUBJECTS</h1>
                  <p className="text-xs md:text-sm text-secondary-600 mt-0.5 md:mt-1">Manage subjects for different programs and courses</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCreate}
                  className="w-full md:w-auto bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center justify-center space-x-2 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <FaPlus className="w-4 h-4" />
                  <span>Add Subject</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:px-6 md:py-6">
          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Filters */}
          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search subjects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full border border-secondary-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
              />
            </div>

            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="px-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
            >
              <option value="">--- SELECT Program ---</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.program_name || program.name}
                </option>
              ))}
            </select>

            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
            >
              <option value="">--- SELECT COURSE ---</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.course_name || course.name}
                </option>
              ))}
            </select>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden space-y-4 mb-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-2"></div>
                <span className="text-gray-500">Loading subjects...</span>
              </div>
            ) : filteredSubjects.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                No subjects found
              </div>
            ) : (
              filteredSubjects.map((subject) => (
                <div key={subject.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-base font-semibold text-secondary-900">{subject.subject_name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {subject.semester} SEM
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                          {subject.branch_code || getBranchCode()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleStatus(subject.id)}
                      disabled={loading}
                      className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${subject.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                        }`}
                    >
                      {subject.status === 'active' ? (
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

                  <div className="grid grid-cols-1 gap-2 text-xs text-gray-600">
                    <div className="flex items-center space-x-2">
                      <FaBookOpen className="text-teal-600" />
                      <span className="font-medium">Program: {subject.program_name || getProgramName(subject.program_id)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FaBookOpen className="text-blue-600" />
                      <span className="font-medium">Course: {subject.course_name || getCourseName(subject.course_id)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Theory Marks: {subject.theory_marks || subject.theoryMarks || subject.theory || subject.marks || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-3 border-t border-gray-100 space-x-2">
                    <button
                      onClick={() => handleView(subject)}
                      className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded transition-colors"
                    >
                      <FaEye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(subject)}
                      className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                    >
                      <FaEdit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => confirmDelete(subject)}
                      className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors"
                    >
                      <FaTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Subjects Table */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-teal-50 to-blue-50 border-b border-teal-200">
                    <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">S.No.</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">Branch Code</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">Program Name</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">Course Name</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">SUBJECT NAME</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">SEM</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">THEORY</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-12 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                          <span className="text-sm text-gray-500">Loading subjects...</span>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-12 text-center">
                        <div className="text-red-600 text-sm">{error}</div>
                      </td>
                    </tr>
                  ) : filteredSubjects.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-12 text-center text-sm text-gray-500">
                        No subjects found
                      </td>
                    </tr>
                  ) : (
                    filteredSubjects.map((subject, index) => (
                      <tr key={subject.id} className="hover:bg-teal-50 transition-colors">
                        <td className="px-4 py-4">
                          <span className="text-sm font-medium text-secondary-900">{index + 1}.</span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                              {subject.branch_code || getBranchCode()}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center space-x-2">
                            <FaBookOpen className="w-4 h-4 text-teal-600" />
                            <span className="text-sm font-medium text-secondary-900">{subject.program_name || getProgramName(subject.program_id)}</span>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center space-x-2">
                            <FaBookOpen className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-secondary-900">{subject.course_name || getCourseName(subject.course_id)}</span>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span className="text-sm font-semibold text-teal-700">{subject.subject_name}</span>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {subject.semester} SEM
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center">
                          {(() => {
                            const theoryMarks = subject.theory_marks || subject.theoryMarks || subject.theory || subject.marks;
                            const displayValue = theoryMarks !== undefined && theoryMarks !== null && theoryMarks !== '' ? theoryMarks : 'N/A';
                            const bgColor = displayValue === 'N/A' ? 'bg-gray-100 text-gray-600' : 'bg-orange-100 text-orange-800';

                            return (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor}`}>
                                {displayValue}
                              </span>
                            );
                          })()}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => toggleStatus(subject.id)}
                              disabled={loading}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${subject.status === 'active'
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                                  : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300'
                                }`}
                              title={`Toggle status (Currently ${subject.status === 'active' ? 'Active' : 'Inactive'})`}
                            >
                              {loading ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current inline mr-1"></div>
                                  {subject.status === 'active' ? 'Active' : 'Inactive'}
                                </>
                              ) : (
                                <>
                                  {subject.status === 'active' ? (
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
                              onClick={() => handleView(subject)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="View Details"
                            >
                              <FaEye className="w-3 h-3" />
                            </button>

                            <button
                              onClick={() => handleEdit(subject)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Edit"
                            >
                              <FaEdit className="w-3 h-3" />
                            </button>

                            <button
                              onClick={() => confirmDelete(subject)}
                              disabled={loading}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete Subject"
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
          <div className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl w-full max-w-sm border border-white/30 overflow-y-auto max-h-[90vh]">
              <form onSubmit={handleSubmit}>
                {/* Modal Header */}
                <div className="px-4 py-3 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedSubject ? 'Edit Subject' : 'Add New Subject'}
                  </h3>
                </div>

                {/* Modal Body */}
                <div className="px-4 py-3 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Subject Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.subject_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, subject_name: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="Enter subject name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Subject Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.subject_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, subject_code: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="Enter subject code"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Branch Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.branch_code || getBranchCode()}
                      onChange={(e) => setFormData(prev => ({ ...prev, branch_code: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="Branch code"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Program (Optional)
                      </label>
                      <select
                        value={formData.program_id || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, program_id: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      >
                        <option value="">--- Select Program ---</option>
                        {programs.map((program) => (
                          <option key={program.id} value={program.id}>
                            {program.program_name || program.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Course (Optional)
                      </label>
                      <select
                        value={formData.course_id || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, course_id: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      >
                        <option value="">--- Select Course ---</option>
                        {courses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.course_name || course.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Semester *
                      </label>
                      <select
                        required
                        value={formData.semester}
                        onChange={(e) => setFormData(prev => ({ ...prev, semester: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      >
                        <option value="">Select</option>
                        {semesters.map((sem, index) => (
                          <option key={index} value={sem}>{sem}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Credits *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        max="10"
                        value={formData.credits}
                        onChange={(e) => setFormData(prev => ({ ...prev, credits: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        placeholder="4"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Theory Marks *
                      </label>
                      <input
                        type="number"
                        required
                        value={formData.theory_marks}
                        onChange={(e) => setFormData(prev => ({ ...prev, theory_marks: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        placeholder="100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Practical Marks
                    </label>
                    <input
                      type="number"
                      value={formData.practical_marks}
                      onChange={(e) => setFormData(prev => ({ ...prev, practical_marks: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows="2"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                      placeholder="Subject description (optional)"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.is_active ? 'active' : 'inactive'}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.value === 'active' }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
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
                    className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-1.5 text-sm bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <span>{selectedSubject ? 'Update' : 'Create'} Subject</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Subject Modal */}
        {viewModal.show && (
          <div className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl w-full max-w-lg border border-white/30">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-teal-700 flex items-center">
                  <FaEye className="mr-2" />
                  Subject Details
                </h3>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-teal-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-teal-700 uppercase tracking-wide">Subject Name</label>
                    <p className="text-sm font-semibold text-teal-900 mt-1">{viewModal.subject?.subject_name || 'N/A'}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-blue-700 uppercase tracking-wide">Subject Code</label>
                    <p className="text-sm font-semibold text-blue-900 mt-1">{viewModal.subject?.subject_code || 'N/A'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-yellow-700 uppercase tracking-wide">Branch Code</label>
                    <p className="text-sm font-semibold text-yellow-900 mt-1">{viewModal.subject?.branch_code || getBranchCode()}</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-purple-700 uppercase tracking-wide">Semester</label>
                    <p className="text-sm font-semibold text-purple-900 mt-1">{viewModal.subject?.semester || 'N/A'}</p>
                  </div>
                  <div className="bg-indigo-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-indigo-700 uppercase tracking-wide">Credits</label>
                    <p className="text-sm font-semibold text-indigo-900 mt-1">{viewModal.subject?.credits || 'N/A'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Program</label>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{viewModal.subject?.program_name || getProgramName(viewModal.subject?.program_id) || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Course</label>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{viewModal.subject?.course_name || getCourseName(viewModal.subject?.course_id) || 'N/A'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-orange-700 uppercase tracking-wide">Theory Marks</label>
                    <p className="text-sm font-semibold text-orange-900 mt-1">{viewModal.subject?.theory_marks || 'N/A'}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-green-700 uppercase tracking-wide">Practical Marks</label>
                    <p className="text-sm font-semibold text-green-900 mt-1">{viewModal.subject?.practical_marks || 'N/A'}</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Description</label>
                  <p className="text-sm text-gray-900 mt-1">{viewModal.subject?.description || 'No description provided'}</p>
                </div>

                <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-lg">
                  <div>
                    <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Status</label>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${viewModal.subject?.status === 'active'
                          ? 'bg-green-100 text-green-700 border border-green-300'
                          : 'bg-red-100 text-red-700 border border-red-300'
                        }`}>
                        {viewModal.subject?.status === 'active' ? (
                          <>
                            <FaToggleOn className="w-3 h-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <FaToggleOff className="w-3 h-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setViewModal({ show: false, subject: null })}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setViewModal({ show: false, subject: null });
                    handleEdit(viewModal.subject);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
                >
                  <FaEdit className="w-4 h-4" />
                  <span>Edit Subject</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm.show && (
          <div className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl w-full max-w-md border border-white/30">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-red-600 flex items-center">
                  <FaTrash className="mr-2" />
                  Confirm Delete
                </h3>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-4">
                <p className="text-gray-700 mb-4">
                  Are you sure you want to delete this subject?
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="text-sm">
                    <div className="font-medium text-red-800">Subject: {deleteConfirm.subject?.subject_name}</div>
                    <div className="text-red-600">Code: {deleteConfirm.subject?.subject_code}</div>
                    <div className="text-red-600">Semester: {deleteConfirm.subject?.semester}</div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-3">
                  <strong>Warning:</strong> This action cannot be undone.
                </p>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm({ show: false, subject: null })}
                  disabled={loading}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <FaTrash className="w-4 h-4" />
                      <span>Delete Subject</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BranchLayout>
  );
};

export default SubjectManagement;