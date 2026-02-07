import { useState, useEffect } from 'react';
import { FaClipboardList, FaSearch, FaEye, FaDownload, FaFilter, FaSpinner, FaTrash } from 'react-icons/fa';
import { examResultsApi } from '../../../api/examResultsApi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import BranchLayout from '../BranchLayout';

const BranchResult = () => {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [testFilter, setTestFilter] = useState('');
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [selectedResult, setSelectedResult] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [actionLoading, setActionLoading] = useState(null);

    // Mock data for results
    const mockResults = [
        {
            id: 1,
            sno: 1,
            name: 'ISHAN BANERJEE',
            date: '2025-11-21 13:28:04',
            testName: 'ADCA 2nd Sem Exam',
            totalQuestions: 60,
            attempted: 9,
            leftQuestions: 51,
            rightQuestions: 0,
            wrongQuestions: 9,
            minusMarking: 0,
            totalMarks: 0,
            status: 'Failed'
        },
        {
            id: 2,
            sno: 2,
            name: 'ISHAN BANERJEE',
            date: '2025-11-21 13:11:28',
            testName: 'ADCA 2nd sem 2023',
            totalQuestions: 60,
            attempted: 3,
            leftQuestions: 57,
            rightQuestions: 0,
            wrongQuestions: 3,
            minusMarking: 0,
            totalMarks: 0,
            status: 'Failed'
        },
        {
            id: 3,
            sno: 3,
            name: 'ANUJ KUMAR PATEL',
            date: '2025-10-14 15:31:02',
            testName: 'ADCA 1ST SEM HINDI',
            totalQuestions: 60,
            attempted: 0,
            leftQuestions: 60,
            rightQuestions: 0,
            wrongQuestions: 0,
            minusMarking: 0,
            totalMarks: 0,
            status: 'Failed'
        },
        {
            id: 4,
            sno: 4,
            name: 'ANUJ KUMAR PATEL',
            date: '2025-10-07 16:02:06',
            testName: 'ADCA 2nd',
            totalQuestions: 60,
            attempted: 25,
            leftQuestions: 35,
            rightQuestions: 0,
            wrongQuestions: 25,
            minusMarking: 0,
            totalMarks: 0,
            status: 'Failed'
        },
        {
            id: 5,
            sno: 5,
            name: 'RAHUL VERMA',
            date: '2025-09-15 10:45:30',
            testName: 'ADCA 1ST SEM',
            totalQuestions: 50,
            attempted: 45,
            leftQuestions: 5,
            rightQuestions: 40,
            wrongQuestions: 5,
            minusMarking: 5,
            totalMarks: 75,
            status: 'Passed'
        }
    ];

    const testNames = [...new Set(mockResults.map(r => r.testName))];

    // Load results from API
    const loadResults = async () => {
        try {
            setLoading(true);
            setError(null);

            console.log('📊 [BranchResult] Loading results...');
            const response = await examResultsApi.getResults({
                student_name: searchTerm || undefined,
                test_name: testFilter || undefined
            });

            console.log('📊 [BranchResult] API response:', response);

            // Handle different response formats
            let resultsData = [];
            if (Array.isArray(response)) {
                resultsData = response;
            } else if (response && response.data && Array.isArray(response.data)) {
                resultsData = response.data;
            } else if (response && response.results && Array.isArray(response.results)) {
                resultsData = response.results;
            } else if (response && response.success && response.data) {
                resultsData = response.data;
            } else {
                console.error('❌ [BranchResult] Invalid response format:', response);
                resultsData = mockResults; // Fallback to mock data
            }

            if (resultsData.length > 0) {
                // Map API response to match expected format
                const mappedResults = resultsData.map((result, index) => {
                    // Calculate status if not provided
                    const percentage = result.percentage || 0;
                    let calculatedStatus = result.status;
                    if (!calculatedStatus) {
                        if (percentage >= 60) calculatedStatus = 'Passed';
                        else if (percentage >= 40) calculatedStatus = 'Grace';
                        else calculatedStatus = 'Failed';
                    }

                    // Calculate grade if not provided
                    let grade = result.grade;
                    if (!grade) {
                        if (percentage >= 80) grade = 'A';
                        else if (percentage >= 60) grade = 'B';
                        else if (percentage >= 40) grade = 'C';
                        else grade = 'F';
                    }

                    return {
                        id: result.id || result._id || index + 1,
                        sno: index + 1,
                        name: result.student_name || result.name || 'Unknown Student',
                        registrationNo: result.student_registration || result.student_id || 'N/A',
                        date: result.created_at ? new Date(result.created_at).toLocaleString() : 'N/A',
                        testName: result.test_name || result.paper_name || result.testName || 'Unknown Test',
                        totalQuestions: result.total_questions || result.totalQuestions || 0,
                        attempted: result.attempted_questions || result.attempted || 0,
                        leftQuestions: result.left_questions || result.leftQuestions || 0,
                        rightQuestions: result.correct_answers || result.rightQuestions || 0,
                        wrongQuestions: result.wrong_answers || result.wrongQuestions || 0,
                        minusMarking: result.minus_marking || result.minusMarking || 0,
                        totalMarks: result.obtained_marks || result.totalMarks || 0,
                        maxMarks: result.total_marks || result.maxMarks || 0,
                        percentage: result.percentage || 0,
                        grade: grade,
                        status: calculatedStatus
                    };
                });

                setResults(mappedResults);
                console.log('✅ [BranchResult] Results mapped:', mappedResults.length);
                toast.success(`Loaded ${mappedResults.length} results`);
            } else {
                // Fallback to mock data
                setResults(mockResults);
                console.log('📊 [BranchResult] Using mock data');
            }
        } catch (error) {
            console.error('❌ [BranchResult] Error loading results:', error);
            setError('Failed to load results');
            toast.error('Failed to load results');

            // Fallback to mock data
            setResults(mockResults);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadResults();
    }, []);

    // Filter results
    const filteredResults = Array.isArray(results) ? results.filter(result => {
        if (!result) return false;
        const name = result.name || '';
        const testName = result.testName || '';
        const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            testName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTest = testFilter === '' || testName === testFilter;
        return matchesSearch && matchesTest;
    }) : [];

    // Handle view result
    const handleView = async (result) => {
        try {
            setActionLoading(`view_${result.id}`);
            const detailedResult = await examResultsApi.getResult(result.id);
            setSelectedResult(detailedResult);
            setShowPreviewModal(true);
        } catch (error) {
            console.error('Error fetching result details:', error);
            toast.error('Failed to load result details. Please try again.');
        } finally {
            setActionLoading(null);
        }
    };

    // Handle download solution
    const handleDownloadSolution = async (result) => {
        try {
            setActionLoading(`download_${result.id}`);
            await examResultsApi.downloadSolution(result.id);
            toast.success('Solution downloaded successfully!');
        } catch (error) {
            console.error('Error downloading solution:', error);
            toast.error('Failed to download solution. Please try again.');
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
                toast.success('Result deleted successfully!');
            } catch (error) {
                console.error('Error deleting result:', error);
                toast.error('Failed to delete result. Please try again.');
            } finally {
                setActionLoading(null);
            }
        }
    };

    // Get status color
    const getStatusColor = (status) => {
        const statusLower = (status || '').toLowerCase();
        if (statusLower === 'passed' || statusLower === 'pass') {
            return 'bg-orange-100 text-orange-800';
        } else if (statusLower === 'failed' || statusLower === 'fail') {
            return 'bg-red-100 text-red-800';
        } else if (statusLower === 'grace') {
            return 'bg-yellow-100 text-yellow-800';
        } else if (statusLower === 'not attempted') {
            return 'bg-gray-100 text-gray-800';
        }
        return 'bg-gray-100 text-gray-800';
    };

    // Format date
    const formatDate = (dateString) => {
        return dateString || 'N/A';
    };

    // Pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredResults.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredResults.length / itemsPerPage);

    return (
        <BranchLayout>
            <div className="p-4 md:p-6">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                    <div className="px-4 py-4 md:px-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center space-x-3">
                                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-2 rounded-lg">
                                    <FaClipboardList className="w-6 h-6" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">Student Results</h1>
                                    <p className="text-gray-600">View all student exam results</p>
                                </div>
                            </div>
                            <div className="text-sm text-gray-500 bg-blue-50 px-4 py-2 rounded-lg self-start md:self-auto">
                                <span className="font-medium">Branch Access:</span> View Only
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white shadow-sm border border-gray-200 rounded-lg px-4 py-4 md:px-6 mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="relative col-span-1 sm:col-span-2 lg:col-span-1">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <select
                            value={testFilter}
                            onChange={(e) => setTestFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">All Tests</option>
                            {testNames.map(test => (
                                <option key={test} value={test}>
                                    {test}
                                </option>
                            ))}
                        </select>

                        <div className="text-sm text-gray-600 flex items-center justify-end sm:col-span-2 lg:col-span-1">
                            Total: {filteredResults.length} results
                        </div>
                    </div>

                    {/* Content */}
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        ) : (
                            <>
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full table-auto">
                                        <thead className="bg-orange-600 text-white">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">
                                                    Sn.
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">
                                                    Name
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">
                                                    Registration
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">
                                                    Date
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">
                                                    Test Name
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">
                                                    Tot.Q.
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">
                                                    Attempted
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">
                                                    L.Q.
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">
                                                    R.Q.
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">
                                                    W.Q.
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">
                                                    - M
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">
                                                    Tot.M
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">
                                                    %
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">
                                                    Grade
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">
                                                    Status
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">
                                                    Action
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {currentItems.length === 0 ? (
                                                <tr>
                                                    <td colSpan="15" className="px-6 py-12 text-center text-gray-500">
                                                        <FaClipboardList className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                                                        <p className="text-lg font-medium text-gray-900 mb-2">No results found</p>
                                                        <p className="text-gray-600">No student results available.</p>
                                                    </td>
                                                </tr>
                                            ) : (
                                                currentItems.map((result, index) => (
                                                    <tr
                                                        key={result.id}
                                                        className={`${index % 2 === 0 ? 'bg-yellow-50' : 'bg-white'} hover:bg-gray-100 transition-colors duration-200`}
                                                    >
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {result.sno}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-900">
                                                            {result.name}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-600">
                                                            {result.registrationNo || 'N/A'}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-600">
                                                            {formatDate(result.date)}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-900">
                                                            {result.testName}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                                                            {result.totalQuestions}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                                                            {result.attempted}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                                                            {result.leftQuestions}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                                                            {result.rightQuestions}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                                                            {result.wrongQuestions}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                                                            {result.minusMarking}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                                                            {result.totalMarks}/{result.maxMarks || result.totalMarks}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium text-gray-900">
                                                            {(result.percentage || 0).toFixed(1)}%
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-purple-600">
                                                            {result.grade || 'N/A'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(result.status)}`}>
                                                                {result.status || 'Unknown'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center space-x-1">
                                                                <button
                                                                    onClick={() => handleView(result)}
                                                                    disabled={actionLoading === `view_${result.id}`}
                                                                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-2 py-1 rounded text-xs font-medium transition-colors duration-200 flex items-center space-x-1"
                                                                    title="View Details"
                                                                >
                                                                    {actionLoading === `view_${result.id}` ? (
                                                                        <FaSpinner className="w-3 h-3 animate-spin" />
                                                                    ) : (
                                                                        <FaEye className="w-3 h-3" />
                                                                    )}
                                                                    <span>VIEW</span>
                                                                </button>

                                                                <button
                                                                    onClick={() => handleDownloadSolution(result)}
                                                                    disabled={actionLoading === `download_${result.id}`}
                                                                    className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-2 py-1 rounded text-xs font-medium transition-colors duration-200 flex items-center space-x-1"
                                                                    title="Download Solution"
                                                                >
                                                                    {actionLoading === `download_${result.id}` ? (
                                                                        <FaSpinner className="w-3 h-3 animate-spin" />
                                                                    ) : (
                                                                        <FaDownload className="w-3 h-3" />
                                                                    )}
                                                                    <span>SOLUTION</span>
                                                                </button>

                                                                <button
                                                                    onClick={() => handleDelete(result.id)}
                                                                    disabled={actionLoading === `delete_${result.id}`}
                                                                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-2 py-1 rounded text-xs font-medium transition-colors duration-200 flex items-center space-x-1"
                                                                    title="Delete Result"
                                                                >
                                                                    {actionLoading === `delete_${result.id}` ? (
                                                                        <FaSpinner className="w-3 h-3 animate-spin" />
                                                                    ) : (
                                                                        <FaTrash className="w-3 h-3" />
                                                                    )}
                                                                    <span>DELETE</span>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Card View */}
                                <div className="md:hidden space-y-4 p-4">
                                    {currentItems.map((result) => (
                                        <div key={result.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h3 className="text-base font-bold text-gray-900">{result.name}</h3>
                                                    <p className="text-xs text-gray-500">{result.testName}</p>
                                                </div>
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(result.status)}`}>
                                                    {result.status || 'Unknown'}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs mb-3">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Right:</span>
                                                    <span className="font-medium text-green-600">{result.rightQuestions}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Wrong:</span>
                                                    <span className="font-medium text-red-600">{result.wrongQuestions}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Marks:</span>
                                                    <span className="font-medium">{result.totalMarks}/{result.maxMarks || result.totalMarks}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">%:</span>
                                                    <span className="font-medium">{(result.percentage || 0).toFixed(1)}%</span>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                                                <button
                                                    onClick={() => handleView(result)}
                                                    className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-2 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                                                >
                                                    <FaEye className="w-3 h-3" /> View
                                                </button>
                                                <button
                                                    onClick={() => handleDownloadSolution(result)}
                                                    className="flex-1 bg-orange-50 text-orange-700 hover:bg-orange-100 px-3 py-2 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                                                >
                                                    <FaDownload className="w-3 h-3" /> Solution
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(result.id)}
                                                    className="flex-1 bg-red-50 text-red-700 hover:bg-red-100 px-3 py-2 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                                                >
                                                    <FaTrash className="w-3 h-3" /> Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {currentItems.length === 0 && (
                                        <div className="text-center py-8 text-gray-500">
                                            <FaClipboardList className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                                            <p>No results found</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="px-4 py-4 md:px-6 bg-gray-50 border-t border-gray-200">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="text-sm text-gray-700 text-center sm:text-left">
                                        Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredResults.length)} of {filteredResults.length} results
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Previous
                                        </button>
                                        <span className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md flex items-center">
                                            {currentPage} / {totalPages}
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
                </div>

                {/* Preview Modal */}
                {showPreviewModal && selectedResult && (
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center p-4 z-50">
                        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-white/20">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-semibold text-gray-900">Result Details</h3>
                                    <button
                                        onClick={() => setShowPreviewModal(false)}
                                        className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>

                            <div className="px-6 py-4 space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Student Name</h4>
                                        <p className="text-lg text-gray-900">{selectedResult.name}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Test Name</h4>
                                        <p className="text-lg text-gray-900">{selectedResult.testName}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Date & Time</h4>
                                        <p className="text-lg text-gray-900">{formatDate(selectedResult.date)}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Total Questions</h4>
                                        <p className="text-lg text-gray-900">{selectedResult.totalQuestions}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Attempted</h4>
                                        <p className="text-lg text-gray-900">{selectedResult.attempted}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Left Questions</h4>
                                        <p className="text-lg text-gray-900">{selectedResult.leftQuestions}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Right Questions</h4>
                                        <p className="text-lg text-orange-600 font-semibold">{selectedResult.rightQuestions}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Wrong Questions</h4>
                                        <p className="text-lg text-red-600 font-semibold">{selectedResult.wrongQuestions}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Minus Marking</h4>
                                        <p className="text-lg text-gray-900">{selectedResult.minusMarking}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Total Marks</h4>
                                        <p className="text-lg text-blue-600 font-bold">{selectedResult.totalMarks}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Status</h4>
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedResult.status)}`}>
                                            {selectedResult.status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
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

                {/* Toast Container */}
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
            </div>
        </BranchLayout>
    );
};

export default BranchResult;
