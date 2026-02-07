import React, { useState, useEffect } from 'react';
import {
    FaSearch,
    FaArrowLeft,
    FaFileAlt,
    FaFilePdf,
    FaFileWord,
    FaFileVideo,
    FaDownload,
    FaBars,
    FaGraduationCap,
    FaBook,
    FaEye
} from 'react-icons/fa';
import SuperAdminSidebar from '../../superadmin/SuperAdminSidebar';
import { useLocation, useNavigate } from 'react-router-dom';

const SuperAdminStudyMaterials = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Sidebar state based on window width
    const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
    const [loading, setLoading] = useState(false);
    const [materials, setMaterials] = useState([]);

    // Filters State
    const [programs, setPrograms] = useState([]);
    const [courses, setCourses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [selectedProgram, setSelectedProgram] = useState('');
    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Handle screen resize to auto-hide sidebar
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) setSidebarOpen(false);
            else setSidebarOpen(true);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const queryParams = new URLSearchParams(location.search);
    const franchiseCode = queryParams.get('franchise_code');

    useEffect(() => {
        fetchPrograms();
        fetchCourses();
        fetchSubjects();
    }, [franchiseCode]);

    useEffect(() => {
        fetchMaterials();
    }, [franchiseCode, selectedProgram, selectedCourse, selectedSubject]);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('adminToken');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    };

    const fetchPrograms = async () => {
        try {
            let url = 'http://localhost:4000/api/branch-programs/programs';
            if (franchiseCode) url += `?franchise_code=${franchiseCode}`;
            const response = await fetch(url, { headers: getAuthHeaders() });
            if (response.ok) setPrograms(await response.json());
        } catch (error) { console.error("Error fetching programs:", error); }
    };

    const fetchCourses = async () => {
        try {
            let url = 'http://localhost:4000/api/branch-courses/courses';
            if (franchiseCode) url += `?franchise_code=${franchiseCode}`;
            if (selectedProgram) url += `&program_id=${selectedProgram}`;
            const response = await fetch(url, { headers: getAuthHeaders() });
            if (response.ok) setCourses(await response.json());
        } catch (error) { console.error("Error fetching courses:", error); }
    };

    const fetchSubjects = async () => {
        try {
            let url = 'http://localhost:4000/api/branch-subjects/subjects';
            if (franchiseCode) url += `?franchise_code=${franchiseCode}`;
            if (selectedProgram) url += `&program_id=${selectedProgram}`;
            if (selectedCourse) url += `&course_id=${selectedCourse}`;
            const response = await fetch(url, { headers: getAuthHeaders() });
            if (response.ok) setSubjects(await response.json());
        } catch (error) { console.error("Error fetching subjects:", error); }
    };

    useEffect(() => {
        if (selectedProgram) { fetchCourses(); fetchSubjects(); }
    }, [selectedProgram]);

    useEffect(() => {
        if (selectedCourse) fetchSubjects();
    }, [selectedCourse]);

    const fetchMaterials = async () => {
        setLoading(true);
        try {
            let url = 'http://localhost:4000/api/branch-study-materials/materials';
            const params = new URLSearchParams();
            if (franchiseCode) params.append('franchise_code', franchiseCode);
            if (selectedProgram) params.append('program_id', selectedProgram);
            if (selectedCourse) params.append('course_id', selectedCourse);
            if (selectedSubject) params.append('subject_id', selectedSubject);

            if (Array.from(params).length > 0) url += `?${params.toString()}`;

            const response = await fetch(url, { headers: getAuthHeaders() });
            if (response.ok) setMaterials(await response.json() || []);
            else setMaterials([]);
        } catch (error) { setMaterials([]); } 
        finally { setLoading(false); }
    };

    const handleDownload = async (material) => {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('adminToken');
            const response = await fetch(`http://localhost:4000/api/branch-study-materials/files/${material.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = material.material_name || 'material';
                a.click();
            } else { alert('Failed to download'); }
        } catch (error) { alert('Download error'); }
    };

    const handleView = async (material) => {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('adminToken');
            const response = await fetch(`http://localhost:4000/api/branch-study-materials/files/${material.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank');
            }
        } catch (error) { alert('View error'); }
    };

    const filteredMaterials = materials.filter(material =>
        material.material_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        material.subject_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getFileIcon = (format) => {
        const lowerFormat = format?.toLowerCase() || '';
        if (lowerFormat === 'pdf') return <FaFilePdf className="text-red-500" />;
        if (['doc', 'docx'].includes(lowerFormat)) return <FaFileWord className="text-blue-500" />;
        if (['mp4', 'avi', 'mov'].includes(lowerFormat)) return <FaFileVideo className="text-purple-500" />;
        return <FaFileAlt className="text-gray-500" />;
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return 'N/A';
        const kb = bytes / 1024;
        return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(2)} MB`;
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <SuperAdminSidebar
                isOpen={sidebarOpen}
                toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                activeMenuItem="Materials"
            />

            <div className={`flex-1 transition-all duration-300 min-w-0 ${sidebarOpen ? 'lg:ml-72' : 'ml-0'}`}>

                {/* Header */}
                <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-4 sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                            <FaBars size={20} />
                        </button>
                        <button onClick={() => navigate('/superadmin/materials/all')} className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
                            <FaArrowLeft size={18} />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate flex items-center gap-2">
                                <FaFileAlt className="text-orange-600 hidden sm:block" /> Study Materials
                            </h1>
                            <p className="text-[10px] sm:text-xs text-gray-500 truncate font-medium uppercase tracking-wider">
                                Management {franchiseCode ? `• Franchise: ${franchiseCode}` : '• System Wide'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-4 sm:p-6">
                    {/* Filters Container */}
                    <div className="mb-6 space-y-4">
                        <div className="relative max-w-xl">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search materials..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white shadow-sm outline-none text-sm"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <select value={selectedProgram} onChange={(e) => setSelectedProgram(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white text-sm outline-none">
                                <option value="">All Programs</option>
                                {programs.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.program_name}</option>)}
                            </select>
                            <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white text-sm outline-none">
                                <option value="">All Courses</option>
                                {courses.map(c => <option key={c.id || c._id} value={c.id || c._id}>{c.course_name}</option>)}
                            </select>
                            <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white text-sm outline-none">
                                <option value="">All Subjects</option>
                                {subjects.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.subject_name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Table View (Desktop) */}
                    <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-blue-900 text-white">
                                <tr>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider">S.No</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider">Material Name</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider">Context</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan="4" className="py-12 text-center text-gray-500">Loading materials...</td></tr>
                                ) : filteredMaterials.length === 0 ? (
                                    <tr><td colSpan="4" className="py-12 text-center text-gray-500 italic">No materials found.</td></tr>
                                ) : (
                                    filteredMaterials.map((mat, idx) => (
                                        <tr key={mat.id || mat._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-400">{idx + 1}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="text-xl">{getFileIcon(mat.file_format)}</div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900">{mat.material_name}</p>
                                                        <p className="text-[11px] text-gray-400 uppercase font-medium">{formatFileSize(mat.file_size)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-bold text-purple-600">{mat.program_name}</span>
                                                    <span className="text-[11px] text-gray-600 flex items-center gap-1"><FaGraduationCap /> {mat.course_name}</span>
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase">{mat.subject_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => handleDownload(mat)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"><FaDownload size={14} /></button>
                                                    <button onClick={() => handleView(mat)} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-800 hover:text-white transition-all"><FaEye size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Card View (Mobile/Tablet) */}
                    <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {loading ? (
                            <div className="col-span-full py-10 text-center text-gray-500 italic">Loading...</div>
                        ) : filteredMaterials.length === 0 ? (
                            <div className="col-span-full py-10 text-center text-gray-500 italic">No materials found.</div>
                        ) : (
                            filteredMaterials.map((mat) => (
                                <div key={mat.id || mat._id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="text-3xl shrink-0">{getFileIcon(mat.file_format)}</div>
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-bold text-gray-900 truncate">{mat.material_name}</h3>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase">{formatFileSize(mat.file_size)}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => handleDownload(mat)} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FaDownload size={14} /></button>
                                            <button onClick={() => handleView(mat)} className="p-2 bg-gray-100 text-gray-600 rounded-lg"><FaEye size={14} /></button>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 p-3 rounded-xl space-y-2">
                                        <div className="flex items-center gap-2 text-xs font-bold text-purple-600 truncate">
                                            <FaBook className="shrink-0" /> {mat.program_name}
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] text-gray-600 truncate">
                                            <FaGraduationCap className="shrink-0" /> {mat.course_name}
                                        </div>
                                        <div className="text-[10px] text-gray-400 font-bold uppercase border-t pt-1">
                                            Subject: {mat.subject_name}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="mt-6 flex items-center justify-between px-2 text-gray-500">
                        <span className="text-xs font-bold uppercase tracking-widest">Total: {filteredMaterials.length} Items</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminStudyMaterials;