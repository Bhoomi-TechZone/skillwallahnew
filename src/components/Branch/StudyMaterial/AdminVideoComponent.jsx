import { useState, useEffect } from 'react';
import { FaVideo, FaPlus, FaEdit, FaTrash, FaPlay, FaTimes } from 'react-icons/fa';
import BranchLayout from '../BranchLayout';
import { studyMaterialsAPI } from '../../../api/studyMaterialsApi';
import {
    fetchPrograms,
    fetchCoursesByProgram,
    fetchSubjectsByCourse
} from '../../../api/syllabusApi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AdminVideoComponent = () => {
    const [videos, setVideos] = useState([]);
    const [deletedVideoIds, setDeletedVideoIds] = useState(() => {
        // Load deleted video IDs from localStorage on component mount
        try {
            const saved = localStorage.getItem('deletedVideoIds');
            return saved ? new Set(JSON.parse(saved)) : new Set();
        } catch (error) {
            console.error('Error loading deleted video IDs from localStorage:', error);
            return new Set();
        }
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [programFilter, setProgramFilter] = useState('');
    const [courseFilter, setCourseFilter] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Dynamic data from API
    const [programs, setPrograms] = useState([]);
    const [courses, setCourses] = useState({});
    const [subjects, setSubjects] = useState({});
    const [loadingData, setLoadingData] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form state for material creation/editing
    const [formData, setFormData] = useState({
        material_name: '',
        material_type: 'video',
        program_id: '',
        course_id: '',
        subject_id: '',
        description: '',
        external_link: '',
        tags: '',
        access_level: 'public',
        status: 'active',
        // UI specific fields
        program: '',
        course: '',
        subject: '',
        fileName: '',
        videoCode: '',
        paperSetFile: '',
        questionPaperFile: ''
    });

    // Load video classes from API
    const loadVideos = async () => {
        try {
            setLoading(true);
            setError(null);

            console.log('🎥 Loading video classes...');
            // First try to get study materials with video type
            const response = await studyMaterialsAPI.getMaterials({
                material_type: 'video'
            });

            console.log('🎥 Video materials API Response:', response);

            let allVideos = [];

            if (response && Array.isArray(response)) {
                allVideos = response;
                console.log('✅ Got videos from direct array response');

            } else if (response && response.success && Array.isArray(response.data)) {
                allVideos = response.data;
                console.log('✅ Got videos from nested response');

            } else {
                // If no video materials found, try to get subjects and filter for video types
                console.log('📚 No video materials found, trying subjects API...');
                const subjectsResponse = await studyMaterialsAPI.getSubjects();

                if (subjectsResponse && Array.isArray(subjectsResponse)) {
                    // Filter subjects for video materials
                    const videoSubjects = subjectsResponse.filter(subject => {
                        if (!subject.id && !subject._id) return false;
                        if (!subject.subject_name || subject.subject_name.trim() === '') return false;

                        const isVideo = subject.subject_type === 'video' ||
                            subject.material_type === 'video' ||
                            (subject.video_url && subject.video_url.trim() !== '') ||
                            (subject.external_link && subject.external_link.trim() !== '') ||
                            (subject.description && subject.description.toLowerCase().includes('video')) ||
                            (subject.subject_name && subject.subject_name.toLowerCase().includes('video'));

                        return isVideo;
                    });

                    // Convert subjects to video format
                    allVideos = videoSubjects.map(subject => ({
                        id: subject.id || subject._id,
                        material_name: subject.subject_name || subject.name || 'Unnamed Video',
                        material_type: 'video',
                        program_id: subject.program_id,
                        program_name: subject.program_name || 'Unknown Program',
                        course_id: subject.course_id,
                        course_name: subject.course_name || 'Unknown Course',
                        subject_id: subject.id || subject._id,
                        subject_name: subject.subject_name || subject.name || 'Unnamed Video',
                        description: subject.description || '',
                        external_link: subject.video_url || subject.external_link || null,
                        created_at: subject.created_at || new Date().toISOString(),
                        status: subject.status || 'active'
                    }));

                    console.log('✅ Got videos from subjects conversion');
                } else {
                    console.log('No video data found');
                    allVideos = [];
                }
            }

            // Apply simple filtering: remove deleted videos
            const finalVideos = allVideos.filter(video => {
                const videoId = video.id || video._id;
                const isDeleted = deletedVideoIds.has(videoId);

                return !isDeleted;
            });

            setVideos(finalVideos);

        } catch (error) {
            console.error('Error loading video classes:', error);
            setError('Failed to load video classes');
            toast.error('Failed to load video classes');
            setVideos([]);
        } finally {
            setLoading(false);
        }
    };

    // Load programs from API
    const loadPrograms = async () => {
        try {
            setLoadingData(true);
            console.log('🔄 Loading programs...');

            const authToken = localStorage.getItem('token') || localStorage.getItem('authToken');
            if (!authToken) {
                console.log('No auth token, cannot load programs');
                setPrograms([]);
                return;
            }

            const programsData = await fetchPrograms();

            // Filter to only show active programs
            const activePrograms = programsData.filter(program =>
                program.status === 'active' || program.status === 'Active'
            );

            setPrograms(activePrograms);
        } catch (error) {
            console.error('❌ Error loading programs:', error);
            setPrograms([]);

            if (!error.message.includes('Authentication') && !error.message.includes('login')) {
                toast.error('Failed to load programs');
            }
        } finally {
            setLoadingData(false);
        }
    };

    // Load courses for a specific program
    const loadCourses = async (programId) => {
        try {
            if (!programId) {
                return;
            }

            // Check if courses are already loaded for this program
            if (courses[programId] && courses[programId].length > 0) {
                return;
            }

            const coursesData = await fetchCoursesByProgram(programId);

            if (coursesData && coursesData.length > 0) {
                setCourses(prev => ({
                    ...prev,
                    [programId]: coursesData
                }));
            } else {
                setCourses(prev => ({
                    ...prev,
                    [programId]: []
                }));
                toast.warning('No courses found for selected program. Please create courses first.');
            }
        } catch (error) {
            console.error('❌ Error loading courses:', error);
            toast.error('Failed to load courses: ' + error.message);
            setCourses(prev => ({
                ...prev,
                [programId]: []
            }));
        }
    };

    // Load subjects for a specific course
    const loadSubjects = async (courseId) => {
        try {
            const authToken = localStorage.getItem('token') || localStorage.getItem('authToken');
            if (!authToken) {
                return;
            }

            const subjectsData = await fetchSubjectsByCourse(courseId);

            setSubjects(prev => ({
                ...prev,
                [courseId]: subjectsData
            }));
        } catch (error) {
            console.error('❌ Error loading subjects:', error);
            toast.error('Failed to load subjects');
        }
    };

    useEffect(() => {
        const initializeData = async () => {
            await loadPrograms();
            await loadVideos();
        };

        initializeData();
    }, []);

    // Filter videos
    const filteredVideos = videos.filter(video => {
        const matchesProgram = programFilter === '' || video.program_name === programFilter;
        const matchesCourse = courseFilter === '' || video.course_name === courseFilter;
        const matchesSubject = subjectFilter === '' || video.subject_name === subjectFilter;
        return matchesProgram && matchesCourse && matchesSubject;
    });

    // Handle create new video class
    const handleCreate = () => {
        setFormData({
            material_name: '',
            material_type: 'video',
            program_id: '',
            course_id: '',
            subject_id: '',
            description: '',
            external_link: '',
            tags: '',
            access_level: 'public',
            status: 'active',
            // UI specific fields
            program: '',
            course: '',
            subject: '',
            fileName: '',
            videoCode: '',
            paperSetFile: '',
            questionPaperFile: ''
        });
        setSelectedVideo(null);
        setShowModal(true);
    };

    // Handle edit video class
    const handleEdit = (video) => {
        // Load courses for the selected program if not already loaded
        if (video.program_id && !courses[video.program_id]) {
            loadCourses(video.program_id);
        }
        // Load subjects for the selected course if not already loaded
        if (video.course_id && !subjects[video.course_id]) {
            loadSubjects(video.course_id);
        }

        // Extract video ID from external_link if it's a YouTube URL
        let videoCode = '';
        if (video.external_link) {
            const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
            const match = video.external_link.match(youtubeRegex);
            videoCode = match ? match[1] : video.external_link;
        }

        // Find the program name for the dropdown
        const selectedProgram = programs.find(p => p.id === video.program_id);
        const programName = selectedProgram ? selectedProgram.program_name : video.program_name || '';

        setFormData({
            material_name: video.material_name || '',
            material_type: video.material_type || 'video',
            program_id: video.program_id || '',
            course_id: video.course_id || '',
            subject_id: video.subject_id || '',
            description: video.description || '',
            external_link: video.external_link || '',
            tags: video.tags || '',
            access_level: video.access_level || 'public',
            status: video.status || 'active',
            // UI specific fields
            program: programName,
            course: video.course_id || '',
            subject: video.subject_id || '',
            fileName: video.material_name || '',
            videoCode: videoCode
        });
        setSelectedVideo(video);
        setShowModal(true);
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);

            // Create YouTube URL from video code
            let youtubeUrl = '';
            if (formData.videoCode) {
                // If it's already a full URL, use it; otherwise create YouTube URL
                if (formData.videoCode.includes('http')) {
                    youtubeUrl = formData.videoCode;
                } else {
                    youtubeUrl = `https://www.youtube.com/watch?v=${formData.videoCode}`;
                }
            }

            // Prepare material data
            const videoData = {
                material_name: formData.fileName || formData.material_name,
                material_type: formData.material_type,
                program_id: formData.program_id || (typeof formData.program === 'object' ? formData.program.id : formData.program),
                course_id: formData.course_id || (typeof formData.course === 'object' ? formData.course.id : formData.course),
                subject_id: formData.subject_id || (typeof formData.subject === 'object' ? formData.subject.id : formData.subject),
                description: formData.description || `Video class: ${formData.fileName}`,
                external_link: youtubeUrl,
                tags: formData.tags || 'video,class,education',
                access_level: formData.access_level || 'public',
                status: formData.status || 'active'
            };

            let response;
            if (selectedVideo) {
                // Update existing video class
                response = await studyMaterialsAPI.updateMaterial(selectedVideo.id, videoData);
                if (response.id || response.success) {
                    toast.success('Video class updated successfully');
                } else {
                    throw new Error(response.message || 'Failed to update video class');
                }
            } else {
                // Create new video class
                response = await studyMaterialsAPI.createMaterial(videoData);
                if (response.id || response.success) {
                    toast.success('Video class created successfully');
                } else {
                    throw new Error(response.message || 'Failed to create video class');
                }
            }

            await loadVideos();
            setShowModal(false);
            // Reset form
            setFormData({
                material_name: '',
                material_type: 'video',
                program_id: '',
                course_id: '',
                subject_id: '',
                description: '',
                external_link: '',
                tags: '',
                access_level: 'public',
                status: 'active',
                program: '',
                course: '',
                subject: '',
                fileName: '',
                videoCode: '',
                paperSetFile: '',
                questionPaperFile: ''
            });
        } catch (error) {
            console.error('Error saving video class:', error);
            toast.error(error.message || 'Failed to save video class. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // Handle delete video class
    const handleDelete = async (videoId) => {
        if (window.confirm('Are you sure you want to delete this video class?')) {
            try {
                // IMMEDIATELY remove from UI
                setVideos(currentVideos => {
                    const filteredVideos = currentVideos.filter(video => {
                        const id = video.id || video._id;
                        return id !== videoId;
                    });
                    return filteredVideos;
                });

                // Add to deleted set and save to localStorage
                setDeletedVideoIds(prev => {
                    const newDeletedIds = new Set([...prev, videoId]);

                    try {
                        localStorage.setItem('deletedVideoIds', JSON.stringify([...newDeletedIds]));
                    } catch (error) {
                        console.error('Error saving deleted video IDs to localStorage:', error);
                    }

                    return newDeletedIds;
                });

                toast.success('Video deleted from UI');

                // Try to delete from backend
                Promise.all([
                    studyMaterialsAPI.deleteMaterial(videoId).catch(e => console.log('Material delete:', e.message)),
                    studyMaterialsAPI.deleteSubject(videoId).catch(e => console.log('Subject delete:', e.message))
                ]).then(() => {
                    console.log('✅ Backend delete attempts completed');
                }).catch(() => {
                    console.log('⚠️ Backend delete had issues but UI already updated');
                });

            } catch (error) {
                console.error('Error in delete function:', error);
                toast.warning('Video removed from display');
            }
        }
    };

    // Helper function to convert YouTube URL to embed format
    const getYouTubeEmbedUrl = (url) => {
        if (!url) return '';

        // If it's already an embed URL, return as is
        if (url.includes('youtube.com/embed/')) {
            return url;
        }

        // Extract video ID from various YouTube URL formats
        let videoId = '';

        // Standard YouTube URL: https://www.youtube.com/watch?v=VIDEO_ID
        if (url.includes('youtube.com/watch?v=')) {
            videoId = url.split('watch?v=')[1].split('&')[0];
        }
        // Short YouTube URL: https://youtu.be/VIDEO_ID
        else if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1].split('?')[0];
        }
        // Mobile YouTube URL: https://m.youtube.com/watch?v=VIDEO_ID
        else if (url.includes('m.youtube.com/watch?v=')) {
            videoId = url.split('watch?v=')[1].split('&')[0];
        }
        // If it's just a video ID
        else if (url.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(url)) {
            videoId = url;
        }

        // Return embed URL if we found a video ID
        if (videoId) {
            return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0`;
        }

        return url; // Return original URL as fallback
    };

    // Handle preview video
    const handlePreview = (video) => {
        setSelectedVideo(video);
        setShowPreviewModal(true);
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
            <div className="p-6 bg-gray-50 min-h-screen">
                <div className="max-w-8xl mx-auto">
                    <div className="bg-white rounded-xl shadow-lg">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-center space-x-3 w-full md:w-auto">
                                    <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white p-3 rounded-lg flex-shrink-0">
                                        <FaVideo className="text-xl" />
                                    </div>
                                    <div className="text-left">
                                        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Video Classes</h1>
                                        <p className="text-sm text-gray-600 line-clamp-1 md:line-clamp-none">Manage videos, paper sets, and question papers</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleCreate}
                                    className="w-full md:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                >
                                    <FaPlus className="text-sm" />
                                    <span>Create New</span>
                                </button>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Search By PROGRAM :
                                    </label>
                                    <select
                                        value={programFilter}
                                        onChange={(e) => {
                                            const selectedProgramName = e.target.value;
                                            setProgramFilter(selectedProgramName);
                                            setCourseFilter('');
                                            setSubjectFilter('');

                                            const selectedProgram = programs.find(p => p.program_name === selectedProgramName);
                                            if (selectedProgram && !courses[selectedProgram.id]) {
                                                loadCourses(selectedProgram.id);
                                            }
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">--- SELECT Program ---</option>
                                        {programs.map(program => (
                                            <option key={program.id} value={program.program_name}>
                                                {program.program_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        COURSES
                                    </label>
                                    <select
                                        value={courseFilter}
                                        onChange={(e) => {
                                            const selectedCourseName = e.target.value;
                                            setCourseFilter(selectedCourseName);
                                            setSubjectFilter('');

                                            const selectedProgram = programs.find(p => p.program_name === programFilter);
                                            if (selectedProgram && courses[selectedProgram.id]) {
                                                const selectedCourse = courses[selectedProgram.id].find(c => c.course_name === selectedCourseName);
                                                if (selectedCourse && !subjects[selectedCourse.id]) {
                                                    loadSubjects(selectedCourse.id);
                                                }
                                            }
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        disabled={!programFilter}
                                    >
                                        <option value="">--- SELECT COURSE ---</option>
                                        {(() => {
                                            const selectedProgram = programs.find(p => p.program_name === programFilter);
                                            const programCourses = selectedProgram && courses[selectedProgram.id] ? courses[selectedProgram.id] : [];
                                            return programCourses.map(course => (
                                                <option key={course.id || course.course_name} value={course.course_name || course}>
                                                    {course.course_name || course}
                                                </option>
                                            ));
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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">--- SELECT Subject ---</option>
                                        {Object.values(subjects).flat().map((subject, index) => (
                                            <option key={subject.id || index} value={subject.subject_name || subject}>
                                                {subject.subject_name || subject}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-end">
                                    <div className="text-sm text-gray-600">
                                        Total: {filteredVideos.length} videos
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            {/* Mobile View (Cards) */}
                            <div className="md:hidden space-y-4">
                                {loading ? (
                                    <div className="flex items-center justify-center h-48">
                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                                    </div>
                                ) : currentItems.length === 0 ? (
                                    <div className="p-8 text-center bg-white rounded-lg shadow text-gray-500">
                                        <FaVideo className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                                        <p>No video classes found</p>
                                    </div>
                                ) : (
                                    currentItems.map((video, index) => (
                                        <div key={video.id || index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 transition-all hover:shadow-md">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center space-x-3 overflow-hidden">
                                                    <div className={`p-2.5 rounded-lg flex-shrink-0 ${video.material_type === 'video' ? 'bg-red-50 text-red-600' :
                                                            video.material_type === 'paper_set' ? 'bg-blue-50 text-blue-600' :
                                                                'bg-orange-50 text-orange-600'
                                                        }`}>
                                                        {video.material_type === 'video' ? <FaVideo className="text-lg" /> : <FaEdit className="text-lg" />}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="font-semibold text-gray-900 truncate" title={video.material_name}>
                                                            {video.material_name || 'Unnamed Video'}
                                                        </h3>
                                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium mt-1
                                                            ${video.material_type === 'video' ? 'bg-red-100 text-red-800' :
                                                                video.material_type === 'paper_set' ? 'bg-blue-100 text-blue-800' :
                                                                    'bg-orange-100 text-orange-800'}`}>
                                                            {video.material_type === 'video' ? 'Video Class' :
                                                                video.material_type === 'paper_set' ? 'Paper Set' :
                                                                    'Question Paper'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 text-xs mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                <div>
                                                    <span className="text-gray-400 block mb-0.5">Program</span>
                                                    <span className="font-medium text-gray-700 truncate block">
                                                        {video.program_name || 'N/A'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-400 block mb-0.5">Course</span>
                                                    <span className="font-medium text-gray-700 truncate block">
                                                        {video.course_name || 'N/A'}
                                                    </span>
                                                </div>
                                                <div className="col-span-2 pt-1 border-t border-gray-200 mt-1">
                                                    <span className="text-gray-400 block mb-0.5">Subject</span>
                                                    <span className="font-medium text-gray-700 truncate block">
                                                        {video.subject_name || 'N/A'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 pt-2">
                                                <button
                                                    onClick={() => handlePreview(video)}
                                                    className="flex-1 flex items-center justify-center py-2 px-3 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    <FaPlay className="mr-2 text-xs" /> Play
                                                </button>

                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleEdit(video)}
                                                        className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors shadow-sm"
                                                        title="Edit"
                                                    >
                                                        <FaEdit className="text-sm" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(video.id)}
                                                        className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors shadow-sm"
                                                        title="Delete"
                                                    >
                                                        <FaTrash className="text-sm" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden md:block bg-white rounded-lg shadow-md overflow-hidden">
                                {loading ? (
                                    <div className="flex items-center justify-center h-64">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full table-auto">
                                            <thead className="bg-blue-900 text-white">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">
                                                        S.No.
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">
                                                        Material Type
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
                                                {currentItems.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                                            <FaVideo className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                                                            <p className="text-lg font-medium text-gray-900 mb-2">No materials found</p>
                                                            <p className="text-gray-600">Upload your first material to get started.</p>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    currentItems.map((video, index) => (
                                                        <tr key={video.id} className="hover:bg-gray-50 transition-colors duration-200">
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                                {indexOfFirstItem + index + 1}.
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                                <div className="flex items-center space-x-2">
                                                                    {video.material_type === 'video' && <FaVideo className="w-5 h-5 text-red-600" />}
                                                                    {video.material_type === 'paper_set' && <FaEdit className="w-5 h-5 text-blue-600" />}
                                                                    {video.material_type === 'question_paper' && <FaEdit className="w-5 h-5 text-orange-600" />}
                                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium 
                                                                        ${video.material_type === 'video' ? 'bg-red-100 text-red-800' :
                                                                            video.material_type === 'paper_set' ? 'bg-blue-100 text-blue-800' :
                                                                                'bg-orange-100 text-orange-800'}`}>
                                                                        {video.material_type === 'video' ? 'Video Class' :
                                                                            video.material_type === 'paper_set' ? 'Paper Set' :
                                                                                'Question Paper'}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                                <div className="flex items-center space-x-2">
                                                                    {video.material_type === 'video' && <FaVideo className="w-5 h-5 text-red-600" />}
                                                                    <span className="truncate max-w-xs">{video.material_name}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                    {video.program_name || 'N/A'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                                <div className="max-w-xs">
                                                                    <p className="font-medium truncate">{video.course_name || 'N/A'}</p>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                                {video.subject_name || 'N/A'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="flex items-center space-x-2">
                                                                    <button
                                                                        onClick={() => handlePreview(video)}
                                                                        className="p-2 text-white bg-red-500 hover:bg-red-600 rounded transition-colors"
                                                                        title="Play Video"
                                                                    >
                                                                        <FaPlay className="w-4 h-4" />
                                                                    </button>

                                                                    <button
                                                                        onClick={() => handleEdit(video)}
                                                                        className="p-2 text-white bg-gray-500 hover:bg-gray-600 rounded transition-colors"
                                                                        title="Edit"
                                                                    >
                                                                        <FaEdit className="w-4 h-4" />
                                                                    </button>

                                                                    <button
                                                                        onClick={() => handleDelete(video.id)}
                                                                        className="p-2 text-white bg-gray-400 hover:bg-gray-500 rounded transition-colors"
                                                                        title="Delete"
                                                                    >
                                                                        <FaTrash className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="mt-4 bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                                    <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50">
                                        <div className="text-sm text-gray-700 text-center sm:text-left">
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
                        </div>

                        {/* Create/Edit Modal */}
                        {showModal && (
                            <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center p-4 z-50">
                                <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto border border-white/30">
                                    <form onSubmit={handleSubmit}>
                                        {/* Modal Header */}
                                        <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-xl font-semibold text-gray-900">
                                                    {selectedVideo ? 'Edit Video Class' : 'Upload New Video Class'}
                                                </h3>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowModal(false)}
                                                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        </div>

                                        {/* Modal Body */}
                                        <div className="px-6 py-4 space-y-6">
                                            <p className="text-sm text-red-600">* denotes required field</p>

                                            {/* Material Type Selection */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Material Type *
                                                </label>
                                                <select
                                                    required
                                                    value={formData.material_type}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, material_type: e.target.value }))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    <option value="video">Video Class</option>
                                                    <option value="paper_set">Paper Set</option>
                                                    <option value="question_paper">Question Paper</option>
                                                </select>
                                            </div>

                                            {/* Program Selection */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    PROGRAM *
                                                </label>
                                                <select
                                                    required
                                                    value={formData.program}
                                                    onChange={(e) => {
                                                        const selectedProgram = programs.find(p => (p.program_name || p) === e.target.value);
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            program: e.target.value,
                                                            program_id: selectedProgram?.id || e.target.value,
                                                            course: '',
                                                            course_id: '',
                                                            subject: '',
                                                            subject_id: ''
                                                        }));
                                                        if (selectedProgram?.id) {
                                                            loadCourses(selectedProgram.id);
                                                        }
                                                    }}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    <option value="">--- SELECT ---</option>
                                                    {programs.map((program) => (
                                                        <option key={program.id || program.program_name} value={program.program_name || program}>
                                                            {program.program_name || program}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Course Selection */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Courses *
                                                </label>
                                                <select
                                                    required
                                                    value={formData.course}
                                                    onChange={(e) => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            course: e.target.value,
                                                            course_id: e.target.value,
                                                            subject: '',
                                                            subject_id: ''
                                                        }));
                                                        if (e.target.value) {
                                                            loadSubjects(e.target.value);
                                                        } else {
                                                            setSubjects(prev => ({ ...prev, [e.target.value]: [] }));
                                                        }
                                                    }}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    disabled={!formData.program}
                                                >
                                                    <option value="">--- SELECT COURSE ---</option>
                                                    {(() => {
                                                        const selectedProgram = programs.find(p => p.program_name === formData.program);
                                                        const programCourses = selectedProgram && courses[selectedProgram.id] ? courses[selectedProgram.id] : [];
                                                        return programCourses.map((course) => (
                                                            <option key={course.id} value={course.id}>
                                                                {course.course_name}
                                                            </option>
                                                        ));
                                                    })()}
                                                </select>
                                            </div>

                                            {/* Subject Selection */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Subject *
                                                </label>
                                                <select
                                                    required
                                                    value={formData.subject}
                                                    onChange={(e) => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            subject: e.target.value,
                                                            subject_id: e.target.value
                                                        }));
                                                    }}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    disabled={!formData.course}
                                                >
                                                    <option value="">--- SELECT Subject ---</option>
                                                    {formData.course && subjects[formData.course] && subjects[formData.course].map((subject) => (
                                                        <option key={subject.id} value={subject.id}>
                                                            {subject.subject_name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* File Name */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    File Name *
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={formData.fileName}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, fileName: e.target.value }))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="Enter video title"
                                                />
                                            </div>

                                            {/* Video Code - Only for video type */}
                                            {formData.material_type === 'video' && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Video Code*
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={formData.videoCode}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, videoCode: e.target.value }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        placeholder="Enter YouTube video ID or embed code"
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Example: For https://www.youtube.com/watch?v=dQw4w9WgXcQ, enter: dQw4w9WgXcQ
                                                    </p>
                                                </div>
                                            )}

                                            {/* File Upload - For paper_set and question_paper */}
                                            {(formData.material_type === 'paper_set' || formData.material_type === 'question_paper') && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Upload {formData.material_type === 'paper_set' ? 'Paper Set' : 'Question Paper'} *
                                                    </label>
                                                    <input
                                                        type="file"
                                                        accept=".pdf,.doc,.docx"
                                                        required
                                                        onChange={(e) => {
                                                            const file = e.target.files[0];
                                                            if (file) {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    [formData.material_type === 'paper_set' ? 'paperSetFile' : 'questionPaperFile']: file,
                                                                    fileName: file.name
                                                                }));
                                                            }
                                                        }}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Supported formats: PDF, DOC, DOCX
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Modal Footer */}
                                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 sticky bottom-0">
                                            <button
                                                type="button"
                                                onClick={() => setShowModal(false)}
                                                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                            >
                                                {loading ? 'Saving...' : 'Add New'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* Video Preview Modal */}
                        {showPreviewModal && selectedVideo && (
                            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                                <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto">
                                    <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-red-500 to-pink-600">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-lg font-semibold text-white">
                                                    {selectedVideo.material_name || 'Video Class'}
                                                </h3>
                                                <p className="text-red-100 text-sm">
                                                    {selectedVideo.subject_name} - {selectedVideo.course_name}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setShowPreviewModal(false)}
                                                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                                            >
                                                <FaTimes className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-4">
                                        {/* Video Player */}
                                        <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4 shadow-lg">
                                            {selectedVideo.external_link ? (
                                                <iframe
                                                    width="100%"
                                                    height="100%"
                                                    src={getYouTubeEmbedUrl(selectedVideo.external_link)}
                                                    title={selectedVideo.material_name}
                                                    frameBorder="0"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                    allowFullScreen
                                                    className="w-full h-full"
                                                ></iframe>
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-white">
                                                    <div className="text-center">
                                                        <FaVideo className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                                        <p className="text-lg">Video not available</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Video Details */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-3">
                                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg">
                                                    <h4 className="text-xs font-medium text-blue-700 mb-1">Program</h4>
                                                    <p className="text-sm text-blue-900 font-semibold">{selectedVideo.program_name || 'N/A'}</p>
                                                </div>
                                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg">
                                                    <h4 className="text-xs font-medium text-green-700 mb-1">Course</h4>
                                                    <p className="text-sm text-green-900 font-semibold">{selectedVideo.course_name || 'N/A'}</p>
                                                </div>
                                                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg">
                                                    <h4 className="text-xs font-medium text-purple-700 mb-1">Subject</h4>
                                                    <p className="text-sm text-purple-900 font-semibold">{selectedVideo.subject_name || 'N/A'}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="bg-gradient-to-r from-orange-50 to-red-50 p-3 rounded-lg">
                                                    <h4 className="text-xs font-medium text-orange-700 mb-1">Video Title</h4>
                                                    <p className="text-sm text-orange-900 font-semibold">{selectedVideo.material_name || 'N/A'}</p>
                                                </div>
                                                <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-3 rounded-lg">
                                                    <h4 className="text-xs font-medium text-gray-700 mb-1">Created Date</h4>
                                                    <p className="text-sm text-gray-900 font-semibold">{formatDate(selectedVideo.created_at)}</p>
                                                </div>
                                                <div className="bg-gradient-to-r from-teal-50 to-cyan-50 p-3 rounded-lg">
                                                    <h4 className="text-xs font-medium text-teal-700 mb-1">Status</h4>
                                                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${selectedVideo.status === 'active'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800'
                                                        }`}>
                                                        {selectedVideo.status === 'active' ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        {selectedVideo.description && (
                                            <div className="mt-4">
                                                <h4 className="text-sm font-semibold text-gray-900 mb-2">Description</h4>
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <p className="text-sm text-gray-700">{selectedVideo.description}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Modal Footer */}
                                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                                        <button
                                            onClick={() => {
                                                setShowPreviewModal(false);
                                                handleEdit(selectedVideo);
                                            }}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                                        >
                                            <FaEdit className="w-4 h-4" />
                                            <span>Edit Video</span>
                                        </button>
                                        <button
                                            onClick={() => setShowPreviewModal(false)}
                                            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

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

export default AdminVideoComponent;
