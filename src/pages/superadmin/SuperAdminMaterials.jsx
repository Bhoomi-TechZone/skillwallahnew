import React, { useState, useEffect } from 'react';
import {
    FaBook,
    FaFileAlt,
    FaLayerGroup,
    FaUsers,
    FaBookOpen,
    FaCube,
    FaSearch,
    FaArrowRight,
    FaBuilding,
    FaBars,
    FaTimes
} from 'react-icons/fa';
import SuperAdminSidebar from './SuperAdminSidebar';
import { useNavigate } from 'react-router-dom';

const SuperAdminMaterials = () => {
    const navigate = useNavigate();
    
    // Responsive Sidebar Logic
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
    const [loading, setLoading] = useState(false);
    const [franchises, setFranchises] = useState([]);
    const [selectedFranchise, setSelectedFranchise] = useState('all');

    const [stats, setStats] = useState({
        totalCourses: 0,
        totalInstructors: 0,
        totalPrograms: 0,
        totalBatches: 0,
        totalSubjects: 0,
        totalStudents: 0,
        totalMaterials: 0
    });

    // Handle window resize for sidebar
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setSidebarOpen(false);
            } else {
                setSidebarOpen(true);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const fetchFranchises = async () => {
            try {
                const token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('adminToken');
                if (!token) return;

                const response = await fetch('http://localhost:4000/api/franchises', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    let franchiseList = Array.isArray(data) ? data : (data.franchises || data.data || []);
                    if (Array.isArray(franchiseList)) {
                        franchiseList.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
                    }
                    setFranchises(franchiseList);
                }
            } catch (error) {
                console.error("Error fetching franchises:", error);
            }
        };
        fetchFranchises();
    }, []);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('adminToken');
                if (!token) { setLoading(false); return; }

                const response = await fetch(`http://localhost:4000/api/dashboard/materials-stats?franchise_id=${selectedFranchise}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    setStats(prev => ({ ...prev, ...data }));
                }
            } catch (error) {
                console.error("Error fetching stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [selectedFranchise]);

    const dataCards = [
        { id: 'courses', title: 'All Courses', description: 'Manage and view all courses created by franchise admins', count: stats.totalCourses, icon: FaBook, color: 'from-blue-500 to-blue-600', path: '/superadmin/materials/courses' },
        { id: 'syllabus', title: 'Syllabus', description: 'Course syllabus and curriculum documents', count: stats.totalSubjects, icon: FaFileAlt, color: 'from-green-500 to-green-600', path: '/superadmin/materials/syllabus' },
        { id: 'programs', title: 'Programs', description: 'Educational programs and curriculums', count: stats.totalPrograms, icon: FaLayerGroup, color: 'from-purple-500 to-purple-600', path: '/superadmin/materials/programs' },
        { id: 'batches', title: 'Batches', description: 'Active and upcoming batches across centers', count: stats.totalBatches, icon: FaUsers, color: 'from-orange-500 to-orange-600', path: '/superadmin/materials/batches' },
        { id: 'subjects', title: 'Subjects', description: 'Subject repository and syllabus details', count: stats.totalSubjects, icon: FaBookOpen, color: 'from-red-500 to-red-600', path: '/superadmin/materials/subjects' },
        { id: 'materials', title: 'Study Materials', description: 'Digital assets, PDFs, and learning resources', count: stats.totalMaterials || 0, icon: FaCube, color: 'from-teal-500 to-teal-600', path: '/superadmin/materials/resources' }
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
            {/* Sidebar */}
            <SuperAdminSidebar
                isOpen={sidebarOpen}
                toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                activeMenuItem="Materials"
            />

            {/* Main Content */}
            <div className={`flex-1 transition-all duration-300 min-w-0 ${sidebarOpen ? 'lg:ml-72' : 'ml-0'}`}>
                
                {/* Header */}
                <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-4 sticky top-0 z-20">
                    <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center justify-between">
                        
                        <div className="flex items-center gap-3">
                            {/* Hamburger Menu Button */}
                            <button 
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="p-2 rounded-lg bg-gray-100 text-gray-600 lg:hidden hover:bg-gray-200 transition-colors"
                            >
                                {sidebarOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
                            </button>
                            
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                                    <FaBook className="text-primary-600 hidden sm:inline" />
                                    Materials & Resources
                                </h1>
                                <p className="text-xs md:text-sm text-gray-500">
                                    Centralized view of franchise resources
                                </p>
                            </div>
                        </div>

                        {/* Actions: Franchise Selector & Search */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            {/* Franchise Selector */}
                            <div className="relative flex-1 sm:flex-none">
                                <FaBuilding className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <select
                                    value={selectedFranchise}
                                    onChange={(e) => setSelectedFranchise(e.target.value)}
                                    className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-700 sm:min-w-[220px] text-sm"
                                >
                                    <option value="all">All Franchises</option>
                                    {franchises.map((f) => (
                                        <option key={f._id} value={f._id}>
                                            {f.franchise_name || f.school_name || 'Unnamed Franchise'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Global Search - Hidden on very small screens, visible on SM up */}
                            <div className="relative hidden sm:block">
                                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full md:w-48 lg:w-64 text-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-4 md:p-6 lg:p-8">
                    
                    {/* Cards Grid - Responsive columns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                        {dataCards.map((card) => (
                            <div
                                key={card.id}
                                onClick={() => {
                                    let query = '';
                                    if (selectedFranchise !== 'all') {
                                        const selectedFn = franchises.find(f => f._id === selectedFranchise);
                                        if (selectedFn?.franchise_code) query = `?franchise_code=${selectedFn.franchise_code}`;
                                    }
                                    navigate(`${card.path}${query}`);
                                }}
                                className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 md:p-6 hover:shadow-xl hover:border-primary-200 transition-all duration-300 cursor-pointer group"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`p-3 rounded-lg bg-gradient-to-br ${card.color} text-white shadow-lg group-hover:scale-110 transition-transform`}>
                                        <card.icon className="text-xl md:text-2xl" />
                                    </div>
                                    <div className="bg-gray-50 px-2 md:px-3 py-1 rounded-full border border-gray-100">
                                        <span className="text-[10px] md:text-xs font-semibold text-gray-600 uppercase">View All</span>
                                    </div>
                                </div>

                                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                                    {card.title}
                                </h3>
                                <p className="text-xs md:text-sm text-gray-500 mb-4 h-10 line-clamp-2">
                                    {card.description}
                                </p>

                                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                    <div>
                                        <span className="text-xl md:text-2xl font-bold text-gray-900">
                                            {loading ? '...' : card.count || '0'}
                                        </span>
                                        <span className="text-[10px] md:text-xs text-gray-400 ml-1 uppercase">Items</span>
                                    </div>
                                    <FaArrowRight className="text-gray-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Overlay for mobile when sidebar is open */}
            {sidebarOpen && window.innerWidth < 1024 && (
                <div 
                    className="fixed inset-0 bg-black/50 z-30 transition-opacity"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
};

export default SuperAdminMaterials;