import { useState, useEffect } from 'react';
import { FaBook, FaSearch, FaEye, FaDownload, FaFileAlt } from 'react-icons/fa';
import BranchLayout from '../BranchLayout';
import { studyMaterialsAPI } from '../../../api/studyMaterialsApi';
import {
    fetchPrograms,
    fetchCoursesByProgram,
    fetchSubjectsByCourse
} from '../../../api/syllabusApi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const BranchMaterial = () => {
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [programFilter, setProgramFilter] = useState('');
    const [courseFilter, setCourseFilter] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('');
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Dynamic data from API
    const [programs, setPrograms] = useState([]);
    const [courses, setCourses] = useState({});
    const [subjects, setSubjects] = useState([]);
    const [loadingData, setLoadingData] = useState(false);

    // Load materials from API
    const loadMaterials = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get all study materials from API (no filter to get all materials)
            const response = await studyMaterialsAPI.getMaterials({});

            console.log('📚 Study Materials API Response:', response);

            // Handle both direct array and wrapped response formats
            const materialsData = Array.isArray(response) ? response : (response?.data || []);

            if (materialsData && Array.isArray(materialsData)) {
                // Map API response to component format
                const mappedMaterials = materialsData.map((item, index) => ({
                    id: item.id,
                    sno: index + 1,
                    fileName: item.material_name || item.file_name,
                    programName: item.program_name || 'N/A',
                    courseName: item.course_name || 'N/A',
                    subject: item.subject_name || 'N/A',
                    uploadedBy: item.uploaded_by || 'Admin',
                    uploadedDate: item.created_at ? new Date(item.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    fileUrl: item.file_path || item.file_url,
                    fileSize: item.file_size || 'N/A',
                    materialType: item.material_type
                }));
                setMaterials(mappedMaterials);
            } else if (response.success && response.data) {
                const mappedMaterials = response.data.map((item, index) => ({
                    id: item.id,
                    sno: index + 1,
                    fileName: item.material_name || item.file_name,
                    programName: item.program_name || 'N/A',
                    courseName: item.course_name || 'N/A',
                    subject: item.subject_name || 'N/A',
                    uploadedBy: item.uploaded_by || 'Admin',
                    uploadedDate: item.created_at ? new Date(item.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    fileUrl: item.file_path || item.file_url,
                    fileSize: item.file_size || 'N/A',
                    materialType: item.material_type
                }));
                setMaterials(mappedMaterials);
            } else {
                setMaterials([]);
            }
        } catch (error) {
            console.error('Error loading study materials:', error);
            setError('Failed to load study materials');
            setMaterials([]);
        } finally {
            setLoading(false);
        }
    };

    // Load programs from API
    const loadPrograms = async () => {
        try {
            setLoadingData(true);
            const response = await fetchPrograms();

            console.log('📋 Programs loaded:', response);

            if (response && Array.isArray(response)) {
                // Filter only active programs
                const activePrograms = response.filter(program => program.status === 'active');
                setPrograms(activePrograms);
            } else if (response.success && response.data) {
                // Filter only active programs
                const activePrograms = response.data.filter(program => program.status === 'active');
                setPrograms(activePrograms);
            }
        } catch (error) {
            console.error('Error loading programs:', error);
            // Set fallback data if API fails
            const fallbackPrograms = [
                { id: 'vc', program_name: 'VOCATIONAL COURSES', name: 'VOCATIONAL COURSES' },
                { id: 'uc', program_name: 'UNIVERSITY COURSES', name: 'UNIVERSITY COURSES' },
                { id: 'cc', program_name: 'Certificate Courses', name: 'Certificate Courses' },
                { id: 'pg', program_name: 'PG Courses', name: 'PG Courses' },
                { id: 'dc', program_name: 'Diploma Courses', name: 'Diploma Courses' }
            ];
            setPrograms(fallbackPrograms);
        } finally {
            setLoadingData(false);
        }
    };

    // Load courses for selected program
    const loadCourses = async (programId) => {
        try {
            console.log('📖 Loading courses for program:', programId);
            const response = await fetchCoursesByProgram(programId);

            console.log('📖 Courses loaded for program', programId, ':', response);

            if (response && Array.isArray(response)) {
                setCourses(prev => ({ ...prev, [programId]: response }));
            } else if (response.success && response.data) {
                setCourses(prev => ({ ...prev, [programId]: response.data }));
            }
        } catch (error) {
            console.error('Error loading courses for program:', programId, error);
            // Set fallback data for VOCATIONAL COURSES
            if (programId === 'vc' || programId === 'VOCATIONAL COURSES') {
                const fallbackCourses = [
                    { id: 'deet', course_name: 'DIPLOMA IN ELECTRICAL & ELECTRONICS TECHNOLOGY', name: 'DIPLOMA IN ELECTRICAL & ELECTRONICS TECHNOLOGY' },
                    { id: 'dme', course_name: 'DIPLOMA IN MECHANICAL ENGINEERING', name: 'DIPLOMA IN MECHANICAL ENGINEERING' },
                    { id: 'dce', course_name: 'DIPLOMA IN CIVIL ENGINEERING', name: 'DIPLOMA IN CIVIL ENGINEERING' }
                ];
                setCourses(prev => ({ ...prev, [programId]: fallbackCourses }));
            }
        }
    };

    // Load subjects for selected course
    const loadSubjects = async (courseId) => {
        try {
            console.log('📝 Loading subjects for course:', courseId);
            const response = await fetchSubjectsByCourse(courseId);

            console.log('📝 Subjects loaded for course', courseId, ':', response);

            if (response && Array.isArray(response)) {
                setSubjects(response);
            } else if (response.success && response.data) {
                setSubjects(response.data);
            }
        } catch (error) {
            console.error('Error loading subjects for course:', courseId, error);
            // Set fallback subjects
            const fallbackSubjects = [
                { id: 'be', subject_name: 'Basic Electronics', name: 'Basic Electronics' },
                { id: 'ct', subject_name: 'Circuit Theory', name: 'Circuit Theory' },
                { id: 'de', subject_name: 'Digital Electronics', name: 'Digital Electronics' },
                { id: 'pc', subject_name: 'Programming in C', name: 'Programming in C' },
                { id: 'ds', subject_name: 'Data Structures', name: 'Data Structures' },
                { id: 'dbms', subject_name: 'Database Management System', name: 'Database Management System' },
                { id: 'os', subject_name: 'Operating System', name: 'Operating System' },
                { id: 'cn', subject_name: 'Computer Networks', name: 'Computer Networks' },
                { id: 'mso', subject_name: 'MS Office', name: 'MS Office' },
                { id: 'wd', subject_name: 'Web Development', name: 'Web Development' }
            ];
            setSubjects(fallbackSubjects);
        }
    };

    useEffect(() => {
        loadMaterials();
        loadPrograms();
    }, []);

    // Load courses when program filter changes
    useEffect(() => {
        if (programFilter) {
            // Find the program object to get the ID
            const selectedProgram = programs.find(p =>
                (p.program_name || p.name) === programFilter || p.id === programFilter
            );
            console.log('📍 Program filter changed:', {
                programFilter,
                selectedProgram,
                programs
            });
            if (selectedProgram) {
                const programId = selectedProgram.id || selectedProgram.program_name || selectedProgram.name;
                console.log('📍 Loading courses for program ID:', programId);
                loadCourses(programId);
            }
        } else {
            setCourses({});
        }
        setCourseFilter('');
        setSubjectFilter('');
    }, [programFilter, programs]);

    // Load subjects when course filter changes
    useEffect(() => {
        if (courseFilter && programFilter) {
            // Find the course object to get the ID
            const programKey = programs.find(p =>
                (p.program_name || p.name) === programFilter || p.id === programFilter
            )?.id || programFilter;
            const selectedCourse = courses[programKey]?.find(c =>
                (c.course_name || c.name) === courseFilter || c.id === courseFilter
            );
            console.log('📍 Course filter changed:', {
                courseFilter,
                programKey,
                selectedCourse,
                availableCourses: courses[programKey]
            });
            if (selectedCourse) {
                const courseId = selectedCourse.id || selectedCourse.course_name || selectedCourse.name;
                console.log('📍 Loading subjects for course ID:', courseId);
                loadSubjects(courseId);
            }
        } else {
            setSubjects([]);
        }
        setSubjectFilter('');
    }, [courseFilter, courses, programFilter, programs]);

    // Filter materials
    const filteredMaterials = materials.filter(material => {
        const matchesSearch = material.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            material.subject.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesProgram = programFilter === '' ||
            material.programName === programFilter ||
            material.program_name === programFilter;
        const matchesCourse = courseFilter === '' ||
            material.courseName === courseFilter ||
            material.course_name === courseFilter;
        const matchesSubject = subjectFilter === '' ||
            material.subject === subjectFilter ||
            material.subject_name === subjectFilter;
        return matchesSearch && matchesProgram && matchesCourse && matchesSubject;
    });

    // Handle preview material
    const handlePreview = (material) => {
        setSelectedMaterial(material);
        setShowPreviewModal(true);
    };

    // Handle download material
    const handleDownload = async (material) => {
        try {
            if (material.fileUrl) {
                // If we have a direct file URL, open it
                window.open(material.fileUrl, '_blank');
            } else if (material.id) {
                // Use API to download if available
                try {
                    const response = await studyMaterialsAPI.downloadMaterial(material.id);
                    if (response.ok) {
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = material.fileName;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                        toast.success('Material downloaded successfully');
                    } else {
                        throw new Error('Download failed');
                    }
                } catch (apiError) {
                    console.error('API download failed:', apiError);
                    // Fallback to alert
                    toast.error('Download functionality not available');
                }
            } else {
                toast.error('No download link available for this material');
            }
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to download material');
        }
    };

    // Format date
    const formatDate = (dateString) => {
        return dateString ? new Date(dateString).toLocaleDateString() : 'N/A';
    };

    // Pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredMaterials.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage);

    return (
        <>
            <BranchLayout>
                <div className="min-h-screen bg-gray-50">
                    {/* Header */}
                    <div className="bg-white shadow-sm border-b border-gray-200">
                        <div className="px-6 py-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center space-x-3">
                                    <div className="bg-gradient-to-r from-orange-600 to-teal-600 text-white p-2 rounded-lg">
                                        <FaBook className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold text-gray-900">Study Materials</h1>
                                        <p className="text-gray-600">View and download study materials</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Search By PROGRAM :
                                </label>
                                <select
                                    value={programFilter}
                                    onChange={(e) => {
                                        setProgramFilter(e.target.value);
                                        setCourseFilter('');
                                        setSubjectFilter('');
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    disabled={loadingData}
                                >
                                    <option value="">--- SELECT Program ---</option>
                                    {programs.map(program => {
                                        const displayName = program.program_name || program.name || program;
                                        const value = typeof program === 'object' ? displayName : program;
                                        return (
                                            <option key={program.id || displayName} value={value}>
                                                {displayName}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    COURSES
                                </label>
                                <select
                                    value={courseFilter}
                                    onChange={(e) => {
                                        setCourseFilter(e.target.value);
                                        setSubjectFilter('');
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    disabled={!programFilter || loadingData}
                                >
                                    <option value="">--- SELECT COURSE ---</option>
                                    {programFilter && (() => {
                                        const programKey = programs.find(p =>
                                            (p.program_name || p.name) === programFilter || p.id === programFilter
                                        )?.id || programFilter;
                                        return courses[programKey]?.map(course => {
                                            const displayName = course.course_name || course.name || course;
                                            const value = typeof course === 'object' ? displayName : course;
                                            return (
                                                <option key={course.id || displayName} value={value}>
                                                    {displayName}
                                                </option>
                                            );
                                        }) || [];
                                    })()}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    SUBJECT
                                </label>
                                <select
                                    value={subjectFilter}
                                    onChange={(e) => setSubjectFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    disabled={!courseFilter || loadingData}
                                >
                                    <option value="">--- SELECT Subject ---</option>
                                    {subjects.map(subject => {
                                        const displayName = subject.subject_name || subject.name || subject;
                                        const value = typeof subject === 'object' ? displayName : subject;
                                        return (
                                            <option key={subject.id || displayName} value={value}>
                                                {displayName}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div className="flex items-end mt-2 lg:mt-0">
                                <div className="text-sm text-gray-600 w-full md:w-auto">
                                    Total: {filteredMaterials.length} materials
                                </div>
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
                            ) : filteredMaterials.length === 0 ? (
                                <div className="px-6 py-12 text-center text-gray-500">
                                    <FaBook className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                                    <p className="text-lg font-medium text-gray-900 mb-2">No study materials found</p>
                                    <p className="text-gray-600">No materials available for the selected filters.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="w-full table-auto">
                                            <thead className="bg-blue-900 text-white">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">
                                                        S.No.
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">
                                                        File
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">
                                                        Program Name
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">
                                                        Course Name
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">
                                                        SUBJECT
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">
                                                        Action
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {currentItems.map((material, index) => (
                                                    <tr key={material.id} className="hover:bg-gray-50 transition-colors duration-200">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {material.sno}.
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-900">
                                                            <div className="flex items-center space-x-2">
                                                                <FaFileAlt className="w-4 h-4 text-red-500" />
                                                                <span className="truncate max-w-xs">{material.fileName}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-900">
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                                                {material.programName}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-900">
                                                            <div className="max-w-xs">
                                                                <p className="font-medium truncate">{material.courseName}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-900">
                                                            {material.subject}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center space-x-2">
                                                                <button
                                                                    onClick={() => handleDownload(material)}
                                                                    className="p-2 text-white bg-blue-500 hover:bg-blue-600 rounded transition-colors"
                                                                    title="Download"
                                                                >
                                                                    <FaDownload className="w-4 h-4" />
                                                                </button>

                                                                <button
                                                                    onClick={() => handlePreview(material)}
                                                                    className="p-2 text-white bg-gray-600 hover:bg-gray-700 rounded transition-colors"
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
                                        {currentItems.map((material, index) => (
                                            <div key={material.id} className="p-4 bg-white border-b border-gray-200 last:border-b-0">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <span className="text-xs font-semibold text-gray-500">#{material.sno}</span>
                                                        <h3 className="text-lg font-bold text-gray-900 mt-1 line-clamp-1">
                                                            {material.fileName}
                                                        </h3>
                                                        <div className="mt-1 flex flex-wrap gap-2">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                                                {material.programName}
                                                            </span>
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                                {material.courseName}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 mb-4">
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <span className="font-medium mr-2">Subject:</span>
                                                        {material.subject}
                                                    </div>
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <FaFileAlt className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" />
                                                        <span className="truncate">{material.fileName}</span>
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                                    <button
                                                        onClick={() => handlePreview(material)}
                                                        className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                                                    >
                                                        <FaEye className="w-4 h-4 mr-1.5" />
                                                        Preview
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownload(material)}
                                                        className="flex items-center px-3 py-1.5 text-sm font-medium bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
                                                    >
                                                        <FaDownload className="w-4 h-4 mr-1.5" />
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
                                                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredMaterials.length)} of {filteredMaterials.length} materials
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
                    {showPreviewModal && selectedMaterial && (
                        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center p-4 z-50">
                            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-white/20">
                                <div className="px-6 py-4 border-b border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-semibold text-gray-900">Material Details</h3>
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
                                            <p className="text-lg text-gray-900">{selectedMaterial.programName}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-500 mb-1">Course</h4>
                                            <p className="text-lg text-gray-900">{selectedMaterial.courseName}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-500 mb-1">Subject</h4>
                                            <p className="text-lg text-gray-900">{selectedMaterial.subject}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-500 mb-1">File Name</h4>
                                            <p className="text-lg text-gray-900">{selectedMaterial.fileName}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-500 mb-1">File Size</h4>
                                            <p className="text-gray-900">{selectedMaterial.fileSize}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-500 mb-1">Uploaded By</h4>
                                            <p className="text-gray-900">{selectedMaterial.uploadedBy}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-500 mb-1">Uploaded Date</h4>
                                            <p className="text-gray-900">{formatDate(selectedMaterial.uploadedDate)}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
                                    <button
                                        onClick={() => handleDownload(selectedMaterial)}
                                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
                                    >
                                        <FaDownload className="w-4 h-4" />
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
            </BranchLayout>

            <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
            />
        </>
    );
};

export default BranchMaterial;
