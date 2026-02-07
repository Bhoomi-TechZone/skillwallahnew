import { useState, useEffect } from 'react';
import { FaBook, FaPlus, FaEdit, FaTrash, FaSearch, FaEye, FaUpload, FaDownload, FaFileAlt } from 'react-icons/fa';
import BranchLayout from '../BranchLayout';
import {
    fetchSyllabuses,
    fetchPrograms,
    fetchCoursesByProgram,
    fetchSubjectsByCourse,
    createSyllabus,
    updateSyllabus,
    deleteSyllabus,
    uploadSyllabusFile,
    downloadSyllabus,
    getSyllabusDetails
} from '../../../api/syllabusApi';

const AdminSyllabus = () => {
    // Add error boundary
    const [componentError, setComponentError] = useState(null);

    // Original state variables
    const [syllabuses, setSyllabuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [programFilter, setProgramFilter] = useState('');
    const [courseFilter, setCourseFilter] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedSyllabus, setSelectedSyllabus] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Dynamic data from API
    const [programs, setPrograms] = useState([]);
    const [courses, setCourses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loadingData, setLoadingData] = useState(false);
    const [programsLoaded, setProgramsLoaded] = useState(false);

    // State variables
    const [formData, setFormData] = useState({
        program_id: '',
        course_id: '',
        subject_id: '',
        title: '',
        description: '',
        file: null,
        fileName: '',
        fileUrl: '',
        uploadType: 'file'
    });

    // Helper functions to resolve IDs to names
    const getProgramName = (programId) => {
        if (!programId) return null;
        const program = programs.find(p => (p.id || p._id) === programId);
        return program ? (program.program_name || program.name) : null;
    };

    const getCourseName = (courseId) => {
        if (!courseId) return null;
        const course = courses.find(c => (c.id || c._id) === courseId);
        return course ? (course.course_name || course.name) : null;
    };

    const getSubjectName = (subjectId) => {
        if (!subjectId) return null;
        const subject = subjects.find(s => (s.id || s._id) === subjectId);
        return subject ? (subject.subject_name || subject.name) : null;
    };

    // Enhanced syllabus enrichment function
    const enrichSyllabusData = (syllabusData) => {
        if (!syllabusData || !Array.isArray(syllabusData)) {
            console.warn('⚠️ Invalid syllabus data for enrichment:', syllabusData);
            return [];
        }

        if (programs.length === 0) {
            return syllabusData;
        }

        return syllabusData.map((syllabus, index) => {
            try {
                let programName = syllabus.program_name || getProgramName(syllabus.program_id);
                let courseName = syllabus.course_name || getCourseName(syllabus.course_id);
                let subjectName = syllabus.subject_name || getSubjectName(syllabus.subject_id);

                if (!programName && syllabus.program_id) programName = 'Unknown Program';
                if (!courseName && syllabus.course_id) courseName = 'Unknown Course';
                if (!subjectName && syllabus.subject_id) subjectName = 'Unknown Subject';

                return {
                    ...syllabus,
                    program_name: programName || 'Unknown Program',
                    course_name: courseName || 'Unknown Course',
                    subject_name: subjectName || 'Unknown Subject'
                };
            } catch (error) {
                console.error(`Error enriching syllabus at index ${index}:`, error);
                return {
                    ...syllabus,
                    program_name: syllabus.program_name || 'Unknown Program',
                    course_name: syllabus.course_name || 'Unknown Course',
                    subject_name: syllabus.subject_name || 'Unknown Subject'
                };
            }
        });
    };

    // Fetch and store branch code from API (Simplified to localStorage fallback)
    const fetchBranchCode = async () => {
        try {
            const existingBranchCode = localStorage.getItem('branch_code') || localStorage.getItem('branchCode');
            if (existingBranchCode) {
                return existingBranchCode;
            }

            try {
                const authToken = localStorage.getItem('token') || localStorage.getItem('authToken');
                if (authToken) {
                    const tokenParts = authToken.split('.');
                    if (tokenParts.length === 3) {
                        const payload = JSON.parse(atob(tokenParts[1]));
                        if (payload.branch_code || payload.branchCode) {
                            const branchCode = payload.branch_code || payload.branchCode;
                            localStorage.setItem('branch_code', branchCode);
                            localStorage.setItem('branchCode', branchCode);
                            return branchCode;
                        }
                    }
                }
            } catch (tokenError) {
                // Silent fallback
            }
            return null;
        } catch (error) {
            throw error;
        }
    };

    // Load programs from API
    const loadPrograms = async () => {
        try {
            setLoadingData(true);
            const programsData = await fetchPrograms();
            const activePrograms = (programsData || []).filter(program =>
                program.status === 'active' || program.status === 'Active'
            );
            setPrograms(activePrograms);
            setProgramsLoaded(true);
        } catch (error) {
            console.error('❌ Error loading programs:', error);
            setPrograms([]);
            setProgramsLoaded(false);
        } finally {
            setLoadingData(false);
        }
    };

    // Load courses by program
    const loadCoursesByProgram = async (programId) => {
        try {
            if (!programId) {
                setCourses([]);
                return;
            }
            const authToken = localStorage.getItem('token') || localStorage.getItem('authToken');
            if (!authToken) {
                setCourses([]);
                return;
            }
            setLoadingData(true);
            const coursesData = await fetchCoursesByProgram(programId);
            setCourses(coursesData);
        } catch (error) {
            console.error('❌ Error loading courses:', error);
            setCourses([]);
        } finally {
            setLoadingData(false);
        }
    };

    // Load subjects by course
    const loadSubjectsByCourse = async (courseId) => {
        try {
            if (!courseId) {
                setSubjects([]);
                return;
            }
            const authToken = localStorage.getItem('token') || localStorage.getItem('authToken');
            if (!authToken) {
                setSubjects([]);
                return;
            }
            setLoadingData(true);
            const subjectsData = await fetchSubjectsByCourse(courseId);
            if (Array.isArray(subjectsData) && subjectsData.length > 0) {
                setSubjects(subjectsData);
            } else {
                setSubjects([]);
            }
        } catch (error) {
            console.error('❌ Error loading subjects:', error);
            setSubjects([]);
        } finally {
            setLoadingData(false);
        }
    };

    // Load syllabuses from API
    const loadSyllabuses = async () => {
        try {
            setLoading(true);
            setError(null);

            const authToken = localStorage.getItem('token') || localStorage.getItem('authToken');
            if (!authToken) {
                setError('Please login to view syllabuses.');
                setSyllabuses([]);
                return;
            }

            const filters = {};
            if (programFilter) filters.program = programFilter;
            if (courseFilter) filters.course = courseFilter;
            if (subjectFilter) filters.subject = subjectFilter;
            if (searchTerm) filters.search = searchTerm;

            const syllabusesData = await fetchSyllabuses(filters);
            if (!syllabusesData || syllabusesData.length === 0) {
                setSyllabuses([]);
                return;
            }

            if (programs.length > 0) {
                const enrichedSyllabuses = enrichSyllabusData(syllabusesData);
                setSyllabuses(enrichedSyllabuses);
            } else {
                setSyllabuses(syllabusesData);
                try {
                    await loadPrograms();
                    setTimeout(() => {
                        const reEnrichedSyllabuses = enrichSyllabusData(syllabusesData);
                        setSyllabuses(reEnrichedSyllabuses);
                    }, 300);
                } catch (programError) {
                    console.warn('⚠️ Failed to load programs:', programError);
                }
            }
        } catch (error) {
            console.error('❌ Error loading syllabuses:', error);
            setError('Failed to load syllabuses. Please try again.');
            setSyllabuses([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        try {
            const initializeComponent = async () => {
                try {
                    await fetchBranchCode();
                } catch (branchError) {
                    console.warn('⚠️ Branch code fetch failed:', branchError.message);
                }
                await loadPrograms();
                await new Promise(resolve => setTimeout(resolve, 100));
                await loadSyllabuses();
            };
            initializeComponent();
        } catch (error) {
            console.error('❌ Component initialization error:', error);
            setComponentError(`Component failed to load: ${error.message}`);
        }
    }, []);

    useEffect(() => {
        if (syllabuses.length > 0 && programs.length > 0) {
            const enrichedSyllabuses = enrichSyllabusData(syllabuses);
            const hasChangedNames = enrichedSyllabuses.some((enriched, index) => {
                const current = syllabuses[index];
                if (!current) return false;
                return enriched.program_name !== current.program_name ||
                    enriched.course_name !== current.course_name ||
                    enriched.subject_name !== current.subject_name;
            });
            if (hasChangedNames) setSyllabuses(enrichedSyllabuses);
        }
    }, [programs, courses, subjects]);

    useEffect(() => {
        if (programFilter) {
            loadCoursesByProgram(programFilter);
        } else {
            setCourses([]);
        }
        setCourseFilter('');
        setSubjectFilter('');
        setSubjects([]);
    }, [programFilter]);

    useEffect(() => {
        if (courseFilter) {
            loadSubjectsByCourse(courseFilter);
        } else {
            setSubjects([]);
        }
        setSubjectFilter('');
    }, [courseFilter]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            loadSyllabuses();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchTerm, programFilter, courseFilter, subjectFilter]);

    const filteredSyllabuses = syllabuses.filter(syllabus => {
        const matchesSearch = searchTerm === '' ||
            syllabus.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            syllabus.subject_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            syllabus.program_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            syllabus.course_name?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    const handleCreate = () => {
        setFormData({
            program_id: '',
            course_id: '',
            subject_id: '',
            title: '',
            description: '',
            file: null,
            fileName: '',
            fileUrl: '',
            uploadType: 'file'
        });
        setSelectedSyllabus(null);
        setShowModal(true);
    };

    const handleEdit = async (syllabus) => {
        try {
            if (!syllabus || !syllabus.id) return;
            setLoading(true);
            setFormData({
                program_id: syllabus.program_id || '',
                course_id: syllabus.course_id || '',
                subject_id: syllabus.subject_id || '',
                title: syllabus.title || '',
                description: syllabus.description || '',
                file: null,
                fileName: syllabus.file_name || '',
                fileUrl: syllabus.file_url || '',
                uploadType: 'file'
            });
            try {
                if (syllabus.program_id && syllabus.program_id !== programFilter) {
                    await loadCoursesByProgram(syllabus.program_id);
                }
                if (syllabus.course_id && syllabus.course_id !== courseFilter) {
                    await loadSubjectsByCourse(syllabus.course_id);
                }
            } catch (loadError) {
                console.warn('⚠️ [Edit] Error loading related data:', loadError.message);
            }
            setSelectedSyllabus(syllabus);
            setShowModal(true);
        } catch (error) {
            console.error('❌ [Edit] Error opening edit modal:', error);
            alert(`Failed to open edit form: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        try {
            const file = e.target.files && e.target.files[0];
            if (!file) {
                setFormData(prev => ({ ...prev, file: null, fileName: '' }));
                return;
            }
            const allowedTypes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            ];
            if (!allowedTypes.includes(file.type)) {
                alert('⚠️ Please select a valid document file (PDF, DOC, DOCX, TXT, PPT, PPTX)');
                e.target.value = '';
                return;
            }
            if (file.size > 50 * 1024 * 1024) {
                alert('⚠️ File size must be less than 50MB');
                e.target.value = '';
                return;
            }
            setFormData(prev => ({ ...prev, file: file, fileName: file.name }));
        } catch (error) {
            console.error('❌ [File] Error handling file selection:', error);
            alert('Failed to process selected file. Please try again.');
            if (e.target) e.target.value = '';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const authToken = localStorage.getItem('token') || localStorage.getItem('authToken');
            let branchCode = localStorage.getItem('branch_code') || localStorage.getItem('branchCode');

            if (!authToken) {
                setError('Please login to create/update syllabuses.');
                return;
            }

            if (!branchCode) {
                try {
                    const tokenParts = authToken.split('.');
                    if (tokenParts.length === 3) {
                        const payload = JSON.parse(atob(tokenParts[1]));
                        branchCode = payload.branch_code || payload.branchCode;
                    }
                } catch (e) { }

                if (!branchCode) {
                    alert('Branch code required');
                    return;
                }
            }

            setLoading(true);
            let fileUploadData = null;
            if (formData.file && formData.file instanceof File) {
                fileUploadData = await uploadSyllabusFile(formData.file);
            }

            const syllabusData = {
                program_id: formData.program_id,
                course_id: formData.course_id,
                subject_id: formData.subject_id,
                title: formData.title,
                description: formData.description || '',
                file_name: fileUploadData?.file_name || formData.fileName || '',
                file_path: fileUploadData?.file_path || '',
                file_size: fileUploadData?.file_size || '',
                branch_code: branchCode,
                program_name: getProgramName(formData.program_id) || '',
                course_name: getCourseName(formData.course_id) || '',
                subject_name: getSubjectName(formData.subject_id) || ''
            };

            let result;
            if (selectedSyllabus) {
                result = await updateSyllabus(selectedSyllabus.id, syllabusData);
                if (result.status === 'success') alert('Syllabus updated successfully!');
            } else {
                result = await createSyllabus(syllabusData);
                if (result.status === 'success') alert('Syllabus created successfully!');
            }
            setShowModal(false);
            await loadSyllabuses();
        } catch (error) {
            console.error('Error saving syllabus:', error);
            alert('Failed to save syllabus. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (syllabusId, syllabusTitle) => {
        try {
            if (!syllabusId) return;
            if (!window.confirm(`Are you sure you want to delete "${syllabusTitle}"?`)) return;
            setLoading(true);
            await deleteSyllabus(syllabusId);
            alert('✅ Syllabus deleted successfully!');
            await loadSyllabuses();
        } catch (error) {
            console.error('❌ [Delete] Error deleting syllabus:', error);
            alert(`❌ Failed to delete syllabus: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handlePreview = async (syllabus) => {
        try {
            if (!syllabus || !syllabus.id) return;
            setLoading(true);
            try {
                const syllabusDetails = await getSyllabusDetails(syllabus.id);
                if (syllabusDetails) {
                    setSelectedSyllabus({ ...syllabus, ...syllabusDetails });
                } else {
                    setSelectedSyllabus(syllabus);
                }
            } catch (detailError) {
                setSelectedSyllabus(syllabus);
            }
            setShowPreviewModal(true);
        } catch (error) {
            console.error('❌ [Preview] Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (syllabus) => {
        try {
            if (!syllabus || !syllabus.id) return;
            setLoading(true);
            await downloadSyllabus(syllabus.id);
        } catch (error) {
            console.error('❌ [Download] Error:', error);
            alert(`❌ Download failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return dateString ? new Date(dateString).toLocaleDateString() : 'N/A';
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredSyllabuses.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredSyllabuses.length / itemsPerPage);

    return (
        <BranchLayout>
            {componentError ? (
                <div className="min-h-screen bg-red-50 flex items-center justify-center">
                    <div className="bg-white p-8 rounded-lg shadow-lg max-w-md mx-auto">
                        <div className="text-center">
                            <div className="text-red-500 text-6xl mb-4">⚠️</div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Component Failed to Load</h2>
                            <p className="text-gray-600 mb-6">{componentError}</p>
                            <button onClick={() => window.location.reload()} className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition">Reload Page</button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-6 bg-gray-50 min-h-screen">
                    <div className="max-w-8xl mx-auto">
                        <div className="bg-white rounded-xl shadow-lg">
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-gray-200">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                        <FaBook className="text-amber-500" />
                                        Syllabus Management
                                        <span className="hidden sm:inline"> • System Wide</span>
                                    </h2>
                                    <button onClick={handleCreate} className="w-full md:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-6 py-2.5 rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all shadow-md">
                                        <FaPlus /> Upload Syllabus
                                    </button>
                                </div>
                            </div>
                            {/* Filters */}
                            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                    <div className="relative">
                                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input type="text" placeholder="Search syllabus..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
                                    </div>
                                    <select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent">
                                        <option value="">All Programs</option>
                                        {programs.map(prog => (
                                            <option key={prog.id || prog._id} value={prog.id || prog._id}>{prog.program_name || prog.name}</option>
                                        ))}
                                    </select>
                                    <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent" disabled={!programFilter}>
                                        <option value="">All Courses</option>
                                        {courses.map(course => (
                                            <option key={course.id || course._id} value={course.id || course._id}>{course.course_name || course.name}</option>
                                        ))}
                                    </select>
                                    <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent" disabled={!courseFilter}>
                                        <option value="">All Subjects</option>
                                        {subjects.map(subject => (
                                            <option key={subject.id || subject._id} value={subject.id || subject._id}>{subject.subject_name || subject.name}</option>
                                        ))}
                                    </select>
                                    <div className="flex items-center justify-center bg-white px-4 py-2 border border-gray-300 rounded-lg text-gray-600 font-medium">
                                        Total: {filteredSyllabuses.length}
                                    </div>
                                </div>
                            </div>
                            {/* Main Content */}
                            <div className="p-4 md:p-6">
                                {error && (
                                    <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-center justify-between">
                                        <div className="flex items-center">
                                            <p className="text-sm text-red-700">{error}</p>
                                        </div>
                                        <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">✕</button>
                                    </div>
                                )}
                                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="w-full table-auto">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Title</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Program/Course</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Subject</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">File</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {loading ? (
                                                    <tr><td colSpan="6" className="px-6 py-4 text-center">Loading...</td></tr>
                                                ) : currentItems.length === 0 ? (
                                                    <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">No syllabuses found</td></tr>
                                                ) : (
                                                    currentItems.map((syllabus) => (
                                                        <tr key={syllabus.id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="flex items-center">
                                                                    <div className="flex-shrink-0 h-10 w-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600"><FaFileAlt /></div>
                                                                    <div className="ml-4">
                                                                        <div className="text-sm font-medium text-gray-900">{syllabus.title}</div>
                                                                        <div className="text-xs text-gray-500 truncate max-w-xs">{syllabus.description}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm text-gray-900">{syllabus.program_name}</div>
                                                                <div className="text-xs text-gray-500">{syllabus.course_name}</div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">{syllabus.subject_name}</span></td>
                                                            <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-500 flex items-center gap-1"><FaFileAlt className="text-gray-400" /><span className="truncate max-w-[150px]" title={syllabus.file_name}>{syllabus.file_name || 'No file'}</span></div></td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(syllabus.created_at)}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <button onClick={() => handlePreview(syllabus)} className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded"><FaEye /></button>
                                                                    <button onClick={() => handleDownload(syllabus)} className="text-green-600 hover:text-green-900 p-1 hover:bg-green-50 rounded"><FaDownload /></button>
                                                                    <button onClick={() => handleEdit(syllabus)} className="text-amber-600 hover:text-amber-900 p-1 hover:bg-amber-50 rounded"><FaEdit /></button>
                                                                    <button onClick={() => handleDelete(syllabus.id, syllabus.title)} className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"><FaTrash /></button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="md:hidden">
                                        {currentItems.map((syllabus) => (
                                            <div key={syllabus.id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 mb-4">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600"><FaFileAlt size={18} /></div>
                                                        <div><h3 className="font-semibold text-gray-900 line-clamp-1">{syllabus.title}</h3><span className="text-xs text-gray-500">{formatDate(syllabus.created_at)}</span></div>
                                                    </div>
                                                </div>
                                                <div className="space-y-2 text-sm text-gray-600 mb-4">
                                                    <div className="flex justify-between"><span className="text-gray-500">Program:</span><span className="font-medium text-right">{syllabus.program_name}</span></div>
                                                    <div className="flex justify-between"><span className="text-gray-500">Course:</span><span className="font-medium text-right">{syllabus.course_name}</span></div>
                                                    <div className="flex justify-between"><span className="text-gray-500">Subject:</span><span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">{syllabus.subject_name}</span></div>
                                                </div>
                                                <div className="flex gap-2 pt-3 border-t border-gray-100">
                                                    <button onClick={() => handleEdit(syllabus)} className="flex-1 py-2 text-amber-600 bg-amber-50 rounded-lg text-sm font-medium flex items-center justify-center gap-2"><FaEdit /> Edit</button>
                                                    <button onClick={() => handleDelete(syllabus.id, syllabus.title)} className="flex-1 py-2 text-red-600 bg-red-50 rounded-lg text-sm font-medium flex items-center justify-center gap-2"><FaTrash /> Delete</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {totalPages > 1 && (
                                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                                <div className="text-sm text-gray-700">Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredSyllabuses.length)} of {filteredSyllabuses.length}</div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 border rounded-lg text-sm font-medium">Previous</button>
                                                    <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-4 py-2 border rounded-lg text-sm font-medium">Next</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {showModal && (
                                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                                        <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 flex items-center justify-between">
                                            <h3 className="text-xl font-bold text-white">{selectedSyllabus ? 'Edit Syllabus' : 'Upload Syllabus'}</h3>
                                            <button onClick={() => setShowModal(false)} className="text-white hover:bg-white/20 p-2 rounded-lg">✕</button>
                                        </div>
                                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Program</label><select required value={formData.program_id} onChange={(e) => { setFormData(prev => ({ ...prev, program_id: e.target.value, course_id: '', subject_id: '' })); loadCoursesByProgram(e.target.value); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg"><option value="">Select</option>{programs.map(p => <option key={p.id} value={p.id}>{p.program_name}</option>)}</select></div>
                                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Course</label><select required value={formData.course_id} onChange={(e) => { setFormData(prev => ({ ...prev, course_id: e.target.value, subject_id: '' })); loadSubjectsByCourse(e.target.value); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg" disabled={!formData.program_id}><option value="">Select</option>{courses.map(c => <option key={c.id} value={c.id}>{c.course_name}</option>)}</select></div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Subject</label><select required value={formData.subject_id} onChange={(e) => setFormData(prev => ({ ...prev, subject_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" disabled={!formData.course_id}><option value="">Select</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}</select></div>
                                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Title</label><input type="text" required value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                                            </div>
                                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea rows="3" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                                            <div><label className="block text-sm font-medium text-gray-700 mb-1">File</label><input type="file" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100" /></div>
                                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancel</button>
                                                <button type="submit" disabled={loading} className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600">{loading ? 'Saving...' : 'Save'}</button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}
                            {showPreviewModal && selectedSyllabus && (
                                <div className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center p-4 z-50">
                                    <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-white/30">
                                        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-6 rounded-t-xl sticky top-0 z-10 flex justify-between">
                                            <h2 className="text-2xl font-bold">{selectedSyllabus.title}</h2>
                                            <button onClick={() => setShowPreviewModal(false)} className="text-white">✕</button>
                                        </div>
                                        <div className="p-8 space-y-8">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="bg-gray-50 p-4 rounded-xl"><p className="text-sm text-gray-500">Program</p><p className="font-semibold">{selectedSyllabus.program_name}</p></div>
                                                <div className="bg-gray-50 p-4 rounded-xl"><p className="text-sm text-gray-500">Course</p><p className="font-semibold">{selectedSyllabus.course_name}</p></div>
                                            </div>
                                            {selectedSyllabus.file_name && (
                                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 flex justify-between items-center">
                                                    <div className="flex items-center gap-3"><FaFileAlt className="text-red-500" /><span className="font-medium text-gray-900">{selectedSyllabus.file_name}</span></div>
                                                    <button onClick={() => handleDownload(selectedSyllabus)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Download</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </BranchLayout>
    );
};

export default AdminSyllabus;
