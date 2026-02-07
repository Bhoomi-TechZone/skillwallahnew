import { useState, useEffect } from 'react';
import { FaBook, FaSearch, FaEye, FaDownload, FaFileAlt, FaSpinner } from 'react-icons/fa';
import BranchLayout from '../BranchLayout';
import { getUserData } from '../../../utils/authUtils';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
    fetchSyllabuses,
    fetchPrograms,
    fetchCoursesByProgram,
    fetchSubjectsByCourse,
    downloadSyllabus,
    getSyllabusDetails
} from '../../../api/syllabusApi';

const BranchSyllabus = () => {
    const [syllabuses, setSyllabuses] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [courses, setCourses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [programFilter, setProgramFilter] = useState('');
    const [courseFilter, setCourseFilter] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('');
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [selectedSyllabus, setSelectedSyllabus] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [downloadingId, setDownloadingId] = useState(null);
    const [loadingPrograms, setLoadingPrograms] = useState(false);
    const [loadingCourses, setLoadingCourses] = useState(false);
    const [loadingSubjects, setLoadingSubjects] = useState(false);
    const [showContextInfo, setShowContextInfo] = useState(false);

    // Get user context
    const userData = getUserData();
    const userContext = {
        role: userData?.role || 'N/A',
        is_branch_admin: userData?.is_branch_admin || false,
        franchise_code: userData?.franchise_code || localStorage.getItem('franchise_code') || 'N/A',
        branch_code: userData?.branch_code || localStorage.getItem('branch_code') || 'N/A',
    };

    // Load programs on component mount
    useEffect(() => {
        loadPrograms();
        loadSyllabuses();
    }, []);

    // Load programs
    const loadPrograms = async () => {
        try {
            setLoadingPrograms(true);
            const programsData = await fetchPrograms();
            // Filter only active programs
            const activePrograms = (programsData || []).filter(program => program.status === 'active');
            setPrograms(activePrograms);
        } catch (error) {
            console.error('Error loading programs:', error);
            setError('Failed to load programs');
        } finally {
            setLoadingPrograms(false);
        }
    };

    // Load syllabuses with current filters
    const loadSyllabuses = async () => {
        try {
            setLoading(true);
            setError(null);
            const filters = {
                program: programFilter,
                course: courseFilter,
                subject: subjectFilter,
                search: searchTerm
            };

            const syllabusesData = await fetchSyllabuses(filters);
            setSyllabuses(syllabusesData);
        } catch (error) {
            console.error('Error loading syllabuses:', error);
            setError('Failed to load syllabuses');
        } finally {
            setLoading(false);
        }
    };

    // Load courses when program changes
    useEffect(() => {
        if (programFilter) {
            loadCourses(programFilter);
            setCourseFilter('');
            setSubjectFilter('');
            setSubjects([]);
        } else {
            setCourses([]);
            setCourseFilter('');
            setSubjectFilter('');
            setSubjects([]);
        }
    }, [programFilter]);

    // Load subjects when course changes
    useEffect(() => {
        if (courseFilter) {
            loadSubjects(courseFilter);
            setSubjectFilter('');
        } else {
            setSubjects([]);
            setSubjectFilter('');
        }
    }, [courseFilter]);

    // Reload syllabuses when filters change
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            loadSyllabuses();
        }, 500); // Debounce search

        return () => clearTimeout(timeoutId);
    }, [searchTerm, programFilter, courseFilter, subjectFilter]);

    // Load courses for selected program
    const loadCourses = async (programId) => {
        try {
            setLoadingCourses(true);
            const coursesData = await fetchCoursesByProgram(programId);
            setCourses(coursesData);
            if (coursesData.length === 0) {
                console.warn('No courses found for program:', programId);
            }
        } catch (error) {
            console.error('Error loading courses:', error);
            setError(`Failed to load courses: ${error.message}`);
            setCourses([]);
        } finally {
            setLoadingCourses(false);
        }
    };

    // Load subjects for selected course
    const loadSubjects = async (courseId) => {
        try {
            setLoadingSubjects(true);
            const subjectsData = await fetchSubjectsByCourse(courseId);
            setSubjects(subjectsData);
            if (subjectsData.length === 0) {
                console.warn('No subjects found for course:', courseId);
            }
        } catch (error) {
            console.error('Error loading subjects:', error);
            setError(`Failed to load subjects: ${error.message}`);
            setSubjects([]);
        } finally {
            setLoadingSubjects(false);
        }
    };

    // Filter syllabuses (now handled by API, but keeping for compatibility)
    const filteredSyllabuses = syllabuses;

    // Handle preview syllabus
    const handlePreview = async (syllabus) => {
        try {
            const details = await getSyllabusDetails(syllabus.id);
            setSelectedSyllabus(details || syllabus);
            setShowPreviewModal(true);
        } catch (error) {
            console.error('Error fetching syllabus details:', error);
            // Still show modal with existing data if API fails
            setSelectedSyllabus(syllabus);
            setShowPreviewModal(true);
        }
    };

    // Handle download syllabus
    const handleDownload = async (syllabus) => {
        try {
            console.log('📥 Starting download for syllabus:', syllabus);
            setDownloadingId(syllabus.id);

            const result = await downloadSyllabus(syllabus.id);

            if (result && result.status === 'success') {
                console.log('✅ Download completed successfully:', result.filename);
                toast.success(`Syllabus downloaded successfully: ${result.filename || syllabus.file_name}`);
                setError(null); // Clear any previous errors
            }

        } catch (error) {
            console.error('❌ Error downloading syllabus:', error);

            // Enhanced error handling
            let errorMessage = 'Download failed';

            if (error.message.includes('404')) {
                errorMessage = 'Syllabus file not found on server. Please contact support.';
            } else if (error.message.includes('401')) {
                errorMessage = 'Authentication failed. Please login again.';
            } else if (error.message.includes('not found')) {
                errorMessage = 'File not found. The syllabus may have been moved or deleted.';
            } else {
                errorMessage = `Download failed: ${error.message}`;
            }

            toast.error(errorMessage);
            setError(errorMessage);

            // Auto-clear error after 5 seconds
            setTimeout(() => {
                setError(null);
            }, 5000);

        } finally {
            setDownloadingId(null);
        }
    };

    // Handle search input
    const handleSearch = (value) => {
        setSearchTerm(value);
        setCurrentPage(1);
    };

    // Handle filter changes
    const handleProgramChange = (value) => {
        setProgramFilter(value);
        setCourseFilter('');
        setSubjectFilter('');
        setCurrentPage(1);
    };

    const handleCourseChange = (value) => {
        setCourseFilter(value);
        setSubjectFilter('');
        setCurrentPage(1);
    };

    const handleSubjectChange = (value) => {
        setSubjectFilter(value);
        setCurrentPage(1);
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    // Pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredSyllabuses.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredSyllabuses.length / itemsPerPage);

    return (
        <BranchLayout>
            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <div className="bg-white shadow-sm border-b border-gray-200">
                    <div className="px-6 py-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center space-x-3">
                                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-2 rounded-lg">
                                    <FaBook className="w-6 h-6" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">Syllabus</h1>
                                    <p className="text-gray-600">View and download course syllabuses</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                {/* Multi-Tenant Context Display */}

                                {error && (
                                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                                        {error}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Multi-Tenant Context Information Card */}
                {showContextInfo && (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 shadow-md mx-6 mt-4 rounded-lg">
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                                    <span className="mr-2">🔐</span>
                                    Multi-Tenant Context
                                </h3>
                                <button
                                    onClick={() => setShowContextInfo(false)}
                                    className="text-gray-500 hover:text-gray-700 font-bold text-xl"
                                >
                                    ×
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-white rounded-lg p-3 shadow-sm border border-indigo-200">
                                    <p className="text-xs text-gray-600 font-semibold mb-1">Role</p>
                                    <p className="text-sm font-bold text-indigo-700">{userContext.role}</p>
                                </div>
                                <div className="bg-white rounded-lg p-3 shadow-sm border border-purple-200">
                                    <p className="text-xs text-gray-600 font-semibold mb-1">Branch Admin</p>
                                    <p className="text-sm font-bold text-purple-700">
                                        {userContext.is_branch_admin ? '✅ Yes' : '❌ No'}
                                    </p>
                                </div>
                                <div className="bg-white rounded-lg p-3 shadow-sm border border-blue-200">
                                    <p className="text-xs text-gray-600 font-semibold mb-1">Franchise Code</p>
                                    <p className="text-sm font-bold text-blue-700">{userContext.franchise_code}</p>
                                </div>
                                <div className="bg-white rounded-lg p-3 shadow-sm border border-orange-200">
                                    <p className="text-xs text-gray-600 font-semibold mb-1">Branch Code</p>
                                    <p className="text-sm font-bold text-orange-700">{userContext.branch_code}</p>
                                </div>
                            </div>
                            <div className="mt-3 bg-white rounded-lg p-3 shadow-sm border border-yellow-200">
                                <p className="text-xs text-gray-600 font-semibold mb-1">Backend Filter Logic</p>
                                <code className="text-xs bg-gray-100 p-2 rounded block overflow-x-auto text-gray-800">
                                    {`{'$or': [{'franchise_code': '${userContext.franchise_code}'}, {'branch_code': '${userContext.branch_code}'}, {'branch_code': '${userContext.branch_code}'}]}`}
                                </code>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Search
                            </label>
                            <div className="relative">
                                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    placeholder="Search syllabuses..."
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                PROGRAM
                            </label>
                            <select
                                value={programFilter}
                                onChange={(e) => handleProgramChange(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={loadingPrograms}
                            >
                                <option value="">All Programs</option>
                                {programs.map(program => (
                                    <option key={program.id} value={program.id}>
                                        {program.program_name || program.name}
                                    </option>
                                ))}
                            </select>
                            {loadingPrograms && (
                                <div className="absolute right-3 top-10">
                                    <FaSpinner className="w-4 h-4 animate-spin text-gray-400" />
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                COURSES
                            </label>
                            <select
                                value={courseFilter}
                                onChange={(e) => handleCourseChange(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={!programFilter || loadingCourses}
                            >
                                <option value="">--- SELECT COURSE ---</option>
                                {courses.map(course => (
                                    <option key={course.id} value={course.id}>
                                        {course.name || course.course_name}
                                    </option>
                                ))}
                            </select>
                            {loadingCourses && (
                                <div className="absolute right-3 top-10">
                                    <FaSpinner className="w-4 h-4 animate-spin text-gray-400" />
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                SUBJECT
                            </label>
                            <select
                                value={subjectFilter}
                                onChange={(e) => handleSubjectChange(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={!courseFilter || loadingSubjects}
                            >
                                <option value="">--- SELECT Subject ---</option>
                                {subjects.map(subject => (
                                    <option key={subject.id} value={subject.id}>
                                        {subject.subject_name || subject.name}
                                    </option>
                                ))}
                            </select>
                            {loadingSubjects && (
                                <div className="absolute right-3 top-10">
                                    <FaSpinner className="w-4 h-4 animate-spin text-gray-400" />
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-2 lg:mt-0">
                            <div className="text-sm text-gray-600">
                                Total: {filteredSyllabuses.length} syllabuses
                                {(searchTerm || programFilter || courseFilter || subjectFilter) && (
                                    <span className="ml-2 text-blue-600">
                                        (Filtered)
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setProgramFilter('');
                                    setCourseFilter('');
                                    setSubjectFilter('');
                                    setCourses([]);
                                    setSubjects([]);
                                    setCurrentPage(1);
                                }}
                                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                                disabled={!searchTerm && !programFilter && !courseFilter && !subjectFilter}
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        ) : filteredSyllabuses.length === 0 ? (
                            <div className="px-6 py-12 text-center text-gray-500">
                                <FaBook className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                                <p className="text-lg font-medium text-gray-900 mb-2">No syllabuses found</p>
                                <p className="text-gray-600">
                                    {programs.length === 0
                                        ? 'Please add some programs and courses in the admin panel.'
                                        : 'No syllabuses available for the selected filters. Try adjusting your search criteria.'
                                    }
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Desktop Table View */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full table-auto">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    S.NO.
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Program
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Course
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Subject
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Syllabus Title
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    File Name
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Uploaded Date
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Action
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {currentItems.map((syllabus, index) => (
                                                <tr key={syllabus.id} className="hover:bg-gray-50 transition-colors duration-200">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {indexOfFirstItem + index + 1}.
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-900">
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                            {syllabus.program_name || syllabus.program}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-900">
                                                        <div className="max-w-xs">
                                                            <p className="font-medium truncate">{syllabus.course_name || syllabus.course}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-900">
                                                        {syllabus.subject_name || syllabus.subject}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-900">
                                                        <div className="max-w-xs">
                                                            <p className="font-medium truncate">{syllabus.title || syllabus.syllabusTitle}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">
                                                        <div className="flex items-center space-x-2">
                                                            <FaFileAlt className="w-4 h-4 text-red-500" />
                                                            <span className="truncate max-w-xs">{syllabus.file_name || syllabus.fileName}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                        {formatDate(syllabus.uploaded_date || syllabus.uploadedDate)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center space-x-2">
                                                            <button
                                                                onClick={() => handleDownload(syllabus)}
                                                                disabled={downloadingId === syllabus.id}
                                                                className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition-colors disabled:opacity-50"
                                                                title="Download"
                                                            >
                                                                {downloadingId === syllabus.id ? (
                                                                    <FaSpinner className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <FaDownload className="w-4 h-4" />
                                                                )}
                                                            </button>

                                                            <button
                                                                onClick={() => handlePreview(syllabus)}
                                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                                title="Preview"
                                                            >
                                                                <FaEye className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Card View */}
                                <div className="md:hidden space-y-4">
                                    {currentItems.map((syllabus, index) => (
                                        <div key={syllabus.id} className="p-4 bg-white border-b border-gray-200 last:border-b-0">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <span className="text-xs font-semibold text-gray-500">#{indexOfFirstItem + index + 1}</span>
                                                    <h3 className="text-lg font-bold text-gray-900 mt-1 line-clamp-1">
                                                        {syllabus.title || syllabus.syllabusTitle}
                                                    </h3>
                                                    <div className="mt-1 flex flex-wrap gap-2">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                                            {syllabus.program_name || syllabus.program}
                                                        </span>
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                            {syllabus.course_name || syllabus.course}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2 mb-4">
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <span className="font-medium mr-2">Subject:</span>
                                                    {syllabus.subject_name || syllabus.subject}
                                                </div>
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <FaFileAlt className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" />
                                                    <span className="truncate">{syllabus.file_name || syllabus.fileName}</span>
                                                </div>
                                                <div className="flex items-center text-sm text-gray-500">
                                                    <span className="mr-2">Date:</span>
                                                    {formatDate(syllabus.uploaded_date || syllabus.uploadedDate)}
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                                <button
                                                    onClick={() => handlePreview(syllabus)}
                                                    className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                                                >
                                                    <FaEye className="w-4 h-4 mr-1.5" />
                                                    Preview
                                                </button>
                                                <button
                                                    onClick={() => handleDownload(syllabus)}
                                                    disabled={downloadingId === syllabus.id}
                                                    className="flex items-center px-3 py-1.5 text-sm font-medium bg-orange-50 text-orange-600 rounded-md hover:bg-orange-100 transition-colors disabled:opacity-50"
                                                >
                                                    {downloadingId === syllabus.id ? (
                                                        <FaSpinner className="w-4 h-4 animate-spin mr-1.5" />
                                                    ) : (
                                                        <FaDownload className="w-4 h-4 mr-1.5" />
                                                    )}
                                                    Download
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                            <div className="text-sm text-gray-700">
                                                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredSyllabuses.length)} of {filteredSyllabuses.length} syllabuses
                                            </div>
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                    disabled={currentPage === 1}
                                                    className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Previous
                                                </button>
                                                <span className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md">
                                                    {currentPage} of {totalPages}
                                                </span>
                                                <button
                                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                    disabled={currentPage === totalPages}
                                                    className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Preview Modal */}
                {showPreviewModal && selectedSyllabus && (
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center p-4 z-50">
                        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-white/20">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-semibold text-gray-900">Syllabus Details</h3>
                                    <button
                                        onClick={() => setShowPreviewModal(false)}
                                        className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>

                            <div className="px-6 py-4 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Program</h4>
                                        <p className="text-lg text-gray-900">{selectedSyllabus.program_name || selectedSyllabus.program}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Course</h4>
                                        <p className="text-lg text-gray-900">{selectedSyllabus.course_name || selectedSyllabus.course}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Subject</h4>
                                        <p className="text-lg text-gray-900">{selectedSyllabus.subject_name || selectedSyllabus.subject}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Syllabus Title</h4>
                                        <p className="text-lg text-gray-900">{selectedSyllabus.title || selectedSyllabus.syllabusTitle}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Description</h4>
                                        <p className="text-gray-900">{selectedSyllabus.description || 'No description provided'}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">File Name</h4>
                                        <p className="text-gray-900">{selectedSyllabus.file_name || selectedSyllabus.fileName}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">File Size</h4>
                                        <p className="text-gray-900">{selectedSyllabus.file_size || selectedSyllabus.fileSize}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Uploaded By</h4>
                                        <p className="text-gray-900">{selectedSyllabus.uploaded_by || selectedSyllabus.uploadedBy}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Uploaded Date</h4>
                                        <p className="text-gray-900">{formatDate(selectedSyllabus.uploaded_date || selectedSyllabus.uploadedDate)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
                                <button
                                    onClick={() => handleDownload(selectedSyllabus)}
                                    disabled={downloadingId === selectedSyllabus.id}
                                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {downloadingId === selectedSyllabus.id ? (
                                        <>
                                            <FaSpinner className="w-4 h-4 animate-spin" />
                                            <span>Downloading...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FaDownload className="w-4 h-4" />
                                            <span>Download</span>
                                        </>
                                    )}
                                    <span>Download</span>
                                </button>
                                <button
                                    onClick={() => setShowPreviewModal(false)}
                                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Toast Container */}
            <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
            />
        </BranchLayout>
    );
};

export default BranchSyllabus;