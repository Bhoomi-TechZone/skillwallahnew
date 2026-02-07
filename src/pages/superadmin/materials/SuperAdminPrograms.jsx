import React, { useState, useEffect } from 'react';
import {
    FaSearch,
    FaLayerGroup,
    FaArrowLeft,
    FaBars,
    FaCalendarAlt,
    FaBookOpen,
    FaUserGraduate
} from 'react-icons/fa';
import SuperAdminSidebar from '../../superadmin/SuperAdminSidebar';
import { useLocation, useNavigate } from 'react-router-dom';

const SuperAdminPrograms = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Sidebar state logic for mobile/desktop
    const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
    const [loading, setLoading] = useState(false);
    const [programs, setPrograms] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Auto-close sidebar on window resize
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
    }, [franchiseCode]);

    const fetchPrograms = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('adminToken');
            let url = 'http://localhost:4000/api/branch-programs/programs';
            if (franchiseCode) url += `?franchise_code=${franchiseCode}`;

            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const mappedPrograms = data.map(prog => ({
                    _id: prog.id || prog._id,
                    name: prog.program_name,
                    description: prog.description,
                    created_at: prog.created_at,
                    tags: [prog.program_type, prog.duration_years ? `${prog.duration_years} Years` : ''].filter(Boolean),
                    courseCount: prog.total_courses,
                    studentCount: prog.total_students,
                    status: prog.status ? (prog.status.charAt(0).toUpperCase() + prog.status.slice(1)) : 'Unknown'
                }));
                setPrograms(mappedPrograms);
            }
        } catch (error) {
            console.error("Error fetching programs:", error);
            setPrograms([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredPrograms = programs.filter(prog => 
        prog.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 flex overflow-hidden">
            {/* Sidebar */}
            <SuperAdminSidebar
                isOpen={sidebarOpen}
                toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                activeMenuItem="Materials"
            />

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarOpen ? 'lg:ml-72' : 'ml-0'}`}>
                
                {/* Responsive Header */}
                <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-4 sticky top-0 z-20">
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button 
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <FaBars size={18} />
                        </button>
                        
                        <button
                            type="button"
                            onClick={() => navigate('/superadmin/materials/all')}
                            className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors shrink-0"
                        >
                            <FaArrowLeft size={18} />
                        </button>
                        
                        <div className="min-w-0">
                            <h1 className="text-lg md:text-2xl font-bold text-gray-900 flex items-center gap-2 truncate uppercase tracking-tight">
                                <FaLayerGroup className="text-orange-500 hidden sm:block" /> 
                                Programs
                            </h1>
                            <p className="text-[10px] md:text-sm text-gray-500 truncate">
                                {franchiseCode ? `Franchise: ${franchiseCode}` : 'Management • All Franchises'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-4 md:p-6 overflow-y-auto">
                    {/* Search Bar */}
                    <div className="mb-6">
                        <div className="relative w-full max-w-xl">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by program name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 md:py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white shadow-sm text-sm md:text-base"
                            />
                        </div>
                    </div>

                    {/* Table Container */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        
                        {/* Desktop Table View (Lg screens+) */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/80 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider w-16 text-center">S.No.</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Program Details</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Metrics</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr><td colSpan="4" className="py-20 text-center text-gray-500 italic">Loading programs...</td></tr>
                                    ) : filteredPrograms.length === 0 ? (
                                        <tr><td colSpan="4" className="py-20 text-center text-gray-500 italic">No programs found.</td></tr>
                                    ) : (
                                        filteredPrograms.map((program, index) => (
                                            <tr key={program._id} className="hover:bg-gray-50/80 transition-colors">
                                                <td className="px-6 py-4 text-sm font-medium text-gray-400 text-center">{index + 1}.</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-gray-900">{program.name}</span>
                                                        <span className="text-xs text-gray-500 mt-1 line-clamp-1">{program.description}</span>
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            {program.tags.map((tag, i) => (
                                                                <span key={i} className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-orange-50 text-orange-600 border border-orange-100">
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-gray-900">{program.courseCount} Courses</span>
                                                            <span className="text-xs font-bold text-gray-900">{program.studentCount} Students</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <StatusBadge status={program.status} />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile & Tablet Card View (Below Lg) */}
                        <div className="lg:hidden divide-y divide-gray-100">
                            {loading ? (
                                <div className="p-10 text-center text-gray-500">Loading programs...</div>
                            ) : filteredPrograms.length === 0 ? (
                                <div className="p-10 text-center text-gray-500 italic">No programs found.</div>
                            ) : (
                                filteredPrograms.map((program, index) => (
                                    <div key={program._id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="min-w-0 flex-1 pr-2">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-bold text-gray-400">#{index + 1}</span>
                                                    <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">{program.name}</h3>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {program.tags.map((tag, i) => (
                                                        <span key={i} className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-orange-50 text-orange-600">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <StatusBadge status={program.status} />
                                        </div>
                                        
                                        <p className="text-xs text-gray-500 mb-4 line-clamp-2">{program.description}</p>

                                        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-xl">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><FaBookOpen size={12} /></div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase leading-none">Courses</p>
                                                    <p className="text-xs font-bold text-gray-900">{program.courseCount}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><FaUserGraduate size={12} /></div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase leading-none">Students</p>
                                                    <p className="text-xs font-bold text-gray-900">{program.studentCount}</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-3 flex items-center text-[10px] text-gray-400 font-medium">
                                            <FaCalendarAlt className="mr-1" /> Created: {new Date(program.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    
                    {/* Bottom Count Indicator */}
                    <div className="mt-4 px-2 flex justify-between items-center text-xs text-gray-500">
                        <span>Showing {filteredPrograms.length} Programs</span>
                        {franchiseCode && <span className="text-orange-600 font-bold">Filtered by Franchise</span>}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Reusable Status Badge Component
const StatusBadge = ({ status }) => {
    const isActive = status === 'Active';
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
            isActive 
                ? 'bg-orange-50 text-orange-600 border-orange-200' 
                : 'bg-gray-50 text-gray-500 border-gray-200'
        }`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isActive ? 'bg-orange-500' : 'bg-gray-400'}`}></span>
            {status}
        </span>
    );
};

export default SuperAdminPrograms;