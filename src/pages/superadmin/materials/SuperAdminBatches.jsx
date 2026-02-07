import React, { useState, useEffect } from 'react';
import {
    FaSearch,
    FaArrowLeft,
    FaUsers,
    FaCalendarAlt,
    FaUserTie,
    FaBars,
    FaTimes
} from 'react-icons/fa';
import { MdClass } from 'react-icons/md';
import SuperAdminSidebar from '../../superadmin/SuperAdminSidebar';
import { useLocation, useNavigate } from 'react-router-dom';

const SuperAdminBatches = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Initial sidebar state based on window width
    const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
    const [loading, setLoading] = useState(false);
    const [batches, setBatches] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Handle responsive sidebar on window resize
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
        fetchBatches();
    }, [franchiseCode]);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('adminToken');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    };

    const fetchBatches = async () => {
        setLoading(true);
        try {
            let url = 'http://localhost:4000/api/branch-batches/batches';
            if (franchiseCode) {
                url += `?franchise_code=${franchiseCode}`;
            }

            const response = await fetch(url, { headers: getAuthHeaders() });
            if (response.ok) {
                const data = await response.json();
                setBatches(data);
            } else {
                setBatches([]);
            }
        } catch (error) {
            console.error("Error fetching batches:", error);
            setBatches([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredBatches = batches.filter(batch =>
        batch.batch_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        batch.batch_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        batch.instructor_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
            return dateString;
        }
    };

    const getCapacityPercentage = (current, max) => {
        const maximum = max || 30;
        const currentVal = current || 0;
        return Math.round((currentVal / maximum) * 100);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex overflow-x-hidden">
            <SuperAdminSidebar
                isOpen={sidebarOpen}
                toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                activeMenuItem="Materials"
            />

            <div className={`flex-1 transition-all duration-300 min-w-0 ${sidebarOpen ? 'lg:ml-72' : 'ml-0'}`}>

                {/* Header */}
                <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-4 sticky top-0 z-30">
                    <div className="flex items-center justify-between gap-2 max-w-full">
                        <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg shrink-0"
                            >
                                {sidebarOpen ? <FaTimes size={18} /> : <FaBars size={18} />}
                            </button>
                            
                            <button
                                type="button"
                                onClick={() => navigate('/superadmin/materials/all')}
                                className="p-2 rounded-full hover:bg-gray-100 text-gray-600 shrink-0"
                            >
                                <FaArrowLeft size={18} />
                            </button>
                            
                            <div className="min-w-0">
                                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2 truncate">
                                    <MdClass className="text-purple-600 shrink-0" />
                                    <span className="truncate">MANAGE BATCH</span>
                                </h1>
                                <p className="text-[10px] sm:text-sm text-gray-500 truncate">
                                    {franchiseCode ? `Franchise: ${franchiseCode}` : 'All Batches'}
                                </p>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-4 sm:p-6">
                    {/* Search Bar */}
                    <div className="mb-6">
                        <div className="relative w-full max-w-md">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search batches or instructors..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white text-sm outline-none shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Desktop View Table (Visible only on lg screens) */}
                    <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-16 text-center">S.No.</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Branch</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Batch Details</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Timeline</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Capacity</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan="5" className="py-20 text-center text-gray-500 italic">Loading batches...</td></tr>
                                ) : filteredBatches.length === 0 ? (
                                    <tr><td colSpan="5" className="py-20 text-center text-gray-500 italic">No batches found.</td></tr>
                                ) : (
                                    filteredBatches.map((batch, index) => {
                                        const capacityPercent = getCapacityPercentage(batch.current_enrollment, batch.max_capacity);
                                        return (
                                            <tr key={batch.id || batch._id} className="hover:bg-purple-50/30 transition-colors">
                                                <td className="px-6 py-4 text-sm font-semibold text-gray-400 text-center">{index + 1}</td>
                                                <td className="px-6 py-4">
                                                    <span className="px-3 py-1 rounded-md bg-amber-50 text-amber-700 text-[11px] font-bold border border-amber-100">
                                                        {batch.branch_code || batch.franchise_code || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-900 text-sm">{batch.batch_name}</div>
                                                    <div className="flex items-center gap-1 text-[11px] text-purple-600 font-medium mt-0.5">
                                                        <FaUserTie /> {batch.instructor_name || 'No Instructor'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 text-[11px] text-gray-600">
                                                            <span className="w-10 font-bold uppercase text-[9px] text-gray-400">Start:</span>
                                                            {formatDate(batch.start_date)}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[11px] text-gray-600">
                                                            <span className="w-10 font-bold uppercase text-[9px] text-gray-400">End:</span>
                                                            {formatDate(batch.end_date)}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col items-center">
                                                        <div className="w-full max-w-[100px] h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                                                            <div 
                                                                className={`h-full rounded-full transition-all duration-500 ${capacityPercent > 80 ? 'bg-red-500' : 'bg-green-500'}`} 
                                                                style={{ width: `${capacityPercent}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-gray-500">{capacityPercent}% Occupied</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View Cards (Visible below lg screens) */}
                    <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {loading ? (
                            <div className="col-span-full py-20 text-center text-gray-500 italic">Loading...</div>
                        ) : filteredBatches.length === 0 ? (
                            <div className="col-span-full py-20 text-center text-gray-500 italic">No batches found.</div>
                        ) : (
                            filteredBatches.map((batch, index) => {
                                const capacityPercent = getCapacityPercentage(batch.current_enrollment, batch.max_capacity);
                                return (
                                    <div key={batch.id || batch._id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col gap-1">
                                                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded w-fit uppercase">
                                                    {batch.branch_code || 'No Code'}
                                                </span>
                                                <h3 className="text-sm font-bold text-gray-900 leading-tight mt-1">{batch.batch_name}</h3>
                                            </div>
                                            <span className="text-gray-400 font-bold text-xs">#{index + 1}</span>
                                        </div>

                                        <div className="flex items-center gap-2 text-xs text-gray-600 bg-purple-50 p-2 rounded-lg">
                                            <FaUserTie className="text-purple-600" />
                                            <span className="font-semibold truncate">{batch.instructor_name || 'N/A'}</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-gray-50 pt-3">
                                            <div>
                                                <p className="text-gray-400 font-bold uppercase tracking-tighter text-[9px] mb-0.5">Start Date</p>
                                                <div className="flex items-center gap-1 font-bold text-gray-700">
                                                    <FaCalendarAlt className="text-orange-400" size={10} />
                                                    {formatDate(batch.start_date)}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 font-bold uppercase tracking-tighter text-[9px] mb-0.5">End Date</p>
                                                <div className="flex items-center gap-1 font-bold text-gray-700">
                                                    <FaCalendarAlt className="text-red-400" size={10} />
                                                    {formatDate(batch.end_date)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            <div className="flex justify-between items-end mb-1">
                                                <p className="text-[9px] font-bold text-gray-400 uppercase">Batch Capacity</p>
                                                <p className="text-[10px] font-bold text-gray-700">{capacityPercent}%</p>
                                            </div>
                                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full ${capacityPercent > 80 ? 'bg-red-500' : 'bg-green-500'}`} 
                                                    style={{ width: `${capacityPercent}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <footer className="mt-6 flex items-center justify-between text-xs text-gray-400 px-2">
                        <p>Total Batches: {filteredBatches.length}</p>
                        <p>Last updated: {new Date().toLocaleDateString()}</p>
                    </footer>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminBatches;