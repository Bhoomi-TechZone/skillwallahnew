import React, { useState, useEffect } from 'react';
import {
    FaSearch,
    FaBook,
    FaFilter,
    FaArrowLeft,
    FaBars,
    FaClock,
    FaUserGraduate,
    FaMoneyBillWave
} from 'react-icons/fa';
import SuperAdminSidebar from '../../superadmin/SuperAdminSidebar';
import { useLocation, useNavigate, Link } from 'react-router-dom';

const SuperAdminCourses = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
    const [loading, setLoading] = useState(false);
    const [courses, setCourses] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Handle screen resize to auto-close sidebar on mobile
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) setSidebarOpen(false);
            else setSidebarOpen(true);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Get franchise_code from URL query params
    const queryParams = new URLSearchParams(location.search);
    const franchiseCode = queryParams.get('franchise_code');

    useEffect(() => {
        fetchCourses();
    }, [franchiseCode]);

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('adminToken');

            let url = 'http://localhost:4000/api/branch-courses/courses';
            if (franchiseCode) {
                url += `?franchise_code=${franchiseCode}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const mappedCourses = data.map(course => ({
                    _id: course.id || course._id,
                    name: course.course_name,
                    description: course.description,
                    courseCode: course.course_code,
                    program: course.program_name || 'N/A',
                    fee: course.fee,
                    duration: course.duration_months ? `${course.duration_months * 30 * 24}h` : 'N/A',
                    durationLabel: `${course.duration_months} Months`,
                    maxStudents: course.max_students,
                    enrolled: course.enrolled_students || 0,
                    status: course.status ? (course.status.charAt(0).toUpperCase() + course.status.slice(1)) : 'Unknown'
                }));
                setCourses(mappedCourses);
            } else {
                setCourses([]);
            }
        } catch (error) {
            console.error("Error fetching courses:", error);
            setCourses([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredCourses = courses.filter(course =>
        course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.program.toLowerCase().includes(searchTerm.toLowerCase())
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
                <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-4 sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                            <FaBars size={20} />
                        </button>
                        
                        <button
                            type="button"
                            onClick={() => navigate('/superadmin/materials/all')}
                            className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors flex items-center justify-center shrink-0"
                            title="Back to Materials"
                        >
                            <FaArrowLeft size={18} />
                        </button>
                        
                        <div className="min-w-0">
                            <h1 className="text-lg md:text-2xl font-bold text-gray-900 flex items-center gap-2 truncate">
                                <FaBook className="text-blue-500 hidden sm:inline" />
                                MANAGE COURSES
                            </h1>
                            <p className="text-xs md:text-sm text-gray-500 truncate">
                                {franchiseCode ? `Franchise: ${franchiseCode}` : 'All Franchises'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-4 md:p-6">
                    {/* Search and Filters */}
                    <div className="mb-6">
                        <div className="relative w-full max-w-2xl">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search courses or programs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 md:py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm outline-none"
                            />
                        </div>
                    </div>

                    {/* Table / Card Container */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        
                        {/* Desktop View Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50/50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">S.No.</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Course Info</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fee</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Duration</th>
                                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Max Students</th>
                                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                    <span>Loading courses...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredCourses.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center text-gray-500 italic">
                                                No courses found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredCourses.map((course, index) => (
                                            <tr key={course._id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-400">
                                                    {index + 1}.
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                                            <FaBook />
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-sm font-bold text-gray-900 truncate">{course.name}</span>
                                                            <span className="text-xs text-blue-600 font-medium">{course.program}</span>
                                                            <span className="text-xs text-gray-400">{course.enrolled} Students Enrolled</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm font-semibold text-gray-900">₹{course.fee}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                                        <FaClock className="text-gray-400" size={12} />
                                                        <span>{course.durationLabel}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className="text-sm font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded">
                                                        {course.maxStudents}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <StatusBadge status={course.status} />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile View Cards (Hidden on Desktop) */}
                        <div className="md:hidden divide-y divide-gray-100">
                            {loading ? (
                                <div className="p-8 text-center text-gray-500">Loading...</div>
                            ) : filteredCourses.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 italic">No courses found.</div>
                            ) : (
                                filteredCourses.map((course, index) => (
                                    <div key={course._id} className="p-4 flex flex-col gap-3 hover:bg-gray-50">
                                        <div className="flex justify-between items-start">
                                            <div className="flex gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                                                    <FaBook />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-gray-900 leading-tight">{course.name}</h3>
                                                    <p className="text-xs text-blue-600 font-medium">{course.program}</p>
                                                </div>
                                            </div>
                                            <StatusBadge status={course.status} />
                                        </div>

                                        <div className="grid grid-cols-2 gap-y-3 pt-2 border-t border-gray-50">
                                            <div className="flex items-center gap-2">
                                                <FaMoneyBillWave className="text-gray-400" size={14} />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-gray-400 uppercase font-bold">Fee</span>
                                                    <span className="text-xs font-bold">₹{course.fee}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <FaClock className="text-gray-400" size={14} />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-gray-400 uppercase font-bold">Duration</span>
                                                    <span className="text-xs font-bold">{course.durationLabel}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <FaUserGraduate className="text-gray-400" size={14} />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-gray-400 uppercase font-bold">Students</span>
                                                    <span className="text-xs font-bold">{course.enrolled} / {course.maxStudents}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3.5 h-3.5 flex items-center justify-center text-gray-400 font-bold text-[10px]">#</div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-gray-400 uppercase font-bold">S.No.</span>
                                                    <span className="text-xs font-bold">{index + 1}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Sub-component for Status Badge to reduce repetition
const StatusBadge = ({ status }) => {
    const isActive = status === 'Active';
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
            isActive
                ? 'bg-green-50 text-green-600 border-green-200'
                : 'bg-red-50 text-red-600 border-red-200'
        }`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
            {status}
        </span>
    );
};

export default SuperAdminCourses;