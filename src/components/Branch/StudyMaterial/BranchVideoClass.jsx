import { useState, useEffect } from 'react';
import { FaVideo, FaEye, FaYoutube, FaExternalLinkAlt } from 'react-icons/fa';
import BranchLayout from '../BranchLayout';
import { studyMaterialsAPI } from '../../../api/studyMaterialsApi';
import {
    fetchPrograms,
    fetchCoursesByProgram,
    fetchSubjectsByCourse
} from '../../../api/syllabusApi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const BranchVideoClass = () => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [programFilter, setProgramFilter] = useState('');
    const [courseFilter, setCourseFilter] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('');
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Dynamic data from API
    const [programs, setPrograms] = useState([]);
    const [courses, setCourses] = useState({});
    const [subjects, setSubjects] = useState([]);
    const [loadingData, setLoadingData] = useState(false);

    // Load videos from API
    const loadVideos = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get video study materials from API
            const response = await studyMaterialsAPI.getMaterials({
                material_type: 'video'
            });

            if (response && Array.isArray(response)) {
                // Map API response to component format
                const mappedVideos = response.map((item, index) => ({
                    id: item.id,
                    sno: index + 1,
                    fileName: item.material_name,
                    programName: item.program_name || 'N/A',
                    courseName: item.course_name || 'N/A',
                    subject: item.subject_name || 'N/A',
                    videoCode: extractVideoCode(item.external_link),
                    uploadedBy: item.uploaded_by || 'Admin',
                    uploadedDate: item.created_at ? new Date(item.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    external_link: item.external_link
                }));
                setVideos(mappedVideos);
            } else if (response.success && response.data) {
                const mappedVideos = response.data.map((item, index) => ({
                    id: item.id,
                    sno: index + 1,
                    fileName: item.material_name,
                    programName: item.program_name || 'N/A',
                    courseName: item.course_name || 'N/A',
                    subject: item.subject_name || 'N/A',
                    videoCode: extractVideoCode(item.external_link),
                    uploadedBy: item.uploaded_by || 'Admin',
                    uploadedDate: item.created_at ? new Date(item.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    external_link: item.external_link
                }));
                setVideos(mappedVideos);
            } else {
                setVideos([]);
            }
        } catch (error) {
            console.error('Error loading video classes:', error);
            setError('Failed to load video classes');
            setVideos([]);
        } finally {
            setLoading(false);
        }
    };

    // Load programs from API
    const loadPrograms = async () => {
        try {
            setLoadingData(true);
            const response = await fetchPrograms();

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
            // Set fallback data if API fails (only active programs)
            const fallbackPrograms = [
                { id: 'btc', program_name: 'B.TECH IN CIVIL', name: 'B.TECH IN CIVIL', status: 'active' },
                { id: 'uc', program_name: 'UNIVERSITY COURSES', name: 'UNIVERSITY COURSES', status: 'active' },
                { id: 'cc', program_name: 'Certificate Courses', name: 'Certificate Courses', status: 'active' },
                { id: 'pg', program_name: 'PG Courses', name: 'PG Courses', status: 'active' },
                { id: 'dc', program_name: 'Diploma Courses', name: 'Diploma Courses', status: 'active' }
            ];
            // Filter only active programs from fallback data
            const activePrograms = fallbackPrograms.filter(program => program.status === 'active');
            setPrograms(activePrograms);
        } finally {
            setLoadingData(false);
        }
    };

    // Load courses for selected program
    const loadCourses = async (programId) => {
        try {
            const response = await fetchCoursesByProgram(programId);

            if (response && Array.isArray(response)) {
                setCourses(prev => ({ ...prev, [programId]: response }));
            } else if (response.success && response.data) {
                setCourses(prev => ({ ...prev, [programId]: response.data }));
            }
        } catch (error) {
            console.error('Error loading courses for program:', programId, error);
            // Set fallback data for B.TECH IN CIVIL
            if (programId === 'btc' || programId === 'B.TECH IN CIVIL') {
                const fallbackCourses = [
                    { id: 'adca', course_name: 'ADVANCE DIPLOMA IN COMPUTER APPLICATION (ADCA)', name: 'ADVANCE DIPLOMA IN COMPUTER APPLICATION (ADCA)' },
                    { id: 'dce', course_name: 'DIPLOMA IN CIVIL ENGINEERING', name: 'DIPLOMA IN CIVIL ENGINEERING' },
                    { id: 'dme', course_name: 'DIPLOMA IN MECHANICAL ENGINEERING', name: 'DIPLOMA IN MECHANICAL ENGINEERING' }
                ];
                setCourses(prev => ({ ...prev, [programId]: fallbackCourses }));
            }
        }
    };

    // Load subjects for selected course
    const loadSubjects = async (courseId) => {
        try {
            const response = await fetchSubjectsByCourse(courseId);

            if (response && Array.isArray(response)) {
                setSubjects(response);
            } else if (response.success && response.data) {
                setSubjects(response.data);
            }
        } catch (error) {
            console.error('Error loading subjects for course:', courseId, error);
            // Set fallback subjects
            const fallbackSubjects = [
                { id: 'foc', subject_name: 'FUNDAMENTAL OF COMPUTER', name: 'FUNDAMENTAL OF COMPUTER' },
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

    // Extract video code from YouTube URL
    const extractVideoCode = (url) => {
        if (!url) return '';

        // If it's already just a video code
        if (url.length === 11 && !url.includes('/')) {
            return url;
        }

        // Extract from various YouTube URL formats
        const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/\S+\/|(?:v|e(?:mbed)?)?\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        const match = url.match(youtubeRegex);
        return match ? match[1] : url;
    };

    useEffect(() => {
        loadVideos();
        loadPrograms();
    }, []);

    // Load courses when program filter changes
    useEffect(() => {
        if (programFilter) {
            // Find the program object to get the ID
            const selectedProgram = programs.find(p =>
                (p.program_name || p.name) === programFilter || p.id === programFilter
            );
            if (selectedProgram) {
                loadCourses(selectedProgram.id || selectedProgram.program_name || selectedProgram.name);
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
            if (selectedCourse) {
                loadSubjects(selectedCourse.id || selectedCourse.course_name || selectedCourse.name);
            }
        } else {
            setSubjects([]);
        }
        setSubjectFilter('');
    }, [courseFilter, courses, programFilter, programs]);

    // Filter videos
    const filteredVideos = videos.filter(video => {
        const matchesProgram = programFilter === '' ||
            video.programName === programFilter ||
            video.program_name === programFilter;
        const matchesCourse = courseFilter === '' ||
            video.courseName === courseFilter ||
            video.course_name === courseFilter;
        const matchesSubject = subjectFilter === '' ||
            video.subject === subjectFilter ||
            video.subject_name === subjectFilter;
        return matchesProgram && matchesCourse && matchesSubject;
    });

    // Handle preview video
    const handlePreview = (video) => {
        setSelectedVideo(video);
        setShowPreviewModal(true);
    };

    // Handle watch on YouTube
    const handleWatchOnYouTube = (video) => {
        let youtubeUrl = '';

        if (video.external_link) {
            // If external_link is already a full URL, use it
            if (video.external_link.includes('http')) {
                youtubeUrl = video.external_link;
            } else {
                // If it's just a video ID, create YouTube URL
                youtubeUrl = `https://www.youtube.com/watch?v=${video.external_link}`;
            }
        } else if (video.videoCode) {
            youtubeUrl = `https://www.youtube.com/watch?v=${video.videoCode}`;
        }

        if (youtubeUrl) {
            window.open(youtubeUrl, '_blank');
        } else {
            toast.error('No video URL available');
        }
    };

    // Format date
    const formatDate = (dateString) => {
        return dateString ? new Date(dateString).toLocaleDateString() : 'N/A';
    };

    // Pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredVideos.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredVideos.length / itemsPerPage);

    return (
        <BranchLayout>
            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <div className="bg-white shadow-sm border-b border-gray-200">
                    <div className="px-6 py-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center space-x-3">
                                <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white p-2 rounded-lg">
                                    <FaVideo className="w-6 h-6" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">Video Classes</h1>
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
                                Total: {filteredVideos.length} videos
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
                        ) : filteredVideos.length === 0 ? (
                            <div className="px-6 py-12 text-center text-gray-500">
                                <FaVideo className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                                <p className="text-lg font-medium text-gray-900 mb-2">No video classes found</p>
                                <p className="text-gray-600">No videos available for the selected filters.</p>
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
                                            {currentItems.map((video, index) => (
                                                <tr key={video.id} className="hover:bg-gray-50 transition-colors duration-200">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {video.sno}.
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-900">
                                                        <div className="flex items-center space-x-2">
                                                            <FaYoutube className="w-5 h-5 text-red-600" />
                                                            <span className="truncate max-w-xs">{video.fileName}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-900">
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                            {video.programName}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-900">
                                                        <div className="max-w-xs">
                                                            <p className="font-medium truncate">{video.courseName}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-900">
                                                        {video.subject}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center space-x-2">
                                                            <button
                                                                onClick={() => handlePreview(video)}
                                                                className="p-2 text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
                                                                title="View Video"
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
                                    {currentItems.map((video, index) => (
                                        <div key={video.id} className="p-4 bg-white border-b border-gray-200 last:border-b-0">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <span className="text-xs font-semibold text-gray-500">#{video.sno}</span>
                                                    <h3 className="text-lg font-bold text-gray-900 mt-1 line-clamp-1">
                                                        {video.fileName}
                                                    </h3>
                                                    <div className="mt-1 flex flex-wrap gap-2">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                            {video.programName}
                                                        </span>
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                                            {video.courseName}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2 mb-4">
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <span className="font-medium mr-2">Subject:</span>
                                                    {video.subject}
                                                </div>
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <FaYoutube className="w-4 h-4 text-red-600 mr-2 flex-shrink-0" />
                                                    <span className="truncate">{video.fileName}</span>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                                <button
                                                    onClick={() => handlePreview(video)}
                                                    className="flex items-center text-sm font-medium text-green-600 hover:text-green-800"
                                                >
                                                    <FaEye className="w-4 h-4 mr-1.5" />
                                                    Watch Video
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
                                                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredVideos.length)} of {filteredVideos.length} videos
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
                {showPreviewModal && selectedVideo && (
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center p-4 z-50">
                        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-white/20">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-semibold text-gray-900">Video Details</h3>
                                    <button
                                        onClick={() => setShowPreviewModal(false)}
                                        className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>

                            <div className="px-6 py-4 space-y-6">
                                {/* Video Player */}
                                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        src={`https://www.youtube.com/embed/${selectedVideo.videoCode}`}
                                        title={selectedVideo.fileName}
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    ></iframe>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Program</h4>
                                        <p className="text-lg text-gray-900">{selectedVideo.programName}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Course</h4>
                                        <p className="text-lg text-gray-900">{selectedVideo.courseName}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Subject</h4>
                                        <p className="text-lg text-gray-900">{selectedVideo.subject}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Video Title</h4>
                                        <p className="text-lg text-gray-900">{selectedVideo.fileName}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Uploaded By</h4>
                                        <p className="text-gray-900">{selectedVideo.uploadedBy}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Uploaded Date</h4>
                                        <p className="text-gray-900">{formatDate(selectedVideo.uploadedDate)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
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

            {/* Toast Container for notifications */}
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
        </BranchLayout>
    );
};

export default BranchVideoClass;
