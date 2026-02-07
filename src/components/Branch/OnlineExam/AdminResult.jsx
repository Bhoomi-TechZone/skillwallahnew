import { useState, useEffect } from 'react';
import { FaClipboardList, FaSearch, FaEye, FaTrash, FaFilter, FaSpinner, FaChevronRight } from 'react-icons/fa';
import BranchLayout from '../BranchLayout';
import { examResultsApi } from '../../../api/examResultsApi';

const AdminResult = () => {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [testFilter, setTestFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [selectedResult, setSelectedResult] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [filterOptions, setFilterOptions] = useState({ papers: [], statuses: [] });
    const [resultsSummary, setResultsSummary] = useState(null);
    const [actionLoading, setActionLoading] = useState(null); // 'view_ID' or 'delete_ID'
    const [showFilters, setShowFilters] = useState(false);

    // Load results from API
    const loadResults = async (filters = {}) => {
        try {
            setLoading(true);
            setError(null);

            const apiFilters = {};
            if (statusFilter) apiFilters.status = statusFilter;
            if (testFilter) apiFilters.paper_name = testFilter;

            const response = await examResultsApi.getResults({ ...apiFilters, ...filters });

            // Handle different response formats
            let resultsData = [];
            if (Array.isArray(response)) {
                resultsData = response;
            } else if (response && response.data && Array.isArray(response.data)) {
                resultsData = response.data;
            } else if (response && response.results && Array.isArray(response.results)) {
                resultsData = response.results;
            } else if (response && typeof response === 'object') {
                // If response is an object but not the expected format, try to extract results
                resultsData = Object.values(response).find(value => Array.isArray(value)) || [];
            }

            setResults(resultsData);
        } catch (error) {
            console.error('Error loading results:', error);
            setError(error.message || 'Failed to load results');
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    // Load filter options
    const loadFilterOptions = async () => {
        try {
            const options = await examResultsApi.getFilterOptions();
            setFilterOptions(options);
        } catch (error) {
            console.error('Error loading filter options:', error);
        }
    };

    // Load results summary
    const loadResultsSummary = async () => {
        try {
            const summary = await examResultsApi.getResultsSummary();
            setResultsSummary(summary);
        } catch (error) {
            console.error('Error loading results summary:', error);
        }
    };

    useEffect(() => {
        loadResults();
        loadFilterOptions();
        loadResultsSummary();
    }, [statusFilter, testFilter]);

    // Filter results locally for search
    const filteredResults = Array.isArray(results) ? results.filter(result => {
        if (!result) return false;
        const studentName = result.student_name || '';
        const paperName = result.paper_name || result.test_name || '';
        const registrationNo = result.student_registration || result.student_id || '';

        const matchesSearch = studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            paperName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            registrationNo.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    }) : [];

    // Handle view result
    const handleView = async (result) => {
        try {
            setActionLoading(`view_${result.id}`);
            // If getResult is needed to fetch more details, keep it. 
            // If the list object has enough info, you can skip this call.
            // Assuming we need full details:
            const detailedResult = await examResultsApi.getResult(result.id);
            setSelectedResult(detailedResult || result); // Fallback to list item if detail fetch fails but returns null
            setShowPreviewModal(true);
        } catch (error) {
            console.error('Error fetching result details:', error);
            // Fallback to viewing the current result object if API fails
            setSelectedResult(result);
            setShowPreviewModal(true);
        } finally {
            setActionLoading(null);
        }
    };

    // Handle delete result
    const handleDelete = async (resultId) => {
        if (window.confirm('Are you sure you want to delete this result?')) {
            try {
                setActionLoading(`delete_${resultId}`);
                await examResultsApi.deleteResult(resultId);
                setResults(prev => Array.isArray(prev) ? prev.filter(result => result.id !== resultId) : []);
            } catch (error) {
                console.error('Error deleting result:', error);
                alert('Failed to delete result. Please try again.');
            } finally {
                setActionLoading(null);
            }
        }
    };


    // Get status color
    const getStatusColor = (status) => {
        const statusLower = (status || '').toLowerCase();
        if (statusLower === 'passed' || statusLower === 'pass') {
            return 'bg-green-100 text-green-800 border-green-200';
        } else if (statusLower === 'failed' || statusLower === 'fail') {
            return 'bg-red-100 text-red-800 border-red-200';
        } else if (statusLower === 'grace') {
            return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        } else if (statusLower === 'not attempted') {
            return 'bg-gray-100 text-gray-800 border-gray-200';
        }
        return 'bg-gray-100 text-gray-800 border-gray-200';
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return dateString;
        }
    };

    // Calculate derived values for display
    const getDisplayValues = (result) => {
        const attempted = Math.round(result.marks_obtained / result.total_marks * 100) || 0;
        const totalQuestions = 60; // Default assumption
        const rightQuestions = Math.round(attempted * result.percentage / 100);
        const wrongQuestions = attempted - rightQuestions;
        const leftQuestions = totalQuestions - attempted;

        return {
            totalQuestions,
            attempted: Math.min(attempted, totalQuestions),
            leftQuestions: Math.max(leftQuestions, 0),
            rightQuestions: Math.max(rightQuestions, 0),
            wrongQuestions: Math.max(wrongQuestions, 0),
            minusMarking: Math.max(wrongQuestions * 0.25, 0)
        };
    };

    // Pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredResults.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredResults.length / itemsPerPage);

    return (
        <BranchLayout>
            <div className="min-h-screen bg-gray-50 pb-10">
                {/* Header */}
                <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
                    <div className="px-4 sm:px-6 py-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center space-x-3">
                                <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white p-2.5 rounded-lg shadow-md shrink-0">
                                    <FaClipboardList className="w-5 h-5 md:w-6 md:h-6" />
                                </div>
                                <div>
                                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">Results Management</h1>
                                    <p className="text-xs md:text-sm text-gray-500">Track student performance</p>
                                </div>
                            </div>

                            {resultsSummary && (
                                <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-100 self-start md:self-auto w-full md:w-auto">
                                    <div className="flex-1 text-center px-2 border-r border-gray-200">
                                        <div className="text-xs text-gray-500">Total</div>
                                        <div className="font-bold text-gray-900">{resultsSummary.total_results}</div>
                                    </div>
                                    <div className="flex-1 text-center px-2 border-r border-gray-200">
                                        <div className="text-xs text-gray-500">Pass Rate</div>
                                        <div className="font-bold text-green-600">{resultsSummary.pass_rate}%</div>
                                    </div>
                                    <div className="flex-1 text-center px-2">
                                        <div className="text-xs text-gray-500">Pass/Fail</div>
                                        <div className="font-bold text-gray-900">
                                            <span className="text-green-600">{resultsSummary.passed}</span>
                                            <span className="text-gray-300 mx-1">/</span>
                                            <span className="text-red-500">{resultsSummary.failed}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Filters Toggle for Mobile */}
                    <div className="md:hidden px-4 pb-3">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center justify-center space-x-2 w-full py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 active:bg-gray-100"
                        >
                            <FaFilter className="text-gray-400" />
                            <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
                        </button>
                    </div>

                    {/* Filters */}
                    <div className={`${showFilters ? 'block' : 'hidden'} md:block border-t border-gray-100 bg-gray-50/50 px-4 sm:px-6 py-4`}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="relative sm:col-span-2 md:col-span-1">
                                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search student, Reg ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm"
                                />
                            </div>

                            <select
                                value={testFilter}
                                onChange={(e) => setTestFilter(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm"
                            >
                                <option value="">All Tests</option>
                                {filterOptions.papers.map(test => (
                                    <option key={test} value={test}>{test}</option>
                                ))}
                            </select>

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm"
                            >
                                <option value="">All Status</option>
                                {filterOptions.statuses.map(status => (
                                    <option key={status} value={status}>
                                        {status === 'pass' ? 'Passed' : status === 'fail' ? 'Failed' : status}
                                    </option>
                                ))}
                            </select>

                            {(searchTerm || testFilter || statusFilter) && (
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setTestFilter('');
                                        setStatusFilter('');
                                    }}
                                    className="w-full py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg transition-colors font-medium sm:col-span-2 md:col-span-1"
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>
                        {(searchTerm || testFilter || statusFilter) && (
                            <div className="mt-2 text-xs text-gray-500 pl-1">
                                Found {filteredResults.length} matching results
                            </div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6">
                    {error && (
                        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r shadow-sm">
                            <div className="flex justify-between">
                                <div className="flex">
                                    <div className="ml-3">
                                        <p className="text-sm text-red-700">{error}</p>
                                    </div>
                                </div>
                                <button onClick={() => loadResults()} className="text-xs font-bold text-red-600 uppercase tracking-wide hover:text-red-800">
                                    Retry
                                </button>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64">
                            <div className="relative">
                                <div className="w-12 h-12 rounded-full absolute border-4 border-gray-200"></div>
                                <div className="w-12 h-12 rounded-full animate-spin absolute border-4 border-blue-600 border-t-transparent"></div>
                            </div>
                            <p className="mt-4 text-gray-500 font-medium animate-pulse">Loading results...</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View (Hidden on mobile) */}
                            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full whitespace-nowrap">
                                        <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Student Info</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Test Details</th>
                                                <th className="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider">Performance</th>
                                                <th className="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider">Score</th>
                                                <th className="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-100">
                                            {currentItems.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                                        <div className="flex flex-col items-center">
                                                            <div className="bg-gray-100 p-3 rounded-full mb-3">
                                                                <FaClipboardList className="w-6 h-6 text-gray-400" />
                                                            </div>
                                                            <span className="font-medium">No results found</span>
                                                            <span className="text-sm mt-1">Try adjusting your filters</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                currentItems.map((result) => (
                                                    <tr key={result.id} className="hover:bg-blue-50/30 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm font-bold text-gray-900">{result.student_name}</div>
                                                            <div className="text-xs text-gray-500 mt-0.5">{result.student_registration || result.student_id || 'N/A'}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm font-medium text-gray-800">{result.paper_name || result.test_name}</div>
                                                            <div className="text-xs text-gray-500 mt-0.5">{formatDate(result.exam_date || result.created_at)}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center justify-center space-x-3 text-xs">
                                                                <div className="text-center" title="Right"><div className="text-green-600 font-bold">{getDisplayValues(result).rightQuestions}</div><div className="text-gray-400 text-[10px]">R</div></div>
                                                                <div className="w-px h-6 bg-gray-100"></div>
                                                                <div className="text-center" title="Wrong"><div className="text-red-500 font-bold">{getDisplayValues(result).wrongQuestions}</div><div className="text-gray-400 text-[10px]">W</div></div>
                                                                <div className="w-px h-6 bg-gray-100"></div>
                                                                <div className="text-center" title="Left"><div className="text-gray-600 font-bold">{getDisplayValues(result).leftQuestions}</div><div className="text-gray-400 text-[10px]">L</div></div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="text-sm font-bold text-blue-600">{result.obtained_marks || 0} <span className="text-gray-400 font-normal">/ {result.total_marks || 0}</span></div>
                                                            <div className="text-xs font-medium text-gray-500 mt-0.5">{(result.percentage || 0).toFixed(1)}% ({result.grade})</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(result.status)}`}>
                                                                {(result.status === 'pass' ? 'Passed' : result.status === 'fail' ? 'Failed' : result.status) || 'Unknown'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex items-center justify-end space-x-2">
                                                                <button
                                                                    onClick={() => handleView(result)}
                                                                    disabled={actionLoading === `view_${result.id}`}
                                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 bg-white border border-transparent hover:border-blue-100 rounded-lg transition-all shadow-sm"
                                                                    title="View Details"
                                                                >
                                                                    {actionLoading === `view_${result.id}` ? <FaSpinner className="w-4 h-4 animate-spin" /> : <FaEye className="w-4 h-4" />}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(result.id)}
                                                                    disabled={actionLoading === `delete_${result.id}`}
                                                                    className="p-1.5 text-red-600 hover:bg-red-50 bg-white border border-transparent hover:border-red-100 rounded-lg transition-all shadow-sm"
                                                                    title="Delete Result"
                                                                >
                                                                    {actionLoading === `delete_${result.id}` ? <FaSpinner className="w-4 h-4 animate-spin" /> : <FaTrash className="w-4 h-4" />}
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Mobile Card View (Visible on mobile) */}
                            <div className="md:hidden space-y-3">
                                {currentItems.length === 0 ? (
                                    <div className="bg-white rounded-xl p-8 text-center border border-gray-200 shadow-sm">
                                        <div className="bg-gray-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <FaClipboardList className="text-gray-400" />
                                        </div>
                                        <h3 className="text-gray-900 font-medium">No results found</h3>
                                        <p className="text-gray-500 text-sm mt-1">Try adjusting your filters</p>
                                    </div>
                                ) : (
                                    currentItems.map((result) => {
                                        const stats = getDisplayValues(result);
                                        return (
                                            <div key={result.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                                {/* Card Header: Student & Test */}
                                                <div className="p-4 border-b border-gray-100">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <h3 className="font-bold text-gray-900 line-clamp-1">{result.student_name}</h3>
                                                            <p className="text-xs text-gray-500 font-mono">{result.student_registration}</p>
                                                        </div>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusColor(result.status)}`}>
                                                            {result.status?.slice(0, 4)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-2">
                                                        <div className="text-sm font-medium text-gray-800 line-clamp-1 flex-1 pr-2">{result.paper_name}</div>
                                                        <div className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 whitespace-nowrap">
                                                            {formatDate(result.exam_date || result.created_at)}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Card Stats Grid */}
                                                <div className="grid grid-cols-3 divide-x divide-gray-100 bg-gray-50/50">
                                                    <div className="p-3 text-center">
                                                        <div className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Score</div>
                                                        <div className="font-bold text-blue-600 text-sm">{result.obtained_marks}/{result.total_marks}</div>
                                                    </div>
                                                    <div className="p-3 text-center">
                                                        <div className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Percentage</div>
                                                        <div className="font-bold text-gray-900 text-sm">{result.percentage?.toFixed(1)}%</div>
                                                    </div>
                                                    <div className="p-3 text-center">
                                                        <div className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Grade</div>
                                                        <div className="font-bold text-purple-600 text-sm">{result.grade || '-'}</div>
                                                    </div>
                                                </div>

                                                {/* Detailed Stats Row */}
                                                <div className="grid grid-cols-3 gap-1 px-4 py-2 bg-white border-t border-gray-100">
                                                    <div className="text-center">
                                                        <span className="text-[10px] text-gray-400">Right: </span>
                                                        <span className="text-xs font-bold text-green-600">{stats.rightQuestions}</span>
                                                    </div>
                                                    <div className="text-center border-l border-gray-100">
                                                        <span className="text-[10px] text-gray-400">Wrong: </span>
                                                        <span className="text-xs font-bold text-red-500">{stats.wrongQuestions}</span>
                                                    </div>
                                                    <div className="text-center border-l border-gray-100">
                                                        <span className="text-[10px] text-gray-400">Left: </span>
                                                        <span className="text-xs font-bold text-gray-600">{stats.leftQuestions}</span>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex border-t border-gray-100">
                                                    <button
                                                        onClick={() => handleView(result)}
                                                        className="flex-1 py-3 text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1 active:bg-blue-100"
                                                    >
                                                        <FaEye className="text-blue-500" /> View Details
                                                    </button>
                                                    <div className="w-px bg-gray-100"></div>
                                                    <button
                                                        onClick={() => handleDelete(result.id)}
                                                        className="flex-1 py-3 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-1 active:bg-red-100"
                                                    >
                                                        <FaTrash className="text-red-500" /> Delete
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                                    <span className="text-sm text-gray-600 font-medium order-2 sm:order-1">
                                        Page <span className="text-gray-900 font-bold">{currentPage}</span> of <span className="text-gray-900 font-bold">{totalPages}</span>
                                    </span>
                                    <div className="flex space-x-2 order-1 sm:order-2 w-full sm:w-auto">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Preview Modal */}
                {showPreviewModal && selectedResult && (
                    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 z-50">
                        <div className="bg-white w-full h-full sm:h-auto sm:rounded-2xl shadow-2xl sm:max-w-3xl sm:max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            {/* Modal Header */}
                            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Result Details</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">{selectedResult.paper_name}</p>
                                </div>
                                <button
                                    onClick={() => setShowPreviewModal(false)}
                                    className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                                >
                                    <span className="text-gray-500 font-bold">✕</span>
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="overflow-y-auto p-5 sm:p-6 bg-gray-50 flex-1">
                                {/* Score Card Banner */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 text-center relative overflow-hidden">
                                    <div className={`absolute top-0 inset-x-0 h-1 ${selectedResult.status === 'pass' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <div className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Total Score</div>
                                    <div className="text-4xl font-black text-gray-900 mb-1">
                                        {selectedResult.marks_obtained} <span className="text-xl text-gray-400 font-medium">/ {selectedResult.total_marks}</span>
                                    </div>
                                    <div className="flex items-center justify-center gap-3 mt-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor(selectedResult.status)}`}>
                                            {selectedResult.status === 'pass' ? 'Passed' : 'Failed'}
                                        </span>
                                        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-bold uppercase border border-purple-200">
                                            Grade {selectedResult.grade}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                    <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                                        <div className="text-xs text-gray-400 uppercase font-bold mb-1">Student Name</div>
                                        <div className="font-semibold text-gray-900 text-lg">{selectedResult.student_name}</div>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                                        <div className="text-xs text-gray-400 uppercase font-bold mb-1">Registration No.</div>
                                        <div className="font-mono text-gray-700 font-medium">{selectedResult.student_registration || selectedResult.student_id}</div>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                                        <div className="text-xs text-gray-400 uppercase font-bold mb-1">Date Time</div>
                                        <div className="font-medium text-gray-900">{formatDate(selectedResult.exam_date || selectedResult.created_at)}</div>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                                        <div className="text-xs text-gray-400 uppercase font-bold mb-1">Percentage</div>
                                        <div className="font-bold text-gray-900 text-lg">{selectedResult.percentage?.toFixed(2)}%</div>
                                    </div>
                                </div>

                                {selectedResult.remarks && (
                                    <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg p-4">
                                        <h4 className="text-xs font-bold text-blue-700 uppercase mb-2">Remarks</h4>
                                        <p className="text-blue-900 text-sm leading-relaxed">{selectedResult.remarks}</p>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 bg-white border-t border-gray-100 shrink-0">
                                <button
                                    onClick={() => setShowPreviewModal(false)}
                                    className="w-full py-3 bg-gray-900 text-white rounded-lg font-bold hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200"
                                >
                                    Close Details
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </BranchLayout>
    );
};

export default AdminResult;
