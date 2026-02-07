import React, { useState, useEffect } from 'react';
import {
    FaSearch,
    FaArrowLeft,
    FaFileAlt,
    FaDownload,
    FaBars,
    FaGraduationCap,
    FaBookOpen,
    FaCalendarAlt
} from 'react-icons/fa';
import SuperAdminSidebar from '../../superadmin/SuperAdminSidebar';
import { useLocation, useNavigate } from 'react-router-dom';

const SuperAdminSyllabus = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
    const [loading, setLoading] = useState(false);
    const [syllabuses, setSyllabuses] = useState([]);

    const [programs, setPrograms] = useState([]);
    const [courses, setCourses] = useState([]);
    const [selectedProgram, setSelectedProgram] = useState('');
    const [selectedCourse, setSelectedCourse] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const queryParams = new URLSearchParams(location.search);
    const franchiseCode = queryParams.get('franchise_code');

    // Handle resize to auto-hide sidebar on mobile
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) setSidebarOpen(false);
            else setSidebarOpen(true);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        fetchPrograms();
        fetchCourses();
    }, [franchiseCode]);

    useEffect(() => {
        fetchSyllabuses();
    }, [franchiseCode, selectedProgram, selectedCourse]);

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

    useEffect(() => { if (selectedProgram) fetchCourses(); }, [selectedProgram]);

    const fetchSyllabuses = async () => {
        setLoading(true);
        try {
            let url = 'http://localhost:4000/api/syllabuses/';
            const params = new URLSearchParams();
            if (selectedProgram) params.append('program_id', selectedProgram);
            if (selectedCourse) params.append('course_id', selectedCourse);
            if (params.toString()) url += `?${params.toString()}`;

            const response = await fetch(url, { headers: getAuthHeaders() });
            if (response.ok) {
                const data = await response.json();
                setSyllabuses(data.syllabuses || []);
            } else { setSyllabuses([]); }
        } catch (error) { setSyllabuses([]); }
        finally { setLoading(false); }
    };

    const handleDownload = async (id, fileName) => {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('adminToken');
        try {
            const response = await fetch(`http://localhost:4000/api/syllabuses/${id}/download`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName || 'syllabus.pdf';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) { alert('Download failed'); }
    };

    const filteredSyllabuses = syllabuses.filter(syllabus =>
        syllabus.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        syllabus.subject_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <SuperAdminSidebar
                isOpen={sidebarOpen}
                toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                activeMenuItem="Materials"
            />

            <div className={`flex-1 transition-all duration-300 min-w-0 ${sidebarOpen ? 'lg:ml-72' : 'ml-0'}`}>
                
                {/* Responsive Header */}
                <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-4 sticky top-0 z-20">
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                            <FaBars size={18} />
                        </button>
                        <button onClick={() => navigate('/superadmin/materials/all')} className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
                            <FaArrowLeft size={18} />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate flex items-center gap-2">
                                <FaFileAlt className="text-purple-600 hidden sm:block" /> Syllabus Management
                            </h1>
                            <p className="text-[10px] sm:text-xs text-gray-500 truncate uppercase tracking-wider font-medium">
                                System Wide {franchiseCode ? `• Franchise: ${franchiseCode}` : ''}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-4 sm:p-6">
                    {/* Filters Bar - Grid based for responsiveness */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        <div className="relative">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search title or subject..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white text-sm outline-none"
                            />
                        </div>

                        <select
                            value={selectedProgram}
                            onChange={(e) => setSelectedProgram(e.target.value)}
                            className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white text-sm outline-none"
                        >
                            <option value="">All Programs</option>
                            {programs.map(prog => (
                                <option key={prog.id || prog._id} value={prog.id || prog._id}>{prog.program_name}</option>
                            ))}
                        </select>

                        <select
                            value={selectedCourse}
                            onChange={(e) => setSelectedCourse(e.target.value)}
                            className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white text-sm outline-none"
                        >
                            <option value="">{selectedProgram ? 'Select Course' : 'Select Program First'}</option>
                            {courses.map(course => (
                                <option key={course.id || course._id} value={course.id || course._id}>{course.course_name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">S.No</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Program/Course</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Subject</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Syllabus Title</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan="5" className="py-10 text-center text-gray-400">Loading...</td></tr>
                                ) : filteredSyllabuses.length === 0 ? (
                                    <tr><td colSpan="5" className="py-10 text-center text-gray-400">No syllabuses found.</td></tr>
                                ) : (
                                    filteredSyllabuses.map((syllabus, index) => (
                                        <tr key={syllabus.id || syllabus._id} className="hover:bg-purple-50/30 transition-colors">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-400">{index + 1}</td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-bold text-gray-900">{syllabus.program_name}</div>
                                                <div className="text-xs text-purple-600 font-medium">{syllabus.course_name}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 font-medium">{syllabus.subject_name}</td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-bold text-gray-900">{syllabus.title}</div>
                                                <div className="text-[11px] text-gray-400 italic truncate max-w-xs">{syllabus.file_name}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center">
                                                    <button 
                                                        onClick={() => handleDownload(syllabus.id, syllabus.file_name)}
                                                        className="p-2.5 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white transition-all shadow-sm"
                                                    >
                                                        <FaDownload size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile/Tablet Card View */}
                    <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {loading ? (
                            <div className="col-span-full py-10 text-center">Loading...</div>
                        ) : filteredSyllabuses.length === 0 ? (
                            <div className="col-span-full py-10 text-center">No syllabuses found.</div>
                        ) : (
                            filteredSyllabuses.map((syllabus, index) => (
                                <div key={syllabus.id || syllabus._id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded">S.No {index+1}</span>
                                            <span className="text-gray-400 text-[10px]"><FaCalendarAlt className="inline mr-1" />{formatDate(syllabus.uploaded_date)}</span>
                                        </div>
                                        <button 
                                            onClick={() => handleDownload(syllabus.id, syllabus.file_name)}
                                            className="p-2 rounded-lg bg-orange-50 text-orange-600"
                                        >
                                            <FaDownload size={14} />
                                        </button>
                                    </div>
                                    
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900 leading-tight">{syllabus.title}</h3>
                                        <p className="text-[11px] text-gray-500 truncate">{syllabus.file_name}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Program</p>
                                            <div className="flex items-center gap-1 text-[11px] font-bold text-purple-600">
                                                <FaGraduationCap size={10} /> {syllabus.program_name}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Subject</p>
                                            <div className="flex items-center gap-1 text-[11px] font-bold text-gray-700">
                                                <FaBookOpen size={10} /> {syllabus.subject_name}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="mt-6 flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200">
                        <div className="text-xs sm:text-sm text-gray-500">
                            Showing <span className="font-bold text-gray-900">{filteredSyllabuses.length}</span> results
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminSyllabus;