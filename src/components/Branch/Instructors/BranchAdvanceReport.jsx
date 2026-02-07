import { useState, useEffect } from 'react';
import { FaMoneyBillWave, FaPlus, FaMinus, FaFilter } from 'react-icons/fa';
import BranchLayout from '../BranchLayout';

const BranchAdvanceReport = () => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

    const [selectedMonth, setSelectedMonth] = useState('December');
    const [selectedYear, setSelectedYear] = useState('2025');
    const [selectedDay, setSelectedDay] = useState('16');
    const [selectedDepartment, setSelectedDepartment] = useState('');

    const [instructors, setInstructors] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [advanceData, setAdvanceData] = useState([]);
    const [advances, setAdvances] = useState([]);

    // Pay Advance Modal State
    const [isPayAdvanceModalOpen, setIsPayAdvanceModalOpen] = useState(false);
    const [payAdvanceForm, setPayAdvanceForm] = useState({
        employeeId: '',
        employeeName: '',
        amount: '',
        description: '',
        paymentDate: new Date().toISOString().split('T')[0]
    });

    // Get auth token
    const getAuthToken = () => {
        return localStorage.getItem('token') || localStorage.getItem('branchToken') || localStorage.getItem('adminToken');
    };

    // Fetch instructors from API
    const fetchInstructors = async () => {
        try {
            setLoading(true);
            const token = getAuthToken();

            const response = await fetch(`${API_BASE_URL}/instructor/instructors`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Instructors loaded:', data);
                setInstructors(data);
            } else {
                console.error('Failed to fetch instructors');
            }
        } catch (error) {
            console.error('Error fetching instructors:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch departments from API
    const fetchDepartments = async () => {
        try {
            const token = getAuthToken();

            const response = await fetch(`${API_BASE_URL}/instructor/departments`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Departments loaded:', data);
                // Handle different response structures
                const deptList = data.departments || data || [];
                setDepartments(Array.isArray(deptList) ? deptList : []);
            }
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    };

    // Fetch advances from API
    const fetchAdvances = async () => {
        try {
            const token = getAuthToken();

            const response = await fetch(`${API_BASE_URL}/api/branch/advances`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Advances loaded:', data);
                setAdvances(data.advances || []);
            }
        } catch (error) {
            console.error('Error fetching advances:', error);
        }
    };

    // Initial data fetch
    useEffect(() => {
        fetchInstructors();
        fetchDepartments();
        fetchAdvances();
    }, []);

    useEffect(() => {
        processAdvanceData();
    }, [instructors, selectedDepartment, advances]);

    const processAdvanceData = () => {
        let filteredInstructors = instructors;

        // Filter by department if selected
        if (selectedDepartment && selectedDepartment !== '') {
            filteredInstructors = instructors.filter(instructor =>
                instructor.department === selectedDepartment
            );
        }

        // Process instructor data for advance report
        const processedData = filteredInstructors.map((instructor, index) => {
            const salary = parseFloat(instructor.basicSalary) || 0;

            // Calculate advance due from advances data
            const instructorAdvances = advances.filter(adv => adv.employeeId === instructor.id);
            const totalPaid = instructorAdvances
                .filter(adv => adv.advanceType === 'paid')
                .reduce((sum, adv) => sum + (adv.amount || 0), 0);
            const totalDeducted = instructorAdvances
                .filter(adv => adv.advanceType === 'deducted')
                .reduce((sum, adv) => sum + (adv.amount || 0), 0);
            const advanceDue = totalPaid - totalDeducted;

            return {
                id: instructor.id,
                employeeName: instructor.name,
                department: instructor.department || 'N/A',
                salary: salary,
                advanceDue: advanceDue,
                empId: instructor.id
            };
        });

        setAdvanceData(processedData);
    };

    const handlePayAdvance = () => {
        // Open pay advance modal
        setIsPayAdvanceModalOpen(true);
    };

    const handlePayAdvanceSubmit = async () => {
        if (!payAdvanceForm.employeeId || !payAdvanceForm.amount) {
            alert('Please select an instructor and enter amount');
            return;
        }

        try {
            const token = getAuthToken();

            const response = await fetch(`${API_BASE_URL}/api/branch/advances`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    employeeId: payAdvanceForm.employeeId,
                    employeeName: payAdvanceForm.employeeName,
                    amount: parseFloat(payAdvanceForm.amount),
                    paymentDate: payAdvanceForm.paymentDate,
                    description: payAdvanceForm.description
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Advance paid:', result);
                alert(result.message || `₹${payAdvanceForm.amount} advance paid to ${payAdvanceForm.employeeName}`);

                // Refresh advances
                await fetchAdvances();

                // Reset form and close modal
                setPayAdvanceForm({
                    employeeId: '',
                    employeeName: '',
                    amount: '',
                    description: '',
                    paymentDate: new Date().toISOString().split('T')[0]
                });
                setIsPayAdvanceModalOpen(false);
            } else {
                const errorData = await response.json().catch(() => ({ detail: 'Failed to pay advance' }));
                alert(errorData.detail || 'Failed to pay advance');
            }
        } catch (error) {
            console.error('Error paying advance:', error);
            alert('Error paying advance: ' + error.message);
        }
    };

    const handleEmployeeSelect = (employeeId) => {
        const instructor = advanceData.find(emp => emp.id === employeeId);
        if (instructor) {
            setPayAdvanceForm({
                ...payAdvanceForm,
                employeeId: instructor.id,
                employeeName: instructor.employeeName
            });
        }
    };

    const handleDeductAdvance = async (instructor) => {
        if (instructor.advanceDue <= 0) {
            alert('No advance due for this instructor');
            return;
        }

        const amount = prompt(`Enter advance amount to deduct for ${instructor.employeeName} (Max: ₹${instructor.advanceDue}):`);
        if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
            if (parseFloat(amount) > instructor.advanceDue) {
                alert('Deduction amount cannot be more than advance due');
                return;
            }

            try {
                const token = getAuthToken();

                // Create a deduction record directly
                const response = await fetch(`${API_BASE_URL}/api/branch/advances`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        employeeId: instructor.id,
                        employeeName: instructor.employeeName,
                        amount: parseFloat(amount),
                        paymentDate: new Date().toISOString().split('T')[0],
                        description: `Advance deduction for ${instructor.employeeName}`,
                        advanceType: 'deducted'
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Advance deducted:', result);
                    alert(`₹${amount} advance deducted for ${instructor.employeeName}`);

                    // Refresh advances
                    await fetchAdvances();
                } else {
                    const errorData = await response.json().catch(() => ({ detail: 'Failed to deduct advance' }));
                    alert(errorData.detail || 'Failed to deduct advance');
                }
            } catch (error) {
                console.error('Error deducting advance:', error);
                alert('Error deducting advance: ' + error.message);
            }
        }
    };

    return (
        <BranchLayout>
            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <div className="bg-white shadow-sm border-b border-gray-200">
                    <div className="px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-2 rounded-lg">
                                    <FaMoneyBillWave className="w-6 h-6" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">Manage Instructor Advance</h1>
                                    <p className="text-gray-600">Track and manage instructor advance payments</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {/* Filters Section */}
                    {/* Filters Section */}
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                                <div className="flex items-center space-x-2 w-full md:w-auto">
                                    <FaFilter className="text-gray-600" />
                                    <span className="text-gray-700 font-medium whitespace-nowrap">Filter By:</span>
                                </div>

                                <select
                                    value={selectedDepartment}
                                    onChange={(e) => setSelectedDepartment(e.target.value)}
                                    className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Departments</option>
                                    {departments.map((dept) => (
                                        <option key={dept.id} value={dept.name}>
                                            {dept.name}
                                        </option>
                                    ))}
                                </select>

                                <div className="flex gap-2 w-full md:w-auto">
                                    <select
                                        value={selectedDay}
                                        onChange={(e) => setSelectedDay(e.target.value)}
                                        className="w-1/3 md:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="16">16</option>
                                        <option value="15">15</option>
                                        <option value="14">14</option>
                                        <option value="13">13</option>
                                    </select>

                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        className="w-1/3 md:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="December">December</option>
                                        <option value="November">November</option>
                                        <option value="October">October</option>
                                        <option value="September">September</option>
                                        <option value="August">August</option>
                                        <option value="July">July</option>
                                        <option value="June">June</option>
                                        <option value="May">May</option>
                                        <option value="April">April</option>
                                        <option value="March">March</option>
                                        <option value="February">February</option>
                                        <option value="January">January</option>
                                    </select>

                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(e.target.value)}
                                        className="w-1/3 md:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="2025">2025</option>
                                        <option value="2024">2024</option>
                                        <option value="2023">2023</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                onClick={handlePayAdvance}
                                className="w-full md:w-auto px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center space-x-2 whitespace-nowrap"
                            >
                                <FaPlus className="w-4 h-4" />
                                <span>Pay Advance</span>
                            </button>
                        </div>
                    </div>

                    {/* Advance Table / Card View */}
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full table-auto">
                                <thead className="bg-gray-800 text-white">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">
                                            S.No.
                                        </th>
                                        <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">
                                            Instructors
                                        </th>
                                        <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">
                                            Advance Due
                                        </th>
                                        <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">
                                            Deduct Advance This Month
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                                <div className="flex flex-col items-center">
                                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                                                    <p>Loading instructor data...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : advanceData.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                                <div className="flex flex-col items-center">
                                                    <FaMoneyBillWave className="w-12 h-12 text-gray-300 mb-4" />
                                                    <p className="text-lg font-medium text-gray-900 mb-2">No instructors found</p>
                                                    <p className="text-sm">Please add instructors or select a different department.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        advanceData.map((record, index) => (
                                            <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {index + 1}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {record.employeeName}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {record.department} • ID: {record.empId}
                                                    </div>
                                                    <div className="text-sm text-orange-600 font-medium">
                                                        Salary: ₹{record.salary?.toLocaleString() || '0'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`text-sm font-semibold ${record.advanceDue > 0 ? 'text-red-600' : 'text-orange-600'
                                                        }`}>
                                                        ₹{record.advanceDue?.toLocaleString() || '0'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <button
                                                        onClick={() => handleDeductAdvance(record)}
                                                        disabled={record.advanceDue <= 0}
                                                        className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${record.advanceDue > 0
                                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                            }`}
                                                    >
                                                        <FaMinus className="w-3 h-3" />
                                                        <span>Deduct Advance</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden">
                            {loading ? (
                                <div className="p-12 text-center text-gray-500">
                                    <div className="flex flex-col items-center">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                                        <p>Loading instructor data...</p>
                                    </div>
                                </div>
                            ) : advanceData.length === 0 ? (
                                <div className="p-12 text-center text-gray-500">
                                    <div className="flex flex-col items-center">
                                        <FaMoneyBillWave className="w-12 h-12 text-gray-300 mb-4" />
                                        <p className="text-lg font-medium text-gray-900 mb-2">No instructors found</p>
                                        <p className="text-sm">Please add instructors or select a different department.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 p-4">
                                    {advanceData.map((record) => (
                                        <div key={record.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-gray-900">{record.employeeName}</h3>
                                                    <p className="text-sm text-gray-500">{record.department} • ID: {record.empId}</p>
                                                </div>
                                                <div className={`px-2 py-1 rounded text-xs font-semibold ${record.advanceDue > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                                    {record.advanceDue > 0 ? 'Due' : 'Clear'}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                                <div className="bg-gray-50 p-2 rounded">
                                                    <span className="block text-gray-500 text-xs">Salary</span>
                                                    <span className="font-medium text-gray-900">₹{record.salary?.toLocaleString() || '0'}</span>
                                                </div>
                                                <div className="bg-orange-50 p-2 rounded">
                                                    <span className="block text-gray-500 text-xs">Advance Due</span>
                                                    <span className={`font-bold ${record.advanceDue > 0 ? 'text-red-600' : 'text-orange-600'}`}>
                                                        ₹{record.advanceDue?.toLocaleString() || '0'}
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleDeductAdvance(record)}
                                                disabled={record.advanceDue <= 0}
                                                className={`w-full py-2 rounded-lg transition-colors flex items-center justify-center space-x-2 ${record.advanceDue > 0
                                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                                    }`}
                                            >
                                                <FaMinus className="w-3 h-3" />
                                                <span>Deduct Advance</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Summary Section */}
                    {!loading && advanceData.length > 0 && (
                        <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Summary Statistics</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-white rounded-lg p-4 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm text-gray-600">Total Instructors</h4>
                                            <p className="text-2xl font-bold text-blue-600">{advanceData.length}</p>
                                        </div>
                                        <FaMoneyBillWave className="w-8 h-8 text-blue-600" />
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg p-4 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm text-gray-600">Total Salary</h4>
                                            <p className="text-2xl font-bold text-orange-600">
                                                ₹{advanceData.reduce((sum, record) => sum + (record.salary || 0), 0).toLocaleString()}
                                            </p>
                                        </div>
                                        <FaMoneyBillWave className="w-8 h-8 text-orange-600" />
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg p-4 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm text-gray-600">Total Advance Due</h4>
                                            <p className="text-2xl font-bold text-red-600">
                                                ₹{advanceData.reduce((sum, record) => sum + (record.advanceDue || 0), 0).toLocaleString()}
                                            </p>
                                        </div>
                                        <FaMoneyBillWave className="w-8 h-8 text-red-600" />
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg p-4 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm text-gray-600">Department</h4>
                                            <p className="text-2xl font-bold text-purple-600">{selectedDepartment || 'All'}</p>
                                        </div>
                                        <FaFilter className="w-8 h-8 text-purple-600" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Pay Advance Modal */}
                    {isPayAdvanceModalOpen && (
                        <div className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center z-50">
                            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl w-full max-w-md mx-4">
                                <div className="px-6 py-4 border-b border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-gray-900">Pay Advance to Instructor</h3>
                                        <button
                                            onClick={() => setIsPayAdvanceModalOpen(false)}
                                            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>

                                <div className="px-6 py-4">
                                    <div className="space-y-4">
                                        {/* Instructor Selection */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Select Instructor *
                                            </label>
                                            <select
                                                value={payAdvanceForm.employeeId}
                                                onChange={(e) => handleEmployeeSelect(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                <option value="">-- Select Instructor --</option>
                                                {advanceData.map((instructor) => (
                                                    <option key={instructor.id} value={instructor.id}>
                                                        {instructor.employeeName} ({instructor.department}) - ₹{instructor.salary?.toLocaleString()}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Amount */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Advance Amount *
                                            </label>
                                            <input
                                                type="number"
                                                value={payAdvanceForm.amount}
                                                onChange={(e) => setPayAdvanceForm({ ...payAdvanceForm, amount: e.target.value })}
                                                placeholder="Enter advance amount"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>

                                        {/* Payment Date */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Payment Date
                                            </label>
                                            <input
                                                type="date"
                                                value={payAdvanceForm.paymentDate}
                                                onChange={(e) => setPayAdvanceForm({ ...payAdvanceForm, paymentDate: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>

                                        {/* Description */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Description/Reason
                                            </label>
                                            <textarea
                                                value={payAdvanceForm.description}
                                                onChange={(e) => setPayAdvanceForm({ ...payAdvanceForm, description: e.target.value })}
                                                placeholder="Enter reason for advance payment"
                                                rows={3}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                                    <button
                                        onClick={() => setIsPayAdvanceModalOpen(false)}
                                        className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handlePayAdvanceSubmit}
                                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                                    >
                                        Pay Advance
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </BranchLayout>
    );
};

export default BranchAdvanceReport;
