import { useState, useEffect } from 'react';
import { FaBook, FaPlus, FaEdit, FaTrash, FaSearch, FaEye, FaDownload, FaFileAlt } from 'react-icons/fa';
import BranchLayout from '../BranchLayout';
import authService from '../../../services/authService';
import { studyMaterialsAPI } from '../../../api/studyMaterialsApi';
import {
    fetchPrograms,
    fetchCoursesByProgram,
    fetchSubjectsByCourse
} from '../../../api/syllabusApi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AdminMaterial = () => {
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [programFilter, setProgramFilter] = useState('');
    const [courseFilter, setCourseFilter] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Dynamic data from API
    const [programs, setPrograms] = useState([]);
    const [courses, setCourses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loadingData, setLoadingData] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [userBranch, setUserBranch] = useState(null);

    // Helper functions for name resolution
    const getProgramName = (programId) => {
        const program = programs.find(p =>
            String(p.id || p._id) === String(programId) ||
            String(p.program_id) === String(programId)
        );
        return program ? (program.program_name || program.name) : null;
    };

    const getCourseName = (courseId) => {
        const course = courses.find(c =>
            String(c.id || c._id) === String(courseId) ||
            String(c.course_id) === String(courseId)
        );
        return course ? (course.course_name || course.name) : null;
    };

    const getSubjectName = (subjectId) => {
        const subject = subjects.find(s =>
            String(s.id || s._id) === String(subjectId) ||
            String(s.subject_id) === String(subjectId)
        );
        return subject ? (subject.subject_name || subject.name) : null;
    };

    // Form state for study material creation/editing
    const [formData, setFormData] = useState({
        material_name: '',
        material_type: 'document',
        program_id: '',
        course_id: '',
        subject_id: '',
        batch_id: '',
        description: '',
        file_url: '',
        external_link: '',
        file_size: null,
        file_format: '',
        duration: '',
        tags: '',
        access_level: 'public',
        status: 'active',
        // UI specific fields
        program: '',
        course: '',
        subject: '',
        fileName: '',
        uploadType: 'file',
        fileInput: null,
        link: ''
    });

    // Get branch code for API calls
    const getBranchCode = () => {
        const branchCode = localStorage.getItem('branch_code') || localStorage.getItem('branchCode');
        if (!branchCode) {
            console.warn('Branch code not found in localStorage');
        }
        return branchCode;
    };

    // Load materials from API (exclude videos - they should show on VideoClass page)
    const loadMaterials = async (forceRefresh = false) => {
        try {
            setLoading(true);
            setError(null);

            if (forceRefresh) {
                console.log('🔄 Force refreshing study materials...');
            } else {
                console.log('Loading study materials...');
            }

            let allMaterials = [];

            // First, try to load actual uploaded study materials
            try {
                console.log('📥 Fetching uploaded study materials from /branch-study-materials/materials...');
                const materialsResponse = await studyMaterialsAPI.getStudyMaterials();
                console.log('📥 Study materials API response:', materialsResponse);

                if (materialsResponse && Array.isArray(materialsResponse)) {
                    console.log('📥 Found uploaded materials:', materialsResponse.length);

                    const uploadedMaterials = materialsResponse
                        .filter(m => {
                            // More comprehensive deletion filtering
                            const notDeleted = m.status !== 'deleted' && m.status !== 'inactive';
                            const notVideo = m.material_type !== 'video';
                            const hasValidId = m.id || m._id;
                            return notDeleted && notVideo && hasValidId;
                        })
                        .map(material => ({
                            id: material.id || material._id,
                            material_name: material.material_name || material.file_name || 'Unnamed Material',
                            material_type: material.material_type || 'document',
                            program_id: material.program_id,
                            program_name: material.program_name || 'Unknown Program',
                            course_id: material.course_id,
                            course_name: material.course_name || 'Unknown Course',
                            subject_id: material.subject_id,
                            subject_name: material.subject_name || 'N/A',
                            description: material.description || '',
                            file_url: material.file_url || material.file_path || null,
                            file_size: material.file_size ? `${Math.round(material.file_size / 1024)} KB` : null,
                            external_link: material.external_link || null,
                            created_at: material.created_at || new Date().toISOString(),
                            status: material.status || 'active',
                            source: 'study_materials'
                        }));

                    allMaterials = [...allMaterials, ...uploadedMaterials];
                }
            } catch (materialsError) {
                console.log('❌ Could not fetch study materials:', materialsError.message);
            }

            // Then, also load subjects as legacy materials
            try {
                console.log('Fetching subjects as materials...');
                const response = await studyMaterialsAPI.getSubjects();

                if (response && Array.isArray(response)) {
                    // Convert subjects to materials format, filtering out deleted ones
                    const allSubjects = response;

                    const activeSubjects = allSubjects.filter(subject => {
                        // Check if subject has valid data
                        if (!subject.id && !subject._id) return false;

                        // Check if subject name exists
                        if (!subject.subject_name || subject.subject_name.trim() === '') return false;

                        // Enhanced filtering for deleted/inactive subjects  
                        const status = subject.status ? subject.status.toLowerCase() : 'active';
                        const isNotDeleted = status !== 'deleted' && status !== 'inactive' && status !== 'removed';

                        // Also check if material was previously deleted via our deletion system
                        const isNotMarkedDeleted = !subject.is_deleted && !subject.deleted;

                        return isNotDeleted && isNotMarkedDeleted; // Show only if not deleted and not marked as deleted
                    });

                    const materialsFromSubjects = activeSubjects
                        .filter(subject => subject.id || subject._id) // Ensure valid ID exists
                        .map(subject => ({
                            id: subject.id || subject._id,
                            material_name: subject.subject_name || subject.name || 'Unnamed Subject',
                            material_type: 'document',
                            program_id: subject.program_id,
                            program_name: subject.program_name || 'Unknown Program',
                            course_id: subject.course_id,
                            course_name: subject.course_name || 'Unknown Course',
                            subject_id: subject.id || subject._id,
                            subject_name: subject.subject_name || subject.name || 'Unnamed Subject',
                            description: subject.description || '',
                            file_url: subject.syllabus_file || subject.file_url || subject.document_url || subject.attachment_url || null,
                            syllabus_file: subject.syllabus_file || null,
                            external_link: subject.external_link || null,
                            created_at: subject.created_at || new Date().toISOString(),
                            status: subject.status || 'active',
                            source: 'subjects'
                        }));

                    // Merge with uploaded materials (uploaded materials take priority)
                    allMaterials = [...allMaterials, ...materialsFromSubjects];
                }

                // Set all materials
                setMaterials(allMaterials);

                if (allMaterials.length === 0) {
                    setError(null);
                } else {
                    setError(null);
                }
            } catch (apiError) {
                console.error('Subjects API error:', apiError.message);
                if (allMaterials.length === 0) {
                    setError('No study materials found. Please add some subjects first.');
                    toast.info('No study materials available yet');
                }
            }
        } catch (error) {
            console.error('Error loading study materials:', error);
            setError('Failed to load study materials');
            toast.error('Failed to load study materials');
            setMaterials([]);
        } finally {
            setLoading(false);
        }
    };

    // Load programs from API
    const loadPrograms = async () => {
        try {
            setLoadingData(true);
            const authToken = localStorage.getItem('token') || localStorage.getItem('authToken');
            if (!authToken) {
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
        if (!programId) {
            setCourses([]);
            return;
        }

        try {
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

            if (!error.message.includes('Authentication') && !error.message.includes('login')) {
                console.warn('Failed to load courses for program:', programId, error.message);
            }
        } finally {
            setLoadingData(false);
        }
    };

    // Load subjects for a specific course
    const loadSubjects = async (courseId) => {
        if (!courseId) {
            setSubjects([]);
            return;
        }

        try {
            const authToken = localStorage.getItem('token') || localStorage.getItem('authToken');
            if (!authToken) {
                setSubjects([]);
                return;
            }

            setLoadingData(true);
            const subjectsData = await fetchSubjectsByCourse(courseId);
            setSubjects(subjectsData);
        } catch (error) {
            console.error('❌ Error loading subjects:', error);
            setSubjects([]);

            if (!error.message.includes('Authentication') && !error.message.includes('login')) {
                console.warn('Failed to load subjects for course:', courseId, error.message);
            }
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        const initializeData = async () => {
            try {
                const user = authService.getCurrentUser();
                setUserBranch(user?.branch || null);

                await Promise.all([
                    loadMaterials(),
                    loadPrograms()
                ]);
            } catch (error) {
                console.error('Error initializing data:', error);
            }
        };

        initializeData();
    }, []);

    // Filter materials
    const filteredMaterials = materials.filter(material => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = searchTerm === '' ||
            material.material_name?.toLowerCase().includes(searchLower) ||
            material.material_type?.toLowerCase().includes(searchLower) ||
            material.program_name?.toLowerCase().includes(searchLower) ||
            material.course_name?.toLowerCase().includes(searchLower) ||
            material.subject_name?.toLowerCase().includes(searchLower) ||
            material.description?.toLowerCase().includes(searchLower) ||
            material.tags?.toLowerCase().includes(searchLower);

        const matchesProgram = programFilter === '' ||
            material.program_name === programFilter ||
            material.program_id === programFilter;

        const matchesCourse = courseFilter === '' ||
            material.course_name === courseFilter ||
            material.course_id === courseFilter;

        const matchesSubject = subjectFilter === '' ||
            material.subject_name === subjectFilter ||
            material.subject_id === subjectFilter;

        const result = matchesSearch && matchesProgram && matchesCourse && matchesSubject;

        return result;
    });

    // Handle create new study material
    const handleCreate = () => {
        setFormData({
            material_name: '',
            material_type: 'document',
            program_id: '',
            course_id: '',
            subject_id: '',
            batch_id: '',
            description: '',
            file_url: '',
            external_link: '',
            file_size: null,
            file_format: '',
            duration: '',
            tags: '',
            access_level: 'public',
            status: 'active',
            // UI specific fields
            program: '',
            course: '',
            subject: '',
            fileName: '',
            uploadType: 'file',
            fileInput: null,
            link: ''
        });
        setSelectedMaterial(null);
        setShowModal(true);
    };

    // Handle edit study material with enhanced data loading
    const handleEdit = async (material) => {
        try {
            // Load courses for the selected program if not already loaded
            if (material.program_id && courses.length === 0) {
                await loadCourses(material.program_id);
            }

            // Load subjects for the selected course if not already loaded
            if (material.course_id && subjects.length === 0) {
                await loadSubjects(material.course_id);
            }

            // Populate form data with material information
            setFormData({
                material_name: material.material_name || '',
                material_type: material.material_type || 'document',
                program_id: material.program_id || '',
                course_id: material.course_id || '',
                subject_id: material.subject_id || material.id, // For subject-based materials
                batch_id: material.batch_id || '',
                description: material.description || '',
                file_url: material.file_url || '',
                external_link: material.external_link || '',
                file_size: material.file_size || null,
                file_format: material.file_format || '',
                duration: material.duration || '',
                tags: material.tags || '',
                access_level: material.access_level || 'public',
                status: material.status || 'active',
                // UI specific fields
                program: material.program_id || '',
                course: material.course_id || '',
                subject: material.subject_id || material.id,
                fileName: material.material_name || '',
                uploadType: material.external_link ? 'iframe' : 'file',
                fileInput: null,
                link: material.external_link || '',
                iframeCode: material.external_link || ''
            });

            setSelectedMaterial(material);
            setShowModal(true);
        } catch (error) {
            console.error('Error opening edit modal:', error);
            toast.error('Failed to open edit form. Please try again.');
        }
    };

    // Handle file change with enhanced validation
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file size (max 50MB)
            if (file.size > 50 * 1024 * 1024) {
                toast.error('File size should not exceed 50MB');
                e.target.value = '';
                return;
            }

            // Validate file type
            const allowedTypes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'text/plain',
                'image/jpeg',
                'image/png',
                'image/gif',
                'application/zip',
                'application/x-rar-compressed'
            ];

            if (!allowedTypes.includes(file.type)) {
                toast.error('Please upload a valid document file (PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, JPG, PNG, GIF, ZIP, RAR)');
                e.target.value = '';
                return;
            }

            setFormData(prev => ({
                ...prev,
                fileInput: file,
                fileName: file.name.split('.').slice(0, -1).join('.'), // Remove extension
                file_format: file.type,
                file_size: file.size
            }));

            toast.success(`File "${file.name}" selected successfully`);
        }
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);

            // Validate required fields
            if (!formData.program_id) {
                toast.error('Please select a program');
                setSubmitting(false);
                return;
            }
            if (!formData.course_id) {
                toast.error('Please select a course');
                setSubmitting(false);
                return;
            }

            if (formData.uploadType === 'file' && formData.fileInput) {
                // Handle file upload via FormData
                const uploadFormData = new FormData();
                uploadFormData.append('file', formData.fileInput);
                // Use correct field names that backend expects
                uploadFormData.append('material_name', formData.fileName);
                uploadFormData.append('program_id', formData.program_id || '');
                uploadFormData.append('course_id', formData.course_id || '');
                uploadFormData.append('subject_id', formData.subject_id || '');
                uploadFormData.append('description', formData.description || `Study material: ${formData.fileName}`);
                uploadFormData.append('tags', formData.tags || '');
                uploadFormData.append('access_level', formData.access_level || 'public');

                const response = await studyMaterialsAPI.createMaterialFromFormData(uploadFormData);

                if (response.id || response.success) {
                    toast.success('Study material uploaded successfully');
                } else {
                    throw new Error(response.message || 'File upload failed');
                }

            } else if (formData.uploadType === 'iframe' && formData.iframeCode) {
                // Handle iframe/external link
                const materialData = {
                    material_name: formData.fileName,
                    material_type: 'link',
                    program_id: formData.program_id,
                    course_id: formData.course_id,
                    subject_id: formData.subject_id || '',
                    description: formData.description || `Study material: ${formData.fileName}`,
                    external_link: formData.iframeCode,
                    tags: formData.tags || '',
                    access_level: formData.access_level || 'public',
                    status: 'active'
                };

                const response = await studyMaterialsAPI.createMaterial(materialData);
                if (response.id || response.success) {
                    toast.success('Study material created successfully');
                } else {
                    throw new Error(response.message || 'Failed to create study material');
                }
            } else if (selectedMaterial) {
                // Handle editing existing material without changing file
                const materialData = {
                    material_name: formData.fileName,
                    material_type: formData.material_type || 'document',
                    program_id: formData.program_id,
                    course_id: formData.course_id,
                    subject_id: formData.subject_id || '',
                    description: formData.description || `Study material: ${formData.fileName}`,
                    tags: formData.tags || '',
                    access_level: formData.access_level || 'public',
                    status: formData.status || 'active'
                };

                const response = await studyMaterialsAPI.updateMaterial(selectedMaterial.id, materialData);
                if (response.id || response.success) {
                    toast.success('Study material updated successfully');
                } else {
                    throw new Error(response.message || 'Failed to update study material');
                }
            } else {
                throw new Error('Please select a file or provide iframe code');
            }

            // Reload materials and close modal
            setTimeout(async () => {
                await loadMaterials(true); // Force refresh after save
            }, 1000); // Small delay to allow backend processing

            setShowModal(false);

            // Reset form
            setFormData({
                material_name: '',
                material_type: 'document',
                program_id: '',
                course_id: '',
                subject_id: '',
                batch_id: '',
                description: '',
                file_url: '',
                external_link: '',
                file_size: null,
                file_format: '',
                duration: '',
                tags: '',
                access_level: 'public',
                status: 'active',
                // UI specific fields
                program: '',
                course: '',
                subject: '',
                fileName: '',
                uploadType: 'file',
                fileInput: null,
                link: '',
                iframeCode: ''
            });
            setSelectedMaterial(null);

        } catch (error) {
            console.error('Error saving study material:', error);
            toast.error(error.message || 'Failed to save study material. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // Handle delete study material with enhanced confirmation
    const handleDelete = async (materialId, materialName, source = 'subjects') => {
        const confirmMessage = `Are you sure you want to delete "${materialName || 'this study material'}"?\n\nThis action cannot be undone.`;

        if (window.confirm(confirmMessage)) {
            try {
                // Determine API call based on source
                let deleteSuccess = false;
                let deletionErrors = [];

                // Try appropriate API based on source
                if (source === 'study_materials') {
                    try {
                        const response = await studyMaterialsAPI.deleteMaterial(materialId);
                        if (response && (response.success === true || response.success === 'true' || response.message?.includes('deleted') || response.message?.includes('success'))) {
                            deleteSuccess = true;
                        }
                    } catch (e) {
                        deletionErrors.push(e.message);
                    }
                } else {
                    // Try subjects first if it's from that source 
                    try {
                        const response = await studyMaterialsAPI.deleteSubject(materialId);
                        if (response && (response.success === true || response.success === 'true' || response.message?.includes('deleted') || response.message?.includes('success'))) {
                            deleteSuccess = true;
                        }
                    } catch (e) {
                        deletionErrors.push(e.message);
                    }
                }

                if (deleteSuccess) {
                    toast.success(`"${materialName || 'Study material'}" deleted successfully`);
                    await loadMaterials(true); // Force refresh
                } else {
                    // Try fallback (the other collection) if primary failed
                    if (source === 'study_materials') {
                        try {
                            const response = await studyMaterialsAPI.deleteSubject(materialId);
                            if (response && (response.success === true || response.success === 'true')) {
                                deleteSuccess = true;
                            }
                        } catch (e) { }
                    } else {
                        try {
                            const response = await studyMaterialsAPI.deleteMaterial(materialId);
                            if (response && (response.success === true || response.success === 'true')) {
                                deleteSuccess = true;
                            }
                        } catch (e) { }
                    }

                    if (deleteSuccess) {
                        toast.success(`"${materialName || 'Study material'}" deleted successfully`);
                        await loadMaterials(true);
                    } else {
                        throw new Error('Deletion failed in both collections');
                    }
                }

            } catch (error) {
                console.error('Unexpected error during deletion:', error);

                if (error.message.includes('404') || error.message.includes('not found')) {
                    toast.info('Material was already deleted or not found.');
                    await loadMaterials(true);
                } else {
                    toast.error('Failed to delete material. Please try again.');
                    await loadMaterials(true);
                }
            }
        }
    };

    // Handle preview material
    const handlePreview = (material) => {
        // Set the selected material with properly formatted data for preview
        const formattedMaterial = {
            ...material,
            programName: material.program_name || material.program || 'N/A',
            courseName: material.course_name || material.course || 'N/A',
            subject: material.subject_name || material.subject || 'N/A',
            fileName: material.material_name || 'N/A',
            fileSize: material.file_size ? `${Math.round(material.file_size / 1024)} KB` : 'N/A',
            uploadedBy: material.uploaded_by || material.created_by || 'System',
            uploadedDate: material.created_at || material.upload_date || new Date().toISOString(),
            description: material.description || 'No description available',
            status: material.status || 'active',
            material_type: material.material_type || 'document',
            file_format: material.file_format || material.material_type || 'document'
        };

        setSelectedMaterial(formattedMaterial);
        setShowPreviewModal(true);
    };

    // Handle download material with enhanced functionality
    const handleDownload = async (material) => {
        try {
            // Check if material has external link (for iframe/google drive links)
            if (material.external_link && material.external_link.trim()) {
                // If it's an iframe code, extract the actual URL
                let linkToOpen = material.external_link;

                // Check if it's iframe code and extract src URL
                if (material.external_link.includes('<iframe') || material.external_link.includes('iframe')) {
                    const srcMatch = material.external_link.match(/src=["']([^"']+)["']/);
                    if (srcMatch) {
                        linkToOpen = srcMatch[1];
                    }
                }

                window.open(linkToOpen, '_blank');
                toast.success('External content opened in new tab');
                return;
            }

            // For uploaded files, try API download method first
            if (material.id && (material.file_url || material.material_type === 'document')) {
                try {
                    const response = await studyMaterialsAPI.downloadMaterial(material.id);

                    if (response.ok) {
                        const data = await response.json();
                        if (data.file_url) {
                            // Create download using the file URL from API
                            const fileName = material.material_name || material.file_name || 'download';
                            const fileExtension = material.file_format ? `.${material.file_format}` : '';
                            const downloadName = fileName.includes('.') ? fileName : `${fileName}${fileExtension}`;

                            // Try to download via file serving endpoint
                            const fileResponse = await fetch(`http://localhost:4000/api/branch-study-materials/files/${material.id}`, {
                                method: 'GET',
                                headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('adminToken')}`,
                                },
                            });

                            if (fileResponse.ok) {
                                const blob = await fileResponse.blob();
                                const url = window.URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = downloadName;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                window.URL.revokeObjectURL(url);
                                toast.success('Download completed');
                                return;
                            } else {
                                // Fallback: try direct file URL access
                                const link = document.createElement('a');
                                link.href = data.file_url;
                                link.download = downloadName;
                                link.target = '_blank';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                toast.success('Download started');
                                return;
                            }
                        }
                    }
                } catch (apiError) {
                    console.log('API download failed:', apiError.message);
                }
            }

            // Try direct file URL download for legacy data
            if (material.file_url && material.file_url.trim()) {
                try {
                    // Check if file_url starts with http/https
                    let fileUrl = material.file_url;
                    if (!fileUrl.startsWith('http')) {
                        // Relative path, prepend base URL
                        fileUrl = `http://localhost:4000${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
                    }

                    const response = await fetch(fileUrl, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('authToken')}`,
                        }
                    });

                    if (response.ok) {
                        const blob = await response.blob();
                        const fileName = material.material_name || 'download';

                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = fileName;
                        link.target = '_blank';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);

                        toast.success('Download started');
                        return;
                    }
                } catch (fileError) {
                    console.log('Direct file download failed:', fileError);
                }
            }

            // Try syllabus file URL (for subjects converted to materials)
            if (material.syllabus_file) {
                try {
                    let syllabusUrl = material.syllabus_file;
                    if (!syllabusUrl.startsWith('http')) {
                        syllabusUrl = `http://localhost:4000${syllabusUrl.startsWith('/') ? '' : '/'}${syllabusUrl}`;
                    }

                    const response = await fetch(syllabusUrl, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('authToken')}`,
                        }
                    });

                    if (response.ok) {
                        const blob = await response.blob();
                        const fileName = `${material.material_name}_syllabus.pdf`;

                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = fileName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);

                        toast.success('Syllabus downloaded successfully');
                        return;
                    }
                } catch (syllabusError) {
                    console.log('Syllabus download failed:', syllabusError);
                }
            }

            // For subject-based materials without files, provide upload option
            if (!material.file_url && !material.external_link && !material.syllabus_file) {
                toast.info(
                    `"${material.material_name}" has no downloadable content yet. ` +
                    `Click to edit and upload files or add links to make it downloadable.`,
                    {
                        autoClose: 8000
                    }
                );
                return;
            }

            // Final fallback
            toast.error('Download not available. File may have been moved or deleted.');

        } catch (error) {
            console.error('Download error:', error);
            toast.error(`Download failed: ${error.message}`);
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
        <BranchLayout>
            <div className="p-6 bg-gray-50 min-h-screen">
                <div className="max-w-8xl mx-auto">
                    <div className="bg-white rounded-xl shadow-lg">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-center space-x-3 w-full md:w-auto">
                                    <div className="bg-gradient-to-r from-orange-600 to-teal-600 text-white p-3 rounded-lg flex-shrink-0">
                                        <FaBook className="text-xl" />
                                    </div>
                                    <div className="text-left">
                                        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Study Materials</h1>
                                        <p className="text-sm text-gray-600 line-clamp-1 md:line-clamp-none">Manage documents, PDFs and study materials</p>
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Search Materials
                                    </label>
                                    <div className="relative">
                                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search by file name, subject, program..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Search By PROGRAM :
                                    </label>
                                    <select
                                        value={programFilter}
                                        onChange={(e) => {
                                            setProgramFilter(e.target.value);
                                            setCourseFilter('');
                                            if (e.target.value) {
                                                loadCourses(e.target.value);
                                            }
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">--- SELECT Program ---</option>
                                        {programs.map(program => (
                                            <option key={program.id} value={program.id}>
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
                                            setCourseFilter(e.target.value);
                                            setSubjectFilter('');
                                            if (e.target.value) {
                                                loadSubjects(e.target.value);
                                            } else {
                                                setSubjects([]);
                                            }
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        disabled={!programFilter}
                                    >
                                        <option value="">--- SELECT COURSE ---</option>
                                        {courses.map(course => (
                                            <option key={course.id} value={course.id}>
                                                {course.course_name}
                                            </option>
                                        ))}
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
                                        disabled={!courseFilter}
                                    >
                                        <option value="">--- SELECT Subject ---</option>
                                        {subjects.map(subject => (
                                            <option key={subject.id} value={subject.id}>
                                                {subject.subject_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-end">
                                    <div className="text-sm text-gray-600">
                                        Total: {filteredMaterials.length} materials
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            {error && (
                                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <div className="flex items-center">
                                        <FaBook className="w-5 h-5 text-red-500 mr-2" />
                                        <p className="text-red-700">{error}</p>
                                        <button
                                            onClick={() => {
                                                setError(null);
                                                loadMaterials(true); // Force refresh on retry
                                            }}
                                            className="ml-auto px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                                        >
                                            Retry
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                {/* Mobile View (Cards) */}
                                <div className="md:hidden space-y-4">
                                    {loading ? (
                                        <div className="flex items-center justify-center h-48">
                                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                                        </div>
                                    ) : currentItems.length === 0 ? (
                                        <div className="p-8 text-center bg-white rounded-lg shadow text-gray-500">
                                            <FaBook className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                                            <p>No study materials found</p>
                                        </div>
                                    ) : (
                                        currentItems.map((material, index) => (
                                            <div key={material.id || index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 transition-all hover:shadow-md">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center space-x-3 overflow-hidden">
                                                        <div className="p-2.5 bg-blue-50 rounded-lg flex-shrink-0">
                                                            {(material.file_url || material.external_link || material.syllabus_file) ? (
                                                                <FaFileAlt className="text-red-500 text-lg" />
                                                            ) : (
                                                                <FaFileAlt className="text-gray-400 text-lg" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <h3 className="font-semibold text-gray-900 truncate" title={material.material_name}>
                                                                {material.material_name || 'Unnamed File'}
                                                            </h3>
                                                            <p className="text-xs text-gray-500">
                                                                {material.file_size || 'Size N/A'} • {formatDate(material.created_at)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 text-xs mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                    <div>
                                                        <span className="text-gray-400 block mb-0.5">Program</span>
                                                        <span className="font-medium text-gray-700 truncate block">
                                                            {material.program_name || material.program || 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400 block mb-0.5">Course</span>
                                                        <span className="font-medium text-gray-700 truncate block">
                                                            {material.course_name || material.course || 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-2 pt-1 border-t border-gray-200 mt-1">
                                                        <span className="text-gray-400 block mb-0.5">Subject</span>
                                                        <span className="font-medium text-gray-700 truncate block">
                                                            {material.subject_name || material.subject || 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 pt-2">
                                                    <button
                                                        onClick={() => handleDownload(material)}
                                                        disabled={!(material.file_url || material.external_link || material.syllabus_file)}
                                                        className={`flex-1 flex items-center justify-center py-2 px-3 rounded-lg text-sm font-medium transition-colors ${(material.file_url || material.external_link || material.syllabus_file)
                                                                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                            }`}
                                                    >
                                                        <FaDownload className="mr-2 text-xs" /> Download
                                                    </button>

                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handlePreview(material)}
                                                            className="p-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors shadow-sm"
                                                            title="Preview"
                                                        >
                                                            <FaEye className="text-sm" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleEdit(material)}
                                                            className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors shadow-sm"
                                                            title="Edit"
                                                        >
                                                            <FaEdit className="text-sm" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(material.id, material.material_name, material.source)}
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
                                                            <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                                                <FaBook className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                                                                <p className="text-lg font-medium text-gray-900 mb-2">No study materials found</p>
                                                                <p className="text-gray-600">Upload your first document or study material to get started.</p>
                                                                <p className="text-sm text-gray-500 mt-2">(Videos are managed on the Video Class page)</p>
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        currentItems.map((material, index) => (
                                                            <tr key={material.id || index} className="hover:bg-gray-50 transition-colors duration-200">
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                                    {indexOfFirstItem + index + 1}.
                                                                </td>
                                                                <td className="px-6 py-4 text-sm text-gray-900">
                                                                    <div className="flex items-center space-x-2">
                                                                        {(material.file_url || material.external_link || material.syllabus_file) ? (
                                                                            <>
                                                                                <FaFileAlt className="w-4 h-4 text-red-500" />
                                                                                <span className="truncate max-w-xs" title={material.material_name}>
                                                                                    {material.material_name || 'Unnamed File'}
                                                                                </span>
                                                                                {material.file_size && (
                                                                                    <span className="text-xs text-gray-500">({material.file_size})</span>
                                                                                )}
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <FaFileAlt className="w-4 h-4 text-gray-400" />
                                                                                <span className="truncate max-w-xs text-gray-500" title={material.material_name}>
                                                                                    {material.material_name || 'Unnamed'}
                                                                                </span>
                                                                                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">No File</span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-sm text-gray-900">
                                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                                                        {material.program_name || material.program || 'N/A'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-sm text-gray-900">
                                                                    <div className="max-w-xs">
                                                                        <p className="font-medium truncate" title={material.course_name || material.course}>
                                                                            {material.course_name || material.course || 'N/A'}
                                                                        </p>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-sm text-gray-900">
                                                                    {material.subject_name || material.subject || 'N/A'}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="flex items-center space-x-2">
                                                                        {/* Download Button */}
                                                                        <button
                                                                            onClick={() => handleDownload(material)}
                                                                            className={`p-2 text-white rounded transition-colors ${(material.file_url || material.external_link || material.syllabus_file)
                                                                                ? 'bg-blue-500 hover:bg-blue-600'
                                                                                : 'bg-gray-400 hover:bg-gray-500 cursor-not-allowed'
                                                                                }`}
                                                                            title={(material.file_url || material.external_link || material.syllabus_file) ? "Download" : "No file to download"}
                                                                            disabled={!(material.file_url || material.external_link || material.syllabus_file)}
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

                                                                        <button
                                                                            onClick={() => handleEdit(material)}
                                                                            className="p-2 text-white bg-gray-500 hover:bg-gray-600 rounded transition-colors"
                                                                            title="Edit"
                                                                        >
                                                                            <FaEdit className="w-4 h-4" />
                                                                        </button>

                                                                        <button
                                                                            onClick={() => handleDelete(material.id, material.material_name, material.source)}
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
                            </div>      {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="mt-4 bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                                    <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50">
                                        <div className="text-sm text-gray-700 text-center sm:text-left">
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
                        </div>


                    {/* Create/Edit Modal */}
                    {showModal && (
                        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center p-4 z-50">
                            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto border border-white/30 transform transition-all">
                                <form onSubmit={handleSubmit}>
                                    {/* Modal Header */}
                                    <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xl font-semibold text-gray-900">
                                                {selectedMaterial ? 'Edit Study Material' : 'Upload New Study Material'}
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

                                        {/* Program Selection */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                PROGRAM *
                                            </label>
                                            <select
                                                required
                                                value={formData.program_id}
                                                onChange={(e) => {
                                                    const programId = e.target.value;
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        program_id: programId,
                                                        course_id: '',
                                                        subject_id: ''
                                                    }));
                                                    if (programId) {
                                                        loadCourses(programId);
                                                    } else {
                                                        setCourses([]);
                                                        setSubjects([]);
                                                    }
                                                }}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                <option value="">--- SELECT ---</option>
                                                {programs.map((program) => (
                                                    <option key={program.id || program._id} value={program.id || program._id}>
                                                        {program.program_name || program.name}
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
                                                value={formData.course_id}
                                                onChange={(e) => {
                                                    setFormData(prev => ({ ...prev, course_id: e.target.value, subject_id: '' }));
                                                    if (e.target.value) {
                                                        loadSubjects(e.target.value);
                                                    } else {
                                                        setSubjects([]);
                                                    }
                                                }}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                disabled={!formData.program_id}
                                            >
                                                <option value="">--- SELECT COURSE ---</option>
                                                {courses.map((course) => (
                                                    <option key={course.id || course._id} value={course.id || course._id}>
                                                        {course.course_name || course.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Subject Selection */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Subject *
                                            </label>
                                            <select
                                                required
                                                value={formData.subject_id}
                                                onChange={(e) => setFormData(prev => ({ ...prev, subject_id: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                disabled={!formData.course_id}
                                            >
                                                <option value="">--- SELECT Subject ---</option>
                                                {subjects.map((subject) => (
                                                    <option key={subject.id || subject._id} value={subject.id || subject._id}>
                                                        {subject.subject_name || subject.name}
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
                                                placeholder="Enter file name"
                                            />
                                        </div>

                                        {/* Upload Type Selection */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                                Upload Method
                                            </label>
                                            <div className="flex space-x-6">
                                                <label className="flex items-center">
                                                    <input
                                                        type="radio"
                                                        name="uploadType"
                                                        value="file"
                                                        checked={formData.uploadType === 'file'}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, uploadType: e.target.value }))}
                                                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                                    />
                                                    <span className="ml-2 text-sm text-gray-900">Upload File</span>
                                                </label>
                                                <label className="flex items-center">
                                                    <input
                                                        type="radio"
                                                        name="uploadType"
                                                        value="iframe"
                                                        checked={formData.uploadType === 'iframe'}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, uploadType: e.target.value }))}
                                                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                                    />
                                                    <span className="ml-2 text-sm text-gray-900">Google Drive/Other Drive (iFrame Code)</span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Conditional Fields */}
                                        {formData.uploadType === 'iframe' ? (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    GOOGLE DRIVE/OTHER DRIVE * <br />
                                                    <span className="text-xs text-gray-500">IFRAME CODE</span>
                                                </label>
                                                <textarea
                                                    required={formData.uploadType === 'iframe'}
                                                    value={formData.iframeCode}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, iframeCode: e.target.value }))}
                                                    rows="4"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="Paste iframe code here"
                                                />
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    File *
                                                </label>
                                                <input
                                                    type="file"
                                                    required={formData.uploadType === 'file' && !selectedMaterial}
                                                    onChange={handleFileChange}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    accept=".pdf,.doc,.docx,.ppt,.pptx"
                                                />
                                                <p className="text-xs text-red-500 mt-1">Photo 550 * 346 Pixel</p>
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
                                            disabled={submitting}
                                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                        >
                                            {submitting ? 'Saving...' : (selectedMaterial ? 'Update Material' : 'Add New')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Preview Modal */}
                    {showPreviewModal && selectedMaterial && (
                        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center p-4 z-50">
                            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto border border-white/30 transform transition-all">
                                <div className="px-6 py-4 border-b border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-semibold text-gray-900">Material Preview</h3>
                                        <button
                                            onClick={() => setShowPreviewModal(false)}
                                            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>

                                <div className="px-6 py-4 space-y-6">
                                    {/* Material Info */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                                            <h4 className="text-sm font-medium text-gray-500 mb-1">File Format</h4>
                                            <p className="text-gray-900">{selectedMaterial.file_format?.toUpperCase() || 'N/A'}</p>
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

                                    {/* Description */}
                                    {selectedMaterial.description && (
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-500 mb-2">Description</h4>
                                            <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedMaterial.description}</p>
                                        </div>
                                    )}
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
            </div>
        </div>

            {/* Toast Container */ }
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
        </BranchLayout >
    );
};

export default AdminMaterial;
