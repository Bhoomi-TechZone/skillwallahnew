import React, { useState, useEffect } from 'react';
import {
    FaSearch,
    FaBookOpen,
    FaArrowLeft,
    FaBook,
    FaBars,
    FaGraduationCap,
    FaLayerGroup
} from 'react-icons/fa';
import { MdClass } from 'react-icons/md';
import SuperAdminSidebar from '../../superadmin/SuperAdminSidebar';
import { useLocation, useNavigate } from 'react-router-dom';

const SuperAdminSubjects = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Sidebar state logic for responsiveness
    const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
    const [loading, setLoading] = useState(false);
    const [subjects, setSubjects] = useState([]);

    // Filters State
    const [programs, setPrograms] = useState([]);
    const [courses, setCourses] = useState([]);
    const [selectedProgram, setSelectedProgram] = useState('');
    const [selectedCourse, setSelectedCourse] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const queryParams = new URLSearchParams(location.search);
    const franchiseCode = queryParams.get('franchise_code');

    // Handle auto-closing sidebar on mobile resize
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
        fetchSubjects();
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

    const fetchSubjects = async () => {
        setLoading(true);
        try {
            let url = 'http://localhost:4000/api/branch-subjects/subjects';
            const params = new URLSearchParams();
            if (franchiseCode) params.append('franchise_code', franchiseCode);
            if (selectedProgram) params.append('program_id', selectedProgram);
            if (selectedCourse) params.append('course_id', selectedCourse);

            if (params.toString()) url += `?${params.toString()}`;

            const response = await fetch(url, { headers: getAuthHeaders() });
            if (response.ok) setSubjects(await response.json());
            else setSubjects([]);
        } catch (error) { setSubjects([]); } 
        finally { setLoading(false); }
    };

    const filteredSubjects = subjects.filter(subject =>
        subject.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subject.subject_code?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <SuperAdminSidebar
                isOpen={sidebarOpen}
                toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                activeMenuItem="Materials"
            />

            <div className={`flex-1 transition-all duration-300 min-w-0 ${sidebarOpen ? 'lg:ml-72' : 'ml-0'}`}>

                {/* Header */}
                <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-4 sticky top-0 z-30">
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button 
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                            <FaBars size={20} />
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/superadmin/materials/all')}
                            className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors shrink-0"
                            title="Back to Materials"
                        >
                            <FaArrowLeft size={18} />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2 truncate">
                                <MdClass className="text-teal-600 shrink-0" />
                                <span className="truncate">MANAGE SUBJECTS</span>
                            </h1>
                            <p className="text-[10px] sm:text-xs text-gray-500 truncate uppercase tracking-widest font-medium">
                                {franchiseCode ? `Franchise: ${franchiseCode}` : 'All Franchises'}
                            </p>
                        </div>
                    </div>
                </header>

                <div className="p-4 sm:p-6">
                    {/* Filters Bar - Grid based for better wrapping */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        <div className="relative">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search subjects..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-white text-sm"
                            />
                        </div>

                        <select
                            value={selectedProgram}
                            onChange={(e) => setSelectedProgram(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white text-sm outline-none"
                        >
                            <option value="">All Programs</option>
                            {programs.map(prog => (
                                <option key={prog.id || prog._id} value={prog.id || prog._id}>{prog.program_name}</option>
                            ))}
                        </select>

                        <select
                            value={selectedCourse}
                            onChange={(e) => setSelectedCourse(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white text-sm outline-none"
                        >
                            <option value="">All Courses</option>
                            {courses.map(course => (
                                <option key={course.id || course._id} value={course.id || course._id}>{course.course_name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Table View for Desktop */}
                    <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">S.No.</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Details</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Subject Name</th>
                                        <th className="px-6 py-4 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Sem</th>
                                        <th className="px-6 py-4 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Theory</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr><td colSpan="5" className="py-10 text-center text-gray-400">Loading...</td></tr>
                                    ) : filteredSubjects.length === 0 ? (
                                        <tr><td colSpan="5" className="py-10 text-center text-gray-400 italic">No subjects found.</td></tr>
                                    ) : (
                                        filteredSubjects.map((subject, index) => (
                                            <tr key={subject.id || subject._id} className="hover:bg-teal-50/30 transition-colors">
                                                <td className="px-6 py-4 text-sm font-medium text-gray-400">{index + 1}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs font-bold text-gray-900 flex items-center gap-1">
                                                            <FaLayerGroup className="text-teal-500 text-[10px]" /> {subject.program_name}
                                                        </span>
                                                        <span className="text-[11px] text-blue-600 font-medium flex items-center gap-1">
                                                            <FaGraduationCap /> {subject.course_name}
                                                        </span>
                                                        <span className="text-[10px] bg-amber-50 text-amber-700 w-fit px-1.5 rounded border border-amber-100 uppercase font-bold">
                                                            {subject.branch_code || 'N/A'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-bold text-gray-800 uppercase tracking-tight">{subject.subject_name}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold">
                                                        {subject.semester ? `${subject.semester} SEM` : 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 text-[10px] font-bold">
                                                        {subject.theory_marks || 0}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile Card View (Hidden on Desktop) */}
                    <div className="md:hidden space-y-4">
                        {loading ? (
                            <div className="text-center py-10 text-gray-400">Loading...</div>
                        ) : filteredSubjects.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 italic">No subjects found.</div>
                        ) : (
                            filteredSubjects.map((subject, index) => (
                                <div key={subject.id || subject._id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">S.No {index + 1}</span>
                                            <h3 className="text-sm font-bold text-gray-900 uppercase">{subject.subject_name}</h3>
                                        </div>
                                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[9px] font-bold border border-amber-100">
                                            {subject.branch_code || 'N/A'}
                                        </span>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center gap-2 text-xs text-gray-600">
                                            <FaLayerGroup className="text-teal-500 shrink-0" />
                                            <span className="font-medium truncate">{subject.program_name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-blue-600">
                                            <FaGraduationCap className="shrink-0" />
                                            <span className="font-medium truncate">{subject.course_name}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 border-t pt-3">
                                        <div className="bg-blue-50 p-2 rounded-xl text-center">
                                            <p className="text-[9px] text-blue-400 font-bold uppercase">Semester</p>
                                            <p className="text-xs font-bold text-blue-700">{subject.semester || 'N/A'}</p>
                                        </div>
                                        <div className="bg-orange-50 p-2 rounded-xl text-center">
                                            <p className="text-[9px] text-orange-400 font-bold uppercase">Theory Marks</p>
                                            <p className="text-xs font-bold text-orange-700">{subject.theory_marks || 0}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer Stats */}
                    <div className="mt-6 flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl border border-gray-200 gap-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                            Total: <span className="text-teal-600 font-black">{filteredSubjects.length}</span> Subjects
                        </span>
                        <div className="flex gap-2">
                            <span className="text-[10px] px-2 py-1 bg-gray-100 rounded-lg font-bold text-gray-400">ACTIVE SESSION</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminSubjects;